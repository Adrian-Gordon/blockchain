'use strict'

const nconf = require('../../config/conf.js').nconf

const server = require('../../P2P/discoveryServer/discoveryServer')


server.startServer(nconf.get("port"), nconf.get("messageport"))