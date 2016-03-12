var settings;
try {
  settings = require('./config.json');
} catch (e) {
  settings = {};
}

config = {};

config.mongo_url = settings.mongo_url || 'mongodb://localhost:27017';
config.port = settings.port || '8000';
config.bus_routes = settings.bus_routes || [];

module.exports = config;
