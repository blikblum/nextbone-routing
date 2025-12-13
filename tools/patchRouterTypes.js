#!/usr/bin/env node

/**
 * Patch script to add Events mixin declaration to router.d.ts
 * Run after the types script generates the .d.ts files
 */

const fs = require('fs')
const path = require('path')

const routerTypesPath = path.join(__dirname, '..', 'types', 'router.d.ts')

const eventsImport = "import { Events } from 'nextbone';"
const eventsInterface =
  '// Declaration merging: Events methods are added to Router.prototype via Events.extend()\nexport interface Router extends Events {}'

try {
  let content = fs.readFileSync(routerTypesPath, 'utf8')

  // Check if Events import already exists
  if (!content.includes(eventsImport)) {
    // Add Events import at the end
    content += `\n${eventsImport}\n`
  }

  // Check if Router interface extension already exists
  if (!content.includes('export interface Router extends Events')) {
    // Add the interface extension before the import (or at the beginning after SlickRouter import)
    const slickRouterImport = "import { Router as SlickRouter } from 'slick-router/core.js';"
    if (content.includes(slickRouterImport)) {
      content = content.replace(slickRouterImport, `${slickRouterImport}\n\n${eventsInterface}`)
    } else {
      // If SlickRouter import not found, add at the beginning
      content = `${eventsInterface}\n\n${content}`
    }
  }

  fs.writeFileSync(routerTypesPath, content, 'utf8')
  console.log('✓ Successfully patched router.d.ts')
} catch (error) {
  console.error('✗ Error patching router.d.ts:', error.message)
  process.exit(1)
}
