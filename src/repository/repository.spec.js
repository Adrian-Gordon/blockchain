'use strict'

const should = require('should')

const chai = require('chai')
const assert = chai.assert
const expect = chai.expect

const Levelupdb = require('../database/leveldb/levelup').Levelupdb

const fs = require('fs')

const nconf = require('../config/conf.js').nconf



//const leveldown = require('leveldown')

const Transaction = require('../transaction/transaction.js').Transaction

const Block = require('../block/block.js').Block

const Blockchain = require('../blockchain/blockchain.js').Blockchain


const Repository = require('./repository').Repository

const logger = require('../logger/logger.js')(module)

const publicKey = fs.readFileSync(nconf.get('publickeyurl'),'utf8')

describe("Repository", () => {
  describe("Create a levelup Repository", () => {
     it("fails if no database object is passed", (done) => {
       assert.throws(() => new Repository(),Error, "database not provided in Repository constructor")
      done()
    })
     it("creates a repository object", (done) => {
        const repo = new Repository(Levelupdb)
        should.exist(repo.db)
        done()

     })

  })
  describe("create a collection in a leveldb database", () => {
    it("creates a collection", (done) => {
      const repo = new Repository(Levelupdb)
      repo.createCollection('testcollection').then(result => {
         Levelupdb.collections.should.have.property('testcollection')
         // Levelupdb.close('testcollection').then(result => {    //cleanup from this test
            Levelupdb.delete('testcollection').then(result => {
              done()
            })
            
         // })
      })
    })
  })

  describe("delete a collection from a leveldb database", () => {
    before(() => {
      const repo = new Repository(Levelupdb)
      Promise.resolve(repo.createCollection('testcollection'))
    })

    it("deletes a collection from a leveldb database", (done) => {
      const repo = new Repository(Levelupdb)
      repo.deleteCollection('testcollection').then(result => {
        Levelupdb.collections.should.not.have.property('testcollection')
        done()
      })
    })

  })

  describe("transactions", () => {

    const repo = new Repository(Levelupdb)

    before(() => {
       return new Promise(resolve => {
          repo.createCollection('transactionpool').then(() => {
            resolve()
          })
       })
      
    })
    after(() => {
        return new Promise(resolve => {
          Levelupdb.delete('transactionpool').then(() => {
            resolve()
          })
       })

    })

    it("adds a valid transaction to a leveldb database", (done) => {
      


    const transaction = new Transaction({'consignmentid':'cabcdefg','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey})
    const transactionid = transaction.id

    repo.addTransaction(transaction).then((result)=> {
      result.should.eql('OK')
      Levelupdb.getRecord('transactionpool',transactionid).then(data => {
        data.id.should.eql(transactionid)
        done()
      })
       //done()
    })
    

    })

    it("retrieves a transaction from a leveldb database", (done) => {
      const transaction = new Transaction({'consignmentid':'cabcdefgh','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey})
      const transactionid = transaction.id

      repo.addTransaction(transaction).then((result)=> {
        repo.getTransaction(transactionid).then((data)=> {
          data.should.be.instanceof(Transaction)
          data.id.should.eql(transactionid)
          done()
        })
      })

    })

    it("returns a not found error when retrieving a non-existant transaction from a leveldb database", (done) => {
      repo.getTransaction('t1234568').catch((error)=> {
        error.notFound.should.eql(true)
        done()
      })

    })

    

    it("deletes a transaction from a leveldb database", (done) => {
      const transaction = new Transaction({'consignmentid':'cabcdefi','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey})
      const transactionid = transaction.id

      repo.addTransaction(transaction).then((result)=> {

        repo.deleteTransaction(transactionid).then(result => {
          result.should.eql('OK')
           Levelupdb.getRecord('transactionpool',transactionid).catch(error => { //should throw an error
           // logger.info(error)
            done()
          })
        })
      })
    })

    it("fails to add an invalid transaction to a leveldb database", (done) => {
      const transaction = new Transaction({'consignmentid':'cabcdefj','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey})
      const transactionid = transaction.id
      transaction.consignmentid = 't1234568' //change some of the data
      repo.addTransaction(transaction).then((result) => {
        result.should.eql('INVALID')
        Levelupdb.getRecord(transactionid,'t1234568').catch(error => { //should throw an error
         // logger.info(error)
          done()
        })
        
      })

    })

    it("retrieves all transactions from the repository", (done) => {

      const transactions = [ // plus two existing ones
        
      ]
      transactions.push(new Transaction({'consignmentid':'cabcdefk','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
      transactions.push(new Transaction({'consignmentid':'cabcdefl','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
      transactions.push(new Transaction({'consignmentid':'cabcdefm','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
      const promises = transactions.map(repo.addTransaction.bind(repo))

     

      Promise.all(promises).then((results) =>{
        
        repo.getAllTransactions().then(transactionsReturned => {
           expect(transactionsReturned.length).to.eql(5)
           expect(transactionsReturned[0]).to.be.instanceof(Transaction)
           done()
        })
        .catch((error) => {
          
          expect.fail(null, null ,error)
          done()
        })
       
      })
      .catch((error) => {
        console.log(error)
        expect.fail(null, null ,error)
        done()
      })


    })
  })

describe("blocks", () => {

    const repo = new Repository(Levelupdb)

    before(() => {
       return new Promise(resolve => {
          repo.createCollection('blocks').then(() => {
            resolve()
          })
       })
      
    })
    after(() => {
        return new Promise(resolve => {
          Levelupdb.delete('blocks').then(() => {
            resolve()
          })
       })

    })

    it("adds a valid block to a leveldb database", (done) => {
      
       const transactions = [
        
      ]
      transactions.push(new Transaction({'consignmentid':'cabcdefg','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
      transactions.push(new Transaction({'consignmentid':'cabcdefh','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
      transactions.push(new Transaction({'consignmentid':'cabcdefi','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
      
      const block = new Block({"previousHash":"abcdef","transactions":transactions,"index": 1})

      const blockid = block.id

      repo.addBlock(block).then(result => {
        result.should.eql('OK')
        Levelupdb.getRecord('blocks',blockid).then(data => {
          data.id.should.eql(blockid)
          done()
        })

      })

    
    })
    

    it("retrieves a block from a leveldb database", (done) => {
    
      const transactions = [
        
      ]
      transactions.push(new Transaction({'consignmentid':'cabcdefg','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
      transactions.push(new Transaction({'consignmentid':'cabcdefh','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
      transactions.push(new Transaction({'consignmentid':'cabcdefi','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
      
      const block = new Block({"previousHash":"abcdef","transactions":transactions,"index":1})

      const blockid = block.id

      repo.addBlock(block).then(result => {
        repo.getBlock(blockid).then(data => {
          data.should.be.instanceof(Block)
          data.id.should.eql(blockid)
          done()
        })

      })

    })
    it("returns a not found error when retrieving a non-existant block from a leveldb database", (done) => {
      repo.getBlock('b1234568').catch((error)=> {
        error.notFound.should.eql(true)
        done()
      })

    })

   

    it("deletes a block from a leveldb database", (done) => {
      
      const transactions = [
        
      ]
      transactions.push(new Transaction({'consignmentid':'cabcdefg','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
      transactions.push(new Transaction({'consignmentid':'cabcdefh','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
      transactions.push(new Transaction({'consignmentid':'cabcdefi','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
      
      const block = new Block({"previousHash":"abcdef","transactions":transactions,"index": 1})

      const blockid = block.id

      repo.addBlock(block).then(result => {
        repo.deleteBlock(blockid).then(result => {
          result.should.eql('OK')
          Levelupdb.getRecord('blocks',blockid).catch(error => { //should throw an error
           // logger.info(error)
            done()
          })
        })

      })

    })

    it("fails to add an invalid block to a leveldb database", (done) => {
      
      const transactions = [
        
      ]
      transactions.push(new Transaction({'consignmentid':'cabcdefg','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
      transactions.push(new Transaction({'consignmentid':'cabcdefh','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
      transactions.push(new Transaction({'consignmentid':'cabcdefi','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
      
      const block = new Block({"previousHash":"abcdef","transactions":transactions, "index":1})

      const blockid = block.id
      block.previousHash = "abcdeg"

      repo.addBlock(block).then(result => {
        result.should.eql('INVALID')
        Levelupdb.getRecord('blocks',blockid).catch(error => {
          
          done()
        })

      })



    })

    it("retrieves all blocks from the repository", (done) => {
      const transactions1 = [
        
      ]
      transactions1.push(new Transaction({'consignmentid':'cabcdefg','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
      transactions1.push(new Transaction({'consignmentid':'cabcdefh','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
      transactions1.push(new Transaction({'consignmentid':'cabcdefi','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
      
      const block1 = new Block({"previousHash":"abcdef","transactions":transactions1,"index":1})

      const transactions2 = [
        
      ]
      transactions2.push(new Transaction({'consignmentid':'cabcdefg','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
      transactions2.push(new Transaction({'consignmentid':'cabcdefh','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
      transactions2.push(new Transaction({'consignmentid':'cabcdefi','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
      
      const block2 = new Block({"previousHash":block1.id,"transactions":transactions2, "index": 2})

      const transactions3 = [
        
      ]
      transactions3.push(new Transaction({'consignmentid':'cabcdefg','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
      transactions3.push(new Transaction({'consignmentid':'cabcdefh','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
      transactions3.push(new Transaction({'consignmentid':'cabcdefi','data':{"some":"arbitrary","json":"data"},'datatype':'application/json',"publickey":publicKey}))
      
      const block3 = new Block({"previousHash":block2.id,"transactions":transactions3,"index": 3})

      const blocks = [block1, block2, block3]

      const promises = blocks.map(repo.addBlock.bind(repo))

      Promise.all(promises).then(()=> {
        repo.getAllBlocks().then((results) => {
          results.length.should.eql(3)
          done()
        })
        
      })
      


    })
  })

 
})

describe("blockchain", () => {

    const repo = new Repository(Levelupdb)

    before(() => {
       return new Promise(resolve => {
          repo.createCollection('blockchain').then(() => {
            resolve()
          })
       })
      
    })
    after(() => {
        return new Promise(resolve => {
          Levelupdb.delete('blockchain').then(() => {
            resolve()
          })
       })

    })

    it("adds a valid blockchain to a leveldb database", (done) => {
      
      const blockchain = new Blockchain({"length": 1, "latestblockid": "abcdef","latestblockindex": 10})

      repo.addBlockchain(blockchain).then(result => {
        result.should.eql('OK')
        Levelupdb.getRecord('blockchain',"blockchain").then(data => {
          data.id.should.eql("blockchain")
          done()
        })

      })

    
    })

    it("retrieves a blockchain from a leveldb database", (done) => {

      const blockchain = new Blockchain({"length": 1, "latestblockid": "abcdef","latestblockindex": 10})

      repo.addBlockchain(blockchain).then(result => {
        repo.getBlockchain("blockchain").then(data => {
          data.should.be.instanceof(Blockchain)
          data.id.should.eql("blockchain")
          done()
        })

      })
    })

    it("returns a not found error when retrieving a non-existant blockchain from a leveldb database", (done) => {
      repo.getBlockchain('blockchain1').catch((error)=> {
        error.notFound.should.eql(true)
        done()
      })

    })

    it("deletes a blockchain from a repository", (done) => {

       const blockchain = new Blockchain({"length": 1, "latestblockid": "abcdef","latestblockindex": 10})
      repo.addBlockchain(blockchain).then(result => {
        repo.deleteBlockchain("blockchain").then(result => {
          result.should.eql('OK')
          Levelupdb.getRecord('blockchain',"blockchain").catch(error => { //should throw an error
           // logger.info(error)
            done()
          })
        })

      })
    })

    it("fails to add an invalid blockchain to a leveldb database", (done) => {
      const blockchain = new Blockchain({"length": 1, "latestblockid": "abcdef","latestblockindex": 10})

      blockchain.latestblockid = "bcdefa"

      repo.addBlockchain(blockchain).then(result => {
        result.should.eql('INVALID')
        Levelupdb.getRecord('blockchain',"blockchain").catch(error => {
          
          done()
        })

      })
    })

    
  })

describe("consignment index", () => {

  const repo = new Repository(Levelupdb)

    before(() => {
       return new Promise(resolve => {
          repo.createCollection('consignmentindex').then(() => {
            resolve()
          })
       })
      
    })
    after(() => {
        return new Promise(resolve => {
          Levelupdb.delete('consignmentindex').then(() => {
            resolve()
          })
       })

    })

  it("adds a consignment index record to a leveldb database", (done) => {
      const cir = {
        id: 'abcdefg',
        blockids: ['1234567', '0123456']
      }

      repo.addConsignmentIndex(cir)
      .then(result => {
        expect(result).to.eql('OK')
        Levelupdb.getRecord('consignmentindex',"abcdefg").then(data => {
          data.id.should.eql("abcdefg")
          expect(data.blockids).to.include.members(['1234567', '0123456'])
          done()
        })
      })

    })

  it("gets a consignment index record", (done) => {

    repo.getConsignmentIndex('abcdefg')
    .then((record) => {
      expect(record.id).to.eql('abcdefg')
      expect(record.blockids).to.include.members(['1234567', '0123456'])
      done()
    })
  })

  it("rejects  when getting a non-existant consignment index record", (done) => {

    repo.getConsignmentIndex('abcdefh')
    .catch((error) => {
      done()
    })
  })
})