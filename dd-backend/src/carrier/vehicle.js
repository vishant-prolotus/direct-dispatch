'use strict';

const co = require('co');
const _  = require('lodash');

const collection = () => global.db.collection('bol-tickets');

exports.list = function (req, res, next) {
    co(function *() {
        const carrierId = req.user.id;
        const pageNo = req.query['pageNo'] || 1;
        const noOfItems = req.query['noOfItems'] || 20;
        const query = {carrierId: carrierId, vehicleInformation: {"$exists": true}};
        let result = {
            vehicles: [],
            totalVehicles: 0
        };
        let vehicles = [];
        let totalVehicles;

        let allTicketsWithVehicles = yield collection().find(query, {vehicleInformation: true}).toArray();
        for (let ticket of allTicketsWithVehicles) {
            vehicles = vehicles.concat(ticket.vehicleInformation);
        }
        result.vehicles = vehicles;

        collection().aggregate(
            [
                {
                    $match: query
                },
                {
                    $project: {
                        noOfVehicles: {
                            $size: "$vehicleInformation"
                        }
                    }
                },
                {
                    $group: {
                        _id: null,
                        count: {$sum: "$noOfVehicles"}
                    }
                }
            ],
            function(err, count)  {
                if (err) {
                    throw err;
                } else {
                    result.totalVehicles = count[0].count;
                    res.status(200).json(result);
                }
            }
        );
    }).catch((err) => {
        console.log({
            msg: 'Vehicle:list:: Error occurred',
            err: err
        });
        next(err);
    });
};