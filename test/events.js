/* eslint-disable no-unused-expressions */
/* global describe,beforeEach,afterEach,it,sinon,expect,assert */

import { defer } from 'underscore'
import { Route, Router } from '../src/index'

let router, routes
let RootRoute, ParentRoute, ChildRoute, GrandChildRoute, LeafRoute
let currentTransition

describe('Events', () => {
  beforeEach(() => {
    router = new Router({ location: 'memory', outlet: null })
    router.use(function (transition) {
      currentTransition = transition
    }, { before: true })
    RootRoute = class extends Route {}
    ParentRoute = class extends Route {}
    ChildRoute = class extends Route {}
    GrandChildRoute = class extends Route {}
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

  describe('before:transition', () => {
    it('should be called with transition as argument', function (done) {
      const spy = sinon.spy()
      router.on('before:transition', function (transition) {
        spy()
        expect(transition).to.be.equal(currentTransition)
      })
      router.transitionTo('root').then(function () {
        expect(spy).to.be.calledOnce
        done()
      }).catch(done)
    })

    it('should be triggered before a transition', function (done) {
      const spy = sinon.spy()
      router.on('before:transition', spy)
      const rootSpy = sinon.spy(RootRoute.prototype, 'initialize')
      router.transitionTo('root').then(function () {
        expect(spy).to.be.calledOnce
        expect(spy).to.be.calledBefore(rootSpy)
        done()
      }).catch(done)
    })

    it('should allow to cancel the transition', function (done) {
      const spy = sinon.spy()
      router.on('before:transition', function (transition) {
        spy()
        transition.cancel()
      })
      const rootSpy = sinon.spy(RootRoute.prototype, 'initialize')
      router.transitionTo('root').then(function () {
        assert.fail('resolve transition should not be called')
        done()
      }).catch(function () {
        expect(spy).to.be.calledOnce
        expect(rootSpy).to.not.be.called
        done()
      })
    })
  })

  describe('transition', () => {
    it('should be called with transition as argument', function (done) {
      const spy = sinon.spy()
      router.on('transition', function (transition) {
        spy()
        expect(transition).to.be.equal(currentTransition)
      })
      router.transitionTo('root').then(function () {
        Promise.resolve().then(function () {
          expect(spy).to.be.calledOnce
          done()
        })
      }).catch(done)
    })

    it('should be triggered after a transition is resolved', function (done) {
      const spy = sinon.spy()
      router.on('transition', function () {
        expect(router.state.activeTransition).to.be.equal(null)
        spy()
      })
      const leafSpy = sinon.spy(LeafRoute.prototype, 'activate')
      router.transitionTo('leaf').then(function () {
        Promise.resolve().then(function () {
          expect(spy).to.be.calledOnce
          expect(spy).to.be.calledAfter(leafSpy)
          done()
        })
      }).catch(done)
    })
  })

  describe('transition:error', () => {
    it('should be called when an error occurs in middle of transaction', function () {
      const spy = sinon.spy()

      router.on('transition:error', spy)

      RootRoute.prototype.activate = function () {
        throw new Error('xx')
      }

      return router.transitionTo('root').catch(function () {
        return Promise.resolve().then(function () {
          expect(spy).to.be.calledOnce
        })
      })
    })

    it('should be called with transition and error as arguments', function (done) {
      router.on('transition:error', function (transition, e) {
        expect(transition).to.be.equal(currentTransition)
        expect(e).to.be.a('error')
        done()
      })

      RootRoute.prototype.activate = function () {
        throw new Error('xx')
      }

      router.transitionTo('root')
    })

    it('should not be called when transaction is redirected', function () {
      const spy = sinon.spy()

      router.on('transition:error', spy)

      RootRoute.prototype.activate = function (transition) {
        transition.redirectTo('parent')
      }

      return router.transitionTo('root').catch(function () {
        return Promise.resolve().then(function () {
          expect(spy).to.not.be.called
        })
      })
    })

    it('should not be called when transaction is cancelled', function () {
      const spy = sinon.spy()

      router.on('transition:error', spy)

      RootRoute.prototype.activate = function (transition) {
        transition.cancel()
      }

      return router.transitionTo('root').catch(function () {
        return Promise.resolve().then(function () {
          expect(spy).to.not.be.called
        })
      })
    })
  })

  describe('transition:abort', () => {
    it('should be called when an error occurs in middle of transaction', function () {
      const spy = sinon.spy()

      router.on('transition:abort', spy)

      RootRoute.prototype.activate = function () {
        throw new Error('xx')
      }

      return router.transitionTo('root').catch(function () {
        return Promise.resolve().then(function () {
          expect(spy).to.be.calledOnce
        })
      })
    })

    it('should be called with transition and error as arguments', function (done) {
      router.on('transition:abort', function (transition, e) {
        expect(transition).to.be.equal(currentTransition)
        expect(e).to.be.a('error')
        done()
      })

      RootRoute.prototype.activate = function () {
        throw new Error('xx')
      }

      router.transitionTo('root')
    })

    it('should not be called when transaction is redirected', function () {
      const spy = sinon.spy()

      router.on('transition:abort', spy)

      RootRoute.prototype.activate = function (transition) {
        transition.redirectTo('parent')
      }

      return router.transitionTo('root').catch(function () {
        return Promise.resolve().then(function () {
          expect(spy).to.not.be.called
        })
      })
    })

    it('should be called when transaction is cancelled', function () {
      const spy = sinon.spy()

      router.on('transition:abort', spy)

      RootRoute.prototype.activate = function (transition) {
        transition.cancel()
      }

      return router.transitionTo('root').catch(function () {
        return Promise.resolve().then(function () {
          expect(spy).to.be.called
        })
      })
    })
  })

  describe('before:activate', () => {
    it('should be called with transition and route as arguments', function () {
      const spy = sinon.spy()
      router.on('before:activate', function (transition, route) {
        spy()
        expect(transition).to.be.equal(currentTransition)
        expect(route).to.be.instanceof(RootRoute)
      })
      return router.transitionTo('root').then(function () {
        expect(spy).to.be.calledOnce
      })
    })

    it('should be triggered before activate of same route', function () {
      const spy = sinon.spy()
      router.on('before:activate', spy)
      const rootSpy = sinon.spy(RootRoute.prototype, 'activate')
      return router.transitionTo('root').then(function () {
        expect(spy).to.be.calledOnce
        expect(spy).to.be.calledBefore(rootSpy)
      })
    })

    it('should be triggered before activate of parent route', function () {
      const spy = sinon.spy()
      router.on('before:activate', function (transition, route) {
        if (route instanceof GrandChildRoute) {
          spy()
        }
      })
      const parentSpy = sinon.spy(ParentRoute.prototype, 'activate')
      return router.transitionTo('grandchild').then(function () {
        expect(spy).to.be.calledOnce
        expect(spy).to.be.calledBefore(parentSpy)
      })
    })

    it('should allow to cancel the transition', function (done) {
      const spy = sinon.spy()
      router.on('before:activate', function (transition) {
        spy()
        transition.cancel()
      })
      const rootSpy = sinon.spy(RootRoute.prototype, 'activate')
      router.transitionTo('root').then(function () {
        assert.fail('resolve transition should not be called')
        done()
      }).catch(function () {
        expect(spy).to.be.calledOnce
        expect(rootSpy).to.not.be.called
        done()
      })
    })
  })

  describe('activate', () => {
    it('should be called with transition and route as arguments', function (done) {
      const spy = sinon.spy()
      router.on('activate', function (transition, route) {
        spy()
        expect(transition).to.be.equal(currentTransition)
        expect(route).to.be.instanceof(RootRoute)
      })
      router.transitionTo('root').then(function () {
        expect(spy).to.be.calledOnce
        done()
      }).catch(done)
    })

    it('should be triggered after activate method is resolved', function (done) {
      const spy = sinon.spy()
      const promiseSpy = sinon.spy()
      router.on('activate', spy)
      const rootSpy = sinon.stub(RootRoute.prototype, 'activate').callsFake(function () {
        return new Promise((resolve) => setTimeout(resolve, 100)).then(promiseSpy)
      })
      router.transitionTo('root').then(function () {
        expect(spy).to.be.calledOnce
        expect(promiseSpy).to.be.calledOnce
        expect(spy).to.be.calledAfter(rootSpy)
        expect(spy).to.be.calledAfter(promiseSpy)
        done()
      }).catch(done)
    })

    it('should not be triggered when transition is cancelled in activate method', function (done) {
      const spy = sinon.spy()
      router.on('activate', spy)
      sinon.stub(RootRoute.prototype, 'activate').callsFake(function (transition) {
        transition.cancel()
      })
      router.transitionTo('root').catch(function () {
        defer(function () {
          expect(spy).to.not.be.called
          done()
        })
      })
    })

    it('should allow to cancel the transition', function (done) {
      const spy = sinon.spy()
      router.on('activate', function (transition, route) {
        spy()
        if (route instanceof GrandChildRoute) {
          transition.cancel()
        }
      })
      const leafSpy = sinon.spy(LeafRoute.prototype, 'activate')
      router.transitionTo('leaf').then(function () {
        assert.fail('resolve transition should not be called')
        done()
      }).catch(function () {
        expect(spy).to.be.calledThrice
        expect(leafSpy).to.not.be.called
        done()
      })
    })
  })

  describe('before:deactivate', () => {
    it('should be called with transition and route as arguments', function (done) {
      const spy = sinon.spy()
      router.on('before:deactivate', function (transition, route) {
        spy()
        expect(transition).to.be.equal(currentTransition)
        expect(route).to.be.instanceof(RootRoute)
      })
      router.transitionTo('root').then(function () {
        return router.transitionTo('parent')
      }).then(function () {
        expect(spy).to.be.calledOnce
        done()
      }).catch(done)
    })

    it('should be triggered before deactivate of same route', function (done) {
      const spy = sinon.spy()
      router.on('before:deactivate', spy)
      const rootSpy = sinon.spy(RootRoute.prototype, 'deactivate')
      router.transitionTo('root').then(function () {
        return router.transitionTo('parent')
      }).then(function () {
        expect(spy).to.be.calledOnce
        expect(spy).to.be.calledBefore(rootSpy)
        done()
      }).catch(done)
    })

    it('should be triggered before deactivate of child route', function () {
      const spy = sinon.spy()
      router.on('before:deactivate', function (transition, route) {
        if (route instanceof ParentRoute) {
          spy()
        }
      })
      const childSpy = sinon.spy(GrandChildRoute.prototype, 'deactivate')
      return router.transitionTo('grandchild').then(function () {
        return router.transitionTo('root')
      }).then(function () {
        expect(spy).to.be.calledOnce
        expect(spy).to.be.calledBefore(childSpy)
      })
    })

    it('should allow to cancel the transition', function (done) {
      const spy = sinon.spy()
      router.on('before:deactivate', function (transition) {
        spy()
        transition.cancel()
      })
      const rootSpy = sinon.spy(RootRoute.prototype, 'deactivate')
      router.transitionTo('root').then(function () {
        return router.transitionTo('parent')
      }).then(function () {
        assert.fail('resolve transition should not be called')
        done()
      }).catch(function () {
        expect(spy).to.be.calledOnce
        expect(rootSpy).to.not.be.called
        done()
      })
    })
  })

  describe('deactivate', () => {
    it('should be called with transition and route as arguments', function (done) {
      const spy = sinon.spy()
      router.on('deactivate', function (transition, route) {
        spy()
        expect(transition).to.be.equal(currentTransition)
        expect(route).to.be.instanceof(RootRoute)
      })
      router.transitionTo('root').then(function () {
        return router.transitionTo('parent')
      }).then(function () {
        expect(spy).to.be.calledOnce
        done()
      }).catch(done)
    })

    it('should be triggered after deactivate method is resolved', function (done) {
      const spy = sinon.spy()
      const promiseSpy = sinon.spy()
      router.on('deactivate', spy)
      const rootSpy = sinon.stub(RootRoute.prototype, 'deactivate').callsFake(function () {
        return new Promise((resolve) => setTimeout(resolve, 100)).then(promiseSpy)
      })
      router.transitionTo('root').then(function () {
        return router.transitionTo('parent')
      }).then(function () {
        expect(spy).to.be.calledOnce
        expect(spy).to.be.calledAfter(rootSpy)
        expect(spy).to.be.calledAfter(promiseSpy)
        done()
      }).catch(done)
    })

    it('should allow to cancel the transition', function (done) {
      const spy = sinon.spy()
      router.on('deactivate', function (transition, route) {
        spy()
        transition.cancel()
      })
      const parentSpy = sinon.spy(ParentRoute.prototype, 'activate')
      router.transitionTo('root').then(function () {
        return router.transitionTo('parent')
      }).then(function () {
        assert.fail('resolve transition should not be called')
        done()
      }).catch(function () {
        expect(spy).to.be.calledOnce
        expect(parentSpy).to.not.be.called
        done()
      })
    })
  })
})
