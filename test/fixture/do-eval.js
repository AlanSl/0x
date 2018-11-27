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
  const reps = 5000

  // Make the regex work hard so it definitely appears in the output
  const regexStringTarget = `${allTags} ${regexWindows} ${stringPosix}`.repeat(reps)

  const evalCode = `
    const regex = new RegExp(${evalSafeRegexDef(regexWindows)})
    const obj = {
      ${evalSafeString(ridiculousValidMethodName)}: function () {
        return ${evalSafeString(regexStringTarget)}.replace(regex, ${evalSafeString(stringPosix)})
      }
    }

    function appInnerFunc () {
      return obj[${evalSafeString(ridiculousValidMethodName)}]()
    }

    appInnerFunc()
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
