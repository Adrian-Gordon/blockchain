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

  it("instantiates a Blockchain with length and latestblockid", (done) => {
    const blockchain = new Blockchain({"length": 1, "latestblockid": "abcdef"})

     blockchain.should.be.instanceof(Blockchain)
     blockchain.length.should.eql(1)
     blockchain.latestblockid.should.eql("abcdef")
     done()
  })

  it("serializes a blockchain", (done) => {
    const blockchain = new Blockchain({})
    const str = blockchain.serialize()
    str.should.be.instanceof(String)
    done()
  })

  it("deserializes a blockchain", (done) => {
    const blockchain = new Blockchain({"length":1, "latestblockid":"abcdef"})
    const str = blockchain.serialize()
    const newbc = Blockchain.deserialize(str)
    newbc.should.be.instanceof(Blockchain)
    newbc.length.should.eql(1)
    newbc.latestblockid.should.eql("abcdef")
    done()
  })

  it("gets the blockchain length", (done) => {
     const blockchain = new Blockchain({"length":1, "latestblockid":"abcdef"})
     const l = blockchain.getLength()
     l.should.eql(1)
     done()
  })
  it("increments the blockchain length", (done) => {
     const blockchain = new Blockchain({"length":1, "latestblockid":"abcdef"})
     blockchain.incrementLength()
     blockchain.length.should.eql(2)
     done()
  })
  it("gets the latest blockid", (done) => {
    const blockchain = new Blockchain({"length":1, "latestblockid":"abcdef"})
    blockchain.getLatestBlockId().should.eql("abcdef")
    done()
  })
  it("sets the latest blockid", (done) => {
    const blockchain = new Blockchain({"length":1, "latestblockid":"abcdef"})
    blockchain.setLatestBlockId("ghijkl")
    blockchain.latestblockid.should.eql("ghijkl")
    done()
  })
  
})