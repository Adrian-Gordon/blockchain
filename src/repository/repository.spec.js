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
          repo.createCollection('transactions').then(() => {
            resolve()
          })
       })
      
    })
    after(() => {
        return new Promise(resolve => {
          Levelupdb.delete('transactions').then(() => {
            resolve()
          })
       })

    })

    it("adds a valid transaction to a leveldb database", (done) => {
      


    const transaction = new Transaction({'consignmentid':'cabcdefg','data':{"some":"arbitrary","json":"data"},"publickey":publicKey})
    const transactionid = transaction.id

    repo.addTransaction(transaction).then((result)=> {
      result.should.eql('OK')
      Levelupdb.getRecord('transactions',transactionid).then(data => {
        data.id.should.eql(transactionid)
        done()
      })
       //done()
    })
    

    })

    it("retrieves a transaction from a leveldb database", (done) => {
      const transaction = new Transaction({'consignmentid':'cabcdefg','data':{"some":"arbitrary","json":"data"},"publickey":publicKey})
      const transactionid = transaction.id

      repo.addTransaction(transaction).then((result)=> {
        repo.getTransaction(transactionid).then((data)=> {
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
      const transaction = new Transaction({'consignmentid':'cabcdefg','data':{"some":"arbitrary","json":"data"},"publickey":publicKey})
      const transactionid = transaction.id

      repo.addTransaction(transaction).then((result)=> {

        repo.deleteTransaction(transactionid).then(result => {
          result.should.eql('OK')
           Levelupdb.getRecord('transactions',transactionid).catch(error => { //should throw an error
           // logger.info(error)
            done()
          })
        })
      })
    })

    it("fails to add an invalid transaction to a leveldb database", (done) => {
      const transaction = new Transaction({'consignmentid':'cabcdefg','data':{"some":"arbitrary","json":"data"},"publickey":publicKey})
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
  })

 
})