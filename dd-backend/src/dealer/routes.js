"use strict";

const Router = require('express').Router;
const co = require('co');
const sha1 = require('sha1');
const express_jwt = require('express-jwt');
const jwt = require('jsonwebtoken');

const config = require('../config');
const utils = require('../core/utils');
const routeInfo = require('../core/route-info');
const shippingPrice = require('../core/shipping-price');
const email = require('../core/email');
const order = require('../core/order');
const dealerNotifications = require('../core/notifications')('dealer');

const router = Router();

const accountModule = require('./account');
router.post('/register', accountModule.register);
router.get('/activate-info/:id/:token', accountModule.activateInfo);
router.post('/activate', accountModule.activate);
router.post('/auth', accountModule.authenticate);
router.post('/reset-pass', accountModule.resetPassword);
router.get('/reset-pass-info/:id/:token', accountModule.resetPassInfo);
router.post('/new-pass', accountModule.newPass);
router.post('/confirm-email', accountModule.confirmEmail);
router.get('/notifications/subscribe/:token', dealerNotifications.auth, dealerNotifications.subscribe);

router.use(express_jwt({secret: require('../config').jwtkey}));
router.use(function (req, res, next) {
	if (req.user.type === 'dealer') {
		next();
	} else {
		res.status(401).send('Not Authorized');
	}
});

router.get('/notifications', dealerNotifications.list);
router.put('/notifications/:id/read', dealerNotifications.read);
router.delete('/notifications/:id', dealerNotifications.del);

function ordersStats(req, res, next) {
    co(function*() {
        const output = {total: 0, pending: 0, dispatched: 0, pickedup: 0, delivered: 0};
        let query = { dealerId: req.user.id };
        let counts = [];
        for (const status of ['Pending', 'Dispatched', 'Pickedup', 'Delivered', 'Canceled']) {
            query['status'] = status;
            counts.push(yield global.db.collection('orders').count(query));
        }
        output.pending = counts[0];
        output.dispatched = counts[1];
        output.pickedup = counts[2];
        output.delivered = counts[3];
        output.canceled = counts[4];
        output.total = output.pending + output.dispatched + output.pickedup + output.delivered + output.canceled;
        return output;
    }).then(output => {
        res.json(output);
    }).catch(err => {
        res.status(400).send(err.toString());
    });
}

router.get('/dashboard/orders', ordersStats);

const profileModule = require('./profile');
router.get('/user', profileModule.getUser);
router.post('/change-password', profileModule.changePassword);
router.post('/change-email', profileModule.changeEmail);
router.get('/company', profileModule.getCompany);
router.put('/company', profileModule.updateCompany);
router.get('/creditcard', profileModule.getCreditCard);
router.put('/creditcard', profileModule.updateCreditCard);

router.post('/route-info', routeInfo.getDistanceAndPolylineRoute);
router.post('/shipping-price', shippingPrice.calculateRoute);

router.get('/orders', order.list);
router.get('/orders/:id', order.get);
router.get('/orders/:id/email/submitted', order.emailSubmittedRoute);
router.post('/orders', order.insert);
router.put('/orders/:id', order.update);
router.delete('/orders/:id', order.del);
router.put('/orders/:id/cancel', order.cancel);


module.exports = router;