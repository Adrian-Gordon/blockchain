'use strict'

const nconf = require('../src/config/conf.js').nconf

const Repository = require('../src/repository/repository').Repository

const Levelupdb = require('../src/database/leveldb/levelup').Levelupdb

const Block = require('../src/block/block').Block

const Blockchain = require('../src/blockchain/blockchain').Blockchain

const Peer = require('../src/P2P/peer/peer').Peer

const peer = new Peer(nconf.get("discoveryserverurl"), nconf.get("discoveryserverport"), nconf.get("discoveryservermessageport"),nconf.get("port"), nconf.get("webserverport"),new Repository(Levelupdb),nconf.get('ip'))


let originBlock = null
peer.deleteCollections()
.then(() => {
  return peer.createCollections()

})

.then(() => {
   //add an origin block
    originBlock = new Block({"previousHash": "-1", "transactions":[],"index":0, "timestamp":0})
      //save to the database
    return peer.repository.addBlock(originBlock)
})
.then(() => {
  //console.log("runPeer: " + JSON.stringify(blocks))
  const blockchain = new Blockchain({"latestblockid": originBlock.id, "latestblockindex": originBlock.index, "length":1})
  return peer.setBlockchain(blockchain)
})
.then(() => {
  return peer.registerAsPeer()
})
.then(() => {
  return peer.setupPeerNetwork()
})
.then(() => {
  peer.startWebServer(nconf.get("webserverport")).then(() => {
    peer.listen(nconf.get('listentime'))
    peer.monitorTransactionPool(nconf.get("monitortransactiontime"))
  })
  
})