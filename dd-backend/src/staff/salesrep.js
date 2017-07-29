"use strict";

const co = require('co');
const _ = require('lodash');
const moment = require('moment');
const staffNotifications = require('../core/notifications')('staff');

exports.getNextSalesrepId = function () {
    return co(function* () {
        const salesreps = yield global.db.collection('staff').find({ type: 'salesrep', enabled: true, slots: { $ne: 0 } },
                                { slots: true, count: true }).toArray();
        if (salesreps.length === 0) return null;
        let available = salesreps.filter(salesrep => {
            return salesrep.slots > salesrep.count;
        });
        let salesrepId = available[0] && available[0]._id;
        // reset cycle for next iteration
        if (!salesrepId) {
            yield global.db.collection('staff').updateMany({ type: 'salesrep' }, { $set: { count: 0 } });
            salesrepId = salesreps[0]._id;
        }
        yield global.db.collection('staff').updateOne({ _id: salesrepId }, { $inc: { count: 1 } });
        return salesrepId;
    });
};

exports.addPoints = co.wrap(function* (salesrepId, points, type, subtype, label, objects ) {
    yield global.db.collection('salesrepPoints').insertOne({ datetime: new Date(), salesrepId: salesrepId, points: points, type: type, subtype: subtype, label: label, objects: objects});
    const notifyMsg = { type: 'new-points', title: points + ' Bonus Points Awarded',
                        contents: label,
                        params: null };
    staffNotifications.emit({role: 'salesrep', id: salesrepId }, notifyMsg);
});

const getPoints = co.wrap(function* (salesrepId, month, year) {
    const date = new Date(year, month - 1, 1);
    const startDate = moment(date).startOf('month').toDate();
    const endDate = moment(date).endOf('month').toDate();
    const records = yield global.db.collection('salesrepPoints').find({ salesrepId: salesrepId, datetime: { $gte: startDate, $lte: endDate } }).toArray();
    const typeGroups = _.groupBy(records, 'type');
    _.forEach(typeGroups, (values, type) => {
        typeGroups[type] = _.groupBy(values, 'subtype');
        _.forEach(typeGroups[type], (values, subtype) => {
            typeGroups[type][subtype] = { quantity: values.length, points: _.sum(values.map(v => v.points)), orderIds: values.map(v => v.objects.orderId) };
        });
        typeGroups[type].totalPoints = _.sum(_.map(typeGroups[type], v => v.points));
        typeGroups[type].totalQuantity = _.sum(_.map(typeGroups[type], v => v.quantity));
    });
    typeGroups.totalPoints = _.sum(_.map(typeGroups, v => v.totalPoints));
    typeGroups.totalBonus = Math.round(typeGroups.totalPoints/25000) * 200;
    return typeGroups;
});

exports.getSalesrepBonus = function (req, res, next) {
    co(function* () {
        let salesrepId = req.params.id;
        if (salesrepId == 'current') {
            salesrepId = req.user.id;
        }
        const year = Number(req.params.year);
        const month = Number(req.params.month);
        return yield getPoints(salesrepId, month, year);
    }).then(bonus => {
        res.json(bonus);
    }).catch(err => {
        res.status(400).send(err.toString());
    });
};