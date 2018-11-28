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

const regexStringified = require('./util/type-edge-cases.js').nonStringRegex.toString()

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
    const deps = jsonArray.find(item => item.name.match(/node_modules[/\\]debounce/))

    // RegExp processing may encode non-ASCII characters - but should still be correctly classified
    const regexPaths = jsonArray.find(item => findRegex(item, /^\/D:\\Documents and Settings/, 'Documents and Settings'))
    const regexNonString = jsonArray.find(item => findRegex(item, regexStringified, 'js native '))

    // Some non-ASCII characters get be garbled e.g. æ => ÿffffe6 on Windows - but should still be correctly classified
    const evalLongMethod = jsonArray.find(item => item.type === 'JS' && item.name.match(/^\/Do \( \/home/))
    const evalSimpleFunction = jsonArray.find(item => item.type === 'JS' && item.name.match(/^appInnerFunc /))

    outerTest.test('Test 0x json contents are classified as expected', function (t) {
      t.ok(app)
      t.equal(getType(app), 'app')

      t.ok(deps)
      t.equal(getType(deps), 'deps')

      t.ok(regexPaths)
      t.equal(getType(regexPaths), 'regexp')

      t.ok(regexNonString)
      t.equal(getType(regexNonString), 'regexp')

      t.ok(evalFromOutput)
      t.equal(getType(evalFromOutput), 'native')
      t.ok(getProcessedName(evalFromOutput).includes('[eval]'))

      t.ok(evalSimpleFunction)
      t.equal(getType(evalSimpleFunction), 'native')
      t.ok(getProcessedName(evalSimpleFunction).includes('[eval]'))

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

function findRegex (item, target, targetStub) {
  if (!item.type === 'CODE' && item.kind === 'RegExp') return false
  if (item.name.match(target)) return true

  // On Node 8 the regex def may be unicode-escaped, doubling the \\
  // Check this could be a match before unescaping
  if (!item.name.includes(targetStub)) return false
  console.log('item.name-------', item.name)
  if (unescape(JSON.parse(`"${item.name}"`))) return true
  return false
}
