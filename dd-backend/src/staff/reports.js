"use strict";
var ObjectID = require('mongodb').ObjectID
const _ = require('lodash');
const co = require('co');
const moment = require('moment');

exports.getReport = function (req, res, next) {
     co(function* () { 
         global.db.collection('reports').find({ _id:ObjectID(req.params.id)}, { reports: true })
        .toArray(function (err, reports) {
            if (err)
                return res.status(400).send(err.toString());
            res.json(reports);
        });
    })
};

exports.AddCategory = function (req, res, next) {
     co(function* () { 
        let leadSourceIds = yield global.db.collection('reports').insert(
            {icon: req.body.icon, name:req.body.name,color:req.body.color,reports:[],Date:new Date()}
        );
        return leadSourceIds;
    }).then(response => {
        res.json(response);
    }).catch(err => {
        res.status(400).send(err.toString());
    });
};

exports.AddReport = function (req, res, next) {
     co(function* () { 
         console.log(req.body.id);
        let leadSourceIds = yield global.db.collection('reports')
        .update(
            {_id:ObjectID(req.body.id)},
            {
                $push: {
                reports: {"_id":ObjectID(),"icon": req.body.icon, "name":req.body.title,"color":req.body.description,"URL":req.body.URL}
                }
            }
        );
        return leadSourceIds;
    }).then(response => {
        res.json(response);
    }).catch(err => {
        res.status(400).send(err.toString());
    });
};

exports.EditCategory = function (req, res, next) {
     co(function* () { 
        let leadSourceIds = yield global.db.collection('reports')
        .update(
        { 
            "_id":ObjectID(req.body.category), 
        },
         { 
             $set :{ "icon":req.body.icon,"name":req.body.name}
        }
     );
        return leadSourceIds;
    }).then(response => {
        res.json(response);
    }).catch(err => {
        res.status(400).send(err.toString());
    });
};

exports.Category = function (req, res, next) {
     global.db.collection('reports').find({}, { name: true, icon: true, color: true },{"upsert":false})
        .sort({ Date: -1 } )
        .toArray(function (err, data) {
            if (err)
                return res.status(400).send(err.toString());
            res.json(data);
        });
};

exports.getMarketingIds = function (req, res, next) {
    co(function* () {        
        let leadSourceIds = yield global.db.collection('leads').distinct('marketing.sid');
        let orderSourceIds = yield global.db.collection('orders').distinct('marketing.sid');
        let leadCampaignIds = yield global.db.collection('leads').distinct('marketing.cid');
        let orderCampaignIds = yield global.db.collection('orders').distinct('marketing.cid');
        return { sourceIds: _.uniq(leadSourceIds.concat(orderSourceIds)).filter(id => id !== null), campaignIds: _.uniq(leadCampaignIds.concat(orderCampaignIds)).filter(id => id !== null) };
    }).then(ids => {
        res.json(ids);
    }).catch(err => {
        res.status(400).send(err.toString());
    });
};