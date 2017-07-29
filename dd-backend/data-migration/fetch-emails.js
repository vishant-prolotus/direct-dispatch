var mongo = require('mongodb').MongoClient;

 mongo.connect('mongodb://127.0.0.1:27017/direct-dispatch', function(err, db) {
    if(err) return console.log('error:', err);
    db.collection('old-carriers').find({}, { _id: false, email: true }).toArray(function (err, oldCarriers) {
    	db.collection('carriers').find({}, { _id: false, email: true}).toArray(function (err, newCarriers) {
    		db.collection('subscribers').find({}, { _id: false, email: true}).toArray(function (err, subscribers) {
    			var people = oldCarriers.concat(newCarriers).concat(subscribers);
    			var emails = people.map(function (p) { return p.email });
    			var all = emails.reduce(function (cv, pv) { return cv + ', ' + pv }, '');
    			console.log(all);
    		});
    	});
    });
	
 });