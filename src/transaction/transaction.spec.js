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

  it("creates a transaction without a provided timestamp", (done) => {
    const transaction = new Transaction({'consignmentid':'cabcdefg','data':{"some":"arbitrary","json":"data"},"publickey":publicKey})

    transaction.should.be.instanceof(Transaction)
    transaction.timestamp.should.be.instanceof(Number)
    transaction.data.should.eql("{\"some\":\"arbitrary\",\"json\":\"data\"}")
    done()

  })
  it("creates a transaction with a provided integer timestamp", (done) => {
    const transaction = new Transaction({'consignmentid':'cabcdefg','data':{"some":"arbitrary","json":"data"},"publickey":publicKey,'timestamp':123456789})

    transaction.should.be.instanceof(Transaction)
    transaction.timestamp.should.eql(123456789)
    transaction.data.should.eql("{\"some\":\"arbitrary\",\"json\":\"data\"}")
    done()

  })

   it("creates a transaction with a provided valid string timestamp", (done) => {
    const transaction = new Transaction({'consignmentid':'cabcdefg','data':{"some":"arbitrary","json":"data"},"publickey":publicKey,'timestamp':'123456789'})

    transaction.should.be.instanceof(Transaction)
    transaction.timestamp.should.eql(123456789)
     transaction.data.should.eql("{\"some\":\"arbitrary\",\"json\":\"data\"}")
    done()

  })

  it("throws an error if an invalid timestamp is provided", (done) => {
    assert.throws(() => new Transaction({'consignmentid':'cabcdefg','data':{"some":"arbitrary","json":"data"},"publickey":publicKey,'timestamp':"A timestamp"}),Error, "timestamp must be an integer")
    done()
  })

  it("creates a transaction with a string value for data", (done) => {
    const transaction = new Transaction({'consignmentid':'cabcdefg','data':"{'some':'arbitrary','json':'data'}","publickey":publicKey,'timestamp':'123456789'})

    transaction.should.be.instanceof(Transaction)
    transaction.data.should.eql("{'some':'arbitrary','json':'data'}")
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

  it("should serialize", (done) => {
    const transaction = new Transaction({'consignmentid':'cabcdefg','data':{"some":"arbitrary","json":"data"},"publickey":publicKey,"timestamp": 123456789})
    transaction.serialize().should.be.instanceof(String)
    done()
  })

  it("should de-serialize", (done) => {
    const transaction = new Transaction({'consignmentid':'cabcdefg','data':{"some":"arbitrary","json":"data"},"publickey":publicKey,"timestamp": 123456789})
    const str = transaction.serialize()
    const newTrans = Transaction.deserialize(str)
    newTrans.should.be.instanceof(Transaction)
    newTrans.consignmentid.should.eql('cabcdefg')
    newTrans.publickey.should.eql(publicKey)
    newTrans.timestamp.should.eql(123456789)
    expect(newTrans.id).to.exist
    newTrans.data.should.be.instanceof(String)
    done()

  })

   it("throws an error when trying to create an invalid transaction", (done) => {
    //create a valid transaction
     const transaction = new Transaction({'consignmentid':'cabcdefg','data':{"some":"arbitrary","json":"data"},"publickey":publicKey,"timestamp": 123456789})

     //change some data in it - making it invalid

     transaction.timestamp = 123456780

     //serialize it
     const str = transaction.serialize()
     //deserializing it should throw an error
      assert.throws(() => Transaction.deserialize(str),Error, "transaction is invalid")



      done()
  })

})