"use strict";

const moment = require('moment');
const mongo = require('mongodb');
const pdf = require('html-pdf');
const config = require('../config');

exports.joinCity = function(location) {
    return location.city + ', ' + location.state + ' ' + location.zip;
};

exports.joinModel = function(vehicle) {
    return vehicle.make + ' ' + vehicle.model + ' ' + vehicle.year;
};

exports.randomChars = function(length) {
    let text = "";
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    for (let i = 1; i <= length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};

exports.randomDigits = function(length) {
    let text = "";
    const possible = "0123456789";
    for (let i = 1; i <= length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};

exports.generateToken = function(length) {
    if (!length) length = 32;
    const crypto = require('crypto');
    return crypto.randomBytes(length).toString('hex');
};

exports.blindCreditCard = function(cardNumber) {
    return cardNumber.replace(/^(\d)(.*)(\d{2})$/, '$1XXX XXXX XXXX XX$3');
};

exports.properCase = function(str) {
    return str.replace(/\w\S*/g, function(txt) {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
};

exports.daysPassed = (datetime) => (new Date() - new Date(datetime))/(1000*60*60*24);

exports.datesDifference = (datetime1, datetime2, unit) => {
    const diff = new Date(datetime2) - new Date(datetime1);
    if (unit === 'days') {
        return diff/(1000*60*60*24);
    }
};

exports.isValidEmail = (emailAddr) => {
    if (!emailAddr) {
        return false;
    } else {
        const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(emailAddr);
    }
};

exports.isValidDate = (dateStr, format) => {
    format = format ? format : 'MM/DD/YYYY';
    return moment(dateStr, format).isValid();
};

exports.getDate = function (dateStr, format) {
    format = format ? format : 'MM/DD/YYYY';
    return moment(dateStr, format).toDate();
};

exports.getMongoObjectID = function (str) {
    return new mongo.ObjectID(str);
};

exports.milesToMeters = (miles) => miles * 1609.34;

exports.writeSuccessResponse = (req, res, data) => {
    const isJson = req.query['json'];
    if (isJson) {
        res.status(200).send({result: data})
    } else {
        res.status(200).send(data);
    }
};

exports.writeErrorResponse = (req, res, error, status) => {
    const isJson = req.query['json'];
    if (!status) {
        status = 400;
    }
    if (isJson) {
        res.type('application/json');
        res.status(status).send({error: error.toString()})
    } else {
        res.type('text/plain');
        res.status(status).send(error.toString());
    }
};

exports.htmlToPDF = function (html, pdfPath) {
    const options = {
        format: 'Letter',
        directory: config.tmpDirectory,
        orientation: 'portrait',
        "type": "pdf"
    };
    return new Promise( (resolve, reject) => {
        pdf.create(html, options).toFile(pdfPath, function (err, response) {
            if (err) {
                reject(err);
            } else {
                resolve(response);
            }
        });
    });
};