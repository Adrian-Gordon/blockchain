'use strict'

const should = require('should')

const chai = require('chai')
const assert = chai.assert
const expect = chai.expect

const crypto = require('crypto')


const nconf = require('../config/conf.js').nconf

const Blockchain = require('./blockchain').Blockchain
const Block = require('../block/block.js').Block
const Transaction = require('../transaction/transaction.js').Transaction

const Levelupdb = require('../database/leveldb/levelup').Levelupdb
const Repository = require('../repository/repository.js').Repository

const fs = require('fs')

const privateKey = fs.readFileSync(nconf.get('privatekeyurl'),'utf8')

const publicKey = fs.readFileSync(nconf.get('publickeyurl'),'utf8')

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

  it("throws an error if provided hash is invalid for a serialised blockchain", (done) => {
    assert.throws(() => new Blockchain({"length": 10, "latestblockindex": 1, "latestblockid":"abcdef", "hash": "qwe342432"}),Error, "blockchain is invalid")
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
    const hash = crypto.createHash(nconf.get('hashalgorithm')).update("blockchain" + 1 +  10 + "abcdef").digest('hex')
    const blockchain = new Blockchain({"length":1, "latestblockid":"abcdef","latestblockindex": 10,"hash": hash})
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

  it("validates a set of saved blocks with respect to a blockchain", (done) => {
    //create a repository
     const repo = new Repository(Levelupdb)

     repo.createCollection('blocks').then(result => {

         //add some blocks to the repo
        const originBlock = new Block({"previousHash": "-1", "transactions":[],"index":0})

        const transactions1 = [
  
        ]
        transactions1.push(new Transaction({'consignmentid':'cabcdefg','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
        transactions1.push(new Transaction({'consignmentid':'cabcdefh','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
        transactions1.push(new Transaction({'consignmentid':'cabcdefi','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
        
        const block1 = new Block({"previousHash":originBlock.id,"transactions":transactions1, "index":1})

        const transactions2 = [
          
        ]
        transactions2.push(new Transaction({'consignmentid':'cabcdefg','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
        transactions2.push(new Transaction({'consignmentid':'cabcdefh','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
        transactions2.push(new Transaction({'consignmentid':'cabcdefi','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
        
        const block2 = new Block({"previousHash":block1.id,"transactions":transactions2, "index":2})

        const transactions3 = [
          
        ]
        transactions3.push(new Transaction({'consignmentid':'cabcdefg','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
        transactions3.push(new Transaction({'consignmentid':'cabcdefh','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
        transactions3.push(new Transaction({'consignmentid':'cabcdefi','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
        
        const block3 = new Block({"previousHash":block2.id,"transactions":transactions3,"index": 3})


         repo.addBlock(originBlock)
         .then(() => {
          return repo.addBlock(block1)
         })
         .then(() => {
          return repo.addBlock(block2)
         })
         .then(() => {
          return repo.addBlock(block3)
         })
         .then(() => {
            //build the blockchain record
            const blockchain = new Blockchain({"length":4, "latestblockid":block3.id,"latestblockindex": 3})
            
            Blockchain.validateBlocks(blockchain, repo)
            .then((res) => {

              expect(res).to.eql(true)
              Levelupdb.delete('blocks').then(result => {
                done()
              })
            })

            
          })
        
            
        
      })

  })

   it("failsto validate a set of saved blocks with respect to a blockchain, if any of the saved blocks is invalid", (done) => {
    //create a repository
     const repo = new Repository(Levelupdb)

     repo.createCollection('blocks').then(result => {

         //add some blocks to the repo
        const originBlock = new Block({"previousHash": "-1", "transactions":[],"index":0})

        const transactions1 = [
  
        ]
        transactions1.push(new Transaction({'consignmentid':'cabcdefg','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
        transactions1.push(new Transaction({'consignmentid':'cabcdefh','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
        transactions1.push(new Transaction({'consignmentid':'cabcdefi','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
        
        const block1 = new Block({"previousHash":originBlock.id,"transactions":transactions1, "index":1})

        const transactions2 = [
          
        ]
        transactions2.push(new Transaction({'consignmentid':'cabcdefg','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
        transactions2.push(new Transaction({'consignmentid':'cabcdefh','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
        transactions2.push(new Transaction({'consignmentid':'cabcdefi','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
        
        const block2 = new Block({"previousHash":"fakeblockid","transactions":transactions2, "index":2})

        

        const transactions3 = [
          
        ]
        transactions3.push(new Transaction({'consignmentid':'cabcdefg','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
        transactions3.push(new Transaction({'consignmentid':'cabcdefh','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
        transactions3.push(new Transaction({'consignmentid':'cabcdefi','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
        
        const block3 = new Block({"previousHash":block2.id,"transactions":transactions3,"index": 3})


         repo.addBlock(originBlock)
         .then(() => {
          return repo.addBlock(block1)
         })
         .then(() => {
          return repo.addBlock(block2)
         })
         .then(() => {
          return repo.addBlock(block3)
         })
         .then(() => {
            //build the blockchain record
            const blockchain = new Blockchain({"length":4, "latestblockid":block3.id,"latestblockindex": 3})
            
            Blockchain.validateBlocks(blockchain, repo)
            .then((res) => {

              expect(res).to.eql(false)
              Levelupdb.delete('blocks').then(result => {
                done()
              })
            })

            
          })
        
            
        
      })

  })
  
})