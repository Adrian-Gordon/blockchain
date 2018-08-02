'use strict'

const should = require('should')

const chai = require('chai')
const assert = chai.assert
const expect = chai.expect

const logger = require('../../logger/logger.js')(module)

const nconf = require('../../config/conf.js').nconf

const Peer = require('../peer').Peer

const discoveryServer = require('../discoveryServer/discoveryServer')

describe('Peer Instantiation', () => {
  it("throws an error if no discovery server URL is provided", (done) => {
    const fcn = function() {new Peer()}
    expect(fcn).to.throw(Error, "no discovery server URL provided")
    done()
  })

  it("throws an error if no discovery server port is provided", (done) => {
    const fcn = function() {new Peer('http://discoverserver/url')}
    expect(fcn).to.throw(Error, "no discovery server port provided")
    done()
  })

  it("throws an error if an invalid discovery server port is provided", (done) => {
    const fcn = function() {new Peer('http://discoverserver/url','aportno')}
    expect(fcn).to.throw(Error, "invalid discovery server port: 'aportno'")
    done()
  })

  it("throws an error if no peer port is provided", (done) => {
    const fcn = function() {new Peer('http://discoverserver/url',3000)}
    expect(fcn).to.throw(Error, "no peer port provided")
    done()
  })

  it("throws an error if an invalid peer port is provided", (done) => {
    const fcn = function() {new Peer('http://discoverserver/url',3000, 'aportno')}
    expect(fcn).to.throw(Error, "invalid peer port: 'aportno'")
    done()
  })

  

  it("instantiates a Peer", (done) => {
    const peer = new Peer('http://localhost',3000, 3001)
    peer.should.be.instanceof(Peer)
    peer.discoveryServerUrl.should.eql("http://localhost")
    peer.discoveryServerPort.should.eql(3000)
    peer.port.should.eql(3001)
    expect(peer.startTime).to.be.a('number')
    done()
  })

  it("throws and error if the peer cannot retrieve a list of peers from the discovery server", (done) => {
    const peer = new Peer('http://localhost',3000, 3001)

    peer.getPeers().catch((error) => {
      error.should.eql("cannot retrieve list of peers from discovery server")
      done()
    })

    

  })



})

describe('Peer Connectivity', () => {

  let app = null
  before((done) => {
    
     discoveryServer.startServer(3000).then(serv => {
      app = serv
      done()
    })
  })

  after((done) => {
    
      app.close()
      app = null
      done()
      
    
  })

  it("gets a list of peers from the discovery server", (done) => {
    const peer = new Peer('http://localhost',3000, 3001)

    peer.getPeers().then((peers) => {
      //console.log("Peers: " + peers)
      peers.should.be.instanceof(Object)
      done()
    })

  })

  it("registers as a peer", (done) => {
    const peer = new Peer('http://localhost',3000, 3001)
    peer.registerAsPeer().then((result) => {
      result["::ffff:127.0.0.1"].should.containEql(3001)
      done()
    })
    .catch((error) => {
      expect(error).to.be.null
      done()
    })
  })

  it("returns it's status", (done) => {
    const peer = new Peer('http://localhost',3000, 3001)

    const status = peer.getStatus()
    status.status.should.eql('OK')
    expect(status.uptime).to.be.a('number')
    done()

    

  })

})
