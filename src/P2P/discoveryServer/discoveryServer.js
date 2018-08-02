'use strict'

const express = require('express')

const status = require('http-status')

const bodyParser = require('body-parser')

const logger = require('../../logger/logger.js').logger


//let activeNodes = {} //hash of ip/[array of ports]


const startServer = (port) => {
  return new Promise((resolve, reject) => {
    if(!port) {
      reject(new Error('No port number provided for the server'))
    } 

    const app = express()

    app.use(bodyParser.json())

    app.get('/activeNodes', (req, res, next) => {
      res.status(status.OK).send(app.activeNodes)
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
        if(typeof app.activeNodes[ip] == 'undefined'){
          app.activeNodes[ip] = [port]
        }
        else{
          app.activeNodes[ip].push(port)
        }
        res.status(status.CREATED).send(app.activeNodes)
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
        else if(entry.indexOf(port) == -1){ //port not found for this ip
          res.status(status.NOT_FOUND).send()
        }
        else{
          //remove from the array
          app.activeNodes[ip] = app.activeNodes[ip].filter(e => e != port)
          if(app.activeNodes[ip].length == 0){
            delete app.activeNodes
          }
          res.status(status.OK).send(app.activeNodes)
        }
      }
    })


    const server = app.listen(port, () => {
      app.activeNodes = {}
      resolve(server)
    })

  })
 
}



module.exports = Object.assign({}, {startServer})