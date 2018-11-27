const { test } = require('tap')
const { resolve } = require('path')
const fs = require('fs')
const path = require('path')
const { promisify } = require('util')
const render = require('nanohtml')
const rimraf = require('rimraf')
const ticksToTree = require('../lib/ticks-to-tree.js')
const { v8cats } = require('../visualizer/cmp/graph.js')(render)
const zeroX = require('../')

const {
  init1,
  init2,
  cpp1,
  cpp2,
  v81,
  v82,
  regexp1,
  regexp2,
  native1,
  native2,
  core1,
  core2,
  deps1,
  deps2,
  app1,
  app2,
  inlinable
} = require('./util/type-simple-cases.js')

const {
  regexWindows,
  sharedLibUnix,
  sharedLibWindows,
  depsEsmWindows,
  depsCommonUnix,
  appUnix,
  appWindows
} = require('./util/type-edge-cases.js')

function getType (frame, inlined) {
  const processedFrame = Object.assign({}, frame, { name: getProcessedName(frame, inlined) })
  return getTypeProcessed(processedFrame)
}

function getTypeProcessed (frame) {
  return v8cats(frame).type
}

function getProcessedName (frame, inlined) {
  const { name } = frame

  if (inlined) {
    const parentName = 'evalParent :1:2'

    const key = name.split(':')[0]
    const options = {
      inlined: {}
    }
    options.inlined[key] = [{
      caller: { key: parentName.split(':')[0] }
    }]

    const tree = ticksToTree([[{ name: parentName }, frame]], options)
    return tree.unmerged.children[0].children[0].name
  } else {
    const tree = ticksToTree([[frame]])
    return tree.unmerged.children[0].name
  }
}

test('Test typical examples - backend name transformation', function (t) {
  t.equal(getProcessedName(init1), init1.name + ' [INIT]')
  t.equal(getProcessedName(init2), init2.name + ' [INIT]')
  t.equal(getProcessedName(cpp1), cpp1.name + ' [SHARED_LIB]')
  t.equal(getProcessedName(cpp2), cpp2.name + ' [SHARED_LIB]')
  t.equal(getProcessedName(v81), v81.name + ' [CPP]')
  t.equal(getProcessedName(v82), v82.name + ' [CODE:BuiltIn]')
  t.equal(getProcessedName(regexp1), regexp1.name + ' [CODE:RegExp]')
  t.equal(getProcessedName(regexp2), regexp2.name + ' [CODE:RegExp]')
  t.equal(getProcessedName(native1), '~' + native1.name)
  t.equal(getProcessedName(native2), '*(anonymous) [eval]:486:24')
  t.equal(getProcessedName(core1), '*' + core1.name)
  t.equal(getProcessedName(core2), '~' + core2.name)
  t.equal(getProcessedName(deps1), '*' + deps1.name)
  t.equal(getProcessedName(deps2), '~' + deps2.name)
  t.equal(getProcessedName(app1), '~' + app1.name)
  t.equal(getProcessedName(app2), '*' + app2.name)
  t.equal(getProcessedName(inlinable, true), '~' + inlinable.name + ' [INLINABLE]')

  t.end()
})

test('Test typical examples - frontend name parsing', function (t) {
  t.equal(getType(init1), 'init')
  t.equal(getType(init2), 'init')
  t.equal(getType(cpp1), 'cpp')
  t.equal(getType(cpp2), 'cpp')
  t.equal(getType(v81), 'v8')
  t.equal(getType(v82), 'v8')
  t.equal(getType(regexp1), 'regexp')
  t.equal(getType(regexp2), 'regexp')
  t.equal(getType(native1), 'native')
  t.equal(getType(native2), 'native')
  t.equal(getType(core1), 'core')
  t.equal(getType(core2), 'core')
  t.equal(getType(deps1), 'deps')
  t.equal(getType(deps2), 'deps')
  t.equal(getType(app1), 'app')
  t.equal(getType(app2), 'app')
  t.equal(getType(inlinable, true), 'inlinable')

  t.end()
})

test('Test awkward edge cases', function (t) {
  t.equal(getType({ name: appUnix, type: 'JS' }), 'app')
  t.equal(getType({ name: appWindows, type: 'JS' }), 'app')
  t.equal(getType({ name: depsEsmWindows, type: 'JS' }), 'deps')
  t.equal(getType({ name: depsCommonUnix, type: 'JS' }), 'deps')
  t.equal(getType({ name: sharedLibUnix, type: 'SHARED_LIB' }), 'cpp')
  t.equal(getType({ name: sharedLibWindows, type: 'SHARED_LIB' }), 'cpp')
  t.equal(getType({ name: regexWindows, type: 'CODE', kind: 'RegExp' }), 'regexp')

  t.end()
})

test('Generate profile and test its output', function (outerTest) {
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
    let jsonFile
    outerTest.test('Test 0x output exists as expected', function (t) {
      const htmlFile = htmlLink.replace(/^file:\/\//, '')
      dir = htmlFile.replace('flamegraph.html', '')

      // Ensure outputs are created
      t.ok(htmlFile.includes('flamegraph.html'))
      t.ok(fs.existsSync(htmlFile))
      t.ok(fs.statSync(htmlFile).size > 10000)

      jsonFile = fs.readdirSync(dir).find(name => name.match(/\.filtered\.json$/))

      t.end()
    })
    return path.resolve(dir, jsonFile)
  }

  function testJsonContents (content) {
    outerTest.test('Test 0x json contents are classified as expected', function (t) {
      const jsonArray = JSON.parse(content).code

      const appFromOutput = jsonArray.find(item => item.name.match(/^appOuterFunc /))
      t.ok(appFromOutput)
      t.equal(getType(appFromOutput), 'app')

      const depFromOutput = jsonArray.find(item => item.name.match(/node_modules[/\\]debounce/))
      t.ok(depFromOutput)
      t.equal(getType(depFromOutput), 'deps')

      // RegExp parser may encode non-ASCII characters - but should still be correctly classified
      const regexFromOutput = jsonArray.find(item => item.kind === 'RegExp' && item.name.match(/^\/D:\\Documents and Settings/))
      t.ok(regexFromOutput)
      t.equal(getType(regexFromOutput), 'regexp')

      // Some non-ASCII characters get be garbled e.g. æ => ÿffffe6 on Windows - but should still be correctly classified
      const evalFromOutput = jsonArray.find(item => item.type === 'JS' && item.name.match(/^\/Do \( \/home/))
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
