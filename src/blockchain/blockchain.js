'use strict'

class Blockchain{
  constructor({length, latestblockid}){

    if(typeof length !== 'undefined'){
      if(typeof length !== 'number'){
        throw new Error("length must be a number")
      }
      else{
        this.length=parseInt(length)
      }
    }

    if(typeof latestblockid !== 'undefined'){
      if(typeof latestblockid !== 'string'){
        throw new Error("latestblockid must be a string")
      }
      else{
        this.length=parseInt(length)
      }
    }

     if(typeof length !== 'undefined'){
      if(typeof latestblockid == 'undefined'){
        throw new Error("both length and latest block id must be provided for a de-serialised Blockchain")
      }
    }
    if(typeof length !== 'undefined'){
      if(typeof latestblockid == 'undefined'){
         throw new Error("both length and latest block id must be provided for a de-serialised Blockchain")
      }
    }
    if(typeof length !== "undefined")
      this.length = parseInt(length)
    else this.length = 0

    if(typeof latestblockid !== "undefined"){
      this.latestblockid = latestblockid
    }
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
    this.latestblockid = blockId
    return this.latestblockid
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
