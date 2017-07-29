"use strict";

const co = require('co');
const bluebird = require('bluebird');
const geolib = require('geolib');
const request = require('request');

const utils = require('../core/utils');
const uniqueId = require('../core/unique-id');
const email = require('../core/email');
const routeInfo = require('../core/route-info');
const shippingPrice = require('../core/shipping-price');
const pickerOptions = require('../core/picker-options');
const leadModule = require('./lead');
const orderModule = require('../core/order');
const staffNotifications = require('../core/notifications')('staff');
const paymentGateway = require('../core/payment-gateway');

const validateLead = function (lead) {
    return lead.email && lead.origin && lead.destination && lead.carrierType && lead.vehicles;
};

exports.getQuote = function (req, res, next) {
    co(function* () {
        let lead = req.body;
        // todo select only required fields
        if (!validateLead(lead)) throw new Error("Required parameter missing");
        const route = yield routeInfo.getDistanceAndPolyline(lead.origin, lead.destination);
        lead.polylineEncoded = route.polylineEncoded;
        lead.distance = route.distance;
        const shipmentRate = yield shippingPrice.calculate(lead);
        lead.vehicles.forEach((vehicle, index) => {
            vehicle.price = shipmentRate.prices[index];
            vehicle.fee = shipmentRate.fees[index];
        });
        yield leadModule.insertLead(lead);
        return lead;
    }).then(lead => {
        res.json({_id: lead._id, token: lead.token});
        //leadModule.emailQuote(lead);
        const notifyMsg = { type: 'new-lead', title: 'New Lead Arrived # ' + lead._id,
                            contents: 'Origin: ' + utils.joinCity(lead.origin) + ' Destination: ' + utils.joinCity(lead.destination) + ' Vehicle: ' + lead.vehicles[0].make + ' ' + lead.vehicles[0].model,
                            params: { leadId: lead._id } };
        staffNotifications.emit({role: 'admin'}, notifyMsg);
        if (lead.salesrepId) staffNotifications.emit({role: 'salesrep', id: lead.salesrepId}, notifyMsg);
    }).catch(err => {
        res.status(400).send(err.toString());
    });
};

exports.viewQuote = function (req, res, next) {
    co(function* () {
        const lead = yield global.db.collection('leads').findOne({ _id: req.params.id, token: req.params.token },
        { created: 1, calculatedAt: 1, email: 1, phone: 1, origin: 1, destination: 1, vehicles: 1, carrierType: 1, distance: 1, polylineEncoded: 1, token: 1, shipperFeePerc: 1});
        if (!lead) throw new Error('Quote not found. Invalid quote number.');
        delete lead.shipperFeePerc;
        return lead;
    }).then(lead => {
        res.json(lead);
    }).catch(err => {
        res.status(400).send(err.toString());
    });
};

exports.recalculateQuote = function (req, res, next) {
    co(function* () {
        // todo select required fields
        const currentLead = yield global.db.collection('leads').findOne({_id: req.params.id, token: req.params.token});
        if (!currentLead) throw new Error('Quote not found. Invalid quote number.');
        const newLead = req.body;
        // Todo: check if origin, dest change and only calc distance then, to increase efficiency
        const route = yield routeInfo.getDistanceAndPolyline(newLead.origin, newLead.destination);
        newLead.polylineEncoded = route.polylineEncoded;
        newLead.distance = route.distance;
        const shipmentRate = yield shippingPrice.calculate(newLead);
        newLead.calculatedAt = new Date();
        newLead.vehicles.forEach((vehicle, index) => {
            vehicle.price = shipmentRate.prices[index];
            vehicle.fee = shipmentRate.fees[index];
        });
        yield global.db.collection('leads').updateOne({_id: req.params.id}, {$set: newLead});
        //leadModule.emailQuote(lead);
        return { distance: newLead.distance, prices: shipmentRate.prices, fees: shipmentRate.fees };
    }).then(result => {
        res.json(result);
    }).catch(err => {
        res.status(400).send(err.toString());
    });
};

exports.insertOrder = function (req, res, next) {
    const order = req.body;
    co(function* () {
        return yield orderModule.insertOrder(order);
    }).then(result => {
        res.json(result);
        const notifyMsg = { type: 'new-order', title: 'New Order Placed # ' + order._id,
                            contents: 'Origin: ' + utils.joinCity(order.pickup.location) + ' Destination: ' + utils.joinCity(order.delivery.location) + ' Vehicle: ' + utils.joinModel(order.vehicles[0]),
                            params: {orderId: order._id} };
        staffNotifications.emit({role: 'admin'}, notifyMsg);
        if (order.salesrepId) staffNotifications.emit({role: 'salesrep', id: order.salesrepId}, notifyMsg);
    }).catch(err => {
        res.status(400).send(err.toString());
    });
};

exports.getOrder = function (req, res, next) {
    co(function* () {
        // todo select only required fields
        const order = yield global.db.collection('orders').findOne({_id: req.params.id, token: req.params.token}, { creditCard: 0 });
        if (!order) throw new Error('No such order with given Id');
        if (order.assignedTo) {
            const carrier = yield global.db.collection('carriers').findOne({ _id: order.assignedTo }, { company: 1, name: 1, phone: 1 });
            const loadRequest = order.dispatchRequest || order.requestedFrom.find(loadRequest => loadRequest.carrierId == order.assignedTo);
            carrier.pickupDate = loadRequest.pickupDate;
            carrier.deliveryDate = loadRequest.deliveryDate;
            delete order.assignedTo;
            order.carrier = carrier;
        }
        delete order.shipperFeePerc;
        return order;
    }).then(order => {
        res.json(order);
    }).catch(err => {
        res.status(400).send(err.toString());
    });
};

exports.getOrderToken = function (req, res, next) {
    co(function* () {
        const params = req.body;
        if (!params.id || !params.email) throw new Error("Required fields missing");
        const order = yield global.db.collection('orders').findOne({_id: params.id, 'shipper.email': params.email}, {token: true});
        if (!order) throw new Error("No such order with given Order # and Email");
        return order;
    }).then(order => {
        res.json(order);
    }).catch(err => {
        res.status(400).send(err.toString());
    });
};

exports.generateMapImage = function (req, res, next) {
    co(function* () {
        let id = req.params.id,
            token = req.params.token,
            type = req.params.type,
            width = req.params.width,
            height = req.params.height;
        if (!id || !type || !width || !height) throw new Error("Params missing");
        if (type !== 'quote' && type !== 'order') throw new Error("Invalid type");
        let record;
        if (type === 'quote') {
            record = yield global.db.collection('leads').findOne({_id: id, token: token}, {_id: false, origin: true, destination: true, polylineEncoded: true});
        } else {
            record = yield global.db.collection('orders').findOne({_id: id, token: token}, {_id: false, 'pickup.location': true, 'delivery.location': true, polylineEncoded: true});
        }
        if (!record) throw new Error("No record found");
        let origin = (type === 'quote') ? record.origin : record.pickup.location;
        let destination = (type === 'quote') ? record.destination : record.delivery.location;
        origin = utils.joinCity(origin);
        destination = utils.joinCity(destination);
        const config = require('../config');
        let url = `${config.googleMaps.url}/staticmap?size=${width}x${height}&maptype=roadmap&markers=color:red%7Clabel:O%7C${encodeURI(origin)}&markers=color:red%7Clabel:D%7C${encodeURI(destination)}&path=color:red%7Cweight:3%7Cenc:${encodeURI(record.polylineEncoded)}`;
        if (process.argv[2] === '--production') url = url + `&key=${config.googleMaps.apiKey}`;
        return url;
    }).then(url => {
        request(url).pipe(res);
    }).catch(err => {
        res.status(400).send(err.toString());
    });
};

exports.sendQuoteBounceEmail = function (req, res, next) {
    co(function* () {
        const lead = yield global.db.collection('leads').findOne({ _id: req.params.id, token: req.params.token });
        if (!lead) throw 'Quote not found';
        leadModule.emailQuote(lead);
        return true;
    }).then(result => {
        res.send('Email sent successfully');
    }).catch(err => {
        res.status(400).send(err.toString());
    });
};

exports.importLead = function (req, res, next) {
    req.pipe(req.busboy);
    let emailMessage = {};
    req.busboy.on('field', function (key, value, keyTruncated, valueTruncated) {
        emailMessage[key] = value;
    });
    req.busboy.on('finish', function () {
        co(function*() {
            let source;
            if (emailMessage.from.indexOf('autotransport411.com')) {
                source = 'autotransport411.com';
            } else if (emailMessage.from.indexOf('imoverleads.com')) {
                source = 'imoverleads.com';
            } else {
                const err = 'Lead rejected from: ' + source;
                console.log(err);
                throw new Error(err);
            }
            const body = emailMessage['body-plain'];
            const parser = require('../lead-parsers/' + source);
            let lead = parser.parse(body);
            if (!lead) {
                const err = `Unable to parse lead from: ${source}\n${body}`;
                console.log(err);
                throw new Error(err);
            }
            lead.source = source;
            const getCorrectCity = function (city) {
                return co(function* () {
                    return (yield pickerOptions.getCityByZip(city.zip)) || (yield pickerOptions.queryCity(city.city, city.state));
                });
            };
            lead.origin = yield getCorrectCity(lead.origin);
            lead.destination = yield getCorrectCity(lead.destination);
            const route = yield routeInfo.getDistanceAndPolyline(lead.origin, lead.destination);
            lead.polylineEncoded = route.polylineEncoded;
            lead.distance = route.distance;
            const shipmentRate = yield shippingPrice.calculate(lead);
            lead.vehicles.forEach((vehicle, index) => {
                vehicle.price = shipmentRate.prices[index];
                vehicle.fee = shipmentRate.fees[index];
            });
            yield leadModule.insertLead(lead);
            yield leadModule.emailQuote(lead);
            const notifyMsg = {type: 'new-lead', title: 'New Lead Arrived # ' + lead._id,
                contents: 'Origin: ' + utils.joinCity(lead.origin) + ' Destination: ' + utils.joinCity(lead.destination) + ' Vehicle: ' + lead.vehicles[0].make + ' ' + lead.vehicles[0].model,
                params: {leadId: lead._id}};
            staffNotifications.emit({role: 'admin'}, notifyMsg);
            if (lead.salesrepId) staffNotifications.emit({role: 'salesrep', id: lead.salesrepId}, notifyMsg);
        }).then(result => {
            res.send("OK");
        }).catch(err => {
            res.status(400).send(err.toString());
        });
    });
};