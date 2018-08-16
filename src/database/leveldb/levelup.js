'use strict'

const levelup = require('levelup')
const leveldown = require('leveldown')
const logger = require('../../logger/logger.js')(module)

const nconf = require('../../config/conf.js').nconf



class Levelupdb{
 

  static open(collectionName){
    return new Promise((resolve, reject) => {
      levelup(leveldown(Levelupdb.dbpath + collectionName),{}, (err, db) => {
        if(err) reject(err)
        Levelupdb.collections[collectionName] = db
        //logger.info(JSON.stringify(Levelupdb.collections))
        resolve(true)
      })
    })

  }

  static close(collectionName){
    return new Promise((resolve, reject) => {
      const db = Levelupdb.collections[collectionName]
      if(typeof db == 'undefined'){
        reject('collection: ' + collectionName + ' does not exist')
      }
      delete Levelupdb.collections[collectionName]
      resolve(db.close())

      })
    
  }

  static delete(collectionName){
    //Levelupdb.close(collectionName).then((result) => {
      return new Promise((resolve, reject)=> {
        Levelupdb.close(collectionName).then((result) => { //attempt to close the database
    
          leveldown.destroy(Levelupdb.dbpath +collectionName, (error)=> {
         
          resolve('OK')

          })
        })
        .catch((error)=> { //don't know about the collection, still want to try to delete it
          leveldown.destroy(Levelupdb.dbpath +collectionName, (error)=> {
         
          resolve('OK')
        })
      })

    })
    
    
  }

  static saveRecord(collectionName,id,data){
    return new Promise((resolve, reject) => {
      if(typeof collectionName == 'undefined' || typeof id == 'undefined' || typeof data == 'undefined'){
        reject('collection name, id and data arguments must be provided')
      }
      else {
        const db = Levelupdb.collections[collectionName]
        if(typeof db == 'undefined'){
          reject('collection: ' +  collectionName + ' does not exist')
        }
        else{
          db.put(id, JSON.stringify(data))
          .then(result => {
            //logger.info(JSON.stringify(result))
            resolve('OK')
          })
          .catch(error => {
            reject(error)
          })
          
        }
      }

      

    })
    


  }

  static getRecord(collectionName, id){
    return new Promise((resolve, reject) => {
        if(typeof collectionName == 'undefined' || typeof id == 'undefined'){
          reject('collection name and id arguments must be provided')
        }
        else {
          const db = Levelupdb.collections[collectionName]
          if(typeof db == 'undefined'){
            reject('collection: ' +  collectionName + ' does not exist')
          }
          else{
            db.get(id)
            .then(result => {
              //logger.info(JSON.stringify(result))
              resolve(JSON.parse(result))
            })
            .catch(error => {
             // logger.info(error)
              reject(error)
            })
            
          }
        }


    })
  }

  static deleteRecord(collectionName, id){
    return new Promise((resolve, reject)=>{
       if(typeof collectionName == 'undefined' || typeof id == 'undefined'){
          reject('collection name and id arguments must be provided')
        }
        else {
          const db = Levelupdb.collections[collectionName]
          if(typeof db == 'undefined'){
            reject('collection: ' +  collectionName + ' does not exist')
          }
          else{
            db.del(id)
            .then(result => {
              resolve("OK")
            })
            .catch(error => {
              reject(error)
            })
          }

        }
    })
  }
}

Levelupdb.collections={}
Levelupdb.dbpath=nconf.get('dbpath')
console.log('dbpath: ' + Levelupdb.dbpath)


module.exports = Object.assign({},{Levelupdb})