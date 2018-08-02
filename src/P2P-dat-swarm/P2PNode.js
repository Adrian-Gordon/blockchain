'use strict'



const nconf = require('../config/conf.js').nconf


const logger = require('../logger/logger.js')(module)

const Swarm = require('discovery-swarm')
const defaults = require('dat-swarm-defaults')
const getPort = require('get-port')

class P2PNode{
  constructor({nodeId}){
    this.nodeid = nodeId
    this.peers = {}

    const config = defaults({
      id: this.nodeid
    })

    const sw = Swarm(config)

    getPort().then((port)=>{
      logger.info("port: " + port)
      sw.listen(port)
      let rval = sw.join('BCTestChannel')
      logger.info(JSON.stringify(rval))
      logger.info("Joined " + sw.queued + " " + sw.connecting)

      sw.on('connection', (connection, data) => {
        logger.info("connected " + JSON.stringify(data))

      })
    })

  }

}

P2PNode.connectionSequenceId = 0

module.exports = Object.assign({}, {P2PNode})