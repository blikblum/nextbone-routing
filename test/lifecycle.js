/* global describe,beforeEach,afterEach,it */

import { Route, Router } from '../src/index'
import sinon from 'sinon'
import { expect, use } from 'chai'
import sinonChai from 'sinon-chai-es'

use(sinonChai)

let router, routes
let RootRoute,
  ParentRoute,
  ChildRoute,
  GrandChildRoute,
  LeafRoute,
  Child2Route,
  DynParentRoute,
  DynChildRoute,
  DynGrandChildRoute
let currentTransition

describe('Lifecycle hooks', () => {
  beforeEach(() => {
    router = new Router({ location: 'memory', outlet: null })
    router.use(
      function (transition) {
        currentTransition = transition
      },
      { at: 0 },
    )
    RootRoute = class extends Route {
      load() {}
    }
    ParentRoute = class extends Route {
      load() {}
    }
    ChildRoute = class extends Route {}
    GrandChildRoute = class extends Route {
      load() {}
    }
    LeafRoute = class extends Route {}
    Child2Route = class extends Route {}
    DynParentRoute = class extends Route {}
    DynChildRoute = class extends Route {}
    DynGrandChildRoute = class extends Route {}

    routes = function (route) {
      route('parent', { class: ParentRoute, classOptions: { x: 1 }, arbitrary: 3 }, function () {
        route('child', { class: ChildRoute }, function () {
          route('grandchild', { class: GrandChildRoute }, function () {
            route('leaf', { class: LeafRoute })
          })
        })
        route('child2', { class: Child2Route })
      })
      route('root', { class: RootRoute })
      route('dynparent', { class: DynParentRoute }, function () {
        route('dynchild', { path: ':id', class: DynChildRoute }, function () {
          route('dyngrandchild', { class: DynGrandChildRoute })
        })
      })
    }
    router.map(routes)
    router.listen()
  })

  afterEach(() => {
    router.destroy()
  })

  describe('router instance', () => {
    it('should be accessible in Route classes as $router', function (done) {
      let routeInstance
      sinon.stub(ParentRoute.prototype, 'initialize').callsFake(function () {
        routeInstance = this
      })
      router
        .transitionTo('parent')
        .then(function () {
          expect(routeInstance.$router).to.be.equal(router)
          done()
        })
        .catch(done)
    })
  })

  describe('initialize', () => {
    it('should be called once with classOptions', function (done) {
      const spy = sinon.spy(ParentRoute.prototype, 'initialize')
      router
        .transitionTo('parent')
        .then(function () {
          expect(spy).to.be.calledOnce
          expect(spy).to.be.calledWith({ x: 1 })
          done()
        })
        .catch(done)
    })

    it('should be called once even when enter route a second time', function (done) {
      const spy = sinon.spy(RootRoute.prototype, 'initialize')
      router
        .transitionTo('root')
        .then(function () {
          return router.transitionTo('parent')
        })
        .then(function () {
          return router.transitionTo('root')
        })
        .then(function () {
          expect(spy).to.have.been.calledOnce
          done()
        })
        .catch(done)
    })

    it('should be called in order from root to leave once', function (done) {
      const parentSpy = sinon.spy(ParentRoute.prototype, 'initialize')
      const childSpy = sinon.spy(ChildRoute.prototype, 'initialize')
      const grandChildSpy = sinon.spy(GrandChildRoute.prototype, 'initialize')
      const leafSpy = sinon.spy(LeafRoute.prototype, 'initialize')
      router
        .transitionTo('leaf')
        .then(function () {
          return router.transitionTo('root')
        })
        .then(function () {
          return router.transitionTo('leaf')
        })
        .then(function () {
          // once
          expect(parentSpy).to.have.been.calledOnce
          expect(childSpy).to.have.been.calledOnce
          expect(grandChildSpy).to.have.been.calledOnce
          expect(leafSpy).to.have.been.calledOnce
          // order
          expect(childSpy).to.have.been.calledAfter(parentSpy)
          expect(grandChildSpy).to.have.been.calledAfter(childSpy)
          expect(leafSpy).to.have.been.calledAfter(grandChildSpy)
          done()
        })
        .catch(done)
    })

    it('should allow to access configuration properties', function () {
      ParentRoute.prototype.initialize = function () {
        expect(this.$name).to.be.equal('parent')
        expect(this.$path).to.be.equal('parent')
        expect(this.$options).to.not.be.undefined
        expect(this.$options.arbitrary).to.be.equal(3)
      }
      return router.transitionTo('parent')
    })
  })

  describe('activate', () => {
    it('should be called once with transition when enter route', function (done) {
      const spy = sinon.spy(ParentRoute.prototype, 'activate')
      router
        .transitionTo('parent')
        .then(function () {
          expect(spy).to.be.calledOnce
          expect(spy).to.be.calledWith(currentTransition)
          done()
        })
        .catch(done)
    })

    it('should be called twice when enter route a second time', function (done) {
      const spy = sinon.spy(RootRoute.prototype, 'activate')
      router
        .transitionTo('root')
        .then(function () {
          return router.transitionTo('parent')
        })
        .then(function () {
          return router.transitionTo('root')
        })
        .then(function () {
          expect(spy).to.have.been.calledTwice
          done()
        })
        .catch(done)
    })

    it('should be called in order from root to leaf, once', function (done) {
      const parentSpy = sinon.spy(ParentRoute.prototype, 'activate')
      const childSpy = sinon.spy(ChildRoute.prototype, 'activate')
      const grandChildSpy = sinon.spy(GrandChildRoute.prototype, 'activate')
      const leafSpy = sinon.spy(LeafRoute.prototype, 'activate')
      router
        .transitionTo('leaf')
        .then(function () {
          // once
          expect(parentSpy).to.have.been.calledOnce
          expect(childSpy).to.have.been.calledOnce
          expect(grandChildSpy).to.have.been.calledOnce
          expect(leafSpy).to.have.been.calledOnce
          // order
          expect(childSpy).to.have.been.calledAfter(parentSpy)
          expect(grandChildSpy).to.have.been.calledAfter(childSpy)
          expect(leafSpy).to.have.been.calledAfter(grandChildSpy)
          done()
        })
        .catch(done)
    })

    it('should be called after parent async activate methods are resolved', function (done) {
      const parentPromiseSpy = sinon.spy()
      const parentSpy = sinon
        .stub(ParentRoute.prototype, 'activate')
        .callsFake(function (transition) {
          return new Promise((resolve) => setTimeout(resolve, 100)).then(parentPromiseSpy)
        })
      const childPromiseSpy = sinon.spy()
      const childSpy = sinon
        .stub(ChildRoute.prototype, 'activate')
        .callsFake(function (transition) {
          return new Promise((resolve) => setTimeout(resolve, 50)).then(childPromiseSpy)
        })
      const grandChildPromiseSpy = sinon.spy()
      const grandChildSpy = sinon
        .stub(GrandChildRoute.prototype, 'activate')
        .callsFake(function () {
          return new Promise((resolve) => setTimeout(resolve, 100)).then(grandChildPromiseSpy)
        })
      const leafSpy = sinon.spy(LeafRoute.prototype, 'activate')
      router
        .transitionTo('leaf')
        .then(function () {
          // once
          expect(parentSpy).to.have.been.calledOnce
          expect(childSpy).to.have.been.calledOnce
          expect(grandChildSpy).to.have.been.calledOnce
          expect(leafSpy).to.have.been.calledOnce
          // order
          expect(childSpy).to.have.been.calledAfter(parentSpy)
          expect(childSpy).to.have.been.calledAfter(parentPromiseSpy)
          expect(grandChildSpy).to.have.been.calledAfter(childSpy)
          expect(grandChildSpy).to.have.been.calledAfter(childPromiseSpy)
          expect(leafSpy).to.have.been.calledAfter(grandChildSpy)
          expect(leafSpy).to.have.been.calledAfter(grandChildPromiseSpy)
          done()
        })
        .catch(done)
    })

    it('should not be called if transition is canceled in a parent route', function (done) {
      const parentSpy = sinon.spy(ParentRoute.prototype, 'activate')
      const childStub = sinon
        .stub(ChildRoute.prototype, 'activate')
        .callsFake(function (transition) {
          transition.cancel()
        })
      const grandChildSpy = sinon.spy(GrandChildRoute.prototype, 'activate')
      const leafSpy = sinon.spy(LeafRoute.prototype, 'activate')
      router
        .transitionTo('leaf')
        .then(function () {
          done('Transition promise should be rejected')
        })
        .catch(function () {
          expect(parentSpy).to.have.been.calledOnce
          expect(childStub).to.have.been.calledOnce
          expect(grandChildSpy).to.not.have.been.called
          expect(leafSpy).to.not.have.been.called
          done()
        })
    })

    it('should cancel transition if returns false', function (done) {
      let transition
      const parentSpy = sinon.spy(ParentRoute.prototype, 'activate')
      const childStub = sinon.stub(ChildRoute.prototype, 'activate').callsFake(function (t) {
        transition = t
        return false
      })
      const grandChildSpy = sinon.spy(GrandChildRoute.prototype, 'activate')
      const leafSpy = sinon.spy(LeafRoute.prototype, 'activate')
      router
        .transitionTo('leaf')
        .then(function () {
          done('Transition promise should be rejected')
        })
        .catch(function () {
          expect(parentSpy).to.have.been.calledOnce
          expect(childStub).to.have.been.calledOnce
          expect(grandChildSpy).to.not.have.been.called
          expect(leafSpy).to.not.have.been.called
          expect(transition.isCancelled).to.be.true
          done()
        })
    })

    it('should be called when child route change to a route with some parent', function (done) {
      let parentSpy
      let child2Spy
      router
        .transitionTo('child')
        .then(function () {
          parentSpy = sinon.spy(ParentRoute.prototype, 'activate')
          child2Spy = sinon.spy(Child2Route.prototype, 'activate')
          return router.transitionTo('child2')
        })
        .then(function () {
          expect(parentSpy).to.not.be.called
          expect(child2Spy).to.be.calledOnce
          done()
        })
        .catch(done)
    })

    it('should be called when a route param changes', function (done) {
      let parentSpy, childSpy, grandChildSpy
      router
        .transitionTo('dyngrandchild', { id: 1 })
        .then(function () {
          parentSpy = sinon.spy(DynParentRoute.prototype, 'activate')
          childSpy = sinon.spy(DynChildRoute.prototype, 'activate')
          grandChildSpy = sinon.spy(DynGrandChildRoute.prototype, 'activate')
          return router.transitionTo('dyngrandchild', { id: 2 })
        })
        .then(function () {
          expect(parentSpy).to.not.be.called
          expect(childSpy).to.be.calledOnce
          expect(grandChildSpy).to.be.calledOnce
          done()
        })
        .catch(done)
    })
  })

  describe('load', () => {
    it('should be called once with transition when enter route', function (done) {
      const spy = sinon.spy(ParentRoute.prototype, 'load')
      router
        .transitionTo('parent')
        .then(function () {
          expect(spy).to.be.calledOnce
          expect(spy).to.be.calledWith(currentTransition)
          done()
        })
        .catch(done)
    })

    it('should be called twice when enter route a second time', function (done) {
      const spy = sinon.spy(RootRoute.prototype, 'load')
      router
        .transitionTo('root')
        .then(function () {
          return router.transitionTo('parent')
        })
        .then(function () {
          return router.transitionTo('root')
        })
        .then(function () {
          expect(spy).to.have.been.calledTwice
          done()
        })
        .catch(done)
    })

    it('should be called in order from root to leaf, once', function (done) {
      const parentSpy = sinon.spy(ParentRoute.prototype, 'load')
      const grandChildSpy = sinon.spy(GrandChildRoute.prototype, 'load')
      router
        .transitionTo('leaf')
        .then(function () {
          // once
          expect(parentSpy).to.have.been.calledOnce
          expect(grandChildSpy).to.have.been.calledOnce
          // order
          expect(grandChildSpy).to.have.been.calledAfter(parentSpy)
          done()
        })
        .catch(done)
    })

    it('should not be called if transition is canceled in a parent route', function (done) {
      const parentSpy = sinon.spy(ParentRoute.prototype, 'activate')
      const childStub = sinon
        .stub(ChildRoute.prototype, 'activate')
        .callsFake(function (transition) {
          transition.cancel()
        })
      const grandChildSpy = sinon.spy(GrandChildRoute.prototype, 'load')
      router
        .transitionTo('leaf')
        .then(function () {
          done('Transition promise should be rejected')
        })
        .catch(function () {
          expect(parentSpy).to.have.been.calledOnce
          expect(childStub).to.have.been.calledOnce
          expect(grandChildSpy).to.not.have.been.called
          done()
        })
    })

    it('should not be called if transition is cancelled in same route', function (done) {
      const parentSpy = sinon.spy(ParentRoute.prototype, 'activate')
      const childStub = sinon
        .stub(GrandChildRoute.prototype, 'activate')
        .callsFake(function (transition) {
          transition.cancel()
        })
      const grandChildSpy = sinon.spy(GrandChildRoute.prototype, 'load')
      router
        .transitionTo('leaf')
        .then(function () {
          done('Transition promise should be rejected')
        })
        .catch(function () {
          expect(parentSpy).to.have.been.calledOnce
          expect(childStub).to.have.been.calledOnce
          expect(grandChildSpy).to.not.have.been.called
          done()
        })
    })

    it('should always be called even if not activating', function () {
      const activateSpy = sinon.spy(ParentRoute.prototype, 'activate')
      const loadSpy = sinon.spy(ParentRoute.prototype, 'load')
      return router
        .transitionTo('child')
        .then(function () {
          return router.transitionTo('child2')
        })
        .then(function () {
          expect(activateSpy).to.be.calledOnce
          expect(loadSpy).to.be.calledTwice
        })
    })

    it('should not cancel the transition when returned promise is rejected', function () {
      const parentStub = sinon.stub(ParentRoute.prototype, 'load').callsFake(function () {
        return Promise.reject()
      })
      return router.transitionTo('child').then(function () {
        expect(parentStub).to.be.calledOnce
      })
    })

    it('should be called even if a parent load is rejected', function (done) {
      const parentStub = sinon.stub(ParentRoute.prototype, 'load').callsFake(function () {
        return Promise.reject()
      })
      const grandChildSpy = sinon.spy(GrandChildRoute.prototype, 'load')
      router
        .transitionTo('leaf')
        .then(function () {
          // once
          expect(parentStub).to.have.been.calledOnce
          expect(grandChildSpy).to.have.been.calledOnce
          // order
          expect(grandChildSpy).to.have.been.calledAfter(parentStub)
          done()
        })
        .catch(done)
    })
  })

  describe('deactivate', () => {
    it('should be called once with transition when leave route', function (done) {
      const spy = sinon.spy(ParentRoute.prototype, 'deactivate')
      router
        .transitionTo('parent')
        .then(function () {
          return router.transitionTo('root')
        })
        .then(function () {
          expect(spy).to.be.calledOnce
          expect(spy).to.be.calledWith(currentTransition)
          done()
        })
        .catch(done)
    })

    it('should be called twice when leave route a second time', function (done) {
      const spy = sinon.spy(RootRoute.prototype, 'deactivate')
      router
        .transitionTo('root')
        .then(function () {
          return router.transitionTo('parent')
        })
        .then(function () {
          return router.transitionTo('root')
        })
        .then(function () {
          return router.transitionTo('parent')
        })
        .then(function () {
          expect(spy).to.have.been.calledTwice
          done()
        })
        .catch(done)
    })

    it('should be called in order from leaf to root, once', function (done) {
      const parentSpy = sinon.spy(ParentRoute.prototype, 'deactivate')
      const childSpy = sinon.spy(ChildRoute.prototype, 'deactivate')
      const grandChildSpy = sinon.spy(GrandChildRoute.prototype, 'deactivate')
      const leafSpy = sinon.spy(LeafRoute.prototype, 'deactivate')
      router
        .transitionTo('leaf')
        .then(function () {
          return router.transitionTo('root')
        })
        .then(function () {
          // once
          expect(parentSpy).to.have.been.calledOnce
          expect(childSpy).to.have.been.calledOnce
          expect(grandChildSpy).to.have.been.calledOnce
          expect(leafSpy).to.have.been.calledOnce
          // order
          expect(grandChildSpy).to.have.been.calledAfter(leafSpy)
          expect(childSpy).to.have.been.calledAfter(grandChildSpy)
          expect(parentSpy).to.have.been.calledAfter(childSpy)
          done()
        })
        .catch(done)
    })

    it('should be called after child async activate methods are resolved', function (done) {
      const parentSpy = sinon.spy(ParentRoute.prototype, 'deactivate')

      const childPromiseSpy = sinon.spy()
      const childSpy = sinon
        .stub(ChildRoute.prototype, 'deactivate')
        .callsFake(function (transition) {
          return new Promise((resolve) => setTimeout(resolve, 50)).then(childPromiseSpy)
        })
      const grandChildPromiseSpy = sinon.spy()
      const grandChildSpy = sinon
        .stub(GrandChildRoute.prototype, 'deactivate')
        .callsFake(function (transition) {
          return new Promise((resolve) => setTimeout(resolve, 50)).then(grandChildPromiseSpy)
        })
      const leafPromiseSpy = sinon.spy()
      const leafSpy = sinon
        .stub(LeafRoute.prototype, 'deactivate')
        .callsFake(function (transition) {
          return new Promise((resolve) => setTimeout(resolve, 100)).then(leafPromiseSpy)
        })
      router
        .transitionTo('leaf')
        .then(function () {
          return router.transitionTo('root')
        })
        .then(function () {
          // once
          expect(parentSpy).to.have.been.calledOnce
          expect(childSpy).to.have.been.calledOnce
          expect(grandChildSpy).to.have.been.calledOnce
          expect(leafSpy).to.have.been.calledOnce
          // order
          expect(grandChildSpy).to.have.been.calledAfter(leafSpy)
          expect(grandChildSpy).to.have.been.calledAfter(leafPromiseSpy)
          expect(childSpy).to.have.been.calledAfter(grandChildSpy)
          expect(childSpy).to.have.been.calledAfter(grandChildPromiseSpy)
          expect(parentSpy).to.have.been.calledAfter(childSpy)
          expect(parentSpy).to.have.been.calledAfter(childPromiseSpy)
          done()
        })
        .catch(done)
    })

    it('should not be called if transition is canceled in a child route', function (done) {
      const parentSpy = sinon.spy(ParentRoute.prototype, 'deactivate')
      const childStub = sinon
        .stub(ChildRoute.prototype, 'deactivate')
        .callsFake(function (transition) {
          transition.cancel()
        })
      const grandChildSpy = sinon.spy(GrandChildRoute.prototype, 'deactivate')
      const leafSpy = sinon.spy(LeafRoute.prototype, 'deactivate')
      router
        .transitionTo('leaf')
        .then(function () {
          return router.transitionTo('root')
        })
        .then(function () {
          done('Transition promise should be rejected')
        })
        .catch(function () {
          expect(parentSpy).to.not.have.been.called
          expect(childStub).to.have.been.calledOnce
          expect(grandChildSpy).to.have.been.calledOnce
          expect(leafSpy).to.have.been.calledOnce
          done()
        })
    })

    it('should cancel the transition if returns false', function (done) {
      let transition
      const parentSpy = sinon.spy(ParentRoute.prototype, 'deactivate')
      const childStub = sinon.stub(ChildRoute.prototype, 'deactivate').callsFake(function (t) {
        transition = t
        return false
      })
      const grandChildSpy = sinon.spy(GrandChildRoute.prototype, 'deactivate')
      const leafSpy = sinon.spy(LeafRoute.prototype, 'deactivate')
      router
        .transitionTo('leaf')
        .then(function () {
          return router.transitionTo('root')
        })
        .then(function () {
          done('Transition promise should be rejected')
        })
        .catch(function () {
          expect(parentSpy).to.not.have.been.called
          expect(childStub).to.have.been.calledOnce
          expect(grandChildSpy).to.have.been.calledOnce
          expect(leafSpy).to.have.been.calledOnce
          expect(transition.isCancelled).to.be.true
          done()
        })
    })

    it('should be called when child route change to a route with some parent', function (done) {
      let parentSpy
      let childSpy
      router
        .transitionTo('child')
        .then(function () {
          parentSpy = sinon.spy(ParentRoute.prototype, 'deactivate')
          childSpy = sinon.spy(ChildRoute.prototype, 'deactivate')
          return router.transitionTo('child2')
        })
        .then(function () {
          expect(parentSpy).to.not.be.called
          expect(childSpy).to.be.calledOnce
          done()
        })
        .catch(done)
    })

    it('should be called when a route param changes', function (done) {
      let parentSpy, childSpy, grandChildSpy
      router
        .transitionTo('dyngrandchild', { id: 1 })
        .then(function () {
          parentSpy = sinon.spy(DynParentRoute.prototype, 'deactivate')
          childSpy = sinon.spy(DynChildRoute.prototype, 'deactivate')
          grandChildSpy = sinon.spy(DynGrandChildRoute.prototype, 'deactivate')
          return router.transitionTo('dyngrandchild', { id: 2 })
        })
        .then(function () {
          expect(parentSpy).to.not.be.called
          expect(childSpy).to.be.calledOnce
          expect(grandChildSpy).to.be.calledOnce
          done()
        })
        .catch(done)
    })
  })
})
