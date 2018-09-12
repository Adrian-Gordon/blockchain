'use strict'


const chai = require('chai')
const assert = chai.assert
const expect = chai.expect
const sinon = require('sinon')
const chaiAsPromised = require('chai-as-promised')
const should = chai.should()

chai.use(chaiAsPromised)

const logger = require('../../logger/logger.js')(module)

const nconf = require('../../config/conf.js').nconf

const Peer = require('../peer').Peer

const discoveryServer = require('../discoveryServer/discoveryServer')

const Repository = require('../../repository/repository').Repository

const Levelupdb = require('../../database/leveldb/levelup').Levelupdb

const Transaction = require('../../transaction/transaction').Transaction

const Block = require('../../block/block').Block

const Message = require('../../message/message').Message

const Blockchain = require("../../blockchain/blockchain").Blockchain

const fs = require('fs')

const privateKey = fs.readFileSync(nconf.get('privatekeyurl'),'utf8')

const publicKey = fs.readFileSync(nconf.get('publickeyurl'),'utf8')

describe('Peer Instantiation', () => {

  after(() =>{
     Levelupdb.delete('transactionpool')
       .then(()=> {
       Levelupdb.delete('blocks')
        .then((result) => {

        })

       })
  })

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

  it("throws an error if no repository is provided", (done) => {
    expect(() => new Peer('http://localhost',3000, 3001)).to.throw(Error,'no repository provided')

    done()
  })

  

  it("instantiates a Peer", (done) => {
    const peer = new Peer('http://localhost',3000, 3001, new Repository(Levelupdb))
    expect(peer).to.be.instanceof(Peer)
    peer.should.be.instanceof(Peer)
    peer.discoveryServerUrl.should.eql("http://localhost")
    peer.discoveryServerPort.should.eql(3000)
    peer.port.should.eql(3001)
    expect(peer.startTime).to.be.a('number')
    peer.startTime.should.be.a('number')
    peer.repository.should.be.instanceof(Repository)
    expect(peer.messageQueue).to.be.a('array')
    expect(peer.messageQueue.length).to.eql(0)
    done()
  })

  it("creates peer's repository collections", (done) => {
    const peer = new Peer('http://localhost',3000, 3001, new Repository(Levelupdb))
    peer.createCollections()
    .then(() => {
       Levelupdb.collections.should.have.property('transactionpool')
       Levelupdb.collections.should.have.property('blocks')
      done()
     
    })

  })

  it("throws an error if setBlockchain is called with an argument that is not of class Blockchain", (done) => {
    const peer = new Peer('http://localhost',3000, 3001, new Repository(Levelupdb))
    expect(() => peer.setBlockchain("a string")).to.throw("setBlockchain must take an argument of type Blockchain")
    done()
  })

  it("sets the blockchain property of a peer", (done) => {
    const peer = new Peer('http://localhost',3000, 3001, new Repository(Levelupdb))
    const blockchain = new Blockchain({"length": 10, "latestblockid": "abcdef"})
    peer.setBlockchain(blockchain)
    expect(peer.blockchain).to.eql(blockchain)
    done()
  })

  it("gets the blockchain property of the peer", (done) => {
    const peer = new Peer('http://localhost',3000, 3001, new Repository(Levelupdb))
    const blockchain = new Blockchain({"length": 10, "latestblockid": "abcdef"})
    peer.setBlockchain(blockchain)
    expect(peer.getBlockchain()).to.be.instanceof(Blockchain)
    done()
  })

  it("throws and error if the peer cannot retrieve a list of peers from the discovery server", (done) => {
    const peer = new Peer('http://localhost',3000, 3001, new Repository(Levelupdb))

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
    const peer = new Peer('http://localhost',3000, 3001, new Repository(Levelupdb))

    peer.getPeers().then((peers) => {
      peers.should.be.instanceof(Object)
      done()
    })

  })

  it("registers as a peer", (done) => {
    const peer = new Peer('http://localhost',3000, 3001, new Repository(Levelupdb))
    peer.registerAsPeer().then((result) => {
      result.port.should.eql(3001)
      done()
    })
    .catch((error) => {
      expect(error).to.be.null
      done()
    })
  })

  it("returns a peer's status", (done) => {
    const peer = new Peer('http://localhost',3000, 3001, new Repository(Levelupdb))

    const status = peer.getStatus()
    status.status.should.eql('OK')
    expect(status.uptime).to.be.a('number')
    done()

    

  })

  it("sets up peer network", (done) => {
    const peer1 = new Peer('http://localhost',3000, 3001, new Repository(Levelupdb))
    const peer2 = new Peer('http://localhost',3000, 3002, new Repository(Levelupdb))

    const p1Spy = sinon.stub(peer1, "connectionCallback").callsFake(() => {return(true)})
    const p2Spy = sinon.stub(peer2, "connectionCallback").callsFake(() => {return(true)})
    //p1Spy.returns(true)
    //peer1.topology.on = sinon.spy()

    peer1.registerAsPeer().then(() => {

      peer2.registerAsPeer().then(() => {
        peer2.setupPeerNetwork(3002)//,['127.0.0.1:3001'])
        .then(()=> {
         // console.log(peer2.topology)
          peer2.topology.on = sinon.spy()
            peer1.setupPeerNetwork(3001)//,['127.0.0.1:3002'])
           .then(()=> {
             //peer1.topology.on = sinon.spy()
              setTimeout(() =>{
                expect(p1Spy.called).to.be.true
                expect(p1Spy.callCount).to.equal(1)
                expect(p2Spy.called).to.be.true
                expect(p2Spy.callCount).to.equal(1)

               // console.log(p2Spy)
                peer1.topology.destroy()
                peer2.topology.destroy()
                done()
              },100)
            //p1Spy.called.should.eql(true)
             //expect(p1Spy.firstCall.returnValue).equal(true)
             //peer1.topology.destroy()
             //peer2.topology.destroy()
                //done()

           })
        })
       
       

      })
    })
    
  })

  
})

describe("Input Message Processing", () => {
  it("should throw an error when trying to push a non-message on to the message queue", (done) => {
    const peer1 = new Peer('http://localhost',3000, 3001, new Repository(Levelupdb))
    const message ={"action":"ping"}
    expect(() => peer1.pushMessage(message)).to.throw(Error, "pushMessage requires a parameter of type message")
    
    done()
  })
  it("should push a message on to the end of the message queue", (done) => {
    const peer = new Peer('http://localhost',3000, 3001, new Repository(Levelupdb))
    const message1 = new Message({peer:"A Peer", action:"ping", data: "some data"})
    const message2 = new Message({peer:"A Peer", action:"ping", data: "some other data"})
    expect(peer.pushMessage(message1)).to.be.instanceOf(Message)
    expect(peer.pushMessage(message2)).to.be.instanceOf(Message)
    expect(peer.messageQueue[0]).to.be.instanceOf(Message)
    expect(peer.messageQueue[1]).to.be.instanceOf(Message)
    expect(peer.messageQueue[0].data).to.eql('some data')
    expect(peer.messageQueue[1].data).to.eql('some other data')
    expect(peer.messageQueue.length).to.eql(2)
   
    done()
  })
  it("should get a message from the front of the message queue", (done) => {
    const peer = new Peer('http://localhost',3000, 3001, new Repository(Levelupdb))
    const message1 = new Message({peer:"A Peer", action:"ping", data: "some data"})
    const message2 = new Message({peer:"A Peer", action:"ping", data: "some other data"})
    expect(peer.pushMessage(message1)).to.be.instanceOf(Message)
    expect(peer.pushMessage(message2)).to.be.instanceOf(Message)

    const nextMessage = peer.popMessage()
    expect(nextMessage).to.be.instanceOf(Message)
    expect(nextMessage.data).to.be.eql('some data')
    expect(peer.messageQueue[0].data).to.eql('some other data')
    expect(peer.messageQueue.length).to.eql(1)
     
    done()
  })
  it("should return 'undefined' when popping an element from an empty message queue", (done) => {
    const peer = new Peer('http://localhost',3000, 3001, new Repository(Levelupdb))
    
    const nextMessage = peer.popMessage()
    expect(nextMessage).to.be.undefined
    expect(peer.messageQueue.length).to.eql(0)
     
    done()
  })

  it("should process a received 'ping' message", (done) => {
    const peer = new Peer('http://localhost',3000, 3001, new Repository(Levelupdb))
    const pingMessage = new Message({peer:"127.0.0.1:4000", action:"ping"})

    const peerSpy = sinon.stub(peer, "sendMessage").callsFake(() => {return(true)})

    peer.processReceivedMessage(pingMessage).then(() => {
      expect(peerSpy.called).to.be.true
      expect(peerSpy.callCount).to.equal(1)
      expect(peerSpy.calledWith("127.0.0.1:4000","ping")).to.be.true

      done()
    })

    
  })

  it("should return a zero blockchain length if the peer has no blockchain property", (done) => {
    const peer = new Peer('http://localhost',3000, 3001, new Repository(Levelupdb))
    const sendblockchainLengthMessage = new Message({peer:"127.0.0.1:4000", action:"sendblockchainlength"})

    const peerSpy = sinon.stub(peer, "sendMessage").callsFake(() => {return(true)})

    peer.processReceivedMessage(sendblockchainLengthMessage).then(()=> {
      expect(peerSpy.called).to.be.true
      expect(peerSpy.callCount).to.equal(1)
      expect(peerSpy.calledWith("127.0.0.1:4000","blockchainlength","0")).to.be.true
      done()
  
    })


  })

  it("should process a received 'sendblockchainlength' message", (done) => {
    const peer = new Peer('http://localhost',3000, 3001, new Repository(Levelupdb))
    const blockchain = new Blockchain({"length": 10, "latestblockid": "abcdef"})
    peer.setBlockchain(blockchain)

    const sendblockchainLengthMessage = new Message({peer:"127.0.0.1:4000", action:"sendblockchainlength"})

    const peerSpy = sinon.stub(peer, "sendMessage").callsFake(() => {return(true)})

    peer.processReceivedMessage(sendblockchainLengthMessage).then(() => {
      expect(peerSpy.called).to.be.true
      expect(peerSpy.callCount).to.equal(1)
      expect(peerSpy.calledWith("127.0.0.1:4000","blockchainlength","10")).to.be.true

      done()
    })

    
  })

  it("should process a received 'sendblocks' message", (done) => {
    const peer = new Peer('http://localhost',3000, 3001, new Repository(Levelupdb))
    peer.createCollections().then(() => {
      const transactions1 = [
        
      ]
      transactions1.push(new Transaction({'consignmentid':'cabcdefg','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
      transactions1.push(new Transaction({'consignmentid':'cabcdefh','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
      transactions1.push(new Transaction({'consignmentid':'cabcdefi','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
      
      const block1 = new Block({"previousHash":"abcdef","transactions":transactions1})

      const transactions2 = [
        
      ]
      transactions2.push(new Transaction({'consignmentid':'cabcdefg','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
      transactions2.push(new Transaction({'consignmentid':'cabcdefh','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
      transactions2.push(new Transaction({'consignmentid':'cabcdefi','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
      
      const block2 = new Block({"previousHash":block1.id,"transactions":transactions2})

      const transactions3 = [
        
      ]
      transactions3.push(new Transaction({'consignmentid':'cabcdefg','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
      transactions3.push(new Transaction({'consignmentid':'cabcdefh','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
      transactions3.push(new Transaction({'consignmentid':'cabcdefi','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
      
      const block3 = new Block({"previousHash":block2.id,"transactions":transactions3})

      const blocks = [block1, block2, block3]

      const promises = blocks.map(peer.repository.addBlock.bind(peer.repository))

      Promise.all(promises).then((result)=> {
        
        
        //now respond to the message
        const sendblocksMessage = new Message({peer:"127.0.0.1:4000", action:"sendblocks"})

        const peerSpy = sinon.stub(peer, "sendMessage").callsFake(() => { return(true)})

        peer.processReceivedMessage(sendblocksMessage).then(() => {
           expect(peerSpy.called).to.be.true
            expect(peerSpy.callCount).to.equal(1)
            expect(peerSpy.calledWith("127.0.0.1:4000","blocks",sinon.match.string)).to.be.true
            //and cleanup
            peer.repository.deleteCollection('blocks').then(() => {
              peer.repository.deleteCollection("transactionpool").then(()=> {
                done()
              })
            })
            
        })

       
      

    })

    })
  })
})

