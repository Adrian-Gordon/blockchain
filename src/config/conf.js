'use strict'

const nconf = require('nconf')

nconf.use('memory')
nconf.env().argv()

// if 'conf' environment variable or command line argument is provided, load
// the configuration JSON file provided as the value
let path = nconf.get('conf')
if (path) {
  // logger.info("use file: " + path);
  nconf.file({file: path})
}

nconf.defaults(
  {
        

  })

module.exports = Object.assign({}, {nconf})
