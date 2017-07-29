var vehicles = require('./vehicles-all.json');
var _ = require('../node_modules/lodash');

var relevant = vehicles.filter(function (vehicle) {
    return vehicle.Type && vehicle.Year >= '1920';
});

relevant = relevant.map(function (vehicle) {
    return { make: vehicle.Make, model: vehicle.Model };
});

relevant = _.uniq(relevant, function (vehicle) {
    return vehicle.make + ' ' + vehicle.model;
});

relevant = _.sortByAll(relevant, ['make', 'model']);

console.log(relevant);

var groups = _.groupBy(relevant, function (vehicle, index) {
    return Math.floor(index / 1000);
});

require('../node_modules/mongodb').MongoClient.connect('mongodb://127.0.0.1:27017/direct-dispatch', function (err, db) {
    if (err)
        return console.log(err);
    _.each(groups, function (batch) {
        db.collection('vehicles').insertMany(batch, function (err, docs) {
            if (err)
                return console.log(err);
            console.log('Inserted', docs.insertedCount);
        });
    });
});

