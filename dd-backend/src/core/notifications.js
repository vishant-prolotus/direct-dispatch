"use strict";

const jwt = require('jsonwebtoken');
const co = require('co');
const promisify = require('bluebird').promisify;
const ObjectID = require('mongodb').ObjectID;

module.exports = function (userType) {

    if (['carrier', 'staff', 'dealer'].indexOf(userType) === -1) {
        throw Error('Invalid user type');
    }
    
    let collName, notificationsName;
    
    if (userType === 'staff') {
        collName = 'staff';
        notificationsName = 'staffNotifications';
    } else if (userType === 'carrier') {
        collName = 'carriers';
        notificationsName = 'carrierNotifications';
    } else if (userType === 'dealer') {
        collName = 'dealers';
        notificationsName = 'dealerNotifications';
    }

    return {
        auth: function (req, res, next) {
            jwt.verify(req.params.token, require('../config').jwtkey, function (err, user) {
                if (err)
                    return res.status(401).send();
                req.user = user;
                next();
            });
        },
        subscribe: function (req, res, next) {

            let id;
            if (userType === 'staff') {
                id = req.user.role + '.' + req.user.id;
            } else if (userType === 'carrier') {
                id = 'carrier' + '.' + req.user.id;
            } else if (userType === 'dealer') {
                id = 'dealer' + '.' + req.user.id;
            }
            console.log('Notifications turned on for ' + userType + ' # ' + id);
            req.socket.setTimeout(0x7FFFFFFF);
            res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
            });
            if(userType == 'staff'){
                    global.db.collection('leads').aggregate([
                    { $sort: { "created": -1 } },
                    { $limit : 1 }]).next(function(err, data){ 
                if (err) return self.emit("error", "collection not found");

                var current = data.created;

                if(global.latest==null){
                    global.latest = current;
                }else{
                    if((current - global.latest)>60e3 || (current - global.latest)>1e3) 
                    {
                        global.latest = current;
                        var msg="new leads gets registered";
                        res.write('data: ' + JSON.stringify(msg) + '\n\n');
                    }
                }
            });

        }
        else if(userType == 'carrier' || userType == 'dealer'){
            global.db.collection('orders').aggregate([
                    { $sort: { "created": -1 } },
                    { $limit : 1 }]).next(function(err, data){ 
                if (err) return self.emit("error", "collection not found");

                var current = data.created;
                if(global.latest==null){
                    global.latest = current;
                }else{
                    if((current - global.latest)>60e3 || (current - global.latest)>1e3) 
                    {
                        global.latest = current;
                        console.log('new registered');
                        var msg="new order gets placed";
                        res.write('data: ' + JSON.stringify(msg) + '\n\n');
                    }
                }
            });

        }
        
        setInterval(function() {
                    res.end();
                }, 5000);

            const listener = function (msg) {
                res.write('data: ' + JSON.stringify(msg) + '\n\n');
            };

            global[notificationsName].on(id, listener);

            req.on('close', function () {
                console.log('Notifications turned off for ' + userType + ' # ' + id);
                global[notificationsName].removeListener(id, listener);
            });
        },
        emit: function (user, notification) {
            const target = user.role + '.' + (user.id ? user.id : '*');
            notification.id = new ObjectID();
            notification.datetime = new Date();
            notification.read = false;
            global[notificationsName].emit(target, notification);
            // insert to db
            const query = {},
                options = {};
            if (userType === 'staff') {
                query.type = user.role;
            }
            if (user.id)
                query._id = user.id;
            else
                options.multi = true;

            global.db.collection(collName).update(query, {$push: {notifications: notification}}, options, function (err, updated) { });
        },
        list: function (req, res, next) {
            co(function* () {
                const output = { unread: null, total: null, items: null };
                const skip = req.query.skip ? Number(req.query.skip) : 0;
                const limit = req.query.limit ? Number(req.query.limit) : 25;
                const aggregate = promisify(global.db.collection(collName).aggregate, { context: global.db.collection(collName) });
                const records = yield aggregate(
                                        { $match: { _id : req.user.id }},
                                        { $project: { notifications: 1, _id: 0 } },
                                        { $unwind: '$notifications' },
                                        { $sort: { 'notifications.datetime': -1 }},
                                        { $skip: skip },
                                        { $limit: limit });
                 output.items = records.map(rec => rec.notifications);
                 let result = yield aggregate(
                                        { $match: { _id: req.user.id } },
                                        { $unwind: '$notifications' },
                                        { $match: { 'notifications.read': false } },
                                        { $group: { _id: null, count: { $sum: 1 }} });
                 output.unread = result.length ? result[0].count : 0;
                 result = yield aggregate(
                        { $match: { _id: req.user.id } },
                        { $unwind: '$notifications' },
                        { $group: { _id: null, count: { $sum: 1 }} });
                  output.total = result.length ? result[0].count : 0;
                  return output;
                                                        
            }).then(result => {
                res.json(result);
            }).catch(err => {
                console.log(err);
                res.status(400).send(err.toString());
            });
        },
        read: function (req, res, next) {
            const id = ObjectID(req.params.id);
            global.db.collection(collName).updateOne({_id: req.user.id, 'notifications.id': id}, {$set: {'notifications.$.read': true}}, function (err, updated) {
                if (err)
                    return res.status(400).send(err.toString());
                res.send('Makred as read');
            });
        },
        del: function (req, res, next) {
            const id = ObjectID(req.params.id);
            global.db.collection(collName).updateOne({_id: req.user.id}, {$pull: {notifications: {id: id}}}, function (err, updated) {
                if (err)
                    return res.status(400).send(err.toString());
                res.send('Notification deleted');
            });
        }
    };
};