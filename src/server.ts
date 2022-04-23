// import EventEmitter from 'events'

import { config } from 'dotenv'
import { stdTimeFunctions } from 'pino'
import { v4 as uuidv4 } from 'uuid'

import build from './app'

// read port from environment variables
config()
const port = parseInt(process.env.PORT, 10) || 3000

const server = build({
  logger: {
    // redact sensitive information when logging
    // see: https://getpino.io/#/docs/redaction
    redact: {
      paths: ['headers.authorization'],
      censor: '**redacted**',
    },
    // print time in ISO format
    timestamp: stdTimeFunctions.isoTime,
  },
  // just to demonstrate the custom measurement of response time using the hooks in `app.ts`
  disableRequestLogging: true,
  // request ID header (`request-id`) is supported and injected up by default
  // see: https://www.fastify.io/docs/latest/Reference/Server/#requestidheader
  // otherwise use UUIDv4 for request IDs instead of auto-incrementing numbers
  genReqId: () => {
    return uuidv4()
  },
})

server.listen({ port }, (err) => {
  if (err) throw err

  // uncomment to test `uncaughtException` handler
  // throw new Error('Provoke uncaught exception')

  // uncomment to test `uncaughtException` handler
  // new EventEmitter().emit(
  //   'error',
  //   new Error('Provoke uncaught EventEmitter error')
  // )

  // uncomment to test `unhandledRejection` handler
  // Promise.reject(new Error('Provoke unhandled rejection'))
})

// SIGNALS –––

// graceful shutdown
// begin reading from stdin so the process does not exit
process.stdin.resume()

const shutdown = (signal: string) => {
  server.log.info(`Received ${signal}`)
  server.close()
  // close resources of backing services here in synchronous calls
  process.exit(0)
}

// process is killed with CTRL+C
process.on('SIGINT', shutdown)

// process is killed with SIGTERM (`kill <pid>`, `docker stop`)
process.on('SIGTERM', shutdown)

// callback for `process.exit`
process.on('exit', (code) => {
  const logMethod = code === 0 ? 'info' : 'error'
  server.log[logMethod]({ code }, `Exit with code ${code}`)
})

// EXCEPTIONS & REJECTIONS –––

// log any uncaught exception and exit in a controlled way
process.on('uncaughtException', (err) => {
  server.log.error({ err }, 'Uncaught exception has occured')
  process.exit(1)
})

// log any unhandled rejection and exit in a controlled way
process.on('unhandledRejection', (err) => {
  server.log.error({ err }, 'Unhandled rejection has occurred')
  process.exit(1)
})
