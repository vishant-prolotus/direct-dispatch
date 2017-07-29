"use strict";

const _ = require('lodash');
const co = require('co');

const utils = require('../core/utils');
const email = require('../core/email');
const staffNotifications = require('../core/notifications')('staff');
const carrierNotifications = require('../core/notifications')('carrier');
const paymentGateway = require('../core/payment-gateway');
const shippingPrice = require('../core/shipping-price');
const salesrepModule = require('../staff/salesrep');

exports.requestDispatch = function (req, res, next) {
    co(function * () {
        // validation
        const loadAlertConfig = require('../email-templates/config');
        if (loadAlertConfig.validateInput) throw 'Error: merchant denied the transation due to malfunctioning in request';
        const dispatchRequest = _.pick(req.body, 'pickupDate', 'deliveryDate');
        if (!dispatchRequest.pickupDate || !dispatchRequest.deliveryDate) throw 'Required parameters are missing';
        const order = yield global.db.collection('orders').findOne({_id: req.params.orderId }, { creditCard: 0 });
        const carrier = yield global.db.collection('carriers').findOne({_id: req.user.id}, {name: 1, company: 1, phone: 1, email: 1, creditCard: 1});
        if (!order) throw 'Invalid dispatch request. Load not found';
        if (order.status !== 'Pending') throw 'Sorry, this load has been dispatched already';
        if (!carrier.creditCard) throw 'Credit card not found, please add credit card first in order to request dispatch';
        const pickupDates = order.pickup.dates.split(', ');
        if (!_.includes(pickupDates, dispatchRequest.pickupDate)) throw 'Sorry, we cannot dispatch for this pickup date. Only given pickup dates are accepted';
        // start dispatching process
        carrier.pickupDate = dispatchRequest.pickupDate;
        carrier.deliveryDate = dispatchRequest.deliveryDate;
        order.carrier = carrier;
        const updateFields = {status: 'Dispatched', assignedTo: carrier._id, dispatchedAt: new Date(), dispatchRequest: dispatchRequest };
        // take total fee
        const totalFee = shippingPrice.getTotalFee(order.vehicles);
        const transId = yield paymentGateway.authorizeCreditCard(order.carrier.creditCard, totalFee, '9% total fee authorized via carrier cc for order # ' + order._id);
        updateFields.totalFeeAuthorized = { amount: totalFee, transId: transId, datetime: new Date() };
        delete carrier.creditCard;
        // update order
        yield global.db.collection('orders').updateOne({ _id: order._id }, { $set: updateFields });
        // send dispatch notification to staff
        const notifyMsg = { type: 'order-dispatched', title: `Order #${order._id} Dispatched`,
                            contents: `Carrier Company: ${carrier.company}, Pickup Date: ${dispatchRequest.pickupDate} `,
                            params: { orderId: order._id } };
        staffNotifications.emit({role: 'admin'}, notifyMsg);
        // send transaction notification to carrier
        const authMsg = { type: 'total-fee-authorized', title: `$${totalFee} processing fee authorized for order #${order._id}`,
                        contents: 'This amount will be captured only when you successfully pick the load. You will receice this amount from shipper as part of COD',
                        params: { orderId: order._id } };
        carrierNotifications.emit({role: 'carrier', id: req.user.id }, authMsg);
        // email shipper
        const shipperMail = {
            to: order.shipper.email,
            from: email.addresses.sales,
            subject: 'Your Order #' + order._id + ' has been dispatched'
        };
        yield email.send(shipperMail, Object.assign({ utils: _.pick(shippingPrice, ['getVehiclePrice', 'getTotalPrice']) }, order), 'shipper/order-dispatched.html');
        // email carrier
        const carrierMail = {
            to: order.carrier.email,
            from: email.addresses.sales,
            subject: 'Order #' + order._id + ' has been dispatched to you for pickup'
        };
        // add salesrep points
        if (order.salesrepId) {
            const days = utils.datesDifference(order.created, new Date(), 'days');
            let points = null;
            let subtype = null;
            let duration = null;
            if (days <= 1) {
                points = 325;
                subtype = '<= 24h';
                duration = 'within 24 hours';
            } else if (days <= 2) {
                points = 280;
                subtype = '<= 48h';
                duration = 'within 48 hours';
            } else if (days <= 7) {
                points = 195;
                subtype = '<= 7d';
                duration = 'within 7 days';
            } else {
                points = 120;
                subtype = '> 7d';
                duration = 'after 7 days';
            }
            yield salesrepModule.addPoints(order.salesrepId, points, 'order-dispatch', subtype, 'Order dispatched ' + duration, { orderId: order._id});
            const price = shippingPrice.getTotalPrice(order.vehicles, order.packagePrice);
            points = null;
            subtype = null;
            let priceLimit = null;
            if (price > 5000) {
                points = 440;
                subtype = '> 5000';
                priceLimit = '5000';
            } else if (price > 2500) {
                points = 265;
                subtype = '> 2500';
                priceLimit = '2500';
            } else if (price > 1500) {
                points = 195;
                subtype = '> 1500';
                priceLimit = '1500';
            }  else if (price > 1000) {
                points = 150;
                subtype = '> 1000';
                priceLimit = '1000';
            }
            if (points) {
                yield salesrepModule.addPoints(order.salesrepId, points, 'order-dispatch-price', subtype, 'Order dispatched with price greater than $' + priceLimit, { orderId: order._id});
            }
        }
        // add salesrep points for dealer;
        const dealer = yield global.db.collection('dealers').findOne({ _id: order.dealerId }, { salesrepId: 1, activated: 1 });
        if (dealer && dealer.salesrepId) {
            const days = utils.datesDifference(dealer.activated, new Date(), 'days');
            let points = null;
            let subtype = null;
            let duration = null;
            if (days <= 30) {
                points = 350;
                subtype = '<= 30d';
                duration = 'within 30 days';
            } else if (days <= 90) {
                points = 225;
                subtype = '<= 90d';
                duration = 'within 90 days';
            } else if (days <= 180) {
                points = 80;
                subtype = '<= 180d';
                duration = 'within 180 days';
            } else if (days <= 365) {
                points = 55;
                subtype = '<= 365d';
                duration = 'within 365 days';
            } else {
                points = 40;
                subtype = '> 365d';
                duration = 'after 365 days';
            }
            yield salesrepModule.addPoints(dealer.salesrepId, points, 'dealer-order-dispatch', subtype, 'Dealer Order dispatched ' + duration + ' of activation', { orderId: order._id});
        }
        yield email.send(carrierMail, Object.assign({ utils: _.pick(shippingPrice, ['getVehiclePrice', 'getTotalPrice', 'getTotalFee']) }, order), 'carrier/order-dispatched.html');
        return [order._id, carrier._id];
    }).then(dispatched => {
        res.send('Order has been dispatched to you');
        console.log(`Order # ${dispatched[0]} dispatched to Carrier # ${dispatched[1]} successfully`);
    }).catch(err => {
        res.status(400).send(err.toString());
        console.log(`Error in dispatching Order # ${req.params.orderId}`);
        console.log(err);
    });
};