'use strict'

const request = require('supertest')
const server = require('../discoveryServer')
const should = require('should')


describe('Discovery Server', () => {
  let app = null
  beforeEach((done) => {
    
     server.startServer(3000).then(serv => {
      app = serv
      done()
    })
  })

  afterEach((done) => {
    
      app.close()
      app = null
      done()
      
    
  })



  it('can return an empty hash immediately after starting', (done) => {
    request(app)
    .get('/activeNodes')
    .expect((res) => {
      res.body.should.eql({})
      
    })
    .expect(200, done)
  })
  it('returns a bad request code when no port is specified in a POST', (done) => {
    request(app)
    .post('/activeNodes')
    .set('Content-Type','application/json')
    .set('Accept','aplication/json')
    .expect(400, done)
  })

  it('returns a bad request code when an invalid port is specified in a POST', (done) => {
    request(app)
    .post('/activeNodes')
    .send({
      'port':'aport'
    })
    .set('Content-Type','application/json')
    .set('Accept','aplication/json')
    .expect(400, done)
  })

  it('can add a new P2P node', (done) => {
    request(app)
    .post('/activeNodes')
    .send({
      'port': 5000
    })
    .set('Content-Type','application/json')
    .set('Accept','aplication/json')
    .expect((res) => {
      let r = res.body["::ffff:127.0.0.1"]
      r.should.containEql(5000)
    })
    .expect(201, done)
  })

  it('returns a bad request code when no port is specified in a DELETE', (done) => {
    request(app)
    .del('/activeNodes')
    .set('Content-Type','application/json')
    .set('Accept','aplication/json')
    .expect(400, done)
  })

  it('returns a bad request code when an invalid port is specified in a DELETE', (done) => {
    request(app)
    .post('/activeNodes')
    .send({
      'port':'aport'
    })
    .set('Content-Type','application/json')
    .set('Accept','aplication/json')
    .expect(400, done)
  })

  it('returns a 404 response when a delete request contains a port number that is not currently resgistered for the client ip address', (done) => {
    request(app)
    .post('/activeNodes')
    .send({
      'port': 5000
    })
    .set('Content-Type','application/json')
    .set('Accept','aplication/json')
    .end((err, res) => {
        request(app)
        .del('/activeNodes')
        .send({
          'port': 6000
        })
        .set('Content-Type','application/json')
        .set('Accept','aplication/json')
        .expect(404, done)

    })

  })

  it('returns a 404 response when there are no ports currently registered for the client ip address', (done) => {
    request(app)
    .del('/activeNodes')
    .send({
      'port': 6000
    })
    .set('Content-Type','application/json')
    .set('Accept','aplication/json')
    .expect(404, done)
  })



  it('can delete a P2P node', (done) => {

    request(app)
    .post('/activeNodes')
    .send({
      'port': 5000
    })
    .set('Content-Type','application/json')
    .set('Accept','aplication/json')
    .end((err, res) => {
        request(app)
        .post('/activeNodes')
        .send({
          'port': 6000
        })
        .set('Content-Type','application/json')
        .set('Accept','aplication/json')
        .end((err, res) => {
            request(app)
            .del('/activeNodes')
            .send({
              'port': 6000
            })
            .set('Content-Type','application/json')
            .set('Accept','aplication/json')
            .expect((res) => {
              let r = res.body["::ffff:127.0.0.1"]
              r.should.not.containEql(6000)
            })
            .expect(200, done)

        })
      })

    
  })

  it('can delete a P2P node, and removes the ip address when there are no more nodes at this address', (done) => {
    request(app)
    .post('/activeNodes')
    .send({
      'port': 6000
    })
    .set('Content-Type','application/json')
    .set('Accept','aplication/json')
    .end((err, res) => {
        request(app)
        .del('/activeNodes')
        .send({
          'port': 6000
        })
        .set('Content-Type','application/json')
        .set('Accept','aplication/json')
        .expect((res) => {
          should.not.exist(res.body["::ffff:127.0.0.1"])
        })
        .expect(200, done)

    })

  })
          

  
  
})