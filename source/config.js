var settings = require('./config.json'),
	config = {};

config.mongo_url = settings.mongo_url || '';
config.port = settings.port || '8000';
config.bus_routes = settings.bus_routes || [];

module.exports = config;