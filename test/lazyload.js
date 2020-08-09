/* eslint-disable no-unused-expressions */
/* global describe,beforeEach,afterEach,it,sinon,expect */

import { Route, Router } from '../src/index'
import { Region } from 'nextbone/dom-utils'

let router, routes
let ParentRoute, ChildRoute, GrandChildRoute, LeafRoute

function AsyncChildRoute () {
  return new Promise(function (resolve) {
    setTimeout(function () {
      resolve(ChildRoute)
    }, 200)
  })
}

function AsyncChildComponent () {
  return new Promise(function (resolve) {
    setTimeout(function () {
      resolve('my-component')
    }, 200)
  })
}

describe('Route configuration', () => {
  beforeEach(() => {
    router = new Router({ location: 'memory', outlet: null })
    ParentRoute = class extends Route {}
    ChildRoute = class extends Route {}
    GrandChildRoute = class extends Route {}
    LeafRoute = class extends Route {}

    routes = function (route) {
      route('parent', { class: ParentRoute, classOptions: { x: 1 } }, function () {
        route('child', { class: ChildRoute }, function () {
          route('grandchild', {}, function () {
            route('leaf', {})
          })
        })
        route('child2', { class: AsyncChildRoute })
        route('child3', { component: AsyncChildComponent })
      })
    }
    router.map(routes)
    router.listen()
  })

  afterEach(() => {
    router.destroy()
  })

  describe('can be defined in a parent route class constructor', function () {
    it('directly', function () {
      ChildRoute.childRoutes = {
        grandchild: GrandChildRoute,
        leaf: function () {
          return LeafRoute
        }
      }

      const spy = sinon.spy(GrandChildRoute.prototype, 'initialize')
      const spy2 = sinon.spy(LeafRoute.prototype, 'initialize')
      return router.transitionTo('leaf').then(function () {
        expect(spy).to.be.calledOnce
        expect(spy2).to.be.calledOnce
      })
    })

    it('wrapped in an ES module', function () {
      const GrandChildModule = { __esModule: true, default: GrandChildRoute }
      const LeafModule = { __esModule: true, default: LeafRoute }
      ChildRoute.childRoutes = {
        grandchild: GrandChildModule,
        leaf: function () {
          return LeafModule
        }
      }

      const spy = sinon.spy(GrandChildRoute.prototype, 'initialize')
      const spy2 = sinon.spy(LeafRoute.prototype, 'initialize')
      return router.transitionTo('leaf').then(function () {
        expect(spy).to.be.calledOnce
        expect(spy2).to.be.calledOnce
      })
    })
  })

  it('can be loaded asynchronously from childRoutes', function () {
    ChildRoute.childRoutes = {
      grandchild: GrandChildRoute,
      leaf: function () {
        return new Promise(function (resolve) {
          setTimeout(function () {
            resolve(LeafRoute)
          }, 200)
        })
      }
    }
    const spy = sinon.spy(LeafRoute.prototype, 'initialize')
    return router.transitionTo('leaf').then(function () {
      expect(spy).to.be.calledOnce
    })
  })

  it('can be loaded asynchronously from class', function () {
    const spy = sinon.spy(ChildRoute.prototype, 'initialize')
    return router.transitionTo('child2').then(function () {
      expect(spy).to.be.calledOnce
    })
  })

  it('can be loaded asynchronously from component', async function () {
    const rootEl = document.createElement('div')
    router.rootOutlet = new Region(rootEl)
    const transition = router.transitionTo('child3')
    await transition
    const route = transition.instances.find(route => route.$name === 'child3')
    expect(route.component).to.be.equal('my-component')
    expect(rootEl.innerHTML).to.be.equal('<my-component></my-component>')
  })
})
