var MongoClient = require('mongodb').MongoClient,
	_ = require('underscore'),
	config = require('../config');

/** 
 * Get the total number of users on the Status Board
 * @param callback
 */	
exports.getCount = function(callback) {
	MongoClient.connect(config.mongo_url, function(err, db) {
		if (err) {
			console.error(err);
			callback(err, null);
			return;
		}
		db.collection('users').find()
			.count(function(err, count) {
				if (err) {
					console.error(err);
					callback(err, null);
					return;
				}
				callback(err, count + '');
				db.close();
			});
	});
}

/**
 * Get the number of people that have been accepted
 * @param callback
 */
exports.getNumAccepted = function(callback) {
	MongoClient.connect(config.mongo_url, function(err, db) {
		if (err) {
			console.error(err);
			callback(err, null);
			return;
		}
		db.collection('users')
			.find({ 'settings.accepted.flag': true })
			.count(function(err, count) {
				if (err) {
					console.error(err);
					callback(err, null);
					return;
				}
				callback(err, count + '');
				db.close();
			});
	});
}

/**
 * Get the number of people confirmed
 * @param callback
 */
exports.getNumConfirmed = function(callback) {
	MongoClient.connect(config.mongo_url, function(err, db) {
		if (err) {
			console.error(err);
			callback(err, null);
			return;
		}
		db.collection('users')
			.find({ 'settings.confirmed.flag': true })
			.count(function(err, count) {
				if (err) {
					console.error(err);
					callback(err, null);
					return;
				}
				callback(err, count + '');
				db.close();
			});
	});
}

/**
 * Get the number of people checked-in
 * @param callback
 */
exports.getNumCheckedIn = function(callback) {
	MongoClient.connect(config.mongo_url, function(err, db) {
		if (err) {
			console.error(err);
			callback(err, null);
			return;
		}
		db.collection('users')
			.find({ 'settings.checked_in': true })
			.count(function(err, count) {
				if (err) {
					console.error(err);
					callback(err, null);
					return;
				}
				callback(err, count + '');
				db.close();
			});
	});
}

/**
 * Get number of people on each bus route and at each stop
 * @param callback
 */
exports.getBusRoutes = function(callback) {
	MongoClient.connect(config.mongo_url, function(err, db) {
		if (err) {
			console.error(err);
			callback(err, null);
			return;
		}
		var users = db.collection('users'),
			buses = {},
			pipeline = [
				{ $group: { _id: {
						stop: '$settings.accepted.travel.method',
						confirmedOnBus: '$settings.confirmed.travel.accepted',
						confirmed: '$settings.confirmed.flag'
					},
					total:  { $sum: 1 } } 
				}
			]
		users.aggregate(pipeline, function(err, result) {
			if (err) {
				console.error(err);
				callback(err, null);
				return;
			}
			for (var r in config.bus_routes) {
				var route = config.bus_routes[r];
				buses['Route #' + r] = {};
				buses['Route #' + r].Total = {
					accepted: 0,
					confirmed: 0,
					rejected: 0,
					total: 0
				}
				for (var s in route) {
					var stop = route[s],
						stop_accepted = _.find(result, function(d) { 
							return d._id.stop === stop && d._id.confirmed === null; 
						}) || { total: 0 },
						stop_rejected = _.find(result, function(d) { 
							return d._id.stop === stop && (!d._id.confirmed || !d._id.confirmedOnBus); 
						}) || { total: 0 },
						stop_confirmed = _.find(result, function(d) { 
							return d._id.stop === stop && d._id.confirmed && d._id.confirmedOnBus; 
						}) || { total: 0 };
					buses['Route #' + r][stop] = {
						accepted: stop_accepted.total,
						confirmed: stop_confirmed.total,
						rejected: stop_rejected.total,
						total: stop_accepted.total + stop_confirmed.total
					};
					buses['Route #' + r].Total.accepted += stop_accepted.total;
					buses['Route #' + r].Total.confirmed += stop_confirmed.total;
					buses['Route #' + r].Total.rejected += stop_rejected.total;
					buses['Route #' + r].Total.total += (stop_accepted.total + stop_confirmed.total);
				}
			}			
			callback(null, buses);
      db.close();
		});
	});
}

/**
 * Get the list of schools and the number of people attending from each 
 * school
 * @param callback
 */
exports.getSchools = function(callback) {
	MongoClient.connect(config.mongo_url, function(err, db) {
		if (err) {
			console.error(err);
			callback(err, null);
			return;
		}
		var users = db.collection('users'),
			pipeline = [
				{ $group: { _id: '$profile.school', count: { $sum: 1 } } }
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
			});
			callback(null, data);
			db.close();
		});
	});
}

/**
 * Get the list of zip codes where people are coming from and the
 * number of people coming from each
 * @param callback
 */
exports.getZipCodes = function(callback) {
	MongoClient.connect(config.mongo_url, function(err, db) {
		if (err) {
			console.error(err);
			callback(err, null);
			return;
		}
		var users = db.collection('users'),
			pipeline = [
				{ $group: { _id: '$profile.travel.zipcode', count: { $sum: 1 } } }
			];
		users.aggregate(pipeline, function(err, result) {
			if (err) {
				console.error(err);
				callback(err, null);
				return;
			}
			var zipCodeData = require('./zipcode_data.json');
			_.each(result, function(z) {
				if (zipCodeData[z._id] === undefined) {
					console.log(z._id);
				}
				z.geo = zipCodeData[z._id];
			});
			callback(null, result);
			db.close();
		});
	});
}

/**
 * Get the counts for the reasons why poeple are interested in coming
 * @param callback
 */
exports.getWhy = function(callback) {
	MongoClient.connect(config.mongo_url, function(err, db) {
		if (err) {
			console.error(err);
			callback(err, null);
			return;
		}
		var users = db.collection('users'),
			pipeline = [
				{ $group: { _id: '$profile.interests.why', count: { $sum: 1 } } }
			];
		users.aggregate(pipeline, function(err, result) {
			if (err) {
				console.error(err);
				callback(err, null);
				return;
			}			
			callback(null, result);
			db.close();
		});
	});
}