'use strict'

//const {createLogger, format, transports} = require('winston')
//const {combine, timestamp, label, printf} = format

const winston = require('winston')

const getLabel = (callingModule) =>{
  let parts = callingModule.filename.split('/')
  return parts[parts.length -2] + '/' //+ parts.pop()
}

function traceCaller (n) {
  if (isNaN(n) || n < 0) n = 1
  n += 1
  var s = (new Error()).stack

  var a = s.indexOf('\n', 5)
  while (n--) {
    a = s.indexOf('\n', a + 1)
    if (a < 0) { a = s.lastIndexOf('\n', s.length); break }
  }
  let b = s.indexOf('\n', a + 1); if (b < 0) b = s.length
  a = Math.max(s.lastIndexOf(' ', b), s.lastIndexOf('/', b))
  b = s.lastIndexOf(':', b)
  s = s.substring(a + 1, b)
  return s
}

const myFormat = winston.format.printf(info => {
  return `${info.timestamp} [${info.label}] ${info.level}: ${info.message}`
})

module.exports = (callingModule) => {
  let logger =  winston.createLogger({
      format: winston.format.combine(
      winston.format.colorize(),
      winston.format.label({label: getLabel(callingModule)}),
      winston.format.timestamp(),
      myFormat
    ),
    transports: [
      new winston.transports.Console()
    ]
  })

  var loggerInfoOld = logger.info
  logger.info = function (msg) {
    var fandl = traceCaller(1)
    return (loggerInfoOld.call(this, fandl + ' ' +  msg))
  }

  var loggerErrorOld = logger.error
  logger.error = function (msg) {
    var fandl = traceCaller(1)
    return (loggerErrorOld.call(this, fandl + ' ' + msg))
  }

  return(logger)
}