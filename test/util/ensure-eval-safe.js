'use strict'

const {
  allTags,
  regexWindows,
  stringPosix,
  depsEsmWindows,
  sharedLibWindows,
  insertAsString
} = require('./type-edge-cases.js')

// Can't be too careful with eval. Check no-one slipped something malicious in the complex strings
const esprima = require('esprima')
const assert = require('assert')

const ridiculousValidMethodName = `/Do ( ${stringPosix} ${depsEsmWindows} ${sharedLibWindows} )/`

function mainSafetyCheck (parsed, type = 'Literal') {
  // Check there's only one expression
  assert(parsed.body.length === 1)
  // Check it's what we expected
  assert(parsed.body[0].type === 'ExpressionStatement')
  assert(parsed.body[0].expression.type === type)
}

function stringSafetyCheck (str) {
  // Check when parsed as JS wrapped in " this is nothing but the original string
  const strParsed = esprima.parse(insertAsString(str))
  mainSafetyCheck(strParsed)
console.log(strParsed.body[0].expression.value, strParsed.body[0].expression.value === str, str)
if (strParsed.body[0].expression.value !== str) console.log('!!!!!!', strParsed.body[0].expression)
  assert(strParsed.body[0].expression.value === str)
}

function regexSafetyCheck (str) {
  // Check when parsed as JS in new RegExp(), this is nothing but the expected regex
  const regexParsed = esprima.parse(`new RegExp(${str})`)
  mainSafetyCheck(regexParsed, 'ExpressionStatement')

  // Below could be satisfied by, e.g. 'new RegExp(/.../); function RegExp () { hoistThenDoBadThings() }'
  // but it would fail parsed.body.length === 1 in mainSafetyCheck()
  // Redefining RegExp so the malicous RegExp def is called later would fail these:
  assert(regexParsed.body[0].expression.type === 'NewExpression')

  assert(regexParsed.body[0].expression.callee.name === 'RegExp')
  assert(regexParsed.body[0].expression.callee.type === 'Identifier')
  assert(Object.keys(regexParsed.body[0].expression.callee).length === 2)

  assert(regexParsed.body[0].expression.arguments.length === 1)
  assert(regexParsed.body[0].expression.arguments[0].value === str)

  assert(Object.keys(regexParsed.body[0].expression).length === 3)
}

// Check every evalled variable from dep before letting them near eval
stringSafetyCheck(allTags)
stringSafetyCheck(stringPosix)
stringSafetyCheck(depsEsmWindows)
stringSafetyCheck(sharedLibWindows)
stringSafetyCheck(regexWindows)
stringSafetyCheck(ridiculousValidMethodName)

regexSafetyCheck(regexWindows)

module.exports = {
  allTags,
  regexWindows,
  stringPosix,
  depsEsmWindows,
  sharedLibWindows,
  ridiculousValidMethodName,
  insertAsString
}
