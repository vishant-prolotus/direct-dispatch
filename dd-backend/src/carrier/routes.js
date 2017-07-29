"use strict";

const Router = require('express').Router;

const router = Router();

const carrierAccount = require('./account');
const carrier = require('./carrier');
router.get('/govinfo/:dot', carrier.getCarrierGovInfoRoute);
router.post('/register', carrierAccount.register);
router.get('/user-invitation/:id/:token', carrierAccount.getInvitation);
router.post('/user-invitation/:id/:token', carrierAccount.acceptInvitation);
router.get('/activate-info/:id/:token', carrierAccount.activateInfo);
router.post('/activate', carrierAccount.activate);
router.post('/auth', carrierAccount.authenticate);
router.post('/reset-pass', carrierAccount.resetPassword);
router.get('/reset-pass-info/:id/:token', carrierAccount.resetPassInfo);
router.post('/new-pass', carrierAccount.newPass);
router.post('/confirm-email', carrierAccount.confirmEmail);

const carrierNotifications = require('../core/notifications')('carrier');
router.get('/notifications/subscribe/:token', carrierNotifications.auth, carrierNotifications.subscribe);

const express_jwt = require('express-jwt');
const config = require('../config');

router.use(express_jwt({ secret: config.jwtkey }));
//router.use(carrierAccount.authorizeRequest);

router.get('/notifications', carrierNotifications.list);
router.put('/notifications/:id/read', carrierNotifications.read);
router.delete('/notifications/:id', carrierNotifications.del);

const carrierProfile = require('./profile');
router.post('/save-phone', carrierProfile.savePhone);
router.post('/verify-phone', carrierProfile.verifyPhone);
router.get('/profile-complete', carrierProfile.profileComplete);

router.get('/user', carrierProfile.user);
router.post('/change-password', carrierProfile.changePassword);
router.post('/change-email', carrierProfile.changeEmail);

router.get('/company', carrierProfile.getCompany);
router.put('/company', carrierProfile.updateCompany);

router.get('/creditcard', carrierProfile.getCreditCard);
router.put('/creditcard', carrierProfile.updateCreditCard);

const carrierDocument = require('./document');
router.get('/docs', carrierDocument.listDocs);
router.get('/docs/:doc', carrierDocument.getDoc);
router.delete('/docs/:doc', carrierDocument.deleteDoc);

const truckRoutes = require('./truck').routes;
router.get('/trucks', truckRoutes.list);
router.post('/trucks', truckRoutes.insert);
router.get('/trucks/:truckId', truckRoutes.fetch);
router.put('/trucks/:truckId', truckRoutes.update);
router.get('/bol-driver/', truckRoutes.fetchBolAppTruck);
router.delete('/trucks/:truckId', truckRoutes.remove);

const carrierLoad = require('./load');
const dispatcher = require('./dispatcher');
router.get('/loads', carrierLoad.loads);
router.get('/loads/relevant', carrierLoad.relevantLoads);
router.get('/loads/all', carrierLoad.allLoads);
router.post('/loads/search', carrierLoad.searchLoad);
router.get('/loads/:id', carrierLoad.getLoad);
//router.put('/loads/:id/reject', carrierLoad.rejectLoad);
router.post('/request-dispatch/:orderId', dispatcher.requestDispatch);

const carrierOrder = require('./order');
router.get('/orders', carrierOrder.orders);
router.post('/orders/Undispatch', carrierOrder.Undispatch);
router.get('/orders/dispatched', carrierOrder.ordersDispatched);
router.get('/orders/pickedup', carrierOrder.ordersPickedup);
router.get('/orders/delivered', carrierOrder.ordersDelivered);
router.get('/orders/:id', carrierOrder.getOrder);
router.get('/orders/:id/pickup', carrierOrder.pickupOrderRoute);
router.get('/orders/:id/deliver', carrierOrder.deliverOrderRoute);

const userRoutes = require('./users').routes;
router.get('/users', userRoutes.list);
router.post('/users', userRoutes.insert);
router.get('/users/:id', userRoutes.fetch);
router.put('/users/:id', userRoutes.update);
router.delete('/users/:id', userRoutes.remove);

const vehicleRoute = require('./vehicle');
router.get('/vehicles', vehicleRoute.list);

module.exports = router;