const { test } = require('tap')
const { resolve } = require('path')

const edgeCases = require('./util/type-edge-cases.js')
const render = require('nanohtml')
const { v8cats } = require('../visualizer/cmp/graph.js')(render)
const ticksToTree = require('../lib/ticks-to-tree.js')
const zeroX = require('../')

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

const init1 = { name: 'NativeModule.compile internal/bootstrap/loaders.js:236:44', type: 'JS' }
const init2 = { name: 'bootstrapNodeJSCore internal/bootstrap/node.js:12:24', type: 'JS' }
const cpp1 = { name: '/usr/bin/node', type: 'SHARED_LIB' }
const cpp2 =  { name: 'C:\\Program Files\\nodejs\\node.exe', type: 'SHARED_LIB' }
const v81 = { name: 'v8::internal::Runtime_CompileLazy(int, v8::internal::Object**, v8::internal::Isolate*)', type: 'CPP' }
const v82 = { name: 'Call_ReceiverIsNotNullOrUndefined', type: 'CODE', kind: 'BuiltIn' }
const regexp1 = { name: '[\u0000zA-Z\u0000#$%&\'*+.|~]+$', type: 'CODE', kind: 'RegExp' }
const regexp2 = { name: '; *([!#$%&\'*+.^_`|~0-9A-Za-z-]+) *= *("(?:[ !#-[]-~-ÿ]|00b -ÿ])*"|[!#$%&\'*+.^_`|~0-9A-Za-z-]+) *', type: 'CODE', kind: 'RegExp' }
const native1 = { name: 'InnerArraySort native array.js:486:24', type: 'JS' }
const native2 = { name: '(anonymous) :486:24', type: 'JS' }
const core1 = { name: 'validatePath internal/fs/utils.js:442:22', type: 'JS' }
const core2 = { name: 'nullCheck internal/fs/utils.js:188:19', type: 'JS' }
const deps1 = { name: 'run /root/0x/examples/rest-api/node_modules/restify/lib/server.js:807:38', type: 'JS' }
const deps2 = { name: 'next C:\\Users\\Name With Spaces\\Documents\\app\\node_modules\\express\\lib\\router\\index.js:176:16', type: 'JS' }
const app1 = { name: '(anonymous) /root/0x/examples/rest-api/etag.js:1:11', type: 'JS' }
const app2 = { name: 'app.get C:\\Documents And Settings\\node-clinic-flame-demo\\1-server-with-slow-function.js:8:14', type: 'JS'  }
const inlinable = { name: 'getMediaTypePriority /root/0x/examples/rest-api/node_modules/negotiator/lib/mediaType.js:99:30', type: 'JS', kind: 'Unopt' }

test('Test typical examples - backend name transformation', function (t) {
  t.equal(getProcessedName(init1), init1.name + ' [INIT]')
  t.equal(getProcessedName(init2), init2.name + ' [INIT]')
  t.equal(getProcessedName(cpp1), cpp1.name + ' [SHARED_LIB]')
  t.equal(getProcessedName(cpp2), cpp2.name + ' [SHARED_LIB]')
  t.equal(getProcessedName(v81), v81.name + ' [CPP]')
  t.equal(getProcessedName(v82), v82.name + ' [CODE:BuiltIn]')
  t.equal(getProcessedName(regexp1), regexp1.name + ' [CODE:RegExp]')
  t.equal(getProcessedName(regexp2), regexp2.name + ' [CODE:RegExp]')
  t.equal(getProcessedName(native1), native1.name)
  t.equal(getProcessedName(native2), '(anonymous) [eval]:486:24')
  t.equal(getProcessedName(core1), core1.name)
  t.equal(getProcessedName(core2), core2.name)
  t.equal(getProcessedName(deps1), deps1.name)
  t.equal(getProcessedName(deps2), deps2.name)
  t.equal(getProcessedName(app1), app1.name)
  t.equal(getProcessedName(app2), app2.name)
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
  t.equal(getType({ name: edgeCases.appUnix }), 'app')
  t.equal(getType({ name: edgeCases.appWindows }), 'app')
  t.equal(getType({ name: edgeCases.depsEsmWindows }), 'deps')
  t.equal(getType({ name: edgeCases.depsCommonUnix }), 'deps')
  t.equal(getType({ name: edgeCases.sharedLibUnix, type: 'SHARED_LIB' }), 'cpp')
  t.equal(getType({ name: edgeCases.sharedLibWindows, type: 'SHARED_LIB' }), 'cpp')
  t.equal(getType({ name: edgeCases.regexWindows, type: 'CODE', kind: 'RegExp'}), 'regexp')

  t.end()
})

return

zeroX({
  argv: [ resolve(__dirname, './fixture/do-eval.js') ],
  workingDir: resolve('./')
}).catch(console.error).then(htmlFile => {
  test('ensure HTML is created', () => {

  })

  test('unit test filters using names from json', () => {

  })
})
