'use strict'

const { test } = require('tap')

const { resolve } = require('path')
const fs = require('fs')
const path = require('path')
const { unescape } = require('querystring')
const { promisify } = require('util')
const rimraf = require('rimraf')
const zeroX = require('../')

const {
  getProcessedName,
  getType
} = require('./util/classify-frames.js')

const { nonPathRegex } = require('./util/type-edge-cases.js')

// Be careful if increasing this test file's run time (currently ~5-12s).
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
    cleanup()
    throw err
  }

  function testZeroXOutput (htmlLink) {
    const htmlFile = htmlLink.replace(/^file:\/\//, '')

    outerTest.test('Test 0x output exists as expected', function (t) {
      t.ok(htmlFile.includes('flamegraph.html'))
      t.ok(fs.existsSync(htmlFile))
      t.ok(fs.statSync(htmlFile).size > 10000)
      t.end()
    })

    dir = htmlFile.replace('flamegraph.html', '')
    const jsonFile = fs.readdirSync(dir).find(name => name.match(/\.json$/))
    return path.resolve(dir, jsonFile)
  }

  function testJsonContents (content) {
    const jsonArray = JSON.parse(content).code

    const app = jsonArray.find(item => item.name.match(/^appOuterFunc /))
    const appUnicode = jsonArray.find(item => item.name.match(/^doFunc.+μИاκهよΞ[\/\\]unicode-in-path\.js/))

    const deps = jsonArray.find(item => item.name.match(/node_modules[/\\]debounce/))

    // We get into multi-level escape character hell if we try to escape then match against the original strings
    // Duplicate stubs long enough to check it's a) correctly classified, and b) unicode etc isn't mangled
    const matchRegexPaths = /^\/D:\u005cDocuments and Settings\u005cАлександра ǂǐ-sì\u005cinternal\u005capp native internal\u005cnode_modules\u005csome-module\u005cesm.mjs:1:1/
    const regexPaths = jsonArray.find(item => item.name.match(matchRegexPaths))
    const matchRegexNonPath = /^\/\[\/\u005c] \.js native \.mjs \u005c \/ :\u005c \/ \u005c \u005c\u005cserver \(\u005cusers\u005cu2fan\u005cnode_modules\u005c\|\/node_modules\/\) \[eval].js:1:2/
    const regexNonPath = jsonArray.find(item => item.name.match(matchRegexNonPath))

    const evalSimpleFunction = jsonArray.find(item => item.type === 'JS' && item.name.match(/^evalInnerFunc /))
    const evalLongMethod = jsonArray.find(item => item.type === 'JS' && item.name.match(/^\/Do \( \/home/))

    outerTest.test('Test 0x json contents are classified as expected', function (t) {
      t.ok(app)
      t.equal(getType(app), 'app')

      t.ok(appUnicode)
      t.equal(getType(appUnicode), 'app')

      t.ok(deps)
      t.equal(getType(deps), 'deps')

      t.ok(regexPaths)
      t.equal(getType(regexPaths), 'regexp')

      t.ok(regexNonPath)
      t.equal(getType(regexNonPath), 'regexp')

      t.ok(evalSimpleFunction)
      t.equal(getType(evalSimpleFunction), 'native')
      t.ok(getProcessedName(evalSimpleFunction).includes('[eval]'))

      t.ok(evalLongMethod)
      t.equal(getType(evalLongMethod), 'native')
      t.ok(getProcessedName(evalLongMethod).includes('[eval]'))

      t.end()
    })
  }

  function cleanup () {
    outerTest.test('Test cleanup works as expected', function (t) {
      t.ok(fs.existsSync(dir))
//      rimraf.sync(dir)
//      t.notOk(fs.existsSync(dir))

      t.end()
    })
  }
})
