"use strict";

const co = require('co');

exports.citiesByState = function (req, res, next) {
    if (!req.params.state)
        return res.status(400).send('Require params missing');
    global.db.collection('cities').distinct('city', { state: req.params.state }, function (err, cities) {
        if (err)
            return res.status(400).send(err.toString());
        res.json(cities.sort());
    });
};

exports.zipcodesByCity = function (req, res, next) {
    if (!req.params.state || !req.params.city)
        return res.status(400).send('Require params missing');
    global.db.collection('cities').distinct('zip', { state: req.params.state, city: req.params.city }, function (err, zipcodes) {
        if (err)
            return res.status(400).send(err.toString());
        res.json(zipcodes.sort());
    });
};

exports.cityByZip = function (req, res, next) {
    if (!req.params.zip)
        return res.status(400).send('Require params missing');
    global.db.collection('cities').findOne({ zip: req.params.zip }, { _id: 0, state: 1, city: 1 }, function (err, record) {
        if (err)
            return res.status(400).send(err.toString());
        if (!record)
            return res.status(400).send('Invalid zip code');
        res.json(record);
    });
};

exports.searchByZip = function (req, res, next) {
    const query = req.params.query;
    const limit = parseInt(req.params.limit) || 100;
    const noZip = req.query.nozip;
    const concat = ["$city", ", ", "$state"];
    if (!noZip) concat.push(" ", "$zip");
    const project = { _id: 0, 'city': "$_id.city", 'state': "$_id.state" };
    if (!noZip) project['zip'] = "$_id.zip";
    const group = { desc: "$desc", city: "$city", state: "$state" };
    if (!noZip) group['zip'] = "$zip";
    global.db.collection('cities').aggregate([
        { $project: { desc: { $concat: concat }, city: 1, state: 1, zip: 1, _id: 0 } },
        { $match: { desc: { $regex: query, $options: 'i' } } },
        { $group: { _id: group } },
        { $sort: { '_id.desc': 1 } },
        { $project: project },
        { $limit: limit }], (err, cities) => {
            if (err) return res.status(400).send(err.toString());
            res.json(cities);
        });
};

exports.searchVehicle = function (req, res, next) {
    const query = req.params.query;
    const limit = parseInt(req.params.limit) || 100;
    global.db.collection('vehicles').aggregate([
        { $project: { vehicle: { $concat: ["$make", " ", "$model"] }, make: 1, model: 1, _id: 0 } },
        { $match: { vehicle: { $regex: query, $options: 'i' } } },
        { $sort: { vehicle: 1 } },
        { $project: { make: 1, model: 1 } },
        { $limit: limit }], (err, vehicles) => {
            if (err) return res.status(400).send(err.toString());
            res.json(vehicles);
        });
};

exports.vehicleModels = function (req, res, next) {
    global.db.collection('vehicles').find({ make: req.params.make }, { _id: false, model: true }, { sort: 'model' }).toArray(function (err, vehicles) {
        res.json(vehicles.map(function (v) {
            return v.model;
        }));
    });
};

exports.cityCoordinates = function (zip) {
    return co(function* () {
        const coordinates = yield global.db.collection('cities').findOne({ zip: zip }, { _id: false, longitude: true, latitude: true });
        if (!coordinates) throw new Error('No coordinates found for zip ' + zip);
        return coordinates;
    });
};

exports.getCityByZip = function (zip) {
    return global.db.collection('cities').findOne({ zip: zip }, { _id: false, city: true, state: true, zip: true });
};

exports.queryCity = function (city, state) {
    return global.db.collection('cities').findOne({ city: new RegExp(city, 'i'), state: state }, { _id: false, city: true, state: true, zip: true });
};

function splitCity(city) {
    const parts = city.split(', ');
    return {
        city: parts[0],
        state: parts[1].substr(0, 2),
        zip: parts[1].substr(parts[1].length - 5)
    };
}