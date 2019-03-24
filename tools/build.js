'use strict'

const del = require('del')
const rollup = require('rollup')
const babel = require('rollup-plugin-babel')
const pkg = require('../package.json')

let promise = Promise.resolve()

let dependencies = Object.assign({}, pkg.dependencies || {}, pkg.peerDependencies || {})

// Clean up the output directory
promise = promise.then(() => del(['dist/*']))

// Compile source code into a distributable format with Babel
for (const format of ['es']) {
  promise = promise.then(() => rollup.rollup({
    input: 'src/index.js',
    external: Object.keys(dependencies),
    plugins: [babel({
      exclude: 'node_modules/**',
      sourceMaps: true
    })]
  }).then(bundle => bundle.write({
    file: `dist/nextbone-routing.js`,
    format,
    sourcemap: true,
    globals: {
      backbone: 'Backbone',
      underscore: '_',
      'backbone.marionette': 'Backbone.Marionette',
      'backbone.radio': 'Backbone.Radio'
    }
  })))
}

promise.catch(err => {
  console.error(err.stack) // eslint-disable-line no-console
  process.exit(1)
})
