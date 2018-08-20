'use strict'

const should = require('should')

const chai = require('chai')
const assert = chai.assert
const expect = chai.expect


const nconf = require('../config/conf.js').nconf

const Blockchain = require('./blockchain').Blockchain

describe("Blockchain", () => {
  

   it("throws an error if length is not an integer", (done) => {
    assert.throws(() => new Blockchain({"length":"abc"}),Error,"length must be a number")
    done()
  })

   it("throws an error if latest block id is not a string", (done) => {
    assert.throws(() => new Blockchain({"length":10,"latestblockid":100}),Error,"latestblockid must be a string")
    done()
  })

  it("throws and error if both length and latest block id are not provided for a deserialized Blockchain", (done) => {
    
    assert.throws(() => new Blockchain({"length": 1}),Error, "both length and latest block id must be provided for a de-serialised Blockchain")
    done()
  })

  it("instantiates a Blockchain with no data", (done) => {
    const blockchain = new Blockchain({})

     blockchain.should.be.instanceof(Blockchain)
     blockchain.length.should.eql(0)
     should.not.exist(blockchain.latestblockid)
     done()
  })
})