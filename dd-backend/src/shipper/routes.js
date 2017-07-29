'use strict';

const Router = require('express').Router;

const shipper = require('./shipper');
const router = Router();

router.post('/instant-quote', shipper.getQuote);
router.get('/view-quote/:id/:token', shipper.viewQuote);
router.post('/recalculate-quote/:id/:token', shipper.recalculateQuote);
router.post('/orders', shipper.insertOrder);
router.get('/orders/:id/:token', shipper.getOrder);
router.post('/order-token', shipper.getOrderToken);
router.get('/quote-bounce-email/:id/:token', shipper.sendQuoteBounceEmail);

module.exports = router;