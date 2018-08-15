'use strict'

const nconf = require('../config/conf.js').nconf


const logger = require('../logger/logger.js')(module)

const Transaction = require('../transaction/transaction').Transaction


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
    return this.db.getRecord('transactionpool',transactionid)
  }


}

module.exports = Object.assign({},{Repository})