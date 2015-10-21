var express = require('express'),
	users = require('../models/users'),
	anonData = require('../models/anonData'),
	router = express.Router();

router.get('/users/schools', function(req, res) {
	users.getSchools(function(err, data) {
		res.send(data);
	});
});

router.get('/anonData/genders', function(req, res) {
	anonData.getGenders(function(err, data) {
		res.send(data);
	});
});

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
})

module.exports = router; 