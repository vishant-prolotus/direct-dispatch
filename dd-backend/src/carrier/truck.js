'use strict';

const co = require('co');
const _ = require('lodash');
const utils = require('../core/utils');
const constants = require('../core/constants');

const requiredProperties = ['type', 'driverName', 'driverPhone'];
const validProperties = ['name', 'type', 'spaces', 'driverName', 'driverPhone', 'logo', 'driverSignature', 'driverEmail', 'source', 'routes'];
const truckType = constants.BOL_TICKET.TRUCK_TYPES;

let crud = {};

crud.list = function (carrierId) {
    return global.db.collection('carriers').findOne({ _id: carrierId }, { trucks: true }).then(carrier => carrier.trucks || []);
};

crud.insert = function (carrierId, truck) {
    return global.db.collection('carriers').updateOne({ _id: carrierId }, { $push: { trucks: truck } });
};

crud.fetch = function (carrierId, truckIndex) {
    return global.db.collection('carriers').findOne({ _id: carrierId }, { _id: 0, trucks: { $slice: [Number(truckIndex), 1] } })
            .then(carrier => carrier.trucks && carrier.trucks.length === 1 && carrier.trucks[0]);
};

// this method is different than above "fetch" method. It will fetch the truck based on the _id field which is of
// type = ObjectId
crud.fetchById = function (carrierId, truckId) {
    truckId = utils.getMongoObjectID(truckId);
    return global.db.collection('carriers').findOne({ _id: carrierId}, { trucks: 1})
        .then((carrier) => {
            carrier.trucks = carrier.trucks || [];
            for (let truck of carrier.trucks) {
                if (truck._id && truck._id.toString() == truckId) {
                    return truck;
                }
            }
        });
};

crud.fetchBolAppTruck = function (carrierId) {
    return global.db.collection('carriers').findOne({ _id: carrierId}, { trucks: 1})
        .then((carrier) => {
            carrier.trucks = carrier.trucks || [];
            for (let truck of carrier.trucks) {
                if (truck.source && truck.source.toLowerCase() == constants.BOL_APP_SOURCE) {
                    return truck;
                }
            }
        });
};

crud.update = function (carrierId, truckIndex, truck) {
    let set = {};
    set['trucks.' + truckIndex] = truck;
    return global.db.collection('carriers').updateOne({ _id: carrierId }, { $set: set });
};

// this method is different than above "update" method. It will fetch the truck based on the _id field which is of
// type = ObjectId
crud.updateById = function (carrierId, truckId, truck) {
    let set = {};
    // We need to convert the String _id into ObjectId here. Do not have benefit of mongoose.
    truckId = utils.getMongoObjectID(truckId);
    // Set the _id and source again here because you won't get it in the req body.
    truck._id = truckId;
    truck.source = constants.BOL_APP_SOURCE;
    set['trucks.$'] = truck;
    return global.db.collection('carriers').updateOne({ _id: carrierId, 'trucks._id': truckId }, { $set: set });
};

crud.updateDriverSignature = function (carrierId, truckId, driverSignature) {
    let set = {};
    // We need to convert the String _id into ObjectId here. Do not have benefit of mongoose.
    truckId = utils.getMongoObjectID(truckId);
    set['trucks.$.driverSignature'] = driverSignature;
    return global.db.collection('carriers').updateOne({ _id: carrierId, 'trucks._id': truckId }, { $set: set });
};

crud.remove = function (carrierId, truckIndex) {
    let unset = {};
    unset['trucks.' + truckIndex] = true;
    return co(function*() {
        yield global.db.collection('carriers').updateOne({ _id: carrierId }, { $unset: unset });
        yield global.db.collection('carriers').updateOne({ _id: carrierId }, { $pull: { trucks: null } });
    });
};

let routes = {};

const getCarrierId = (req) => {
    return req.params.carrierId ? req.params.carrierId : req.user.id;
};

routes.list = function (req, res, next) {
    co(function*() {
        let trucks = yield crud.list(getCarrierId(req));
        if (req.query.fields) {
            const fields = req.query.fields.split(',');
            trucks = trucks.map(truck => _.pick(truck, fields));
        }
        return trucks;
    }).then(trucks => {
        utils.writeSuccessResponse(req, res, trucks);
    }).catch(err => {
        utils.writeErrorResponse(req, res, err, 400);
    });
};

routes.insert = function (req, res, next) {
    let isBolSource = req.body['source'] == constants.BOL_APP_SOURCE;
    let truckData;
    co(function*() {
        truckData = _.pick(req.body, validProperties);
        const msg = validateInsert(truckData);
        if (msg) {
            throw msg;
        } else {
            // Add a unique ObjectId for truck.
            truckData._id = utils.getMongoObjectID();
            return crud.insert(getCarrierId(req), truckData);
        }
    }).then(inserted => {
        // In case of bol app we need to pass the created object also in the response so that it can be used for
        // rest of the update request.
        if (isBolSource) {
            utils.writeSuccessResponse(req, res, truckData);
        } else {
            utils.writeSuccessResponse(req, res, 'Truck added');
        }
    }).catch(err => {
        utils.writeErrorResponse(req, res, err, 400);
    });
};

routes.fetch = function (req, res, next) {
    co(function*() {
        return crud.fetch(getCarrierId(req), req.params.truckId);
    }).then(truck => {
        utils.writeSuccessResponse(req, res, truck);
    }).catch(err => {
        utils.writeErrorResponse(req, res, err, 400);
    });
};

routes.fetchBolAppTruck = function (req, res, next) {
    co(function*() {
        return crud.fetchBolAppTruck(getCarrierId(req));
    }).then(truck => {
        utils.writeSuccessResponse(req, res, truck);
    }).catch(err => {
        utils.writeErrorResponse(req, res, err, 400);
    });
};

routes.update = function (req, res, next) {
    co(function*() {
        let truckData = _.pick(req.body, validProperties);
        const msg = validateUpdate(truckData);
        if (msg) {
            throw msg;
        } else {
            const source = req.query['source'];
            if (source == 'bol-app') {
                return crud.updateById(getCarrierId(req), req.params.truckId, truckData);
            } else {
                return crud.update(getCarrierId(req), req.params.truckId, truckData);
            }

        }
    }).then(updated => {
        utils.writeSuccessResponse(req, res, 'Truck updated');
    }).catch(err => {
        utils.writeErrorResponse(req, res, err, 400);
    });
};

routes.remove = function (req, res, next) {
    co(function*() {
        return crud.remove(getCarrierId(req), req.params.truckId);
    }).then(inserted => {
        utils.writeSuccessResponse(req, res, 'Truck deleted');
    }).catch(err => {
        utils.writeErrorResponse(req, res, err, 400);
    });
};

function validateInsert (truckData) {
    // Apart from the logo all the data is required.
    let msg;
    for (let property of requiredProperties) {
        if (!(property in truckData)) {
            msg = property + ' is missing in the data';
            break;
        }
    }
    if (('type' in truckData) && _.indexOf(truckType, truckData['type']) == -1) {
        msg = 'Truck type is not valid';
    }
    return msg;
};

function validateUpdate (truckData) {
    // Apart from the logo all the data is required. So if any of the property is present with blank data in update body
    // then raise a validation error.
    let msg;
    for (let property of requiredProperties) {
        if (property in truckData && !truckData[property]) {
            msg = property + ' is having invalid data';
            break;
        }
    }
    if (('type' in truckData) && _.indexOf(truckType, truckData['type']) == -1) {
        msg = 'Truck type is not valid';
    }
    return msg;
};

module.exports = {
    crud: crud,
    routes: routes
};