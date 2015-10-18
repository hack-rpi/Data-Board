var express = require('express'),
	router = express.Router();

router.use('/libs', require('./libs.js'));

router.get('/', function(req, res) {
	res.render('index.jade', {
		title: 'Data Board',
		header: 'Data Board'
	});
});

module.exports = router;