"use strict";

const _ = require('lodash');
const co = require('co');
const bluebird = require('bluebird');
const geolib = require('geolib');

const utils = require('./utils');
const leadModule = require('../shipper/lead');
const uniqueId = require('./unique-id');
const email = require('./email');
const pickerOptions = require('./picker-options');
const sms = require('./sms');
const salesrepFunc = require('../staff/salesrep');
const carrierNotifications = require('./notifications')('carrier');
const staffNotifications = require('./notifications')('staff');
const paymentGateway = require('./payment-gateway');
const shippingPrice = require('./shipping-price');
const carrierOrder = require('../carrier/order');
const salesrepModule = require('../staff/salesrep');

const RADIUS_MAX = 100;

exports.list = function (req, res, next) {
    co(function* () {
        let query = {}, result = { items: [], count: 0 };
        if (req.user.type === 'staff' && req.user.role === 'salesrep') {
            query['salesrepId'] = req.user.id;
        } else if (req.user.type === 'dealer') {
            query['dealerId'] = req.user.id;
        }
        if (req.query.searchBy) {
            query[req.query.searchBy] = new RegExp(req.query.searchQuery, 'i');
        }
         console.log(req.query.skip);
        const options = {
            sortBy: req.query.sortBy || '_id',
            sortOrder: Number(req.query.sortOrder) || 1,
            skip: Number(req.query.skip) || 0,
            limit: Number(req.query.limit) || 100
        };
        let sortBy = {};
        sortBy[options.sortBy] = options.sortOrder;
       
        const orders = yield global.db.collection('orders').find(query,
            { created: true, 'shipper.name': true, 'shipper.email': true, 'shipper.phone': true, 'pickup.dates': true, 'pickup.location': true, 'delivery.location': true, vehicles: true, salesrepId: true, dealerId: true, status: true, source: true, package: true, packagePrice: true, shipperFeePerc: true })
            .sort(sortBy).skip(options.skip).limit(options.limit).toArray();
        result.items = yield bluebird.map(orders, function (order) {
            return co(function* () {
                const salesrep = yield global.db.collection('staff').findOne({ _id: order.salesrepId }, { name: true });
                if (salesrep)
                    order.salesrepName = salesrep.name;
                return order;
            });
        });
        result.count = yield global.db.collection('orders').find(query, { _id: true }).count();
        return result;
    }).then(result => {
        res.json({ total: result.count, items: result.items });
    }).catch(err => {
        res.status(400).send(err.toString());
    });
};

exports.get = function (req, res, next) {
    co(function* () {
        const query = { _id: req.params.id };
        if (req.user.type === 'staff' && req.user.role === 'salesrep') {
            query['salesrepId'] = req.user.id;
        } else if (req.user.type === 'dealer') {
            query['dealerId'] = req.user.id;
        }
        let order = yield global.db.collection('orders').findOne(query, {
                shipper: 1, pickup: 1, delivery: 1, vehicles: 1, shipment: 1, assignedTo: 1, dealerId: 1, distance: 1, polylineEncoded: 1, created: 1, status: 1, notes: 1, package: 1, packagePrice: 1, shipperAuthorization: 1, shipperAuthorizationReleased: 1, shipperAuthorizationCaptured: 1,
                shipperFeeAuthorized: 1, shipperFeeCaptured: 1, shipperFeeReleased: 1, carrierFeeAuthorized: 1, carrierFeeCaptured: 1, carrierFeeReleased: 1, totalFeeAuthorized: 1, totalFeeCaptured: 1, totalFeeReleased: 1, shipperFeePerc: 1, requestedFrom: 1, dispatchRequest: 1, marketing: 1, source: true
            });
        if (!order) throw 'Order not found';
        if (order.assignedTo) {
            const carrier = yield global.db.collection('carriers').findOne({ _id: order.assignedTo }, { company: 1, name: 1, phone: 1, email: 1 });
            const loadRequest = order.dispatchRequest || order.requestedFrom.find(loadRequest => loadRequest.carrierId == order.assignedTo);
            carrier.pickupDate = loadRequest.pickupDate;
            carrier.deliveryDate = loadRequest.deliveryDate;
            delete order.assignedTo;
            order.carrier = carrier;
        }
        if (req.user.type === 'staff' && order.dealerId) {
            const dealer = yield global.db.collection('dealers').findOne({ _id: order.dealerId }, { company: 1, name: 1, phone: 1, email: 1 });
            order.dealer = dealer;
        }
        return order;
    }).then(order => {
        res.json(order);
    }).catch(err => {
        res.status(400).send(err.toString());
    });
};

function emailSubmitted(order) {
    const message = {
        from: email.addresses.sales,
        to: order.shipper.email,
        subject: 'Vehicle Shipping Order Submitted # ' + order._id
    };
    return email.send(message, Object.assign({ utils: _.pick(shippingPrice, ['getVehiclePrice', 'getTotalPrice']) }, order), 'shipper/order-submitted.html');
}

exports.emailSubmittedRoute = function (req, res, next) {
    co(function* () {
        const order = yield global.db.collection('orders').findOne({ _id: req.params.id });
        yield emailSubmitted(order);
    }).then(result => {
        res.send('Email sent successfully');
    }).catch(err => {
        res.status(400).send(err.toString());
    });
};

const validateOrder = function (order) {
    return order.shipper && order.shipper.name && order.shipper.email && order.shipper.phone &&
        order.pickup && order.pickup.dates && order.pickup.address && order.pickup.location && order.pickup.contactType &&
        order.delivery && order.delivery.address && order.delivery.location && order.delivery.contactType &&
        order.shipment && order.shipment.carrierType && order.package && order.creditCard && order.creditCard.cardNumber && order.creditCard.expirationDate && order.creditCard.cardCode &&
        order.vehicles && order.vehicles.length > 0 && order.vehicles[0].make && order.vehicles[0].model && order.vehicles[0].year && order.vehicles[0].type && order.vehicles[0].condition && order.vehicles[0].price;
};

function insertOrder(order) {
    const authorizationAmount = 100;
    let insertedId, transId;
    const loadAlertConfig = require('../email-templates/config');
    return co(function* () {
        if (loadAlertConfig.validateInput) throw 'Error, invalid input from the user, required field is missing';
        if (!validateOrder(order)) throw new Error('Required parameter missing');
        const ccError = paymentGateway.isInvalidCreditCard(order.creditCard);
        if (ccError) throw new Error(ccError);
        if (order._id) {
            // copy notes, source and marketing meta from lead to order
            const lead = yield global.db.collection('leads').findOne({ _id: order._id }, { notes: 1, source: 1, created: 1, marketing: 1,  salesrepId: 1 });
            order.notes = lead.notes;
            order.leadCreated = lead.created;
            order.source = lead.source;
            order.marketing = lead.marketing;
        } else {
            order._id = yield uniqueId.generate('leads');
        }
        order.created = new Date();
        order.status = 'Pending';
        transId = yield paymentGateway.authorizeCreditCard(order.creditCard, authorizationAmount, 'Shipper authorization for order # ' + order._id);
        order.shipperAuthorization = { amount: authorizationAmount, transId: transId, datetime: new Date() };
        order.token = utils.generateToken();
        const result = yield global.db.collection('orders').insertOne(order);
        emailSubmitted(order);
        if (order.dealerId) {
            const notifyMsg = { type: 'dealer-new-order', title: 'Dealer Placed Order # ' + order._id,
                                contents: 'Origin: ' + utils.joinCity(order.pickup.location) + ' Destination: ' + utils.joinCity(order.delivery.location) + ' Vehicle: ' + utils.joinModel(order.vehicles[0]),
                                params: {orderId: order._id, dealerId: order.dealerId} };
            staffNotifications.emit({role: 'admin'}, notifyMsg);
            // add salesrep points;
            const dealer = yield global.db.collection('dealers').findOne({ _id: order.dealerId }, { salesrepId: 1, activated: 1 });
            if (dealer && dealer.salesrepId) {
                const days = utils.datesDifference(dealer.activated, new Date(), 'days');
                let points = null;
                let subtype = null;
                let duration = null;
                if (days <= 1) {
                    points = 120;
                    subtype = '<= 24h';
                    duration = 'within 24 hours';
                } else if (days <= 7) {
                    points = 100;
                    subtype = '<= 7d';
                    duration = 'within 7 days';
                } else if (days <= 60) {
                    points = 80;
                    subtype = '<= 60d';
                    duration = 'within 60 days';
                } else if (days <= 180) {
                    points = 60;
                    subtype = '<= 180d';
                    duration = 'within 180 days';
                } else if (days <= 365) {
                    points = 30;
                    subtype = '<= 365d';
                    duration = 'within 365 days';
                } else {
                    points = 10;
                    subtype = '> 365d';
                    duration = 'after 365 days';
                }
                yield salesrepModule.addPoints(dealer.salesrepId, points, 'dealer-order', subtype, 'Dealer booked Order ' + duration + ' of activation', { orderId: order._id});
            }
        }
        // add salesrep points
        if (order.salesrepId) {
            const days = utils.datesDifference(order.leadCreated, order.created, 'days');
            let points = null;
            let subtype = null;
            let duration = null;
            if (days <= 1) {
                points = 80;
                subtype = '<= 24h';
                duration = 'within 24 hours';
            } else if (days <= 2) {
                points = 75;
                subtype = '<= 48h';
                duration = 'within 48 hours';
            } else if (days <= 7) {
                points = 60;
                subtype = '<= 7d';
                duration = 'within 7 days';
            } else {
                points = 30;
                subtype = '> 7d';
                duration = 'after 7 days';
            }
            yield salesrepModule.addPoints(order.salesrepId, points, 'order-booking', subtype, 'Order booked ' + duration + ' of lead arrival', { orderId: order._id});
        }
        return { _id: result.insertedId, token: order.token };
    }).then(result => {
        leadModule.deleteLead(result._id);
        exports.alertCarriers(result._id);
        return result;
    }).catch(err => {
        if (transId) paymentGateway.voidTransaction(transId, 'Shipper authorization cancellation due to error for order # ' + order._id);
        if (insertedId) global.db.collection('orders').removeOne({ _id: insertedId });
        throw err;
    });
}

exports.insert = function (req, res, next) {
    const order = req.body;
    co(function* () {
        if (req.user.type === 'staff' && req.user.role === 'salesrep') {
            order.salesrepId = req.user.id;
        } else if (req.user.type === 'dealer') {
            order.dealerId = req.user.id;
            const dealer = yield global.db.collection('dealers').findOne({ _id: order.dealerId }, { creditCard: 1 });
            order.creditCard =  dealer.creditCard;
        }
        return yield insertOrder(order);
    }).then(result => {
        res.json(result);
    }).catch(err => {
        res.status(400).send(err.toString());
    });
};

exports.update = function (req, res, next) {
    co(function* () {
        // Todo: Select required fields only
        delete req.body._id;
        delete req.body.created;
        delete req.body.carrier;
        delete req.body.dealer;
        delete req.body.creditCard;
        const query = { _id: req.params.id };
        if (req.user.type === 'staff' && req.user.role === 'salesrep') {
            query['salesrepId'] = req.user.id;
        } else if (req.user.type === 'dealer') {
            query['dealerId'] = req.user.id;
        }
        yield global.db.collection('orders').updateOne(query, { $set: req.body });
    }).then(result => {
        res.send("Order updated");
    }).catch(err => {
        res.status(400).send(err.toString());
    });
};

exports.del = function (req, res, next) {
    co(function* () {
        const query = { _id: req.params.id };
        if (req.user.type === 'staff' && req.user.role === 'salesrep') {
            query['salesrepId'] = req.user.id;
        } else if (req.user.type === 'dealer') {
            query['dealerId'] = req.user.id;
        }
        yield global.db.collection('orders').removeOne(query);
    }).then(result => {
        res.send("Order deleted");
    }).catch(err => {
        res.status(400).send(err.toString());
    });
};

const getRelevantCarriers = co.wrap(function* (originZip, destinationZip) {
    // map coordinates for all zips of org, dest and carriers routers
    const originLatLng = yield pickerOptions.cityCoordinates(originZip);
    const destinationLatLng = yield pickerOptions.cityCoordinates(destinationZip);
    const carriers = yield global.db.collection('carriers').find({ 'trucks.0': { $exists: true } }, { 'trucks.routes': true, smsNumber: true, email: true }).toArray();
    for (const carrier of carriers) {
        carrier.routes = _.flatten(carrier.trucks && Array.isArray(carrier.trucks) && carrier.trucks.map(truck => truck.routes));
        delete carrier.trucks;
        for (const route of carrier.routes) {
            route.originLatLng = yield pickerOptions.cityCoordinates(route.origin.zip);
            route.destinationLatLng = yield pickerOptions.cityCoordinates(route.destination.zip);
            delete route.origin;
            delete route.destination;
        }
    }
    // get all carriers matching the radius
    const radius = utils.milesToMeters(RADIUS_MAX); // miles radius
    const matched = carriers.filter(carrier => {
        return carrier.routes.some(route => {
            let normal = geolib.isPointInCircle(originLatLng, route.originLatLng, radius) &&
                geolib.isPointInCircle(destinationLatLng, route.destinationLatLng, radius);
            let reverse = false;
            if (!normal && route.reverse) {
                reverse = geolib.isPointInCircle(destinationLatLng, route.originLatLng, radius) &&
                    geolib.isPointInCircle(originLatLng, route.destinationLatLng, radius);
            }
            return normal || reverse;
        });
    });
    for (const carrier of matched) {
        delete carrier.routes;
    };
    return _.shuffle(matched); // randomize the carriers order;
});

exports.alertCarriers = function (orderId, skipCarrierId) {
    return co(function* () {
        const order = yield global.db.collection('orders').findOne({ _id: orderId }, { status: 1, pickup: 1, delivery: 1, distance: 1, shipment: 1, vehicles: 1, package: 1, packagePrice: 1 });
        if (order.status !== 'Pending') throw 'Sorry, alert carriers functions only for pending orders';
        const carriers = yield getRelevantCarriers(order.pickup.location.zip, order.delivery.location.zip);
        if (carriers.length === 0) return 0;
        const carriersFiltered = skipCarrierId ? carriers.filter(carrier => carrier._id != skipCarrierId) : carriers;
        const msgTitle = 'Load #' + order._id;
        let msgDesc = 'Origin: ' + utils.joinCity(order.pickup.location) + ' Destination: ' + utils.joinCity(order.delivery.location) + '\nVehicles: ' +
            order.vehicles.map(v => utils.joinModel(v)).join(', ') + '\nTotal: $' +
            shippingPrice.getTotalPrice(order.vehicles, order.packagePrice, true);
        const smsMsg = 'Direct Dispatch ' + msgTitle + '\n' + msgDesc + '\n' + 'https://goo.gl/kdDxjX';
        const notifyMsg = {
            type: 'load-alert', title: msgTitle, contents: msgDesc,
            params: { loadId: order._id }
        };
        for (const carrier of carriersFiltered) {
            carrierNotifications.emit({ role: 'carrier', id: carrier._id }, notifyMsg);
            if (carrier.smsNumber) {
                sms.send(carrier.smsNumber, smsMsg).then(smsId => {
                    sms.log({ type: 'load-alert', refs: { carrierId: carrier._id, orderId: order._id }, to: carrier.smsNumber, message: smsMsg, twilioId: smsId });
                });
            }
            const message = {
                to: carrier.email,
                from: email.addresses.noReply,
                subject: 'Your received new load alert #' + order._id
            };
            email.sendText(message, Object.assign({ utils: _.pick(shippingPrice, ['getVehiclePrice', 'getTotalPrice', 'getTotalFee']) }, order), 'carrier/load-alert.txt').then(emailId => {
                email.log({ type: 'load-alert', refs: { carrierId: carrier._id, orderId: order._id }, from: message.from, to: message.to, subject: message.subject, mailgunId: emailId });
            });
        }
        return carriersFiltered.length;
    }).then(count => {
        let title, contents, type;
        if (count > 0) {
            title = 'Load Alerts Sent for Order #' + orderId;
            contents = `Load alerts sent successfully to ${count} relevant carriers`;
            type = 'load-alerts-sent';
        } else {
            title = 'No Carriers Relevant for Order #' + orderId;
            contents = `No carriers found for this order in ${RADIUS_MAX} miles`;
            type = 'load-alerts-no-results';
        }
        const notifyMsg = {
            type: type, title: title, contents: contents,
            params: { orderId: orderId }
        };
        staffNotifications.emit({ role: 'admin' }, notifyMsg);
        console.log(title, contents);
        return count;
    }).catch(err => {
        console.log('Error in sending alert carrires for order #', orderId);
        console.log(err);
        throw err;
    });
};

exports.pickupOrderRoute = function (req, res, next) {
    co(function* () {
        yield carrierOrder.pickupOrder(req.params.id);
    }).then(() => {
        res.send('Order marked as picked up.');
    }).catch(err => {
        res.status(400).send(err.toString());
    });
};

exports.deliverOrderRoute = function (req, res, next) {
    co(function* () {
        yield carrierOrder.deliverOrder(req.params.id);
    }).then(output => {
        res.send('Order marked as delivered.');
    }).catch(err => {
        res.status(400).send(err.toString());
    });
};

const releaseCarrierFunds = co.wrap(function* (order, canceledByCarrier) {
    const notifyCarrier = (type, amount) => {
        const feeReleaseMsg = {
            type: type, title: `$${amount} processing fee released for order #${order._id}`,
            contents: 'Whole amount reverted back to your credit card. Zero cancelation fees charged to you',
            params: { orderId: order._id }
        };
        carrierNotifications.emit({ role: 'carrier', id: order.assignedTo }, feeReleaseMsg);
    };
    // release total fee
    if (order.totalFeeAuthorized) {
        if (!order.totalFeeCaptured && !order.totalFeeReleased) {
            if (utils.daysPassed(order.totalFeeAuthorized.datetime) <= 30) {
                const transId = yield paymentGateway.voidTransaction(order.totalFeeAuthorized.transId, 'Total fee released from carrier cc for order # ' + order._id);
                if (canceledByCarrier) {
                    // save old history
                    const oldTrans = ({ carrierId: order.assignedTo, datetime: new Date(), totalFeeAuthorized: order.totalFeeAuthorized, totalFeeReleased: { amount: order.totalFeeAuthorized.amount, transId: transId, datetime: new Date() } });
                    yield global.db.collection('orders').updateOne({ _id: order._id }, { $push: { cancelationHistory: oldTrans }, $unset: { totalFeeAuthorized: 1 } });
                } else {
                    yield global.db.collection('orders').updateOne({ _id: order._id }, { $set: { totalFeeReleased: { amount: order.totalFeeAuthorized.amount, transId: transId, datetime: new Date() } } });
                }
                notifyCarrier('total-fee-released', order.totalFeeAuthorized.amount);
            }
        }
    } else {
        // release old 5% and 4% fees
        if (order.shipperFeeAuthorized && !order.shipperFeeCaptured && !order.shipperFeeReleased) {
            if (utils.daysPassed(order.shipperFeeAuthorized.datetime) <= 30) {
                const transId = yield paymentGateway.voidTransaction(order.shipperFeeAuthorized.transId, '5% shipper fee released from carrier cc for order # ' + order._id);
                if (canceledByCarrier) {
                    // save old history
                    const oldTrans = ({ carrierId: order.assignedTo, datetime: new Date(), shipperFeeAuthorized: order.shipperFeeAuthorized, shipperFeeReleased: { amount: order.shipperFeeAuthorized.amount, transId: transId, datetime: new Date() } });
                    yield global.db.collection('orders').updateOne({ _id: order._id }, { $push: { cancelationHistory: oldTrans }, $unset: { shipperFeeAuthorized: 1 } });
                } else {
                    yield global.db.collection('orders').updateOne({ _id: order._id }, { $set: { shipperFeeReleased: { amount: order.shipperFeeAuthorized.amount, transId: transId, datetime: new Date() } } });
                }
                notifyCarrier('shipper-fee-released', order.shipperFeeAuthorized.amount);
            }
        }
        if (order.carrierFeeAuthorized && !order.carrierFeeCaptured && !order.carrierFeeReleased) {
            if (utils.daysPassed(order.carrierFeeAuthorized.datetime) <= 30) {
                const transId = yield paymentGateway.voidTransaction(order.carrierFeeAuthorized.transId, '4% carrier fee released from carrier cc for order # ' + order._id);
                if (canceledByCarrier) {
                    // save old history
                    const oldTrans = ({ carrierId: order.assignedTo, datetime: new Date(), carrierFeeAuthorized: order.carrierFeeAuthorized, carrierFeeReleased: { amount: order.carrierFeeAuthorized.amount, transId: transId, datetime: new Date() } });
                    yield global.db.collection('orders').updateOne({ _id: order._id }, { $push: { cancelationHistory: oldTrans }, $unset: { carrierFeeAuthorized: 1 } });
                } else {
                    yield global.db.collection('orders').updateOne({ _id: order._id }, { $set: { carrierFeeReleased: { amount: order.carrierFeeAuthorized.amount, transId: transId, datetime: new Date() } } });
                }
                notifyCarrier('carrier-fee-released', order.carrierFeeAuthorized.amount);
            }
        }
    }
});

exports.cancel = function (req, res, next) {
    co(function* () {
        const order = yield global.db.collection('orders').findOne({ _id: req.params.id }, { creditCard: 0, polylineEncoded: 0 });
        if (['Pending', 'Dispatched'].indexOf(order.status) === -1) throw 'Not allowed to cancel the order at this stage, You can only cancel before Pickup';
        if (order.status === 'Canceled') throw 'Order already canceled';
        // handle shipper authorization
        let duration = 0;
        if (order.status === 'Dispatched') {
            const loadRequest = order.dispatchRequest || order.requestedFrom.find(loadRequest => loadRequest.carrierId == order.assignedTo);
            const pickupDate = new Date(loadRequest.pickupDate);
            const now = new Date();
            duration = (pickupDate - now) / (3600 * 1000);
        }
        if (order.status === 'Dispatched' && duration < 24) {
            // capture authorization due to cancelation fee
            if (order.shipperAuthorization && !order.shipperAuthorizationCaptured && !order.shipperAuthorizationReleased) {
                const transId = yield paymentGateway.captureTransaction(order.shipperAuthorization.transId, order.shipperAuthorization.amount, 'Shipper order authorization captured due to cancelation after grace period for order # ' + order._id);
                yield global.db.collection('orders').updateOne({ _id: order._id }, { $set: { shipperAuthorizationCaptured: { amount: order.shipperAuthorization.amount, transId: transId, datetime: new Date() } } });
            }
        } else {
            // release authorization
            if (order.shipperAuthorization && !order.shipperAuthorizationCaptured && !order.shipperAuthorizationReleased) {
                if (utils.daysPassed(order.shipperAuthorization.datetime) <= 30) {
                    const transId = yield paymentGateway.voidTransaction(order.shipperAuthorization.transId, 'Shipper order authorization released due to cancelation before grace period for order # ' + order._id);
                    yield global.db.collection('orders').updateOne({ _id: order._id }, { $set: { shipperAuthorizationReleased: { amount: order.shipperAuthorization.amount, transId: transId, datetime: new Date() } } });
                }
            }
        }
        if (order.status === 'Dispatched') {
            // release carrier fees
            yield releaseCarrierFunds(order);
            const orderCanceledMsg = {
                type: 'order-canceled', title: `Order # ${order._id} canceled by shipper`,
                contents: 'Any fees authorized on your credit card are be released back now',
                params: { orderId: order._id }
            };
            carrierNotifications.emit({ role: 'carrier', id: order.assignedTo }, orderCanceledMsg);
        }
        yield global.db.collection('orders').updateOne({ _id: req.params.id }, { $set: { status: 'Canceled' } });
    }).then(result => {
        res.send('Order canceled');
    }).catch(err => {
        res.status(400).send(err.toString());
    });
};

exports.viewCarrier = function (req, res, next) {
    co(function* () {
        const carrier = yield global.db.collection('carriers').findOne({ _id: req.params.id });
        if (!carrier) throw new Error('No carrier found');
    }).then(carrier => {
        res.json(carrier);
    }).catch(err => {
        res.status(400).send(err.toString());
    });
};

exports.undispatch = function (req, res, next) {
    co(function* () {
        const order = yield global.db.collection('orders').findOne({ _id: req.params.orderId }, { creditCard: 0, polylineEncoded: 0 });
        if (!order) throw 'Order not found';
        if (order.status != 'Dispatched') throw 'Only Dispatched order could be canceled';
        // release carrier fees
        yield releaseCarrierFunds(order, true);
        yield global.db.collection('orders').updateOne({ _id: req.params.orderId, status: 'Dispatched' }, { $set: { status: 'Pending' }, $unset: { assignedTo: 1 } });
        const orderCanceledMsg = {
            type: 'order-canceled', title: `Order # ${order._id} canceled by carrier`,
            contents: 'Any fees authorized on your credit card are released back to you',
            params: { orderId: order._id }
        };
        carrierNotifications.emit({ role: 'carrier', id: order.assignedTo }, orderCanceledMsg);
        return order;
    }).then(order => {
        res.send('Order undispatched successfully & authorization revereted back to the carrier');
        exports.alertCarriers(req.params.orderId, order.assignedTo); // resend alerts to carriers
    }).catch(err => {
        res.status(400).send(err.toString());
    });
};

exports.insertOrder = insertOrder;
exports.emailSubmitted = emailSubmitted;