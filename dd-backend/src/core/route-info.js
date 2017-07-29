"use strict";

const request = require('request');

const utils = require('./utils');
const config = require('../config');
const co = require('co');

exports.getDistanceAndPolyline = function (origin, destination) {
    return new Promise((resolve, reject) => {
		origin = utils.joinCity(origin);
        destination = utils.joinCity(destination);
        let url = `${config.googleMaps.url}/directions/json?origin=${encodeURI(origin)}&destination=${encodeURI(destination)}`;
        if (process.argv[2] === '--production') url = url + `&key=${config.googleMaps.apiKey}`;
        request(url, (error, response, directions) => {
            if (error) return reject(error);
            if (response.statusCode !== 200 || JSON.parse(directions).status !== 'OK') {
                console.log(directions);
                return reject("Goolge API call failed for calculating distance and path calculation");
            }
            const route = JSON.parse(directions).routes[0];
            const distance = Math.round(route.legs[0].distance.value * 0.000621371); // meter to miles
            resolve({ polylineEncoded: route.overview_polyline.points, distance: distance });
        });
	});
};

exports.getDistanceAndPolylineRoute = function (req, res, next) {
    co(function* () {
        if (!req.body.origin || !req.body.destination) throw 'origin & bestination required';
        return yield exports.getDistanceAndPolyline(req.body.origin, req.body.destination);
    }).then(result => {
        res.json(result);
    }).catch(err => {
        res.status(400).send(err.toString());
    });
};