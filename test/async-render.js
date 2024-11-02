/* global describe,beforeEach,afterEach,it */

import { Route, Router } from '../src/index'
import { withEvents } from 'nextbone'
import { LitElement, html } from 'lit-element'
import { expect, use } from 'chai'
import { chaiDomDiff } from '@open-wc/semantic-dom-diff'

use(chaiDomDiff)

let router, routes
let ParentRoute, ChildRoute, GrandchildRoute

class ParentView extends withEvents(LitElement) {
  static get outlet() {
    return '.child-el'
  }

  createRenderRoot() {
    return this
  }

  render() {
    return html`<div class="child-el"></div>`
  }
}

const parentTag = 'parent-view'
customElements.define(parentTag, ParentView)

class ChildView extends LitElement {
  createRenderRoot() {
    return this
  }

  render() {
    return html`<h2>Child</h2>
      <router-outlet></router-outlet>`
  }
}

const childTag = 'child-view'
customElements.define(childTag, ChildView)

class GrandChildView extends LitElement {
  createRenderRoot() {
    return this
  }

  render() {
    return html`Grandchild`
  }
}

const grandChildTag = 'grandchild-view'
customElements.define(grandChildTag, GrandChildView)

describe('Async Render', () => {
  /**
   * @type {HTMLElement}
   */
  let outlet
  let updateElResult = false
  beforeEach(() => {
    document.body.innerHTML = '<div id="main"></div>'
    outlet = document.getElementById('main')
    router = new Router({
      location: 'memory',
      outlet,
    })
    ParentRoute = class extends Route {
      component() {
        return ParentView
      }

      updateEl() {
        return updateElResult
      }
    }
    ChildRoute = class extends Route {}
    GrandchildRoute = class extends Route {}
    routes = function (route) {
      route('parent', { class: ParentRoute }, function () {
        route('child', { class: ChildRoute, component: childTag }, function () {
          route('grandchild', {
            class: GrandchildRoute,
            component: GrandChildView,
          })
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
      router.on('render', (route) => {
        if (route.$name === 'grandchild' && grandChildRenderCb) {
          grandChildRenderCb(route)
        }
      })
    })

    afterEach(() => {
      router.off()
    })

    it('should render each route element in parent outlet', async function () {
      let res, routeEl
      const promise = new Promise((resolve) => {
        res = resolve
      })

      grandChildRenderCb = function (route) {
        routeEl = route.el
        res()
      }
      await router.transitionTo('grandchild')
      await promise

      await routeEl.updateComplete
      const el = document.getElementById('main')
      expect(el).lightDom.to.equal(
        `<parent-view>
          <div class="child-el">
            <child-view>
              <h2>Child</h2>
              <router-outlet>
                <grandchild-view>Grandchild</grandchild-view>
              </router-outlet>
            </child-view>
          </div>
        </parent-view>`,
      )
    })
  })

  it('should remove the deactivated elements when transitioning from a child route', async () => {
    await router.transitionTo('grandchild')
    await router.transitionTo('parent')
    expect(outlet).lightDom.to.equal(`<parent-view>
      <div class="child-el"></div>
    </parent-view>`)
    const parentEl = outlet.children[0]
    expect(parentEl).lightDom.to.equal('<div class="child-el"></div>')
  })

  it('should not remove the child elements of first deactivated element when transitioning from a child route', async () => {
    await router.transitionTo('grandchild')
    const parentEl = outlet.children[0]
    const childEl = parentEl.querySelector('child-view')
    await router.transitionTo('parent')
    expect(childEl).lightDom.to.equal(`
      <h2>Child</h2>
      <router-outlet>
        <grandchild-view>Grandchild</grandchild-view>
      </router-outlet>
    `)
  })

  it('should remove the deactivated elements when transitioning from a child route to a reusable el', async () => {
    updateElResult = true
    await router.transitionTo('grandchild')
    await router.transitionTo('parent')
    expect(outlet).lightDom.to.equal(`<parent-view>
      <div class="child-el"></div>
    </parent-view>`)
    const parentEl = outlet.children[0]
    expect(parentEl).lightDom.to.equal('<div class="child-el"></div>')
  })

  it('should not remove the child elements of first deactivated element when transitioning from a child route to a reusable el', async () => {
    updateElResult = true
    await router.transitionTo('grandchild')
    const parentEl = outlet.children[0]
    const childEl = parentEl.querySelector('child-view')
    await router.transitionTo('parent')
    expect(childEl).lightDom.to.equal(`
      <h2>Child</h2>
      <router-outlet>
        <grandchild-view>Grandchild</grandchild-view>
      </router-outlet>
    `)
  })
})
