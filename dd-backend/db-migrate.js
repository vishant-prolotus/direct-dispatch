"use strict";

const mongo = require('mongodb').MongoClient;
const _ = require('lodash');
const co = require('co');

const dbUrl = 'mongodb://127.0.0.1:27017/direct-dispatch';

// remove field 'offeredTo' from carrier objects;
// remove field 'carrier' from orders;
// requestedFrom: {carrierId: req.user.id, pickupDate: req.body.pickupDate, deliveryDate: req.body.deliveryDate}

co(function* () {
    const db = yield mongo.connect(dbUrl);
    const query = { created: { $gte: new Date(2016, 6) }};
    const ordersCount = {};
    console.log(yield db.collection('orders').find(query, { source: 1 }).toArray()); 
    console.log('Total Orders:', yield db.collection('orders').count(query, { source: 1 })); 
    ordersCount.organic = yield db.collection('orders').count(Object.assign({ $or: [ {source: null }, { source: { $exists: false } }] }, query));
    ordersCount.ppc = yield db.collection('orders').count(Object.assign({ $and: [{ source: { $exists: true }}, {source: { $ne: null}}] }, query));
    ordersCount.dealers = yield db.collection('orders').count(Object.assign({ dealerId: { $exists: true }}, query));
    console.log(ordersCount);
}).then(done => {
    console.log('Executed successfully');
}).catch(err => {
    console.log('Error', err);
});