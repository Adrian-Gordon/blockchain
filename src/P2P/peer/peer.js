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


process.on('unhandledRejection', (reason, p) => {
  console.log("unhandled rejection at: ", p, "reason", reason.stack)
})


class Peer {
  constructor(discoveryServerUrl, discoveryServerPort,discoveryServerMessagePort, port, webport, repository){

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
    if(typeof webport == 'undefined'){
      throw new Error("no peer port provided")
    }
    if(isNaN(parseInt(webport))){
      throw new Error("invalid peer port: '" + port + "'")
    }

    if(typeof repository == 'undefined'){
      throw new Error("no repository provided")
    }

    this.discoveryServerUrl = discoveryServerUrl
    this.discoveryServerPort = parseInt(discoveryServerPort)
    this.discoveryServerMessagePort = parseInt(discoveryServerMessagePort)

    this.port = port
    this.webport = webport
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
    this.minimumMiningCountdown = nconf.get("minimumminingcountdown")

    this.webServer = null
    this.listenInterval = null
    this.monitorTransactionPoolInterval = null

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
    if(nconf.get("reportstats")){
          const url = "http://" + this.discoveryServerUrl + ":" + this.discoveryServerPort + "/tpoollength"

          request({
            "uri": url,
            "method":"POST",
            "json":{
              "port":this.port,
              "length":size
            }
          })
          .catch(error => {
            logger.error(error)
          })
            
        }
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
          this.repository.createCollection("consignmentindex")
          .then(() => {
            resolve(true)
          })
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
    this.repository.deleteCollection("blockchain"),
    this.repository.deleteCollection("consignmentindex")
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
       logger.error("setblockchain err: " + error)
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
          port: this.port,
          'webport':this.webport
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
      else if(block.previousHash !== this.blockchain.getLatestBlockId()){
       // logger.info(JSON.stringify(block))
       // logger.info(JSON.stringify(this.blockchain))
        reject("block previousHash not hash of latest block")
      }

      else{
        this.repository.addBlock(block).then(result => {
          if(result == 'OK'){


            
            this.blockchain.setLatestBlockId(block.id)
            this.blockchain.setLatestBlockIndex(block.index)
            this.blockchain.incrementLength()
            if(nconf.get("reportstats")){
              const url = "http://" + this.discoveryServerUrl + ":" + this.discoveryServerPort + "/bclength"

              request({
                "uri": url,
                "method":"POST",
                "json":{
                  "port":this.port,
                  "length":this.blockchain.getLength()
                }
              })
              .catch(error => {
                logger.error(error)
              })
                
            }
            this.blockchain.hash = Blockchain.createHash(this.blockchain)
            this.repository.addBlockchain(this.blockchain)
            .then(()=> {
  
              const transToIndexAndDelete = JSON.parse(block.transactions) //deserialise the transactions

              const indexPromises = transToIndexAndDelete.map(t => {
                return this.indexBlock(block, JSON.parse(t).consignmentid)
              })

              Promise.all(indexPromises)
              .then(() => {
            
                this.removeTransactions(transToIndexAndDelete.map(t => {return JSON.parse(t).id}))
                .then(() => {
                 
                  this.getRepositoryTransactionPoolSize()
                  .then(size => {
                   
                    this.setTransactionPoolSize(size)
                    resolve(block)
                  })
                   
                })
              })

              
              
             
            })
            .catch(error => {
              logger.error(error)
              reject(error)
            })
            
          }
          else{
            reject(result)
          }
        })
        .catch(error => {
          logger.error(error)
          reject(error)
        })
      }
      
    })

    
  }

  indexBlock(block,  consignmentid){
    
    return new Promise((resolve, reject) => {
      
      this.repository.getConsignmentIndex(consignmentid)
      .then(consignmentIndexRecord => {                                   //there is an existing index record
          if(!consignmentIndexRecord.blockids.includes(block.id)){
            consignmentIndexRecord.blockids.push(block.id)                //add to it
            this.repository.addConsignmentIndex(consignmentIndexRecord)
            .then(()=> {
              
              resolve(consignmentIndexRecord)
            })
            
          }
          else{
            
            resolve(consignmentIndexRecord)
          }
      })
      .catch(error => {                                             //create a new index record
         const  consignmentIndexRecord = {        
            id: consignmentid,
            blockids: [block.id]
          }      
         
          this.repository.addConsignmentIndex(consignmentIndexRecord)
          .then(() => {

            resolve(consignmentIndexRecord)
          })
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
          this.setTransactionPoolSize(this.getTransactionPoolSize() + transaction.getSize())
          //kick off mining process, if transaction tkes us over threhold size
          //logger.info("poolsize: " + this.getTransactionPoolSize() + " threshold: " + this.getTransactionPoolThreshold())
         // if((this.getTransactionPoolSize() > this.getTransactionPoolThreshold())&& (this.getState()=="running")){
         //   this.startMiningCountdownProcess(this.minimumMiningCountdown,this.miningCountdown)
         // }
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
        logger.error(error)
        reject(error)
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
           
            let peersRefs = ports.map(twoports => {
              if(ip !== this.ip || twoports.port != this.port){
                if(ip.substr(0,7)=="::ffff:")
                  return(ip.substr(7) + ":" + twoports.port)
              else
                  return(ip + ":" + twoports.port)
              }
            }).filter(value => {
               return typeof value !== 'undefined'
            })
            
            peersRefs.push(this.discoveryServerUrl + ":" + this.discoveryServerMessagePort) //push the discovery server as peer
            
            peer.topology = topology("127.0.0.1:" + this.port, peersRefs)
            peer.topology.on('connection', this.connectionCallback.bind(this))
           
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
     
      delete this.connectedPeers[peer]
    })
    this.connectedPeers[peer] = socket
   
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

  listen(time){
    logger.info("listen")
    if(typeof time == 'undefined'){
      logger.error("'listen must be called with a time argument'")
      throw(new Error('listen must be called with a time argument'))
    }
    this.listenInterval = setInterval(() =>{
      let message = this.popMessage()
      if(message){
         if(nconf.get("reportstats")){
          const url = "http://" + this.discoveryServerUrl + ":" + this.discoveryServerPort + "/messagein"

          request({
            "uri": url,
            "method":"POST",
            "json":{
              "port":this.port
            }
          })
          .catch(error => {
            logger.error(error)
          })
            
        }
        this.processReceivedMessage(message)
        .catch(err => {
          logger.error(err)
        })
      }
    }, time)
  }

  stopListening(){
     logger.info("stop listening")
    clearInterval(this.listenInterval)
  }


monitorTransactionPool(time){
    logger.info("monitorTransactionPool")
    if(typeof time == 'undefined'){
      logger.error("'monitorTransactionPool must be called with a time argument'")
      throw(new Error('monitorTransactionPool must be called with a time argument'))
    }
    this.monitorTransactionPoolInterval = setInterval(() =>{
      if(this.getState() == "running"){
       if((this.getTransactionPoolSize() > this.getTransactionPoolThreshold())&& (this.getState()=="running")){
        this.startMiningCountdownProcess(this.minimumMiningCountdown,this.miningCountdown)
      }
      }
    }, time)
  }

  stopMonitoringTransactions(){
    clearInterval(this.monitorTransactionPoolInterval)
  }



  processReceivedMessage(message){
    logger.info("message received: " + message.action + " from: " + message.peer + " state: "+ this.getState())
    return new Promise((resolve, reject) => {
      if(this.getState() == "awaitingblockchain"){
        if(message.action !== 'blocks'){
          resolve(false)
        }
        else{
          this.stopListening() //don't process any more messages until the blockchain has been received
          logger.info("blocks message received")
         //build an array of blocks from the provided string
         let isValid = true
         const dataArr = JSON.parse(message.data) 
         const blocksArray = []
         for(let i = 0; i < dataArr.length; i++){
          const blockStr = dataArr[i]
            try{
                const block = Block.deserialize(blockStr)
                blocksArray.push(block)
            }catch(error){
              logger.error(error)
              //resolve(false)
              isValid = false;
              break
            }
         }  //It's a valid blockchain, so replace the esxisting one
         if(!isValid){
          resolve(false)
         }
         else{

         
            let indexCalls = []
           this.repository.deleteCollection("blocks")         //delete existing data, and recreate the collections
            .then(() => {
              return this.repository.deleteCollection("consignmentindex")
            })
            .then(() => {
              return this.repository.createCollection("blocks")
            })
            .then(()=> {
              return this.repository.createCollection("consignmentindex")
            }) 
            .then(() => {
                let latestBlockIndex = -1
                let latestBlockid = null
                const addBlockPromises = blocksArray.map(block => {
                   if(block.index > latestBlockIndex){
                      latestBlockIndex = block.index
                      latestBlockid = block.id
                    }
                     if(block.transactions.length > 0){

                      const transToDelete = JSON.parse(block.transactions) //deserialise the transactions
                      
                      const transactionIds = transToDelete.map(t => {
                        indexCalls.push({'block':block,'consignmentid': JSON.parse(t).consignmentid}) 
                    
                        //consignmentids.push(t.consignmentid)
                        return JSON.parse(t).id
                      })

          
                      this.removeTransactions(transactionIds) //remove any of this block transactions from the transaction pool
                      .then(() => {
                        this.getRepositoryTransactionPoolSize() //set the transaction pool size
                        .then(size => {
                        this.setTransactionPoolSize(size)
                        
                        })
                        .catch(error => {
                          logger.error(error)
                        })
                      })
                      .catch(error => {
                        logger.error(error)
                      })
                      
                    }
                    return(this.repository.addBlock(block)) //add directly to the repository - they could be in any order
                })

                  Promise.all(addBlockPromises)
                    .then(() => {               //everything has suceeded
                      this.setState("running")
                      if(typeof nconf.get("listentime") !== 'undefined'){
                        this.listen(nconf.get("listentime"))
                      }
                       //update the blockchain
                      this.blockchain.setLatestBlockId(latestBlockid)
                      this.blockchain.setLatestBlockIndex(latestBlockIndex)
                      this.blockchain.setLength(addBlockPromises.length)
                      this.blockchain.setHash(Blockchain.createHash(this.blockchain))
                      this.repository.addBlockchain(this.blockchain)
                      .then(() => {
                         this.syncIndexBlocks(indexCalls)
                        .then(() => {
                          resolve(true)
                        })
                      })
                      .catch(error => {
                        logger.error(error)
                        resolve(false)
                      })
                    })
                    .catch(error => {
                      logger.error(error)
                      resolve(false)
                    })

               

            })
        }


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
              //  logger.info(message.data)
                const transaction = Transaction.deserialize(message.data)
               // logger.info(JSON.stringify(transaction))
                this.addTransaction(transaction)
                .then((result) => {
                  resolve(result)
                })
                .catch((err) => {
                  logger.error(err)
                  logger.error(message.data)
                  reject(err)
                })

              }catch(err){
                logger.error(err)
                reject(err.message)
              }

            }
            else{
              resolve(false)
            }


      }
      
  
    })
  }

 

  async syncIndexBlocks(indexCalls){    //synchronously index the blocks

    for(let i=0 ;i< indexCalls.length;i++){
         let ic = indexCalls[i]
         let r = await this.indexBlock(ic.block,ic.consignmentid)
         
    }

  }

  broadcastMessage(action, data){
    Object.keys(this.connectedPeers).forEach((peer) => {
      if(peer !== (this.discoveryServerUrl + ":" + this.discoveryServerMessagePort)) //don't send to discovery Server
        this.sendMessage(peer, action, data, 'broadcast')
    })

  }

  sendMessage(peer, action, data, type){

    logger.info("sendMessage " + action + " to " + peer)
   
    if(typeof type == 'undefined') type = 'private'
    const socket = this.connectedPeers[peer]

    if(!socket)throw new Error("no connection to peer: '" + peer+ "'")

    socket.write({'action': action, 'data': data, 'type': type})

    if(nconf.get("reportstats")){
      const url = "http://" + this.discoveryServerUrl + ":" + this.discoveryServerPort + "/messageout"

      request({
        "uri": url,
        "method":"POST",
        "json":{
          "port":this.port
        }
      })
      .catch(error => {
        logger.error(error)
      })
        
    }

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
         logger.error(error)
          reject(error)
        })
        
      })
      .catch(error => {
        logger.error(error)
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

  startMiningCountdownProcess(minimumtimeout,timeout){

   
    this.setState("mining")
   

    const countdown = minimumtimeout + Math.floor(Math.random() * timeout)
    
    logger.info("start mining countdown process " + countdown)

    this.miningCountdownProcess = fork(nconf.get("miningcountdownprocesspath"),['' + countdown])

    this.miningCountdownProcess.on('exit',this.miningCountdownSuccessCallback.bind(this))
  }

  miningCountdownSuccessCallback(code){
   
    return new Promise((resolve,reject) => {
     
      if(code == 100){ //success
        logger.info("mining countdown process success")
        this.miningCountdownProcess = null
        this.gatherTransactions(this.transactionPoolThreshold)
        .then((transactions) => {
          this.mineBlock(transactions)
          .then((newBlock) => {
            this.setState("running")
           // logger.info("miningCountdownSuccessCallback success")
          //  logger.info(JSON.stringify(newBlock))
           
            resolve(newBlock)
          })
          
        })
        
      }
      if(code == 200){ //failure - has been pre-empted
        logger.info("mining countdown process preempted")
        this.setState("running")
        this.miningCountdownProcess = null
        //logger.info("miningCountdownSuccessCallback pre-empted")
        resolve(true)
      }

    })
    
  }

  //WEBSERVER

  startWebServer(port){
    console.log("startwebserver " + port)
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

