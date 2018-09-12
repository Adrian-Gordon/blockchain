'use strict'

const validActions = ["ping","sendblockchainlength","sendblocks"]

class Message{
  constructor({peer, action, data}){

    if(typeof peer != 'undefined' && typeof peer !== 'string'){
      throw new Error("if provided, a peer must be a string")
    }
    if(typeof action == 'undefined'){
      throw new Error("an action must be provided")
    }
    else if(!validActions.includes(action)){
      throw new Error("a valid action must be provided: '" + action + "'")
    }
     if(typeof data != 'undefined' && typeof data !== 'string'){
      throw new Error("if provided, data must be a string")
    }
    this.peer = peer
    this.action = action
    this.data = data
  }
}

module.exports = Object.assign({},{Message})