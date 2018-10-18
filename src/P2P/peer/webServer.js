'use strict'

const express = require('express')

const status = require('http-status')

const bodyParser = require('body-parser')

const fs = require('fs')

const nconf = require('../../config/conf.js').nconf

const publicKey = fs.readFileSync(nconf.get('publickeyurl'),'utf8')

const Transaction = require('../../transaction/transaction').Transaction

const Message = require('../../message/message').Message



let expressApp = null

const startServer = (peer, port) => {
  return new Promise((resolve, reject) => {
    expressApp = express()
    expressApp.peer = peer

    expressApp.use(bodyParser.json())

    expressApp.post('/transactions', (req, res, next) => {
      try{
        const inputTrans = req.body

        //set the publicKey
        inputTrans.publickey = publicKey
        //console.log(JSON.stringify(inputTrans))

        const transaction = new Transaction(inputTrans)

        expressApp.peer.addTransaction(transaction)
        .then((trans) => {


          const tStr = trans.serialize()

          expressApp.peer.broadcastMessage('addtransaction',tStr)

          res.status(status.CREATED).send(trans)


        })


      }catch(error){
        res.status(status.BAD_REQUEST).send(error)
      }
        
      
    })
    expressApp.get('/transactions',(req, res, next) => {
      expressApp.peer.repository.getAllTransactions()
      .then(transactions => {
        res.status(status.OK).send(transactions)
      })
      .catch(error => {
        res.status(status.BAD_REQUEST).send(error)
      })
    })

    expressApp.get('/blocks',(req, res, next) => {
      expressApp.peer.repository.getAllBlocks()
      .then(blocks => {
        res.status(status.OK).send(blocks)
      })
      .catch(error => {
        res.status(status.BAD_REQUEST).send(error)
      })
    })



    const server = expressApp.listen(port, () => {
      resolve(server)
    })
  })
}

module.exports = {startServer}