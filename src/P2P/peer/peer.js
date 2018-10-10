'use strict'


const request = require('request-promise-native')
const Transaction = require('../../transaction/transaction').Transaction
const Block = require('../../block/block').Block
const Message = require('../../message/message').Message
const Blockchain = require('../../blockchain/blockchain').Blockchain
const topology = require('fully-connected-topology')
const jsonStream = require('duplex-json-stream')
const { fork } = require('child_process')

const webServer = require('./webServer')

const logger = require('../../logger/logger.js')(module)
const nconf = require('../../config/conf.js').nconf

const validStates = ["running","awaitingblockchain","mining"]


class Peer {
  constructor(discoveryServerUrl, discoveryServerPort,discoveryServerMessagePort, port, repository){

    if(typeof discoveryServerUrl == 'undefined'){
      throw new Error("no discovery server URL provided")
    }
    if(typeof discoveryServerPort == 'undefined'){
      throw new Error("no discovery server port provided")
    }
    if(isNaN(parseInt(discoveryServerPort))){
      throw new Error("invalid discovery server port: '" + discoveryServerPort + "'")
    }
     if(typeof discoveryServerMessagePort == 'undefined'){
      throw new Error("no discovery server message port provided")
    }
    if(isNaN(parseInt(discoveryServerMessagePort))){
      throw new Error("invalid discovery server message port: '" + discoveryServerMessagePort + "'")
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
    this.discoveryServerMessagePort = parseInt(discoveryServerMessagePort)

    this.port = port
    this.startTime = new Date().getTime()
    this.repository = repository
    this.messageQueue = []
    this.blockchain = null
    this.state = "running"
    this.connectedPeers = new Object()
    this.miningCountdownProcess = null
    this.transactionPoolSize = 0
    this.transactionPoolThreshold = nconf.get("defaulttpthreshold")
    this.miningCountdown = nconf.get("defaultminingcountdown")

    this.webServer = null

  }

  setState(state){
    if(validStates.includes(state))
      this.state = state
    else throw new Error("invalid state: '" + state + "'")
  }

  getState(){
    return(this.state)
  }

  getTransactionPoolSize(){
    return(this.transactionPoolSize)
  }

  setTransactionPoolSize(size){
    this.transactionPoolSize = size
    return(size)
  }

  setTransactionPoolThreshold(threshold){
    this.transactionPoolThreshold = threshold
    return(threshold)
  }

  getTransactionPoolThreshold(threshold){
    return(this.transactionPoolThreshold)
  }


  getPeers(){
    const peersUrl = "http://" + this.discoveryServerUrl + ":" + this.discoveryServerPort + "/activeNodes"
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
        this.repository.createCollection("blockchain")
        .then(() => {
          resolve(true)
        })
          
      })
      .catch((error)=>{
        reject(error)
      })
        
      })
      
    })
  
  }

  deleteCollections(){
    const promises = [
    this.repository.deleteCollection("transactionpool"),
    this.repository.deleteCollection("blocks"),
    this.repository.deleteCollection("blockchain")
    ]

    return Promise.all(promises)

  }

  setBlockchain(blockchain){
    return new Promise((resolve, reject) => {
      if(!(blockchain instanceof Blockchain)){
        reject("setBlockchain must take an argument of type Blockchain")
      }

      this.repository.addBlockchain(blockchain)
      .then((response) => {
        this.blockchain = blockchain
        resolve(this.blockchain)
      })
      .catch((error) => {
        console.log("setblockchain err: " + error)
        reject(error)
      })
    })
    
  }

  getBlockchain(){
    return this.blockchain
  }

  readBlockchain(){
    return new Promise((resolve, reject) => {
      this.repository.getBlockchain("blockchain")
      .then((bc) => {
        this.setBlockchain(bc)
        .then((bc) => {
          resolve(bc)
        })
        .catch(error => {
          reject(error)
        })
      })
      .catch(error => {
        reject(error)
      })

    })

  }

  registerAsPeer(){
    const addPeerUrl = "http://" + this.discoveryServerUrl + ":" + this.discoveryServerPort + "/activeNodes"
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
      else if(block.index <= this.blockchain.getLatestBlockIndex())
        reject("block index less than or equal to latest")
      else if((block.index - this.blockchain.getLatestBlockIndex())> 1)
        reject("block index greater than next index")
      else if(block.previousHash !== this.blockchain.getLatestBlockId())
        reject("block previousHash not hash of latest block")

      else{
        this.repository.addBlock(block).then(result => {
          if(result == 'OK'){
            
            this.blockchain.setLatestBlockId(block.id)
            this.blockchain.setLatestBlockIndex(block.index)
            this.blockchain.incrementLength()
            this.blockchain.hash = Blockchain.createHash(this.blockchain)
            this.repository.addBlockchain(this.blockchain)
            .then(()=> {
              const transToDelete = JSON.parse(block.transactions) //deserialise the transactions
              
              this.removeTransactions(transToDelete.map(t => {return JSON.parse(t).id}))
              .then(() => {
                 resolve(block)
              })
             
            })
            
          }
          else{
            reject(result)
          }
        })
      }
      
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
          this.setTransactionPoolSize(this.getTransactionPoolSize() + transaction.getSize())
          //kick off mining process, if transaction tkes us over threhold size
          if(this.getTransactionPoolSize() > this.getTransactionPoolThreshold()){
            this.startMiningCountdownProcess(this.miningCountdown)
          }
          resolve(transaction)
        }
        else{
          reject(result)
        }
      })

    })

  }

  removeTransactions(transactionids){
    const promises = transactionids.map((transid) => {
      return this.repository.deleteTransaction(transid)
    })

    return Promise.all(promises)

  }

  getRepositoryTransactionPoolSize(){
    return new Promise((resolve, reject) => {

      this.repository.getAllTransactions()
      .then(transactions => {
        resolve(transactions.map(transaction => {
          return transaction.getSize()
        }).reduce((a,b) => a + b, 0))
      })
      .catch(error => {
        reject(error)
      })
    })

    
  }

  setupPeerNetwork(port){
    //console.log("setupPeerNetwork " + port)
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
            peersRefs.push(this.discoveryServerUrl + ":" + this.discoveryServerMessagePort) //push the discovery server as peer
            peer.topology = topology("127.0.0.1:" + this.port, peersRefs)
            peer.topology.on('connection', this.connectionCallback.bind(this))
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
    const socket = jsonStream(connection)
    socket.on('data', (data) => {
      try{
          data.peer = peer //add peer to message
          const message = new Message(data)
          this.pushMessage(message)

      }catch(error){
        logger.error(error)

      }
    })
    socket.on('end', () => {
      //console.log(this.port + "disconnected from" + peer)
      delete this.connectedPeers[peer]
    })
    this.connectedPeers[peer] = socket
    //console.log(this.port + " connected to " + peer)
    return(true)
    
  }

  

  endConnection(connectionid){
    const peer = this.connectedPeers[connectionid]

    if(!peer)throw new Error("no connection to peer: '" + connectionid+ "'")

    this.connectedPeers[connectionid].end()
    delete this.connectedPeers[connectionid]
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
    
      if(this.getState() == "awaitingblockchain"){
        if(message.action !== 'blocks'){
          resolve(false)
        }
        else{

          this.repository.deleteCollection("blocks")
          .then(() => {
            this.repository.createCollection("blocks")
                   .then(() => {
                      const dataArr = JSON.parse(message.data)
                     
                      let latestBlockIndex = -1
                      let latestBlockid = null

                      const promises = dataArr.map(blockStr => {
                        try{
                          const block = Block.deserialize(blockStr)
                          if(block.index > latestBlockIndex){
                            latestBlockIndex = block.index
                            latestBlockid = block.id
                          }
                          return(this.repository.addBlock(block)) //add directly to the repository - they could be in any order

                        }catch(error){
                          return Promise.reject(error)
                        }
                        
                      })

                      this.blockchain.setLatestBlockId(latestBlockid)
                      this.blockchain.setLatestBlockIndex(latestBlockIndex)
                      this.blockchain.setLength(promises.length)
                      this.blockchain.setHash(Blockchain.createHash(this.blockchain))

                     
                      Promise.all(promises)
                      .then(() => {
                        this.repository.addBlockchain(this.blockchain)
                        .then(() => {
                          resolve(true)
                        })
                      })
                      .catch(error => {
            
                        resolve(false)
                      })
                      
                   })  
          })
        }
 
        

      }
      else {
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
                if(this.miningCountdownProcess){
                  //pre-empt it
                  this.miningCountdownProcess.send("pre-empt")
                }
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
            else{
              resolve(false)
            }


      }
      
  
    })
  }

  broadcastMessage(action, data){
    Object.keys(this.connectedPeers).forEach((peer) => {
      if(peer !== (this.discoveryServerUrl + ":" + this.discoveryServerMessagePort)) //don't send to discovery Server
        this.sendMessage(peer, action, data, 'broadcast')
    })

  }

  sendMessage(peer, action, data, type){
    if(typeof type == 'undefined') type = 'private'
    const socket = this.connectedPeers[peer]

    if(!socket)throw new Error("no connection to peer: '" + peer+ "'")

    socket.write({'action': action, 'data': data, 'type': type})

  }

  mineBlock(transactions){
    return new Promise((resolve,reject) => {
      const newBlock = new Block({"index": this.blockchain.getLatestBlockIndex() + 1, "previousHash":this.blockchain.getLatestBlockId(), "transactions":transactions})

    
      //broadcast to peers
      this.broadcastMessage("addblock", newBlock.serialize())

      

      this.addBlock(newBlock)
      .then(block => {
        
        this.repository.addBlockchain(this.blockchain)
        .then((added) => {
         
          resolve(newBlock)
        })
        .catch(error => {
          console.log(error)
          reject(error)
        })
        
      })
      .catch(error => {
        console.log(error)
        reject(error)
      })
     
    })

    
    
  }

  gatherTransactions(threshold){
    return new Promise((resolve,reject) => {
      this.repository.getAllTransactions()
      .then(allTransactions => {
        let size = 0
        let includedTransactions =[]
        for(let i = 0;i<allTransactions.length;i++){
          let trans = allTransactions[i]
          size += trans.getSize()
          if(size >= threshold){
            break
          }
          else{
            includedTransactions.push(trans)
          }
        }
        resolve(includedTransactions)
      })

    })
    
  }

  startMiningCountdownProcess(timeout){

    this.setState("mining")

    this.miningCountdownProcess = fork('./miningCountdownProcess.js',['' + timeout])

    this.miningCountdownProcess.on('exit',this.miningCountdownSuccessCallback.bind(this))
  }

  miningCountdownSuccessCallback(code){
    return new Promise((resolve,reject) => {
      //console.log(`child exited with code ${code}`)
      if(code == 100){ //success
        this.miningCountdownProcess = null
        this.gatherTransactions(this.transactionPoolThreshold)
        .then((transactions) => {
          this.mineBlock(transactions)
          .then((newBlock) => {
            this.setState("running")
            resolve(newBlock)
          })
          
        })
        
      }
      if(code == 200){ //failure - has been pre-empted
        this.setState("running")
        this.miningCountdownProcess = null
        resolve(true)
      }

    })
    
  }

  //WEBSERVER

  startWebServer(port){
    return new Promise((resolve, reject) => {
      webServer.startServer(this, port)
      .then(server => {
        this.webServer = server
        resolve(this.webServer)
      })

    })

    
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

