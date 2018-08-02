'use strict'

const should = require('should')

const chai = require('chai')
const assert = chai.assert
const expect = chai.expect
const logger = require('../logger/logger.js')(module)


const nconf = require('../config/conf.js').nconf

const p2pNode = require('./P2PNode').P2PNode

const testId = nconf.get("p2pnodeid")

describe('P2Pnode', () => {
  it("instantiates a P2P node", (done) => {
    const p2pn = new p2pNode({"nodeId":testId})
    p2pn.nodeid.should.eql(testId)
    p2pn.peers.should.be.instanceOf(Object)

    const p2pn2 = new p2pNode({"nodeId":"asecond node"})
    done()
  })
})

