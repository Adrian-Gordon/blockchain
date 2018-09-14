'use strict'

const should = require('should')

const chai = require('chai')
const assert = chai.assert
const expect = chai.expect


const nconf = require('../config/conf.js').nconf

const Blockchain = require('./blockchain').Blockchain

describe("Blockchain", () => {
  

   it("throws an error if length is not an integer", (done) => {
    assert.throws(() => new Blockchain({"length":"abc","latestblockid":"abcdef", "latestblockindex": 1}),Error,"length must be an integer")
    done()
  })

   it("throws an error if latest block id is not a string", (done) => {
    assert.throws(() => new Blockchain({"length":10,"latestblockid":100, "latestblockindex": 100}),Error,"latestblockid must be a string")
    done()
  })

  it("throws and error if length is not provided for a deserialized Blockchain", (done) => {
    
    assert.throws(() => new Blockchain({"latestblockid": "abcdef", "latestblockindex": 1}),Error, "length, letsetblockid and latestblockindex must be provided")
    done()
  })

  it("throws and error if latestblockid is not provided for a deserialized Blockchain", (done) => {
    
    assert.throws(() => new Blockchain({"length": 10, "latestblockindex": 1}),Error, "length, letsetblockid and latestblockindex must be provided")
    done()
  })

  

  it("instantiates a Blockchain with length and latestblockid", (done) => {
    const blockchain = new Blockchain({"length": 1, "latestblockid": "abcdef","latestblockindex": 10})

     blockchain.should.be.instanceof(Blockchain)
     blockchain.length.should.eql(1)
     blockchain.latestblockid.should.eql("abcdef")
     blockchain.latestblockindex.should.eql(10)
     done()
  })

  it("serializes a blockchain", (done) => {
    const blockchain = new Blockchain({"length": 1, "latestblockid": "abcdef","latestblockindex": 10})
    const str = blockchain.serialize()
    str.should.be.instanceof(String)
    done()
  })

  it("deserializes a blockchain", (done) => {
    const blockchain = new Blockchain({"length":1, "latestblockid":"abcdef","latestblockindex": 10})
    const str = blockchain.serialize()
    const newbc = Blockchain.deserialize(str)
    newbc.should.be.instanceof(Blockchain)
    newbc.length.should.eql(1)
    newbc.latestblockid.should.eql("abcdef")
    newbc.latestblockindex.should.eql(10)
    done()
  })

  it("gets the blockchain length", (done) => {
     const blockchain = new Blockchain({"length":1, "latestblockid":"abcdef","latestblockindex": 10})
     const l = blockchain.getLength()
     l.should.eql(1)
     done()
  })
  it("increments the blockchain length", (done) => {
     const blockchain = new Blockchain({"length":1, "latestblockid":"abcdef","latestblockindex": 10})
     blockchain.incrementLength()
     blockchain.length.should.eql(2)
     done()
  })
  it("gets the latest blockid", (done) => {
    const blockchain = new Blockchain({"length":1, "latestblockid":"abcdef","latestblockindex": 10})
    blockchain.getLatestBlockId().should.eql("abcdef")
    done()
  })
  it("throws an error when calling setLatestBlockId with a non-string", (done) => {
    const blockchain = new Blockchain({"length":1, "latestblockid":"abcdef","latestblockindex": 10})
    assert.throws(()=> blockchain.setLatestBlockId(100),Error,"blockId should be a string")
    done()
  })
  it("sets the latest blockid", (done) => {
    const blockchain = new Blockchain({"length":1, "latestblockid":"abcdef","latestblockindex": 10})
    blockchain.setLatestBlockId("ghijkl")
    blockchain.latestblockid.should.eql("ghijkl")
    done()
  })
  it("gets the latestblockindex", (done) => {
    const blockchain = new Blockchain({"length":1, "latestblockid":"abcdef","latestblockindex": 10})
    blockchain.getLatestBlockIndex().should.eql(10)
    done()
  })
  it("throws an error when calling setLatestBlockIndex with a non-integer", (done) => {
    const blockchain = new Blockchain({"length":1, "latestblockid":"abcdef","latestblockindex": 10})
    assert.throws(()=> blockchain.setLatestBlockIndex("abc"),Error,"index should be an integer")
    done()
  })
  it("sets the latest blockindex", (done) => {
    const blockchain = new Blockchain({"length":1, "latestblockid":"abcdef","latestblockindex": 10})
    blockchain.setLatestBlockIndex(20)
    blockchain.getLatestBlockIndex().should.eql(20)
    done()
  })
  
})