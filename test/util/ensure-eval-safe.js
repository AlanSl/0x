'use strict'

// Can't be too careful with eval. Check no-one slipped something malicious in the complex strings
const esprima = require('esprima')
const assert = require('assert')

function insertAsString (str) {
  return `"${str.replace(/\\/g, '\\\\')}"`
}

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
  assert(strParsed.body[0].expression.value === str)
}

function regexSafetyCheck (str) {
  // Check when parsed as JS in new RegExp(), this is nothing but the expected regex
  const regexParsed = esprima.parse(`new RegExp(${str})`)
  mainSafetyCheck(regexParsed, 'NewExpression')

  // Below could be satisfied by, e.g. 'new RegExp(/.../); function RegExp () { hoistThenDoBadThings() }'
  // but it would fail parsed.body.length === 1 in mainSafetyCheck()
  // Redefining RegExp so the malicous RegExp def is called later would fail these:
  assert(regexParsed.body[0].expression.type === 'NewExpression')

  assert(regexParsed.body[0].expression.callee.name === 'RegExp')
  assert(regexParsed.body[0].expression.callee.type === 'Identifier')
  assert(Object.keys(regexParsed.body[0].expression.callee).length === 2)

  assert(regexParsed.body[0].expression.arguments.length === 1)

  // .raw includes the "" and additional \\ of the input string, .value doesn't
  assert(regexParsed.body[0].expression.arguments[0].raw === str)

  assert(Object.keys(regexParsed.body[0].expression).length === 3)
}

function evalSafeString (str) {
  stringSafetyCheck(str)
  return insertAsString(str)
}

function evalSafeRegexDef (str) {
  const safeStr = evalSafeString(str)
  regexSafetyCheck(safeStr)
  return safeStr
}

module.exports = {
  evalSafeString,
  evalSafeRegexDef
}
