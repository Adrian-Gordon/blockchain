'use strict'


const chai = require('chai')
const assert = chai.assert
const expect = chai.expect
const request = require('supertest')




describe('end to end tests', () => {
   it('should respond with a json 200 response with URL in request', (done) => {
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

})