"use strict";

const co = require('co');
const _ = require('lodash');

exports.send = function (to, msg) {
    return co(function* () {
        if (process.argv[2] === '--production') {
            const config = require('../config');
            const twilio = require('twilio')(config.twilio.accountSid, config.twilio.authToken);
            const res = yield twilio.sendMessage({ to: to, from: config.twilio.fromNumber, body: msg });
            return res.sid;
        } else {
            console.log('SMS', to, msg);
            return 'console.log';
        }
    }).catch(err => {
        console.log('Could not send SMS');
        console.log(err);
        throw err;
    });
};


exports.log = function (obj) {
    const record = _.pick(obj, ['type', 'refs', 'to', 'message', 'twilioId']);
    return global.db.collection('smsLogs').insertOne(Object.assign({ dateTime: new Date() }, record));
};