"use strict";
// System includes
const mongoose = require('mongoose');

// Local includes
const locationSchema = require('./locationSchema');
const damageSchema = require('./damageSchema');
const vehicleSchema = require('./vehicleSchema');
const paymentTermSchema = require('./paymentTermSchema');
const utils = require('../../core/utils');
const constants = require('../../core/constants');

let bolTicketSchema = new mongoose.Schema(
    {
        //carrierId             : {type: mongoose.Schema.ObjectId, required: [true, 'Unauthorized user']},  // refers to object id of the driver.
        //Cannot use ObjectId as a type because carrier's id is not a ObjectId type.
        carrierId          : {type: String, required: [true, 'Unauthorized user']},
        // ticket no is not mandatory now. We will generate the sequential _id instead of that. ticket now will be a free text and carrier can
        // enter any custom value in it.
        ticketNo           : {type: String},
        pickupLocation     : {type: locationSchema, required: true},
        dropoffLocation    : {type: locationSchema},
        vehicleInformation : {type: [vehicleSchema]},
        frontView          : {type: [damageSchema]},
        rightView          : {type: [damageSchema]},
        backView           : {type: [damageSchema]},
        leftView           : {type: [damageSchema]},
        topView            : {type: [damageSchema]},
        driverId           : {type: mongoose.Schema.Types.ObjectId},
        paymentTerm        : {type: paymentTermSchema},
        shipperSignature   : {type: String},
        driverSignature    : {type: String},
        customerEmail      : {type: String},
        status             : {type: String, enum: constants.BOL_TICKET.TICKET_STATUSES, uppercase: true, default: 'DISPATCHED'}
    },
    {
        _id                : false,
        autoIndex          : true
    }
);
bolTicketSchema.index({ticketNo: 1, carrierId: 1}, {background: true, unique: true, uniqueCaseInsensitive: true});
bolTicketSchema.index({carrierId: 1}, {background: true});
bolTicketSchema.index({status: 1}, {background: true});

// If ticket no is not passed in the request body then assign the _id to the ticket no. This can always be overridden by the user
bolTicketSchema.pre('save', function (next) {
    if (!this.get('ticketNo')) {
        this.ticketNo = utils.randomDigits(6);
    }
    next();
});

module.exports = bolTicketSchema;