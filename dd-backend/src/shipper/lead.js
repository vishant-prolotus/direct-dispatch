"use strict";

const crypto = require('crypto');
const _ = require('lodash');
const co = require('co');
const bluebird = require('bluebird');

const uniqueId = require('../core/unique-id');
const email = require('../core/email');
const salesrepFunc = require('../staff/salesrep');
const utils = require('../core/utils');
const shippingPrice = require('../core/shipping-price');
const emailSchedulingClient = require('../email-scheduling-client');

exports.list = function (req, res, next) {
    co(function* () {
        let query = {}, result = { items: [], count: 0 };
        if (req.user.role === 'salesrep') query['salesrepId'] = req.user.id;
        if (req.query.searchBy) query[req.query.searchBy] = new RegExp(req.query.searchQuery, 'i');
        console.log(req.query.limit,req.query.skip);
        const options = {
            sortBy: req.query.sortBy || '_id',
            sortOrder: Number(req.query.sortOrder) || 1,
            skip: Number(req.query.skip) || 0,
            limit: Number(req.query.limit) || 100
        };
        let sortBy = {};
        sortBy[options.sortBy] = options.sortOrder;
        const leads = yield global.db.collection('leads').find(query,
            { created: 1, name: 1, phone: 1, email: 1, origin: 1, destination: 1, vehicles: 1, source: 1, salesrepId: 1, shipperFeePerc: 1 })
            .sort(sortBy).skip(options.skip).limit(options.limit).toArray();
        result.items = yield bluebird.map(leads, (lead) => {
            return co(function* () {
                const salesrep = yield global.db.collection('staff').findOne({ _id: lead.salesrepId }, { name: true });
                if (salesrep)
                    lead.salesrepName = salesrep.name;
                return lead;
            });
        });
        result.count = yield global.db.collection('leads').find(query, { _id: true }).count();
        return result;
    }).then(result => {
        res.json({ total: result.count, items: result.items });
    }).catch(err => {
        res.status(400).send(err.toString());
    });
};

exports.get = function (req, res, next) {
    global.db.collection('leads').findOne({ _id: req.params.id },
        { created: 1, name: 1, phone: 1, email: 1, origin: 1, destination: 1, carrierType: 1, vehicles: 1, distance: 1, polylineEncoded: 1, source: 1, salesrepId: 1, shipperFeePerc: 1, marketing: 1 },
        (err, lead) => {
            if (err)
                return res.status(400).send(err.toString());
            res.json(lead);
        });
};

function insertLead(lead) {
    return co(function* () {
        lead._id = yield uniqueId.generate('leads');
        lead.created = new Date();
        lead.calculatedAt = new Date();
        lead.token = utils.generateToken();
        if (!lead.salesrepId) {
            lead.salesrepId = yield salesrepFunc.getNextSalesrepId();
        }
        const inserted = yield global.db.collection('leads').insertOne(lead);
        //emailSchedulingClient.schedule(lead._id);
        return inserted.insertedId;
    });
}

exports.deleteLead = function (leadId) {
    emailSchedulingClient.cancel(leadId);
    return global.db.collection('leads').deleteOne({ _id: leadId });
};

exports.insert = function (req, res, next) {
    co(function* () {
        if (req.user.role === 'salesrep') {
            req.body.salesrepId = req.user.id;
        }
        // todo validate
        yield insertLead(req.body);
    }).then(result => {
        res.send('Lead inserted');
    }).catch(err => {
        res.status(400).send(err.toString());
    });
};

exports.update = function (req, res, next) {
    co(function* () {
        // Todo validate
        delete req.body._id;
        delete req.body.created;
        const updated = yield global.db.collection('leads').updateOne({ _id: req.params.id }, { $set: req.body });
        return updated;
    }).then(result => {
        res.send('Lead updated');
    }).catch(err => {
        res.status(400).send(err.toString());
    });
};

exports.del = function (req, res, next) {
    co(function* () {
        return exports.deleteLead(req.params.id);
    }).then(result => {
        res.send('Lead deleted');
    }).catch(err => {
        res.status(400).send(err.toString());
    });
};

function emailQuote(lead) {
    const message = {
        from: email.addresses.sales,
        to: lead.email,
        subject: 'Lowest price guaranteed #' + lead._id
    };
    return email.send(message, Object.assign({ utils: _.pick(shippingPrice, ['getVehiclePrice', 'getTotalPrice', 'packagePrices']) }, lead), 'shipper/lead-quote.html');
}

exports.emailQuoteRoute = function (req, res, next) {
    co(function* () {
        const lead = yield global.db.collection('leads').findOne({ _id: req.params.id });
        const sent = yield emailQuote(lead);
        return sent;
    }).then(result => {
        res.send('Email sent successfully');
    }).catch(err => {
        res.status(400).send(err.toString());
    });
};

function assignToSalesrep(req, res, next) {
    co(function* () {
        const ids = req.body;
        const collection = req.params.type;
        const salesrepId = req.params.id;
        if (!ids || !salesrepId) throw new Error("Required params are missing");
        const updated = yield global.db.collection(collection).updateMany({ _id: { $in: ids } }, { $set: { salesrepId: salesrepId } });
        return updated;
    }).then(result => {
        res.send('Assigned');
    }).catch(err => {
        res.status(400).send(err.toString());
    });
}

exports.emailQuote = emailQuote;
exports.insertLead = insertLead;
exports.assignToSalesrep = assignToSalesrep;