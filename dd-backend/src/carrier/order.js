'use strict';

const co = require('co');
const _ = require('lodash');

const utils = require('../core/utils');
const email = require('../core/email');
const carrierModule = require('./carrier');
const paymentGateway = require('../core/payment-gateway');
const shippingPrice = require('../core/shipping-price');

exports.orders = function (req, res, next) {
    co(function* () {
        const output = { dispatched: 0, pickedup: 0, delivered: 0, total: 0 };
        let counts = [];
        for (const status of ['Dispatched', 'Pickedup', 'Delivered']) {
            const carrierId = carrierModule.getCurrentCarrierId(req.user);
            let query = { assignedTo: carrierId, status: status };
            if (req.user.role === 'Driver') {
                query['driverId'] = req.user.id;
            }
            counts.push(yield global.db.collection('orders').count(query));
        }
        output.dispatched = counts[0];
        output.pickedup = counts[1];
        output.delivered = counts[2];
        output.total = counts[0] + counts[1] + counts[2];
        return output;
    }).then(output => {
        res.json(output);
    }).catch(error => {
        res.status(400).send(err.toString());
    });
};

exports.ordersDispatched = function (req, res, next) {
    const carrierId = carrierModule.getCurrentCarrierId(req.user);
    let query = { assignedTo: carrierId, status: 'Dispatched' };
    if (req.user.role === 'Driver') {
        query['driverId'] = req.user.id;
    }
    global.db.collection('orders').find(query, { shipper: 1, pickup: 1, delivery: 1, vehicles: 1, shipperFeePerc: 1, package: 1, packagePrice: 1, dispatchRequest: 1, requestedFrom: 1 }).toArray(function (err, orders) {
        if (err) return res.status(400).send(err.toString());
        orders.forEach(order => {
            const loadRequest = order.dispatchRequest || order.requestedFrom.find(loadRequest => loadRequest.carrierId == carrierId);
            order.carrier = {
                pickupDate: loadRequest.pickupDate,
                deliveryDate: loadRequest.deliveryDate
            };
        });
        res.json(orders);
    });
};

exports.Undispatch = function (req, res, next) {
    global.db.collection('orders').findOneAndUpdate(
                        { "_id": req.body.id },
                        { $set : { "status" : "pending" , "reason":req.body.reason,"created":new Date()}},function (err, data) {
            if (err) return res.status(400).send(err.toString());
        res.json(data);
    });
};


exports.ordersPickedup = function (req, res, next) {
    const carrierId = carrierModule.getCurrentCarrierId(req.user);
    let query = { assignedTo: carrierId, status: 'Pickedup' };
    if (req.user.role === 'Driver') {
        query['driverId'] = req.user.id;
    }
    global.db.collection('orders').find(query, { shipper: 1, pickup: 1, delivery: 1, vehicles: 1, shipperFeePerc: 1, package: 1, packagePrice: 1, dispatchRequest: 1, requestedFrom: 1 }).toArray(function (err, orders) {
        if (err) return res.status(400).send(err.toString());
        orders.forEach(order => {
            const loadRequest = order.dispatchRequest || order.requestedFrom.find(loadRequest => loadRequest.carrierId == carrierId);
            order.carrier = {
                pickupDate: loadRequest.pickupDate,
                deliveryDate: loadRequest.deliveryDate
            };
        });
        res.json(orders);
    });
};

exports.ordersDelivered = function (req, res, next) {
    const carrierId = carrierModule.getCurrentCarrierId(req.user);
    let query = { assignedTo: carrierId, status: 'Delivered' };
    if (req.user.role === 'Driver') {
        query['driverId'] = req.user.id;
    }
    global.db.collection('orders').find(query, { shipper: 1, pickup: 1, delivery: 1, vehicles: 1, shipperFeePerc: 1, package: 1, packagePrice: 1, dispatchRequest: 1, requestedFrom: 1 }).toArray(function (err, orders) {
        if (err) return res.status(400).send(err.toString());
        orders.forEach(order => {
            const loadRequest = order.dispatchRequest || order.requestedFrom.find(loadRequest => loadRequest.carrierId == carrierId);
            order.carrier = {
                pickupDate: loadRequest.pickupDate,
                deliveryDate: loadRequest.deliveryDate
            };
        });
        res.json(orders);
    });
};

exports.getOrder = function (req, res, next) {
    const carrierId = carrierModule.getCurrentCarrierId(req.user);
    global.db.collection('orders').findOne({ _id: req.params.id, assignedTo: carrierId }, { shipper: 1, pickup: 1, delivery: 1, vehicles: 1, shipment: 1, status: 1, polylineEncoded: 1, distance: 1, shipperFeePerc: 1, package: 1, packagePrice: 1, dispatchRequest: 1, requestedFrom: 1 }, function (err, order) {
        if (err) return res.status(400).send(err.toString());
        if (!order) return res.status(400).send("Order not found");
        const loadRequest = order.dispatchRequest || order.requestedFrom.find(loadRequest => loadRequest.carrierId == carrierId);
        order.carrier = {
            pickupDate: loadRequest.pickupDate,
            deliveryDate: loadRequest.deliveryDate
        };
        res.json(order);
    });
};

exports.pickupOrder = co.wrap(function* (orderId) {
    const order = yield global.db.collection('orders').findOne({ _id: orderId, status: 'Dispatched' }, {
        assignedTo: 1, shipper: 1, pickup: 1, delivery: 1, vehicles: 1, shipment: 1, token: 1, 'creditCard.cardNumber': 1,
        shipperFeePerc: 1, shipperAuthorization: 1, shipperAuthorizationReleased: 1, totalFeeAuthorized: 1, totalFeeCaptured: 1, totalFeeReleased: 1,
        shipperFeeAuthorized: 1, shipperFeeCaptured: 1, shipperFeeReleased: 1, carrierFeeAuthorized: 1, carrierFeeCaptured: 1, carrierFeeReleased: 1,
        package: 1, packagePrice: 1, dispatchRequest: 1, requestedFrom: 1
    });
    if (!order) throw new Error('Order not found');
    const carrierId = order.assignedTo;
    // blind shipper cc
    const shipperCardNumberBlind = order.creditCard ? utils.blindCreditCard(order.creditCard.cardNumber) : '';
    delete order.creditCard;
    // release shipper order authorization
    if (order.shipperAuthorization && !order.shipperAuthorizationReleased && !order.shipperAuthorizationCaptured) {
        if (utils.daysPassed(order.shipperAuthorization.datetime) <= 30) {
            const shipperAuthTransId = yield paymentGateway.voidTransaction(order.shipperAuthorization.transId, 'Shipper order authorization released for order # ' + order._id);
            yield global.db.collection('orders').updateOne({ _id: order._id }, { $set: { shipperAuthorizationReleased: { amount: order.shipperAuthorization.amount, transId: shipperAuthTransId, datetime: new Date() } } });
            const authReleasedEmail = {
                to: order.shipper.email,
                from: email.addresses.sales,
                subject: 'Order #' + order._id + ' - Credit Card Authorization Released'
            };
            email.send(authReleasedEmail, { cardNumber: shipperCardNumberBlind }, 'shipper/authorization-released.html');
        }
    }
    // capture total fee
    if (order.totalFeeAuthorized) {
        if (!order.totalFeeCaptured && !order.totalFeeReleased) {
            if (utils.daysPassed(order.totalFeeAuthorized.datetime) > 30) throw 'Cannot capture total fee from carrier because 30 days passed';
            const totalFeeTransId = yield paymentGateway.captureTransaction(order.totalFeeAuthorized.transId, order.totalFeeAuthorized.amount, '9% total fee captured via carrier cc for order # ' + order._id);
            yield global.db.collection('orders').updateOne({ _id: order._id }, { $set: { totalFeeCaptured: { amount: order.totalFeeAuthorized.amount, transId: totalFeeTransId, datetime: new Date() } } });
        }
    } else {
        if (order.shipperFeeAuthorized && !order.shipperFeeCaptured && !order.shipperFeeReleased) {
            if (utils.daysPassed(order.shipperFeeAuthorized.datetime) > 30) throw 'Cannot capture 5% fee from carrier because 30 days passed';
            const shipperFeeTransId = yield paymentGateway.captureTransaction(order.shipperFeeAuthorized.transId, order.shipperFeeAuthorized.amount, '5% shipper fee captured via carrier cc for order # ' + order._id);
            yield global.db.collection('orders').updateOne({ _id: order._id }, { $set: { shipperFeeCaptured: { amount: order.shipperFeeAuthorized.amount, transId: shipperFeeTransId, datetime: new Date() } } });
        }
        if (order.carrierFeeAuthorized && !order.carrierFeeCaptured && !order.carrierFeeReleased) {
            if (utils.daysPassed(order.carrierFeeAuthorized.datetime) > 30) throw 'Cannot capture 4% fee from carrier because 30 days passed';
            const carrierFeeTransId = yield paymentGateway.captureTransaction(order.carrierFeeAuthorized.transId, order.carrierFeeAuthorized.amount, '4% carrier fee captured via carrier cc for order # ' + order._id);
            yield global.db.collection('orders').updateOne({ _id: order._id }, { $set: { carrierFeeCaptured: { amount: order.carrierFeeAuthorized.amount, transId: carrierFeeTransId, datetime: new Date() } } });
        }
    }
    // TODO: send carrier notification for capture
    yield global.db.collection('orders').updateOne({ _id: order._id }, { $set: { status: 'Pickedup' } });
    const carrier = yield global.db.collection('carriers').findOne({ _id: carrierId }, { name: 1, company: 1, phone: 1, email: 1 });
    const loadRequest = order.dispatchRequest || order.requestedFrom.find(loadRequest => loadRequest.carrierId == carrierId);
    carrier.pickupDate = loadRequest.pickupDate;
    carrier.deliveryDate = loadRequest.deliveryDate;
    order.carrier = carrier;
    const message = {
        to: order.shipper.email,
        from: email.addresses.sales,
        subject: 'Order #' + order._id + ' - Your vehicle(s) has been picked up'
    };
    email.send(message, Object.assign({ utils: _.pick(shippingPrice, ['getVehiclePrice', 'getTotalPrice']) }, order), 'shipper/order-pickedup.html');
});

exports.deliverOrder = co.wrap(function* (orderId) {
    yield global.db.collection('orders').updateOne({ _id: orderId, status: 'Pickedup' }, { $set: { status: 'Delivered' } });
    const order = yield global.db.collection('orders').findOne({ _id: orderId }, { creditCard: 0 });
    const carrier = yield global.db.collection('carriers').findOne({ _id: order.assignedTo }, { name: true, company: true, phone: true, email: true });
    order.carrier = carrier;
    const message = {
        to: order.shipper.email,
        from: email.addresses.sales,
        subject: 'Order #' + order._id + ' - Your vehicle(s) has been delivered successfully'
    };
    email.send(message, Object.assign({ utils: _.pick(shippingPrice, ['getVehiclePrice', 'getTotalPrice']) }, order), 'shipper/order-delivered.html');
});

exports.pickupOrderRoute = function (req, res, next) {
    co(function* () {
        const order = yield global.db.collection('orders').findOne({ _id: req.params.id, status: 'Dispatched' }, { assignedTo: 1 });
        if (order.assignedTo != req.user.id) throw 'You are not assigned to this order, not authorized to mark as pickedup';
        yield exports.pickupOrder(req.params.id);
    }).then(() => {
        res.send('Order pickedup by carrier');
    }).catch(err => {
        res.status(400).send(err.toString());
    });
};

exports.deliverOrderRoute = function (req, res, next) {
    co(function* () {
        const order = yield global.db.collection('orders').findOne({ _id: req.params.id, status: 'Pickedup' }, { assignedTo: 1 });
        if (order.assignedTo != req.user.id) throw 'You are not assigned to this order, not authorized to mark as pickedup';
        yield exports.deliverOrder(req.params.id);
    }).then(output => {
        res.send('Order delivered by carrier');
    }).catch(error => {
        res.status(400).send(err.toString());
    });
};