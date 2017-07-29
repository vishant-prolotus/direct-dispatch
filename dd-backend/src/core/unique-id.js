"use strict";

const co = require('co');

exports.generate = function (collection) {
    return co(function* () {
        const record = yield global.db.collection('counters').findOneAndReplace({ _id: collection }, { $inc: { seq: 1 } }, { projection: { seq: 1 },upsert: true});
        return record.value.seq.toString();
    });
};