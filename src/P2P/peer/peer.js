'use strict'


const request = require('request-promise-native')
const Transaction = require('../../transaction/transaction').Transaction
const Block = require('../../block/block').Block
const Message = require('../../message/message').Message
const Blockchain = require('../../blockchain/blockchain').Blockchain
const topology = require('fully-connected-topology')

const logger = require('../../logger/logger.js')(module)

const validStates = ["running","awaitingblockchain"]


class Peer {
  constructor(discoveryServerUrl, discoveryServerPort, port, repository){

    if(typeof discoveryServerUrl == 'undefined'){
      throw new Error("no discovery server URL provided")
    }
    if(typeof discoveryServerPort == 'undefined'){
      throw new Error("no discovery server port provided")
    }
    if(isNaN(parseInt(discoveryServerPort))){
      throw new Error("invalid discovery server port: '" + discoveryServerPort + "'")
    }
    if(typeof port == 'undefined'){
      throw new Error("no peer port provided")
    }
    if(isNaN(parseInt(port))){
      throw new Error("invalid peer port: '" + port + "'")
    }

    if(typeof repository == 'undefined'){
      throw new Error("no repository provided")
    }

    this.discoveryServerUrl = discoveryServerUrl
    this.discoveryServerPort = parseInt(discoveryServerPort)
    this.port = port
    this.startTime = new Date().getTime()
    this.repository = repository
    this.messageQueue = []
    this.blockchain = null
    this.state = "running"

  }

  setState(state){
    if(validStates.includes(state))
      this.state = state
    else throw new Error("invalid state: '" + state + "'")
  }

  getState(){
    return(this.state)
  }

  getPeers(){
    const peersUrl = this.discoveryServerUrl + ":" + this.discoveryServerPort + "/activeNodes"
    return new Promise((resolve, reject) => {
      request(peersUrl)
      .then((peers)=> {
        resolve(JSON.parse(peers))
      })
      .catch((error)=> {
        reject("cannot retrieve list of peers from discovery server")
      })

    })


  }

  createCollections(){
  
    return new Promise ((resolve, reject) => {

      this.repository.createCollection("transactionpool")
      .then(()=> {
        this.repository.createCollection("blocks")
      .then(() => {
          resolve(true)
      })
      .catch((error)=>{
        reject(error)
      })
        
      })
      
    })
  
  }

  setBlockchain(blockchain){
    if(!(blockchain instanceof Blockchain)){
      throw new Error("setBlockchain must take an argument of type Blockchain")
    }
    this.blockchain = blockchain
  }

  getBlockchain(){
    return this.blockchain
  }

  registerAsPeer(){
    const addPeerUrl = this.discoveryServerUrl + ":" + this.discoveryServerPort + "/activeNodes"
    return new Promise((resolve, reject) => {
      const options = {
        uri: addPeerUrl,
        method: 'POST',
        json: {
          port: this.port
        }
      }

      request(options)
      .then((result)=> {
        this.ip = result.ip
        resolve(result)
      })
      .catch((error)=> {
        reject(error)
      })

    })
  }

  getStatus(){
    return({status:'OK', uptime:(new Date().getTime() - this.startTime)})
  }

  addBlock(block){
    return new Promise((resolve, reject) => {
      if(!(block instanceof Block)){
        reject("block must be of class Block")
      }
      if(!Block.validate(block)){
        reject("block is invalid")
      }
      if(block.index <= this.blockchain.getLatestBlockIndex())
        reject("block index less than or equal to latest")
      if((block.index - this.blockchain.getLatestBlockIndex())> 1)
        reject("block index greater than next index")
      if(block.previousHash !== this.blockchain.getLatestBlockId())
        reject("block previousHash not hash of latest block")

      this.repository.addBlock(block).then(result => {
        if(result == 'OK'){
          this.blockchain.setLatestBlockId(block.id)
          this.blockchain.setLatestBlockIndex(block.index)
          this.blockchain.incrementLength()
          resolve(block)
        }
        else{
          reject(result)
        }
      })
    })

    
  }

  addTransaction(transaction){
    return new Promise((resolve, reject) => {
      if(!(transaction instanceof Transaction)){
        reject("transaction must be of class Transaction")
      }
      if(!Transaction.validate(transaction)){
        reject("transaction is invalid")
      }

      this.repository.addTransaction(transaction)
      .then((result) => {
        if(result == 'OK'){
          resolve(transaction)
        }
        else{
          reject(result)
        }
      })

    })

  }

  setupPeerNetwork(port){
    return new Promise((resolve, reject) => {


        //this.topology = topology("127.0.0.1:" + this.port, peers)
        //this.topology.on('connection', this.connectionCallback)
        const peer = this
        this.getPeers()
        .then((peers) => {
          //iterate over ip addresses
          Object.keys(peers).forEach(ip => {
            
            const ports = peers[ip]
           
            let peersRefs = ports.map(port => {
              if(ip !== this.ip || port != this.port){
                if(ip.substr(0,7)=="::ffff:")
                  return(ip.substr(7) + ":" + port)
              else
                  return(ip + ":" + port)
              }
            }).filter(value => {
               return typeof value !== 'undefined'
            })
            peer.topology = topology("127.0.0.1:" + this.port, peersRefs)
            peer.topology.on('connection', this.connectionCallback)
            //console.log(peer.topology)
            //console.log(this)
            resolve(true)
          })
          

        })
        .catch((error) => {
          logger.error(error)
          reject(error)
        })
    })
  }

  connectionCallback(connection, peer){
    console.log("connected to " + peer)
    return(true)
    
  }

  pushMessage(message){
    if(! (message instanceof Message)){
      throw new Error("pushMessage requires a parameter of type message")
    }
    this.messageQueue.push(message)
    return message
  }

  popMessage(){
    return(this.messageQueue.shift())
  }

  processReceivedMessage(message){
    return new Promise((resolve, reject) => {

      
      if(message.action == 'ping'){
        const status = this.getStatus()
        const peer = message.peer
        this.sendMessage(peer, message.action, JSON.stringify(status))
        resolve(true)
      }
      else if(message.action == 'sendblockchainlength'){
        let length = 0
        if(this.blockchain !== null){
          length = this.blockchain.getLength()
        }
         
        const peer = message.peer
        this.sendMessage(peer, "blockchainlength", JSON.stringify(length))
        resolve(true)
      }
      else if(message.action == "sendblocks"){     //serialise the blockchain out of the repository, and send it on to the requestor
        
        const blockchain = this.repository.getAllBlocks()
        .then(blocksArray => {
          
          const blocksStringArray = blocksArray.map(block => { return block.serialize()})
          
          const peer = message.peer
          this.sendMessage(peer,"blocks",JSON.stringify(blocksStringArray))
          resolve(true)
        })
        .catch(error => {
          reject(error)
        })
        

      }
      else if(message.action == "addblock"){
        

        //it should be a block
        try{
          const block = Block.deserialize(message.data)
          this.addBlock(block)
          .then((result) => {
            resolve(result)
          })
          .catch((error) => {
            if(error == "block index greater than next index"){
              this.setState("awaitingblockchain")
              this.broadcastMessage("sendblocks")
              reject(error)
            }
            reject(error)
          })
        }catch(error){
          reject(error.message)
        }

      }
      else if(message.action == "addtransaction"){
        try{
          const transaction = Transaction.deserialize(message.data)
          this.addTransaction(transaction)
          .then((result) => {
            resolve(result)
          })
          .catch((error) => {
            reject(error)
          })

        }catch(error){
          reject(error.message)
        }

      }
    })
  }

  broadcastMessage(action){

  }

  sendMessage(peer, action, data){

  }




  
}

/*var t1 = topology('127.0.0.1:4001', ['127.0.0.1:4002', '127.0.0.1:4003']);
var t2 = topology('127.0.0.1:4002', ['127.0.0.1:4001', '127.0.0.1:4003']);
var t3 = topology('127.0.0.1:4003', ['127.0.0.1:4001', '127.0.0.1:4002']);
 
t1.on('connection', function(connection, peer) {
  console.log('t1 is connected to', peer);
  console.log(connection)
});
 
t2.on('connection', function(connection, peer) {
  console.log('t2 is connected to', peer);
});
 
t3.on('connection', function(connection, peer) {
  console.log('t3 is connected to', peer);
});
*/

module.exports = Object.assign({},{Peer,validStates})

