'use strict'

const nconf = require('../config/conf.js').nconf


const logger = require('../logger/logger.js')(module)

const Transaction = require('../transaction/transaction').Transaction

const Block = require('../block/block').Block


class Repository{
  constructor(db){
    if(typeof db == 'undefined'){
      throw new Error('database not provided in Repository constructor"')
    }
    else {
      this.db = db
      
    }
    
  }

 createCollection(collectionName){
    return this.db.open(collectionName)
  }

  deleteCollection(collectionName){
    return this.db.delete(collectionName)
  }

  addTransaction(transaction){

    if(Transaction.verify(transaction)){ //only add a valid transaction
      return this.db.saveRecord('transactionpool', transaction.id,transaction)
    }
    else{
      return Promise.resolve("INVALID")
    }
   
    
    
  }

  deleteTransaction(transactionid){
    return this.db.deleteRecord('transactionpool', transactionid)
  }

  getTransaction(transactionid){
    return new Promise((resolve, reject) => {
      this.db.getRecord('transactionpool',transactionid)
      .then((record) => {
        const transaction = new Transaction(record)
        resolve(transaction)
      })
      .catch(error => {
        reject(error)
      })

    })
   
  }

  getAllTransactions(){
    return new Promise((resolve, reject) => {
      this.db.getAllRecords('transactionpool')
      .then(transactions => {
        resolve(transactions.map((obj)=> {return new Transaction(obj)}))
      })
      .catch(error => {
        reject(error)
      })

    })
  }

  addBlock(block){

    if(Block.validate(block)){ //only add a valid block
      return this.db.saveRecord('blocks', block.id,block)
    }
    else{
      return Promise.resolve("INVALID")
    }
  
  }

  getBlock(blockid){
    return new Promise((resolve, reject) => {
      this.db.getRecord('blocks',blockid)
      .then((record) => {
        const block = new Block(record)
        resolve(block)
      })
      .catch(error => {
        reject(error)
      })

    })
   
  }

  getAllBlocks(){
    return new Promise((resolve, reject) => {
      this.db.getAllRecords('blocks')
      .then(blocks => {
        resolve(blocks.map((obj)=> {return new Block(obj)}))
      })
      .catch(error => {
        reject(error)
      })

    })
  }

  deleteBlock(blockid){
    return this.db.deleteRecord('blocks', blockid)
  }



}

module.exports = Object.assign({},{Repository})