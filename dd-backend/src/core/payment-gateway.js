"use strict";

const request = require('request');
const config = require('../config').authorizeDotNet;

exports.isInvalidCreditCard = function (creditCard) {
    if (typeof creditCard.cardNumber !== 'string' || typeof creditCard.expirationDate !== 'string' || typeof creditCard.cardCode !== 'string') {
        return 'Credit card structure has invalid types';
    }
    if (!creditCard.cardNumber.match(/^\d{13,16}$/)) {
        return 'Invalid card number. should be 13 to 16 digits long only';
    }
    if (!creditCard.expirationDate.match(/^(0[1-9]|1[0-2])([1-9][0-9])$/)) {
        return 'Invalid expiration date. Should be in format MMYY';
    }
    if (!creditCard.cardCode.match(/^\d{3,4}$/)) {
        return 'Invalid card code. Should be 3 or 4 digits long';
    }
};

function logTrans(req, res, info) {
    global.db.collection('transLog').insertOne({ request: req, response: res, info: info, datetime: new Date() });
}

function authorizeRequest(transactionRequest, info) {
    const requestJson = {
        "createTransactionRequest": {
            "merchantAuthentication": {
                "name": config.apiLogin,
                "transactionKey": config.transactionKey
            },
            "transactionRequest": transactionRequest
        }
    };
    return new Promise((resolve, reject) => {
        request({ url: config.url, method: 'POST', json: true, body: requestJson }, (error, response, responseBody) => {
            if (error) return reject(error);
            if (!(response.statusCode >= 200 && response.statusCode < 300)) return reject('Something went wrong while making request to payment gateway. Status Message: ' + response.statusMessage);
            const responseJson = JSON.parse(responseBody.trim());
            logTrans(requestJson, responseJson, info);
            if (responseJson.transactionResponse && responseJson.transactionResponse.errors) return reject(responseJson.transactionResponse.errors[0].errorText);
            if (responseJson.messages.resultCode !== 'Ok') return reject(responseJson.messages.message[0].text);
            //if (responseJson.transactionResponse.responseCode !== '1') return reject(responseJson.transactionResponse.messages[0].description);
            if (!responseJson.transactionResponse.transId) return reject('Transaction was unsuccessful. No trasaction Id received');
            resolve(responseJson.transactionResponse.transId);
        });
    });
}

exports.authorizeCreditCard = function (creditCard, amount, info) {
    const transactionRequest = {
        "transactionType": "authOnlyTransaction",
        "amount": amount,
        "payment": {
            "creditCard": {
                    "cardNumber": creditCard.cardNumber,
                    "expirationDate": creditCard.expirationDate,
                    "cardCode": creditCard.cardCode
                }
        },
        "order": {
            "description": info
        }
    };
    return authorizeRequest(transactionRequest, info)
            .then(transId => {
                console.log('Credit Card Authorized', "\n", info);
                return transId;
            }).catch(err => {
                console.log('Credit Card Authorization Failure', "\n", info, "\n", err);
                throw err;
            });
};

exports.captureTransaction = function (refTransId, amount, info) {
    const transactionRequest = {
        "transactionType": "priorAuthCaptureTransaction",
        "refTransId": refTransId,
        "order": {
            "description": info
        }
    };
    return authorizeRequest(transactionRequest, info)
        .then(transId => {
            console.log('Transaction Captured', "\n", info);
            return transId;
        }).catch(err => {
            console.log('Transaction Capturing Failure', "\n", info, "\n", err);
            throw err;
        });
};

exports.voidTransaction = function (refTransId, info) {
    const transactionRequest = {
        "transactionType": "voidTransaction",
        "refTransId": refTransId,
        "order": {
            "description": info
        }
    };
    return authorizeRequest(transactionRequest, info)
        .then(transId => {
            console.log('Transaction Voided', "\n", info);
            return transId;
        }).catch(err => {
            console.log('Transaction Voiding Failure', "\n", info, "\n", err);
            throw err;
        });
};

function getTransactionDetails(transId) {
    const requestJson = {
        "getTransactionDetailsRequest": {
            "merchantAuthentication": {
                "name": config.apiLogin,
                "transactionKey": config.transactionKey
            },
            "transId": transId
        }
    };
    return new Promise((resolve, reject) => {
        request({ url: config.url, method: 'POST', json: true, body: requestJson }, (error, response, responseBody) => {
            if (error) return reject(error);
            if (!(response.statusCode >= 200 && response.statusCode < 300)) return reject('Something went wrong while making request to payment gateway. Status Message: ' + response.statusMessage);
            const responseJson = JSON.parse(responseBody.trim());
            if (responseJson.messages.resultCode !== 'Ok') return reject(responseJson.messages.message[0].text);
            resolve(responseJson.transaction);
        });
    });
}