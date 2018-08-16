'use strict'

const should = require('should')

const chai = require('chai')
const assert = chai.assert
const expect = chai.expect


const nconf = require('../config/conf.js').nconf


const Transaction = require('../transaction/transaction.js').Transaction
const fs = require('fs')
const publicKey = fs.readFileSync(nconf.get('publickeyurl'),'utf8')

const Block = require('./block').Block

describe("Block", () => {
  it("fails to create a Block if no previousHash parameter is provided", (done) => {
    assert.throws(() => new Block({}),Error, "previousHash must be provided")
    done()
  })

  it("fails to create a Block if the previousHash parameter is not a string", (done) => {
    assert.throws(() => new Block({"previousHash":-1}),Error, "previousHash must be a string")
    done()
  })

  it("fails to create a Block if the transactions parameter is not provided", (done) => {
    assert.throws(() => new Block({"previousHash":"abcdef"}),Error, "transactions must be provided")
    done()
  })

  it("fails to create a Block if the transactions parameter is an empty array", (done) => {
    assert.throws(() => new Block({"previousHash":"abcdef","transactions":[]}),Error, "transactions must be a non-empty array")
    done()
  })

  it("fails to create a Block if any of the transactions is not a Transaction class object", (done) => {
    const transaction1 = new Transaction({'consignmentid':'cabcdefg','data':{"some":"arbitrary","json":"data"},"publickey":publicKey})
    const transaction2 = {'consignmentid':'cabcdefg','data':{"some":"arbitrary","json":"data"},"publickey":publicKey}


     assert.throws(() => new Block({"previousHash":"abcdef","transactions":[transaction1, transaction2]}),Error, "transactions must be a non-empty array of Transaction class objects")
    done()
  })

  it("fails to create a Block if any of the transactions is not valid", (done) => {
    const transaction1 = new Transaction({'consignmentid':'cabcdefg','data':{"some":"arbitrary","json":"data"},"publickey":publicKey})
    const transaction2 = new Transaction({'consignmentid':'cabcdefg','data':{"someother":"arbitrary","json":"data"},"publickey":publicKey})

    
    transaction2.consignmentid = "cabcdefh" //invalidates it


     assert.throws(() => new Block({"previousHash":"abcdef","transactions":[transaction1, transaction2]}),Error, "Transaction 1 is not valid")
    done()
  })



  it("creates a new Block", (done) => {
    const transaction1 = new Transaction({'consignmentid':'cabcdefg','data':{"some":"arbitrary","json":"data"},"publickey":publicKey})
    const transaction2 = new Transaction({'consignmentid':'cabcdefg','data':{"someother":"arbitrary","json":"data"},"publickey":publicKey})

    const block = new Block({"previousHash":"abcdef","transactions":[transaction1, transaction2]})
    block.should.be.instanceof(Block)
    Block.validate(block).should.eql(true)
    block.transactions.should.be.instanceof(String)

    done()
  })
})

