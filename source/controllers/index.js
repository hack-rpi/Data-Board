var express = require('express'),
	libs = require('./libs.js'),
	data = require('./data.js'),
	router = express.Router();

router.use('/libs', libs);
router.use('/data', data);

router.get('/', function(req, res) {
	res.render('index.jade', {
		title: 'Data Board',
		header: 'Data Board - HackRPI 2015'
	});
});

module.exports = router;