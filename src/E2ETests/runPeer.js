'use strict'

const nconf = require('../config/conf.js').nconf

const Repository = require('../repository/repository').Repository

const Levelupdb = require('../database/leveldb/levelup').Levelupdb

const Block = require('../block/block').Block

const Blockchain = require('../blockchain/blockchain').Blockchain

const Peer = require('../P2P/peer/peer').Peer

const peer = new Peer(nconf.get("discoveryserverurl"), nconf.get("discoveryserverport"), nconf.get("discoveryservermessageport"),nconf.get("port"), nconf.get('webserverport'),new Repository(Levelupdb))


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
  peer.startWebServer(peer.webport).then(() => {
    peer.listen(nconf.get("listentime"))
    peer.monitorTransactionPool(nconf.get("monitortransactiontime"))
  })
  
})