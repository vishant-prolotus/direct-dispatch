"use strict";

// System includes
const Router      = require('express').Router;
const express_jwt = require('express-jwt');
const co          = require('co');

// Local includes
const BolTicketRouteHandler   = require('./bolTicketRouteHandler');
const BolCompanyRouterHandler = require('./bolCompanyRouteHandler');
const Mongo                   = require('./mongo');
const config                  = require('../config');

const router                 = Router();
const mongo                  = new Mongo();
const bolTicketRouteHandler  = new BolTicketRouteHandler(mongo);
const bolCompanyRouteHandler = new BolCompanyRouterHandler(mongo);

// As we do not have this class and dependency structure right from the server.js, for now I am initializing it
// from here. Ideally route should also have one init() function which should in turn initialize the dependencies.

co(function *() {
    yield mongo.init();
    yield [bolTicketRouteHandler.init()];
    // We need to put this authentication middleware here because bol ticket APIs are not sub routes of
    // /carrier.

    router.use(express_jwt({ secret: config.jwtkey }), function (err, req, res, next) {
        // Handle the error in custom error handler instead of sending ugly html error response
        if (err) {
            res.status(401).send(err.toString());
        } else {
            next();
        }
    });

    // Ticket APIs
    router.use(bolTicketRouteHandler.validateCarrier.bind(bolTicketRouteHandler));
    router.post('/tickets', bolTicketRouteHandler.update.bind(bolTicketRouteHandler));
    router.get('/tickets/:id', bolTicketRouteHandler.fetch.bind(bolTicketRouteHandler));
    router.delete('/tickets/:id', bolTicketRouteHandler.delete.bind(bolTicketRouteHandler));
    router.get('/tickets', bolTicketRouteHandler.fetchAll.bind(bolTicketRouteHandler));
    router.post('/ticket/email', bolTicketRouteHandler.submitInspection.bind(bolTicketRouteHandler));
}).catch((err) => {
    console.log({
        msg: 'Error occurred while initializing routes for BOL',
        err: err
    });
});

module.exports = router;