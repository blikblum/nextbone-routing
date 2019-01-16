'use strict'

const fs = require('fs')
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
      babelrc: false,
      exclude: 'node_modules/**',
      sourceMaps: true,
      presets: [['env', { targets: { chrome: '60' }, modules: false }]]
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

// Copy package.json and LICENSE.txt
promise = promise.then(() => {
  delete pkg.private
  delete pkg.devDependencies
  delete pkg.scripts
  delete pkg.eslintConfig
  delete pkg.babel
  fs.writeFileSync('dist/package.json', JSON.stringify(pkg, null, '  '), 'utf-8')
  fs.writeFileSync('dist/LICENSE.txt', fs.readFileSync('LICENSE.txt', 'utf-8'), 'utf-8')
  fs.writeFileSync('dist/README.md', fs.readFileSync('README.md', 'utf-8'), 'utf-8')
  fs.writeFileSync('dist/CHANGELOG.md', fs.readFileSync('CHANGELOG.md', 'utf-8'), 'utf-8')
})

promise.catch(err => {
  console.error(err.stack) // eslint-disable-line no-console
  process.exit(1)
})
