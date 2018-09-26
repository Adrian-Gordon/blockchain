'use strict'

const express = require('express')

const status = require('http-status')

const bodyParser = require('body-parser')

const logger = require('../../logger/logger.js').logger

const topology = require('fully-connected-topology')

const jsonStream = require('duplex-json-stream')



let app = null


//let activeNodes = {} //hash of ip/[array of ports]
 var swarm = null

const startServer = (port1, port2) => {
  swarm =topology("127.0.0.1:" + port2)
  swarm.on('connection', connectionCallback)
  return new Promise((resolve, reject) => {
    if(!port1) {
      reject(new Error('No port number provided for the discovery server web service'))
    } 

    if(!port2) {
      reject(new Error('No port number provided for the discovery server message service'))
    } 

    app = express()

    app.use(bodyParser.json())

    app.get('/activeNodes', (req, res, next) => {
      let returnedObj = {}

      Object.keys(app.activeNodes).forEach(key => {
        let ips = []
        Object.keys(app.activeNodes[key]).forEach(port => {
          ips.push(port)
        })

        /*let ips = app.activeNodes[key].map(obj => {
          return obj.port
        })*/
        returnedObj[key] = ips
      })
      res.status(status.OK).send(returnedObj)
    })

   

    app.post('/activeNodes', (req, res, next) => {
      let port = req.body.port
      let ip = req.ip

      if(ip.indexOf(':') !== -1){ //if it's an ip v6 
        ip = ip.split(':')[3]
      }
      
      if(typeof port == 'undefined'){
        res.status(status.BAD_REQUEST).send()
      }
      else if(isNaN(parseInt(port))){
        res.status(status.BAD_REQUEST).send()
      }
      else{
        const addResult = swarm.add(ip + ":" + port)
        let socket = swarm.peer(ip + ":" + port)
        
        
        if(typeof app.activeNodes[ip] == 'undefined'){
          app.activeNodes[ip]={}
          app.activeNodes[ip][port] = socket
        }
        else{

          app.activeNodes[ip][port] = socket
          
        }
      
        res.status(status.CREATED).send({"ip": ip, "port":port})
      }
      
    })

     app.delete('/activeNodes', (req, res, next) => {
      let port = req.body.port
      let ip = req.ip
      if(ip.indexOf(':') !== -1){ //if it's an ip v6 
        ip = ip.split(':')[3]
      }
      if(typeof port == 'undefined'){
        res.status(status.BAD_REQUEST).send()
      }
      else if(isNaN(parseInt(port))){
        res.status(status.BAD_REQUEST).send()
      }
      else {
        let entry = app.activeNodes[ip]

        if(typeof entry == 'undefined'){
          res.status(status.NOT_FOUND).send()
        }
        else{
           
          if(typeof entry[port] == 'undefined'){ //port not found for this ip
            res.status(status.NOT_FOUND).send()
          }
          else{
          
              deleteFromActiveNodes(ip, port)
             let returnedObj = {}

            Object.keys(app.activeNodes).forEach(key => {
              let ips = []
              Object.keys(app.activeNodes[key]).forEach(port => {
                ips.push(port)
              })

       
            returnedObj[key] = ips
             })
            res.status(status.OK).send(returnedObj)
          }
        }
      }
    })


    const server = app.listen(port1, () => {
      //swarm =topology("127.0.0.1:" + port2)
      //swarm.on('connection', connectionCallback)
      app.activeNodes = {}
      resolve(server)
    })

  })
 
}

const deleteFromActiveNodes = (ip, port) => {
  if(typeof app.activeNodes[ip][port] !== 'undefined')
    delete app.activeNodes[ip][port]
  if(Object.keys(app.activeNodes[ip]).length == 0){
    delete app.activeNodes[ip]
  }

}

const connectionCallback = (connection, peer) => {
    const socket = jsonStream(connection)
    socket.on('data', (data) => {
     //deal with the message

    })
    socket.on('end', () => {
     
      const index = peer.indexOf(':')
      const ip = peer.substring(0,index)
      const port = peer.substring(index+1,peer.length)
      
      deleteFromActiveNodes(ip, port)
      console.log("discovery server disconnects from " + peer)
     
    })

    console.log("discovery server connected to " + peer)

    const index = peer.indexOf(':')
    const ip = peer.substring(0,index)
    const port = parseInt(peer.substring(index+1,peer.length))

    if(typeof app.activeNodes[ip] == 'undefined'){
          app.activeNodes[ip]={}
          app.activeNodes[ip][port] = socket
    }
    else{

          app.activeNodes[ip][port] = socket
         
    }

   
    return(true)
    
  }

  const getSwarm = () => {
    return swarm
  }



module.exports = {startServer,getSwarm}