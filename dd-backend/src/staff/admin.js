"use strict";

const co = require('co');
const sha1 = require('sha1');

const email = require('../core/email');
const carrierModule = require('../carrier/carrier');
const dealerAccount = require('../dealer/account');
const truckCrud = require('../carrier/truck.js').crud;
const uniqueId = require('../core/unique-id');
const shippingPrice = require('../core/shipping-price');

exports.insertCarrier = function (req, res, next) {
    let carrier;
    co(function* () {
        const input = req.body;
        carrier = yield carrierModule.insertCarrier(input);
        yield carrierModule.sendWelcomeEmai(carrier);
        return carrier;
    }).then(carrier => {
        res.send('Carrier account created');
    }).catch(error => {
        if (carrier) global.db.collection('carriers').removeOne({ _id: carrier._id });
        res.status(400).send(error.toString());
    });
};

exports.listCarriers = function (req, res, next) {
    co(function* () {
        const query = {};
        if (req.query.searchBy) {
            query[req.query.searchBy] = new RegExp(req.query.searchQuery, 'i');
        }
        const options = {
            sortBy: req.query.sortBy || '_id',
            sortOrder: Number(req.query.sortOrder) || 1,
            skip: Number(req.query.skip) || 0,
            limit: Number(req.query.limit) || 100
        };
        const sortBy = {};
        sortBy[options.sortBy] = options.sortOrder;
        const carriers = yield global.db.collection('carriers').find(query, { created: true, company: true, name: true, email: true, phone: true, mc: true, dot: true, activated: true })
            .sort(sortBy).skip(options.skip).limit(options.limit).toArray();
        const count = yield global.db.collection('carriers').find(query, { _id: true }).count();
        return { total: count, items: carriers };
    }).catch(err => {
        res.status(400).send(err.toString());
    }).then(result => {
        res.json(result);
    });
};

exports.deleteCarrier = function (req, res, next) {
    global.db.collection('carriers').removeOne({ _id: req.params.id }, function (err, deleted) {
        if (err)
            return res.status(400).send(err.toString());
        res.send("Carrier deleted");
    });
};

exports.carrierOverview = function (req, res, next) {
    global.db.collection('carriers').findOne({ _id: req.params.id }, { created: true, activated: true, activationLinkSent: true, lastLogin: true },
        function (err, carrier) {
            if (err)
                return res.status(400).send(err.toString());
            res.json(carrier);
        });
};

exports.carrierUser = function (req, res, next) {
    global.db.collection('carriers').findOne({ _id: req.params.id }, { email: true }, function (err, carrier) {
        if (err)
            return res.status(400).send(err.toString());
        res.json(carrier);
    });
};

exports.carrierCompany = function (req, res, next) {
    global.db.collection('carriers').findOne({ _id: req.params.id },
        { name: true, company: true, address: true, location: true, phone: true, website: true, mc: true, dot: true, insuranceExpiration: true, smsNumber: true },
        function (err, carrier) {
            if (err)
                return res.status(400).send(err.toString());
            res.json(carrier);
        });
};

exports.carrierCompanyEdit = function (req, res, next) {
    delete req.body._id;
    const carrier = req.body;
    global.db.collection('carriers').updateOne({ _id: req.params.id },
        { $set: { name: carrier.name, company: carrier.company, address: carrier.address, location: carrier.location, phone: carrier.phone, website: carrier.website, mc: carrier.mc, dot: carrier.dot, insuranceExpiration: carrier.insuranceExpiration, smsNumber: carrier.smsNumber } },
        function (err, updated) {
            if (err)
                return res.status(400).send(err.toString());
            res.send("Company information updated");
        });
};

exports.carrierDocs = function (req, res, next) {
    global.db.collection('carrier-docs').find({ carrierId: req.params.id }, { _id: false, docName: true }).toArray(function (err, docs) {
        if (err)
            return res.status(400).send(err.toString());
        const results = {};
        docs.forEach(function (doc) {
            results[doc.docName] = true;
        });
        res.json(results);
    });
};

exports.carrierUploadDoc = function (req, res, next) {
    try {
        req.pipe(req.busboy);
        req.busboy.on('file', function (fieldname, file, filename, encoding, mimetype) {
            if (mimetype !== 'application/pdf') throw 'Only PDF file is allowed';
            let chunks = [];
            file.on('data', function (chunk) {
                chunks.push(chunk);
            });
            file.on('end', function () {
                const mongo = require('mongodb');
                const fileData = Buffer.concat(chunks);
                const carrierDoc = { filename: filename, mimetype: mimetype, contents: new mongo.Binary(fileData) };
                co(function* () {
                    const doc = yield global.db.collection('carrier-docs').findOne({ carrierId: req.params.id, docName: req.params.doc }, { _id: true });
                    if (!doc) {
                        carrierDoc.carrierId = req.params.id;
                        carrierDoc.docName = req.params.doc;
                        yield global.db.collection('carrier-docs').insertOne(carrierDoc);
                    } else {
                        yield global.db.collection('carrier-docs').updateOne({ _id: new mongo.ObjectID(doc._id) }, { $set: carrierDoc });
                    }
                    res.send('Uploaded successfully');
                });
            });
        });
    } catch (error) {
        res.status(400).send(error.toString());
    }
};

exports.carrierGetDoc = function (req, res, next) {
    global.db.collection('carrier-docs').findOne({ carrierId: req.params.id, docName: req.params.doc }, function (err, doc) {
        if (err)
            return res.status(400).send(err.toString());
        res.type('text/plain;base64');
        res.write(doc.contents.buffer.toString('base64'));
        res.end();
    });
};

exports.carrierDeleteDoc = function (req, res, next) {
    global.db.collection('carrier-docs').removeOne({ carrierId: req.params.id, docName: req.params.doc }, function (err, removed) {
        if (err)
            return res.status(400).send(err.toString());
        res.send('Document deleted');
    });
};

exports.carrierBilling = function (req, res, next) {
    global.db.collection('carriers').findOne({ _id: req.params.id }, { company: true }, function (err, carrier) {
        if (err)
            return res.status(400).send(err.toString());
        res.json(carrier);
    });
};

exports.sendActivationLink = function (req, res, next) {
    co(function* () {
        const carrier = yield global.db.collection('carriers').findOne({ _id: carrierId }, { company: true, email: true, activationToken: true });
        if (!carrier) throw 'Carrier not found';
        yield carrierModule.sendWelcomeEmail(carrier);
    }).catch(err => {
        res.status(400).send(err.toString());
    }).then(done => {
        res.send('Activation link emailed successfully');
    });
};

exports.insertDealer = function (req, res, next) {
    let dealer;
    co(function* () {
        const input = req.body;
        if (req.user.type === 'staff' && req.user.role === 'salesrep') {
            input.salesrepId = req.user.id;
        }
        dealer = yield dealerAccount.insertDealer(input);
        yield dealerAccount.sendWelcomeEmail(dealer);
        // add salesrep points

        // if (dealer.salesrepId) {
        //     const salesrepDealers = yield global.db.collection('dealers').find({ salesrepId: dealer.salesrepId }, { _id: 1, created: 1 });
        //     for (const salesrepDealer of salesrepDealers) {
        //         salesrepDealer.dispatchCount = yield global.db.collection('orders').count({ dealerId: salesrepDealer_id, status: 'Dispatched'});
        //     }
        //     let points = null;
        //     let subtype = null;
        //     let duration = null;
        //     if (salesrepDealers.filter(d => d.)) {
        //         points = 120;
        //         subtype = '<= 24h';
        //         duration = 'within 24 hours';
        //     } else if (days <= 7) {
        //         points = 100;
        //         subtype = '<= 7d';
        //         duration = 'within 7 days';
        //     } else if (days <= 60) {
        //         points = 80;
        //         subtype = '<= 60d';
        //         duration = 'within 60 days';
        //     } else if (days <= 180) {
        //         points = 60;
        //         subtype = '<= 180d';
        //         duration = 'within 180 days';
        //     } else if (days <= 365) {
        //         points = 30;
        //         subtype = '<= 365d';
        //         duration = 'within 365 days';
        //     } else {
        //         points = 10;
        //         subtype = '> 365d';
        //         duration = 'after 365 days';
        //     }
        //     yield salesrepModule.addPoints(dealer.salesrepId, points, 'dealer-order', subtype, 'Dealer booked Order ' + duration + ' of activation', { orderId: order._id});
        // }
        
        return dealer;
    }).then(dealer => {
        res.send('Dealer account created');
    }).catch(error => {
        if (dealer) global.db.collection('dealers').removeOne({ _id: dealer._id });
        res.status(400).send(error.toString());
    });
};


exports.listDealers = function (req, res, next) {
    co(function* () {
        const query = {};
        if (req.user.type === 'staff' && req.user.role === 'salesrep') {
            query['salesrepId'] = req.user.id;
        }
        if (req.query.searchBy) {
            query[req.query.searchBy] = new RegExp(req.query.searchQuery, 'i');
        }
        const options = {
            sortBy: req.query.sortBy || '_id',
            sortOrder: Number(req.query.sortOrder) || 1,
            skip: Number(req.query.skip) || 0,
            limit: Number(req.query.limit) || 100
        };
        const sortBy = {};
        sortBy[options.sortBy] = options.sortOrder;
        const dealers = yield global.db.collection('dealers').find(query, { created: true, company: true, name: true, email: true, phone: true, activated: true, salesrepId: true })
            .sort(sortBy).skip(options.skip).limit(options.limit).toArray();
        const count = yield global.db.collection('dealers').find(query, { _id: true }).count();
        for (const dealer of dealers) {
            if (dealer.salesrepId) {
                const salesrep = yield global.db.collection('staff').findOne({ _id: dealer.salesrepId }, { name: true });
                dealer.salesrepName = salesrep.name;
            }
        }
        return { total: count, items: dealers };
    }).catch(err => {
        res.status(400).send(err.toString());
    }).then(result => {
        res.json(result);
    });
};

exports.listSalesreps = function (req, res, next) {
    global.db.collection('staff').find({ type: 'salesrep' }, { name: true, email: true, phone: true, slots: true, enabled: true, created: true })
        .toArray(function (err, salesreps) {
            if (err)
                return res.status(400).send(err.toString());
            res.json(salesreps);
        });
};

exports.getSalesrep = function (req, res, next) {
    global.db.collection('staff').findOne({ _id: req.params.id, type: 'salesrep' },
        { _id: true, name: true, email: true, phone: true, slots: true, created: true, enabled: true, activationLinkSent: true, lastLogin: true },
        function (err, salesrep) {
            if (err)
                return res.status(400).send(err.toString());
            res.json(salesrep);
        });
};

exports.insertSalesrep = function (req, res, next) {
    co(function* () {
        const exist = yield global.db.collection('staff').findOne({ email: req.body.email }, { _id: true });
        if (exist) throw 'Email already registered with user';
        const salesrep = req.body;
        salesrep._id = yield uniqueId.generate('staff');
        salesrep.type = 'salesrep';
        salesrep.count = 0;
        salesrep.created = new Date();
        salesrep.pwhash = sha1(salesrep.password);
        const message = {
            from: email.addresses.noReply,
            to: salesrep.email,
            subject: 'Welcome to Direct Dispatch Staff Portal'
        };
        yield email.sendText(message, { name: salesrep.name, role: 'Sales Rep', email: salesrep.email, password: salesrep.password }, 'staff/welcome.txt');
        delete salesrep.password;
        yield global.db.collection('staff').insertOne(salesrep);
    }).catch(err => {
        res.status(400).send(err.toString());
    }).then(done => {
        res.send("Sales Rep Inserted");
    });
};

exports.updateSalesrep = function (req, res, next) {
    co(function* () {
        const exist = yield global.db.collection('staff').findOne({ _id: { $ne: req.params.id }, email: req.body.email }, { _id: true });
        if (exist) throw 'Email already registered with user';
        const salesrep = req.body;
        delete salesrep._id;
        if (salesrep.password) {
            salesrep.pwhash = sha1(salesrep.password);
            delete salesrep.password;
        }
        yield global.db.collection('staff').updateOne({ _id: req.params.id }, { $set: salesrep });
    }).catch(err => {
        res.status(400).send(err.toString());
    }).then(done => {
        res.send("Sales Rep Updated");
    });
};

exports.deleteSalesrep = function (req, res, next) {
    global.db.collection('staff').removeOne({ _id: req.params.id, type: 'salesrep' }, function (err, deleted) {
        if (err)
            return res.status(400).send(err.toString());
        res.send("Sales Rep deleted");
    });
};

exports.carrierChangeEmail = function (req, res, next) {
    const input = { email: req.body.new };
    global.db.collection('carriers').updateOne({ _id: req.params.id }, { $set: { email: input.email } }, function (err, updated) {
        if (err)
            return res.status(400).send(err.toString());
        res.send('Email changed successfully');
    });
};

exports.carrierChangePassword = function (req, res, next) {
    co(function* () {
        const pass = req.body;
        if (pass['new'] < 8) throw 'New password should be atleast 8 characters long';
        if (pass['new'] !== pass.new2) throw 'New password and Confirm password doesn\'t match';
        yield global.db.collection('carriers').updateOne({ _id: req.params.id }, { $set: { pwhash: sha1(pass['new']) } });
    }).catch(err => {
        res.status(400).send(err.toString());
    }).then(done => {
        res.send('Password changed successfully');
    });
};