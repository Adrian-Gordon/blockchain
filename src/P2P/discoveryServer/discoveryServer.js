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
        let ips = app.activeNodes[key].map(obj => {
          return obj.port
        })
        returnedObj[key] = ips
      })
      res.status(status.OK).send(returnedObj)
    })

   

    app.post('/activeNodes', (req, res, next) => {
      let port = req.body.port
      let ip = req.ip
      
      if(typeof port == 'undefined'){
        res.status(status.BAD_REQUEST).send()
      }
      else if(isNaN(parseInt(port))){
        res.status(status.BAD_REQUEST).send()
      }
      else{
        swarm.add(ip + ":" + port)
        let socket = swarm.peer(ip + ":" + port)
        if(typeof app.activeNodes[ip] == 'undefined'){
          app.activeNodes[ip] = [{"port":port,"socket": socket}]
        }
        else{
          let ports = app.activeNodes[ip].map(obj => {return(obj.port)})
          if(!ports.includes(port)){                                  //don't add the same port twice
            app.activeNodes[ip].push({"port":port,"socket": socket})
          }
        }
      
        res.status(status.CREATED).send({"ip": ip, "port":port})
      }
      
    })

     app.delete('/activeNodes', (req, res, next) => {
      let port = req.body.port
      let ip = req.ip
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
          let ports = entry.map(obj => {
            return obj.port
          }) 
          if(ports.indexOf(port) == -1){ //port not found for this ip
            res.status(status.NOT_FOUND).send()
          }
          else{
            //remove from the array
            app.activeNodes[ip] = app.activeNodes[ip].filter(e => e.port != port)
            if(app.activeNodes[ip].length == 0){
              delete app.activeNodes
            }
            res.status(status.OK).send(app.activeNodes)
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

const connectionCallback = (connection, peer) => {
    const socket = jsonStream(connection)
    socket.on('data', (data) => {
     //deal with the message

    })
    socket.on('end', () => {
      /*app.activeNodes[ip] = app.activeNodes[ip].filter(e => e != port)
          if(app.activeNodes[ip].length == 0){
            delete app.activeNodes
          }*/
    })
    console.log("discovery server connected to " + peer)
    return(true)
    
  }

  const getSwarm = () => {
    return swarm
  }



module.exports = {startServer,getSwarm}