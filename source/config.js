var settings = require('./config.json'),
	config = {};

config.mongo_url = settings.mongo_url || '';
config.port = settings.port || '8000';

module.exports = config;