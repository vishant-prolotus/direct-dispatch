'use strict';

// System includes
const _ = require('underscore');
const co = require('co');

// Local includes
const mongo        = require('./mongo');
const companySchema = require('./schemas/companySchema');

class MongoBolCompanySink {
    constructor(mongo) {
        this._collectionName  = 'bol-companies';
        this._mongo           = mongo;
        this._bolCompanyModel = null;
    }
}

MongoBolCompanySink.prototype.init = function () {
    const self = this;
    return co (function *() {
        console.log({
            msg: 'MongoBolCompanySink.init:: Start Initialization'
        });
        //yield self._mongo.init();
        self._bolCompanyModel = self._mongo.getModel('bol-company', companySchema, self._collectionName);
        console.log({
            msg: 'MongoBolCompanySink.init:: Finished Initialization'
        });
    }).catch((err) => {
        console.log({
            msg: 'MongoBolCompanySink.init:: Error occurred in initialization'
        });
        throw err;
    })
};

MongoBolCompanySink.prototype.update = function (obj) {
    const self = this;
    let condition = {'companyId': obj['companyId']};
    return new Promise(function (resolve, reject) {
        // runValidators error will not have any effect on mongodb prior to 4.0. We have written a custom validation
        // function in the route handler  for the compatibility
        self._bolCompanyModel.updateOne(condition, obj, {upsert: true, runValidators: true}, function (err, doc) {
            if (err) {
                reject(err);
            } else {
                resolve(obj);
            }
        });
    });
};

MongoBolCompanySink.prototype.fetchByCompanyId = function (companyId) {
    const self = this;
    let condition;
    return new Promise(function (resolve, reject) {
        if (!companyId) {
            reject('Company ID is not present');
        } else {
            condition = {companyId: companyId};
            self._bolCompanyModel.findOne(condition, '-__v').lean().exec(function (err, doc) {
                if (err) {
                    console.log({
                        msg: 'MongoBolCompanySink:fetchByCompanyId::Error occurred',
                        companyId: companyId,
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

MongoBolCompanySink.prototype.fetchAll = function (condition) {
    const self = this;
    const pageNo = condition['pageNo'] || 0;
    const noOfItems = condition['noOfItems'] || 10;
    delete  condition['pageNo'];
    delete condition['noOfItems'];

    return new Promise(function (resolve, reject) {
        let query = self._bolCompanyModel.find(condition, '-__v');
        let result = {};
        query.count((err, count) => {
            if (err) {
                console.log({
                    msg: 'MongoBolCompanySink:fetchAll::Error occurred in count query',
                    err: err
                });
                reject(err);
            } else {
                result.totalItems = count;
            }
        });

        query.skip(pageNo*noOfItems).limit(noOfItems).exec('find', ((err, docs) => {
            if (err) {
                console.log({
                    msg: 'MongoBolCompanySink:fetchAll::Error occurred',
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

module.exports = MongoBolCompanySink;
