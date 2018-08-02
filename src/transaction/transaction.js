'use strict'

const crypto = require('crypto')
const nconf = require('../config/conf.js').nconf
const fs = require('fs')


const privateKey = fs.readFileSync(nconf.get('privatekeyurl'),'utf8')
const publicKey = fs.readFileSync(nconf.get('publickeyurl'),'utf8')

class Transaction{
  constructor({consignmentid,data, publickey}){

    if(typeof publickey === 'undefined'){
      throw new Error("no publickey provided")
    }
    
    this.consignmentid = consignmentid
    this.timestamp = Math.round((new Date().getTime()/1000))
    this.data = JSON.stringify(data)
    this.publickey = publickey
    this.signature = Transaction.sign(this)
    this.id = Transaction.createHash(this)


    return(this)
  }

  static createHash(transaction){
    return crypto.createHash(nconf.get('hashalgorithm')).update(transaction.consignmentid + transaction.timestamp +transaction.data + transaction.publickey + transaction.signature).digest('hex')

  }

  static validate(transaction){
    const hash = crypto.createHash(nconf.get('hashalgorithm')).update(transaction.consignmentid + transaction.timestamp +transaction.data + transaction.publickey + transaction.signature).digest('hex')
    if(hash === transaction.hash)return true
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