'use strict'
const { spawn } = require('child_process')

const discoveryServer = spawn('/bin/sh',['discoveryServer.sh'])

const peer1 = spawn('/bin/sh',['peer1.sh'])
const peer2 = spawn('/bin/sh',['peer2.sh'])
const peer3 = spawn('/bin/sh',['peer3.sh'])