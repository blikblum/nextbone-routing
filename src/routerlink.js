import { each, isFunction, clone } from 'underscore'
import { delegate, undelegate } from 'nextbone'
import { router } from './cherrytree-adapter'

const routerLinksData = Symbol('routerLinksData')
const resolved = Promise.resolve()

function mutationHandler (mutations, observer) {
  mutations.forEach(function (mutation) {
    if (mutation.type === 'attributes') {
      let attr = mutation.attributeName
      if (attr.indexOf('param-') === 0 || attr.indexOf('query-') === 0) {
        updateHref(mutation.target, observer.ownerEl)
      }
    } else {
      each(mutation.addedNodes, node => {
        if (node.nodeType === 1 && (node.route || node.getAttribute('route'))) {
          updateHref(node, observer.ownerEl)
        }
      })
    }
  })
}

const elementsObserverConfig = { childList: true, subtree: true, attributes: true }

function getAttributeValues (el, prefix, result) {
  let attributes = el.attributes

  for (let i = 0; i < attributes.length; i++) {
    let attr = attributes[i]
    if (attr.name.indexOf(prefix) === 0) {
      let paramName = attr.name.slice(prefix.length)
      result[paramName] = attr.value
    }
  }
  return result
}

function getDefaults (ownerEl, routeName, propName, routeEl, options) {
  let result = options[propName]
  if (isFunction(result)) result = result.call(ownerEl, routeName, routeEl)
  return clone(result) || {}
}

function getRouteProp (ownerEl, routeName, routeEl, propName, attrPrefix) {
  const options = ownerEl[routerLinksData].options
  let defaults = getDefaults(ownerEl, routeName, propName, routeEl, options)
  const rootEl = routeEl.closest(options.selector || '[routerlinks]')
  if (rootEl) {
    getAttributeValues(rootEl, attrPrefix, defaults)
  }
  return getAttributeValues(routeEl, attrPrefix, defaults)
}

function updateHref (el, ownerEl) {
  const routeName = el.getAttribute('route')
  if (!routeName) return
  const params = getRouteProp(ownerEl, routeName, el, 'params', 'param-')
  const query = getRouteProp(ownerEl, routeName, el, 'query', 'query-')
  const href = router.generate(routeName, params, query)
  const anchorEl = el.tagName === 'A' ? el : el.querySelector('a')
  if (anchorEl) anchorEl.setAttribute('href', href)
}

function createLinks (routerLinks, rootEl, options) {
  const routeEls = rootEl.querySelectorAll('[route]')

  each(routeEls, (el) => {
    updateHref(el, routerLinks)
  })
}

function transitionHandler () {
  (this.updateComplete || resolved).then(() => {
    const data = this[routerLinksData]
    each(data.rootEls, rootEl => {
      each(rootEl.querySelectorAll('[route]'), el => {
        let routeName = el.getAttribute('route')
        if (!routeName) return
        let params = getRouteProp(this, routeName, el, 'params', 'param-')
        let query = getRouteProp(this, routeName, el, 'query', 'query-')
        let activeClass = el.hasAttribute('active-class') ? el.getAttribute('active-class') : 'active'
        if (activeClass) {
          const isActive = router.isActive(routeName, params, query)
          el.classList.toggle(activeClass, isActive)
        }
      })
    })
  })
}

function linkClickHandler (e) {
  let el = e.selectorTarget
  if (el.querySelectorAll('a').length) return
  let routeName = el.getAttribute('route')
  if (!routeName) return
  let params = getRouteProp(this, routeName, el, 'params', 'param-')
  let query = getRouteProp(this, routeName, el, 'query', 'query-')
  router.transitionTo(routeName, params, query)
}

const createClass = (ctor, options = {}) => {
  return class extends ctor {
    connectedCallback () {
      super.connectedCallback()
      router.on('transition', transitionHandler, this)

      if (this[routerLinksData]) {
        return
      }

      this.updateComplete.then(() => {
        const { selector = '[routerlinks]' } = options
        const rootEls = selector ? (this.renderRoot || this).querySelectorAll(selector) : [this]
        const observer = new MutationObserver(mutationHandler)
        observer.ownerEl = this
        this[routerLinksData] = { options, rootEls, observer }
        each(rootEls, rootEl => {
          delegate(rootEl, 'click', '[route]', linkClickHandler, this)
          createLinks(this, rootEl, options)
          observer.observe(rootEl, elementsObserverConfig)
        })
      })
    }

    disconnectedCallback () {
      super.disconnectedCallback()
      router.off('transition', transitionHandler, this)
    }
  }
}

export const routerLinks = (optionsOrCtorOrDescriptor, options) => {
  // current state of decorators sucks. Lets abuse of duck typing
  if (typeof optionsOrCtorOrDescriptor === 'function') {
    // constructor -> typescript decorator
    return createClass(optionsOrCtorOrDescriptor, options)
  }
  if (optionsOrCtorOrDescriptor.kind === 'class') {
    // descriptor -> spec decorator
    const { kind, elements } = optionsOrCtorOrDescriptor
    return {
      kind,
      elements,
      finisher (ctor) {
        return createClass(ctor, options)
      }
    }
  }
  // optionsOrCtorOrDescriptor === options
  return (ctorOrDescriptor) => {
    return routerLinks(ctorOrDescriptor, optionsOrCtorOrDescriptor)
  }
}

routerLinks.bind = function (ownerEl, options = {}) {
  const { selector = '[routerlinks]' } = options
  const rootEls = selector ? ownerEl.querySelectorAll(selector) : [ownerEl]
  const observer = new MutationObserver(mutationHandler)
  const eventHandlers = []
  observer.ownerEl = ownerEl
  ownerEl[routerLinksData] = { options, rootEls, observer }
  each(rootEls, rootEl => {
    eventHandlers.push(delegate(rootEl, 'click', '[route]', linkClickHandler, ownerEl))
    createLinks(ownerEl, rootEl, options)
    observer.observe(rootEl, elementsObserverConfig)
  })
  router.on('transition', transitionHandler, ownerEl)
  return function () {
    eventHandlers.forEach((eventHandler, i) => undelegate(rootEls[i], eventHandler))
    router.off('transition', transitionHandler, ownerEl)
  }
}
