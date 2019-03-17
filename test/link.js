/* eslint-disable no-unused-expressions */
/* global describe,beforeEach,afterEach,it */

import chai from 'chai'
import sinon from 'sinon'
import sinonChai from 'sinon-chai'
import { Route, Router, routerLinks } from '../src/index'
import { view } from 'nextbone'
import { defineCE } from '@open-wc/testing-helpers'
import { LitElement, html } from 'lit-element'
import $ from 'jquery'

let expect = chai.expect
chai.use(sinonChai)

let router, routes
let RootRoute, ParentRoute, ChildRoute

const parentRouterLinksOptions = {
  defaults: {
    child: {
      query: {
        foo: 'bar'
      }
    },
    root: {
      params: function () {
        return { id: this.rootId }
      },
      query: function (el) {
        if (el.id === 'a-rootlink3') return { tag: el.tagName }
      }
    }
  }
}

@routerLinks(parentRouterLinksOptions)
class ParentView extends LitElement {
  static outlet = '.child-view'

  rootId = 5

  createRenderRoot () {
    return this
  }

  render () {
    return html`
      <div routerlinks>
        <div id="div-rootlink1" route="root" param-id="1"></div>
        <div id="div-grandchildlink" route="grandchild" query-name="test"></div>
        <div id="div-parentlink" route="parent"><div id="innerparent"></div></div>
        <a id="a-parentlink" route="parent"></a>
        <a id="a-parentlink-customclass" active-class="my-active-class" route="parent"></a>
        <a id="a-parentlink-noclass" active-class="" route="parent"></a>
        <a id="a-grandchildlink" route="grandchild" query-name="test"></a>
        <a id="a-rootlink2" route="root" param-id="2"></a>
        <a id="a-rootlink3" route="root"></a>
        <a id="a-childlink" route="child" query-name="test"></a>
        <div id="div-a-parent" route="parent"><a id="childanchor"></a><a id="childanchor2"></a><div><a id="childanchor3"></a></div></div>
        <div class="child-view"></div>
      </div>
      <a id="a-parentlink-outside" route="parent"></a>
      <div id="div-parentlink-outside" route="parent"><div id="innerparent-outside"></div></div>
     `
  }
}
const parentTag = defineCE(ParentView)

@view
@routerLinks({
  defaults () {
    return {
      grandchild: {
        query: {
          other: 'xx'
        }
      }
    }
  }
})
class GrandChildView extends LitElement {
  createRenderRoot () {
    return this
  }
  render () {
    return html`
    <div routerlinks>
      <a id="a-grandchildlink2" route="grandchild" query-name="test"></a>
    </div>    
    `
  }
}
const grandChildTag = defineCE(GrandChildView)

describe('routerLinks', () => {
  beforeEach(() => {
    document.body.innerHTML = `<div id="main"></div>`

    router = new Router({}, '#main')
    ParentRoute = class extends Route {
      component () { return ParentView }
    }
    RootRoute = class extends Route {}
    ChildRoute = class extends Route {}
    routes = function (route) {
      route('parent', { class: ParentRoute }, function () {
        route('child', { class: ChildRoute }, function () {
          route('grandchild', { component: GrandChildView })
        })
      })
      route('root', { path: 'root/:id', class: RootRoute, classOptions: { component: ParentView } })
    }
    router.map(routes)
    router.listen()
  })

  afterEach(() => {
    document.body.innerHTML = ''
    router.destroy()
  })

  it('should generate href attributes in anchor tags with route attribute', async function () {
    return router.transitionTo('parent').then(async function () {
      const parentEl = document.querySelector(parentTag)
      await parentEl.updateComplete

      expect($('#a-parentlink').attr('href')).to.be.equal('#parent')
      expect($('#a-rootlink2').attr('href')).to.be.equal('#root/2')
      expect($('#a-grandchildlink').attr('href')).to.be.equal('#parent/child/grandchild?name=test')
    })
  })

  it('should update href attributes in anchor tags when attribute is changed', function () {
    return router.transitionTo('parent').then(async function () {
      const parentEl = document.querySelector(parentTag)
      await parentEl.updateComplete

      let rootLink = $('#a-rootlink2')
      let grandChildLink = $('#a-grandchildlink')
      rootLink.attr('param-id', '3')
      grandChildLink.attr('query-other', 'boo')
      return Promise.resolve().then(() => {
        expect(rootLink.attr('href')).to.be.equal('#root/3')
        expect(grandChildLink.attr('href')).to.be.equal('#parent/child/grandchild?name=test&other=boo')
      })
    })
  })

  it('should generate href attributes in first child anchor of a element with route attribute', function () {
    return router.transitionTo('parent').then(async function () {
      const parentEl = document.querySelector(parentTag)
      await parentEl.updateComplete
      expect($('#childanchor').attr('href')).to.be.equal('#parent')
      expect($('#childanchor2').attr('href')).to.be.equal(undefined)
      expect($('#childanchor3').attr('href')).to.be.equal(undefined)
    })
  })

  it('should use defaults defined in decorator options', function () {
    return router.transitionTo('parent').then(async function () {
      const parentEl = document.querySelector(parentTag)
      await parentEl.updateComplete
      expect($('#a-childlink').attr('href')).to.be.equal('#parent/child?foo=bar&name=test')
      expect($('#a-rootlink3').attr('href')).to.be.equal('#root/5?tag=A')
    })
  })

  it('should allow defaults to be defined as a function', function () {
    return router.transitionTo('grandchild').then(async function () {
      const parentEl = document.querySelector(parentTag)
      await parentEl.updateComplete
      const grandChildlEl = document.querySelector(grandChildTag)
      await grandChildlEl.updateComplete
      expect($('#a-grandchildlink2').attr('href')).to.be.equal('#parent/child/grandchild?other=xx&name=test')
    })
  })

  it('should call transitionTo when a non anchor tags with route attribute is clicked', function () {
    return router.transitionTo('parent').then(async function () {
      const parentEl = document.querySelector(parentTag)
      await parentEl.updateComplete
      let spy = sinon.spy(router, 'transitionTo')
      $('#div-rootlink1').click()
      expect(spy).to.be.calledOnce.and.calledWithExactly('root', { 'id': '1' }, {})

      spy.resetHistory()
      $('#div-grandchildlink').click()
      expect(spy).to.be.calledOnce.and.calledWithExactly('grandchild', {}, { name: 'test' })

      spy.resetHistory()
      $('#innerparent').click()
      expect(spy).to.be.calledOnce.and.calledWithExactly('parent', {}, {})
    })
  })

  it('should not call transitionTo when a non anchor tags with route attribute with an anchor descendant is clicked', function () {
    return router.transitionTo('parent').then(async function () {
      const parentEl = document.querySelector(parentTag)
      await parentEl.updateComplete
      let spy = sinon.spy(router, 'transitionTo')
      $('#div-a-parent').click()
      expect(spy).not.to.be.called
    })
  })

  it('should set active class in tag with route attribute when respective route is active', function () {
    return router.transitionTo('parent').then(async function () {
      const parentEl = document.querySelector(parentTag)
      await parentEl.updateComplete
      expect($('#a-parentlink').hasClass('active')).to.be.true
      expect($('#div-parentlink').hasClass('active')).to.be.true
      expect($('#a-rootlink2').hasClass('active')).to.be.false
      expect($('#div-rootlink1').hasClass('active')).to.be.false
      expect($('#a-grandchildlink').hasClass('active')).to.be.false
      expect($('#div-grandchildlink').hasClass('active')).to.be.false
      return router.transitionTo('root', { id: '1' })
    }).then(async function () {
      const parentEl = document.querySelector(parentTag)
      await parentEl.updateComplete
      expect($('#a-parentlink').hasClass('active')).to.be.false
      expect($('#div-parentlink').hasClass('active')).to.be.false
      expect($('#a-rootlink2').hasClass('active')).to.be.false
      expect($('#div-rootlink1').hasClass('active')).to.be.true
      expect($('#a-grandchildlink').hasClass('active')).to.be.false
      expect($('#div-grandchildlink').hasClass('active')).to.be.false
      return router.transitionTo('grandchild', null, { name: 'test' })
    }).then(async function () {
      const parentEl = document.querySelector(parentTag)
      await parentEl.updateComplete
      const grandChildlEl = document.querySelector(grandChildTag)
      await grandChildlEl.updateComplete
      expect($('#a-parentlink').hasClass('active')).to.be.true
      expect($('#div-parentlink').hasClass('active')).to.be.true
      expect($('#a-rootlink2').hasClass('active')).to.be.false
      expect($('#div-rootlink1').hasClass('active')).to.be.false
      expect($('#a-grandchildlink').hasClass('active')).to.be.true
      expect($('#div-grandchildlink').hasClass('active')).to.be.true
    })
  })

  it('should allow to customize the class to be set', function () {
    return router.transitionTo('parent').then(async function () {
      const parentEl = document.querySelector(parentTag)
      await parentEl.updateComplete
      expect($('#a-parentlink-customclass').hasClass('active')).to.be.false
      expect($('#a-parentlink-customclass').hasClass('my-active-class')).to.be.true
    })
  })

  it('should allow to customize the class to be set', function () {
    return router.transitionTo('parent').then(async function () {
      const parentEl = document.querySelector(parentTag)
      await parentEl.updateComplete
      expect($('#a-parentlink-noclass').hasClass('active')).to.be.false
    })
  })

  it('should not generate href attributes outside of elements with routerlinks attribute', function () {
    return router.transitionTo('parent').then(async function () {
      const parentEl = document.querySelector(parentTag)
      await parentEl.updateComplete
      expect($('#a-parentlink-outside').attr('href')).to.be.equal(undefined)
    })
  })

  it('should not call transitionTo outside of elements with routerlinks attribute', function () {
    return router.transitionTo('parent').then(async function () {
      const parentEl = document.querySelector(parentTag)
      await parentEl.updateComplete
      const spy = sinon.spy(router, 'transitionTo')
      $('#innerparent-outside').click()
      expect(spy).to.not.be.called
    })
  })

  describe('when elements are added dynamically', () => {
    it('should generate href attributes in anchor tags with route attribute', function (done) {
      router.transitionTo('parent').then(async function () {
        const parentEl = document.querySelector(parentTag)
        await parentEl.updateComplete
        $(`<a id="a-dyn-rootlink2" route="root" param-id="2"></a>
          <a id="a-dyn-parentlink" route="parent"></a>
          <a id="a-dyn-grandchildlink" route="grandchild" query-name="test"></a>
        `).appendTo(parentEl.renderRoot.querySelector('[routerlinks]'))

        // links are updated asynchronously by MutationObserver
        setTimeout(() => {
          expect($('#a-dyn-parentlink').attr('href')).to.be.equal('#parent')
          expect($('#a-dyn-rootlink2').attr('href')).to.be.equal('#root/2')
          expect($('#a-dyn-grandchildlink').attr('href')).to.be.equal('#parent/child/grandchild?name=test')
          done()
        }, 0)
      })
    })

    it('should call transitionTo when a non anchor tags with route attribute is clicked', function () {
      return router.transitionTo('parent').then(async function () {
        const parentEl = document.querySelector(parentTag)
        await parentEl.updateComplete

        $(`<div id="div-dyn-rootlink1" route="root" param-id="1"></div>
        <div id="div-dyn-grandchildlink" route="grandchild" query-name="test"></div>
        <div id="div-dyn-parentlink" route="parent"><div id="dyn-innerparent"></div></div>
        `).appendTo(parentEl.renderRoot.querySelector('[routerlinks]'))

        let spy = sinon.spy(router, 'transitionTo')
        $('#div-dyn-rootlink1').click()
        expect(spy).to.be.calledOnce.and.calledWithExactly('root', { 'id': '1' }, {})

        spy.resetHistory()
        $('#div-dyn-grandchildlink').click()
        expect(spy).to.be.calledOnce.and.calledWithExactly('grandchild', {}, { name: 'test' })

        spy.resetHistory()
        $('#dyn-innerparent').click()
        expect(spy).to.be.calledOnce.and.calledWithExactly('parent', {}, {})
      })
    })
  })

  describe('when calling bind in pre-rendered HTML', function () {
    let unbind
    beforeEach(function () {
      $(`<div id="prerendered">
        <div routerlinks>
          <a id="a-prerootlink2" route="root" param-id="2"></a>
          <a id="a-preparentlink" route="parent"></a>
          <a id="a-pregrandchildlink" route="grandchild" query-name="test"></a>
          <div id="div-prerootlink1" route="root" param-id="1"></div>
          <div id="div-pregrandchildlink" route="grandchild" query-name="test"></div>
          <div id="div-preparentlink" route="parent"><div id="preinnerparent"></div></div>
        </div>
      </div>`).appendTo(document.body)
      unbind = routerLinks.bind(document.getElementById('prerendered'))
    })

    it('should generate href attributes in anchor tags with route attribute', function () {
      return router.transitionTo('parent').then(async function () {
        const parentEl = document.querySelector(parentTag)
        await parentEl.updateComplete
        expect($('#a-preparentlink').attr('href')).to.be.equal('#parent')
        expect($('#a-prerootlink2').attr('href')).to.be.equal('#root/2')
        expect($('#a-pregrandchildlink').attr('href')).to.be.equal('#parent/child/grandchild?name=test')
      })
    })

    it('should call transitionTo when a non anchor tags with route attribute is clicked', function () {
      return router.transitionTo('parent').then(async function () {
        const parentEl = document.querySelector(parentTag)
        await parentEl.updateComplete
        let spy = sinon.spy(router, 'transitionTo')
        $('#div-prerootlink1').click()
        expect(spy).to.be.calledOnce.and.calledWithExactly('root', { 'id': '1' }, {})

        spy.resetHistory()
        $('#div-pregrandchildlink').click()
        expect(spy).to.be.calledOnce.and.calledWithExactly('grandchild', {}, { name: 'test' })

        spy.resetHistory()
        $('#preinnerparent').click()
        expect(spy).to.be.calledOnce.and.calledWithExactly('parent', {}, {})
      })
    })

    it('should not call transitionTo after calling function returned by bind', function () {
      unbind()
      return router.transitionTo('parent').then(async function () {
        const parentEl = document.querySelector(parentTag)
        await parentEl.updateComplete
        let spy = sinon.spy(router, 'transitionTo')
        $('#div-prerootlink1').click()
        $('#div-pregrandchildlink').click()
        $('#preinnerparent').click()
        expect(spy).to.not.be.called
      })
    })

    describe('and nodes are added dynamically', () => {
      it('should generate href attributes in anchor tags with route attribute', function (done) {
        router.transitionTo('parent').then(async function () {
          const parentEl = document.querySelector(parentTag)
          await parentEl.updateComplete
          $(`<a id="a-dyn-prerootlink2" route="root" param-id="2"></a>
            <a id="a-dyn-preparentlink" route="parent"></a>
            <a id="a-dyn-pregrandchildlink" route="grandchild" query-name="test"></a>
          `).appendTo(document.querySelector('#prerendered [routerlinks]'))

          // links are updated asynchronously by MutationObserver
          setTimeout(() => {
            expect($('#a-dyn-preparentlink').attr('href')).to.be.equal('#parent')
            expect($('#a-dyn-prerootlink2').attr('href')).to.be.equal('#root/2')
            expect($('#a-dyn-pregrandchildlink').attr('href')).to.be.equal('#parent/child/grandchild?name=test')
            done()
          }, 0)
        })
      })
    })
  })

  describe('setting selector option', () => {
    const customSelectorOptions = {}
    @routerLinks(customSelectorOptions)
    class ParentCustomSelectorView extends LitElement {
      rootId = 5

      createRenderRoot () {
        return this
      }

      render () {
        return html`
          <div class="my-router-links">
            <div id="div-parentlink" route="parent"><div id="innerparent"></div></div>
            <a id="a-parentlink" route="parent"></a>
          </div>
          <a id="a-parentlink-outside" route="parent"></a>
          <div id="div-parentlink-outside" route="parent"><div id="innerparent-outside"></div></div>
        `
      }
    }
    const customParentTag = defineCE(ParentCustomSelectorView)

    beforeEach(() => {
      ParentRoute.prototype.component = function () {
        return ParentCustomSelectorView
      }
    })

    it('to a valid one should configure links inside elements that matches selector', async function () {
      customSelectorOptions.selector = '.my-router-links'
      return router.transitionTo('parent').then(async function () {
        const parentEl = document.querySelector(customParentTag)
        await parentEl.updateComplete

        expect($('#a-parentlink').attr('href')).to.be.equal('#parent')

        expect($('#a-parentlink-outside').attr('href')).to.be.equal(undefined)

        const spy = sinon.spy(router, 'transitionTo')
        $('#innerparent').click()
        expect(spy).to.be.calledOnce.and.calledWithExactly('parent', {}, {})

        spy.resetHistory()
        $('#innerparent-outside').click()
        expect(spy).not.to.be.called
      })
    })

    it('to a falsy one should configure all links in owner element', async function () {
      customSelectorOptions.selector = false
      return router.transitionTo('parent').then(async function () {
        const parentEl = document.querySelector(customParentTag)
        await parentEl.updateComplete

        expect($('#a-parentlink').attr('href')).to.be.equal('#parent')

        expect($('#a-parentlink-outside').attr('href')).to.be.equal('#parent')

        const spy = sinon.spy(router, 'transitionTo')
        $('#innerparent').click()
        expect(spy).to.be.calledOnce.and.calledWithExactly('parent', {}, {})

        spy.resetHistory()
        $('#innerparent-outside').click()
        expect(spy).to.be.calledOnce.and.calledWithExactly('parent', {}, {})
      })
    })
  })
})
