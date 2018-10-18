'use strict'


const chai = require('chai')
const assert = chai.assert
const expect = chai.expect
const request = require('supertest')
const nconf = require('../config/conf.js').nconf



//defaults for peer4

nconf.defaults(
  {
  "hashalgorithm":"SHA256",
  "signatureformat":"hex",
  "privatekeyurl":"./peer4/private.pem",
  "publickeyurl":"./peer4/public.pem",
  "dbpath":"./peer4/data/",
  "defaulttpthreshold": 5000,
  "defaultminingcountdown":1000,
  "miningcountdownprocesspath":"../../P2P/peer/miningCountdownProcess.js",
  "discoveryserverurl":"127.0.0.1",
  "discoveryserverport":3000,
  "discoveryservermessageport":3001,
  "port":3008,
  "webserverport":3009
}
  )

const Peer = require('../P2P/peer').Peer
const Repository = require('../repository/repository').Repository
const Levelupdb = require('../database/leveldb/levelup').Levelupdb
const Block = require('../block/block').Block
const Blockchain = require('../blockchain/blockchain').Blockchain

let peer4 = null

describe('end to end tests', () => {

   it('should respond with a 200 response, and the correct set of active nodes, when sending a GET request to /activeNodes at the discovery server URL', (done) => {
    setTimeout(() => {
        request('http://localhost:3000')
            .get('/activeNodes')
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(200)
            .then(res => {
              expect(res.body["127.0.0.1"]).to.include.members(['3002','3004','3006'])
              done()
            })
          },1000)

    })



   it('should propagate a transaction to all nodes', (done) => {
    request('http://localhost:3003')
          .post('/transactions')
          .send({'consignmentid':'consignment1',
            'data':{"some":"arbitrary","json":"data"},
            'datatype':'application/json'
          })
          .set('Content-Type','application/json')
          .set('Accept','aplication/json')
          .expect(201)
          .then((res) => {
            request('http://localhost:3003')
            .get('/transactions')
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(200)
            .then(res => {
              expect(res.body.length).to.eql(1)
              request('http://localhost:3005')
              .get('/transactions')
              .set('Accept', 'application/json')
              .expect('Content-Type', /json/)
              .expect(200)
              .then(res => {
                expect(res.body.length).to.eql(1)
                request('http://localhost:3007')
                .get('/transactions')
                .set('Accept', 'application/json')
                .expect('Content-Type', /json/)
                .expect(200)
                .then(res => {
                  expect(res.body.length).to.eql(1)
                  done()
                  
                })
                
              })
              
            })
            
          })
          .catch((error) =>{
            console.log(error)
            done()
          })


   })

   it("should mine a block, and propagate it to all nodes", (done) => {
      request('http://localhost:3003')        //add three transactions
          .post('/transactions')
          .send({'consignmentid':'consignment2',
            'data':{"some":"arbitrary","json":"data"},
            'datatype':'application/json'
            })
          .set('Content-Type','application/json')
          .set('Accept','aplication/json')
          .then(() => {
            request('http://localhost:3003')        //add three transactions
            .post('/transactions')
            .send({'consignmentid':'consignment3',
              'data':{"somemore":"arbitrary","json":"data"},
              'datatype':'application/json'
              })
            .set('Content-Type','application/json')
            .set('Accept','aplication/json')
            .then(() => {
              request('http://localhost:3003')        //add three transactions
              .post('/transactions')
              .send({'consignmentid':'consignment4',
                'data':{"evenmore":"arbitrary","json":"data"},
                'datatype':'application/json'
                })
              .set('Content-Type','application/json')
              .set('Accept','aplication/json')
              .then(() => {

                //wait a second and a half
                setTimeout(() => {
                  request('http://localhost:3003')
                  .get('/blocks')
                  .set('Accept', 'application/json')
                  .expect('Content-Type', /json/)
                  .expect(200)
                  .then(res => {
                    expect(res.body.length).to.eql(2)
                    request('http://localhost:3003')
                    .get('/transactions')
                    .set('Accept', 'application/json')
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .then(res => {
                      expect(res.body.length).to.eql(2)
                      request('http://localhost:3005')
                      .get('/blocks')
                      .set('Accept', 'application/json')
                      .expect('Content-Type', /json/)
                      .expect(200)
                      .then(res => {
                        expect(res.body.length).to.eql(2)
                        request('http://localhost:3005')
                        .get('/transactions')
                        .set('Accept', 'application/json')
                        .expect('Content-Type', /json/)
                        .expect(200)
                        .then(res => {
                          expect(res.body.length).to.eql(2)
                          request('http://localhost:3007')
                          .get('/blocks')
                          .set('Accept', 'application/json')
                          .expect('Content-Type', /json/)
                          .expect(200)
                          .then(res => {
                            expect(res.body.length).to.eql(2)
                            request('http://localhost:3007')
                            .get('/transactions')
                            .set('Accept', 'application/json')
                            .expect('Content-Type', /json/)
                            .expect(200)
                            .then(res => {
                              expect(res.body.length).to.eql(2)
                              done()
                            })
                          })
                        })
                      })
                    })
                  })

                },1500)
                 

              })
            })
          })

   })
   it("should request the blockchain from peer4, since peer4 will be out of sync with the blockchain", (done) => {
      peer4 = new Peer(nconf.get("discoveryserverurl"), nconf.get("discoveryserverport"), nconf.get("discoveryservermessageport"),nconf.get("port"), new Repository(Levelupdb))
      
  let originBlock = null
      peer4.deleteCollections()
      .then(() => {
        return  peer4.createCollections()
      })
     
      .then(() => {
         //add an origin block
          originBlock = new Block({"previousHash": "-1", "transactions":[],"index":0, "timestamp":0})
            //save to the database
          return peer4.repository.addBlock(originBlock)
      })
      .then(() => {
        //console.log("runPeer: " + JSON.stringify(blocks))
        const blockchain = new Blockchain({"latestblockid": originBlock.id, "latestblockindex": originBlock.index, "length":1})
        return peer4.setBlockchain(blockchain)
      })
      .then(() => {
        return peer4.registerAsPeer()
      })
      .then(() => {
        return peer4.setupPeerNetwork()
      })
      .then(() => {
        peer4.startWebServer(nconf.get("webserverport")).then(() => {
          peer4.listen()

        //  setTimeout(() => {
               //peer4 adds a transaction
              request(peer4.webServer)        
              .post('/transactions')
              .send({'consignmentid':'consignment5',
                'data':{"evensomemore":"arbitrary","json":"data"},
                'datatype':'application/json'
                })
              .set('Content-Type','application/json')
              .set('Accept','aplication/json')
              .then((res) => {
                //console.log(res)
                setTimeout(() => {
                 request('http://localhost:3003')
                  .get('/blocks')
                  .set('Accept', 'application/json')
                  .expect('Content-Type', /json/)
                  .expect(200)
                  .then(res => {
                    expect(res.body.length).to.eql(3)
                    request('http://localhost:3003')
                    .get('/transactions')
                    .set('Accept', 'application/json')
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .then(res => {
                      expect(res.body.length).to.eql(1)
                      request('http://localhost:3005')
                      .get('/blocks')
                      .set('Accept', 'application/json')
                      .expect('Content-Type', /json/)
                      .expect(200)
                      .then(res => {
                        expect(res.body.length).to.eql(3)
                        request('http://localhost:3005')
                        .get('/transactions')
                        .set('Accept', 'application/json')
                        .expect('Content-Type', /json/)
                        .expect(200)
                        .then(res => {
                          expect(res.body.length).to.eql(1)
                          request('http://localhost:3007')
                          .get('/blocks')
                          .set('Accept', 'application/json')
                          .expect('Content-Type', /json/)
                          .expect(200)
                          .then(res => {
                            expect(res.body.length).to.eql(3)
                            request('http://localhost:3007')
                            .get('/transactions')
                            .set('Accept', 'application/json')
                            .expect('Content-Type', /json/)
                            .expect(200)
                            .then(res => {
                              expect(res.body.length).to.eql(1)
                              request('http://localhost:3009')
                              .get('/blocks')
                              .set('Accept', 'application/json')
                              .expect('Content-Type', /json/)
                              .expect(200)
                              .then(res => {
                                expect(res.body.length).to.eql(3)
                                request('http://localhost:3009')
                                .get('/transactions')
                                .set('Accept', 'application/json')
                                .expect('Content-Type', /json/)
                                .expect(200)
                                .then(res => {
                                  expect(res.body.length).to.eql(0)
                                  peer4.webServer.close()
                                  peer4.stopListening()
                                  peer4.topology.destroy()
                                  done()

                                })
                              })
                            })
                          })
                        })
                      })
                    })
                  })
                },1500)
               })
         // },1500)

         

          
        })

      })
    })

})