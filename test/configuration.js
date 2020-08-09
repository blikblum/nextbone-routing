/* eslint-disable no-unused-expressions */
/* global describe,beforeEach,afterEach,it,expect */

import { Router } from '../src/index'
import { Region } from 'nextbone/dom-utils'
import { defineCE } from '@open-wc/testing-helpers'

let router, routes

class ParentView extends HTMLElement {
  static get outlet () {
    return '.child-el'
  }

  connectedCallback () {
    this.innerHTML = '<div class="child-el"></div>'
  }
}

defineCE(ParentView)

describe('root outlet', () => {
  beforeEach(() => {
    routes = (route) => { route('parent', { component: ParentView }) }
    document.body.innerHTML = '<div id="main"></div><app-root></app-root>'
  })

  afterEach(() => {
    router.destroy()
  })

  it('defaults to app-root', async () => {
    router = new Router({ routes })
    await router.listen()
    await router.transitionTo('parent')
    expect(router.rootOutlet).to.be.instanceOf(Region)
    expect(router.rootOutlet.targetEl).to.be.equal(document.querySelector('app-root'))
  })

  it('can be defined as a Region instance', async () => {
    const region = new Region(document.getElementById('main'))
    router = new Router({ outlet: region, routes })
    await router.listen()
    await router.transitionTo('parent')
    expect(router.rootOutlet).to.be.equal(region)
  })

  it('can be defined as function returning a Region instance', async () => {
    class MyRegion extends Region {}
    router = new Router({ outlet: () => new MyRegion(document.getElementById('main')), routes })
    await router.listen()
    await router.transitionTo('parent')
    expect(router.rootOutlet).to.be.instanceOf(MyRegion)
  })

  it('can be defined as a HTML element', async () => {
    const el = document.getElementById('main')
    router = new Router({ outlet: el, routes })
    await router.listen()
    await router.transitionTo('parent')
    expect(router.rootOutlet).to.be.instanceOf(Region)
    expect(router.rootOutlet.targetEl).to.be.equal(el)
  })

  it('can be defined as function returning a HTML element', async () => {
    const el = document.getElementById('main')
    router = new Router({ outlet: () => el, routes })
    await router.listen()
    await router.transitionTo('parent')
    expect(router.rootOutlet).to.be.instanceOf(Region)
    expect(router.rootOutlet.targetEl).to.be.equal(el)
  })

  it('can be defined as a CSS selector', async () => {
    router = new Router({ outlet: '#main', routes })
    await router.listen()
    await router.transitionTo('parent')
    expect(router.rootOutlet).to.be.instanceOf(Region)
    expect(router.rootOutlet.targetEl).to.be.equal(document.getElementById('main'))
  })
})

describe('route configuration', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="main"></div>'
  })

  afterEach(() => {
    router.destroy()
  })

  it('should accept a route without class or component', async () => {
    routes = (route) => { route('parent') }
    router = new Router({ outlet: '#main', routes })
    await router.listen()
    await router.transitionTo('parent')
  })
})
