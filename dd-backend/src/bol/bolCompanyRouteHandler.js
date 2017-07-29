/*
This will be used for all the CRUD operation for the bol (bill of lad) collection.
 */
'use strict';

// System includes
const co = require('co');
const _ = require('underscore');

// Local includes
const mongoBolCompanySink = require('./mongoBolCompanySink');
const utils = require('../core/utils');

class BolCompanyRouteHandler {
    constructor(mongo) {
        this._mongoBolCompanySink = new mongoBolCompanySink(mongo);
    }
}

BolCompanyRouteHandler.prototype.init = function () {
    let self = this;
    return co (function *() {
        console.log({
            msg: 'BolCompanyRouteHandler.init:: Start Initialization'
        });
        yield self._mongoBolCompanySink.init();
        console.log({
            msg: 'BolCompanyRouteHandler.init:: Finished Initialization'
        });
    }).catch((err) => {
        console.log({
            msg: 'BolCompanyRouteHandler.init:: Error occurred in initialization'
        });
        throw err;
    });
};

BolCompanyRouteHandler.prototype.validateCarrier = function (req, res, next) {
    const user = req.user;
    if (user.type == 'carrier' && user.id) {
        next();
    } else {
        next('Only valid drivers/carriers are allowed to access this API');
    }
};

BolCompanyRouteHandler.prototype.update = function (req, res, next) {
    let self = this,
        msg;
    co(function *() {
        let companyObj = req.body;
        companyObj.companyId = req.params['companyId'];
        companyObj.carrierId = req.user.id;

        msg = self.validate(companyObj);
        // If there is ny validation error then send the error response.
        if (msg) throw msg;
        const bol = yield self._mongoBolCompanySink.update(companyObj);
        res.status(200).json(bol);
    }).catch( (err) => {
        console.log({
            msg: 'BolCompanyRouteHandler:update:: Error',
            err: err
        });
       next(err)
    });
};

BolCompanyRouteHandler.prototype.fetch = function (req, res, next) {
    let self = this;
    co (function *() {
        const companyId = req.params['companyId'];
        if (!companyId) {
            res.status(400).send('Company ID is not present');
        } else {
            const carrierId = req.user.id;
            const company = yield self._mongoBolCompanySink.fetchByCompanyId(companyId);
            if (!company) {
                res.status(404).send('Company not found with company id: ' + companyId);
            } else {
                if (_.indexOf(company.carriers, carrierId) == -1) {
                    next('Logged in carrier does not belong to this company');
                } else {
                    res.status(200).send(company);
                }
            }
        }
    }).catch( (err) => {
        console.log({
            msg: 'BolCompanyRouteHandler:fetch:: Error',
            err: err
        });
       next(err)
    });
};

BolCompanyRouteHandler.prototype.fetchAll = function(req, res, next) {
    let self = this;
    co (function *() {
        const carrierId = req.user.id;
        let condition = req.query;
        condition.carrierId = carrierId;
        self._sanitizeFetchQueryParams(condition);
        const companies =  yield  self._mongoBolCompanySink.fetchAll(condition);
        res.status(200).json(companies);
    }).catch( (err) => {
        console.log({
            msg: 'BolCompanyRouteHandler:fetchAll:: Error',
            err: err
        });
       next(err)
    });
};

/*
Although mongodb >= 4.0 can run validators on update but I am still writing the validation in the code to support the prior version.
If there is no validation error this method returns undefined else returns validation error message.
 */

BolCompanyRouteHandler.prototype.validate = function (data) {
    const companyName = data['companyName'];
    const location = data['location'];
    const emailId = data['emailId'];

    let msg;

    if (!msg && !companyName) {
        msg = 'Company Name is mandatory';
    }
    if (!msg && location) {
        msg = this._validateLocation(location, 'location');
    }
    if (!msg && !utils.isValidEmail(emailId)) {
        msg = 'Email Id is not valid';
    }

    return msg;
};

/*
For location city and state both are mandatory.
 */
BolCompanyRouteHandler.prototype._validateLocation = function (location, propertyName) {
    if (location && !location['city'] || !location['state'] || !location['zipcode']) {
        return propertyName + ': If location is specified then city, state and zipcode are required';
    } else {
        return undefined;
    }
};

/*
Assign default values to the properties.
Assign null to the properties which are present but does not have any value
 */
BolCompanyRouteHandler.prototype._sanitizeFetchQueryParams = function (condition) {
    // Any property which is empty make it null so that it will not be the part of search.
    for (let prop in condition) {
        if (!condition[prop]) {
            delete condition[prop];
        }
    }
    // Should be below the above for loop
    condition.pageNo = condition['pageNo'] || 0;
    condition.noOfItems = condition['noOfItems'] || 10;
};

module.exports = BolCompanyRouteHandler;
