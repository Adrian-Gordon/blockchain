'use strict'

const maxTimeoutPeriod = parseInt(process.argv[2])

const timeoutPeriod = 10 + Math.floor(Math.random() * maxTimeoutPeriod)


process.on('message',(message) => {
  console.log("message: " + message)
  process.exit(200) //pre-empted
})


let timeout = setTimeout(() => {
  process.exit(100) //success
}, timeoutPeriod)