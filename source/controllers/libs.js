var express = require('express'),
	router = express.Router(),
	lib_route = '../../../node_modules';

router.get('/d3', function(req, res) {
	res.sendFile('d3/d3.min.js', {
		root: __dirname + lib_route
	});
});

router.get('/jquery', function(req, res) {
	res.sendFile('jquery/dist/jquery.min.js', {
		root: __dirname + lib_route
	});
});

module.exports = router;