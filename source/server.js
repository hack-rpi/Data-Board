var express = require('express'),
	lessMiddleware = require('less-middleware'),
	app = express();

app.use(lessMiddleware(
	__dirname + '/public',
	{ force: true }
));

app.use(express.static(__dirname + '/public'));
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');

var controllers = require('./controllers/');
app.use('/', controllers);

var server = app.listen(80, function() {
	var host = server.address().address,
		port = server.address().port;
	console.log('App running at http://%s%s', host, port);
});