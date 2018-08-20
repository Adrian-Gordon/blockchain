'use strict'

const crypto = require('crypto')
const nconf = require('../config/conf.js').nconf

const Transaction = require('../transaction/transaction.js').Transaction

class Block{
  /*timestamp and id should be provided for a de-serialised Block*/
  /*if they re provided, transactions should be a string*/
  /*If id and timestamp are not provided, transactions should be an array of Transactions*/
  constructor({previousHash, transactions, timestamp, id}){

    //previous hash must always be provided, and must be a string
    if(typeof previousHash == 'undefined'){
      throw new Error("previousHash must be provided")
    }
    else if(typeof previousHash !== 'string'){
      throw new Error('previousHash must be a string')
    }

    //transactions must always be provided, but will be either a string or an array of Transactions
    if(typeof transactions == 'undefined'){
      throw new Error("transactions must be provided")
    }

    if(typeof id !== 'undefined'){
      if(typeof timestamp == 'undefined'){
        throw new Error("both timestamp and id must be provided for a de-serialised Block")
      }
    }
    if(typeof timestamp !== 'undefined'){
      if(typeof id == 'undefined'){
         throw new Error("both timestamp and id must be provided for a de-serialised Block")
      }
    }

    //It's a de-serialised block
    if(typeof id !== 'undefined' && typeof timestamp !== 'undefined'){
      if(typeof transactions !== 'string'){
        throw new Error("transactions must be stringified for a de-serialised Block")
      }

      this.timestamp = timestamp
      this.previousHash = previousHash
      this.transactions = transactions
      this.id = id
    }
    else{ //block to be created from stratch
      if(!Array.isArray(transactions)){
         throw new Error('transactions must be an array')
      }
      if(transactions.length == 0){
        throw new Error('transactions must be a non-empty array')
      }
      let transactionsArray =[]
      for(let i=0; i< transactions.length; i++){
        if(transactions[i] instanceof Transaction);
        else throw new Error("transactions must be a non-empty array of Transaction class objects")

        if(!Transaction.validate(transactions[i]))
          throw new Error("Transaction " + i + " is not valid")

        transactionsArray.push(transactions[i].serialize())
      }
      this.timestamp = Math.round((new Date().getTime()/1000))
      this.previousHash = previousHash
      this.transactions = JSON.stringify(transactionsArray)
      this.id =  Block.createHash(this)
    }

    //Final validation
    if(Block.validate(this))return(this)
    else throw new Error("block is invalid")


  }
 

  serialize(){
    return JSON.stringify(this)
  }

  static deserialize(str){
    const obj = JSON.parse(str)
  
    return new Block(obj)

  }

  static createHash(block){
    return crypto.createHash(nconf.get('hashalgorithm')).update(block.previousHash + block.timestamp + block.transactions).digest('hex')

  }

  static validate(block){
    const hash = crypto.createHash(nconf.get('hashalgorithm')).update(block.previousHash + block.timestamp + block.transactions).digest('hex')
  
    if(hash === block.id)return true
    return false

  }


}


module.exports =Object.assign({},{Block})

