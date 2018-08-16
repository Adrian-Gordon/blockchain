'use strict'


const request = require('request-promise-native')
const Transaction = require('../../transaction/transaction').Transaction


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

  }

  getPeers(){
    const peersUrl = this.discoveryServerUrl + ":" + this.discoveryServerPort + "/activeNodes"
    return new Promise((resolve, reject) => {
      request(peersUrl)
      .then((peers)=> {
        resolve(peers)
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
      .then((peers)=> {
        resolve(peers)
      })
      .catch((error)=> {
        reject(error)
      })

    })
  }

  getStatus(){
    return({status:'OK', uptime:(new Date().getTime() - this.startTime)})
  }




  
}

module.exports = Object.assign({},{Peer})

