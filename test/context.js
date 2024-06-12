/* global describe,beforeEach,afterEach,it */

import { Route, Router } from '../src/index'
import sinon from 'sinon'
import { expect } from 'chai'

let router, routes
let RootRoute, ParentRoute, ChildRoute, GrandChildRoute, LeafRoute

describe('Route context', () => {
  beforeEach(() => {
    router = new Router({ location: 'memory', outlet: null })
    RootRoute = class extends Route {}
    ParentRoute = class extends Route {
      internalProp = 'Parent Internal Stuff'
    }
    ChildRoute = class extends Route {}
    GrandChildRoute = class extends Route {
      internalProp = 'Internal Stuff'
    }
    LeafRoute = class extends Route {}
    routes = function (route) {
      route('parent', { class: ParentRoute, classOptions: { x: 1 } }, function () {
        route('child', { class: ChildRoute }, function () {
          route('grandchild', { class: GrandChildRoute }, function () {
            route('leaf', { class: LeafRoute })
          })
        })
      })
      route('root', { class: RootRoute })
    }
    router.map(routes)
    router.listen()
  })

  afterEach(() => {
    router.destroy()
  })

  it('should get the value from a parent route in activate', function (done) {
    let contextValue, contextProperty
    GrandChildRoute.providedContexts = {
      parentValue: { value: 'The Context Reloaded' },
      parentProperty: { property: 'internalProp' },
    }
    sinon.stub(LeafRoute.prototype, 'activate').callsFake(function (transition) {
      contextValue = this.context.parentValue
      contextProperty = this.context.parentProperty
    })
    router
      .transitionTo('leaf')
      .then(function () {
        expect(contextValue).to.be.equal('The Context Reloaded')
        expect(contextProperty).to.be.equal('Internal Stuff')
        done()
      })
      .catch(done)
  })

  it('should get the value from a parent route in deactivate', function (done) {
    let contextValue, contextProperty
    GrandChildRoute.providedContexts = {
      parentValue: { value: 'The Context Reloaded' },
      parentProperty: { property: 'internalProp' },
    }
    sinon.stub(LeafRoute.prototype, 'deactivate').callsFake(function (transition) {
      contextValue = this.context.parentValue
      contextProperty = this.context.parentProperty
    })
    router
      .transitionTo('leaf')
      .then(function () {
        return router.transitionTo('root')
      })
      .then(function () {
        expect(contextValue).to.be.equal('The Context Reloaded')
        expect(contextProperty).to.be.equal('Internal Stuff')
        done()
      })
      .catch(done)
  })

  it('should work outside of transition lifecycle', function (done) {
    let leafRoute
    GrandChildRoute.providedContexts = {
      parentValue: { value: 'The Context Reloaded' },
      parentProperty: { property: 'internalProp' },
    }
    sinon.stub(LeafRoute.prototype, 'activate').callsFake(function () {
      leafRoute = this
    })
    router
      .transitionTo('leaf')
      .then(function () {
        const contextValue = leafRoute.context.parentValue
        const contextProperty = leafRoute.context.parentProperty
        expect(router.state.activeTransition).to.be.equal(null)
        expect(contextValue).to.be.equal('The Context Reloaded')
        expect(contextProperty).to.be.equal('Internal Stuff')
        done()
      })
      .catch(done)
  })

  it('should work on inactive routes', function (done) {
    let leafRoute
    GrandChildRoute.providedContexts = {
      parentValue: { value: 'The Context Reloaded' },
      parentProperty: { property: 'internalProp' },
    }
    sinon.stub(LeafRoute.prototype, 'activate').callsFake(function () {
      leafRoute = this
    })
    router
      .transitionTo('leaf')
      .then(function () {
        return router.transitionTo('root')
      })
      .then(function () {
        const contextValue = leafRoute.context.parentValue
        const contextProperty = leafRoute.context.parentProperty
        expect(router.state.activeTransition).to.be.equal(null)
        expect(contextValue).to.be.equal('The Context Reloaded')
        expect(contextProperty).to.be.equal('Internal Stuff')
        done()
      })
      .catch(done)
  })

  it('should not get the values from a child route', function (done) {
    let contextValue = 'Original Value'
    let contextProperty = 'Original Property'
    GrandChildRoute.providedContexts = {
      parentValue: { value: 'The Context Reloaded' },
      parentProperty: { property: 'internalProp' },
    }
    sinon.stub(ChildRoute.prototype, 'activate').callsFake(function (transition) {
      contextValue = this.context.parentValue
      contextProperty = this.context.parentProperty
    })
    router
      .transitionTo('leaf')
      .then(function () {
        expect(contextValue).to.be.equal(undefined)
        expect(contextProperty).to.be.equal(undefined)
        done()
      })
      .catch(done)
  })

  it('should be replied by the nearest parent route', function (done) {
    let contextValue, contextProperty

    ParentRoute.providedContexts = {
      parentValue: { value: 'Parent Context' },
      parentProperty: { property: 'internalProp' },
    }

    GrandChildRoute.providedContexts = {
      parentValue: { value: 'Grand Child Context' },
      parentProperty: { property: 'internalProp' },
    }

    sinon.stub(LeafRoute.prototype, 'activate').callsFake(function (transition) {
      contextValue = this.context.parentValue
      contextProperty = this.context.parentProperty
    })
    router
      .transitionTo('leaf')
      .then(function () {
        expect(contextValue).to.be.equal('Grand Child Context')
        expect(contextProperty).to.be.equal('Internal Stuff')
        done()
      })
      .catch(done)
  })

  it('should return undefined if is not defined in a parent route', function (done) {
    let contextValue = 'Original value'
    let contextProperty = 'Original Property'
    GrandChildRoute.providedContexts = {
      parentValue: { value: 'Grand Child Context' },
      parentProperty: { property: 'internalProp' },
    }

    sinon.stub(LeafRoute.prototype, 'activate').callsFake(function (transition) {
      contextValue = this.context.otherParentValue
      contextProperty = this.context.otherParentProperty
    })
    router
      .transitionTo('leaf')
      .then(function () {
        expect(contextValue).to.be.equal(undefined)
        expect(contextProperty).to.be.equal(undefined)
        done()
      })
      .catch(done)
  })
})
