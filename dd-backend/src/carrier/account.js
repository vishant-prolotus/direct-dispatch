'use strict';

const co = require('co');
const ObjectID = require('mongodb').ObjectID;
const jwt = require('jsonwebtoken');
const sha1 = require('sha1');
const crypto = require('crypto');

const config = require('../config');
const utils = require('../core/utils');
const carrierModule = require('./carrier');
const carrierCollection = carrierModule.collection;
const userCollection = require('./users').collection;
const email = require('../core/email');
const staffNotifications = require('../core/notifications')('staff');

exports.register = function (req, res, next) {
    let carrier;
    co(function*() {
        const input = req.body;
        carrier = yield carrierModule.insertCarrier(input);
        yield carrierModule.sendWelcomeEmail(carrier);
        const notifyMsg = {type: 'carrier-signup', title: 'New carrier signed up #' + carrier._id,
            contents: 'Company: ' + carrier.company + ', Contact: ' + carrier.name,
            params: {carrierId: carrier._id}};
        staffNotifications.emit({role: 'admin'}, notifyMsg);
        return carrier;
    }).then(carrier => {
        utils.writeSuccessResponse(req, res, { _id: carrier._id });
    }).catch(err => {
        if (carrier) global.db.collection('carriers').removeOne({ _id: carrier._id });
        utils.writeErrorResponse(req, res, err, 400);
    });
};

exports.getInvitation = function (req, res, next) {
    co(function*() {
        const user = yield userCollection.fetch({ _id: ObjectID(req.params.id), activationToken: req.params.token, activated: false }, { name: 1, email: 1, phone: 1, type: 1, carrierId: 1});
        if (!user) throw new Error('Invalid user invitation link');
        const carrier = yield carrierCollection.fetch({ _id: user.carrierId }, { _id: 0, company: 1 });
        user.company = carrier.company;
        return user;
    }).then(user => {
        utils.writeSuccessResponse(req, res, user);
    }).catch(err => {
        utils.writeErrorResponse(req, res, err, 400);
    });
};

exports.acceptInvitation = function (req, res, next) {
    co(function*() {
        const password = req.body.password;
        if (!password) throw new Error('Password is required');
        const pwhash = sha1(password);
        const user = yield userCollection.fetch({ _id: ObjectID(req.params.id), activationToken: req.params.token, activated: false }, { _id: 1 });
        if (!user) throw new Error('Invalid user invitation acceptance request');
        return userCollection.update({ _id: user._id }, { $unset: {activationToken: 1},
                        $set: {pwhash: pwhash, activated: true, activationDate: new Date(), emailConfirmed: true} });
    }).then(updated => {
        utils.writeSuccessResponse(req, res, {success: updated});
    }).catch(err => {
        utils.writeErrorResponse(req, res, err, 400);
    });
};

exports.activateInfo = function (req, res, next) {
    co(function*() {
        if (!req.params.id || !req.params.token) throw 'Required field missing';
        const carrier = yield global.db.collection('carriers').findOne({ _id: req.params.id, activationToken: req.params.token }, { name: true, email: true });
        if (!carrier) throw 'Invalid account activation link';
        return carrier;
    }).then(carrier => {
        utils.writeSuccessResponse(req, res, carrier);
    }).catch(err => {
        utils.writeErrorResponse(req, res, err, 400);
    });
};

exports.activate = function (req, res, next) {
    co(function*() {
        if (!req.body.id || !req.body.token || !req.body.password) throw 'Required field missing';
        const pwhash = sha1(req.body.password);
        const carrier = yield global.db.collection('carriers').findOne({ _id: req.body.id, activationToken: req.body.token }, { name: true, company: true, email: true });
        if (!carrier) throw 'Invalid account activation link';
        yield global.db.collection('carriers').updateOne({ _id: req.body.id, activationToken: req.body.token }, { $set: { activated: new Date(), pwhash: pwhash }, $unset: { activationToken: "" } });
        const message = {
            from: email.addresses.noReply,
            to: carrier.email,
            subject: 'Account activated successfully! Now you can start using your account'
        };
        yield email.send(message, carrier, 'carrier/activated.html');
        const notifyMsg = { type: 'carrier-activated', title: 'Carrier #' + carrier._id + ' activated his account',
                contents: 'Company: ' + carrier.company + ', Contact: ' + carrier.name,
                params: { carrierId: carrier._id } };
        staffNotifications.emit({role: 'admin'}, notifyMsg);
    }).then(done => {
        utils.writeSuccessResponse(req, res, 'Account activated successfully. Please signin and complete your profile to start getting load');
    }).catch(err => {
        utils.writeErrorResponse(req, res, err, 400);
    });
};

exports.authenticate = function (req, res, next) {
    global.latest=null;
    co(function*() {
        if (!req.body.email || !req.body.pass) throw new Error('Email and password are required');
        const login = { email: req.body.email.toLowerCase(), pwhash: sha1(req.body.pass) };
        const carrier = yield carrierCollection.fetch({ email: login.email, pwhash: login.pwhash, activated: { $exists: true } }, 
                        { company: 1, profileCompleted: 1 });
        let user = {};
        if (carrier) {
            user._id = carrier._id;
            user.title = carrier.company;
            user.role = 'Owner';
            user.profileCompleted = carrier.profileCompleted;
            global.db.collection('carriers').updateOne({_id: carrier._id}, {$set: {lastLogin: new Date() }});
        } else {
            const carrierUser = yield userCollection.fetch({ email: login.email, pwhash: login.pwhash, enabled: true, activated: true, emailConfirmed: true },
                                { name: 1, type: 1, initialLogin: 1 });
            if (carrierUser) {
                user._id = carrierUser._id;
                user.title = carrierUser.name;
                user.role = carrierUser.type;
            } else {
                throw new Error('Invalid Credentials');
            }
        }
        user.token = jwt.sign({ id: user._id, type: 'carrier', role: user.role }, config.jwtkey);
        return user;
    }).then(user => {
        utils.writeSuccessResponse(req, res, user);
    }).catch(err => {
        utils.writeErrorResponse(req, res, err, 400);
    });
};

exports.authorizeRequest = function (req, res, next) {
	if (req.user.type === 'carrier') {
		if (req.user.role !== 'Owner') {
            co(function*() {
                const user = yield userCollection.fetch({ _id: ObjectID(req.user.id) }, { carrierId: 1 });
			    const carrier = yield carrierCollection.fetch({ _id: user.carrierId }, { _id: 1 });
                req.user.carrierId = carrier._id;
                next();
            }).catch(err => {
                console.log('Error', err);
            });
		} else {
		  next();
        }
	} else {
        utils.writeErrorResponse(req, res, 'Not Authorized', 401);
	}
};

exports.resetPassword = function (req, res, next) {
    co(function*() {
        const user = req.body;
        if (!user.email) throw 'Required field missing';
        user.email = user.email.toLowerCase();
        const token = utils.generateToken();
        const carrier = yield global.db.collection('carriers').findOne({ email: user.email, activated: { $exists: true } }, { company: true, email: true });
        if (!carrier) throw 'Email not found';
        carrier.passResetToken = token;
        const mail_options = {
            from: email.addresses.noReply,
            to: user.email,
            subject: 'Reset your account password'
        };
        const data = {
            carrier: carrier,
            host: config.host
        };
        yield email.send(mail_options, data, 'carrier/password-reset.html');
        yield global.db.collection('carriers').updateOne({ email: user.email, activated: { $exists: true } }, { $set: { passResetToken: token } });
    }).then(done => {
        utils.writeSuccessResponse(req, res, 'For setting the new password, link has been sent to the email. Please proceed further from there.');
    }).catch(err => {
        utils.writeErrorResponse(req, res, err, 400);
    });
};

exports.resetPassInfo = function (req, res, next) {
    co(function*() {
        if (!req.params.id || !req.params.token) throw 'Required field missing';
        const carrier = yield global.db.collection('carriers').findOne({ _id: req.params.id, passResetToken: req.params.token }, { company: true, email: true });
        if (!carrier) throw 'Invalid reset password link';
        return carrier;
    }).then(carrier => {
        utils.writeSuccessResponse(req, res, carrier);
    }).catch(err => {
        utils.writeErrorResponse(req, res, err, 400);
    });
};

exports.newPass = function (req, res, next) {
    co(function*() {
        if (!req.body.id || !req.body.token || !req.body.password) throw 'Required field missing';
        const pwhash = sha1(req.body.password);
        const carrier = yield global.db.collection('carriers').findOne({ _id: req.body.id, passResetToken: req.body.token }, { company: true, email: true });
        if (!carrier) throw 'Invalid reset password link';
        yield global.db.collection('carriers').updateOne({ _id: req.body.id, passResetToken: req.body.token }, { $set: { pwhash: pwhash }, $unset: { passResetToken: "" } });
        const message = {
            from: email.addresses.noReply,
            to: carrier.email,
            subject: 'Your password has been changed'
        };
        email.send(message, carrier, 'carrier/password-changed.html');
    }).then(done => {
        utils.writeSuccessResponse(req, res, 'Your account password has been updated successfully');
    }).catch(err => {
        utils.writeErrorResponse(req, res, err, 400);
    });
};

exports.confirmEmail = function (req, res, next) {
    co(function*() {
        const input = { id: req.body.id, token: req.body.token };
        const carrier = yield global.db.collection('carriers').findOne({ _id: input.id, emailChangeToken: input.token }, { _id: true, newEmail: true });
        if (!carrier) throw 'Invalid email change confirmation parameters';
        yield global.db.collection('carriers').updateOne({ _id: input.id, emailChangeToken: input.token }, { $set: { email: carrier.newEmail }, $unset: { newEmail: true, emailChangeToken: true } });
    }).then(done => {
        utils.writeSuccessResponse(req, res, 'Account email has been changed successfully');
    }).catch(err => {
        utils.writeErrorResponse(req, res, err, 400);
    });
};