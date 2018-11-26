'use strict'

const t = require('tap').test
const { unescape } = require('querystring')

const regexpTag = '[CODE:RegExp]'
const evalTag = '[eval]'
const nativeTag = ' native '
const initTag = '[INIT]'
const inlinableTag = '[INLINABLE]'
const v8CodeTag = '[CODE:someString]'
const cppTag = '[CPP]'
const allTags = `${regexpTag} ${evalTag} ${nativeTag} ${initTag} ${inlinableTag} ${v8CodeTag} ${cppTag}`

// Includes spaces, Chinese characters, [CODE:RegExp] in folder name, and .mjs folder name in a non-js-file path
// : is forbidden in filenames in Windows, Mac and _most_ Linux distros - but can't guarentee all
const sharedLibUnix = '/home/中文.mjs project/[CODE:RegExp] [CODE:RegExp] [CODE:RegExp]lib/node [SHARED_LIB]'

// Includes ' native ', [eval] and .js at the end of a folder name in a non-js-file path
const sharedLibWindows = 'D:\\Users\\the native dev\\[eval] [eval] [eval]\\node.js\\lib\\node [SHARED_LIB]'

// Includes spaces, 'internal\\', Cyrillic, Xhosa, a joining diacritic, and an ESM module
const depsEsmWindows = 'C:\\Documents and Settings\\Александра ǂǐ-sì\\internal\\app native internal\\node_modules\\some-module\\esm.mjs'

// Includes spaces, non-ASCII european characters, a joining diacritic, a single quote, ' internal/', ' native ', and
// 'node conf dubai' in Arabic, right-to-left, with joins. Encoded because some editors (e.g. Sublime) garble rtl text
const nodeConfDubai = unescape('%D9%86%D9%88%D8%AF%20%D9%83%D9%88%D9%86%D9%81%20%D8%AF%D8%A8%D9%8A')
const depsCommonUnix = `/home/Łukasz W̥̙̯. O\'Reilly/projects/${nodeConfDubai}/internal/app native internal/node_modules/mædule/common.js`

// Includes 'node_modules\\', but isn't a dep
const appWindows = '\\\\my_unc_server\\my_unc_shares\\my_projects\\my_node_modules\\my_module\\index.js'

// Includes '/node_modules', but isn't a dep
const appUnix = '//unc_server/unc_share_bob/current_projects-bob/node_modules-bob/bobule/index.js'

const reps = 500

// Use Windows paths in the regex because Unix path seperators (/) would be escaped in a regex
const regexWindows = `/${depsEsmWindows} ${sharedLibWindows} ${appWindows} ${allTags}/g`
const stringPosix = `${depsCommonUnix} ${sharedLibUnix} ${appUnix} ${allTags}`

// Make the regex work hard so it definitely appears in the output
const regexStringTarget = `${allNonPath} ${regexWindows} ${stringPosix}`.repeat(reps)

const ridiculousValidMethodName = `/Do ( ${stringPosix} ${depsEsmWindows} ${sharedLibWindows} )/`
const evalCode = `
  var obj = {
    "${ridiculousValidMethodName}": function () {
      "${regexStringTarget}".replace(new RegExp(${regexWindows}), "${stringPosix}")
    }
  }
  obj["${ridiculousValidMethodName}"]()`

for (let i = 0; i < reps; i++) {
  global.eval(evalCode)
}
