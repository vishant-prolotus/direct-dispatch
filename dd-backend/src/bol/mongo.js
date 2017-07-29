'use strict';

const mongoose = require('mongoose');
const autoIncrement = require('mongoose-auto-increment');

// Since mongoose promise has been deprecated
mongoose.Promise = global.Promise;

// Uncomment below to run mongoose in debug mode
// mongoose.set('debug', true);

// Local includes
let config = require('../config');

class Mongo {
    constructor() {
        this._dbURL = 'mongodb://localhost/' + config.db;
        this._conn = null;
        this._initializedOnce = false;
    }
}

Mongo.prototype.init = function () {
    const self = this;

    console.log({
        msg: 'Mongo.init:: Start initialization'
    });

   return new Promise((resolve, reject) => {
       // We do not want to create multiple mongoose connection for each service. If any one of the service has initialized
       // the connection then use the same one.
       if (self._initializedOnce) {
           resolve();
           return;
       } else {
           self._initializedOnce = true;
       }
       const options = {
           server : {
               // auto connect if we do get disconnected
               auto_reconnect  : true,
               socketOptions   : {
                   // keep the connection alive
                   keepAlive       : 120,
                   // certain aggregation queries take a long time, we want to keep the socket alive
                   socketTimeoutMS : 1000 * 60 * 60
               },
               reconnectTries  : Number.MAX_VALUE
           },
           replset : {
               socketOptions : {
                   keepAlive       : 120,
                   socketTimeoutMS : 1000 * 60 * 60
               }
           }
       };
       this._conn = mongoose.createConnection(this._dbURL, options);

       this._conn.on('error', (err) => {
           console.log({
               msg: 'Mongo.init:: Error occurred in initialization',
               err: err
           });
           reject(err);
       });

       this._conn.on('open', () => {
           self._initializeAutoIncrement();
           console.log({
               msg: 'Mongo.init:: connected to mongo db'
           });
           resolve();
       });
   });
};

Mongo.prototype._initializeAutoIncrement = function () {
    autoIncrement.initialize(this._conn);
};

Mongo.prototype.addAutoIncrementPlugin = function (schema, modelName) {
    schema.plugin(autoIncrement.plugin, modelName);
};

Mongo.prototype.getModel = function (modelName, schema, collectionName) {
    modelName = modelName || '';
    schema = schema || new mongoose.Schema({});
    return this._conn.model(modelName, schema, collectionName);
};

module.exports = Mongo;