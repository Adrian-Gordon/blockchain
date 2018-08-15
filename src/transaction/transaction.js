'use strict'

const crypto = require('crypto')
const nconf = require('../config/conf.js').nconf
const fs = require('fs')


const privateKey = fs.readFileSync(nconf.get('privatekeyurl'),'utf8')
const publicKey = fs.readFileSync(nconf.get('publickeyurl'),'utf8')

class Transaction{
  constructor({consignmentid,data, publickey, timestamp, id}){

    if(typeof publickey === 'undefined'){
      throw new Error("no publickey provided")
    }
    if(typeof timestamp != 'undefined' && !parseInt(timestamp)){
      throw new Error("timestamp must be an integer")
    }
    this.consignmentid = consignmentid
    if(typeof timestamp == 'undefined')
      this.timestamp = Math.round((new Date().getTime()/1000))
    else this.timestamp = parseInt(timestamp)
   
    if(typeof data === 'string')
      this.data = data
    else this.data = JSON.stringify(data)
    this.publickey = publickey
    this.signature = Transaction.sign(this)
    if(typeof id !== 'undefined')
      this.id = id
    else this.id = Transaction.createHash(this)
    

    if(Transaction.validate(this))return(this)
    else throw new Error("transaction is invalid")

    
  }

  serialize(){
    return JSON.stringify(this)
  }

  static deserialize(str){
    const obj = JSON.parse(str)
  
    return new Transaction(obj)

  }

  static createHash(transaction){
    return crypto.createHash(nconf.get('hashalgorithm')).update(transaction.consignmentid + transaction.timestamp +transaction.data + transaction.publickey + transaction.signature).digest('hex')

  }

  static validate(transaction){
    const hash = crypto.createHash(nconf.get('hashalgorithm')).update(transaction.consignmentid + transaction.timestamp +transaction.data + transaction.publickey + transaction.signature).digest('hex')
  
    if(hash === transaction.id)return true
    return false

  }

  static sign(transaction){
    const sign = crypto.createSign(nconf.get('hashalgorithm'))
    sign.update(transaction.consignmentid + transaction.timestamp +transaction.data + transaction.publickey)
    return sign.sign(privateKey,nconf.get("signatureformat"))
    
  }

  static verify(transaction){
    const verify = crypto.createVerify(nconf.get('hashalgorithm'))
    verify.update(transaction.consignmentid + transaction.timestamp +transaction.data + transaction.publickey)
    return(verify.verify(transaction.publickey,transaction.signature,nconf.get("signatureformat")))

  }

}

module.exports = Object.assign({},{Transaction})