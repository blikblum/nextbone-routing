/* eslint-disable no-unused-expressions */
/* global describe,beforeEach,afterEach,it,expect */

import { Route, Router } from '../src/index'
import { withEvents } from 'nextbone'
import { defineCE } from '@open-wc/testing-helpers'
import { LitElement, html } from 'lit-element'

let router, routes
let ParentRoute, ChildRoute, GrandchildRoute

class ParentView extends withEvents(LitElement) {
  static get outlet () {
    return '.child-el'
  }

  createRenderRoot () {
    return this
  }

  render () {
    return html`<div class="child-el"></div>`
  }
}

const parentTag = defineCE(ParentView)

class ChildView extends LitElement {
  createRenderRoot () {
    return this
  }

  render () {
    return html`<h2>Child</h2><router-outlet></router-outlet>`
  }
}

const childTag = defineCE(ChildView)

class GrandChildView extends LitElement {
  createRenderRoot () {
    return this
  }

  render () {
    return html`Grandchild`
  }
}

const grandChildTag = defineCE(GrandChildView)

describe('Async Render', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="main"></div>'
    router = new Router({ location: 'memory', outlet: document.getElementById('main') })
    ParentRoute = class extends Route {
      component () { return ParentView }
    }
    ChildRoute = class extends Route {}
    GrandchildRoute = class extends Route {}
    routes = function (route) {
      route('parent', { class: ParentRoute }, function () {
        route('child', { class: ChildRoute, component: childTag }, function () {
          route('grandchild', { class: GrandchildRoute, component: GrandChildView })
        })
      })
    }
    router.map(routes)
    router.listen()
  })

  afterEach(() => {
    router.destroy()
  })

  describe('when a nested route is activated', function () {
    let grandChildRenderCb

    beforeEach(() => {
      router.on('render', route => {
        if (route.$name === 'grandchild' && grandChildRenderCb) {
          grandChildRenderCb(route)
        }
      })
    })

    afterEach(() => {
      router.off()
    })

    it('should render each route element in parent outlet', function (done) {
      grandChildRenderCb = async function (route) {
        await route.el.updateComplete
        const el = document.getElementById('main')
        expect(el.innerHTML).to.equal(`<${parentTag}><!----><div class="child-el"><${childTag}><!----><h2>Child</h2><router-outlet><${grandChildTag}><!---->Grandchild<!----></${grandChildTag}></router-outlet><!----></${childTag}></div><!----></${parentTag}>`)
        done()
      }
      router.transitionTo('grandchild')
    })
  })
})
