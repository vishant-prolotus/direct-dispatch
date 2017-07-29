"use strict";
// System includes
const mongoose = require('mongoose');

const constants = require('../../core/constants');

let paymentTermSchema = new mongoose.Schema(
    {
        amount    : {type: String, required: [true, 'amount is required']},
        term      : {type: String, required: [true, 'payment term is required'], enum: constants.BOL_TICKET.PAYMENT_TERMS}
    }
);

module.exports = paymentTermSchema;