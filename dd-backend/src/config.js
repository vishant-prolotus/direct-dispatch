"use strict";

let config;

if (process.argv[2] == '--production') {
    config = require('./config.production.json');
} else if (process.argv[2] == '--local') {
    config = require('./config.local.json');
} else {
    config = require('./config.dev.json');
}

module.exports = config;