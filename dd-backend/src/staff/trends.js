"use strict";

const _ = require('lodash');
const co = require('co');
const moment = require('moment');
require('moment-range');

const getCounts = co.wrap(function* (type, interval, limit) {
    if (['day', 'month'].indexOf(interval) == -1) throw 'invalid interval';
    const startDate = moment().startOf(interval).subtract(limit - 1, interval).toDate();
    const endDate =  moment().startOf(interval).toDate();
    const range = moment.range(startDate, endDate);
    const fields = type === 'revenues' ? { created: 1, totalFeeCaptured: 1, shipperFeeCaptured: 1, carrierFeeCaptured: 1, _id: 0 } : { created: 1, _id: 0 };
    const records = yield global.db.collection(type === 'revenues' ? 'orders' : type).find({ created: { $gte: startDate } }, fields).toArray();
    let format;
    if (interval === 'day') {
        format = 'D MMM';   
    } else if (interval === 'month') {
        format = 'MMM YYYY';
    }
    let aggregate;
    if (type === 'revenues')  {
        aggregate = (records) => {
            return _.sum(records.map(record => (record.totalFeeCaptured && record.totalFeeCaptured.amount) || ((record.shipperFeeCaptured && record.shipperFeeCaptured.amount) + (record.carrierFeeCaptured && record.carrierFeeCaptured.amount))));  
        };
    } else {
        aggregate = (records) => records.length;
    }
    const stats = range.toArray(interval).map(mDate => {
        return { label: mDate.format(format), value: aggregate(records.filter(record => { return mDate.isSame(record.created, interval); })) };
    });
    return stats;
});

exports.getLeadsCounts = function (req, res, next) {
    co(function* () {
        return yield getCounts('leads', req.params.interval, Number(req.params.limit) || 10);
    }).then(stats => {
        res.json(stats);
    }).catch(err => {
        res.status(400).send(err.toString());
    });
};

exports.getOrdersCounts = function (req, res, next) {
    co(function* () {
        return yield getCounts('orders', req.params.interval, Number(req.params.limit) || 10);
    }).then(stats => {
        res.json(stats);
    }).catch(err => {
        res.status(400).send(err.toString());
    });
};

exports.getCarriersCounts = function (req, res, next) {
    co(function* () {
        return yield getCounts('carriers', req.params.interval, Number(req.params.limit) || 10);
    }).then(stats => {
        res.json(stats);
    }).catch(err => {
        res.status(400).send(err.toString());
    });
};

exports.getRevenuesCounts = function (req, res, next) {
    co(function* () {
        return yield getCounts('revenues', req.params.interval, Number(req.params.limit) || 10);
    }).then(stats => {
        res.json(stats);
    }).catch(err => {
        res.status(400).send(err.toString());
    });
};