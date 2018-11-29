'use strict'

const {
  allTags,
  regexWindowsPaths,
  stringPosixPaths,
  nonPathRegex,
  ridiculousValidMethodName
} = require('../util/type-edge-cases.js')

const {
  evalSafeString,
  evalSafeRegexDef
} = require('../util/ensure-eval-safe.js')

const doFunc = require('./μИاκهよΞ/unicode-in-path.js')

const debounce = require('debounce')

function appOuterFunc () {
  // Long enough for consistent output, not so long test is slow or may time out
  const reps = 120

  // Make the regex work hard so it definitely appears in the output
  const regexStringTarget = `${allTags} ${regexWindowsPaths} ${stringPosixPaths}`.repeat(reps)

  const evalCode = `
    function evalInnerFunc () {
      const regex = new RegExp(${evalSafeRegexDef(regexWindowsPaths)})
      const obj = {
        ${evalSafeString(ridiculousValidMethodName)}: function () {
          return ${evalSafeString(regexStringTarget)}.replace(regex, ${evalSafeString(stringPosixPaths)})
        }
      }
      obj[${evalSafeString(ridiculousValidMethodName)}]()
    }
    evalInnerFunc()
  `

  for (let i = 0; i < reps; i++) {
    doFunc(doEval)
  }

  function doEval () {
    global.eval(evalCode)
    evalCode.replace(new RegExp(nonPathRegex), stringPosixPaths)
  }
}

// This debounce wrapper is purely to get a simple stable 'deps' frame in the output
const debounceWrapper = debounce(appOuterFunc, 0, true)
debounceWrapper()
