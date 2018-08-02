'use strict'

const should = require('should')

const chai = require('chai')
const assert = chai.assert
const expect = chai.expect
const logger = require('../../logger/logger.js')(module)

const Levelupdb = require('./levelup').Levelupdb
const leveldown = require('leveldown')


describe('Levelup', () => {

  describe('Create a new database', () => {
    after(() => {
     // leveldown.destroy('./testdb', (error)=> {
        //logger.info(error)

     // })
      Promise.resolve(Levelupdb.delete('testdb'))
    })

    it('creates a new database', (done) => {

    
    Levelupdb.open('testdb').then(result =>{
     // logger.info(JSON.stringify(Levelupdb.collections))
      Levelupdb.collections.should.have.property('testdb')
      Levelupdb.close('testdb').then(result => {
        done()
      })

      
    })

    //levelup.should.be.instanceOf(Levelupdb)


    
  })

  })
  describe('Close a database', () => {
    after(() => {
     // leveldown.destroy('./testdb', (error)=> {
        //logger.info(error)

     // })
     Promise.resolve(Levelupdb.delete('testdb'))
    })

    it('fails if the collection does not exist', (done) => {
      Levelupdb.close('testdb').catch(error => {
        error.should.eql('collection: testdb does not exist')
        done()
      })
    })

    it('closes a database', (done) => {

    
    Levelupdb.open('testdb').then(result => {
     // logger.info(JSON.stringify(Levelupdb.collections))
      Levelupdb.collections.should.have.property('testdb')
      Levelupdb.close('testdb').then(result => {
        Levelupdb.collections.should.not.have.property('testdb')
        done()
      })

      
    })

    //levelup.should.be.instanceOf(Levelupdb)


    
  })

  })

  describe('Delete a database',() => {
   /* it("fails if the database does not exist", (done) => {
      Levelupdb.delete('testdb').catch(error => {
        error.should.eql('collection: testdb cannot be deleted, it does not exist')
        done()
      })
    })*/
    it("deletes a database", (done) => {
       Levelupdb.open('testdb').then(result => {
       // Levelupdb.close('testdb').then(result => {
          Levelupdb.delete('testdb').then(result => {
            result.should.eql('OK')
            done()
          })

       // })
        
       })
    })
  })

  describe('Save a record in to a collection', () => {
    after(() => {
      Levelupdb.close('testdb').then(result => {
        //leveldown.destroy('./testdb', (error)=> {
         // logger.info(error)

       // })
       Promise.resolve(Levelupdb.delete('testdb'))
      })
    })

    it('fails if there are no parameters provided' , (done) => {
      Levelupdb.saveRecord().catch(error =>{
        error.should.eql('collection name, id and data arguments must be provided')
        done()
      })

    })

    it('fails if there is only one parameter provided' , (done) => {
      Levelupdb.saveRecord('testdb').catch(error =>{
        error.should.eql('collection name, id and data arguments must be provided')
        done()
      })

    })

    it('fails if there are only two parameters provided' , (done) => {
      Levelupdb.saveRecord('testdb','abc123').catch(error =>{
        error.should.eql('collection name, id and data arguments must be provided')
        done()
      })

    })

    it('fails if the collection does not exist' , (done) => {
      Levelupdb.saveRecord('testdb','abc123', {'test':'123'}).catch(error =>{
        error.should.eql('collection: testdb does not exist')
        done()
      })

    })
    it('saves a record in to a collection', (done) => {
      Levelupdb.open('testdb').then(result => {            //create a test database
       Levelupdb.saveRecord('testdb','abc123',{'test':'123'}).then(result=> {
        result.should.eql('OK')
        Levelupdb.getRecord('testdb','abc123').then(result => {
          should.exist(result)
          done()
        })

        
       })

      
      })
    })

  })

  describe("retrieve a record from a collection", () => {
   after(() => {
      Levelupdb.close('testdb').then(result => {
        //leveldown.destroy('./testdb', (error)=> {
         // logger.info(error)

       // })
       Promise.resolve(Levelupdb.delete('testdb'))
      })
    })

    it('fails if the wrong number of arguments is provided', (done) => {
       Levelupdb.getRecord('testdb').catch(error => {
          error.should.eql('collection name and id arguments must be provided')
          done()
        })

    })
    it('fails if the collection does not exist', (done) => {
       Levelupdb.getRecord('testdb','abc123').catch(error => {
          error.should.eql('collection: testdb does not exist')
          done()
        })

    })
    it('returns a record', (done) => {
       Levelupdb.open('testdb').then(result => {
           Levelupdb.saveRecord('testdb','abc123',{'test':'123'}).then(result=> {
              Levelupdb.getRecord('testdb','abc123').then(data => {
               data['test'].should.eql('123')
                done()
              })
           })

       })

    })
  })
  describe("Delete a record from a collection", () => {
     after(() => {
      Levelupdb.close('testdb').then(result => {
        //leveldown.destroy('./testdb', (error)=> {
         // logger.info(error)

       // })
       Promise.resolve(Levelupdb.delete('testdb'))
      })
    })

    it('deletes a record from a database', (done) => {
      Levelupdb.open('testdb').then(result => {            //create a test database
       Levelupdb.saveRecord('testdb','abc123',{'test':'123'}).then(result=> {
        result.should.eql('OK')
        Levelupdb.getRecord('testdb','abc123').then(result => {
          should.exist(result)
          Levelupdb.deleteRecord('testdb','abc123').then(result => {
            result.should.eql('OK')
            //logger.info(result)
            Levelupdb.getRecord('testdb','abc123').catch(result => {
              done()
            })
          })
        })

        
       })

      
      })
    })

    it('returns correctly when deleting a non-existant record from a database', (done) => {
     // Levelupdb.open('testdb').then(result => { 
        Levelupdb.deleteRecord('testdb','abc123')
        .then(result => {
          //logger.info(result)
          result.should.eql('OK')
          done()
        })
        

    //})

    })
  })

  

})