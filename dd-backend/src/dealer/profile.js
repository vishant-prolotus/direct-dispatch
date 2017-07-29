'use strict';

const co = require('co');
const sha1 = require('sha1');
const _ = require('lodash');

const utils = require('../core/utils');
const email = require('../core/email');
const paymentGateway = require('../core/payment-gateway');
const staffNotifications = require('../core/notifications')('staff');

exports.getUser = function (req, res, next) {
    global.db.collection('dealers').findOne({ _id: req.user.id }, { email: true }, function (err, dealer) {
        if (err)
            return res.status(400).send(err.toString());
        if (!dealer)
            return res.status(404).send();
        res.json(dealer);
    });
};

exports.changePassword = function (req, res, next) {
    co(function* () {
        const pass = req.body;
        if (pass['new'] < 8) throw "New password should be atleast 8 characters long";
        if (pass['new'] !== pass.new2) throw "New password and Confirm password doesn't match";
        const dealer = yield global.db.collection('dealers').findOne({ _id: req.user.id, pwhash: sha1(pass.current) }, { _id: true });
        if (!dealer) throw 'Current password invalid';
        yield global.db.collection('dealers').updateOne({ _id: req.user.id }, { $set: { pwhash: sha1(pass['new']) } });
    }).then(done => {
        res.send('Password changed successfully');
    }).catch(err => {
        res.status(400).send(err.toString());
    });
};

exports.changeEmail = function (req, res, next) {
    co(function* () {
        const input = { email: req.body['new'], password: req.body.password };
        const data = { _id: null, token: null, company: null };
        if (!input.email) throw 'New email required';
        const dealer = yield global.db.collection('dealers').findOne({ _id: req.user.id, pwhash: sha1(input.password) }, { _id: true, company: true });
        if (!dealer) throw 'Current password invalid';
        data._id = dealer._id;
        data.company = dealer.company;
        data.token = utils.generateToken();
        const message = {
            from: email.addresses.noReply,
            to: input.email,
            subject: 'Email Change Confirmation'
        };
        yield email.send(message, data, 'dealer/confirm-email.html');
        yield global.db.collection('dealers').updateOne({ _id: req.user.id }, { $set: { newEmail: input.email, emailChangeToken: data.token } });
    }).then(done => {
        res.send('Confirmation link has been sent to new email address. Please confirm the new email in order to set new email');
    }).catch(err => {
        res.status(400).send(err.toString());
    });
};

exports.getCompany = function (req, res, next) {
    global.db.collection('dealers').findOne({ _id: req.user.id }, { name: true, company: true, location: true, address: true, phone: true }, function (err, dealer) {
        if (err) return res.status(400).send(err.toString());
        res.json(dealer);
    });
};

exports.updateCompany = function (req, res, next) {
    const dealer = _.pick(req.body, ['name', 'address', 'phone']);
    global.db.collection('dealers').updateOne({ _id: req.user.id }, { $set: dealer }, function (err, updated) {
        if (err) return res.status(400).send(err.toString());
        res.send("Company information updated");
    });
};

exports.getCreditCard = function (req, res, next) {
    co(function* () {
        const dealer = yield global.db.collection('dealers').findOne({ _id: req.user.id }, { creditCard: 1 });
        if (dealer.creditCard) {
            return { cardNumber: utils.blindCreditCard(dealer.creditCard.cardNumber),
                     expirationDate: dealer.creditCard.expirationDate }; 
        } else{
          return undefined;  
        } 
    }).then(creditCard => {
        res.json(creditCard);
    }).catch(err => {
        res.status(400).send(err.toString());
    });
};

exports.updateCreditCard = function (req, res, next) {
    co(function* () {
        const creditCard = _.pick(req.body, ['cardNumber', 'expirationDate', 'cardCode']);
        const ccError = paymentGateway.isInvalidCreditCard(creditCard);
        if (ccError) throw ccError;
        yield global.db.collection('dealers').updateOne({ _id: req.user.id }, { $set: { creditCard: creditCard } });
        return creditCard;
    }).then(creditCard => {
        res.json({ cardNumber: utils.blindCreditCard(creditCard.cardNumber),
                   expirationDate: creditCard.expirationDate });
    }).catch(err => {
        res.status(400).send(err.toString());
    });
};