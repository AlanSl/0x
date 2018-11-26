'use strict'

const {
  evalCode,
  reps
} = require('../util/type-edge-cases.js')

for (let i = 0; i < reps; i++) {
  global.eval(evalCode)
}
