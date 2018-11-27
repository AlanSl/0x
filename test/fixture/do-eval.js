'use strict'

const {
  allTags,
  regexWindows,
  stringPosix,
  ridiculousValidMethodName
} = require('.type-edge-cases.js')

const {
  evalSafeString,
  isRegexDefEvalSafe
} = require('./ensure-eval-safe.js')

const debounce = require('debounce')
const assert = require('assert')

assert(isRegexDefEvalSafe(regexWindows))

function appFunc () {
  const reps = 500

  // Make the regex work hard so it definitely appears in the output
  const regexStringTarget = `${allTags} ${regexWindows} ${stringPosix}`.repeat(reps)

  const evalCode = `
    function appFunction () {
      const regex = new RegExp(${evalSafeString(regexWindows)})
      const obj = {
        "inline:this": function (input) {
          return input
        }
        ${evalSafeString(ridiculousValidMethodName)}: function () {
          return ${evalSafeString(regexStringTarget)}.replace(regex, ${evalSafeString(stringPosix)})
        }
      }
      return obj["inline:this"](obj[${evalSafeString(ridiculousValidMethodName)}]())
    }
    appFunction()
  `

  for (let i = 0; i < reps; i++) {
    global.eval(evalCode)
  }
}

// This debounce wrapper is purely to get a simple stable 'deps' frame in the output
debounce(appFunc)
