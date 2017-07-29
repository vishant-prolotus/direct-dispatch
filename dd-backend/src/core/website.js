"use strict";

const co = require('co');

const email = require('../core/email');

exports.enterpriseLead = function (req, res, next) {
    const data = req.body;
    if (data.name && data.email && data.phone && data.message) {
        const message = {
            from: email.addresses.noReply,
            to: email.addresses.info,
            subject: 'New Enterprise Lead Query - ' + (new Date()).toString()
        };
        email.sendText(message, data, 'website/enterprise-lead.txt');
        res.send('Query received, Thanks!');
    } else {
        res.status(400).send('Required fields missing');
    }
};

