'use strict'

const crypto = require('crypto')
const nconf = require('../config/conf.js').nconf
const fs = require('fs')
const logger = require('../logger/logger.js')(module)

const privateKey = fs.readFileSync(nconf.get('privatekeyurl'),'utf8')
const publicKey = fs.readFileSync(nconf.get('publickeyurl'),'utf8')

 const validTransactionTypes = ["despatched","received","importdeclaration","paymentreceived","crossedborder","cvedpresented","waybill"]

class Transaction{
  constructor({consignmentid,transactiontype, data, publickey, timestamp, id, datatype, signature}){

    if(typeof datatype === 'undefined'){
      throw new Error("no transaction datatype provided")
    }
    else if(typeof datatype !== 'string'){
      throw new Error("transaction datatype must be a string")
    }
    if(typeof transactiontype === 'undefined'){
      throw new Error("transactiontype must be provided")
    }
    if(!validTransactionTypes.includes(transactiontype)){
      throw new Error("transactiontype is not valid")
    }

    if(typeof publickey === 'undefined'){
      throw new Error("no publickey provided")
    }
    if(typeof timestamp != 'undefined' && !parseInt(timestamp)){
      throw new Error("timestamp must be an integer")
    }
    this.transactiontype = transactiontype
    this.consignmentid = consignmentid
    if(typeof timestamp == 'undefined')
      this.timestamp = Math.round((new Date().getTime()/1000))
    else this.timestamp = parseInt(timestamp)
   
    this.datatype = datatype
  
    if(typeof data === 'string')
      this.data = data
    else this.data = JSON.stringify(data)
    this.publickey = publickey

    if(typeof signature == 'undefined'){
      this.signature = Transaction.sign(this)
    }
    else{
      this.signature = signature
    }
    if(typeof id !== 'undefined')
      this.id = id
    else this.id = Transaction.createHash(this)
    
    

    if(Transaction.validate(this))return(this)
    else throw new Error("transaction is invalid")

    
  }

  serialize(){
    return JSON.stringify(this)
  }

  getSize(){
    return this.serialize().length
  }

  static deserialize(str){
    const obj = JSON.parse(str)
  //  logger.info(JSON.stringify(obj))
  
    return new Transaction(obj)

  }

  static createHash(transaction){
    //logger.info(transaction.consignmentid + transaction.timestamp +transaction.datatype + transaction.data + transaction.publickey + transaction.signature)
    return crypto.createHash(nconf.get('hashalgorithm')).update(transaction.consignmentid + transaction.timestamp + transaction.transactiontype +transaction.datatype + transaction.data + transaction.publickey + transaction.signature).digest('hex')

  }

  static validate(transaction){
   // logger.info(transaction.consignmentid + transaction.timestamp +transaction.datatype + transaction.data + transaction.publickey + transaction.signature)

    const hash = crypto.createHash(nconf.get('hashalgorithm')).update(transaction.consignmentid + transaction.timestamp + transaction.transactiontype +transaction.datatype + transaction.data + transaction.publickey + transaction.signature).digest('hex')
  
   // logger.info(hash)
   // logger.info(transaction.id)
    if(hash === transaction.id)return true
    return false

  }

  static sign(transaction){
    const sign = crypto.createSign(nconf.get('hashalgorithm'))
    sign.update(transaction.consignmentid + transaction.timestamp +  transaction.transactiontype + transaction.datatype + transaction.data + transaction.publickey)
    return sign.sign(privateKey,nconf.get("signatureformat"))
    
  }

  static verify(transaction){
    const verify = crypto.createVerify(nconf.get('hashalgorithm'))
    verify.update(transaction.consignmentid + transaction.timestamp + transaction.transactiontype +transaction.datatype + transaction.data + transaction.publickey)
    return(verify.verify(transaction.publickey,transaction.signature,nconf.get("signatureformat")))

  }

}

module.exports = Object.assign({},{Transaction})