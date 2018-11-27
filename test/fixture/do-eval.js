'use strict'

const {
  allTags,
  regexWindows,
  stringPosix,
  ridiculousValidMethodName
} = require('../util/type-edge-cases.js')

const {
  evalSafeString,
  evalSafeRegexDef
} = require('../util/ensure-eval-safe.js')

const debounce = require('debounce')

function appOuterFunc () {
  // Long enough for consistent output,
  // not so long test is slow or may time out
  const reps = 300

  // Make the regex work hard so it definitely appears in the output
  const regexStringTarget = `${allTags} ${regexWindows} ${stringPosix}`.repeat(reps)

  const evalCode = `
    const regex = new RegExp(${evalSafeRegexDef(regexWindows)})
    const obj = {
      ${evalSafeString(ridiculousValidMethodName)}: function () {
        return ${evalSafeString(regexStringTarget)}.replace(regex, ${evalSafeString(stringPosix)})
      }
    }
    obj[${evalSafeString(ridiculousValidMethodName)}]()
  `

  function doEval (evalCode) {
    global.eval(evalCode)
  }

  for (let i = 0; i < reps; i++) {
    doEval(evalCode)
  }
}

// This debounce wrapper is purely to get a simple stable 'deps' frame in the output
const debounceWrapper = debounce(appOuterFunc, 0, true)
debounceWrapper()
