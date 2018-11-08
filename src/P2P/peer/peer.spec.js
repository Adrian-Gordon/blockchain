'use strict'


const chai = require('chai')
const assert = chai.assert
const expect = chai.expect
const sinon = require('sinon')
const chaiAsPromised = require('chai-as-promised')
const should = chai.should()

chai.use(chaiAsPromised)

//const logger = require('../../logger/logger.js')(module)

const nconf = require('../../config/conf.js').nconf

const Peer = require('../peer').Peer

const discoveryServer = require('../discoveryServer/discoveryServer')

const Repository = require('../../repository/repository').Repository

const Levelupdb = require('../../database/leveldb/levelup').Levelupdb

const Transaction = require('../../transaction/transaction').Transaction

const Block = require('../../block/block').Block

const Message = require('../../message/message').Message

const Blockchain = require("../../blockchain/blockchain").Blockchain

const request = require('supertest')

const fs = require('fs')

const privateKey = fs.readFileSync(nconf.get('privatekeyurl'),'utf8')

const publicKey = fs.readFileSync(nconf.get('publickeyurl'),'utf8')

describe('Peer Instantiation', () => {

  after(() =>{
     Levelupdb.delete('transactionpool')
       .then(()=> {
       Levelupdb.delete('blocks')
        .then(() => {
           Levelupdb.delete('blockchain').then(() => {})
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

  it("throws an error if no peer webport is provided", (done) => {
    const fcn = function() {new Peer('discovery.server.url',3000, 3001,3002)}
    expect(fcn).to.throw(Error, "no peer port provided")
    done()
  })

  it("throws an error if an invalid peer port is provided", (done) => {
    const fcn = function() {new Peer('discovery.server.url',3000,3001,'aportno')}
    expect(fcn).to.throw(Error, "invalid peer port: 'aportno'")
    done()
  })

  it("throws an error if no repository is provided", (done) => {
    expect(() => new Peer('discovery.server.url',3000, 3001, 3002, 3003)).to.throw(Error,'no repository provided')

    done()
  })

  

  it("instantiates a Peer", (done) => {
    const peer = new Peer('127.0.0.1',3000, 3001, 3002, 3003, new Repository(Levelupdb))
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
    expect(peer.miningCountdownProcess).to.eql(null)
    expect(peer.transactionPoolSize).to.eql(0)
    done()
  })

  it("throws an error if setting a peer state to an invalid state", (done) =>{
    const peer = new Peer("127.0.0.1",3000, 3001, 3002, 3003,new Repository(Levelupdb))
    expect(() => peer.setState("somestate")).to.throw("invalid state: 'somestate'")
    done()
  })

  it("gets a peer state", (done) =>{
    const peer = new Peer("127.0.0.1",3000, 3001, 3002, 3003,new Repository(Levelupdb))
    expect(peer.state).to.eql("running")
    done()
  })

  it("sets a peer state", (done) =>{
    const peer = new Peer("127.0.0.1",3000, 3001, 3002, 3003,new Repository(Levelupdb))
    peer.setState("awaitingblockchain")
    expect(peer.getState()).to.eql("awaitingblockchain")
    done()
  })

  it("creates peer's repository collections", (done) => {
    const peer = new Peer("127.0.0.1",3000, 3001, 3002, 3003, new Repository(Levelupdb))
    peer.createCollections()
    .then(() => {
       Levelupdb.collections.should.have.property('transactionpool')
       Levelupdb.collections.should.have.property('blocks')
      Levelupdb.collections.should.have.property('blockchain')
       Levelupdb.collections.should.have.property('consignmentindex')
       Levelupdb.delete('transactionpool')
       .then(()=> {
       Levelupdb.delete('blocks')
        .then(() => {
           Levelupdb.delete('blockchain').then(() => {
             Levelupdb.delete('consignmentindex').then(() => {
              done()
             })
           })
        })

       })
     
     
    })

  })

  it("deletes peer's repository collections", (done) => {
    const peer = new Peer("127.0.0.1",3000, 3001, 3002, 3003, new Repository(Levelupdb))
    peer.createCollections()
    .then(() => {
          peer.deleteCollections()
          .then(() => {
            Levelupdb.collections.should.not.have.property('transactionpool')
            Levelupdb.collections.should.not.have.property('blocks')
            Levelupdb.collections.should.not.have.property('blockchain')
            Levelupdb.collections.should.not.have.property('consignmentindex')
            done()
          })
    })

  })



  it("fails if setBlockchain is called with an argument that is not of class Blockchain", (done) => {
    const peer = new Peer("127.0.0.1",3000, 3001,3002, 3003, new Repository(Levelupdb))

    peer.createCollections()
    .then(() => {
      peer.setBlockchain("a string")
      .catch((error) => {
          expect(error).to.eql("setBlockchain must take an argument of type Blockchain")
          
          peer.deleteCollections()
          .then(() => {
            done()
          })
    })
    

    })
  })

  it("sets the blockchain property of a peer", (done) => {
    const peer = new Peer("127.0.0.1",3000, 3001, 3002, 3003, new Repository(Levelupdb))
    const blockchain = new Blockchain({"length": 10, "latestblockid": "abcdef","latestblockindex":10})
    peer.createCollections()
    .then(() => {
      peer.setBlockchain(blockchain)
      .then((blockchain) => {
          expect(peer.getBlockchain()).to.eql(blockchain)
          peer.repository.getBlockchain("blockchain")
          .then((bc) => {
            expect(bc.getLength()).to.eql(10)
            expect(bc.getLatestBlockId()).to.eql("abcdef")
            expect(bc.getLatestBlockIndex()).to.eql(10)
             peer.deleteCollections()
            .then(() => {
                done()
              })
          })

      })
      .catch(error => {
        console.log(error)
      })

     

    })
    
  })

   it("reads a peer's blockchain from the repository, if it exists", (done) => {
    const peer = new Peer("127.0.0.1",3000, 3001, 3002,3003,  new Repository(Levelupdb))
    peer.repository.createCollection("blockchain")
    .then((r) => {
     
      const blockchain = new Blockchain({"length": 20, "latestblockid": "xxxxx","latestblockindex":30})
      peer.setBlockchain(blockchain)
      .then((bc) => {
        
        peer.repository.db.close('blockchain')
        .then((cbc)=> {
          
          const peer2 = new Peer("127.0.0.1",3000, 3001, 3004,3005, new Repository(Levelupdb))
          peer2.repository.createCollection("blockchain")
          .then(() => {
            peer2.readBlockchain()
            .then((bcnow) => {
               peer2.repository.db.close('blockchain')
              
              const peerBc = peer2.getBlockchain()
              expect(peerBc.getLength()).to.eql(20)
              expect(peerBc.getLatestBlockId()).to.eql("xxxxx")
              expect(peerBc.getLatestBlockIndex()).to.eql(30)
              done()
            })
          })
          
          
        })
      })
    })
    
  })

 

  it("should throw an error when trying to read a peers's blockchain record from the repository, if it doesn't exist", (done) => {
    const peer = new Peer("127.0.0.1",3000, 3001, 3002, 3003,new Repository(Levelupdb))
    peer.repository.deleteCollection("blockchain")
    .then(()=> {
      peer.repository.createCollection("blockchain")
      .then(() => {
        peer.readBlockchain()
       
        .catch((error) => {
          
         expect(error.status).to.eql(404)
          peer.repository.db.close('blockchain')
           .then(() => {
            done()
           })

        })
      })
    })
      
    
  }) 

  it("gets the blockchain property of the peer", (done) => {
    const peer = new Peer("127.0.0.1",3000, 3001, 3002, 3003, new Repository(Levelupdb))
    peer.createCollections()
    .then(() => {
        const blockchain = new Blockchain({"length": 10, "latestblockid": "abcdef","latestblockindex":20})
        peer.setBlockchain(blockchain)
        .then((bc) => {
          expect(peer.getBlockchain()).to.be.instanceof(Blockchain)
          peer.deleteCollections()
          .then(() => {
            done()
          })
          
        })
        .catch(error => {
          console.log(error)
        })
  
    })
    
  })

  it("throws and error if the peer cannot retrieve a list of peers from the discovery server", (done) => {
    const peer = new Peer("127.0.0.1",3000, 3001, 3002, 3003, new Repository(Levelupdb))

    peer.getPeers().catch((error) => {
      error.should.eql("cannot retrieve list of peers from discovery server")
      done()
    })

    

  })

  it("sets the transaction pool size of a peer", (done) => {
    const peer = new Peer("127.0.0.1",3000, 3001, 3002, 3003, new Repository(Levelupdb))
    expect(peer.setTransactionPoolSize(100)).to.eql(100)

    expect(peer.transactionPoolSize).to.eql(100)
    done()

  })

  it("gets the transaction pool size of a peer", (done) => {
    const peer = new Peer("127.0.0.1",3000, 3001, 3002, 3003, new Repository(Levelupdb))
    peer.setTransactionPoolSize(100)
    expect(peer.getTransactionPoolSize()).to.eql(100)

    
    done()

  })

  it("sets the transaction pool threshold of a peer", (done) => {
    const peer = new Peer("127.0.0.1",3000, 3001, 3002, 3003, new Repository(Levelupdb))
    expect(peer.setTransactionPoolThreshold(1000)).to.eql(1000)

    expect(peer.transactionPoolThreshold).to.eql(1000)
    done()

  })

  it("gets the transaction pool threshold of a peer", (done) => {
    const peer = new Peer("127.0.0.1",3000, 3001, 3002, 3003,  new Repository(Levelupdb))
    peer.setTransactionPoolThreshold(1000)
    expect(peer.getTransactionPoolThreshold()).to.eql(1000)

    
    done()

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
    const peer = new Peer("127.0.0.1",3000, 3001, 3002, 3003,new Repository(Levelupdb))

    peer.getPeers().then((peers) => {
      peers.should.be.instanceof(Object)
      done()
    })

  })

  it("registers as a peer", (done) => {
    const peer = new Peer("127.0.0.1",3000, 3001,3002, 3003,new Repository(Levelupdb))
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
    const peer = new Peer("127.0.0.1",3000, 3001,3002, 3003,new Repository(Levelupdb))

    const status = peer.getStatus()
    status.status.should.eql('OK')
    expect(status.uptime).to.be.a('number')
    done()

    

  })

  it("sets up peer network", (done) => {
    const peer1 = new Peer("127.0.0.1",3000, 3001,3002, 3003,new Repository(Levelupdb))
    const peer2 = new Peer("127.0.0.1",3000, 3001, 3004, 3005, new Repository(Levelupdb))

   

    peer1.registerAsPeer().then(() => {

      peer2.registerAsPeer().then(() => {
        peer2.setupPeerNetwork()
        .then(()=> {
         
            peer1.setupPeerNetwork()
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
    const peer1 = new Peer("127.0.0.1",3000, 3001,3002, 3003,new Repository(Levelupdb))
    const peer2 = new Peer("127.0.0.1",3000, 3001,3004, 3005, new Repository(Levelupdb))

    peer1.registerAsPeer().then(() => {

      peer2.registerAsPeer().then(() => {
        peer2.setupPeerNetwork()
        .then(()=> {
         
            peer1.setupPeerNetwork()
           .then(()=> { 
              setTimeout(() =>{
              
                peer1.endConnection("127.0.0.1:3004")
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
    const peer1 = new Peer("127.0.0.1",3000, 3001,3002, 3003, new Repository(Levelupdb))
    const peer2 = new Peer("127.0.0.1",3000, 3001, 3004, 3005, new Repository(Levelupdb))

    peer1.registerAsPeer().then(() => {

      peer2.registerAsPeer().then(() => {
        peer2.setupPeerNetwork()
        .then(()=> {
         
            peer1.setupPeerNetwork()
           .then(()=> { 
              setTimeout(() =>{
                expect(() => peer1.endConnection("127.0.0.1:3006")).to.throw(Error, "no connection to peer: '127.0.0.1:3006'")
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
    const peer1 = new Peer("127.0.0.1",3000, 3001, 3002, 3003, new Repository(Levelupdb))
    const peer2 = new Peer("127.0.0.1",3000, 3001, 3004, 3005, new Repository(Levelupdb))

    peer1.registerAsPeer().then(() => {

      peer2.registerAsPeer().then(() => {
        peer2.setupPeerNetwork()
        .then(()=> {
         
            peer1.setupPeerNetwork()
           .then(()=> { 
              setTimeout(() =>{
                expect(peer2.messageQueue.length).to.eql(0)
                peer1.sendMessage("127.0.0.1:3004",'ping')
                
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

   it("processes a private message received from another peer",(done) => {
    const peer1 = new Peer("127.0.0.1",3000, 3001, 3002,3003, new Repository(Levelupdb))
    const peer2 = new Peer("127.0.0.1",3000, 3001, 3004, 3005, new Repository(Levelupdb))
   // const peerSpy = sinon.stub(peer2, "processReceivedMessage").callsFake(() => {
   //   return(true)
  //  })
  const peerSpy = sinon.stub(peer2, "processReceivedMessage").resolves("OK")

    peer1.registerAsPeer().then(() => {

      peer2.registerAsPeer().then(() => {
        peer2.setupPeerNetwork()
        .then(()=> {
         
            peer1.setupPeerNetwork()
           .then(()=> { 
              peer2.listen(500)
              setTimeout(() =>{
                expect(peer2.messageQueue.length).to.eql(0)
                peer1.sendMessage("127.0.0.1:3004",'ping')
                
                setTimeout(() => {
                  expect(peer2.messageQueue.length).to.eql(0)
                 // expect(peerSpy.called).to.be.true
                  peer1.topology.destroy()
                  peer2.topology.destroy()
                  peer2.stopListening()
                  done()

                }, 1000)
                
              },100)
           

           })
        })
       
       

      })
    })

  })

  it("throws an error when trying to send a private message to a non-existant peer",(done) => {
    const peer1 = new Peer("127.0.0.1",3000, 3001, 3002, 3003,new Repository(Levelupdb))
    const peer2 = new Peer("127.0.0.1",3000,3001,  3004,3005, new Repository(Levelupdb))

    peer1.registerAsPeer().then(() => {

      peer2.registerAsPeer().then(() => {
        peer2.setupPeerNetwork()
        .then(()=> {
         
            peer1.setupPeerNetwork()
           .then(()=> { 
              setTimeout(() =>{
                expect(peer2.messageQueue.length).to.eql(0)
               
                expect(() =>  peer1.sendMessage("127.0.0.1:3006",'ping')).to.throw(Error, "no connection to peer: '127.0.0.1:3006'")
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
    const peer1 = new Peer("127.0.0.1",3000, 3001,3002,3003, new Repository(Levelupdb))
    const peer2 = new Peer("127.0.0.1",3000, 3001,3004,3005, new Repository(Levelupdb))
    const peer3 = new Peer("127.0.0.1",3000, 3001,3006, 3007, new Repository(Levelupdb))

    const peers = [peer1, peer2, peer3]

    const registerPromises = peers.map((peer) => {
      return peer.registerAsPeer()
    })

    Promise.all(registerPromises)
    .then(() => {
      //console.log("all registered")
      let peerSetups = []
      peerSetups.push(peer1.setupPeerNetwork())
      peerSetups.push(peer2.setupPeerNetwork())
      peerSetups.push(peer3.setupPeerNetwork())

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
     peer = new Peer("127.0.0.1",3000, 3001,3002, 3003,new Repository(Levelupdb))
     peer.createCollections().then(() => {
      done()

      
     })

  })

  afterEach((done) => {
    peer.deleteCollections().then(() => {done()})

  })

  it("should throw an error when asked to add a non-transaction object", (done) => {
     peer.addTransaction("trans1").catch(error=> {
        expect(error).to.eql("transaction must be of class Transaction")
        done()
      })
  })

  it("should throw an error when asked to add an invalid transaction", (done) => {

    const transaction = new Transaction({'consignmentid':'cabcdefi','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey})

      transaction.consignmentid = "cabcdefj" //invalidate it
      peer.addTransaction(transaction).catch(error => {
        expect(error).to.eql("transaction is invalid")
        done()
      })
  })

  it("should add a new transaction", (done) => {

    const transaction = new Transaction({'consignmentid':'cabcdefi','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey})

    const originalTransactionPoolSize = peer.getTransactionPoolSize()
    const transactionSize = transaction.getSize()
      peer.addTransaction(transaction)
      .then((result) => {
        expect(result).to.be.instanceof(Transaction)
        expect(result.id).to.eql(transaction.id)
        expect(peer.getTransactionPoolSize()).to.eql(originalTransactionPoolSize + transactionSize)
        peer.repository.getTransaction(transaction.id)
        .then((trans) => {
          expect(trans.id).to.eql(transaction.id)
          done()
        })

       

      })
      
  })

  it("should return the total size of the repository transaction pool", (done) => {

    const transaction1 = new Transaction({'consignmentid':'cabcdefi','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey})
    const transaction2 = new Transaction({'consignmentid':'cabcdefi','transactiontype':'despatched','data':{"somemore":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey})
    const transaction3 = new Transaction({'consignmentid':'cabcdefi','transactiontype':'despatched','data':{"evenmore":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey})
  
    const promises = [peer.addTransaction(transaction1),peer.addTransaction(transaction2),peer.addTransaction(transaction3)]
     
     Promise.all(promises)
     .then(() => {
      peer.getRepositoryTransactionPoolSize()
      .then(result => {
        (typeof result).should.eql('number')
        done()
      })
      

     })
      
      
  })

  it("should remove transactions", (done) => {

    const transaction1 = new Transaction({'consignmentid':'cabcdefi','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey})
    const transaction2 = new Transaction({'consignmentid':'cabcdefi','transactiontype':'despatched','data':{"somemore":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey})
    const transaction3 = new Transaction({'consignmentid':'cabcdefi','transactiontype':'despatched','data':{"evenmore":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey})
  
    const promises = [peer.addTransaction(transaction1),peer.addTransaction(transaction2),peer.addTransaction(transaction3)]
     
     Promise.all(promises)
     .then(() => {
      peer.removeTransactions([transaction1.id,transaction2.id,"feefifo"])
      .then(result => {
        peer.repository.getTransaction(transaction1.id)
        .catch(() => { //should have thrown an error
          peer.repository.getTransaction(transaction2.id)
          .catch(() => { //should have thrown an error
            peer.repository.getTransaction(transaction3.id)
            .then(result => {
              expect(result.id).to.eql(transaction3.id)
              done()
            })
          })
          
        })
        
      })
      

     })
      
      
  })

   it("should gather transactions", (done) => {

    const transaction1 = new Transaction({'consignmentid':'cabcdefi','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey})
    const transaction2 = new Transaction({'consignmentid':'cabcdefi','transactiontype':'despatched','data':{"somemore":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey})
    const transaction3 = new Transaction({'consignmentid':'cabcdefi','transactiontype':'despatched','data':{"evenmore":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey})
  
    const promises = [peer.addTransaction(transaction1),peer.addTransaction(transaction2),peer.addTransaction(transaction3)]
     
     Promise.all(promises)
     .then(() => {
      peer.gatherTransactions(2000)
      .then(result => {
        expect(result.length).to.eql(1)
        done()
      })
      

     })
      
      
  })

  it("should start the mining countdown process when adding a transaction that takes the transaction pool size over a threshold", (done) => {
   
    const peerSpy = sinon.stub(peer, "startMiningCountdownProcess").callsFake(() => {
      return(true)
    })
    peer.setTransactionPoolThreshold(4000)
    peer.monitorTransactionPool(10)

    const transaction1 = new Transaction({'consignmentid':'cabcdefi','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey})
    const transaction2 = new Transaction({'consignmentid':'cabcdefi','transactiontype':'despatched','data':{"somemore":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey})
    const transaction3 = new Transaction({'consignmentid':'cabcdefi','transactiontype':'despatched','data':{"evenmore":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey})
  
    const promises = [peer.addTransaction(transaction1),peer.addTransaction(transaction2),peer.addTransaction(transaction3)]
     
     Promise.all(promises)
     .then(() => {
      const transaction4 = new Transaction({'consignmentid':'cabcdefi','transactiontype':'despatched','data':{"yetmore":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey})
      peer.addTransaction(transaction4)
      .then(() => {
          setTimeout(()=> {   //wait for the mintoring task to cath up
            expect(peerSpy.calledWith(nconf.get("minimumminingcountdown"),nconf.get("defaultminingcountdown"))).to.be.true
            peer.stopMonitoringTransactions()
            done()
          }, 100)
         
      })

     })
  })

})

describe("Peer block indexing", () => {
  let peer = null
  before((done) => {
     peer = new Peer("127.0.0.1",3000, 3001, 3002, 3003,new Repository(Levelupdb))
     peer.createCollections().then(() => {
      done()

      
     })

  })

  after((done) => {
    peer.deleteCollections().then(() => {done()})

  })

  it("should create a new index entry", (done) => {

    peer.indexBlock({id:"Babcdefg"},"Cabcdefg")
    .then(()=> {
      peer.repository.getConsignmentIndex("Cabcdefg")
      .then((res) => {
         expect(res.blockids).to.include("Babcdefg")
         expect(res.blockids.length).to.eql(1)
         done()
      })
    })


  })
   it("should add to an existing index entry", (done) => {

    peer.indexBlock({id:"Babcdefh"},"Cabcdefg")
    .then(()=> {
      peer.repository.getConsignmentIndex("Cabcdefg")
      .then((res) => {
       
         expect(res.blockids).to.include.members(["Babcdefg","Babcdefh"])
         expect(res.blockids.length).to.eql(2)
         done()
      })
    })


  })
   it("should not add to an existing index entry if the blockid is already indexed", (done) => {

    peer.indexBlock({id:"Babcdefh"},"Cabcdefg")
    .then(()=> {
      peer.repository.getConsignmentIndex("Cabcdefg")
      .then((res) => {
        
         expect(res.blockids).to.include.members(["Babcdefg","Babcdefh"])
         expect(res.blockids.length).to.eql(2)
         done()
      })
    })


  })
})

describe("Peer block processing", () => {
  let peer = null
  beforeEach((done) => {
     peer = new Peer("127.0.0.1",3000, 3001, 3002,3003, new Repository(Levelupdb))
     peer.createCollections().then(() => {
      //add an origin block
      const originBlock = new Block({"previousHash": "-1", "transactions":[],"index":0})
      //save to the database
      peer.repository.addBlock(originBlock).then(result => {
        //set up the blockchain object
        const blockchain = new Blockchain({"latestblockid": originBlock.id, "latestblockindex": originBlock.index, "length":1})
        peer.setBlockchain(blockchain)
        .then(() => {
           done()
        })
       
      })

      
     })

  })

  afterEach((done) => {
    peer.deleteCollections().then(() => {done()})

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
      transactions1.push(new Transaction({'consignmentid':'cabcdefg','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
      transactions1.push(new Transaction({'consignmentid':'cabcdefh','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
      transactions1.push(new Transaction({'consignmentid':'cabcdefi','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
      
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
      transactions1.push(new Transaction({'consignmentid':'cabcdefg','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
      transactions1.push(new Transaction({'consignmentid':'cabcdefh','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
      transactions1.push(new Transaction({'consignmentid':'cabcdefi','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
      
      const block1 = new Block({"previousHash":peer.blockchain.getLatestBlockId(),"transactions":transactions1, "index":-1})

       peer.addBlock(block1).catch(error => {
        expect(error).to.eql("block index less than or equal to latest")
        done()
      })
      

  
  })

  it("should throw an error when asked to add a block with a previous hash that is not the current value for the latest block id", (done) => {
    
      const transactions1 = [
        
      ]
      transactions1.push(new Transaction({'consignmentid':'cabcdefg','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
      transactions1.push(new Transaction({'consignmentid':'cabcdefh','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
      transactions1.push(new Transaction({'consignmentid':'cabcdefi','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
      
      const block1 = new Block({"previousHash":"abcde","transactions":transactions1, "index":1})

      peer.addBlock(block1).catch(error => {
        expect(error).to.eql("block previousHash not hash of latest block")
        done()
      })

  
  })

  it("should throw an error when asked to add a block with an index greater than 1+ the current value for next index ", (done) => {
    
      const transactions1 = [
        
      ]
      transactions1.push(new Transaction({'consignmentid':'cabcdefg','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
      transactions1.push(new Transaction({'consignmentid':'cabcdefh','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
      transactions1.push(new Transaction({'consignmentid':'cabcdefi','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
      
      const block1 = new Block({"previousHash":peer.blockchain.getLatestBlockId(),"transactions":transactions1, "index":2})


      peer.addBlock(block1).catch(error => {
        expect(error).to.eql("block index greater than next index")
        done()
      })

  
  })
  it("should add a new block to the database, update the blockchain object, remove the block's transactions from the transactionsPool, and index the transactions by consignmentid", (done) => {
    
      const transactions1 = [
        
      ]
      transactions1.push(new Transaction({'consignmentid':'cabcdefg','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
      transactions1.push(new Transaction({'consignmentid':'cabcdefh','transactiontype':'despatched','data':{"somemore":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
      transactions1.push(new Transaction({'consignmentid':'cabcdefg','transactiontype':'despatched','data':{"yetmore":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
      
      const remainingTransaction = new Transaction({'consignmentid':'cabcdefj','transactiontype':'despatched','data':{"stillyetmore":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey})      //add transactions to the transactionPool

      const promises = transactions1.map((trans) => {
        return peer.addTransaction(trans)
      })

      Promise.all(promises)
      .then(() => {
         
         return peer.getRepositoryTransactionPoolSize()
         
      })
      .then((size)=> {
          
          return peer.addTransaction(remainingTransaction)
      })
      .then(() => {
        
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
            //check that only the remaining transaction is left
            peer.repository.getTransaction(remainingTransaction.id)
            .then((rt) => {
              expect(rt.id).to.eql(remainingTransaction.id) // transaction should be still there
              //but none of the others
              peer.repository.getAllTransactions()
              .then(transactions => {
                expect(transactions.length).to.eql(1) //remaining transaction 
                //block should hve been indexed
                peer.repository.getConsignmentIndex("cabcdefg")
                .then(consignmentIndex => {
                  consignmentIndex.blockids
                  expect(consignmentIndex.blockids).to.include(blk.id)
                  peer.repository.getConsignmentIndex("cabcdefh")
                  .then(consignmentIndex => {
                    consignmentIndex.blockids
                    expect(consignmentIndex.blockids).to.include(blk.id)
                    done()
                  })
                })
                
              })
              
            })

            
          })
          
        })
        .catch(error => {
          console.log("error: " + error)
          done()
        })

      })

      
      

  
  })

})

describe("Input Message Processing", () => {

  
  it("should throw an error when trying to push a non-message on to the message queue", (done) => {
    const peer1 = new Peer("127.0.0.1",3000, 3001,3002, 3003, new Repository(Levelupdb))
    const message ={"action":"ping"}
    expect(() => peer1.pushMessage(message)).to.throw(Error, "pushMessage requires a parameter of type message")
    
    done()
  })
  it("should push a message on to the end of the message queue", (done) => {
    const peer = new Peer("127.0.0.1",3000, 3001,3002, 3003,new Repository(Levelupdb))
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
    const peer = new Peer("127.0.0.1",3000, 3001,3002, 3003, new Repository(Levelupdb))
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
    const peer = new Peer("127.0.0.1",3000, 3001,3002,3003, new Repository(Levelupdb))
    
    const nextMessage = peer.popMessage()
    expect(nextMessage).to.be.undefined
    expect(peer.messageQueue.length).to.eql(0)
     
    done()
  })

  it("should process a received 'ping' message", (done) => {
    const peer = new Peer("127.0.0.1",3000,3001, 3002, 3003, new Repository(Levelupdb))
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
    const peer = new Peer("127.0.0.1",3000, 3001,3002, 3003, new Repository(Levelupdb))
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
    const peer = new Peer("127.0.0.1",3000, 3001,3002,3003,new Repository(Levelupdb))
    const blockchain = new Blockchain({"length": 10, "latestblockid": "abcdef","latestblockindex": 20})
    peer.createCollections()
    .then(() => {
       peer.setBlockchain(blockchain)
      .then(() => {
        const sendblockchainLengthMessage = new Message({peer:"127.0.0.1:4000", action:"sendblockchainlength"})

        const peerSpy = sinon.stub(peer, "sendMessage").callsFake(() => {return(true)})

        peer.processReceivedMessage(sendblockchainLengthMessage).then(() => {
          expect(peerSpy.called).to.be.true
          expect(peerSpy.callCount).to.equal(1)
          expect(peerSpy.calledWith("127.0.0.1:4000","blockchainlength","10")).to.be.true
          peer.deleteCollections().then(() => {
            done()
          })
        })
        .catch(error => {
          console.log(error)
        })

      })
      .catch(error => {
        console.log(error)
      })
    })
    .catch(error => {
        console.log(error)
      })



    
  })

  it("should process a received 'sendblocks' message", (done) => {
    const peer = new Peer("127.0.0.1",3000, 3001,3002,3003, new Repository(Levelupdb))
    peer.createCollections().then(() => {
      const transactions1 = [
        
      ]
      transactions1.push(new Transaction({'consignmentid':'cabcdefg','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
      transactions1.push(new Transaction({'consignmentid':'cabcdefh','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
      transactions1.push(new Transaction({'consignmentid':'cabcdefi','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
      
      const block1 = new Block({"previousHash":"abcdef","transactions":transactions1, "index":1})

      const transactions2 = [
        
      ]
      transactions2.push(new Transaction({'consignmentid':'cabcdefg','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
      transactions2.push(new Transaction({'consignmentid':'cabcdefh','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
      transactions2.push(new Transaction({'consignmentid':'cabcdefi','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
      
      const block2 = new Block({"previousHash":block1.id,"transactions":transactions2, "index":2})

      const transactions3 = [
        
      ]
      transactions3.push(new Transaction({'consignmentid':'cabcdefg','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
      transactions3.push(new Transaction({'consignmentid':'cabcdefh','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
      transactions3.push(new Transaction({'consignmentid':'cabcdefi','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
      
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
            peer.deleteCollections().then(() => {done()})
            
        })

       
      

    })

    })
  })

   it("should process a received 'addblock' message, throwing an error if the received data is not a block", (done) => {
    const peer = new Peer("127.0.0.1",3000, 3001,3002, 3003, new Repository(Levelupdb))
    peer.createCollections().then(() => {

       //add an origin block
      const originBlock = new Block({"previousHash": "-1", "transactions":[],"index":0})
      //save to the database
      peer.repository.addBlock(originBlock).then(result => {
        //set up the blockchain object
        const blockchain = new Blockchain({"latestblockid": originBlock.id, "latestblockindex": originBlock.index, "length":1})
        peer.setBlockchain(blockchain)
        .then(() => {
          //build a message

          const addBlockMessage = new Message({peer:"127.0.0.1:4000", action:"addblock", data: "{\"some\":\"data\"}"})

          //process the received message
          peer.processReceivedMessage(addBlockMessage)
          .catch((error) => {
            expect(error).to.exist
             peer.deleteCollections().then(() => {done()})
          })

        })
        
      

        

      })



      
    })


  })

  it("should process a received 'addblock' message, throwing an error if the received block is invalid", (done) => {
    const peer = new Peer("127.0.0.1",3000, 3001,3002,3003, new Repository(Levelupdb))
    peer.createCollections().then(() => {

       //add an origin block
      const originBlock = new Block({"previousHash": "-1", "transactions":[],"index":0})
      //save to the database
      peer.repository.addBlock(originBlock).then(result => {
        //set up the blockchain object
        const blockchain = new Blockchain({"latestblockid": originBlock.id, "latestblockindex": originBlock.index, "length":1})
        peer.setBlockchain(blockchain)
        .then(() => {
                    //build a Block
            const transactions1 = [
            
            ]
            transactions1.push(new Transaction({'consignmentid':'cabcdefg','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
            transactions1.push(new Transaction({'consignmentid':'cabcdefh','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
            transactions1.push(new Transaction({'consignmentid':'cabcdefi','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
            
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
               peer.deleteCollections().then(() => {done()})
            })

            

        })

      })
        




      
    })


  })
  
  it("should process a received 'addblock' message, throwing an error if the received block index is <= latest block index", (done) => {
    const peer = new Peer("127.0.0.1",3000, 3001,3002,3003, new Repository(Levelupdb))
    peer.createCollections().then(() => {

       //add an origin block
      const originBlock = new Block({"previousHash": "-1", "transactions":[],"index":0})
      //save to the database
      peer.repository.addBlock(originBlock).then(result => {
        //set up the blockchain object
        const blockchain = new Blockchain({"latestblockid": originBlock.id, "latestblockindex": originBlock.index, "length":1})
        peer.setBlockchain(blockchain)
        .then(() => {

                    //build a Block
              const transactions1 = [
              
              ]
              transactions1.push(new Transaction({'consignmentid':'cabcdefg','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
              transactions1.push(new Transaction({'consignmentid':'cabcdefh','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
              transactions1.push(new Transaction({'consignmentid':'cabcdefi','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
              
              const block1 = new Block({"previousHash":"abcdef","transactions":transactions1, "index":-1})

             

              //serialise it

              const blockStr = block1.serialize()

              //build a message

              const addBlockMessage = new Message({peer:"127.0.0.1:4000", action:"addblock", data: blockStr})

              //process the received message
              peer.processReceivedMessage(addBlockMessage)
              .catch((error) => {
                expect(error).to.eql("block index less than or equal to latest")
                 peer.deleteCollections().then(() => {done()})
              })

              

            })


        })
        



      
    })


  })

  it("should process a received 'addblock' message, throwing an error if the received block previousHash is not the hash of the latest block", (done) => {
    const peer = new Peer("127.0.0.1",3000, 3001,3002, 3003, new Repository(Levelupdb))
    peer.createCollections().then(() => {

       //add an origin block
      const originBlock = new Block({"previousHash": "-1", "transactions":[],"index":0})
      //save to the database
      peer.repository.addBlock(originBlock).then(result => {
        //set up the blockchain object
        const blockchain = new Blockchain({"latestblockid": originBlock.id, "latestblockindex": originBlock.index, "length":1})
        peer.setBlockchain(blockchain)
        .then(() => {
                    //build a Block
            const transactions1 = [
            
            ]
            transactions1.push(new Transaction({'consignmentid':'cabcdefg','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
            transactions1.push(new Transaction({'consignmentid':'cabcdefh','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
            transactions1.push(new Transaction({'consignmentid':'cabcdefi','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
            
            const block1 = new Block({"previousHash":"abcdef","transactions":transactions1, "index":1})

           

            //serialise it

            const blockStr = block1.serialize()

            //build a message

            const addBlockMessage = new Message({peer:"127.0.0.1:4000", action:"addblock", data: blockStr})

            //process the received message
            peer.processReceivedMessage(addBlockMessage)
            .catch((error) => {
              expect(error).to.eql("block previousHash not hash of latest block")
               peer.deleteCollections().then(() => {done()})
            })

            

          })


        })
        




      
    })


  })

  it("should process a received 'addblock' message, throwing an error if the received block index is greater than that of the next block. Should broadcast a 'sendblocks' message and change peer status", (done) => {
    const peer = new Peer("127.0.0.1",3000, 3001,3002, 3003,new Repository(Levelupdb))
    peer.createCollections().then(() => {

       //add an origin block
      const originBlock = new Block({"previousHash": "-1", "transactions":[],"index":0})
      //save to the database
      peer.repository.addBlock(originBlock).then(result => {
        //set up the blockchain object
        const blockchain = new Blockchain({"latestblockid": originBlock.id, "latestblockindex": originBlock.index, "length":1})
        peer.setBlockchain(blockchain)
        .then(() => {
                    //build a Block
              const transactions1 = [
              
              ]
              transactions1.push(new Transaction({'consignmentid':'cabcdefg','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
              transactions1.push(new Transaction({'consignmentid':'cabcdefh','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
              transactions1.push(new Transaction({'consignmentid':'cabcdefi','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
              
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
                 peer.deleteCollections().then(() => {done()})
              })

        })
        


        

      })



      
    })


  })

   it("should process a received 'addblock' message", (done) => {
    const peer = new Peer("127.0.0.1",3000, 3001,3002, 3003, new Repository(Levelupdb))
    peer.createCollections().then(() => {

       //add an origin block
      const originBlock = new Block({"previousHash": "-1", "transactions":[],"index":0})
      //save to the database
      peer.repository.addBlock(originBlock).then(result => {
        //set up the blockchain object
        const blockchain = new Blockchain({"latestblockid": originBlock.id, "latestblockindex": originBlock.index, "length":1})
        peer.setBlockchain(blockchain)
        .then(() => {
                    //build a Block
            const transactions1 = [
            
            ]
            transactions1.push(new Transaction({'consignmentid':'cabcdefg','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
            transactions1.push(new Transaction({'consignmentid':'cabcdefh','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
            transactions1.push(new Transaction({'consignmentid':'cabcdefi','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
            
            const block1 = new Block({"previousHash":originBlock.id,"transactions":transactions1, "index":1})

           

            //serialise it

            const blockStr = block1.serialize()

            //build a message

            const addBlockMessage = new Message({peer:"127.0.0.1:4000", action:"addblock", data: blockStr})

            
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
                peer.deleteCollections().then(() => {done()})
              })
              
            })

        })
        

      

        

      })



      
    })


  })

  it("should process an incoming 'addtransaction' message, throwing an error if the data not a transaction", (done) => {
    const peer = new Peer("127.0.0.1",3000, 3001,3002, 3003,new Repository(Levelupdb))
    peer.createCollections().then(() => {
      

      const addTransactionMessage = new Message({peer:"127.0.0.1:4000", action:"addtransaction", data: "{\"some\":\"data\"}"})

       peer.processReceivedMessage(addTransactionMessage)
        .catch((error) => {

          expect(error).to.exist

          peer.deleteCollections().then(() => {done()})

        })

      

    })

  })

  it("should process an incoming 'addtransaction' message, throwing an error if the data is an invalid transaction", (done) => {
    const peer = new Peer("127.0.0.1",3000, 3001, 3002, 3003, new Repository(Levelupdb))
    peer.createCollections().then(() => {
      //create a transaction
      const transaction = new Transaction({'consignmentid':'cabcdefg','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey})
      //invalidate it
      transaction.consignmentid = 'cabcdefh'
      //serialize it
      const tStr = transaction.serialize()

      //create the message

      const addTransactionMessage = new Message({peer:"127.0.0.1:4000", action:"addtransaction", data: tStr})

       peer.processReceivedMessage(addTransactionMessage)
        .catch((error) => {

          expect(error).to.eql("transaction is invalid")

          peer.deleteCollections().then(() => {done()})

        })

      

    })

  })


  it("should process an incoming 'addtransaction' message", (done) => {
    const peer = new Peer("127.0.0.1",3000, 3001, 3002, 3003, new Repository(Levelupdb))
    peer.createCollections().then(() => {
      //create a transaction
      const transaction = new Transaction({'consignmentid':'cabcdefg','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey})
    
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
            peer.deleteCollections().then(() => {done()})
            
          })

          
        })

      

    })

  })

  it("should ignore an incoming message if it is not 'blocks' and the peer state is 'awaitingblockchain'", (done) => {
    const peer = new Peer("127.0.0.1",3000, 3001, 3002,3003, new Repository(Levelupdb))
    peer.setState("awaitingblockchain")
    peer.createCollections().then(() => {
      //create a transaction
      const transaction = new Transaction({'consignmentid':'cabcdefg1000','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey})
    
      const tid = transaction.id
      //serialize it
      const tStr = transaction.serialize()

      //create the message

      const addTransactionMessage = new Message({peer:"127.0.0.1:4000", action:"addtransaction", data: tStr})

       peer.processReceivedMessage(addTransactionMessage)
        .then((result) => {
          expect(result).to.eql(false)
    
            //cleanup
            peer.deleteCollections().then(() => {done()})
            


          
        })

      

    })

  })
  

  it("should ignore an incoming message if it is  'blocks' and the peer state is not 'awaitingblockchain'", (done) => {
    const peer = new Peer("127.0.0.1",3000, 3001, 3002, 3003,new Repository(Levelupdb))
    
   
    peer.createCollections().then(() => {
     
      //create the message

      const blocksMessage = new Message({peer:"127.0.0.1:4000", action:"blocks"})

       peer.processReceivedMessage(blocksMessage)
        .then((result) => {
          expect(result).to.eql(false)
    
            //cleanup
            peer.deleteCollections().then(() => {done()})
            


          
        })

      

    })

  })

  it("should process an incoming 'blocks' message, replacing an existing blockchain", (done) => {
     const peer = new Peer("127.0.0.1",3000, 3001, 3002, 3003, new Repository(Levelupdb))

     peer.setState("awaitingblockchain")
   
     peer.createCollections().then(() => {
           //add an origin block
          const originBlock = new Block({"previousHash": "-1", "transactions":[],"index":0})
          //save to the database
          peer.repository.addBlock(originBlock)
          .then(result => {
            //set up the blockchain object
            const blockchain = new Blockchain({"latestblockid": originBlock.id, "latestblockindex": originBlock.index, "length":1})
             peer.setBlockchain(blockchain)
           
            .then(() => {
              //add some blocks to the peer
              const transactions1 = [
        
              ]
              transactions1.push(new Transaction({'consignmentid':'cabcdefg','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
              transactions1.push(new Transaction({'consignmentid':'cabcdefh','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
              transactions1.push(new Transaction({'consignmentid':'cabcdefi','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
              
              const block1 = new Block({"previousHash":peer.blockchain.getLatestBlockId(),"transactions":transactions1, "index":1})

              const transactions2 = [
                
              ]
              transactions2.push(new Transaction({'consignmentid':'cabcdefg','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
              transactions2.push(new Transaction({'consignmentid':'cabcdefh','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
              transactions2.push(new Transaction({'consignmentid':'cabcdefi','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
              
              const block2 = new Block({"previousHash":block1.id,"transactions":transactions2, "index":2})

              const transactions3 = [
                
              ]
              transactions3.push(new Transaction({'consignmentid':'cabcdefg','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
              transactions3.push(new Transaction({'consignmentid':'cabcdefh','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
              transactions3.push(new Transaction({'consignmentid':'cabcdefi','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
              
              const block3 = new Block({"previousHash":block2.id,"transactions":transactions3,"index": 3})

            //Set up the existing blockchain structure, 3 blocks plus origin block, and blockchain

             peer.addBlock(block1)
             .then(() => {
              return peer.addBlock(block2)
             })
             .then(() => {
              return peer.addBlock(block3)
             })
             .then(() => {

              const transactions4 =[]

              //create a replacement blockchain structure
              transactions4.push(new Transaction({'consignmentid':'cabcdefg1','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
              transactions4.push(new Transaction({'consignmentid':'cabcdefh2','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
              transactions4.push(new Transaction({'consignmentid':'cabcdefi3','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
              
              const block4 = new Block({"previousHash":originBlock.id,"transactions":transactions4, "index":1})

              const transactions5 = []
              transactions5.push(new Transaction({'consignmentid':'cabcdefg1','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
              transactions5.push(new Transaction({'consignmentid':'cabcdefh5','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
              transactions5.push(new Transaction({'consignmentid':'cabcdefi6','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
              
              const block5 = new Block({"previousHash":block4.id,"transactions":transactions5, "index":2})

              const blocksArray = [originBlock, block4, block5]

              const blocksStringArray = blocksArray.map(block => {return block.serialize()})
              const messageData = JSON.stringify(blocksStringArray)
             
              const message = new Message({peer:"127.0.0.1:4000", action:"blocks", data: messageData})
              peer.processReceivedMessage(message)
              .then((result) => {
                //peer.blockchain should reflect changes
                expect(peer.blockchain.getLength()).to.eql(3)
                expect(peer.blockchain.getLatestBlockId()).to.eql(block5.id)
                expect(peer.blockchain.getLatestBlockIndex()).to.eql(block5.index)

                //saved blockchain record should reflect changes
                peer.repository.getBlockchain("blockchain")
                .then(bc => {
                  expect(bc.getLength()).to.eql(3)
                  expect(bc.getLatestBlockId()).to.eql(block5.id)
                  expect(bc.getLatestBlockIndex()).to.eql(block5.index)

                  //all records present
                  peer.repository.getBlock(originBlock.id)
                  .then(ob => {
                    expect(ob.id).to.eql(originBlock.id)
                    peer.repository.getBlock(block4.id)
                    .then(b4 => {
                      expect(b4.id).to.eql(block4.id)
                      peer.repository.getBlock(block5.id)
                      .then(b5 => {
                        expect(b5.id).to.eql(block5.id)
                        peer.repository.getAllBlocks()
                        .then(blocks => {
                          expect(blocks.length).to.eql(3) //and no more

                          //check that the new blockchain has been indexed correctly
                            peer.repository.getConsignmentIndex("cabcdefg1")
                            .then((res) => {
                              expect(res.blockids.length).to.eql(2)
                              peer.deleteCollections()
                              .then(() => {
                                done()
                              })
                            })
 

                        })

                      })
                    })
                  })
                  
                })

                
              })

              
             })
              
            })

       
          })
     })
  })
it("should return false when trying to process a 'blocks' message with an invalid block", (done) => {
     const peer = new Peer("127.0.0.1",3000, 3001, 3002, 3003,new Repository(Levelupdb))

     peer.setState("awaitingblockchain")
   
     peer.createCollections().then(() => {
           //add an origin block
          const originBlock = new Block({"previousHash": "-1", "transactions":[],"index":0})
          //save to the database
          peer.repository.addBlock(originBlock)
          .then(result => {
            //set up the blockchain object
            const blockchain = new Blockchain({"latestblockid": originBlock.id, "latestblockindex": originBlock.index, "length":1})
             peer.setBlockchain(blockchain)
           
            .then(() => {
              //add some blocks to the peer
              const transactions1 = [
        
              ]
              transactions1.push(new Transaction({'consignmentid':'cabcdefg','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
              transactions1.push(new Transaction({'consignmentid':'cabcdefh','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
              transactions1.push(new Transaction({'consignmentid':'cabcdefi','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
              
              const block1 = new Block({"previousHash":peer.blockchain.getLatestBlockId(),"transactions":transactions1, "index":1})

              const transactions2 = [
                
              ]
              transactions2.push(new Transaction({'consignmentid':'cabcdefg','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
              transactions2.push(new Transaction({'consignmentid':'cabcdefh','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
              transactions2.push(new Transaction({'consignmentid':'cabcdefi','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
              
              const block2 = new Block({"previousHash":block1.id,"transactions":transactions2, "index":2})

              const transactions3 = [
                
              ]
              transactions3.push(new Transaction({'consignmentid':'cabcdefg','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
              transactions3.push(new Transaction({'consignmentid':'cabcdefh','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
              transactions3.push(new Transaction({'consignmentid':'cabcdefi','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
              
              const block3 = new Block({"previousHash":block2.id,"transactions":transactions3,"index": 3})

            //Set up the existing blockchain structure, 3 blocks plus origin block, and blockchain

             peer.addBlock(block1)
             .then(() => {
              return peer.addBlock(block2)
             })
             .then(() => {
              return peer.addBlock(block3)
             })
             .then(() => {

              const transactions3 =[]

              //create a replacement blockchain structure
              transactions3.push(new Transaction({'consignmentid':'cabcdefg1','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
              transactions3.push(new Transaction({'consignmentid':'cabcdefh2','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
              transactions3.push(new Transaction({'consignmentid':'cabcdefi3','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
              
              const block4 = new Block({"previousHash":originBlock.id,"transactions":transactions3, "index":1})

              const transactions4 = []
              transactions4.push(new Transaction({'consignmentid':'cabcdefg4','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
              transactions4.push(new Transaction({'consignmentid':'cabcdefh5','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
              transactions4.push(new Transaction({'consignmentid':'cabcdefi6','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
              
              const block5 = new Block({"previousHash":block4.id,"transactions":transactions4, "index":2})

              block5.index = 6 //Invalidate it
              const blocksArray = [originBlock, block4, block5]

              const blocksStringArray = blocksArray.map(block => {return block.serialize()})
              const messageData = JSON.stringify(blocksStringArray)
             
              const message = new Message({peer:"127.0.0.1:4000", action:"blocks", data: messageData})
              peer.processReceivedMessage(message)
              .then((result) => {
                expect(result).to.eql(false)

                 //saved blockchain record should not have changed
                peer.repository.getBlockchain("blockchain")
                .then(bc => {

                  expect(peer.getState()).to.eql("awaitingblockchain")
                  expect(bc.getLength()).to.eql(4)
                  expect(bc.getLatestBlockId()).to.eql(block3.id)
                  expect(bc.getLatestBlockIndex()).to.eql(block3.index)

                  //all records present
                  peer.repository.getBlock(originBlock.id)
                  .then(ob => {
                    expect(ob.id).to.eql(originBlock.id)
                    peer.repository.getBlock(block1.id)
                    .then(b1 => {
                      expect(b1.id).to.eql(block1.id)
                      peer.repository.getBlock(block2.id)
                      .then(b2 => {
                        expect(b2.id).to.eql(block2.id)
                        peer.repository.getBlock(block3.id)
                        .then(b3 => {
                            peer.repository.getAllBlocks()
                            .then(blocks => {
                              expect(blocks.length).to.eql(4) //and no more
                              //check that the new blockchain has been indexed correctly
                                peer.repository.getConsignmentIndex("cabcdefg")
                                .then((res) => {
                                  expect(res.blockids.length).to.eql(3)
                                  peer.deleteCollections()
                                  .then(() => {
                                    done()
                                  })
                                })
     

                            })
                        })

 

                      })
                    })
                  })
                  
                })
         
                
                
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
    const transaction1 = new Transaction({'consignmentid':'cabcdefg','transactiontype':'despatched','datatype':'application/json','data':{"some":"arbitrary","json":"data"},"publickey":publicKey})
    const transaction2 = new Transaction({'consignmentid':'cabcdefg','transactiontype':'despatched','datatype':'application/json','data':{"someother":"arbitrary","json":"data"},"publickey":publicKey})

    const transactions = [transaction1, transaction2]
    //sets up a peer network

    const peer1 = new Peer("127.0.0.1",3000, 3001,3002, 3003,new Repository(Levelupdb))
    const peer2 = new Peer("127.0.0.1",3000, 3001, 3004, 3005, new Repository(Levelupdb))

    peer1.createCollections()
    .then(() => {
       peer1.setBlockchain(new Blockchain({"length": 1, "latestblockid": "-1","latestblockindex":0}))

        peer1.registerAsPeer().then(() => {

          peer2.registerAsPeer().then(() => {
            peer2.setupPeerNetwork()
            .then(()=> {
             
                peer1.setupPeerNetwork()
               .then(()=> {
                 
                  setTimeout(() =>{
                    
                    peer1.mineBlock(transactions)
                    .then((minedBlock) => {
                       expect(minedBlock).to.be.instanceof(Block)
                        expect(peer1.blockchain.getLatestBlockId()).to.eql(minedBlock.id)
                        expect(peer1.blockchain.getLatestBlockIndex()).to.eql(minedBlock.index)
                        //has blockcahin been persisted
                        peer1.repository.getBlockchain("blockchain")
                        .then(blockchain => {
                            
                            expect(blockchain.getLatestBlockId()).to.eql(minedBlock.id)
                            setTimeout(() =>{
                            //has the broadcast message been received by peer?
                             expect(peer2.messageQueue.length).to.eql(1)
                              peer1.deleteCollections().then(() => {
                                peer1.topology.destroy()
                                peer2.topology.destroy()
                                done()
                              })
                              
                            },100)
                          })
                        
                        
                    })
                    
                    

                   
                   
                   
                  },100)
                

               })
            })
           
           

          })
        })

    })

   


  })

  it("should start a new mining countdown process", (done) => {
     const peer = new Peer("127.0.0.1",3000, 3001,3002,3003, new Repository(Levelupdb))
     const peerSpy = sinon.stub(peer, "miningCountdownSuccessCallback").callsFake(() => {
      peer.miningCountdownProcess = null
      return(true)
    })
     peer.startMiningCountdownProcess(0,500)
     expect(peer.miningCountdownProcess).to.not.eql(null)
     setTimeout(()=> {
      expect(peerSpy.called).to.be.true
      expect(peerSpy.callCount).to.equal(1)
      expect(peerSpy.calledWith(100)).to.be.true
      expect(peer.miningCountdownProcess).to.eql(null)
      done()
     }, 1000)
     //console.log(peer1.miningCountdownProcess)
     

  })

  it("should pre-empt a running mining countdown process", (done) => {
     const peer = new Peer("127.0.0.1",3000, 3001,3002,3003, new Repository(Levelupdb))
     
     peer.startMiningCountdownProcess(0,500)
     expect(peer.miningCountdownProcess).to.not.eql(null)
     setTimeout(() => {
      peer.miningCountdownProcess.send("pre-empt")
      },5)
     setTimeout(()=> {
    
      expect(peer.getState()).to.eql("running")
      expect(peer.miningCountdownProcess).to.eql(null)
      done()
     }, 1000)
     
     

  })

   it("should pre-empt a mining countdown on receiving an 'addblock' message", (done) => {
    const peer = new Peer("127.0.0.1",3000, 3001,3002,3003, new Repository(Levelupdb))
    peer.createCollections().then(() => {

       //add an origin block
      const originBlock = new Block({"previousHash": "-1", "transactions":[],"index":0})
      //save to the database
      peer.repository.addBlock(originBlock).then(result => {
        //set up the blockchain object
        const blockchain = new Blockchain({"latestblockid": originBlock.id, "latestblockindex": originBlock.index, "length":1})
        peer.setBlockchain(blockchain)
        .then(() => {
                    //build a Block
            const transactions1 = [
            
            ]
            transactions1.push(new Transaction({'consignmentid':'cabcdefg','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
            transactions1.push(new Transaction({'consignmentid':'cabcdefh','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
            transactions1.push(new Transaction({'consignmentid':'cabcdefi','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
            
            const block1 = new Block({"previousHash":originBlock.id,"transactions":transactions1, "index":1})

           

            //serialise it

            const blockStr = block1.serialize()

            //build a message

            const addBlockMessage = new Message({peer:"127.0.0.1:4000", action:"addblock", data: blockStr})

             peer.startMiningCountdownProcess(0,1500)
             
            //process the received message
            peer.processReceivedMessage(addBlockMessage)
            .then((resultingBlock) => {
              setTimeout(() => {
                expect(peer.miningCountdownProcess).to.eql(null)
                expect(peer.getState()).to.eql("running")
                peer.deleteCollections()
                .then(() => {
                  done()
                })
                
              },500)
             
            })

        })
        

      

        

      })



      
    })


  })

  it("should mine a block on successfull end to the mining countdown process", (done)=> {
    const peer = new Peer("127.0.0.1",3000, 3001,3002,3003, new Repository(Levelupdb))
    peer.setState("mining")
    peer.setTransactionPoolThreshold(3000)
    peer.createCollections().then(() => {
       //create some transactions
      const transaction1 = new Transaction({'consignmentid':'cabcdefg','transactiontype':'despatched','datatype':'application/json','data':{"some":"arbitrary","json":"data"},"publickey":publicKey})
      const transaction2 = new Transaction({'consignmentid':'cabcdefg','transactiontype':'despatched','datatype':'application/json','data':{"someother":"arbitrary","json":"data"},"publickey":publicKey})
      const transaction3 = new Transaction({'consignmentid':'cabcdefg','transactiontype':'despatched','datatype':'application/json','data':{"yetmore":"arbitrary","json":"data"},"publickey":publicKey})


      const transactions = [transaction1, transaction2, transaction3]

      //add the transactions to the peer
      const promises = transactions.map((trans) => {
        peer.repository.addTransaction(trans)
      })

      Promise.all(promises)
      .then(() => {
        const blockchain = new Blockchain({"latestblockid": "fakeid", "latestblockindex": 0, "length":1})
        peer.setBlockchain(blockchain).then(() => {
          peer.miningCountdownSuccessCallback(100) //success
          .then((newBlock) => {
            expect(newBlock.index).to.eql(1)
            expect(peer.getState()).to.eql("running")
            peer.deleteCollections().then(() => {
              done()
            })
          })
        })
        
        
        
      })
    })
  })


})

describe("webserver", () => {

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

  it("starts the webserver", (done) => {
     const peer = new Peer("127.0.0.1",3000, 3001,3002,3003, new Repository(Levelupdb))

     peer.startWebServer(3003,peer).then(() => {
      expect(peer.webServer).to.not.eql(null)
      peer.webServer.close()
      done()
     })

  })

   it('can post a new transaction', (done) => {

     const peer = new Peer("127.0.0.1",3000, 3001,3002, 3003,new Repository(Levelupdb))
     peer.createCollections()
     .then(() => {

       peer.startWebServer(peer, 3003).then(() => {
          request(peer.webServer)
          .post('/transactions')
          .send({'consignmentid':'cabcdefi',
            'transactiontype':'despatched',
            'data':{"some":"arbitrary","json":"data"},
            'datatype':'application/json'
          })
          .set('Content-Type','application/json')
          .set('Accept','aplication/json')
          .expect(201)
          .then((res) => {
            expect(res.body.consignmentid).to.eql('cabcdefi')
            peer.repository.getTransaction(res.body.id)
            .then(trans => {
              expect(trans.id).to.eql(res.body.id) //it is in the transaction pool
              peer.deleteCollections().then(() => {
                 peer.webServer.close()
                done()
              })
              
            })
            
          })

        })
     })

    
  })

   it('returns a BAD REQUEST error when trying to post an invalid  transaction', (done) => {

     const peer = new Peer("127.0.0.1",3000, 3001,3002,3003, new Repository(Levelupdb))
     peer.createCollections()
     .then(() => {

       peer.startWebServer(peer, 3003).then(() => {
          request(peer.webServer)
          .post('/transactions')
          .send({'fee':'foo',
          })
          .set('Content-Type','application/json')
          .set('Accept','aplication/json')
          .expect(400)
          .then(res => {
            peer.deleteCollections().then(() => {
                 peer.webServer.close()
                done()
              })
          })
          

        })
     })

    
  })
  it('returns all transactions', (done) => {

     const peer = new Peer("127.0.0.1",3000, 3001,3002,3003, new Repository(Levelupdb))
     peer.deleteCollections()
     .then(() => {

       peer.createCollections().then(() => {

          //create some transactions
          const transaction1 = new Transaction({'consignmentid':'cabcdefg','transactiontype':'despatched','datatype':'application/json','data':{"some":"arbitrary","json":"data"},"publickey":publicKey})
          const transaction2 = new Transaction({'consignmentid':'cabcdefg','transactiontype':'despatched','datatype':'application/json','data':{"someother":"arbitrary","json":"data"},"publickey":publicKey})
          const transaction3 = new Transaction({'consignmentid':'cabcdefg','transactiontype':'despatched','datatype':'application/json','data':{"yetmore":"arbitrary","json":"data"},"publickey":publicKey})


          const transactions = [transaction1, transaction2, transaction3]

          //add the transactions to the peer
          const promises = transactions.map((trans) => {
            peer.repository.addTransaction(trans)
          })

          Promise.all(promises)
         .then(() => {

           peer.startWebServer(3003).then(() => {
              request(peer.webServer)
              .get('/transactions')
              .send()
              .set('Content-Type','application/json')
              .set('Accept','aplication/json')
              .expect(200)
              .then(res => {
                expect(res.body.transactions.length).to.be.eql(3)
                peer.deleteCollections().then(() => {
                     peer.webServer.close()
                    done()
                  })
              })
              

            })
          })
        })
      })

    
  })

  it("returns all blocks", (done) => {
     const peer = new Peer("127.0.0.1",3000, 3001,3002,3003, new Repository(Levelupdb))
     peer.deleteCollections()
     .then(() => {

       peer.createCollections().then(() => {
          const transactions1 = [
        
          ]
          transactions1.push(new Transaction({'consignmentid':'cabcdefg','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
          transactions1.push(new Transaction({'consignmentid':'cabcdefh','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
          transactions1.push(new Transaction({'consignmentid':'cabcdefi','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
          
          const block1 = new Block({"previousHash":"abcdef","transactions":transactions1,"index":1})

          const transactions2 = [
            
          ]
          transactions2.push(new Transaction({'consignmentid':'cabcdefj','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
          transactions2.push(new Transaction({'consignmentid':'cabcdefg','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
          transactions2.push(new Transaction({'consignmentid':'cabcdefl','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
          
          const block2 = new Block({"previousHash":block1.id,"transactions":transactions2, "index": 2})

          const transactions3 = [
            
          ]
          transactions3.push(new Transaction({'consignmentid':'cabcdefm','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
          transactions3.push(new Transaction({'consignmentid':'cabcdefn','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
          transactions3.push(new Transaction({'consignmentid':'cabcdefg','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
          
          const block3 = new Block({"previousHash":block2.id,"transactions":transactions3,"index": 3})

          const blocks = [block1, block2, block3]

          const promises = blocks.map(block => {
            peer.repository.addBlock(block)
          })

          Promise.all(promises).then(()=> {
            peer.startWebServer(3003).then(() => {
              request(peer.webServer)
              .get('/blocks')
              .send()
              .set('Content-Type','application/json')
              .set('Accept','aplication/json')
              .expect(200)
              .then(res => {
                
                expect(res.body.length).to.be.eql(3)
                peer.deleteCollections().then(() => {
                     peer.webServer.close()
                    done()
                  })
              })
              

            })

          })

       })
     })
    

  })

  it("returns a blockchain", (done) => {
     const peer = new Peer("127.0.0.1",3000, 3001,3002, 3003,new Repository(Levelupdb))
     peer.deleteCollections()
     .then(() => {


     const blockchain = new Blockchain({"length": 10, "latestblockid": "abcdef","latestblockindex":10})
      peer.createCollections()
      .then(() => {
        peer.setBlockchain(blockchain)
        .then((blockchain) => {
          peer.startWebServer(3003).then(() => {
              request(peer.webServer)
              .get('/blockchain')
              .send()
              .set('Content-Type','application/json')
              .set('Accept','aplication/json')
              .expect(200)
              .then(res => {
                expect(res.body.id).to.eql('blockchain')
                peer.deleteCollections().then(() => {
                     peer.webServer.close()
                    done()
                  })
              })
              

            })
         })
       })


    })

  })

  it("returns a consignment", (done) => {
     const peer = new Peer("127.0.0.1",3000, 3001,3002, 3003,new Repository(Levelupdb))
     peer.deleteCollections()
     .then(() => {

       peer.createCollections().then(() => {

          //add an origin block
        const originBlock = new Block({"previousHash": "-1", "transactions":[],"index":0})
        //save to the database
        peer.repository.addBlock(originBlock).then(result => {
          //set up the blockchain object
          const blockchain = new Blockchain({"latestblockid": originBlock.id, "latestblockindex": originBlock.index, "length":1})
          peer.setBlockchain(blockchain)
          .then(() => {
              const transactions1 = [
        
              ]
              transactions1.push(new Transaction({'consignmentid':'cabcdefg','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
              transactions1.push(new Transaction({'consignmentid':'cabcdefh','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
              transactions1.push(new Transaction({'consignmentid':'cabcdefi','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
              
              const block1 = new Block({"previousHash":originBlock.id,"transactions":transactions1,"index":1})

              const transactions2 = [
                
              ]
              transactions2.push(new Transaction({'consignmentid':'cabcdefj','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
              transactions2.push(new Transaction({'consignmentid':'cabcdefg','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
              transactions2.push(new Transaction({'consignmentid':'cabcdefl','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
              
              const block2 = new Block({"previousHash":block1.id,"transactions":transactions2, "index": 2})

              const transactions3 = [
                
              ]
              transactions3.push(new Transaction({'consignmentid':'cabcdefm','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
              transactions3.push(new Transaction({'consignmentid':'cabcdefg','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
              transactions3.push(new Transaction({'consignmentid':'cabcdefg','transactiontype':'despatched','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
              
              const block3 = new Block({"previousHash":block2.id,"transactions":transactions3,"index": 3})

            //  const blocks = [block1, block2, block3]

           //   const promises = blocks.map(block => {
            //    peer.addBlock(block)
           //   })

           //   Promise.all(promises).then(()=> {
              peer.addBlock(block1)
              .then(() => {
                return peer.addBlock(block2)
              })
              .then(()=> {
                return peer.addBlock(block3)
              })
              .then(() => {   
                    peer.startWebServer(3003).then(() => {
                      request(peer.webServer)
                      .get('/consignments/cabcdefg')
                      .send()
                      .set('Content-Type','application/json')
                      .set('Accept','aplication/json')
                      .expect(200)
                      .then(res => {
                        
                        expect(res.body.length).to.eql(4)
                        peer.deleteCollections().then(() => {
                             peer.webServer.close()
                            done()
                          })
                      })
                    

                    })


              })
                
                

              })
             
          })
         
        })

        

       
     })
    

  })
})

