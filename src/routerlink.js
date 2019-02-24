import _ from 'underscore'
import { delegate } from 'nextbone'
import { routerChannel } from './cherrytree-adapter'

const routerLinksData = Symbol()
const resolved = Promise.resolve()

function mutationHandler (mutations, observer) {
  mutations.forEach(function (mutation) {
    if (mutation.type === 'attributes') {
      let attr = mutation.attributeName
      if (attr.indexOf('param-') === 0 || attr.indexOf('query-') === 0) {
        updateHref(mutation.target, observer.ownerEl)
      }
    } else {
      _.each(mutation.addedNodes, node => {
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

function getDefaults (ownerEl, routeName, prop, routeEl) {
  const data = ownerEl[routerLinksData]
  let defaults = data.options.defaults
  if (_.isFunction(defaults)) defaults = defaults.call(ownerEl)
  let routeDefaults = defaults && defaults[routeName]
  let result = (routeDefaults && routeDefaults[prop])
  if (_.isFunction(result)) result = result.call(ownerEl, routeEl)
  return _.clone(result) || {}
}

function updateHref (el, ownerEl) {
  let routeName = el.getAttribute('route')
  if (!routeName) return
  let params = getAttributeValues(el, 'param-', getDefaults(ownerEl, routeName, 'params', el))
  let query = getAttributeValues(el, 'query-', getDefaults(ownerEl, routeName, 'query', el))
  let href = routerChannel.request('generate', routeName, params, query)
  let anchorEl
  if (el.tagName === 'A') {
    anchorEl = el
  } else {
    anchorEl = el.querySelectorAll('a')[0]
  }
  if (anchorEl) anchorEl.setAttribute('href', href)
  return anchorEl
}

function createLinks (routerLinks, rootEl, options) {
  const routeEls = rootEl.querySelectorAll('[route]')

  _.each(routeEls, (el) => {
    updateHref(el, routerLinks)
  })
}

function transitionHandler () {
  (this.updateComplete || resolved).then(() => {
    const data = this[routerLinksData]
    _.each(data.rootEls, rootEl => {
      _.each(rootEl.querySelectorAll('[route]'), el => {
        let routeName = el.getAttribute('route')
        if (!routeName) return
        let params = getAttributeValues(el, 'param-', getDefaults(this, routeName, 'params', el))
        let query = getAttributeValues(el, 'query-', getDefaults(this, routeName, 'query', el))
        let activeClass = el.hasAttribute('active-class') ? el.getAttribute('active-class') : 'active'
        if (activeClass) {
          const isActive = routerChannel.request('isActive', routeName, params, query)
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
  let params = getAttributeValues(el, 'param-', getDefaults(this, routeName, 'params', el))
  let query = getAttributeValues(el, 'query-', getDefaults(this, routeName, 'query', el))
  routerChannel.request('transitionTo', routeName, params, query)
}

const createClass = (ctor, options = {}) => {
  class RouterLinksMixin extends ctor {
    constructor () {
      super()
      delegate(this, 'click', '[route]', linkClickHandler)
    }

    connectedCallback () {
      super.connectedCallback()
      routerChannel.on('transition', transitionHandler, this)

      if (this[routerLinksData]) {
        return
      }

      this.updateComplete.then(() => {
        const rootEls = (this.renderRoot || this).querySelectorAll('[routerlinks]')
        const observer = new MutationObserver(mutationHandler)
        observer.ownerEl = this
        this[routerLinksData] = { options, rootEls, observer }
        _.each(rootEls, rootEl => {
          createLinks(this, rootEl, options)
          observer.observe(rootEl, elementsObserverConfig)
        })
      })
    }

    disconnectedCallback () {
      super.disconnectedCallback()
      routerChannel.off('transition', transitionHandler, this)
    }
  }
  return RouterLinksMixin
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
  const rootEls = ownerEl.querySelectorAll('[routerlinks]')
  const observer = new MutationObserver(mutationHandler)
  const eventHandler = delegate(ownerEl, 'click', '[route]', linkClickHandler)
  observer.ownerEl = ownerEl
  ownerEl[routerLinksData] = { options, rootEls, observer }
  _.each(rootEls, rootEl => {
    createLinks(ownerEl, rootEl, options)
    observer.observe(rootEl, elementsObserverConfig)
  })
  routerChannel.on('transition', transitionHandler, ownerEl)
  return function () {
    ownerEl.removeEventListener('click', eventHandler)
    routerChannel.off('transition', transitionHandler, ownerEl)
  }
}
