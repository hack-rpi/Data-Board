var MongoClient = require('mongodb').MongoClient,
	_ = require('underscore'),
	config = require('../config');

exports.getGenders = function(callback) {
	MongoClient.connect(config.mongo_url, function(err, db) {
		if (err) {
			console.error(err);
			callback(err, null);
			return;
		}
		var AnonUserData = db.collection('AnonUserData'),
			pipeline = [
				{ $group: { _id: '$gender', count: { $sum: 1 } } }
			];
		AnonUserData.aggregate(pipeline, function(err, result) {
			if (err) {
				console.error(err);
				callback(err, null);
				return;
			}
			callback(null, result);
		})
	});
}