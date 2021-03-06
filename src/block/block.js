'use strict'

const crypto = require('crypto')
const nconf = require('../config/conf.js').nconf

const Transaction = require('../transaction/transaction.js').Transaction

class Block{
  /*timestamp and id should be provided for a de-serialised Block*/
  /*if they re provided, transactions should be a string*/
  /*If id and timestamp are not provided, transactions should be an array of Transactions*/
  constructor({index, previousHash, transactions, timestamp, id}){

    //index must always be provided, and must be a number
    if(typeof index == 'undefined'){
      throw new Error("index must be provided")
    }
    else if(!Number.isInteger(index)){
      throw new Error("index must be an integer")
    }

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
      if((timestamp > 0) && (typeof id == 'undefined')){
         throw new Error("both timestamp and id must be provided for a de-serialised Block")
      }
    }

    //It's a de-serialised block
    if(typeof id !== 'undefined' && typeof timestamp !== 'undefined' && timestamp > 0){
      if(typeof transactions !== 'string'){
        throw new Error("transactions must be stringified for a de-serialised Block")
      }
      this.index = index
      this.timestamp = timestamp
      this.previousHash = previousHash
      this.transactions = transactions
      this.id = id
    }
    else if(timestamp == 0){                //it's a genesis block
      this.index = index
      this.timestamp = timestamp
      this.previousHash = previousHash
      this.transactions = transactions
      this.id =  Block.createHash(this)
    }
    else{ //block to be created from stratch
      if(!Array.isArray(transactions)){
         throw new Error('transactions must be an array')
      }
     // if(transactions.length == 0){
     //   throw new Error('transactions must be a non-empty array')
     // }
      let transactionsArray =[]
      for(let i=0; i< transactions.length; i++){
        if(transactions[i] instanceof Transaction);
        else throw new Error("transactions must of class Transaction")

        if(!Transaction.validate(transactions[i]))
          throw new Error("Transaction " + i + " is not valid")

        transactionsArray.push(transactions[i].serialize())
      }
      
      this.timestamp = Math.round((new Date().getTime()/1000))

      this.previousHash = previousHash
      this.transactions = JSON.stringify(transactionsArray)
      this.index = index
      this.id =  Block.createHash(this)

    }

    //Final validation
    if(Block.validate(this)){
      //console.log("new BlocK :" + JSON.stringify(this))
      return(this)
    }
    else throw new Error("block is invalid")


  }

  isOriginBlock(){
    if((this.index == 0)&&(this.previousHash == "-1")&&(this.transactions == "[]")){
      return(true)
    }
    return(false)
  }
 

  serialize(){
    return JSON.stringify(this)
  }

  static deserialize(str){

    const obj = JSON.parse(str)
  
    return new Block(obj)

  }

  static createHash(block){
    return crypto.createHash(nconf.get('hashalgorithm')).update("" + block.index + block.previousHash + block.timestamp + block.transactions).digest('hex')

  }

  static validate(block){
   
    const hash = crypto.createHash(nconf.get('hashalgorithm')).update("" + block.index + block.previousHash + block.timestamp + block.transactions).digest('hex')
  
    if(hash === block.id)return true
    return false

  }


}


module.exports =Object.assign({},{Block})

