"use strict";
// System includes
const mongoose = require('mongoose');
const constants = require('../../core/constants');
const vehicleType = constants.BOL_TICKET.VEHICLE_TYPES;

let vehicleSchema = new mongoose.Schema(
    {
        year  : {type: String, required: [true, 'If vehicle is specified then year is required']},
        make  : {type: String, required: [true, 'If vehicle is specified then make is required']},
        model : {type: String, required: [true, 'If vehicle is specified then model is required']},
        type  : {type: String, enum: vehicleType},
        vin   : {type: String}
    }
);

module.exports = vehicleSchema;