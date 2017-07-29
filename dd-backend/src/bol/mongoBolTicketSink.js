'use strict';

// System includes
const _ = require('underscore');
const co = require('co');

// Local includes
const ticketSchema = require('./schemas/ticketSchema');
const constants = require('../core/constants');

class MongoBolTicketSink {
    constructor(mongo) {
        this._mongo          = mongo;
        this._bolTicketModel = null;
    }
}

MongoBolTicketSink._bolModelName = 'bol-ticket';
MongoBolTicketSink._collectionName = 'bol-tickets';

MongoBolTicketSink.prototype.init = function () {
    const self = this;
    return co (function *() {
        console.log({
            msg: 'MongoBolTicketSink.init:: Start Initialization'
        });

        self._mongo.addAutoIncrementPlugin(ticketSchema, MongoBolTicketSink._bolModelName);
        self._bolTicketModel = self._mongo.getModel(MongoBolTicketSink._bolModelName, ticketSchema, MongoBolTicketSink._collectionName);
        console.log({
            msg: 'MongoBolTicketSink.init:: Finished Initialization'
        });
    }).catch((err) => {
        console.log({
            msg: 'MongoBolTicketSink.init:: Error occurred in initialization'
        });
        throw err;
    })
};

MongoBolTicketSink.prototype.update = function (obj) {
    const self = this;
    return new Promise((resolve, reject) => {
        // runValidators error will not have any effect on mongodb prior to 4.0. We have written a custom validation
        // function in the route handler  for the compatibility

        // If _id is coming in the the request body then it's an update request
        if (obj['_id']) {
            let condition = {'_id': obj['_id']};
            self._bolTicketModel.updateOne(condition, obj, {runValidators: true},  (err, doc) => {
                if (err) {
                    if (err.name === 'MongoError' && err.code === 11000) {
                        reject('A ticket with the same ticketNo already present');
                    } else {
                        reject(err);
                    }
                } else {
                    if (doc.n) {
                        resolve('Ticket update successfully');
                    } else {
                        reject('Ticket not found with _id=' + obj['_id'] + ' for the carrier');
                    }
                }
            });
        } else {
            self._bolTicketModel.create(obj, (err, result) => {
                if (err) {
                    if (err.name === 'MongoError' && err.code === 11000) {
                        reject('A ticket with the same ticketNo already present');
                    } else {
                        reject(err);
                    }
                } else {
                    resolve(result);
                }
            });
        }
    });
};

MongoBolTicketSink.prototype.fetchByTicketId = function (carrierId, ticketId) {
    const self = this;
    return new Promise(function (resolve, reject) {
        if (!ticketId) {
            reject('Ticket Id is not present');
        } else {
            self._bolTicketModel.findOne({_id: ticketId, carrierId: carrierId}, '-__v').exec(function (err, doc) {
                if (err) {
                    console.log({
                        msg: 'MongoBolTicketSink:fetchByTicketId::Error occurred',
                        _id: ticketId,
                        err: err
                    });
                    reject(err);
                } else {
                    resolve(doc);
                }
            });
        }
    });
};

MongoBolTicketSink.prototype.delete = function (carrierId, ticketId) {
    const self = this;
    return new Promise(function (resolve, reject) {
        if (!ticketId) {
            reject('Ticket Id is not present');
        } else {
            self
                .fetchByTicketId(carrierId, ticketId)
                .then((ticket) => {
                    if (!ticket) {
                        reject('Ticket not found with id: ' + ticketId + ' for carrier: ' + carrierId);
                    } else if (ticket.status == 'DISPATCHED') {
                        ticket.remove(function (err, result) {
                            if (err) {
                                console.log({
                                    msg: 'MongoBolTicketSink:delete::Error occurred while deleting the record',
                                    _id: ticketId,
                                    carrierId: carrierId,
                                    err: err
                                });
                                reject(err);
                            } else {
                                resolve();
                            }
                        });
                    } else {
                        reject('A ticket can be deleted only with the \'DISPATCHED\' status');
                    }
                })
                .catch((err) => {
                    reject(err);
                });
        }
    });
};

MongoBolTicketSink.prototype.fetchAll = function (condition) {
    const self = this;
    const pageNo = condition['pageNo'] || 0;
    const noOfItems = condition['noOfItems'] || 10;
    delete  condition['pageNo'];
    delete condition['noOfItems'];

    return new Promise(function (resolve, reject) {
        let query = self._bolTicketModel.find(condition, '-__v -leftView -backView -rightView -frontView -topView -driverId');
        let result = {};
        query.count((err, count) => {
            if (err) {
                console.log({
                    msg: 'MongoBolTicketSink:fetchAll::Error occurred in count query',
                    err: err
                });
                reject(err);
            } else {
                result.totalItems = count;
            }
        });

        query.skip(pageNo*noOfItems).limit(noOfItems).populate().exec('find', ((err, docs) => {
            if (err) {
                console.log({
                    msg: 'MongoBolTicketSink:fetchAll::Error occurred',
                    err: err
                });
                reject(err);
            } else {
                result.items = docs;
                resolve(result);
            }
        }));
    });
};

module.exports = MongoBolTicketSink;
