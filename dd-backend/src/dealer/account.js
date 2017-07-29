'use strict';

const _ = require('lodash');
const co = require('co');
const ObjectID = require('mongodb').ObjectID;
const jwt = require('jsonwebtoken');
const sha1 = require('sha1');
const crypto = require('crypto');

const config = require('../config');
const utils = require('../core/utils');
const uniqueId = require('../core/unique-id');
const email = require('../core/email');
const staffNotifications = require('../core/notifications')('staff');

exports.insertDealer = co.wrap(function* (obj) {
    const fields = ['email', 'name', 'company', 'address', 'location', 'phone', 'salesrepId'];
    const dealer = _.pick(obj, fields);
    // if (fields.some(field => !dealer[field])) throw 'Required field missing';
    dealer.email = dealer.email.toLowerCase();
    const emailExist = yield global.db.collection('dealers').findOne({ email: dealer.email }, { _id: true });
    if (emailExist) throw 'Email already registered';
    dealer._id = yield uniqueId.generate('dealers');
    dealer.created = new Date();
    dealer.activationToken = utils.generateToken();
    yield global.db.collection('dealers').insertOne(dealer);
    return dealer;
});

exports.sendWelcomeEmail = co.wrap(function* (dealer) {
    const message = {
        from: email.addresses.noReply,
        to: dealer.email,
        subject: 'Welcome to Direct Dispatch'
    };
    yield email.send(message, dealer, 'dealer/registered.html');
    yield global.db.collection('dealers').updateOne({ _id: dealer._id }, { $set: { activationLinkSent: new Date() } });
});



exports.register = function (req, res, next) {
    let dealer;
    co(function* () {
        const input = req.body;
        dealer = yield exports.insertDealer(input);
        yield exports.sendWelcomeEmail(dealer);
        const notifyMsg = {
            type: 'dealer-signup', title: 'New dealer signed up #' + dealer._id,
            contents: 'Company: ' + dealer.company + ', Contact: ' + dealer.name,
            params: { dealerId: dealer._id }
        };
        staffNotifications.emit({ role: 'admin' }, notifyMsg);
        return dealer;
    }).then(dealer => {
        res.send({ _id: dealer._id });
    }).catch(error => {
        if (dealer) global.db.collection('dealers').removeOne({ _id: dealer._id });
        res.status(400).send(error.toString());
    });
};

exports.activateInfo = function (req, res, next) {
    co(function* () {
        if (!req.params.id || !req.params.token) throw 'Required field missing';
        const dealer = yield global.db.collection('dealers').findOne({ _id: req.params.id, activationToken: req.params.token }, { company: true, email: true });
        if (!dealer) throw 'Invalid account activation link';
        return dealer;
    }).then(dealer => {
        res.json(dealer);
    }).catch(err => {
        res.status(400).send(err.toString());
    });
};

exports.activate = function (req, res, next) {
    co(function* () {
        if (!req.body.id || !req.body.token || !req.body.password) throw 'Required field missing';
        const pwhash = sha1(req.body.password);
        const dealer = yield global.db.collection('dealers').findOne({ _id: req.body.id, activationToken: req.body.token }, { name: true, company: true, email: true });
        if (!dealer) throw 'Invalid account activation link';
        yield global.db.collection('dealers').updateOne({ _id: req.body.id, activationToken: req.body.token }, { $set: { activated: new Date(), pwhash: pwhash }, $unset: { activationToken: "" } });
        const message = {
            from: email.addresses.noReply,
            to: dealer.email,
            subject: 'Account activated successfully! Now you can start using your account'
        };
        yield email.send(message, dealer, 'dealer/activated.html');
        const notifyMsg = {
            type: 'dealer-activated', title: 'Dealer #' + dealer._id + ' activated his account',
            contents: 'Company: ' + dealer.company + ', Contact: ' + dealer.name,
            params: { dealerId: dealer._id }
        };
        staffNotifications.emit({ role: 'admin' }, notifyMsg);
    }).then(done => {
        res.send('Account activated successfully. Please signin to start with Dealer Portal');
    }).catch(err => {
        res.status(400).send(err.toString());
    });
};

exports.authenticate = function (req, res, next) {
    global.latest=null;
    co(function* () {
        if (!req.body.email || !req.body.pass) throw new Error('Email and password are required');
        const login = { email: req.body.email.toLowerCase(), pwhash: sha1(req.body.pass) };
        const dealer = yield global.db.collection('dealers').findOne({ email: login.email, pwhash: login.pwhash, activated: { $exists: true } }, { company: 1 });
        if (!dealer) throw new Error('Invalid Credentials');
        const user = {};
        user._id = dealer._id;
        user.title = dealer.company;
        yield global.db.collection('dealers').updateOne({ _id: dealer._id }, { $set: { lastLogin: new Date() } });
        user.token = jwt.sign({ id: user._id, type: 'dealer' }, config.jwtkey);
        return user;
    }).then(user => {
        res.json(user);
    }).catch(err => {
        res.status(400).send(err.toString());
    });
};

exports.resetPassword = function (req, res, next) {
    co(function* () {
        const user = req.body;
        if (!user.email) throw 'Required field missing';
        user.email = user.email.toLowerCase();
        const dealer = yield global.db.collection('dealers').findOne({ email: user.email, activated: { $exists: true } }, { company: true, email: true });
        if (!dealer) throw 'Email not found';
        const token = utils.generateToken();
        dealer.passResetToken = token;
        yield global.db.collection('dealers').updateOne({ email: user.email, activated: { $exists: true } }, { $set: { passResetToken: token } });
        const mail_options = {
            from: email.addresses.noReply,
            to: user.email,
            subject: 'Reset your account password'
        };
        yield email.send(mail_options, dealer, 'dealer/password-reset.html');
    }).then(done => {
        res.send('For setting the new password, link has been sent to the email. Please proceed further from there.');
    }).catch(err => {
        res.status(400).send(err.toString());
    });
};

exports.resetPassInfo = function (req, res, next) {
    co(function* () {
        if (!req.params.id || !req.params.token) throw 'Required field missing';
        const dealer = yield global.db.collection('dealers').findOne({ _id: req.params.id, passResetToken: req.params.token }, { company: true, email: true });
        if (!dealer) throw 'Invalid reset password link';
        return dealer;
    }).then(dealer => {
        res.json(dealer);
    }).catch(err => {
        res.status(400).send(err.toString());
    });
};

exports.newPass = function (req, res, next) {
    co(function* () {
        if (!req.body.id || !req.body.token || !req.body.password) throw 'Required field missing';
        const pwhash = sha1(req.body.password);
        const dealer = yield global.db.collection('dealers').findOne({ _id: req.body.id, passResetToken: req.body.token }, { company: true, email: true });
        if (!dealer) throw 'Invalid reset password link';
        yield global.db.collection('dealers').updateOne({ _id: req.body.id, passResetToken: req.body.token }, { $set: { pwhash: pwhash }, $unset: { passResetToken: "" } });
        const message = {
            from: email.addresses.noReply,
            to: dealer.email,
            subject: 'Your password has been changed'
        };
        email.send(message, dealer, 'dealer/password-changed.html');
    }).then(done => {
        res.send('Your account password has been updated successfully');
    }).catch(err => {
        res.status(400).send(err.toString());
    });
};

exports.confirmEmail = function (req, res, next) {
    co(function*() {
        const input = { id: req.body.id, token: req.body.token };
        const dealer = yield global.db.collection('dealers').findOne({ _id: input.id, emailChangeToken: input.token }, { _id: true, newEmail: true });
        if (!dealer) throw 'Invalid email change confirmation parameters';
        yield global.db.collection('dealers').updateOne({ _id: input.id, emailChangeToken: input.token }, { $set: { email: dealer.newEmail }, $unset: { newEmail: true, emailChangeToken: true } });
    }).then(done => {
        res.send('Account email has been changed successfully');
    }).catch(err => {
        res.status(400).send(err.toString());
    });
};