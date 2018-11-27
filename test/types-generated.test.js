'use strict'

const { test } = require('tap')

const { resolve } = require('path')
const fs = require('fs')
const path = require('path')
const { promisify } = require('util')
const rimraf = require('rimraf')
const zeroX = require('../')

const {
  getProcessedName,
  getType
} = require('./util/classify-frames.js')

// Be careful if increasing this test file's run time (currently ~6s).
// Tap may intermittently fail with "no plan" or, if plans are added,
// mistaken "incorrect number of tests" errors if run time is > ~25s.

test('Generate profile and test its output', function (outerTest) {
  outerTest.plan(3)

  const readFile = promisify(fs.readFile)
  let dir

  zeroX({
    argv: [ resolve(__dirname, './fixture/do-eval.js') ],
    workingDir: resolve('./')
  }).catch(onError)
    .then(testZeroXOutput, onError)
    .then(readFile, onError)
    .then(testJsonContents, onError)
    .then(cleanup, onError)
    .then(outerTest.end, onError)

  function onError (err) {
    console.error(err)
    cleanup()
    throw err
  }

  function testZeroXOutput (htmlLink) {
    const htmlFile = htmlLink.replace(/^file:\/\//, '')
    dir = htmlFile.replace('flamegraph.html', '')

    outerTest.test('Test 0x output exists as expected', function (t) {
      t.ok(htmlFile.includes('flamegraph.html'))
      t.ok(fs.existsSync(htmlFile))
      t.ok(fs.statSync(htmlFile).size > 10000)
      t.end()
    })

    const jsonFile = fs.readdirSync(dir).find(name => name.match(/\.filtered\.json$/))
    return path.resolve(dir, jsonFile)
  }

  function testJsonContents (content) {
    const jsonArray = JSON.parse(content).code

    const appFromOutput = jsonArray.find(item => item.name.match(/^appOuterFunc /))
    const depFromOutput = jsonArray.find(item => item.name.match(/node_modules[/\\]debounce/))

    // RegExp parser may encode non-ASCII characters - but should still be correctly classified
    const regexFromOutput = jsonArray.find(item => item.kind === 'RegExp' && item.name.match(/^\/D:\\Documents and Settings/))

    // Some non-ASCII characters get be garbled e.g. æ => ÿffffe6 on Windows - but should still be correctly classified
    const evalFromOutput = jsonArray.find(item => item.type === 'JS' && item.name.match(/^\/Do \( \/home/))

    outerTest.test('Test 0x json contents are classified as expected', function (t) {
      t.ok(appFromOutput)
      t.equal(getType(appFromOutput), 'app')

      t.ok(depFromOutput)
      t.equal(getType(depFromOutput), 'deps')

      t.ok(regexFromOutput)
      t.equal(getType(regexFromOutput), 'regexp')

      t.ok(evalFromOutput)
      t.equal(getType(evalFromOutput), 'native')
      t.ok(getProcessedName(evalFromOutput).includes('[eval]'))

      t.end()
    })
  }

  function cleanup () {
    outerTest.test('Test cleanup works as expected', function (t) {
      t.ok(fs.existsSync(dir))
      rimraf.sync(dir)
      t.notOk(fs.existsSync(dir))

      t.end()
    })
  }
})
