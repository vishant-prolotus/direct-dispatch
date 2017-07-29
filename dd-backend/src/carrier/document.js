'use strict';
var ObjectID = require('mongodb').ObjectID;
const co = require('co');

exports.listDocs = function(req, res, next) {
    global.db.collection('carrier-docs').find({ carrierId: req.user.id }, { _id: false, docName: true }).toArray(function(err, docs) {
        if (err) return res.status(400).send(err.toString());
        let results = {};
        docs.forEach(doc => results[doc.docName] = true);
        res.json(results);
    });
};

exports.uploadDoc = function(req, res, next) {
    try {
        req.pipe(req.busboy);
        req.busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
            if (mimetype !== 'application/pdf') throw 'Only PDF file is allowed';
            let chunks = [];
            file.on('data', function(chunk) {
                chunks.push(chunk);
            });
            file.on('end', function() {
                const mongo = require('mongodb');
                const fileData = Buffer.concat(chunks);
                let carrierDoc = { filename: filename, mimetype: mimetype, contents: new mongo.Binary(fileData) };
                co(function*() {
                    const doc = yield global.db.collection('carrier-docs').findOne({ carrierId: req.user.id, docName: req.params.doc }, { _id: true });
                    if (!doc) {
                        carrierDoc.carrierId = req.user.id;
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

exports.getDoc = function(req, res, next) {
    global.db.collection('carrier-docs').findOne({ carrierId: req.user.id, docName: req.params.doc }, function(err, doc) {
        if (err) return res.status(400).send(err.toString());
        res.type('text/plain;base64');
        res.write(doc.contents.buffer.toString('base64'));
        res.end();
    });
};

exports.deleteDoc = function(req, res, next) {
    global.db.collection('carrier-docs').removeOne({ carrierId: req.user.id, docName: req.params.doc }, function(err, removed) {
        if (err) return res.status(400).send(err.toString());
        res.send('Document deleted');
    });
};