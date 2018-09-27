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
    const fcn = function() {new Peer('discovery.server.url')}
    expect(fcn).to.throw(Error, "no discovery server port provided")
    done()
  })

  it("throws an error if an invalid discovery server port is provided", (done) => {
    const fcn = function() {new Peer('discovery.server.url','aportno')}
    expect(fcn).to.throw(Error, "invalid discovery server port: 'aportno'")
    done()
  })

  it("throws an error if no discovery server message port is provided", (done) => {
    const fcn = function() {new Peer('discovery.server.url',3000)}
    expect(fcn).to.throw(Error, "no discovery server message port provided")
    done()
  })

  it("throws an error if an invalid discovery server message port is provided", (done) => {
    const fcn = function() {new Peer('discovery.server.url',3000,'aportno')}
    expect(fcn).to.throw(Error, "invalid discovery server message port: 'aportno'")
    done()
  })

  it("throws an error if no peer port is provided", (done) => {
    const fcn = function() {new Peer('discovery.server.url',3000, 3001)}
    expect(fcn).to.throw(Error, "no peer port provided")
    done()
  })

  it("throws an error if an invalid peer port is provided", (done) => {
    const fcn = function() {new Peer('discovery.server.url',3000,3001, 'aportno')}
    expect(fcn).to.throw(Error, "invalid peer port: 'aportno'")
    done()
  })

  it("throws an error if no repository is provided", (done) => {
    expect(() => new Peer('discovery.server.url',3000, 3001, 3002)).to.throw(Error,'no repository provided')

    done()
  })

  

  it("instantiates a Peer", (done) => {
    const peer = new Peer('127.0.0.1',3000, 3001, 3002, new Repository(Levelupdb))
    expect(peer).to.be.instanceof(Peer)
    peer.should.be.instanceof(Peer)
    peer.discoveryServerUrl.should.eql("127.0.0.1")
    peer.discoveryServerPort.should.eql(3000)
    peer.discoveryServerMessagePort.should.eql(3001)
    peer.port.should.eql(3002)
    expect(peer.startTime).to.be.a('number')
    peer.startTime.should.be.a('number')
    peer.repository.should.be.instanceof(Repository)
    expect(peer.messageQueue).to.be.a('array')
    expect(peer.messageQueue.length).to.eql(0)
    expect(peer.state).to.eql("running")
    done()
  })

  it("throws an error if setting a peer state to an invalid state", (done) =>{
    const peer = new Peer("127.0.0.1",3000, 3001, 3002,new Repository(Levelupdb))
    expect(() => peer.setState("somestate")).to.throw("invalid state: 'somestate'")
    done()
  })

  it("gets a peer state", (done) =>{
    const peer = new Peer("127.0.0.1",3000, 3001, 3002, new Repository(Levelupdb))
    expect(peer.state).to.eql("running")
    done()
  })

  it("sets a peer state", (done) =>{
    const peer = new Peer("127.0.0.1",3000, 3001, 3002,new Repository(Levelupdb))
    peer.setState("awaitingblockchain")
    expect(peer.getState()).to.eql("awaitingblockchain")
    done()
  })

  it("creates peer's repository collections", (done) => {
    const peer = new Peer("127.0.0.1",3000, 3001, 3002, new Repository(Levelupdb))
    peer.createCollections()
    .then(() => {
       Levelupdb.collections.should.have.property('transactionpool')
       Levelupdb.collections.should.have.property('blocks')
      done()
     
    })

  })

  it("throws an error if setBlockchain is called with an argument that is not of class Blockchain", (done) => {
    const peer = new Peer("127.0.0.1",3000, 3001,3002, new Repository(Levelupdb))
    expect(() => peer.setBlockchain("a string")).to.throw("setBlockchain must take an argument of type Blockchain")
    done()
  })

  it("sets the blockchain property of a peer", (done) => {
    const peer = new Peer("127.0.0.1",3000, 3001, 3002, new Repository(Levelupdb))
    const blockchain = new Blockchain({"length": 10, "latestblockid": "abcdef","latestblockindex":10})
    peer.setBlockchain(blockchain)
    expect(peer.blockchain).to.eql(blockchain)
    done()
  })

  it("gets the blockchain property of the peer", (done) => {
    const peer = new Peer("127.0.0.1",3000, 3001, 3002, new Repository(Levelupdb))
    const blockchain = new Blockchain({"length": 10, "latestblockid": "abcdef","latestblockindex":20})
    peer.setBlockchain(blockchain)
    expect(peer.getBlockchain()).to.be.instanceof(Blockchain)
    done()
  })

  it("throws and error if the peer cannot retrieve a list of peers from the discovery server", (done) => {
    const peer = new Peer("127.0.0.1",3000, 3001, 3002,new Repository(Levelupdb))

    peer.getPeers().catch((error) => {
      error.should.eql("cannot retrieve list of peers from discovery server")
      done()
    })

    

  })



})


describe('Peer Connectivity', () => {

  let app = null
  before((done) => {
    
     discoveryServer.startServer(3000, 3001).then(serv => {
      app = serv
      done()
    })
  })

  after((done) => {
      discoveryServer.getSwarm().destroy()
      app.close()
      app = null
      done()
      
    
  })

  it("gets a list of peers from the discovery server", (done) => {
    const peer = new Peer("127.0.0.1",3000, 3001, 3002, new Repository(Levelupdb))

    peer.getPeers().then((peers) => {
      peers.should.be.instanceof(Object)
      done()
    })

  })

  it("registers as a peer", (done) => {
    const peer = new Peer("127.0.0.1",3000, 3001,3002, new Repository(Levelupdb))
    peer.registerAsPeer().then((result) => {
      result.port.should.eql(3002)
      done()
    })
    .catch((error) => {
      expect(error).to.be.null
      done()
    })
  })

  it("returns a peer's status", (done) => {
    const peer = new Peer("127.0.0.1",3000, 3001,3002, new Repository(Levelupdb))

    const status = peer.getStatus()
    status.status.should.eql('OK')
    expect(status.uptime).to.be.a('number')
    done()

    

  })

  it("sets up peer network", (done) => {
    const peer1 = new Peer("127.0.0.1",3000, 3001,3002, new Repository(Levelupdb))
    const peer2 = new Peer("127.0.0.1",3000, 3001, 3003, new Repository(Levelupdb))

   

    peer1.registerAsPeer().then(() => {

      peer2.registerAsPeer().then(() => {
        peer2.setupPeerNetwork(3003)
        .then(()=> {
         
            peer1.setupPeerNetwork(3002)
           .then(()=> {
             
              setTimeout(() =>{
                
                expect(Object.keys(peer1.connectedPeers).length).to.eql(2)
                expect(Object.keys(peer2.connectedPeers).length).to.eql(2)
               
                peer1.topology.destroy()
                peer2.topology.destroy()
                done()
              },100)
            

           })
        })
       
       

      })
    })
    
  })

  it("closes a peer connection",(done) => {
    const peer1 = new Peer("127.0.0.1",3000, 3001,3002, new Repository(Levelupdb))
    const peer2 = new Peer("127.0.0.1",3000, 3001,3003, new Repository(Levelupdb))

    peer1.registerAsPeer().then(() => {

      peer2.registerAsPeer().then(() => {
        peer2.setupPeerNetwork(3003)
        .then(()=> {
         
            peer1.setupPeerNetwork(3002)
           .then(()=> { 
              setTimeout(() =>{
              
                peer1.endConnection("127.0.0.1:3003")
                expect(Object.keys(peer1.connectedPeers).length).to.eql(1)
                setTimeout(() => {
                  expect(Object.keys(peer2.connectedPeers).length).to.eql(1)
                  peer1.topology.destroy()
                  peer2.topology.destroy()
                  done()

                }, 100)
                
              },100)
           

           })
        })
       
       

      })
    })

  })

  it("throws an error when trying to close a non-existant connection",(done) => {
    const peer1 = new Peer("127.0.0.1",3000, 3001,3002, new Repository(Levelupdb))
    const peer2 = new Peer("127.0.0.1",3000, 3001, 3003, new Repository(Levelupdb))

    peer1.registerAsPeer().then(() => {

      peer2.registerAsPeer().then(() => {
        peer2.setupPeerNetwork(3003)
        .then(()=> {
         
            peer1.setupPeerNetwork(3002)
           .then(()=> { 
              setTimeout(() =>{
                expect(() => peer1.endConnection("127.0.0.1:3005")).to.throw(Error, "no connection to peer: '127.0.0.1:3005'")
                peer1.topology.destroy()
                peer2.topology.destroy()
                done()

                
              },100)
           

           })
        })
       
       

      })
    })

  })

   it("sends a private message to another peer",(done) => {
    const peer1 = new Peer("127.0.0.1",3000, 3001, 3002, new Repository(Levelupdb))
    const peer2 = new Peer("127.0.0.1",3000, 3001, 3003, new Repository(Levelupdb))

    peer1.registerAsPeer().then(() => {

      peer2.registerAsPeer().then(() => {
        peer2.setupPeerNetwork(3003)
        .then(()=> {
         
            peer1.setupPeerNetwork(3002)
           .then(()=> { 
              setTimeout(() =>{
                expect(peer2.messageQueue.length).to.eql(0)
                peer1.sendMessage("127.0.0.1:3003",'ping')
                
                setTimeout(() => {
                  expect(peer2.messageQueue.length).to.eql(1)
                  peer1.topology.destroy()
                  peer2.topology.destroy()
                  done()

                }, 100)
                
              },100)
           

           })
        })
       
       

      })
    })

  })

  it("throws an error when trying to send a private message to a non-existant peer",(done) => {
    const peer1 = new Peer("127.0.0.1",3000, 3001, 3002, new Repository(Levelupdb))
    const peer2 = new Peer("127.0.0.1",3000,3001,  3003, new Repository(Levelupdb))

    peer1.registerAsPeer().then(() => {

      peer2.registerAsPeer().then(() => {
        peer2.setupPeerNetwork(3003)
        .then(()=> {
         
            peer1.setupPeerNetwork(3002)
           .then(()=> { 
              setTimeout(() =>{
                expect(peer2.messageQueue.length).to.eql(0)
               
                expect(() =>  peer1.sendMessage("127.0.0.1:3005",'ping')).to.throw(Error, "no connection to peer: '127.0.0.1:3005'")
                peer1.topology.destroy()
                peer2.topology.destroy()
                done()
                
                
              },100)
           

           })
        })
       
       

      })
    })

  })

  it("broadcasts a message to all connected peers", (done) => {
    const peer1 = new Peer("127.0.0.1",3000, 3001,3002, new Repository(Levelupdb))
    const peer2 = new Peer("127.0.0.1",3000, 3001,3003, new Repository(Levelupdb))
    const peer3 = new Peer("127.0.0.1",3000, 3001,3004, new Repository(Levelupdb))

    const peers = [peer1, peer2, peer3]

    const registerPromises = peers.map((peer) => {
      return peer.registerAsPeer()
    })

    Promise.all(registerPromises)
    .then(() => {
      //console.log("all registered")
      let peerSetups = []
      peerSetups.push(peer1.setupPeerNetwork(3002))
      peerSetups.push(peer2.setupPeerNetwork(3003))
      peerSetups.push(peer3.setupPeerNetwork(3004))

      Promise.all(peerSetups).then(() => {
        //console.log("all connected")
        
        setTimeout(() => {
            peer1.broadcastMessage('ping')
            setTimeout(() => {
              expect(peer2.messageQueue.length).to.eql(1)
              expect(peer3.messageQueue.length).to.eql(1)
              peer1.topology.destroy()
              peer2.topology.destroy()
              peer3.topology.destroy()
              done()
            }, 100)
            

        }, 100)
        
      })
    })


  })

  
})

describe("Peer transaction processing", () => {
 let peer = null
 beforeEach((done) => {
     peer = new Peer("127.0.0.1",3000, 3001,3002, new Repository(Levelupdb))
     peer.createCollections().then(() => {
      done()

      
     })

  })

  afterEach((done) => {
    peer.repository.deleteCollection('blocks').then(() => {
      peer.repository.deleteCollection("transactionpool").then(()=> {
        done()
      })
    })

  })

  it("should throw an error when asked to add a non-transaction object", (done) => {
     peer.addTransaction("trans1").catch(error=> {
        expect(error).to.eql("transaction must be of class Transaction")
        done()
      })
  })

  it("should throw an error when asked to add an invalid transaction", (done) => {

    const transaction = new Transaction({'consignmentid':'cabcdefi','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey})

      transaction.consignmentid = "cabcdefj" //invalidate it
      peer.addTransaction(transaction).catch(error => {
        expect(error).to.eql("transaction is invalid")
        done()
      })
  })

  it("should add a new transaction", (done) => {

    const transaction = new Transaction({'consignmentid':'cabcdefi','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey})

     
      peer.addTransaction(transaction)
      .then((result) => {
        expect(result).to.be.instanceof(Transaction)
        expect(result.id).to.eql(transaction.id)
        peer.repository.getTransaction(transaction.id)
        .then((trans) => {
          expect(trans.id).to.eql(transaction.id)
          done()
        })

       

      })
      
  })

})

describe("Peer block processing", () => {
  let peer = null
  beforeEach((done) => {
     peer = new Peer("127.0.0.1",3000, 3001, 3002, new Repository(Levelupdb))
     peer.createCollections().then(() => {
      //add an origin block
      const originBlock = new Block({"previousHash": "-1", "transactions":[],"index":0})
      //save to the database
      peer.repository.addBlock(originBlock).then(result => {
        //set up the blockchain object
        const blockchain = new Blockchain({"latestblockid": originBlock.id, "latestblockindex": originBlock.index, "length":1})
        peer.setBlockchain(blockchain)
        done()
      })

      
     })

  })

  afterEach((done) => {
    peer.repository.deleteCollection('blocks').then(() => {
      peer.repository.deleteCollection("transactionpool").then(()=> {
        done()
      })
    })

  })
  it("should throw an error when asked to add a non block object ", (done) => {
    

      peer.addBlock("block1").catch(error=> {
        expect(error).to.eql("block must be of class Block")
        done()
      })
      
      

  
  })

  it("should throw an error when asked to add an invalid block", (done) => {
    
      const transactions1 = [
        
      ]
      transactions1.push(new Transaction({'consignmentid':'cabcdefg','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
      transactions1.push(new Transaction({'consignmentid':'cabcdefh','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
      transactions1.push(new Transaction({'consignmentid':'cabcdefi','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
      
      const block1 = new Block({"previousHash":peer.blockchain.getLatestBlockId(),"transactions":transactions1, "index":1})

      block1.timestamp = 1001 //invalidate it
      peer.addBlock(block1).catch(error => {
        expect(error).to.eql("block is invalid")
        done()
      })

  
  })

  it("should throw an error when asked to add a block with an index <= the current value for next index ", (done) => {
    
      const transactions1 = [
        
      ]
      transactions1.push(new Transaction({'consignmentid':'cabcdefg','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
      transactions1.push(new Transaction({'consignmentid':'cabcdefh','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
      transactions1.push(new Transaction({'consignmentid':'cabcdefi','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
      
      const block1 = new Block({"previousHash":peer.blockchain.getLatestBlockId(),"transactions":transactions1, "index":-1})

       peer.addBlock(block1).catch(error => {
        expect(error).to.eql("block index less than or equal to latest")
        done()
      })
      

  
  })

  it("should throw an error when asked to add a block with a previous hash that is not the current value for the latest block id", (done) => {
    
      const transactions1 = [
        
      ]
      transactions1.push(new Transaction({'consignmentid':'cabcdefg','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
      transactions1.push(new Transaction({'consignmentid':'cabcdefh','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
      transactions1.push(new Transaction({'consignmentid':'cabcdefi','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
      
      const block1 = new Block({"previousHash":"abcde","transactions":transactions1, "index":1})

      peer.addBlock(block1).catch(error => {
        expect(error).to.eql("block previousHash not hash of latest block")
        done()
      })

  
  })

  it("should throw an error when asked to add a block with an index greater than 1+ the current value for next index ", (done) => {
    
      const transactions1 = [
        
      ]
      transactions1.push(new Transaction({'consignmentid':'cabcdefg','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
      transactions1.push(new Transaction({'consignmentid':'cabcdefh','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
      transactions1.push(new Transaction({'consignmentid':'cabcdefi','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
      
      const block1 = new Block({"previousHash":peer.blockchain.getLatestBlockId(),"transactions":transactions1, "index":2})


      peer.addBlock(block1).catch(error => {
        expect(error).to.eql("block index greater than next index")
        done()
      })

  
  })
  it("should add a new block to the database, and update the blockchain object", (done) => {
    
      const transactions1 = [
        
      ]
      transactions1.push(new Transaction({'consignmentid':'cabcdefg','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
      transactions1.push(new Transaction({'consignmentid':'cabcdefh','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
      transactions1.push(new Transaction({'consignmentid':'cabcdefi','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
      
      const block1 = new Block({"previousHash":peer.blockchain.getLatestBlockId(),"transactions":transactions1, "index":1})

      const l = peer.blockchain.getLength()
      peer.addBlock(block1).then(result => {
        expect(result).to.eql(block1)
        expect(peer.blockchain.getLatestBlockId()).to.eql(block1.id)
        expect(peer.blockchain.getLatestBlockIndex()).to.eql(block1.index)
        expect(peer.blockchain.length).to.eql(l + 1)
        peer.repository.getBlock(result.id)
        .then((blk) => {
          expect(blk.id).to.eql(result.id)
          done()
        })
        
      })
      

  
  })

})

describe("Input Message Processing", () => {
  it("should throw an error when trying to push a non-message on to the message queue", (done) => {
    const peer1 = new Peer("127.0.0.1",3000, 3001,3002, new Repository(Levelupdb))
    const message ={"action":"ping"}
    expect(() => peer1.pushMessage(message)).to.throw(Error, "pushMessage requires a parameter of type message")
    
    done()
  })
  it("should push a message on to the end of the message queue", (done) => {
    const peer = new Peer("127.0.0.1",3000, 3001,3002, new Repository(Levelupdb))
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
    const peer = new Peer("127.0.0.1",3000, 3001,3002, new Repository(Levelupdb))
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
    const peer = new Peer("127.0.0.1",3000, 3001,3002, new Repository(Levelupdb))
    
    const nextMessage = peer.popMessage()
    expect(nextMessage).to.be.undefined
    expect(peer.messageQueue.length).to.eql(0)
     
    done()
  })

  it("should process a received 'ping' message", (done) => {
    const peer = new Peer("127.0.0.1",3000,3001, 3002, new Repository(Levelupdb))
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
    const peer = new Peer("127.0.0.1",3000, 3001,3002, new Repository(Levelupdb))
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
    const peer = new Peer("127.0.0.1",3000, 3001,3002, new Repository(Levelupdb))
    const blockchain = new Blockchain({"length": 10, "latestblockid": "abcdef","latestblockindex": 20})
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
    const peer = new Peer("127.0.0.1",3000, 3001,3002, new Repository(Levelupdb))
    peer.createCollections().then(() => {
      const transactions1 = [
        
      ]
      transactions1.push(new Transaction({'consignmentid':'cabcdefg','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
      transactions1.push(new Transaction({'consignmentid':'cabcdefh','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
      transactions1.push(new Transaction({'consignmentid':'cabcdefi','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
      
      const block1 = new Block({"previousHash":"abcdef","transactions":transactions1, "index":1})

      const transactions2 = [
        
      ]
      transactions2.push(new Transaction({'consignmentid':'cabcdefg','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
      transactions2.push(new Transaction({'consignmentid':'cabcdefh','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
      transactions2.push(new Transaction({'consignmentid':'cabcdefi','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
      
      const block2 = new Block({"previousHash":block1.id,"transactions":transactions2, "index":2})

      const transactions3 = [
        
      ]
      transactions3.push(new Transaction({'consignmentid':'cabcdefg','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
      transactions3.push(new Transaction({'consignmentid':'cabcdefh','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
      transactions3.push(new Transaction({'consignmentid':'cabcdefi','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
      
      const block3 = new Block({"previousHash":block2.id,"transactions":transactions3,"index": 3})

      const blocks = [block1, block2, block3]

      const promises = blocks.map(peer.repository.addBlock.bind(peer.repository))

      Promise.all(promises).then((result)=> {
        
        
        //process the received message
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

   it("should process a received 'addblock' message, throwing an error if the received data is not a block", (done) => {
    const peer = new Peer("127.0.0.1",3000, 3001,3002, new Repository(Levelupdb))
    peer.createCollections().then(() => {

       //add an origin block
      const originBlock = new Block({"previousHash": "-1", "transactions":[],"index":0})
      //save to the database
      peer.repository.addBlock(originBlock).then(result => {
        //set up the blockchain object
        const blockchain = new Blockchain({"latestblockid": originBlock.id, "latestblockindex": originBlock.index, "length":1})
        peer.setBlockchain(blockchain)
        
      
        //build a message

        const addBlockMessage = new Message({peer:"127.0.0.1:4000", action:"addblock", data: "{\"some\":\"data\"}"})

        //process the received message
        peer.processReceivedMessage(addBlockMessage)
        .catch((error) => {
          expect(error).to.exist
           peer.repository.deleteCollection('blocks').then(() => { //cleanup
              peer.repository.deleteCollection("transactionpool").then(()=> {
                done()
              })
            })
        })

        

      })



      
    })


  })

  it("should process a received 'addblock' message, throwing an error if the received block is invalid", (done) => {
    const peer = new Peer("127.0.0.1",3000, 3001,3002, new Repository(Levelupdb))
    peer.createCollections().then(() => {

       //add an origin block
      const originBlock = new Block({"previousHash": "-1", "transactions":[],"index":0})
      //save to the database
      peer.repository.addBlock(originBlock).then(result => {
        //set up the blockchain object
        const blockchain = new Blockchain({"latestblockid": originBlock.id, "latestblockindex": originBlock.index, "length":1})
        peer.setBlockchain(blockchain)
        
        //build a Block
        const transactions1 = [
        
        ]
        transactions1.push(new Transaction({'consignmentid':'cabcdefg','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
        transactions1.push(new Transaction({'consignmentid':'cabcdefh','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
        transactions1.push(new Transaction({'consignmentid':'cabcdefi','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
        
        const block1 = new Block({"previousHash":"abcdef","transactions":transactions1, "index":1})

        //invalidate the block
        block1.index = 10

        //serialise it

        const blockStr = block1.serialize()

        //build a message

        const addBlockMessage = new Message({peer:"127.0.0.1:4000", action:"addblock", data: blockStr})

        //process the received message
        peer.processReceivedMessage(addBlockMessage)
        .catch((error) => {
          expect(error).to.eql("block is invalid")
           peer.repository.deleteCollection('blocks').then(() => { //cleanup
              peer.repository.deleteCollection("transactionpool").then(()=> {
                done()
              })
            })
        })

        

      })



      
    })


  })
  
  it("should process a received 'addblock' message, throwing an error if the received block index is <= latest block index", (done) => {
    const peer = new Peer("127.0.0.1",3000, 3001,3002, new Repository(Levelupdb))
    peer.createCollections().then(() => {

       //add an origin block
      const originBlock = new Block({"previousHash": "-1", "transactions":[],"index":0})
      //save to the database
      peer.repository.addBlock(originBlock).then(result => {
        //set up the blockchain object
        const blockchain = new Blockchain({"latestblockid": originBlock.id, "latestblockindex": originBlock.index, "length":1})
        peer.setBlockchain(blockchain)
        
        //build a Block
        const transactions1 = [
        
        ]
        transactions1.push(new Transaction({'consignmentid':'cabcdefg','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
        transactions1.push(new Transaction({'consignmentid':'cabcdefh','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
        transactions1.push(new Transaction({'consignmentid':'cabcdefi','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
        
        const block1 = new Block({"previousHash":"abcdef","transactions":transactions1, "index":-1})

       

        //serialise it

        const blockStr = block1.serialize()

        //build a message

        const addBlockMessage = new Message({peer:"127.0.0.1:4000", action:"addblock", data: blockStr})

        //process the received message
        peer.processReceivedMessage(addBlockMessage)
        .catch((error) => {
          expect(error).to.eql("block index less than or equal to latest")
           peer.repository.deleteCollection('blocks').then(() => { //cleanup
              peer.repository.deleteCollection("transactionpool").then(()=> {
                done()
              })
            })
        })

        

      })



      
    })


  })

  it("should process a received 'addblock' message, throwing an error if the received block previousHash is not the hash of the latest block", (done) => {
    const peer = new Peer("127.0.0.1",3000, 3001,3002, new Repository(Levelupdb))
    peer.createCollections().then(() => {

       //add an origin block
      const originBlock = new Block({"previousHash": "-1", "transactions":[],"index":0})
      //save to the database
      peer.repository.addBlock(originBlock).then(result => {
        //set up the blockchain object
        const blockchain = new Blockchain({"latestblockid": originBlock.id, "latestblockindex": originBlock.index, "length":1})
        peer.setBlockchain(blockchain)
        
        //build a Block
        const transactions1 = [
        
        ]
        transactions1.push(new Transaction({'consignmentid':'cabcdefg','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
        transactions1.push(new Transaction({'consignmentid':'cabcdefh','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
        transactions1.push(new Transaction({'consignmentid':'cabcdefi','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
        
        const block1 = new Block({"previousHash":"abcdef","transactions":transactions1, "index":1})

       

        //serialise it

        const blockStr = block1.serialize()

        //build a message

        const addBlockMessage = new Message({peer:"127.0.0.1:4000", action:"addblock", data: blockStr})

        //process the received message
        peer.processReceivedMessage(addBlockMessage)
        .catch((error) => {
          expect(error).to.eql("block previousHash not hash of latest block")
           peer.repository.deleteCollection('blocks').then(() => { //cleanup
              peer.repository.deleteCollection("transactionpool").then(()=> {
                done()
              })
            })
        })

        

      })



      
    })


  })

  it("should process a received 'addblock' message, throwing an error if the received block index is greater than that of the next block. Should broadcast a 'sendblocks' message and change peer status", (done) => {
    const peer = new Peer("127.0.0.1",3000, 3001,3002, new Repository(Levelupdb))
    peer.createCollections().then(() => {

       //add an origin block
      const originBlock = new Block({"previousHash": "-1", "transactions":[],"index":0})
      //save to the database
      peer.repository.addBlock(originBlock).then(result => {
        //set up the blockchain object
        const blockchain = new Blockchain({"latestblockid": originBlock.id, "latestblockindex": originBlock.index, "length":1})
        peer.setBlockchain(blockchain)
        
        //build a Block
        const transactions1 = [
        
        ]
        transactions1.push(new Transaction({'consignmentid':'cabcdefg','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
        transactions1.push(new Transaction({'consignmentid':'cabcdefh','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
        transactions1.push(new Transaction({'consignmentid':'cabcdefi','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
        
        const block1 = new Block({"previousHash":"abcdef","transactions":transactions1, "index":2})

       

        //serialise it

        const blockStr = block1.serialize()

        //build a message

        const addBlockMessage = new Message({peer:"127.0.0.1:4000", action:"addblock", data: blockStr})

        const peerSpy = sinon.stub(peer, "broadcastMessage").callsFake(() => { return(true)})
        //process the received message
        peer.processReceivedMessage(addBlockMessage)
        .catch((error) => {
          expect(error).to.eql("block index greater than next index")
          expect(peer.getState()).to.eql("awaitingblockchain")
          expect(peerSpy.called).to.be.true
          expect(peerSpy.callCount).to.equal(1)
          expect(peerSpy.calledWith("sendblocks")).to.be.true
           peer.repository.deleteCollection('blocks').then(() => { //cleanup
              peer.repository.deleteCollection("transactionpool").then(()=> {
                done()
              })
            })
        })

        

      })



      
    })


  })

   it("should process a received 'addblock' message", (done) => {
    const peer = new Peer("127.0.0.1",3000, 3001,3002, new Repository(Levelupdb))
    peer.createCollections().then(() => {

       //add an origin block
      const originBlock = new Block({"previousHash": "-1", "transactions":[],"index":0})
      //save to the database
      peer.repository.addBlock(originBlock).then(result => {
        //set up the blockchain object
        const blockchain = new Blockchain({"latestblockid": originBlock.id, "latestblockindex": originBlock.index, "length":1})
        peer.setBlockchain(blockchain)
        
        //build a Block
        const transactions1 = [
        
        ]
        transactions1.push(new Transaction({'consignmentid':'cabcdefg','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
        transactions1.push(new Transaction({'consignmentid':'cabcdefh','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
        transactions1.push(new Transaction({'consignmentid':'cabcdefi','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
        
        const block1 = new Block({"previousHash":originBlock.id,"transactions":transactions1, "index":1})

       

        //serialise it

        const blockStr = block1.serialize()

        //build a message

        const addBlockMessage = new Message({peer:"127.0.0.1:4000", action:"addblock", data: blockStr})

        const peerSpy = sinon.stub(peer, "broadcastMessage").callsFake(() => { return(true)})
        //process the received message
        peer.processReceivedMessage(addBlockMessage)
        .then((resultingBlock) => {
          expect(resultingBlock).to.be.instanceof(Block)
          expect(peer.blockchain.getLatestBlockId()).to.eql(resultingBlock.id)
          expect(peer.blockchain.getLatestBlockIndex()).to.eql(resultingBlock.index)
          expect(peer.blockchain.getLength()).to.eql(2)
          //should be in the database
          peer.repository.getBlock(resultingBlock.id)
          .then((dbBlock) => {
            expect(dbBlock.id).to.eql(resultingBlock.id) //it's found
            peer.repository.deleteCollection('blocks').then(() => { //cleanup
              peer.repository.deleteCollection("transactionpool").then(()=> {
                done()
              })
            })
          })
          
        })
      

        

      })



      
    })


  })

  it("should process an incoming 'addtransaction' message, throwing an error if the data not a transaction", (done) => {
    const peer = new Peer("127.0.0.1",3000, 3001,3002, new Repository(Levelupdb))
    peer.createCollections().then(() => {
      

      const addTransactionMessage = new Message({peer:"127.0.0.1:4000", action:"addtransaction", data: "{\"some\":\"data\"}"})

       peer.processReceivedMessage(addTransactionMessage)
        .catch((error) => {

          expect(error).to.exist

          peer.repository.deleteCollection('blocks').then(() => { //cleanup
            peer.repository.deleteCollection("transactionpool").then(()=> {
              done()
            })
          })

        })

      

    })

  })

  it("should process an incoming 'addtransaction' message, throwing an error if the data is an invalid transaction", (done) => {
    const peer = new Peer("127.0.0.1",3000, 3001, 3002, new Repository(Levelupdb))
    peer.createCollections().then(() => {
      //create a transaction
      const transaction = new Transaction({'consignmentid':'cabcdefg','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey})
      //invalidate it
      transaction.consignmentid = 'cabcdefh'
      //serialize it
      const tStr = transaction.serialize()

      //create the message

      const addTransactionMessage = new Message({peer:"127.0.0.1:4000", action:"addtransaction", data: tStr})

       peer.processReceivedMessage(addTransactionMessage)
        .catch((error) => {

          expect(error).to.eql("transaction is invalid")

          peer.repository.deleteCollection('blocks').then(() => { //cleanup
            peer.repository.deleteCollection("transactionpool").then(()=> {
              done()
            })
          })

        })

      

    })

  })


  it("should process an incoming 'addtransaction' message", (done) => {
    const peer = new Peer("127.0.0.1",3000, 3001, 3002, new Repository(Levelupdb))
    peer.createCollections().then(() => {
      //create a transaction
      const transaction = new Transaction({'consignmentid':'cabcdefg','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey})
    
      const tid = transaction.id
      //serialize it
      const tStr = transaction.serialize()

      //create the message

      const addTransactionMessage = new Message({peer:"127.0.0.1:4000", action:"addtransaction", data: tStr})

       peer.processReceivedMessage(addTransactionMessage)
        .then((result) => {
          expect(result).to.be.instanceof(Transaction)
    
          //it should now be in the repository
          peer.repository.getTransaction(result.id)
          .then((trans) => {
            expect(trans.id).to.eql(result.id)
            //cleanup
            peer.repository.deleteCollection('blocks').then(() => { //cleanup
              peer.repository.deleteCollection("transactionpool").then(()=> {
                done()
              })
            })
            
          })

          
        })

      

    })

  })
})

describe("mining", () => {

  let app = null
  before((done) => {
    
     discoveryServer.startServer(3000, 3001).then(serv => {
      app = serv
      done()
    })
  })

  after((done) => {
      discoveryServer.getSwarm().destroy()
      app.close()
      app = null
      done()
      
    
  })

  it("should mine a new Block", (done) => {
   

    //create some transactions
    const transaction1 = new Transaction({'consignmentid':'cabcdefg','datatype':'application/json','data':{"some":"arbitrary","json":"data"},"publickey":publicKey})
    const transaction2 = new Transaction({'consignmentid':'cabcdefg','datatype':'application/json','data':{"someother":"arbitrary","json":"data"},"publickey":publicKey})

    const transactions = [transaction1, transaction2]
    //sets up a peer network

    const peer1 = new Peer("127.0.0.1",3000, 3001,3002, new Repository(Levelupdb))
    const peer2 = new Peer("127.0.0.1",3000, 3001, 3003, new Repository(Levelupdb))

    peer1.createCollections()
    .then(() => {
       peer1.setBlockchain(new Blockchain({"length": 1, "latestblockid": "-1","latestblockindex":0}))

        peer1.registerAsPeer().then(() => {

          peer2.registerAsPeer().then(() => {
            peer2.setupPeerNetwork(3003)
            .then(()=> {
             
                peer1.setupPeerNetwork(3002)
               .then(()=> {
                 
                  setTimeout(() =>{
                    
                    peer1.mineBlock(transactions)
                    .then((minedBlock) => {
                       expect(minedBlock).to.be.instanceof(Block)
                        expect(peer1.blockchain.getLatestBlockId()).to.eql(minedBlock.id)
                        expect(peer1.blockchain.getLatestBlockIndex()).to.eql(minedBlock.index)
                        setTimeout(() =>{
                         expect(peer2.messageQueue.length).to.eql(1)
                          peer1.topology.destroy()
                          peer2.topology.destroy()
                          done()
                        },100)
                    })
                    

                   
                   
                   
                  },100)
                

               })
            })
           
           

          })
        })

    })

   


  })
})

