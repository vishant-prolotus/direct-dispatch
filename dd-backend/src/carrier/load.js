'use strict';

const co = require('co');
const geolib = require('geolib');
const _ = require('lodash');

const email = require('../core/email');
const pickerOptions = require('../core/picker-options');
const staffNotifications = require('../core/notifications')('staff');
const shippingPrice = require('../core/shipping-price');
const utils = require('../core/utils');

exports.loads = function (req, res, next) {
    co(function* () {
        const output = { available: 0, requested: 0, total: 0 };
        output.available = yield global.db.collection('orders').count({ status: 'Pending', 'requestedFrom.carrierId': { $ne: req.user.id } });
        output.requested = yield global.db.collection('orders').count({ status: 'Pending', 'requestedFrom.carrierId': req.user.id });
        output.total = output.available + output.requested;
        return output;
    }).then(output => {
        res.json(output);
    }).catch(error => {
        res.status(400).send(err.toString());
    });
};

exports.relevantLoads = function (req, res, next) {
    co(function* () {
        // get carrier routes
        const carrier = yield global.db.collection('carriers').findOne({ _id: req.user.id }, { trucks: true });
        if (carrier.trucks && carrier.trucks.length == 0 || carrier.trucks[0].routes && carrier.trucks[0].routes.length == 0) return [];
        const routes = _.flatten(carrier.trucks.map(t => t.routes));
        for (let route of routes) {
            route.origin.coordinates = yield pickerOptions.cityCoordinates(route.origin.zip);
            route.destination.coordinates = yield pickerOptions.cityCoordinates(route.destination.zip);
        };
        // get orders
        const orders = yield global.db.collection('orders').find(
            { status: 'Pending', 'requestedFrom.carrierId': { $ne: req.user.id } },
            { 'pickup.location': true, 'delivery.location': true, distance: true, 'pickup.dates': true, 'shipment.carrierType': true, vehicles: true, polylineEncoded: true, package: true, packagePrice: true }).sort({ created: -1 }).toArray();
        for (let order of orders) {
            order.pickup.location.coordinates = yield pickerOptions.cityCoordinates(order.pickup.location.zip);
            order.delivery.location.coordinates = yield pickerOptions.cityCoordinates(order.delivery.location.zip);
        };
        // find matching orders
        const matchCity = (cityA, cityB) => {
            return geolib.isPointInCircle(cityA.coordinates, cityB.coordinates, utils.milesToMeters(75));
        };
        const matchedOrders = orders.filter(order => {
            return routes.some(route => {
                const success = matchCity(order.pickup.location, route.origin) && matchCity(order.delivery.location, route.destination);
                if (success) {
                    return true;
                } else if (route.reverse) {
                    return matchCity(order.pickup.location, route.destination) && matchCity(order.delivery.location, route.origin);
                } else {
                    return false;
                }
            });
        });
        return matchedOrders;
    }).then(orders => {
        res.json(orders);
    }).catch(error => {
        res.status(400).send(error.toString());
    });
};

exports.allLoads = function (req, res, next) {
    co(function* () {
        const orders = yield global.db.collection('orders').find({ status: 'Pending', 'requestedFrom.carrierId': { $ne: req.user.id } },
            { 'pickup.location': true, 'delivery.location': true, distance: true, 'pickup.dates': true, 'shipment.carrierType': true, vehicles: true, polylineEncoded: true, package: true, packagePrice: true }).sort({ created: -1 }).toArray();
        return orders;
    }).then(orders => {
        res.json(orders);
    }).catch(err => {
        res.status(400).send(err.toString());
    });
};

exports.getLoad = function (req, res, next) {
    global.db.collection('orders').findOne({ _id: req.params.id, status: 'Pending' }, { 'pickup.location': true, 'delivery.location': true, distance: true, 'pickup.dates': true, 'shipment.carrierType': true, 'shipment.paymentMethod': true, vehicles: true, polylineEncoded: true, package: true, packagePrice: true, shipperFeePerc: true }, function (err, order) {
        if (err) return res.status(400).send(err.toString());
        if (!order) return res.status(400).send("This load is no longer available");
        res.json(order);
    });
};

//exports.rejectLoad = function (req, res, next) {
//    async.waterfall([
//        function (next) {
//            if (typeof req.body.reason !== 'string')
//                return next('Reason not specified');
//            global.db.collection('orders').updateOne({_id: req.params.id, status: 'Pending', 'rejectedBy.id': {$ne: req.user.id}}, {$push: {rejectedBy: {id: req.user.id, reason: req.body.reason, datetime: new Date()}}}, next);
//        }],
//            function (err, result) {
//                if (err)
//                    return res.status(400).send(err.toString());
//                if (!result.modifiedCount)
//                    return res.status(400).send('This operation is not applicable');
//                var notifyMsg = {type: 'load-rejected', title: 'Load offer #' + req.params.id + ' is rejected by carrier #' + req.user.id,
//                    contents: 'Reason: ' + req.body.reason,
//                    params: {orderId: req.params.id, carrierId: req.user.id}};
//                staffNotifications.emit({role: 'admin'}, notifyMsg);
//                res.send('Load offer rejected successfully');
//            });
//}

exports.searchLoad = function (req, res, next) {
    co(function* () {
        const search = req.body;
        let query = { status: 'Pending' };
        if (search.carrierType !== 'Any') query['shipment.carrierType'] = search.carrierType;
        let orders = yield global.db.collection('orders').find(query, { 'pickup.location': true, 'delivery.location': true, distance: true, 'pickup.dates': true, 'shipment.carrierType': true, vehicles: true, polylineEncoded: true, package: true, packagePrice: true }).sort({ created: -1 }).toArray();
        const stateRegion = function (state) {
            if (['ME', 'VT', 'NH', 'MA', 'RI', 'CT', 'NY', 'NJ', 'PA', 'DE'].indexOf(state) !== -1) {
                return 'Northeast';
            } else if (['MD', 'DC', 'VA', 'WV', 'KY', 'TN', 'NC', 'SC', 'AL', 'GA', 'FL'].indexOf(state) !== -1) {
                return 'Southeast';
            } else if (['OH', 'IN', 'IL', 'MO', 'KS', 'WI', 'MI', 'MN', 'IA', 'NE', 'SD', 'ND'].indexOf(state) !== -1) {
                return 'Midwest/Plains';
            } else if (['TX', 'OK', 'AR', 'LA', 'MS'].indexOf(state) !== -1) {
                return 'South';
            } else if (['WA', 'OR', 'ID', 'MT', 'WY'].indexOf(state) !== -1) {
                return 'Northwest';
            } else if (['CA', 'NV', 'UT', 'AZ', 'CO', 'NM'].indexOf(state) !== -1) {
                return 'Southwest';
            } else if (['AK', 'HI'].indexOf(state) !== -1) {
                return 'Pacific';
            }
        };
        // filter by region, state or city
        orders = orders.filter(function (order) {
            let pickup, delivery;
            if (search.pickup.searchBy === 'Region') {
                pickup = stateRegion(order.pickup.location.state) === search.pickup.region;
            } else if (search.pickup.searchBy === 'State') {
                pickup = order.pickup.location.state === search.pickup.state;
            } else if (search.pickup.searchBy === 'City') {
                pickup = order.pickup.location.city === search.pickup.location.city && order.pickup.location.state === search.pickup.location.state;
            }
            if (search.delivery.searchBy === 'Region') {
                delivery = stateRegion(order.delivery.location.state) === search.delivery.region;
            } else if (search.delivery.searchBy === 'State') {
                delivery = order.delivery.location.state === search.delivery.state;
            } else if (search.delivery.searchBy === 'City') {
                delivery = order.delivery.location.city === search.delivery.location.city && order.delivery.location.state === search.delivery.location.state;
            }
            return pickup && delivery;
        });
        // filter by pickup date range
        if (search.pickupDateStart) {
            const startDate = new Date(search.pickupDateStart);
            orders = orders.filter(function (order) {
                return order.pickup.dates.split(', ').map(date => new Date(date)).some(date => date >= startDate);
            });
        }
        if (search.pickupDateEnd) {
            const endDate = new Date(search.pickupDateEnd);
            orders = orders.filter(function (order) {
                return order.pickup.dates.split(', ').map(date => new Date(date)).some(date => date <= endDate);
            });
        }
        return orders;
    }).then(orders => {
        res.json(orders);
    }).catch(err => {
        res.status(400).send(err.toString());
    });
};