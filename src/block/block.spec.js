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
    const transaction1 = new Transaction({'consignmentid':'cabcdefg','datatype':'application/json','data':{"some":"arbitrary","json":"data"},"publickey":publicKey})
    const transaction2 = {'consignmentid':'cabcdefg','datatype':'application/json','data':{"some":"arbitrary","json":"data"},"publickey":publicKey}


     assert.throws(() => new Block({"previousHash":"abcdef","transactions":[transaction1, transaction2]}),Error, "transactions must be a non-empty array of Transaction class objects")
    done()
  })

  it("fails to create a Block if any of the transactions is not valid", (done) => {
    const transaction1 = new Transaction({'consignmentid':'cabcdefg','datatype':'application/json','data':{"some":"arbitrary","json":"data"},"publickey":publicKey})
    const transaction2 = new Transaction({'consignmentid':'cabcdefg','datatype':'application/json','data':{"someother":"arbitrary","json":"data"},"publickey":publicKey})

    
    transaction2.consignmentid = "cabcdefh" //invalidates it


     assert.throws(() => new Block({"previousHash":"abcdef","transactions":[transaction1, transaction2]}),Error, "Transaction 1 is not valid")
    done()
  })



  it("creates a new Block", (done) => {
    const transaction1 = new Transaction({'consignmentid':'cabcdefg','datatype':'application/json','data':{"some":"arbitrary","json":"data"},"publickey":publicKey})
    const transaction2 = new Transaction({'consignmentid':'cabcdefg','datatype':'application/json','data':{"someother":"arbitrary","json":"data"},"publickey":publicKey})

    const block = new Block({"previousHash":"abcdef","transactions":[transaction1, transaction2]})
    block.should.be.instanceof(Block)
    Block.validate(block).should.eql(true)
    block.transactions.should.be.instanceof(String)

    done()
  })

  it("serializes a Block", (done) => {
    const transaction1 = new Transaction({'consignmentid':'cabcdefg','datatype':'application/json','data':{"some":"arbitrary","json":"data"},"publickey":publicKey})
    const transaction2 = new Transaction({'consignmentid':'cabcdefg','datatype':'application/json','data':{"someother":"arbitrary","json":"data"},"publickey":publicKey})

    const block = new Block({"previousHash":"abcdef","transactions":[transaction1, transaction2]})

    const serializedData = block.serialize()
    serializedData.should.be.instanceof(String)
    done()
  })

  it("de-serializes a block", (done) => {
    //create a new regular block
    const transaction1 = new Transaction({'consignmentid':'cabcdefg','datatype':'application/json','data':{"some":"arbitrary","json":"data"},"publickey":publicKey})
    const transaction2 = new Transaction({'consignmentid':'cabcdefg','datatype':'application/json','data':{"someother":"arbitrary","json":"data"},"publickey":publicKey})

    const block1 = new Block({"previousHash":"abcdef","transactions":[transaction1, transaction2]})

    //serialize it
    const serializedBlock = block1.serialize()

   

    //console.log(block2DataObject)

    const block2 = Block.deserialize(serializedBlock)

    block2.should.be.instanceof(Block)
    Block.validate(block2).should.eql(true)
    block2.transactions.should.be.instanceof(String)

    block2.id.should.eql(block1.id)   //the two blocks should be identical

    done()


  })
  it("fails to validate an invalid block", (done) => {
     //create a new regular block
    const transaction1 = new Transaction({'consignmentid':'cabcdefg','datatype':'application/json','data':{"some":"arbitrary","json":"data"},"publickey":publicKey})
    const transaction2 = new Transaction({'consignmentid':'cabcdefg','datatype':'application/json','data':{"someother":"arbitrary","json":"data"},"publickey":publicKey})

    const block1 = new Block({"previousHash":"abcdef","transactions":[transaction1, transaction2]})

    block1.previousHash = "abcdeg"

    Block.validate(block1).should.eql(false)
    done()

  })

  it("fails to create a block from an invalid serialized block", (done) => {
     //create a new regular block
    const transaction1 = new Transaction({'consignmentid':'cabcdefg','datatype':'application/json','data':{"some":"arbitrary","json":"data"},"publickey":publicKey})
    const transaction2 = new Transaction({'consignmentid':'cabcdefg','datatype':'application/json','data':{"someother":"arbitrary","json":"data"},"publickey":publicKey})

    const block1 = new Block({"previousHash":"abcdef","transactions":[transaction1, transaction2]})

    block1.previousHash = "abcdeg" //invalidate it

    const serializedInvalidBlock = block1.serialize()

    assert.throws(() => Block.deserialize(serializedInvalidBlock),Error, "block is invalid")

    done()

  })
})

