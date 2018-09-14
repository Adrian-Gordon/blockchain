'use strict'

class Blockchain{
  constructor({length, latestblockid, latestblockindex}){

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

    this.length = length
    this.latestblockid = latestblockid
    this.latestblockindex = latestblockindex
    
    return this
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

  serialize(){
    return JSON.stringify(this)
  }

  static deserialize(str){
    const obj = JSON.parse(str)
  
    return new Blockchain(obj)
  }


}

module.exports =Object.assign({},{Blockchain})
