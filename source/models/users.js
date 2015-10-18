var MongoClient = require('mongodb').MongoClient,
	_ = require('underscore'),
	config = require('../config');

exports.getSchools = function(callback) {
	MongoClient.connect(config.mongo_url, function(err, db) {
		if (err) {
			console.error(err);
			callback(err, null);
			return;
		}
		var users = db.collection('users'),
			pipeline = [
				{ $group: { _id: '$profile.school.name', count: { $sum: 1 } } }
			];
		users.aggregate(pipeline, function(err, result) {
			if (err) {
				console.error(err);
				callback(err, null);
				return;
			}
			var refined_data = {};
			_.each(result, function(d) {
				if (! d._id) {
					return;
				}
				var name = d._id.replace(/\r?\n|\r/g, '');
				if (_.has(refined_data, name)) {
					refined_data[name] += d.count;
				}
				else {
					refined_data[name] = d.count;
				}
			});
			var data = _.map(_.keys(refined_data), function(d) {
				return {
					_id: d,
					count: refined_data[d]
				}
			})
			callback(null, data);
		});
	});
}