'use strict'

const crypto = require('crypto')
const nconf = require('../config/conf.js').nconf

const Transaction = require('../transaction/transaction.js').Transaction

class Block{
  constructor({previousHash, transactions, timestamp, id}){
    let transactionsArray =[]
    if(typeof previousHash == 'undefined'){
      throw new Error("previousHash must be provided")
    }
    else if(typeof previousHash !== 'string'){
      throw new Error('previousHash must be a string')
    }
    if(typeof transactions == 'undefined'){
      throw new Error("transactions must be provided")
    }
    else if(transactions.length == 0){
      throw new Error('transactions must be a non-empty array')
    }

    for(let i=0; i< transactions.length; i++){
      if(transactions[i] instanceof Transaction);
      else throw new Error("transactions must be a non-empty array of Transaction class objects")

      if(!Transaction.validate(transactions[i]))
        throw new Error("Transaction " + i + " is not valid")

      transactionsArray.push(transactions[i].serialize())
    }

    if(typeof timestamp != 'undefined' && !parseInt(timestamp)){
      throw new Error("timestamp must be an integer")
    }

    //if this is block de-serialised out of the database, or provided in a message
    //timestamp and id will be provided

    if(typeof timestamp == 'undefined')
      this.timestamp = Math.round((new Date().getTime()/1000))
    else this.timestamp = parseInt(timestamp)

    if(typeof id !== 'undefined')
      this.id = id
    else this.id = Block.createHash(this)




    this.previousHash = previousHash
    this.transactions = JSON.stringify(transactionsArray)
   
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


module.exports =({},{Block})

