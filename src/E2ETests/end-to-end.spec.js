'use strict'


const chai = require('chai')
const assert = chai.assert
const expect = chai.expect
const request = require('supertest')




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
          .send({'consignmentid':'cabcdefi',
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

})