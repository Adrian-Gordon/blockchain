'use strict'

const express = require('express')

const status = require('http-status')

const bodyParser = require('body-parser')

const logger = require('../../logger/logger.js').logger

const topology = require('fully-connected-topology')

const jsonStream = require('duplex-json-stream')

const cors = require('cors')



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

    app.use(cors())

    app.use(bodyParser.json())

    app.get('/activeNodes', (req, res, next) => {
      let returnedObj = {}
      Object.keys(app.activeNodes).forEach(key => {
       
        let ips = []
        Object.keys(app.activeNodes[key]).forEach(port => {
          
          ips.push({'port':parseInt(port),'webport':app.activeNodes[key][port]['webport']})
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
      let webport = req.body.webport
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
       if(typeof webport == 'undefined'){
        res.status(status.BAD_REQUEST).send()
      }
      else if(isNaN(parseInt(webport))){
        res.status(status.BAD_REQUEST).send()
      }
      else{
        const addResult = swarm.add(ip + ":" + port)
        let socket = swarm.peer(ip + ":" + port)
        
        
        if(typeof app.activeNodes[ip] == 'undefined'){
          app.activeNodes[ip]={}
          app.activeNodes[ip][port] = {"webport":webport,"socket":socket,"stats":{"bclength":0,"tpoollength":0,"messagesin":0,"messagesout":0}}
        }
        else{

          app.activeNodes[ip][port] = {"webport":webport,"socket":socket,"stats":{"bclength":0,"tpoollength":0,"messagesin":0,"messagesout":0}}
          
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

     app.get('/stats', (req, res, next) => {
      let returnedObj = {}

      Object.keys(app.activeNodes).forEach(key => {
        let ips = {}
        Object.keys(app.activeNodes[key]).forEach(port => {
          ips[port] = app.activeNodes[key][port].stats
        })

        /*let ips = app.activeNodes[key].map(obj => {
          return obj.port
        })*/
        returnedObj[key] = ips
      })
      res.status(status.OK).send(returnedObj)

     })

     app.post('/messagein', (req, res, next) => {
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
      else if(typeof app.activeNodes[ip] !== 'undefined' && app.activeNodes[ip][port] !== 'undefined'){
        const count = app.activeNodes[ip][port]["stats"]["messagesin"]

        app.activeNodes[ip][port]["stats"]["messagesin"] = count + 1
        res.status(status.CREATED).send({"count": app.activeNodes[ip][port]["stats"]["messagesin"]})


      }
      else {
         res.status(status.NOT_FOUND).send()
      }
    })

     app.post('/messageout', (req, res, next) => {
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
      else if(typeof app.activeNodes[ip] !== 'undefined' && app.activeNodes[ip][port] !== 'undefined'){
        const count = app.activeNodes[ip][port]["stats"]["messagesout"]

        app.activeNodes[ip][port]["stats"]["messagesout"] = count + 1
        res.status(status.CREATED).send({"count": app.activeNodes[ip][port]["stats"]["messagesout"]})


      }
      else {
         res.status(status.NOT_FOUND).send()
      }
    })

    app.post('/bclength', (req, res, next) => {
      let port = req.body.port
      let length = req.body.length
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
      else if(typeof app.activeNodes[ip] !== 'undefined' && app.activeNodes[ip][port] !== 'undefined'){
        

        app.activeNodes[ip][port]["stats"]["bclength"] = length
        res.status(status.CREATED).send({"length": app.activeNodes[ip][port]["stats"]["bclength"]})


      }
      else {
         res.status(status.NOT_FOUND).send()
      }
    })

    app.post('/tpoollength', (req, res, next) => {
      let port = req.body.port
      let length = req.body.length
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
      else if(typeof app.activeNodes[ip] !== 'undefined' && app.activeNodes[ip][port] !== 'undefined'){
        

        app.activeNodes[ip][port]["stats"]["tpoollength"] = length
        res.status(status.CREATED).send({"length": app.activeNodes[ip][port]["stats"]["tpoollength"]})


      }
      else {
         res.status(status.NOT_FOUND).send()
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
    socket.on('data', onDataCallback)
    socket.on('end', () => {
     
      const index = peer.indexOf(':')
      const ip = peer.substring(0,index)
      const port = peer.substring(index+1,peer.length)
      
      deleteFromActiveNodes(ip, port)
    
    })

  

    const index = peer.indexOf(':')
    const ip = peer.substring(0,index)
    const port = parseInt(peer.substring(index+1,peer.length))

  /*  if(typeof app.activeNodes[ip] == 'undefined'){
          app.activeNodes[ip]={}
          app.activeNodes[ip][port] = {"socket":socket,"stats":{"bclength":0,"tpoollength":0,"messagesin":0,"messagesout":0}}
    }
    else{

          app.activeNodes[ip][port] = {"socket":socket,"stats":{"bclength":0,"tpoollength":0,"messagesin":0,"messagesout":0}}
         
    }*/

   
    return(true)
    
  }

  const onDataCallback = (data) => {
  
  }

  const getSwarm = () => {
    return swarm
  }

  const startStatsResetTask = (time) => {
    
    const statsClearInterval = setInterval(() =>  {
      Object.keys(app.activeNodes).forEach(key => {
        Object.keys(app.activeNodes[key]).forEach(port => {
          app.activeNodes[key][port]["stats"]["messagesin"] = 0
          app.activeNodes[key][port]["stats"]["messagesout"] = 0
        })
      })
      
    }, time)
  }



module.exports = {startServer,getSwarm, startStatsResetTask}