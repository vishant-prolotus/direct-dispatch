"use strict";
// System includes
const mongoose = require('mongoose');
require('mongoose-type-email');

// Local includes
const locationSchema = require('./locationSchema');

let companySchema = new mongoose.Schema(
    {
        companyName : {type: String, required: [true, 'Company name is required']},
        emaillId    : {type: mongoose.SchemaTypes.Email},
        location    : {type: locationSchema},
        logo        : {type: String}, // Points to a photo URL which is probably saved in s3
        carriers    : {type: [String]}, // It is the list of carrier ids which belong to the company
        password    : {type: String}
    }
);
companySchema.index({companyName: 1}, {background: true, unique: true });

module.exports = companySchema;