"use strict";

const mongodb = require('mongodb');
const express = require('express');
const co = require('co');
const body_parser = require('body-parser');
const busboy = require('connect-busboy');
const EventEmitter2 = require('eventemitter2').EventEmitter2;

const pickerOptions = require('./core/picker-options');
const shipper = require('./shipper/shipper');
const shipperRoutes = require('./shipper/routes');
const staffRoutes = require('./staff/routes');
const carrierRoutes = require('./carrier/routes');
const dealerRoutes = require('./dealer/routes');
const bolRoutes = require('./bol/routes');
const website = require('./core/website');
const vin = require('./core/vin');
const metadata = require('./core/metadata');
const config = require('./config');
const utils = require('./core/utils');

co(function*() {

    const db = yield mongodb.MongoClient.connect('mongodb://localhost/' + config.db);
    global.db = db;
    console.log('Connected to MongoDB database');
    
    // real time push notifications
    global.staffNotifications = new EventEmitter2({ wildcard: true, maxListeners: 100 });
    global.carrierNotifications = new EventEmitter2({ wildcard: true, maxListeners: 100 });
    global.dealerNotifications = new EventEmitter2({ wildcard: true, maxListeners: 100 });

    // express app
    const app = express();
    app.enable('trust proxy');

    // middleware
    // app.use(body_parser.json());
    app.use(body_parser.json({limit: '50mb'}));
    app.use(body_parser.urlencoded({extended: true, limit: '50mb'}));
    app.use(busboy());
    
    // enable CORS
    //const cors = require('cors');
    //app.use(cors());
    //app.options('*', cors());

    // log for request
    app.use(function (req, res, next) {
        console.log(req.ip, new Date().toString(), req.method, req.url);
        next();
    });

    // general
    app.get('/map-image/:type/:id/:token/:width/:height/map.png', shipper.generateMapImage);
    app.post('/import-lead', shipper.importLead);
    app.get('/cities/:state', pickerOptions.citiesByState);
    app.get('/zipcodes/:state/:city', pickerOptions.zipcodesByCity);
    app.get('/city/:zip', pickerOptions.cityByZip);
    app.get('/city-search/:query/:limit?', pickerOptions.searchByZip);
    app.get('/vehicle-search/:query/:limit?', pickerOptions.searchVehicle);
    app.get('/vehicle-models/:make', pickerOptions.vehicleModels);
    app.post('/website/enterprise-lead', website.enterpriseLead);

    // Vehicle info by vin no
    app.get('/vehicle-info/:vin', vin.getVehicleInfo);

    // Metadata which we do not want to store at client side (specially in mobile app)
    app.get('/metadata/:type', metadata.getMetadataValue);

    // shipper routes
    app.use('/shipper', shipperRoutes);
    // staff routes
    app.use('/staff', staffRoutes);
    // carrier routes
    app.use('/carrier', carrierRoutes);
    // dealer routes
    app.use('/dealer', dealerRoutes);
    // bol routes
    app.use('/bol', bolRoutes);

     // Global Error Handling. If nothing is caught by above route this the error handler.
    app.use(function (err, req, res, next) {
        console.error('Error: ' + err.message);
        utils.writeErrorResponse(req, res, err, 400);
    });

    app.listen(config.services.main, function () {
        console.info('Web server listening at port ' + config.services.main);
        console.info('Running in ' + (process.argv[2] === '--production' ? 'Production' : 'Development') + ' Mode');
    });

});
