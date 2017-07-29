"use strict";

const mongodb = require('mongodb');
const _ = require('lodash');
const express = require('express');
const co = require('co');
const body_parser = require('body-parser');
const moment = require('moment');
const CronJob = require('cron').CronJob;

const config = require('./config');
const emailModule = require('./core/email');
const shippingPrice = require('./core/shipping-price');

co(function*() {

    const db = yield mongodb.MongoClient.connect('mongodb://localhost/' + config.db);
    global.db = db;
    console.log('Connected to MongoDB database');

    // express app
    const app = express();
    app.enable('trust proxy');

    // middleware
    app.use(body_parser.json());

    // log for request
    app.use(function (req, res, next) {
        console.log(req.ip, new Date().toString(), req.method, req.url);
        next();
    });
    
    const leadEmails = [
        { file: 'lead1.html', subject: 'Save 30% on your next transport' },
        { file: 'lead2.html', subject: 'We have Truckers?' },
        { file: 'lead3.html', subject: 'TRACK YOUR VEHICLE!' },
        { file: 'lead4.html', subject: 'Stop talking to brokers' },
        { file: 'lead5.html', subject: 'Direct Dispatch Vs. Transport Brokers' },
        { file: 'lead6.html', subject: 'Don\'t be fooled by shipping brokers' }
    ];
    
    const jobs = [];
    
    function scheduleEmail(leadId, datetime, file) {
        if (!(datetime instanceof Date)) datetime = new Date(datetime);
        const job = new CronJob({
            cronTime: datetime,
            onTick: function() {
                co(function* () {
                    const leadEmail = leadEmails.find(val => val.file === file);
                    if (!leadEmail) throw 'Lead email config object not found';
                    const subject = leadEmail.subject;
                    const lead = yield global.db.collection('leads').findOne({ _id: leadId });
                    if (!lead) throw 'Lead not found';
                    const message = {
                        from: emailModule.addresses.sales,
                        to: lead.email,
                        subject: subject + ' #' + lead._id
                    };
                    yield emailModule.send(message, Object.assign({ utils: _.pick(shippingPrice, ['getVehiclePrice', 'getTotalPrice', 'packagePrices']) }, lead), 'shipper/' + file);
                    console.log('Email sent to lead #', leadId, file, subject, datetime);
                    yield global.db.collection('emailsSent').insertOne({ leadId: leadId, datetime: new Date(), file: file, subject: subject });
                    yield global.db.collection('emailsScheduled').deleteOne({ leadId: leadId, datetime: datetime, file: file });
                }).catch(err => {
                    console.error('Email scheduled execution failed', err.toString());
                });
            }
        });
        job.start();
        jobs.push({ leadId: leadId, datetime: datetime, file: file, job:job });
        console.log('Email scheduled for lead #', leadId, file, datetime);
    }
    
    function scheduleEmails(emailsScheduled) {
        emailsScheduled.forEach(emailScheduled => {
           scheduleEmail(emailScheduled.leadId, emailScheduled.datetime, emailScheduled.file);
        });
    }
    
    // start jobs scheduled from db if any 
    co(function*() {
        const emailsScheduled = yield global.db.collection('emailsScheduled').find().toArray();
        if (emailsScheduled && emailsScheduled.length > 0) {
            scheduleEmails(emailsScheduled);
        }
    });
    

    // schedule emails for lead
    app.get('/schedule/:leadId', function (req, res, next) {
        co(function*() {
            const lead = yield global.db.collection('leads').findOne({ _id: req.params.leadId }, { _id: 1 });
            if (!lead) throw 'Lead not found';
            const date = moment();
            const emailsScheduled = leadEmails.map(leadEmail => {
                return { leadId: lead._id, datetime: date.add(12, 'hours').clone().toDate(), file: leadEmail.file };
            });
            yield global.db.collection('emailsScheduled').insertMany(emailsScheduled);
            scheduleEmails(emailsScheduled);
        }).then(done => {
            res.send('Email scheduled successfully');
        }).catch(err => {
            res.status(400).send(err.toString()); 
        });
    });
    
    // cancel emails for lead
    app.get('/cancel/:leadId', function (req, res, next) {
        co(function*() {
            const leadJobs = jobs.filter(job => job.leadId === req.params.leadId);
            leadJobs.forEach(job => {
                job.job.stop();
                console.log('Email canceled for lead #', job.leadId, job.file, job.datetime);
            });
            yield global.db.collection('emailsScheduled').deleteMany({ leadId: req.params.leadId });
        }).then(done => {
            res.send('Emails scheduled canceled now');
        }).catch(err => {
            res.status(400).send(err.toString()); 
        });
    });
    
    app.listen(config.services.emailScheduling, function () {
        console.info('Email scheduling service listening at port ' + config.services.emailScheduling);
        console.info('Running in ' + (process.argv[2] === '--production' ? 'Production' : 'Development') + ' Mode');
    });

});
