'use strict'

const should = require('should')

const chai = require('chai')
const assert = chai.assert
const expect = chai.expect

const logger = require('../logger/logger.js')(module)

const fs = require('fs')

const nconf = require('../config/conf.js').nconf

const publicKey = fs.readFileSync(nconf.get('publickeyurl'),'utf8')


const Transaction = require('./transaction').Transaction

describe('Transaction', () => {

  it("creates a transaction", (done) => {
    const transaction = new Transaction({'consignmentid':'cabcdefg','data':{"some":"arbitrary","json":"data"},"publickey":publicKey})

    transaction.should.be.instanceof(Transaction)
    done()

  })
  it("generates a signature for a transaction", (done) => {
    const transaction = new Transaction({'consignmentid':'cabcdefg','data':{"some":"arbitrary","json":"data"},"publickey":publicKey})
    let signature = Transaction.sign(transaction)
    signature.should.be.instanceof(String)
    done()

  })

  it("should verify a transaction with a valid signature", (done) => {
    const transaction = new Transaction({'consignmentid':'cabcdefg','data':{"some":"arbitrary","json":"data"},"publickey":publicKey})
    Transaction.verify(transaction).should.eql(true)
    done()

  })

  it("should fail to verify a transaction with an invalid signature", (done) => {
    const transaction = new Transaction({'consignmentid':'cabcdefg','data':{"some":"arbitrary","json":"data"},"publickey":publicKey})
    transaction.consignmentid = 'cabcdefh'
    Transaction.verify(transaction).should.eql(false)
    done()
  })

})