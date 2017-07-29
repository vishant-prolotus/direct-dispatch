"use strict";

const co = require('co');
const request = require('request');
const promisify = require('bluebird').promisify;
const cheerio = require('cheerio');
const _ = require('lodash');

const email = require('../core/email');
const uniqueId = require('../core/unique-id');
const utils = require('../core/utils');
const pickerOptions = require('../core/picker-options');
const config = require('../config');

exports.insertCarrier = function(obj) {
    return co(function* () {
        const fields = ['email', 'insuranceExpiration', 'name', 'company', 'address', 'location', 'phone', 'dot', 'mc'];
        const carrier = _.pick(obj, fields);
        // Removing the fields from mandatory list as per https://directdispatch.atlassian.net/browse/BOL-104
        const requiredFields = ['email', 'company', 'phone', 'dot', 'mc'];
        if (requiredFields.some(field => !carrier[field])) throw 'Required field missing';
        carrier.email = carrier.email.toLowerCase();
        const emailExist = yield global.db.collection('carriers').findOne({ email: carrier.email }, { _id: true });
        if (emailExist) throw 'Email already registered';
        const dotExist = yield global.db.collection('carriers').findOne({ dot: carrier.dot }, { email: 1, company: 1 });
        if (dotExist) throw `Carrier company: ${dotExist.company} (${dotExist.email}) already registered with same DOT`;
        carrier._id = yield uniqueId.generate('carriers');
        carrier.created = new Date();
        carrier.activationToken = utils.generateToken();
        yield global.db.collection('carriers').insertOne(carrier);
        return carrier;
    });
};

exports.sendWelcomeEmail = function(carrier) {
    return co(function* () {
        const message = {
            from: email.addresses.noReply,
            to: carrier.email,
            subject: 'Welcome to Direct Dispatch'
        };
        yield email.send(message, {carrier: carrier, host: config.host}, 'carrier/registered.html');
        yield global.db.collection('carriers').updateOne({ _id: carrier._id }, { $set: { activationLinkSent: new Date() } });
    });
};

const getCarrierGovInfo = function(dotNumber) {
    const httpPost = promisify(request.post, { multiArgs: true });
    return co(function* () {
        const resp = yield httpPost({ url: 'http://li-public.fmcsa.dot.gov/LIVIEW/pkg_carrquery.prc_carrlist', form: { n_dotno: dotNumber } });
        if (resp[0].statusCode !== 200) throw resp[1];
        const html = cheerio.load(resp[1]);
        const carrierId = html('form [name="pv_apcant_id"]').attr('value');
        if (!carrierId) return null;
        const resp2 = yield httpPost({ url: 'http://li-public.fmcsa.dot.gov/LIVIEW/pkg_carrquery.prc_getdetail', form: { pv_apcant_id: carrierId } });
        if (resp2[0].statusCode !== 200) throw resp2[1];
        const html2 = cheerio.load(resp2[1]);
        const separator = '--.--';
        [html2('td[headers="business_address"]'), html2('td[headers="business_tel_and_fax"]')].forEach(node => {
            node.html(node.html().replace('&#xA0;', separator));
        });
        const carrierInfo = {
            dot: dotNumber,
            mc: html2('td[id="ldocketnumber"]').text().trim().substr(2),
            name: utils.properCase(html2('td[headers="lname"]').text().trim()),
            company: utils.properCase(html2('td[headers="dba_name"]').text().trim()),
            address: utils.properCase(html2('td[headers="business_address"]').text().trim()),
            phone: html2('td[headers="business_tel_and_fax"]').text().trim(),
            authorized: html2('td[headers="common authority_status"]').text().trim() == 'ACTIVE' || html2('td[headers="contract authority_status"]').text().trim() == 'ACTIVE',
        };
        for (const key of ['name', 'company']) {
            carrierInfo[key] = carrierInfo[key].replace('Llc', 'LLC');
        }
        if (!carrierInfo.company) {
            carrierInfo.company = carrierInfo.name;
            carrierInfo.name = null;
        }
        const zip = carrierInfo.address.substr(carrierInfo.address.length - 5);
        carrierInfo.location = yield pickerOptions.getCityByZip(zip);
        carrierInfo.address = carrierInfo.address.substr(0, carrierInfo.address.search(separator));
        carrierInfo.phone = carrierInfo.phone.substr(0, carrierInfo.phone.search(separator)).replace(/\D*/g, '');
        return carrierInfo;
    }).catch(err => {
        const errMsg = 'Failed to communicate with fmcsa.dot.gov to verify USDOT number.';
        console.log(errMsg);
        console.log(err);
        throw errMsg;
    })
};

exports.getCarrierGovInfoRoute = function(req, res, next) {
    co(function* () {
        const dotNumber = req.params.dot;
        if (!dotNumber) throw 'Required param missing';
        if (!/^\d+$/.test(dotNumber)) throw 'DOT number should only contain numeric characters';
        const dotExist = yield global.db.collection('carriers').findOne({ dot: dotNumber }, { email: 1 });
        if (dotExist) throw `Account ${dotExist.email} already registered with this DOT number`;
        const carrier = yield getCarrierGovInfo(dotNumber);
        if (!carrier) throw 'No carrier information found with this DOT number. Please recheck and try again';
        if (!carrier.authorized) throw 'Based on the Federal Motor Carrier Safety Administration your Common Carrier status is INACTIVE.';
        return carrier;
    }).then(carrier => {
        res.json(carrier);
    }).catch(err => {
        res.status(400).send(err.toString());
    });
};

exports.collection = {};

exports.collection.fetch = (query, fields) => {
    return global.db.collection('carriers').findOne(query, fields);
};

exports.getCurrentCarrierId = (user) => {
    return user.role === 'Owner' ? user.id : user.carrierId;
};