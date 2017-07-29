var _ = require('../node_modules/lodash');
var csv = require('../node_modules/csv-parse');
var fs = require('fs');

fs.readFile('./zip-codes.csv', function (err, data) {
    if (err)
        return console.log(err);
    csv(data, {columns: true}, function (err, records) {
        if (err)
            return console.log(err);
        records.forEach(function (record) {
            record.latitude = Number(record.latitude);
            record.longitude = Number(record.longitude);
        });
        var groups = _.groupBy(records, function (record, index) {
                return Math.floor(index/1000);
        });
        require('../node_modules/mongodb').MongoClient.connect('mongodb://127.0.0.1:27017/direct-dispatch', function (err, db) {
            _.each(groups, function (batch) {
                db.collection('cities').insertMany(batch, console.log);
            });  

        });
    });
});



