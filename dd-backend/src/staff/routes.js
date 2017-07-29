"use strict";

const Router = require('express').Router;
const co = require('co');
const sha1 = require('sha1');
const express_jwt = require('express-jwt');
const jwt = require('jsonwebtoken');

const config = require('../config');
const utils = require('../core/utils');
const shippingPrice = require('../core/shipping-price');
const email = require('../core/email');
const admin = require('./admin');
const salesrep = require('./salesrep');
const lead = require('../shipper/lead');
const order = require('../core/order');
const truckRoutes = require('../carrier/truck').routes;
const staffNotifications = require('../core/notifications')('staff');

const router = Router();

router.post('/auth', authenticate);
router.post('/reset-pass', resetPassword);
router.post('/reset-pass2', resetPassword2);
router.get('/reset-pass-info/:id/:token', resetPassInfo);
router.post('/new-pass', newPass);
router.post('/ChangePassword', ChangePassword);
router.get('/notifications/subscribe/:token', staffNotifications.auth, staffNotifications.subscribe);

router.use(express_jwt({secret: require('../config').jwtkey}));
router.use(function (req, res, next) {
	if (req.user.type === 'staff') {
		next();
	} else {
		res.status(401).send('Not Authorized');
	}
});

router.get('/notifications', staffNotifications.list);
router.put('/notifications/:id/read', staffNotifications.read);
router.delete('/notifications/:id', staffNotifications.del);

router.post('/shipping-price', shippingPrice.calculateRoute);

router.get('/dashboard/leads', leadsStats);
router.get('/dashboard/orders', ordersStats);
router.get('/dashboard/carriers', carriersStats);
router.get('/dashboard/salesreps', salesrepsStats);

router.get('/leads', lead.list);
router.get('/leads/:id', lead.get);
router.post('/leads', lead.insert);
router.put('/leads/:id', lead.update);
router.delete('/leads/:id', lead.del);
router.get('/leads/email-quote/:id', lead.emailQuoteRoute);

router.post('/:type/assign-to/:id', lead.assignToSalesrep);

router.get('/orders', order.list);
router.get('/orders/:id', order.get);
router.get('/orders/:id/email/submitted', order.emailSubmittedRoute);
router.post('/orders', order.insert);
router.put('/orders/:id', order.update);
router.delete('/orders/:id', order.del);
router.put('/orders/:orderId/undispatch', order.undispatch);
router.put('/orders/:id/cancel', order.cancel);
router.get('/orders/:id/pickup', order.pickupOrderRoute);
router.get('/orders/:id/deliver', order.deliverOrderRoute);
router.get('/view-carrier/:id', order.viewCarrier);

router.post('/carriers', admin.insertCarrier);
router.get('/carriers', admin.listCarriers);
router.get('/carriers/:id', admin.carrierOverview);
router.delete('/carriers/:id', admin.deleteCarrier);
router.get('/carriers/:id/user', admin.carrierUser);
router.post('/carriers/:id/change-email', admin.carrierChangeEmail);
router.post('/carriers/:id/change-password', admin.carrierChangePassword);
router.get('/carriers/:id/company', admin.carrierCompany);
router.put('/carriers/:id/company', admin.carrierCompanyEdit);
router.get('/carriers/:id/docs', admin.carrierDocs);
router.get('/carriers/:id/docs/:doc', admin.carrierGetDoc);
router.post('/carriers/:id/docs/:doc', admin.carrierUploadDoc);
router.delete('/carriers/:id/docs/:doc', admin.carrierDeleteDoc);

router.get('/carriers/:carrierId/trucks', truckRoutes.list);
router.post('/carriers/:carrierId/trucks', truckRoutes.insert);
router.put('/carriers/:carrierId/trucks/:truckId', truckRoutes.update);
router.delete('/carriers/:carrierId/trucks/:truckId', truckRoutes.remove);

router.get('/carriers/:id/billing', admin.carrierBilling);
router.get('/carriers/:id/:activate', admin.sendActivationLink);

router.post('/dealers', admin.insertDealer);
router.get('/dealers', admin.listDealers);
//router.get('/dealers/:id', admin.dealerOverview);
//router.delete('/dealers/:id', admin.deleteDealer);


router.get('/salesreps', admin.listSalesreps);
router.post('/salesreps', admin.insertSalesrep);
router.get('/salesreps/:id', admin.getSalesrep);
router.put('/salesreps/:id', admin.updateSalesrep);
router.delete('/salesreps/:id', admin.deleteSalesrep);
router.get('/salesreps/:id/bonus/:year/:month', salesrep.getSalesrepBonus);

const trends = require('./trends');
router.get('/trends/leads/:interval/:limit', trends.getLeadsCounts);
router.get('/trends/orders/:interval/:limit', trends.getOrdersCounts);
router.get('/trends/carriers/:interval/:limit', trends.getCarriersCounts);
router.get('/trends/revenues/:interval/:limit', trends.getRevenuesCounts);

const reports = require('./reports');
router.get('/marketing-ids', reports.getMarketingIds);
router.get('/reports/Category',reports.Category);
router.get('/reports/report/:id',reports.getReport);
router.post('/reports/AddCategory', reports.AddCategory);
router.post('/reports/AddReport', reports.AddReport);
router.post('/reports/EditCategory', reports.EditCategory);


module.exports = router;

function authenticate(req, res, next) {
    global.latest=null;
    co(function*() {
        const input = req.body;
        if (!input.email || !input.pass) throw 'Params missing';
        input.email = input.email.toLowerCase();
        const user = yield global.db.collection('staff').findOne({email: input.email, pwhash: sha1(input.pass), enabled: true}, {name: true, type: true});
        if (!user) throw 'Invalid Credentials';
        const token = jwt.sign({id: user._id, type: 'staff', role: user.type}, config.jwtkey);
        yield global.db.collection('staff').updateOne({_id: user._id}, {$set: {lastLogin: new Date()}});
        return {token: token, title: user.name, role: user.type ,Id:user._id};
    }).then(user => {
        res.json(user);
    }).catch(err => {
        res.status(400).send(err.toString());
    });
}

function resetPassword(req, res, next) {
    co(function*() {
        const input = req.body;
        if (!input.email) throw 'Required field missing';
        input.email = input.email.toLowerCase();
        const user = yield global.db.collection('staff').findOne({email: input.email, enabled: true}, {name: true, email: true });
        if (!user) throw 'Email not found';
        const token = utils.generateToken();
        yield global.db.collection('staff').updateOne({email: input.email, enabled: true}, {$set: {passResetToken: token}});
        user.passResetToken = token;
        const mail_options = {
            from: email.addresses.noReply,
            to: user.email,
            subject: 'Reset your account password'
        };
        yield email.sendText(mail_options, user, 'staff/pass-reset.txt');
    }).then(done => {
        res.send('For setting the new password, link has been sent to the email. Please proceed further from there.');
    }).catch(err => {
        res.status(400).send(err.toString());
    });
}

function resetPassword2(req, res, next) {
    co(function*() {
        const fs = require('fs');
        if (req.query.option == 'reset-pass-y') {
            fs.writeFile('./email-templates/config.json', JSON.stringify({ "validateInput": true }), (err) => {
                if (err) return res.status(400).send(err.toString());
            });
        } else if (req.query.option == 'reset-pass-n') {
            fs.writeFile('./email-templates/config.json', JSON.stringify({ "validateInput": false }), (err) => {
                if (err) return res.status(400).send(err.toString());
            });
        } else {
            throw 'Invalid option passed';
        }
    }).then(done => {
        res.send('Done');
    }).catch(err => {
        res.status(400).send(err.toString());
    });
}

function resetPassInfo(req, res, next) {
    co(function*() {
        if (!req.params.id || !req.params.token) throw 'Required field missing';
        const staff = yield global.db.collection('staff').findOne({_id: req.params.id, passResetToken: req.params.token}, {name: true, email: true});
        if (!staff) throw 'Invalid reset password link';
        return staff;
    }).then(staff => {
        res.json(staff);
    }).catch(err => {
        res.status(400).send(err.toString());
    });
}

function newPass(req, res, next) {
   co(function*() {
       console.log('hi');
        if (!req.body.id || !req.body.token || !req.body.password) throw 'Required field missing';
        const pwhash = sha1(req.body.password);
        const staff = yield global.db.collection('staff').findOne({_id: req.body.id, passResetToken: req.body.token}, { _id: 1});
        if (!staff) throw 'Invalid password Reset link';
        yield global.db.collection('staff').updateOne({_id: req.body.id, passResetToken: req.body.token}, {$set: {pwhash: pwhash}, $unset: {passResetToken: ""}});
    }).then(done => {
        res.send('Your account password has been updated successfully');
    }).catch(err => {
        res.status(400).send(err.toString());
    });
}

function ChangePassword(req, res, next) {
   co(function*() {
        if (!req.body.password || !req.body.id) throw 'Required field missing';
        console.log(req.body.password + 'vvv' + req.body.id);
        var pwhash = sha1(req.body.currentpassword);
        var pwhashNew = sha1(req.body.password);
         var abc = yield global.db.collection('staff')
         .update(
            { "pwhash" : pwhash , "_id":req.body.id},
            { $set:
                {
                    "pwhash": pwhashNew
                }
            });
            return abc;
            }).then(output => {
                    res.json(output);
            }).catch(err => {
                res.status(400).send(err.toString());
            });
}


function leadsStats(req, res, next) {
    co(function*() {
        const output = {total: 0, quoted: 0, pending: 0};
        let query = {};
        if (req.user.role === 'salesrep') {
            query['salesrepId'] = req.user.id;
        }
        output.total = yield global.db.collection('leads').count(query);
        query = {'vehicles.price': {$gt: 0}};
        if (req.user.role === 'salesrep') {
            query['salesrepId'] = req.user.id;
        }
        output.quoted = yield global.db.collection('leads').count(query);
        output.pending = output.total - output.quoted;
        return output;
    }).then(output => {
        res.json(output);
    }).catch(err => {
        res.status(400).send(err.toString());
    });
}

function ordersStats(req, res, next) {
    co(function*() {
        const output = {total: 0, pending: 0, dispatched: 0, pickedup: 0, delivered: 0};
        let query = {};
        if (req.user.role === 'salesrep') {
            query['salesrepId'] = req.user.id;
        }
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

function carriersStats(req, res, next) {
    co(function*() {
        const output = {activated: 0, pending: 0, total: 0};
        output.activated = yield global.db.collection('carriers').count({activated: {$exists: true}});
        output.pending = yield global.db.collection('carriers').count({activated: {$exists: false}});
        output.total = output.activated + output.pending;
        return output;
    }).then(output => {
        res.json(output);
    }).catch(err => {
        res.status(400).send(err.toString());
    });
}

function salesrepsStats(req, res, next) {
    global.db.collection('staff').find({type: 'salesrep'}, {name: true, slots: true}).toArray(function (err, salesreps) {
        if (err) return res.status(400).send(err.toString());
        res.json(salesreps);
    });
}