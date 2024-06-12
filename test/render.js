/* eslint-disable no-unused-expressions */
/* global describe,beforeEach,afterEach,it */

import 'jquery'
import { Route, Router, elEvent, property } from '../src/index'
import { view, on } from 'nextbone'
import { pick, defer } from 'lodash-es'
import { defineCE } from '@open-wc/testing-helpers'
import sinon from 'sinon'
import { expect, use } from 'chai'
import sinonChai from 'sinon-chai-es'

use(sinonChai)

let router, routes
let RootRoute, ParentRoute, ChildRoute, LeafRoute

const { $ } = window

@view
class ParentView extends HTMLElement {
  static get outlet () {
    return '.child-el'
  }

  connectedCallback () {
    this.innerHTML = '<div class="child-el"></div>'
  }
}

const parentTag = defineCE(ParentView)

class GrandChildView extends HTMLElement {
  connectedCallback () {
    this.innerHTML = 'Grandchild'
  }
}

const grandChildTag = defineCE(GrandChildView)

class LeafView extends HTMLElement {
  connectedCallback () {
    this.innerHTML = 'Leaf'
  }
}

const leafTag = defineCE(LeafView)

function normalizeState (state) {
  return pick(state, ['path', 'pathname', 'routes', 'params', 'query'])
}

describe('Render', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="main"></div>'
    router = new Router({
      location: 'memory',
      outlet: document.getElementById('main')
    })
    ParentRoute = class extends Route {
      static get component () {
        return ParentView
      }
    }
    RootRoute = class extends Route {
      component () {
        return ParentView
      }
    }
    ChildRoute = class extends Route {}
    LeafRoute = class extends Route {}
    routes = function (route) {
      route('parent', { class: ParentRoute }, function () {
        route('child', { class: ChildRoute }, function () {
          route('grandchild', { component: GrandChildView }, function () {
            route('leaf', { class: LeafRoute, component: LeafView })
          })
        })
        route('sibling', { component: LeafView })
      })
      route('root', { class: RootRoute }, function () {
        route('root.child')
      })
      route('root2', { component: ParentView, outlet: false }, function () {
        route('leaf2', { class: LeafRoute, component: leafTag })
      })
      route('root3', { class: RootRoute, properties: { a: 'b', c: 1 } })
      route('rootWithParam', { path: 'root/:id', class: RootRoute })
    }
    router.map(routes)
    router.listen()
  })

  afterEach(() => {
    router.destroy()
  })

  describe('component', function () {
    it('can be defined in the Route class as a static property', function (done) {
      router
        .transitionTo('parent')
        .then(function () {
          expect($('#main').html()).to.be.equal(
            `<${parentTag}><div class="child-el"></div></${parentTag}>`
          )
          done()
        })
        .catch(done)
    })

    it('can be defined in the Route class as a function', function (done) {
      const componentSpy = sinon
        .stub(RootRoute.prototype, 'component')
        .callThrough()
      router
        .transitionTo('root')
        .then(function () {
          expect($('#main').html()).to.be.equal(
            `<${parentTag}><div class="child-el"></div></${parentTag}>`
          )
          expect(componentSpy).to.be.calledOnce
          expect(componentSpy).to.be.calledOn(router.state.instances[0])
          done()
        })
        .catch(done)
    })

    it('can be passed through component, without a class', function (done) {
      router
        .transitionTo('root2')
        .then(function () {
          expect($('#main').html()).to.be.equal(
            `<${parentTag}><div class="child-el"></div></${parentTag}>`
          )
          done()
        })
        .catch(done)
    })

    describe('of a root route', function () {
      it('should be rendered in rootOutlet', function (done) {
        router
          .transitionTo('parent')
          .then(function () {
            expect($('#main').html()).to.be.equal(
              `<${parentTag}><div class="child-el"></div></${parentTag}>`
            )
            done()
          })
          .catch(done)
      })

      it('should abort transition when no rootOutlet is defined', function (done) {
        router.options.outlet = undefined
        router
          .transitionTo('parent')
          .then(function () {
            done('transition resolved')
          })
          .catch(function (error) {
            expect(error).to.be.an('error')
            expect(error.message).to.be.equal('No root outlet region defined')
            done()
          })
      })

      it('should not abort transition when no rootOutlet is defined and el is prerendered', function () {
        router.options.outlet = undefined
        RootRoute.prototype.component = document.querySelector('#main')
        return router.transitionTo('root3').then(function () {
          expect(router.isActive('root3'))
        })
      })
    })

    describe('of a child route', function () {
      it('should be rendered in the outlet region of the nearest route with an el', function (done) {
        router
          .transitionTo('grandchild')
          .then(function () {
            expect($('#main').html()).to.be.equal(
              `<${parentTag}><div class="child-el"><${grandChildTag}>Grandchild</${grandChildTag}></div></${parentTag}>`
            )
            done()
          })
          .catch(done)
      })

      it('when re-activated should be rendered in the outlet region of the updated parent el', function (done) {
        router
          .transitionTo('grandchild')
          .then(function () {
            return router.transitionTo('root')
          })
          .then(function () {
            return router.transitionTo('grandchild')
          })
          .then(function () {
            expect($('#main').html()).to.be.equal(
              `<${parentTag}><div class="child-el"><${grandChildTag}>Grandchild</${grandChildTag}></div></${parentTag}>`
            )
            done()
          })
          .catch(done)
      })

      it('should abort transition if no outlet region is defined in the nearest route with a el', function (done) {
        router
          .transitionTo('leaf')
          .then(function () {
            done('transition resolved')
          })
          .catch(function (error) {
            expect(error).to.be.an('error')
            expect(error.message).to.be.equal(
              'No outlet region defined in grandchild route'
            )
            done()
          })
      })

      it('should look for outlet region in the parent routes when route with a el has option outlet = false', function () {
        return router
          .transitionTo('root2')
          .then(function () {
            // force root2 render el before going to leaf2
            return router.transitionTo('leaf2')
          })
          .then(function () {
            expect($('#main').html()).to.be.equal(
              `<${leafTag}>Leaf</${leafTag}>`
            )
          })
      })
    })

    describe('of a target route', function () {
      it('should be rendered even if already activated', function () {
        const spy = sinon.spy(ParentRoute.prototype, 'renderEl')
        return router
          .transitionTo('grandchild')
          .then(function () {
            return router.transitionTo('parent')
          })
          .then(function () {
            expect(spy).to.be.calledTwice
            expect($('#main').html()).to.be.equal(
              `<${parentTag}><div class="child-el"></div></${parentTag}>`
            )
          })
      })
    })
  })

  describe('renderEl', function () {
    it('should be called with region and transition objects', function () {
      const spy = sinon.spy(ParentRoute.prototype, 'renderEl')
      const transition = router.transitionTo('parent')
      return transition.then(function () {
        expect(spy).to.be.calledOnceWithExactly(
          router.rootOutlet,
          transition,
          sinon.match(normalizeState(transition))
        )
      })
    })

    it('should be called after activate is resolved', function () {
      const spy = sinon.spy(ParentRoute.prototype, 'renderEl')
      const activateSpy = sinon.spy()
      ParentRoute.prototype.activate = function () {
        return new Promise(function (resolve) {
          setTimeout(resolve, 100)
        })
      }
      router.on('activate', activateSpy)

      return router.transitionTo('parent').then(function () {
        expect(spy).to.be.calledAfter(activateSpy)
      })
    })

    it('should be not be called when transition is cancelled', function (done) {
      const spy = sinon.spy(ParentRoute.prototype, 'renderEl')
      ParentRoute.prototype.activate = function (transition) {
        transition.cancel()
      }

      router.transitionTo('parent').catch(function () {
        defer(function () {
          expect(spy).to.not.be.called
          done()
        })
      })
    })
  })

  describe('updateEl', function () {
    it('should be called when the route is re rendered', function () {
      const spy = sinon.spy(RootRoute.prototype, 'updateEl')
      let transition
      return router
        .transitionTo('root')
        .then(function () {
          expect(spy).not.to.be.called
          // force a new render
          transition = router.transitionTo('root', {}, { id: 1 })
          return transition
        })
        .then(function () {
          expect(spy).to.be.calledOnceWithExactly(transition)
        })
    })

    it('should be called when the route is re activated', function () {
      const spy = sinon.spy(RootRoute.prototype, 'updateEl')
      let transition
      return router
        .transitionTo('rootWithParam', { id: 0 })
        .then(function () {
          expect(spy).not.to.be.called
          // force a new render
          transition = router.transitionTo('rootWithParam', { id: 1 })
          return transition
        })
        .then(function () {
          expect(spy).to.be.calledOnceWithExactly(transition)
        })
    })

    it('should prevent el re render if returns truthy', function () {
      let routeInstance, savedEl
      sinon.stub(ParentRoute.prototype, 'initialize').callsFake(function () {
        routeInstance = this
      })

      ParentRoute.prototype.updateEl = function () {
        return true
      }

      return router
        .transitionTo('parent')
        .then(function () {
          savedEl = routeInstance.el
          // force a new render
          return router.transitionTo('parent', {}, { id: 1 })
        })
        .then(function () {
          expect(savedEl).to.be.equal(routeInstance.el)
        })
    })
  })

  describe('prepareEl', function () {
    it('should be called with a HTML and transition', function () {
      const spy = (ParentRoute.prototype.prepareEl = sinon.spy())
      const transition = router.transitionTo('parent')
      return transition.then(function () {
        expect(spy).to.be.calledOnceWithExactly(
          sinon.match.instanceOf(HTMLElement),
          transition
        )
      })
    })

    it('should assign properties defined in route options to el', function () {
      return router.transitionTo('root3').then(function () {
        expect(router.state.instances[0].el).to.have.property('a', 'b')
        expect(router.state.instances[0].el).to.have.property('c', 1)
      })
    })
  })

  describe('el', function () {
    it('should be set to undefined after its route is deactivated', function () {
      let routeInstance
      sinon.stub(ParentRoute.prototype, 'initialize').callsFake(function () {
        routeInstance = this
      })

      return router
        .transitionTo('parent')
        .then(function () {
          return router.transitionTo('root')
        })
        .then(function () {
          expect(routeInstance.el).to.not.exist
        })
    })

    it('should be set to undefined when a child of a route with option outlet = false is rendered', function () {
      let routeInstance
      return router
        .transitionTo('root2')
        .then(function () {
          routeInstance = router.state.instances[0]
          expect(routeInstance.el).to.exist
          // force root2 render el before going to leaf2
          return router.transitionTo('leaf2')
        })
        .then(function () {
          expect(routeInstance.el).to.not.exist
        })
    })

    it('should not be set to undefined after rendering the same route', function () {
      let routeInstance
      sinon.stub(ParentRoute.prototype, 'initialize').callsFake(function () {
        routeInstance = this
      })

      return router
        .transitionTo('parent')
        .then(function () {
          return router.transitionTo('parent', {}, { page: 1 })
        })
        .then(function () {
          expect(routeInstance.el).to.exist
        })
    })

    it('should have a $router property pointing to router', function (done) {
      let routeInstance
      sinon.stub(ParentRoute.prototype, 'initialize').callsFake(function () {
        routeInstance = this
      })
      router
        .transitionTo('parent')
        .then(function () {
          expect(routeInstance.el.$router).to.be.equal(router)
          done()
        })
        .catch(done)
    })

    it('should have a $route property pointing to router state', function (done) {
      let routeInstance
      sinon.stub(ParentRoute.prototype, 'initialize').callsFake(function () {
        routeInstance = this
      })
      router
        .transitionTo('parent')
        .then(function () {
          expect(routeInstance.el.$route).to.be.deep.equal(
            normalizeState(router.state)
          )
          return router.transitionTo('child')
        })
        .then(() => {
          expect(routeInstance.el.$route).to.be.deep.equal(
            normalizeState(router.state)
          )
          done()
        })
        .catch(done)
    })

    it('should have $route property at the time is connected', async function () {
      let $route
      class MyElement extends HTMLElement {
        connectedCallback () {
          $route = this.$route
        }
      }
      defineCE(MyElement)
      ParentRoute.prototype.component = MyElement
      await router.transitionTo('parent')
      expect($route).to.be.deep.equal(normalizeState(router.state))
    })

    it('should update $route on not rendered but active elements', async () => {
      let routeInstance
      sinon.stub(ParentRoute.prototype, 'initialize').callsFake(function () {
        routeInstance = this
      })
      await router.transitionTo('child')
      const parentEl = routeInstance.el
      const oldState = parentEl.$route
      await router.transitionTo('sibling')
      expect(parentEl.$route).to.deep.equal(normalizeState(router.state))
      expect(parentEl.$route).to.not.deep.equal(normalizeState(oldState))
    })
  })

  describe('elEvent', function () {
    let mySpy, otherSpy, myNativeSpy, otherNativeSpy
    beforeEach(() => {
      mySpy = sinon.spy()
      otherSpy = sinon.spy()
      myNativeSpy = sinon.spy()
      otherNativeSpy = sinon.spy()

      RootRoute = class extends Route {
        component () {
          return ParentView
        }

        @elEvent('my:event', { dom: false })
        myEventHandler (...args) {
          mySpy.apply(this, args)
        }

        @elEvent('other:event', { dom: false })
        otherEventHandler (...args) {
          otherSpy.apply(this, args)
        }

        @elEvent('my:native:event')
        myNativeEventHandler (...args) {
          myNativeSpy.apply(this, args)
        }

        @elEvent('other:native:event')
        otherNativeEventHandler (...args) {
          otherNativeSpy.apply(this, args)
        }
      }

      const rootRoute = router.routes.find((route) => route.name === 'root')
      rootRoute.options.class = RootRoute
    })

    it('will listen to view events and call registered handlers', function (done) {
      router
        .transitionTo('root')
        .then(function () {
          const routeInstance = router.state.instances[0]
          routeInstance.el.trigger('my:event', 1, 'a')
          routeInstance.el.dispatchEvent(new CustomEvent('my:native:event'))
          expect(mySpy).to.be.calledOn(routeInstance)
          expect(mySpy).to.be.calledOnceWithExactly(1, 'a')
          expect(otherSpy).to.not.be.called

          expect(myNativeSpy).to.be.calledOn(routeInstance)
          expect(myNativeSpy).to.be.calledOnceWith(
            sinon.match({ type: 'my:native:event' })
          )
          expect(otherNativeSpy).to.not.be.called
          done()
        })
        .catch(done)
    })

    it('will stop listening to view events when deactivated', function (done) {
      let rootEl
      router
        .transitionTo('root')
        .then(function () {
          const routeInstance = router.state.instances[0]
          rootEl = routeInstance.el
          return router.transitionTo('parent')
        })
        .then(function () {
          rootEl.trigger('my:event')
          rootEl.dispatchEvent(new CustomEvent('my:native:event'))
          expect(mySpy).to.not.be.called
          expect(otherSpy).to.not.be.called
          expect(myNativeSpy).to.not.be.called
          expect(otherNativeSpy).to.not.be.called
          done()
        })
        .catch(done)
    })

    it('will throw if element is not decorated with nextbone#view', function (done) {
      RootRoute.prototype.component = function () {
        class Vanilla extends HTMLElement {}
        defineCE(Vanilla)
        return Vanilla
      }
      router
        .transitionTo('root')
        .then(function () {
          done('should throw')
        })
        .catch(function (err) {
          expect(err).to.be.instanceOf(Error)
          expect(err.message).to.be.equal(
            'elEvent: component "Vanilla" is not a view'
          )
          done()
        })
    })

    it('will throw if element is not registered', function (done) {
      RootRoute.prototype.component = function () {
        class NonRegistered extends view(HTMLElement) {}
        return NonRegistered
      }
      router
        .transitionTo('root')
        .then(function () {
          done('should throw')
        })
        .catch(function (err) {
          expect(err).to.be.instanceOf(Error)
          expect(err.message).to.be.equal(
            'Unable to create instance of "NonRegistered" for "root" route\nTypeError: Illegal constructor'
          )
          done()
        })
    })
  })

  describe('property', function () {
    const prop1Change = sinon.spy()
    const prop5Change = sinon.spy()
    beforeEach(() => {
      RootRoute = class extends Route {
        component () {
          return ParentView
        }

        activate () {
          this.on('change:prop1', prop1Change)
          this.prop1 = 'xx'
          this.prop2 = 'yy'
        }

        @property
        prop1;

        @property({ to: 'xProp' })
        prop2;

        @property({ from: 'params.id', format: 'number' })
        prop3;

        @property({
          from: 'pathname',
          to: 'path',
          format: (value) => `[${value}]`
        })
        prop4;

        @property
        prop5 = 'zzz';

        @on('change:prop5')
        prop5ChangeEvent () {
          prop5Change()
        }
      }

      let rootRoute = router.routes.find((route) => route.name === 'root')
      rootRoute.options.class = RootRoute
      rootRoute = router.routes.find((route) => route.name === 'rootWithParam')
      rootRoute.options.class = RootRoute
    })

    it('should trigger an "change" event when value is changed', async function () {
      await router.transitionTo('root')
      const routeInstance = router.state.instances[0]
      expect(prop1Change).to.be.calledOnce.and.calledOnceWithExactly(
        'xx',
        undefined
      )
      routeInstance.prop1 = 'xx'
      expect(prop1Change).to.be.calledOnce
      prop1Change.resetHistory()
      routeInstance.prop1 = 'yy'
      expect(prop1Change).to.be.calledOnce.and.calledOnceWithExactly(
        'yy',
        'xx'
      )
    })

    it('should not trigger an "change" event when field is initialized', async function () {
      await router.transitionTo('root')
      const routeInstance = router.state.instances[0]
      expect(routeInstance.prop5).to.be.equal('zzz')
      expect(prop5Change).to.not.be.called
    })

    it('should set el property when "to" option is defined', async function () {
      await router.transitionTo('root')
      const routeInstance = router.state.instances[0]
      expect(routeInstance.el.prop1).to.be.undefined
      expect(routeInstance.el.prop2).to.be.undefined
      expect(routeInstance.el.xProp).to.be.equal('yy')
      routeInstance.prop2 = 'a'
      expect(routeInstance.el.xProp).to.be.equal('a')
    })

    it('should read value from transition when "from" option is defined', async function () {
      await router.transitionTo('rootWithParam', { id: 4 })
      const routeInstance = router.state.instances[0]
      expect(routeInstance.prop3).to.be.equal(4)
      await router.transitionTo('rootWithParam', { id: 8 })
      expect(routeInstance.prop3).to.be.equal(8)
    })

    it('should read value from transition and set el property when "from" and "to" options are defined', async function () {
      await router.transitionTo('root')
      let routeInstance = router.state.instances[0]
      expect(routeInstance.prop4).to.be.equal('[/root]')
      expect(routeInstance.el.path).to.be.equal('[/root]')
      await router.transitionTo('rootWithParam', { id: 6 })
      routeInstance = router.state.instances[0]
      expect(routeInstance.prop4).to.be.equal('[/root/6]')
      expect(routeInstance.el.path).to.be.equal('[/root/6]')
    })

    it('should update value in a transition when is active even if not being activated', async function () {
      await router.transitionTo('root')
      const routeInstance = router.state.instances[0]
      expect(routeInstance.prop4).to.be.equal('[/root]')
      expect(routeInstance.el.path).to.be.equal('[/root]')
      await router.transitionTo('root.child')
      expect(routeInstance.prop4).to.be.equal('[/root/child]')
      expect(routeInstance.el.path).to.be.equal('[/root/child]')
    })
  })
})
