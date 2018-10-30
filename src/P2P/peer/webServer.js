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
        expressApp.peer.getRepositoryTransactionPoolSize()
        .then(size2 => {
          res.status(status.OK).send({"size": expressApp.peer.getTransactionPoolSize(),"reposize":size2,"threshold":expressApp.peer.getTransactionPoolThreshold(),"transactions":transactions})
        })
        
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
     expressApp.get('/blockchain',(req, res, next) => {
      expressApp.peer.repository.getBlockchain('blockchain')
      .then(blockchain => {
        res.status(status.OK).send(blockchain)
      })
      .catch(error => {
        res.status(status.BAD_REQUEST).send(error)
      })
    })
     expressApp.get('/consignments/:consignmentid',(req, res, next) => {
      const consignmentid = req.params.consignmentid
      expressApp.peer.repository.getConsignmentIndex(consignmentid)
      .then(index => {
        const blockids = index.blockids
        const blockPromises = blockids.map(bid => {
          return peer.repository.getBlock(bid)
        })
        Promise.all(blockPromises)
        .then(blocks => {
          let allGoodTransactions = []
          blocks.forEach(block =>{
            
            const transactions = JSON.parse(block.transactions)

            const goodTransactions = transactions.filter(t => {
              //console.log("t: " + t)
              const t1 = JSON.parse(t)
             
              if(t1.consignmentid == consignmentid) return true
              return false
            })
           
            allGoodTransactions = allGoodTransactions.concat(goodTransactions)
            
          })

          res.status(status.OK).send(allGoodTransactions.map(t => JSON.parse(t)))
        })
        .catch(error => {
          console.log(error)
          res.status(status.BAD_REQUEST).send(error)
        })
        
      })
      .catch(error => {
        console.log(error)
        res.status(status.BAD_REQUEST).send(error)
      })

     })



    const server = expressApp.listen(port, () => {
      resolve(server)
    })
  })
}

module.exports = {startServer}