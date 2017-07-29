'use strict';

const co = require('co');
const sha1 = require('sha1');
const _ = require('lodash');

const utils = require('../core/utils');
const email = require('../core/email');
const sms = require('../core/sms');
const paymentGateway = require('../core/payment-gateway');
const staffNotifications = require('../core/notifications')('staff');

exports.savePhone = function (req, res, next) {
    co(function* () {
        const code = utils.randomDigits(6);
        yield global.db.collection('carriers').updateOne({ _id: req.user.id }, { $set: { smsNumber: req.body.phone, smsCode: code, smsVerified: false } });
        yield sms.send(req.body.phone, "Verification code for SMS notifications on Direct Dispatch: " + code);
    }).then(done => {
        utils.writeSuccessResponse(req, res, 'Verification code sent as SMS to phone number');
    }).catch(err => {
        utils.writeErrorResponse(req, res, err);
    });
};

exports.verifyPhone = function (req, res, next) {
    co(function* () {
        const carrier = yield global.db.collection('carriers').findOne({ _id: req.user.id, smsCode: req.body.code });
        if (!carrier) throw "Invalid verification code";
        yield global.db.collection('carriers').updateOne({ _id: req.user.id, smsCode: req.body.code },
            { $set: { smsVerified: true }, $unset: { smsCode: "" } });
    }).then(done => {
        utils.writeSuccessResponse(req, res, 'Phone number verified');
    }).catch(err => {
        utils.writeErrorResponse(req, res, err);
    });
};

exports.profileComplete = function (req, res, next) {
    co(function* () {
        yield global.db.collection('carriers').updateOne({ _id: req.user.id }, { $set: { profileCompleted: true } });
        const carrier = yield global.db.collection('carriers').findOne({ _id: req.user.id }, { company: 1, name: 1 });
        const notifyMsg = {type: 'carrier-profile-completed', title: 'Carrier #' + carrier._id + ' completed his profile',
            contents: 'Company: ' + carrier.company + ', Contact: ' + carrier.name,
            params: {carrierId: carrier._id}};
        staffNotifications.emit({role: 'admin'}, notifyMsg);
    }).then(done => {
        utils.writeSuccessResponse(req, res);
    }).catch(err => {
        utils.writeErrorResponse(req, res, err);
    });
};

exports.user = function (req, res, next) {
    global.db.collection('carriers').findOne({ _id: req.user.id }, { email: true }, function (err, carrier) {
        if (err)
            utils.writeErrorResponse(req, res, err, 401);
        if (!carrier)
            utils.writeErrorResponse(req, res, 'Invalid user id', 401);
        utils.writeSuccessResponse(req, res, carrier);
    });
};

exports.changePassword = function (req, res, next) {
    co(function* () {
        const pass = req.body;
        if (pass['new'] < 8) throw "New password should be atleast 8 characters long";
        if (pass['new'] !== pass.new2) throw "New password and Confirm password doesn't match";
        const carrier = yield global.db.collection('carriers').findOne({ _id: req.user.id, pwhash: sha1(pass.current) }, { _id: true });
        if (!carrier) throw 'Current password invalid';
        yield global.db.collection('carriers').updateOne({ _id: req.user.id }, { $set: { pwhash: sha1(pass['new']) } });
    }).then(done => {
        utils.writeSuccessResponse(req, res, 'Password changed successfully');
    }).catch(err => {
        utils.writeErrorResponse(req, res, err, 400);
    });
};

exports.changeEmail = function (req, res, next) {
    co(function* () {
        const input = { email: req.body['new'], password: req.body.password };
        const data = { _id: null, token: null, company: null };
        if (!input.email) throw 'New email required';
        const carrier = yield global.db.collection('carriers').findOne({ _id: req.user.id, pwhash: sha1(input.password) }, { _id: true, company: true });
        if (!carrier) throw 'Current password invalid';
        data._id = carrier._id;
        data.company = carrier.company;
        data.token = utils.generateToken();
        const message = {
            from: email.addresses.noReply,
            to: input.email,
            subject: 'Email Change Confirmation'
        };
        yield email.send(message, data, 'carrier/confirm-email.html');
        yield global.db.collection('carriers').updateOne({ _id: req.user.id }, { $set: { newEmail: input.email, emailChangeToken: data.token } });
    }).then(done => {
        utils.writeSuccessResponse(req, res, 'Confirmation link has been sent to new email address. Please confirm the new email in order to set new email');
    }).catch(err => {
        utils.writeErrorResponse(req, res, err, 400);
    });
};

// We need to move the get company info code in a method because we need it in bol ticket handler also.
exports.getCompanyInfo = function(carrierId) {
    const properties = {
        name: true,
        company: true,
        location: true,
        address: true,
        phone: true,
        smsNumber: true,
        website: true,
        insuranceExpiration: true,
        logo: true,
        mc: true,
        dot: true
    };

    return new Promise((resolve, reject) => {
        global.db.collection('carriers').findOne({ _id: carrierId }, properties, function (err, carrier) {
           if (err) {
               reject(err);
           } else {
               resolve(carrier);
           }
        });
    });
};

exports.getCompany = function (req, res, next) {
    exports.getCompanyInfo(req.user.id)
        .then((carrier) => utils.writeSuccessResponse(req, res, carrier))
        .catch((err) => utils.writeErrorResponse(req, res, err, 400));
};

exports.updateCompany = function (req, res, next) {
    // Adding location which should be in the form of {city: 'California City', state: 'California', zip: 254488}

    const validProperties = ['name', 'company', 'address', 'website', 'phone', 'smsNumber', 'insuranceExpiration', 'location', 'logo'];
    const carrier = _.pick(req.body, validProperties);
    // Put some validation.
    // If there is nothing to update then give some validation message.
    if (Object.keys(carrier).length == 0) {
        utils.writeErrorResponse(req, res, 'None of the update properties are part of company schema', 400);
        return;
    }
    // For insuranceExpiration date. Default format is MMDDYYY
    const dateFormat = 'YYYY/MM/DD';
    if (carrier['insuranceExpiration'] && !utils.isValidDate(carrier['insuranceExpiration'], dateFormat)) {
        utils.writeErrorResponse(req, res, 'insuranceExpiration is not a valid MM//DD/YYYY date format', 400);
        return;
    } else if (carrier['insuranceExpiration']){
        carrier['insuranceExpiration'] = utils.getDate(carrier['insuranceExpiration'], dateFormat);
    }
    // For location all the 3 fields are mandatory
    if (carrier['location'] && !(carrier['location']['city'] && carrier['location']['state'] && carrier['location']['zip'])) {
        utils.writeErrorResponse(req, res, 'location should have city, state and zip all 3 fields', 400);
        return;
    }
    // const carrier = _.pick(req.body, ['name', 'company', 'address', 'phone', 'website', 'insuranceExpiration', 'smsNumber']);
    global.db.collection('carriers').updateOne({ _id: req.user.id }, { $set: carrier }, function (err, updated) {
        if (err) {
            utils.writeErrorResponse(req, res, err, 400);
        } else {
            utils.writeSuccessResponse(req, res, 'Company information updated');
        }
    });
};

exports.getCreditCard = function (req, res, next) {
    co(function* () {
        const carrier = yield global.db.collection('carriers').findOne({ _id: req.user.id }, { creditCard: 1 });
        if (carrier.creditCard) {
            return { cardNumber: utils.blindCreditCard(carrier.creditCard.cardNumber),
                     expirationDate: carrier.creditCard.expirationDate }; 
        } else{
          return undefined;  
        } 
    }).then(creditCard => {
        utils.writeSuccessResponse(req, res, creditCard);
    }).catch(err => {
        utils.writeErrorResponse(req, res, err, 400);
    });
};

exports.updateCreditCard = function (req, res, next) {
    co(function* () {
        const creditCard = _.pick(req.body, ['cardNumber', 'expirationDate', 'cardCode']);
        const ccError = paymentGateway.isInvalidCreditCard(creditCard);
        if (ccError) throw ccError;
        yield global.db.collection('carriers').updateOne({ _id: req.user.id }, { $set: { creditCard: creditCard } });
        return creditCard;
    }).then(creditCard => {
        utils.writeSuccessResponse(req, res, { cardNumber: utils.blindCreditCard(creditCard.cardNumber),
            expirationDate: creditCard.expirationDate });
    }).catch(err => {
        utils.writeErrorResponse(req, res, err, 400);
    });
};