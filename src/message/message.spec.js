'use strict'

const chai = require('chai')
const assert = chai.assert
const expect = chai.expect
const should = chai.should()



const Message = require('./message').Message


describe('Message', ()=> {

  it('throws an error if a non string peer is provided', (done) => {
     assert.throws(() =>  new Message({peer: 21, action: "An action", data: "some data"}),Error,"if provided, a peer must be a string")
    done()
  })

  it("throws an error if no action is provided", (done) => {
    assert.throws(() =>  new Message({peer: "A peer", data: "some data"}),Error,"an action must be provided")
    done()

  })

  it("throws an error if an invalid action is provided", (done) => {
    assert.throws(() =>  new Message({peer: "A peer", action: "an Action", data: "some data"}),Error,"a valid action must be provided: 'an Action'")
    done()

  })

  it('throws an error if non string data is provided', (done) => {
     assert.throws(() =>  new Message({peer: "a Peer", action: "ping", data: 21}),Error,"if provided, data must be a string")
    done()
  })



  it("instantiates a message with no provided type, defaults to 'broadcast'", (done) => {
    const message = new Message({peer:"A Peer", action:"ping", data: "some data"})
    expect(message).to.be.instanceof(Message)
    expect(message.peer).to.be.a('string')
    expect(message.peer).to.be.eql("A Peer")
     expect(message.action).to.be.a('string')
    expect(message.action).to.be.eql("ping")
     expect(message.data).to.be.a('string')
    expect(message.data).to.be.eql("some data")
    expect(message.type).to.be.eql('broadcast')

    done()
  })

  it("instantiates a private message ", (done) => {
    const message = new Message({peer:"A Peer", action:"ping", data: "some data",type:'private'})
    expect(message).to.be.instanceof(Message)
    expect(message.peer).to.be.a('string')
    expect(message.peer).to.be.eql("A Peer")
     expect(message.action).to.be.a('string')
    expect(message.action).to.be.eql("ping")
     expect(message.data).to.be.a('string')
    expect(message.data).to.be.eql("some data")
    expect(message.type).to.be.eql('private')

    done()
  })
  it("instantiates a broadcast message ", (done) => {
    const message = new Message({peer:"A Peer", action:"ping", data: "some data",type:'broadcast'})
    expect(message).to.be.instanceof(Message)
    expect(message.peer).to.be.a('string')
    expect(message.peer).to.be.eql("A Peer")
     expect(message.action).to.be.a('string')
    expect(message.action).to.be.eql("ping")
     expect(message.data).to.be.a('string')
    expect(message.data).to.be.eql("some data")
    expect(message.type).to.be.eql('broadcast')

    done()
  })

   it('throws an error if an invalid type is provided', (done) => {
     assert.throws(() =>  new Message({peer:"A Peer", action:"ping", data: "some data",type:'broadycast'}),Error,"type must be 'private' or 'broadcast'")
    done()
  })

})