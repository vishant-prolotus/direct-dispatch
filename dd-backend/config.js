"use strict";

module.exports = process.argv[2] === '--production' ? require('./config.prod.json') : require('./config.dev.json');