'use strict';

const _ = require('lodash');

const constants = require('./constants');
const config = require('../config');
const utils = require('./utils');

exports.getMetadataValue = function (req, res, next) {
    const type = req.params['type'];
    let result;

    switch(type) {
        case 'VehicleTypes':
            result = constants.BOL_TICKET.VEHICLE_TYPES;
            break;
        case 'PaymentTerms':
            result = constants.BOL_TICKET.PAYMENT_TERMS;
            break;
        case 'DamageTypes':
            result = constants.BOL_TICKET.DAMAGE_TYPE_MAP;
            break;
        case 'TruckTypes':
            result = constants.BOL_TICKET.TRUCK_TYPES;
            break;
        case 'S3Bucket':
            result = config.aws.s3Bucket;
            break;
        case 'VehicleViews':
            result = constants.BOL_TICKET.VEHICLE_VIEWS;
            break;
        case 'ViewImagePath':
            result = config.host + config.viewImageS3BucketPath + '{vehicleViewLowerCase}-{vehicleTypeLowerCase}.png';
            break;
        case 'CompanyLogoPath':
            result = config.companyLogoPath;
            break;
        case 'DriverSignature':
            result = config.driverSignature;
            break;
        case 'CustomerSignature':
            result = config.customerSignature;
            break;
        default:
            result = null;
    }

    if (result) {
        utils.writeSuccessResponse(req, res, result);
    } else {
        utils.writeErrorResponse(req, res, 'Metadata not found with type: ' + type, 404);
    }
};