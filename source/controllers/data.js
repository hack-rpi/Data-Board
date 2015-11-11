var express = require('express'),
	users = require('../models/users'),
	anonData = require('../models/anonData'),
	router = express.Router();


/**
 * User Routers
 */

router.get('/users/schools', function(req, res) {
	users.getSchools(function(err, data) {
		res.send(data);
	});
});

router.get('/users/zipcodes', function(req, res) {
	users.getZipCodes(function(err, data) {
		res.send(data);
	});
});


/**
 * Anon Data Routes
 */

router.get('/anonData/genders', function(req, res) {
	anonData.getGenders(function(err, data) {
		res.send(data);
	});
});

router.get('/anonData/races', function(req, res) {
	anonData.getRaces(function(err, data) {
		res.send(data);
	});
});


/**
 * General Statistics Routes
 */

router.get('/stats/num_registered', function(req, res) {
	users.getCount(function(err, data) {
		res.send(data);
	});
});

router.get('/stats/num_accepted', function(req, res) {
	users.getNumAccepted(function(err, data) {
		res.send(data);
	});
});

router.get('/stats/num_confirmed', function(req, res) {
	users.getNumConfirmed(function(err, data) {
		res.send(data);
	});
});

router.get('/stats/bus_routes', function(req, res) {
	users.getBusRoutes(function(err, data) {
		res.send(data);
	});
})

module.exports = router; 