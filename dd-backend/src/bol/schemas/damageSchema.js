"use strict";
// System includes
const mongoose = require('mongoose');
const constants = require('../../core/constants');

let damageSchema = new mongoose.Schema(
    {
        // full form of enum. ['SCRATCHED', 'MULTIPLE_SCRATCHES', 'DENT', 'PAINT_CHIP', 'MAJOR_DAMAGE', 'CRACKED']
        damageType : {type: String, enum: constants.BOL_TICKET.DAMAGE_TYPES, required: [true, 'If damage is specified then damageType is required'], uppercase: true},
        photo      : {type: String},
        xPos       : {type: Number},
        yPos       : {type: Number}
    }
);

module.exports = damageSchema;