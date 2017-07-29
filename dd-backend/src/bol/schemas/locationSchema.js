"use strict";
// System includes
const mongoose = require('mongoose');

let locationSchema = new mongoose.Schema(
    {
        city    : {type: String, required: [true, 'If location is specified then city, state and zipcode are required']},
        state   : {type: String, required: [true, 'If location is specified then city, state and zipcode are required']},
        zipcode : {type: String, required: [true, 'If location is specified then city, state and zipcode are required']},
        name    : {type: String},
        phoneNo : {type: String},
        address : {type: String},
        lat     : {type: String},
        lng     : {type: String}
    }
);

module.exports = locationSchema;