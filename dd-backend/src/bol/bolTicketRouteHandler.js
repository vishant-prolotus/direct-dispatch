/*
This will be used for all the CRUD operation for the bol (bill of lad) collection.
 */
'use strict';

// System includes
const co = require('co');
const _ = require('underscore');

// Local includes
const mongoBolTicketSink = require('./mongoBolTicketSink');
const truckCRUD = require('../carrier/truck').crud;
const utils = require('../core/utils');
const constants = require('../core/constants');
const carrierProfile = require('../carrier/profile');
const email = require('../core/email');

const vehicleTypes = constants.BOL_TICKET.VEHICLE_TYPES;
const truckTypes = constants.BOL_TICKET.TRUCK_TYPES;

class BolTicketRouteHandler {
    constructor(mongo) {
        this._mongoBolTicketSink = new mongoBolTicketSink(mongo);
    }
}

BolTicketRouteHandler.prototype.init = function () {
    let self = this;
    return co (function *() {
        console.log({
            msg: 'BolTicketRouteHandler.init:: Start Initialization'
        });
        yield self._mongoBolTicketSink.init();
        console.log({
            msg: 'BolTicketRouteHandler.init:: Finished Initialization'
        });
    }).catch((err) => {
        console.log({
            msg: 'BolTicketRouteHandler.init:: Error occurred in initialization'
        });
        throw err;
    });
};

BolTicketRouteHandler.prototype.validateCarrier = function (req, res, next) {
    const user = req.user;
    if (user.type == 'carrier' && user.id) {
        next();
    } else {
        next('Only valid drivers/carriers are allowed to access this API');
    }
};

/**
 * @api {post} /bol/tickets/:ticketNo Create or Update BOL Ticket
 * @apiDescription If a ticket with the given ticket no exist then update the record else create a new ticket with the provided data.
 * It will return ticket object containing all the properties which were passed in the request body for a successful response.
 * @apiGroup BOL
 *
 * @apiHeader (AuthenticationHeaderGroup) {String} authorization user's token received in the response of the sign in API
 * @apiHeaderExample {json} Authorization-Token-Example:
 * {
 *  Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6IjEwMDQiLCJ0eXBlIjoiY2FycmllciIsInJvbGUiOiJPd25lciIsImlhdCI6MTQ5MTU4ODY3OX0.WPp-X86HHiGDw45d28Ngsq2FQt2YI7SUSJnpQd2Cy6s
 * }
 * @apiParamExample {json} Request-Example:
 * {
	"topView": [
		{
			"xPos": 4,
			"damageType": "s",
			"photo": "http://some.photo.link.url"
		}
	],
	"pickupLocation": {
		"city": "California City",
		"state": "California",
		"zipcode": 25148
	},
	"status": "dispatched"
 * }
 * @apiSuccessExample {json} Success-Response:
 * {
  "topView": [
    {
      "xPos": 4,
      "damageType": "s",
      "photo": "http://some.photo.link.url"
    }
  ],
  "pickupLocation": {
    "city": "California City",
    "state": "California",
    "zipcode": 25148
  },
  "status": "DISPATCHED",
  "ticketNo": "24",
  "carrierId": "1004",
  "$setOnInsert": {
    "__v": 0
  }
}
 */
BolTicketRouteHandler.prototype.update = function (req, res, next) {
    let self = this,
        msg;
    co(function *() {
        let ticketObj = req.body;
        ticketObj.carrierId = req.user.id;
        if ('status' in ticketObj) {
            ticketObj['status'] = ticketObj['status'].toUpperCase();
        }

        msg = self._validate(ticketObj);
        // If there is ny validation error then send the error response.
        if (msg) throw msg;
        if (ticketObj['driverSignature'] && ticketObj['saveDriverSignature']) {
            // If there is a command to save the driver's signature but there is no driverId associated with the ticket
            // then raise the error else get the driverId from ticket object and update the signature over there.
            const driverId = ticketObj['driverId'];
            yield truckCRUD.updateDriverSignature(ticketObj.carrierId, driverId, ticketObj['driverSignature']);
        }
        const bol = yield self._mongoBolTicketSink.update(ticketObj);
        utils.writeSuccessResponse(req, res, bol);
    }).catch( (err) => {
        console.log({
            msg: 'BolTicketRouteHandler:update:: Error',
            err: err
        });
       utils.writeErrorResponse(req, res, err, 400);
    });
};

/**
 * @api {get} /bol/tickets/:ticketNo Fetch the ticket with the given ticketNo
 * @apiDescription Returns the detailed record of the ticket with the given ticketNo. If the ticket does not belong to the logged in driver then
 * an authorization error is returned.
 * @apiGroup BOL
 *
 * @apiHeader (AuthenticationHeaderGroup) {String} authorization user's token received in the response of the sign in API
 * @apiHeaderExample {json} Authorization-Token-Example:
 * {
 *  Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6IjEwMDQiLCJ0eXBlIjoiY2FycmllciIsInJvbGUiOiJPd25lciIsImlhdCI6MTQ5MTU4ODY3OX0.WPp-X86HHiGDw45d28Ngsq2FQt2YI7SUSJnpQd2Cy6s
 * }
 * @apiExample {curl} Example usage:
 * curl localhost:3000/bol/tickets/23
 * @apiSuccessExample {json} Success-Response:
 *
 {
  "_id": "58e7d6b02ab5516cb7e0096a",
  "carrierId": "1004",
  "ticketNo": "23",
  "status": "DISPATCHED",
  "pickupLocation": {
    "_id": "58e938848d73e3248a7b3092",
    "zipcode": "25148",
    "state": "California",
    "city": "California City"
  },
  "topView": [
    {
      "_id": "58e938848d73e3248a7b3091",
      "damageType": "S",
      "xPos": 4
    }
  ]
}
 */
BolTicketRouteHandler.prototype.fetch = function (req, res, next) {
    let self = this;
    co (function *() {
        const ticketId = req.params['id'];
        if (!ticketId) {
            res.status(400).send('Ticket Id is not present');
        } else {
            const carrierId = req.user.id;
            const bol = yield self._mongoBolTicketSink.fetchByTicketId(carrierId, ticketId);
            if (!bol) {
                utils.writeErrorResponse(req, res, 'ticket not found with ticket id: ' + ticketId + ' for this carrier', 400);
            } else {
                utils.writeSuccessResponse(req, res, bol);
            }
        }
    }).catch( (err) => {
        console.log({
            msg: 'BolTicketRouteHandler:fetch:: Error',
            err: err
        });
        utils.writeErrorResponse(req, res, err, 400);
    });
};

/**
 * @api {get} /bol/tickets/ Fetch all the ticket.
 * @apiDescription Returns the list of the tickets which belong to the driver. We can add pagination and various filter in the API.
 * @apiGroup BOL
 *
 * @apiHeader (AuthenticationHeaderGroup) {String} authorization user's token received in the response of the sign in API
 * @apiHeaderExample {json} Authorization-Token-Example:
 * {
 *  Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6IjEwMDQiLCJ0eXBlIjoiY2FycmllciIsInJvbGUiOiJPd25lciIsImlhdCI6MTQ5MTU4ODY3OX0.WPp-X86HHiGDw45d28Ngsq2FQt2YI7SUSJnpQd2Cy6s
 * }
 * @apiExample {curl} Example usage:
 * curl localhost:3000/bol/tickets
 * @apiParamExample {json} Query Params-Example:
 * {
 *  pageNo: 5
 *  noOfItems: 20
 *  status: 'disptached'
 * }
 * @apiSuccessExample {json} Success-Response:
 *
 {
  "_id": "58e7d6b02ab5516cb7e0096a",
  "carrierId": "1004",
  "ticketNo": "23",
  "status": "DISPATCHED",
  "pickupLocation": {
    "_id": "58e938848d73e3248a7b3092",
    "zipcode": "25148",
    "state": "California",
    "city": "California City"
  },
  "topView": [
    {
      "_id": "58e938848d73e3248a7b3091",
      "damageType": "S",
      "xPos": 4
    }
  ]
}
 */
BolTicketRouteHandler.prototype.fetchAll = function(req, res, next) {
    let self = this;
    co (function *() {
        const carrierId = req.user.id;
        let condition = req.query;
        condition.carrierId = carrierId;
        self._sanitizeFetchQueryParams(condition);
        const allBolTickets =  yield  self._mongoBolTicketSink.fetchAll(condition);
        utils.writeSuccessResponse(req, res, allBolTickets);
    }).catch( (err) => {
        console.log({
            msg: 'BolTicketRouteHandler:fetchAll:: Error',
            err: err
        });
        utils.writeErrorResponse(req, res, err, 400);
    });
};

/*
Delete the ticket by ticket's _id.
 */
BolTicketRouteHandler.prototype.delete = function (req, res, next) {
    let self = this;
    co (function *() {
        const ticketId = req.params['id'];
        if (!ticketId) {
            res.status(400).send('Ticket Id is not present');
        } else {
            const carrierId = req.user.id;
            const result = yield self._mongoBolTicketSink.delete(carrierId, ticketId);
            utils.writeSuccessResponse(req, res, 'Successfully deleted the ticket');
        }
    }).catch( (err) => {
        console.log({
            msg: 'BolTicketRouteHandler:delete:: Error',
            err: err
        });
        utils.writeErrorResponse(req, res, err, 400);
    });
};

BolTicketRouteHandler.prototype.submitInspection = function (req, res, next) {
    const self = this;
    // Lets us first save the customer email in ticket object.
    co(function *() {
        const customerEmail = req.body['customerEmail'];
        const ticketId = req.body['_id'];
        const carrierId = req.user.id;
        const submissionType = req.body['submissionType'];
        let emailSubject;
        let ticketStatus;

        if (!ticketId || !customerEmail || !carrierId || !submissionType) {
            utils.writeErrorResponse(req, res, 'required params are missing', 400);
            return;
        }
        if (submissionType != 'pickup' && submissionType != 'delivery') {
            utils.writeErrorResponse(req, res, 'Invalid submission type', 400);
            return;
        }

        // Fetch the necessary information from the ticket to send in the email.
        // 1) Need ticket object
        // 2) Need company info object
        let ticket = yield self._mongoBolTicketSink.fetchByTicketId(carrierId, ticketId);

        if (!ticket) {
            utils.writeErrorResponse(req, res, 'Invalid Ticket', 404);
            return;
        }

        // TODO: Based on submissionType (pickup or drop) few values needs to be changed
        // 1) email subject
        // 2) email template
        if (submissionType.toLowerCase() == 'pickup') {
            emailSubject = 'Pickup Confirmation';
            ticketStatus = constants.BOL_TICKET.TICKET_STATUSES_MAP.PICKED_UP;
        } else {
            emailSubject = 'Delivery Confirmation';
            ticketStatus = constants.BOL_TICKET.TICKET_STATUSES_MAP.DELIVERED;
        }

        // Save the customerEmail id in the ticket object.
        const ticketObjToUpdate = {
            _id: ticketId,
            customerEmail: customerEmail,
            status: ticketStatus
        };

        // Update customer email in ticket
        const updateTicketPromise = self._mongoBolTicketSink.update(ticketObjToUpdate);
        // Get the driver info because we need to keep driver also in cc in the email.
        const fetchDiverPromise =  truckCRUD.fetchBolAppTruck(carrierId);
        // Fetch company info
        const companyInfoPromise = carrierProfile.getCompanyInfo(carrierId);

        const result = yield [updateTicketPromise, fetchDiverPromise, companyInfoPromise];

        console.log({
            msg: 'Updated ticket. Fetched driver info and company info',
            ticketId: ticketId,
            newStatus: ticketStatus
        });
        const driver = result[1];
        const companyInfo = result[2];

        if (!driver) {
            utils.writeErrorResponse(req, res, 'Please update the driverEmail in profile before sending the ' + submissionType + ' confirmation email');
            return;
        }

        const driverEmail = driver.driverEmail;
        let data = {
            ticket: ticket,
            company: companyInfo
        };

        console.log({
            msg: 'Sending confirmation email',
            ticketId: ticketId,
            to: customerEmail
        });
        const mailOptions = {
            from: email.addresses.info,
            to: customerEmail,
            cc: driverEmail,
            subject: emailSubject
        };

        // TODO: We might think of sending this email in the background using async queue.
        yield email.sendPDF(mailOptions, data, 'bol/bolDeliveryPDF.html', 'bol/css/bolDelivery.css');
        utils.writeSuccessResponse(req, res, 'Sent email successfully');

    }).catch((err) => {
        console.log({
            msg: 'BolTicketRouteHandler:submitInspection:: Error',
            err: err
        });
        utils.writeErrorResponse(req, res, err, 400);
    });
};

/*
Although mongodb >= 4.0 can run validators on update but I am still writing the validation in the code to support the prior version.
If there is no validation error this method returns undefined else returns validation error message.
 */

BolTicketRouteHandler.prototype._validate = function (data) {
    const ticketNo = data['ticketNo'];
    const pickupLocation = data['pickupLocation'];
    const dropoffLocation = data['dropoffLocation'];
    const frontView = data['frontView'];
    const backView = data['backView'];
    const topView = data['topView'];
    const leftView = data['leftView'];
    const rightView = data['rightView'];
    const vehicleInformation = data['vehicleInformation'];
    const status = data['status'];
    const driverInfo = data['driverInfo'];
    const paymentTerm = data['paymentTerm'];

    let msg;
    if (!msg && pickupLocation) {
        msg = this._validateLocation(pickupLocation, 'pickupLocation');
    }
    if (!msg && dropoffLocation) {
        msg = this._validateLocation(dropoffLocation, 'dropoffLocation');
    }
    if (!msg && frontView) {
        msg = this._validateDamages(frontView, 'frontView');
    }
    if (!msg && backView) {
        msg = this._validateDamages(backView, 'backView');
    }
    if (!msg && topView) {
        msg = this._validateDamages(topView, 'topView');
    }
    if (!msg && leftView) {
        msg = this._validateDamages(leftView, 'leftView');
    }
    if (!msg && rightView) {
        msg = this._validateDamages(rightView, 'rightView');
    }
    if (!msg && status &&  _.indexOf(['DISPATCHED', 'PICKED_UP', 'DELIVERED'], status) == -1) {
        msg = 'Status is not valid';
    }
    if (!msg && vehicleInformation) {
        msg = this._validateVehicleInformation(vehicleInformation);
    }
    if (!msg && driverInfo) {
        msg = this._validateDriverInfo(driverInfo);
    }
    if (!msg && paymentTerm) {
        msg = this._validatePaymentTerm(paymentTerm);
    }
    return msg;
};

/*
For location city and state both are mandatory.
 */
BolTicketRouteHandler.prototype._validateLocation = function (location, propertyName) {
    if (location && !location['city'] || !location['state'] || !location['zipcode']) {
        return propertyName + ': If location is specified then city, state and zipcode are required';
    } else {
        return undefined;
    }
};

/*
client should always pass the array of damages even if it wants to add only single damage. If a damage is passed then it should
at least have damageType from the list of pre decided enum values.
 */
BolTicketRouteHandler.prototype._validateDamages = function (damages, propertyName) {
    let msg;
    if (!Array.isArray(damages)) {
        return propertyName + ': is not given in correct format';
    }
    for(let damage of  damages) {
        if (damage && (!damage['damageType'] || _.indexOf(constants.BOL_TICKET.DAMAGE_TYPES, damage['damageType'].toUpperCase()) == -1)) {
            msg = propertyName + ': Either damageType is not specified or have wrong value';
            break;
        }
    }
    return msg;
};

/*
Mobile app can either scan the barcode if the vehicle or fill in the information manually. In both the cases make, model and year
are compulsory. In case vin is coming then store that also.
 */
BolTicketRouteHandler.prototype._validateVehicleInformation = function (vehicleInfo) {
    let msg;
    if (!Array.isArray(vehicleInfo)) {
        msg = 'Vehicle information is not passed in correct format';
        return msg;
    }
    for (let vehicle of vehicleInfo) {
        if (!vehicle['year'] && !vehicle['make'] && !vehicle['model']) {
            msg = 'vehicleInformation: year, make or model is missing'
        }
        if (!msg && vehicle['type'] && _.indexOf(vehicleTypes, vehicle['type']) == -1) {
            msg = 'vehicleInformation: Vehicle type is not a valid value';
        }
        if (msg) break;
    }
    return msg;
};

/*
This method should ideally present in the truck.js. Our responsibility was only to pass the truckId and data. But as
that class is not written correctly, as of now lets keep all the validation here.
 */
BolTicketRouteHandler.prototype._validateDriverInfo = function (driverInfo) {
    // Apart from the logo all the data is required.
    let msg;
    const requiredProperties = ['type', 'driverName', 'driverPhone', 'driverEmail', 'driverSignature'];
    for (let property of requiredProperties) {
        if (!(property in driverInfo)) {
            msg = property + ' is missing in the driver info data';
            break;
        }
    }
    if (('type' in driverInfo) && _.indexOf(truckTypes, driverInfo['type']) == -1) {
        msg = 'Truck type is not valid';
    }
    return msg;
};

/*
Both the properties amount and term are mandatory in the object.
 */
BolTicketRouteHandler.prototype._validatePaymentTerm = function (paymentTerm) {
    let msg;
    if (!('amount' in paymentTerm) || !paymentTerm['term']) {
        msg = 'amount and payment term both are required';
    }
    return msg;
};

/*
Assign default values to the properties.
Assign null to the properties which are present but does not have any value
 */
BolTicketRouteHandler.prototype._sanitizeFetchQueryParams = function (condition) {
    // Any property which is empty make it null so that it will not be the part of search.
    for (let prop in condition) {
        if (!condition[prop]) {
            delete condition[prop];
        }
    }
    // Should be below the above for loop
    condition.pageNo = condition['pageNo'] || 0;
    condition.noOfItems = condition['noOfItems'] || 10;
    if (condition.status) {
        condition.status = condition.status.toUpperCase();
    }
};

module.exports = BolTicketRouteHandler;
