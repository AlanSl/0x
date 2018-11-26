'use strict'

module.exports = (render) => Object.assign(() => render`
  <chart
    class='db overflow-y-scroll overflow-x-hidden relative'
    style='padding-left: 5%; padding-right: 5%; height: calc(100vh - 66px)'
  >
  </chart>
`, { v8cats })

function includesPathSeperator (name) {
  if (name.indexOf('/') !== -1) return true
  return includesWindowsSeperator(name)
}

function includesWindowsSeperator (name) {
  return (name.indexOf('\\') !== -1)
}

function isInternalPath (name) {
  // Looking for names like '~someFunction internal/bootstrap/node.js:1:2
  // Windows internal Node paths also use / as the seperator in their names
  if (!/ internal\//.test(name)) return false

  // Must also check this isn't some local directory that contains ' internal'
  return !/ \//.test(name) && !includesWindowsSeperator(name)
}

function v8cats (child) {
  var name = child.name

  // RegExp and Eval can contain anything (a method name defined in eval could be any string)
  if (/\[CODE:RegExp]$/.test(name)) return { type: 'regexp' }
  // Unless we create an eval checkbox, "native" is the next best label - cannot tell if the eval is from app, deps, core
  if (/\[eval]:\d+:\d+$/.test(name)) return { type: 'native' }

  if (/\[INIT]$/.test(name)) return { type: 'init' }
  if (/\[INLINABLE]$/.test(name)) return { type: 'inlinable' }
  if (/\[CODE:.*?]$/.test(name) || /v8::internal::.*\[CPP]$/.test(name)) return { type: 'v8' }
  if (/\[CPP]$/.test(name) || /\[SHARED_LIB]$/.test(name)) return { type: 'cpp' }

  // Folder names can also contain '.js' or '.mjs' (e.g. projects/node.js/some-app), so check position
  if (!/\.m?js:\d+:\d+?$/.test(name)) {
    return (/\.$/.test(name)) ? { type: 'core' } : { type: 'v8' }
  }

  if (/ native /.test(name)) return { type: 'native' }
  if (!includesPathSeperator(name) || isInternalPath(name)) return { type: 'core' }
  if (/\/node_modules\//.test(name) || /\\node_modules\\/.test(name)) return { type: 'deps' }

  return { type: 'app' }
}
