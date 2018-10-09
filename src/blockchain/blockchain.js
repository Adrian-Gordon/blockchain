'use strict'

const crypto = require('crypto')
const nconf = require('../config/conf.js').nconf
const Block = require('../block/block.js').Block
const Repository = require('../repository/repository.js').Repository


class Blockchain{
  constructor({length, latestblockid, latestblockindex, hash}){

    if(typeof length =='undefined' || typeof latestblockid == 'undefined' || typeof latestblockindex == 'undefined' ){
      throw new Error("length, letsetblockid and latestblockindex must be provided")
    }

    if(!Number.isInteger(length)){
      throw new Error("length must be an integer")
    }

    if(!Number.isInteger(latestblockindex)){
      throw new Error("latestblockindex must be an integer")
    }

    if(typeof latestblockid !== 'string'){
      throw new Error("latestblockid must be a string")
    }
    this.id = "blockchain"
    this.length = length
    this.latestblockid = latestblockid
    this.latestblockindex = latestblockindex
    if(typeof hash !== 'undefined')
      this.hash = hash
    else this.hash = Blockchain.createHash(this)

    if(Blockchain.validate(this))return(this)
    else throw new Error("blockchain is invalid")
    
    
  }

  setLength(length){
    this.length = length
  }

  getLength(){
    return this.length
  }

  incrementLength(){
    this.length++
    return this.length
  }

  getLatestBlockId(){
    return this.latestblockid
  }

  setLatestBlockId(blockId){
    if(typeof blockId !== "string"){
      throw new Error("blockId should be a string")
    }
    this.latestblockid = blockId
    return this.latestblockid
  }

  getLatestBlockIndex(){
    return this.latestblockindex
  }

  setLatestBlockIndex(index){
    if(!Number.isInteger(index))
      throw new Error("index should be an integer")
    else {
      this.latestblockindex = index
      return this.latestblockindex
    }
  }

  setHash(hash){
    this.hash = hash
  }

  getHash(){
    return this.hash
  }


  serialize(){
    return JSON.stringify(this)
  }

  static deserialize(str){
    const obj = JSON.parse(str)
  
    return new Blockchain(obj)
  }



   static createHash(blockchain){
    return crypto.createHash(nconf.get('hashalgorithm')).update(blockchain.id + blockchain.length + blockchain.latestblockindex + blockchain.latestblockid).digest('hex')

  }

  static validate(blockchain){
    const hash = crypto.createHash(nconf.get('hashalgorithm')).update(blockchain.id + blockchain.length  + blockchain.latestblockindex + blockchain.latestblockid).digest('hex')
  
    if(hash === blockchain.hash)return true
    return false

  }

  static async validateBlocks(blockchain, repository){
    
      let currentBlockid = blockchain.latestblockid
    //step back throught the blocks in the repository, validating as we go
    let done = false
    let isValid = true
    do{
      try{
        let block = await repository.getBlock(currentBlockid)
        
        
        if(block.isOriginBlock()){
          done = true
        }
        else{
           currentBlockid = block.previousHash
        }
      }catch(error){

        done = true
        isValid = false
      }
      


    }while(!done)


    return(isValid)


  }


}

module.exports =Object.assign({},{Blockchain})
