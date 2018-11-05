'use strict'

const nconf = require('../../src/config/conf.js').nconf

const server = require('../../src/P2P/discoveryServer/discoveryServer')


server.startServer(nconf.get("port"), nconf.get("messageport"))
server.startStatsResetTask(nconf.get("statsrefreshtime"))