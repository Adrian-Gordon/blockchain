'use strict'

const request = require('supertest')
const server = require('../discoveryServer')
const should = require('should')
const Peer = require('../peer').Peer
const nconf = require('../../config/conf.js').nconf
const Repository = require('../../repository/repository').Repository
const Levelupdb = require('../../database/leveldb/levelup').Levelupdb


describe('Discovery Server', () => {
  let app = null
  beforeEach((done) => {
    
     server.startServer(3000, 3001).then(serv => {
      
      app = serv
      done()
    })
  })

  afterEach((done) => {
    try{
      server.getSwarm().destroy()
    }catch(error){
      logger.error(error)
    }
      
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

  it('returns a bad request code when no webport is specified in a POST', (done) => {
    request(app)
    .post('/activeNodes')
    .send({
      'port':5000
    })
    .set('Content-Type','application/json')
    .set('Accept','aplication/json')
    .expect(400, done)
  })

  it('returns a bad request code when an invalid webport is specified in a POST', (done) => {
    request(app)
    .post('/activeNodes')
    .send({
      'port':500,
      'webport':'aport'
    })
    .set('Content-Type','application/json')
    .set('Accept','aplication/json')
    .expect(400, done)
  })

  it('can add a new P2P node', (done) => {
    request(app)
    .post('/activeNodes')
    .send({
      'port': 5000,
      'webport':5001
    })
    .set('Content-Type','application/json')
    .set('Accept','aplication/json')
    .expect((res) => {
      res.body.port.should.eql(5000)
    })
    .expect(201, done)
  })

  it('can add a new P2P node with a specified ip address', (done) => {
    request(app)
    .post('/activeNodes')
    .send({
      'port': 5000,
      'webport':5001,
      'ip':'testip'
    })
    .set('Content-Type','application/json')
    .set('Accept','aplication/json')
    .expect((res) => {
      res.body.port.should.eql(5000)
      res.body.ip.should.eql('testip')
    })
    .expect(201, done)
  })

  it('gets P2P nodes', (done) => {
    request(app)
    .post('/activeNodes')
    .send({
      'port': 5000,
      'webport':5001
    })
    .set('Content-Type','application/json')
    .set('Accept','aplication/json')
    .expect(201)
    .then(() => {
      setTimeout(() => {
        request(app)
        .get('/activeNodes')
        .expect(200)
        .then(response => {
          
          response.body["127.0.0.1"][0]['port'].should.eql(5000)
           response.body["127.0.0.1"][0]['webport'].should.eql(5001)
          done()

          })
      },
      1000)

    })
  })

  it('gets P2P nodes with specified ip', (done) => {
    request(app)
    .post('/activeNodes')
    .send({
      'port': 5000,
      'webport':5001,
      'ip':'testip'
    })
    .set('Content-Type','application/json')
    .set('Accept','aplication/json')
    .expect(201)
    .then(() => {
      setTimeout(() => {
        request(app)
        .get('/activeNodes')
        .expect(200)
        .then(response => {
          
          response.body["testip"][0]['port'].should.eql(5000)
           response.body["testip"][0]['webport'].should.eql(5001)
          done()

          })
      },
      1000)

    })
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
      'port': 5000,
      'webport':5001
    })
    .set('Content-Type','application/json')
    .set('Accept','aplication/json')
    .end((err, res) => {
        request(app)
        .post('/activeNodes')
        .send({
          'port': 6000,
          'webport':6001
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
              let r = res.body["127.0.0.1"]
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
      'port': 6000,
      'webport':6001
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
          should.not.exist(res.body["127.0.0.1"])
        })
        .expect(200, done)

    })

  })

  it("removes a peer from active Nodes when it disconnects",(done) => {
    let peer1 = new Peer("127.0.0.1",3000, 3001,3002, 3003, new Repository(Levelupdb))
    let peer2 = new Peer("127.0.0.1",3000, 3001,3004,3005, new Repository(Levelupdb))

    peer1.registerAsPeer().then(() => {

      peer2.registerAsPeer().then(() => {
        peer2.setupPeerNetwork(3004)
        .then(()=> {
         
            peer1.setupPeerNetwork(3002)
           .then(()=> { 
              setTimeout(() =>{
                peer1.topology.destroy()
                
                setTimeout(() => {
                  request(app)
                    .get('/activeNodes')
                    .expect(200)
                    .then(response => {
                      response.body["127.0.0.1"].should.not.containEql(3002)
                      peer2.topology.destroy()
                      peer1=null
                      peer2=null
                      done()

                      })
                  

                }, 100)
                
              },100)
           

           })
        })
       
       

      })
    })

  })


  it("gets the stats of all peers", (done) => {
    let peer = new Peer("127.0.0.1",3000, 3001,3002,3003, new Repository(Levelupdb))
     peer.registerAsPeer().then(() => {
      peer.setupPeerNetwork(3002)
      .then(()=> { 
         request(app)
          .get('/stats')
          .expect(200)
          .then(response => {
            should.exist(response.body["127.0.0.1"]["3002"])
            response.body["127.0.0.1"]["3002"]["bclength"].should.eql(0)
           peer.topology.destroy()
           peer=null
            done()

            })

      })
     })

  })

 
 it("increments the messagesin count of a peer", (done) => {
    let peer = new Peer("127.0.0.1",3000, 3001,3002, 3003,new Repository(Levelupdb))
     peer.registerAsPeer().then(() => {
      peer.setupPeerNetwork(3002)
      .then(()=> { 
         request(app)
        .post('/messagein')
        .send({
          'port': 3002
        })
        .set('Content-Type','application/json')
        .set('Accept','aplication/json')
        .expect(201)
        .then((res) => {
          res.body.count.should.eql(1)

          request(app)
          .get('/stats')
          .expect(200)
          .then(response => {
            should.exist(response.body["127.0.0.1"]["3002"])
            response.body["127.0.0.1"]["3002"]["messagesin"].should.eql(1)
            peer.topology.destroy()
            peer=null
            done()

            })
        })
        
      })
     })

  })

 it("increments the messagesout count of a peer", (done) => {
    let peer = new Peer("127.0.0.1",3000, 3001,3002,3003, new Repository(Levelupdb))
     peer.registerAsPeer().then(() => {
      peer.setupPeerNetwork(3002)
      .then(()=> { 
         request(app)
        .post('/messageout')
        .send({
          'port': 3002
        })
        .set('Content-Type','application/json')
        .set('Accept','aplication/json')
        .expect(201)
        .then((res) => {
          res.body.count.should.eql(1)

          request(app)
          .get('/stats')
          .expect(200)
          .then(response => {
            should.exist(response.body["127.0.0.1"]["3002"])
            response.body["127.0.0.1"]["3002"]["messagesout"].should.eql(1)
            peer.topology.destroy()
            peer=null
            done()

            })
        })
        
      })
     })

  })

  it("sets the bclength property of a peer", (done) => {
    let peer = new Peer("127.0.0.1",3000, 3001,3002, 3003,new Repository(Levelupdb))
     peer.registerAsPeer().then(() => {
      peer.setupPeerNetwork(3002)
      .then(()=> { 
         request(app)
        .post('/bclength')
        .send({
          'port': 3002,
          'length': 10
        })
        .set('Content-Type','application/json')
        .set('Accept','aplication/json')
        .expect(201)
        .then((res) => {
          res.body.length.should.eql(10)

          request(app)
          .get('/stats')
          .expect(200)
          .then(response => {
            should.exist(response.body["127.0.0.1"]["3002"])
            response.body["127.0.0.1"]["3002"]["bclength"].should.eql(10)
            peer.topology.destroy()
            peer=null
            done()

            })
        })
        
      })
     })

  })

   it("sets the tpoollength property of a peer", (done) => {
    let peer = new Peer("127.0.0.1",3000, 3001,3002,3003, new Repository(Levelupdb))
     peer.registerAsPeer().then(() => {
      peer.setupPeerNetwork(3002)
      .then(()=> { 
         request(app)
        .post('/tpoollength')
        .send({
          'port': 3002,
          'length': 10
        })
        .set('Content-Type','application/json')
        .set('Accept','aplication/json')
        .expect(201)
        .then((res) => {
          res.body.length.should.eql(10)

          request(app)
          .get('/stats')
          .expect(200)
          .then(response => {
            should.exist(response.body["127.0.0.1"]["3002"])
            response.body["127.0.0.1"]["3002"]["tpoollength"].should.eql(10)
            peer.topology.destroy()
            peer=null
            done()

            })
        })
        
      })
     })

  })
          

  
  
})