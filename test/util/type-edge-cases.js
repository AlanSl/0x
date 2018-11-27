'use strict'

const { unescape } = require('querystring')

/**
 * Difficult examples containing various possible edge cases, to:
 *  - Avoid false positives in type detection
 *  - Ensure that nothing chokes on non-ASCII characters
 *  - Ensure that less common but valid path types are handled correctly
 **/

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
const sharedLibUnix = '/home/中文.mjs project/[CODE:RegExp] [CODE:RegExp] [CODE:RegExp]lib/node'

// Includes ' native ', [eval] and .js at the end of a folder name in a non-js-file path
const sharedLibWindows = '\\\\remote.smb.js.server.net\\the native dev\\[eval] [eval] [eval]\\node.js\\lib\\node'

// Includes spaces, 'internal\\', Cyrillic, Xhosa, a joining diacritic, and an ESM module
const depsEsmWindows = 'D:\\Documents and Settings\\Александра ǂǐ-sì\\internal\\app native internal\\node_modules\\some-module\\esm.mjs:1:1'

// Includes spaces, non-ASCII european characters, a joining diacritic, a single quote, ' internal/', ' native ', and
// 'node conf dubai' in Arabic, right-to-left, with joins. Encoded because some editors (e.g. Sublime) garble rtl text
const nodeConfDubai = unescape('%D9%86%D9%88%D8%AF%20%D9%83%D9%88%D9%86%D9%81%20%D8%AF%D8%A8%D9%8A')
const depsCommonUnix = `/home/Łukasz W̥̙̯. O'Reilly/projects/${nodeConfDubai}/internal/app native internal/node_modules/mædule/common.js:111:111`

// Includes 'node_modules\\', but isn't a dep
const appWindows = '\\\\my_unc_server\\my_unc_shares\\my_projects\\my_node_modules\\my_module\\index.js:1234567890:1234567890'

// Includes '/node_modules', but isn't a dep
const appUnix = '//unc_server/unc_share-bob/current_projects-bob/node_modules-bob/bobule/index.js:1234567890:1234567890'

// Use Windows paths in the regex because Unix path seperators (/) would be escaped in a regex
const regexWindows = `/${depsEsmWindows} ${sharedLibWindows} ${appWindows} ${allTags}/g`
const stringPosix = `${depsCommonUnix} ${sharedLibUnix} ${appUnix} ${allTags}`

// For use when inserting the above as strings into parsed or evalled strings
function insertAsString (str) {
  return `"${str.replace(/\\/g, '\\\\')}"`
}

module.exports = {
  allTags,
  regexWindows,
  stringPosix,
  sharedLibUnix,
  sharedLibWindows,
  depsEsmWindows,
  depsCommonUnix,
  appUnix,
  appWindows,
  insertAsString
}