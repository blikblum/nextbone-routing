/* eslint-disable no-unused-expressions */
/* global describe,beforeEach,afterEach,it,sinon,expect */

import { Route, Router, elEvent, elProperty } from '../src/index'
import { view } from 'nextbone'
import _ from 'underscore'
import $ from 'jquery'
import { defineCE } from '@open-wc/testing-helpers'

let router, routes
let RootRoute, ParentRoute, ChildRoute, LeafRoute

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

describe('Render', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="main"></div>'
    router = new Router({ location: 'memory', outlet: document.getElementById('main') })
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
      })
      route('root', { class: RootRoute })
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
      router.transitionTo('parent').then(function () {
        expect($('#main').html()).to.be.equal(`<${parentTag}><div class="child-el"></div></${parentTag}>`)
        done()
      }).catch(done)
    })

    it('can be defined in the Route class as a function', function (done) {
      const componentSpy = sinon.stub(RootRoute.prototype, 'component').callThrough()
      router.transitionTo('root').then(function () {
        expect($('#main').html()).to.be.equal(`<${parentTag}><div class="child-el"></div></${parentTag}>`)
        expect(componentSpy).to.be.calledOnce
        expect(componentSpy).to.be.calledOn(router.state.instances[0])
        done()
      }).catch(done)
    })

    it('can be passed through classOptions.component', function (done) {
      router.transitionTo('root').then(function () {
        expect($('#main').html()).to.be.equal(`<${parentTag}><div class="child-el"></div></${parentTag}>`)
        done()
      }).catch(done)
    })

    it('can be passed through component, without a class', function (done) {
      router.transitionTo('root2').then(function () {
        expect($('#main').html()).to.be.equal(`<${parentTag}><div class="child-el"></div></${parentTag}>`)
        done()
      }).catch(done)
    })

    describe('of a root route', function () {
      it('should be rendered in rootOutlet', function (done) {
        router.transitionTo('parent').then(function () {
          expect($('#main').html()).to.be.equal(`<${parentTag}><div class="child-el"></div></${parentTag}>`)
          done()
        }).catch(done)
      })

      it('should abort transition when no rootOutlet is defined', function (done) {
        router.options.outlet = undefined
        router.transitionTo('parent').then(function () {
          done('transition resolved')
        }).catch(function (error) {
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
        router.transitionTo('grandchild').then(function () {
          expect($('#main').html()).to.be.equal(`<${parentTag}><div class="child-el"><${grandChildTag}>Grandchild</${grandChildTag}></div></${parentTag}>`)
          done()
        }).catch(done)
      })

      it('when re-activated should be rendered in the outlet region of the updated parent el', function (done) {
        router.transitionTo('grandchild').then(function () {
          return router.transitionTo('root')
        }).then(function () {
          return router.transitionTo('grandchild')
        }).then(function () {
          expect($('#main').html()).to.be.equal(`<${parentTag}><div class="child-el"><${grandChildTag}>Grandchild</${grandChildTag}></div></${parentTag}>`)
          done()
        }).catch(done)
      })

      it('should abort transition if no outlet region is defined in the nearest route with a el', function (done) {
        router.transitionTo('leaf').then(function () {
          done('transition resolved')
        }).catch(function (error) {
          expect(error).to.be.an('error')
          expect(error.message).to.be.equal('No outlet region defined in grandchild route')
          done()
        })
      })

      it('should look for outlet region in the parent routes when route with a el has option outlet = false', function () {
        return router.transitionTo('root2').then(function () {
          // force root2 render el before going to leaf2
          return router.transitionTo('leaf2')
        }).then(function () {
          expect($('#main').html()).to.be.equal(`<${leafTag}>Leaf</${leafTag}>`)
        })
      })
    })

    describe('of a target route', function () {
      it('should be rendered even if already activated', function () {
        const spy = sinon.spy(ParentRoute.prototype, 'renderEl')
        return router.transitionTo('grandchild').then(function () {
          return router.transitionTo('parent')
        }).then(function () {
          expect(spy).to.be.calledTwice
          expect($('#main').html()).to.be.equal(`<${parentTag}><div class="child-el"></div></${parentTag}>`)
        })
      })
    })
  })

  describe('renderEl', function () {
    it('should be called with region and transition objects', function () {
      const spy = sinon.spy(ParentRoute.prototype, 'renderEl')
      const transition = router.transitionTo('parent')
      return transition.then(function () {
        expect(spy).to.be.calledOnceWithExactly(router.rootOutlet, transition)
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
        _.defer(function () {
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
      return router.transitionTo('root').then(function () {
        expect(spy).not.to.be.called
        // force a new render
        transition = router.transitionTo('root', {}, { id: 1 })
        return transition
      }).then(function () {
        expect(spy).to.be.calledOnceWithExactly(transition)
      })
    })

    it('should be called when the route is re activated', function () {
      const spy = sinon.spy(RootRoute.prototype, 'updateEl')
      let transition
      return router.transitionTo('rootWithParam', { id: 0 }).then(function () {
        expect(spy).not.to.be.called
        // force a new render
        transition = router.transitionTo('rootWithParam', { id: 1 })
        return transition
      }).then(function () {
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

      return router.transitionTo('parent').then(function () {
        savedEl = routeInstance.el
        // force a new render
        return router.transitionTo('parent', {}, { id: 1 })
      }).then(function () {
        expect(savedEl).to.be.equal(routeInstance.el)
      })
    })
  })

  describe('prepareEl', function () {
    it('should be called with a HTML and transition', function () {
      const spy = sinon.spy(ParentRoute.prototype, 'prepareEl')
      const transition = router.transitionTo('parent')
      return transition.then(function () {
        expect(spy).to.be.calledOnceWithExactly(sinon.match.instanceOf(HTMLElement), transition)
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

      return router.transitionTo('parent').then(function () {
        return router.transitionTo('root')
      }).then(function () {
        expect(routeInstance.el).to.not.exist
      })
    })

    it('should be set to undefined when a child of a route with option outlet = false is rendered', function () {
      let routeInstance
      return router.transitionTo('root2').then(function () {
        routeInstance = router.state.instances[0]
        expect(routeInstance.el).to.exist
        // force root2 render el before going to leaf2
        return router.transitionTo('leaf2')
      }).then(function () {
        expect(routeInstance.el).to.not.exist
      })
    })

    it('should not be set to undefined after rendering the same route', function () {
      let routeInstance
      sinon.stub(ParentRoute.prototype, 'initialize').callsFake(function () {
        routeInstance = this
      })

      return router.transitionTo('parent').then(function () {
        return router.transitionTo('parent', {}, { page: 1 })
      }).then(function () {
        expect(routeInstance.el).to.exist
      })
    })

    it('should have a $router property pointing to router', function (done) {
      let routeInstance
      sinon.stub(ParentRoute.prototype, 'initialize').callsFake(function () {
        routeInstance = this
      })
      router.transitionTo('parent').then(function () {
        expect(routeInstance.el.$router).to.be.equal(router)
        done()
      }).catch(done)
    })

    it('should have a $route property pointing to router state', function (done) {
      let routeInstance
      sinon.stub(ParentRoute.prototype, 'initialize').callsFake(function () {
        routeInstance = this
      })
      router.transitionTo('parent').then(function () {
        expect(routeInstance.el.$route).to.be.equal(router.state)
        return router.transitionTo('child')
      }).then(() => {
        expect(routeInstance.el.$route).to.be.equal(router.state)
        done()
      }).catch(done)
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

      const rootRoute = router.routes.find(route => route.name === 'root')
      rootRoute.options.class = RootRoute
    })

    it('will listen to view events and call registered handlers', function (done) {
      router.transitionTo('root').then(function () {
        const routeInstance = router.state.instances[0]
        routeInstance.el.trigger('my:event', 1, 'a')
        routeInstance.el.dispatchEvent(new CustomEvent('my:native:event'))
        expect(mySpy).to.be.calledOn(routeInstance)
        expect(mySpy).to.be.calledOnceWithExactly(1, 'a')
        expect(otherSpy).to.not.be.called

        expect(myNativeSpy).to.be.calledOn(routeInstance)
        expect(myNativeSpy).to.be.calledOnceWith(sinon.match({ type: 'my:native:event' }))
        expect(otherNativeSpy).to.not.be.called
        done()
      }).catch(done)
    })

    it('will stop listening to view events when deactivated', function (done) {
      let rootEl
      router.transitionTo('root').then(function () {
        const routeInstance = router.state.instances[0]
        rootEl = routeInstance.el
        return router.transitionTo('parent')
      }).then(function () {
        rootEl.trigger('my:event')
        rootEl.dispatchEvent(new CustomEvent('my:native:event'))
        expect(mySpy).to.not.be.called
        expect(otherSpy).to.not.be.called
        expect(myNativeSpy).to.not.be.called
        expect(otherNativeSpy).to.not.be.called
        done()
      }).catch(done)
    })

    it('will throw if element is not decorated with nextbone#view', function (done) {
      RootRoute.prototype.component = function () {
        class Vanilla extends HTMLElement {}
        defineCE(Vanilla)
        return Vanilla
      }
      router.transitionTo('root').then(function () {
        done('should throw')
      }).catch(function (err) {
        expect(err).to.be.instanceOf(Error)
        expect(err.message).to.be.equal('elEvent: component "Vanilla" is not a view')
        done()
      })
    })

    it('will throw if element is not registered', function (done) {
      RootRoute.prototype.component = function () {
        class NonRegistered extends view(HTMLElement) {}
        return NonRegistered
      }
      router.transitionTo('root').then(function () {
        done('should throw')
      }).catch(function (err) {
        expect(err).to.be.instanceOf(Error)
        expect(err.message).to.be.equal('Unable to create instance of "NonRegistered" for "root" route\nTypeError: Illegal constructor')
        done()
      })
    })
  })

  describe('elProperty', function () {
    beforeEach(() => {
      RootRoute = class extends Route {
        component () {
          return ParentView
        }

        activate () {
          this.prop1 = 'xx'
          this.prop2 = 'yy'
        }

        @elProperty
        prop1

        @elProperty('xProp')
        prop2
      }

      const rootRoute = router.routes.find(route => route.name === 'root')
      rootRoute.options.class = RootRoute
    })

    it('will set defined properties to el when rendered', function (done) {
      router.transitionTo('root').then(function () {
        const routeInstance = router.state.instances[0]
        routeInstance.el.trigger('my:event', 1, 'a')
        routeInstance.el.dispatchEvent(new CustomEvent('my:native:event'))
        expect(routeInstance.el.prop1).to.be.equal('xx')
        expect(routeInstance.el.prop2).to.be.undefined
        expect(routeInstance.el.xProp).to.be.equal('yy')
        done()
      }).catch(done)
    })
  })
})
