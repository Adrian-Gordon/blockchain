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
    this.length = 0
    return this
  }
}

module.exports =Object.assign({},{Blockchain})
