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
})

module.exports = router; 