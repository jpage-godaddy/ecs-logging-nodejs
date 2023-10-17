// Licensed to Elasticsearch B.V. under one or more contributor
// license agreements. See the NOTICE file distributed with
// this work for additional information regarding copyright
// ownership. Elasticsearch B.V. licenses this file to you under
// the Apache License, Version 2.0 (the "License"); you may
// not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.

'use strict'

// This script is used to test @elastic/ecs-pino-format + APM.
//
// It will:
// - configure APM using the given APM server url (first arg)
// - start an HTTP server
// - log once when it is listening (with its address)
// - handle a single HTTP request
// - log that request
// - exit (the APM agent should flush trace data on exit)

const serverUrl = process.argv[2]
const disableApmIntegration = process.argv[3] === 'true'
/* eslint-disable-next-line no-unused-vars */
const apm = require('elastic-apm-node').start({
  serverUrl,
  serviceName: 'test-apm',
  centralConfig: false,
  captureExceptions: false,
  metricsInterval: '0s',
  apmServerVersion: '8.9.0', // avoid APM server version check request
  logLevel: 'warn' // avoid APM agent log preamble
})

const http = require('http')
const ecsFormat = require('../') // @elastic/ecs-pino-format
const pino = require('pino')

const ecsOpts = {
  convertReqRes: true,
  serviceVersion: 'override-serviceVersion'
}
if (disableApmIntegration) {
  ecsOpts.apmIntegration = false
}
const log = pino(ecsFormat(ecsOpts))

const server = http.createServer()

server.once('request', function handler (req, res) {
  const span = apm.startSpan('auth')
  setImmediate(function doneAuth () {
    res.end('ok')
    log.info({ req, res }, 'handled request')
    span.end()
    server.close()
  })
})

server.listen(0, () => {
  log.info({ address: `http://localhost:${server.address().port}` }, 'listening')
})
