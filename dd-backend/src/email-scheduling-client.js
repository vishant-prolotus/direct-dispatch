"use strict";

const request = require('request');
const config = require('./config');
const url = 'http://localhost:' + config.services.emailScheduling;

exports.schedule = function (leadId) {
    return new Promise(function (resolve, reject) {
        request(url + '/schedule/' + leadId, (error, response, body) => {
            if (error) return reject(error);
            if (!(response.statusCode >= 200 && response.statusCode < 300)) return reject(body);
            return resolve(body);
        });
    }).then(done => {
        console.log(done);
    }).catch(err => {
        console.error(err.toString());
        throw err;
    });
};

exports.cancel = function (leadId) {
    return new Promise(function (resolve, reject) {
        request(url + '/cancel/' + leadId, (error, response, body) => {
            if (error) return reject(error);
            if (!(response.statusCode >= 200 && response.statusCode < 300)) return reject(body);
            return resolve(body);
        });
    }).then(done => {
        console.log(done);
    }).catch(err => {
        console.error(err.toString());
        throw err;
    });
};