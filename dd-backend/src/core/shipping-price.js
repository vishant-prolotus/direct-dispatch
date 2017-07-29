"use strict";

const co = require('co');
const _ = require('lodash');
const geolib = require('geolib');
const bluebird = require('bluebird');
const request = require('request');

function computeVehiclePrice(shipment) {
    return new Promise(function (resolve, reject) {
        request({ method: 'POST', url: 'http://localhost:5000/api/quote', json: true, body: {
            pickup_zip:  shipment.origin.zip, delivery_zip: shipment.destination.zip, miles: shipment.distance,
            vehicle_type: shipment.vehicleType, inoperable: (shipment.vehicleCondition === 'Running' ? 0 : 1),
            enclosed: (shipment.carrierType === 'Open' ? 0 : 1)
        }}, (error, response, body) => {
            if (error) return reject(error);
            if (!(response.statusCode >= 200 && response.statusCode < 300)) return reject(body);
            if (body.status === 400) return reject(body.message);
            const price = body.price < 100 ? 100 : body.price;
            return resolve(price);
        });
    });
}

exports.calculate = function (lead) {
    return co(function* () {
        const vehicles = lead.vehicles.map(vehicle => {
            return {
                origin: lead.origin, destination: lead.destination, distance: lead.distance, carrierType: lead.carrierType,
                vehicleType: vehicle.type, vehicleCondition: vehicle.condition
            };
        });
        const prices = yield bluebird.map(vehicles, computeVehiclePrice);
        const fees = prices.map(price => exports.calculateFee(price));
        return { prices: prices, fees: fees };
    });
};

exports.calculateRoute = function (req, res, next) {
    co(function* () {
        return yield exports.calculate(req.body);
    }).then(result => {
        res.json(result);
    }).catch(err => {
        res.status(400).send(err.toString());
    });
};

exports.calculateFee = function (price) {
    let fee = Math.round(9 / 100 * price);
    if (fee < 45) fee = 45;
    return fee;
};

exports.getVehiclePrice = function (vehicle, excludeFee) {
    let price = vehicle.price;
    if (!excludeFee) price += vehicle.fee || 0;
    return price
};

exports.getTotalPrice = function (vehicles, packagePrice, excludeFees) {
    let total = _.sum(vehicles.map(v => v.price));
    if (!excludeFees) {
        total += _.sum(vehicles.map(v => v.fee || 0));
    }
    return total + (packagePrice || 0);
};

exports.getTotalFee = function (vehicles) {
    return _.sum(vehicles.map(v => v.fee || 0));
};

exports.packagePrices = { 'Standard': 0, 'Expedited': 50, 'Rush': 100 };