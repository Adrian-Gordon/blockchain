'use strict'


const logger = require('../logger/logger.js')(module)


const nconf = require('../config/conf.js').nconf

const p2pNode = require('./P2PNode').P2PNode

const testId = nconf.get("p2pnodeid")


const p2pn = new p2pNode({"nodeId":testId})
    