'use strict';

const config = require('../config');
const EdmundsClient = require('node-edmunds-api');
const client = new EdmundsClient({ apiKey: config.edmundsAPIKey });
const _ = require('lodash');

exports.getVehicleInfo = function (req, res, next) {
    const vin = req.params['vin'];
    if (!vin) {
        res.status(400).send('Invalid VIN no');
    }
    client.decodeVin({ vin: vin }, function(err, response) {
        if (err) {
            next(err);
        } else {
            if (response.status == 'BAD_REQUEST') {
                next(response.message);
            } else {
                const vehicleInfo = _.pick(response, ['years', 'make', 'model']);
                const result = {
                    make: vehicleInfo.make && vehicleInfo.make.name,
                    model: vehicleInfo.model && vehicleInfo.model.name,
                    year: vehicleInfo.years && vehicleInfo.years[0].year
                };
                res.status(200).json(result);
            }
        }
    });
};