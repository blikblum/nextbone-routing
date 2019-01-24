import _ from 'underscore'
import { routerChannel } from './cherrytree-adapter'

function attrChanged (mutations, observer) {
  mutations.forEach(function (mutation) {
    let attr = mutation.attributeName
    if (attr.indexOf('param-') === 0 || attr.indexOf('query-') === 0) {
      updateHref(mutation.target, observer.link)
    }
  })
}

const attrObserverConfig = { attributes: true }

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

function updateHref (el, routerLinks) {
  let routeName = el.getAttribute('route')
  if (!routeName) return
  let params = getAttributeValues(el, 'param-', routerLinks.getDefaults(routeName, 'params', el))
  let query = getAttributeValues(el, 'query-', routerLinks.getDefaults(routeName, 'query', el))
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

function createLinks (routerLinks, options) {
  const renderRoot = routerLinks.renderRoot || this
  const rootEl = options.rootEl
  const selector = rootEl ? rootEl + ' [route]' : '[route]'
  const routes = renderRoot.querySelectorAll(selector)

  _.each(routes, (el) => {
    if (updateHref(el, routerLinks)) {
      if (routerLinks.attrObserver) routerLinks.attrObserver.observe(el, attrObserverConfig)
    }
  })
}

const createClass = (ctor, options = {}) => {
  return class extends ctor {
    constructor () {
      super()
      this._linkElements = new WeakSet()
      const renderRoot = this.renderRoot || this
      renderRoot.addEventListener('click', this.onLinkClick.bind(this))
    }

    connectedCallback () {
      super.connectedCallback()
      this.listenTo(routerChannel, 'transition', this.onTransition)
      if (window.MutationObserver) {
        this.attrObserver = new window.MutationObserver(attrChanged)
        this.attrObserver.link = this
      }
      createLinks(this, options)
    }

    disconnectedCallback () {
      super.disconnectedCallback()
      this.stopListening(routerChannel)
    }

    onTransition () {
      const rootEl = options.rootEl
      const selector = rootEl ? rootEl + ' [route]' : '[route]'
      const renderRoot = this.renderRoot || this
      _.each(renderRoot.querySelectorAll(selector), el => {
        let routeName = el.getAttribute('route')
        if (!routeName) return
        let params = getAttributeValues(el, 'param-', this.getDefaults(routeName, 'params', el))
        let query = getAttributeValues(el, 'query-', this.getDefaults(routeName, 'query', el))
        let activeClass = el.hasAttribute('active-class') ? el.getAttribute('active-class') : 'active'
        if (activeClass) {
          const isActive = routerChannel.request('isActive', routeName, params, query)
          el.classList.toggle(activeClass, isActive)
        }
        this._linkElements.add(el)
      })
    }

    onLinkClick (e) {
      // todo improve by doing proper event delegation
      let el = e.target
      if (!this._linkElements.has(el) || el.querySelectorAll('a').length) return
      let routeName = el.getAttribute('route')
      if (!routeName) return
      let params = getAttributeValues(el, 'param-', this.getDefaults(routeName, 'params', el))
      let query = getAttributeValues(el, 'query-', this.getDefaults(routeName, 'query', el))
      routerChannel.request('transitionTo', routeName, params, query)
    }

    getDefaults (routeName, prop, el) {
      let defaults = options.defaults
      if (_.isFunction(defaults)) defaults = defaults.call(this)
      let routeDefaults = defaults && defaults[routeName]
      let result = (routeDefaults && routeDefaults[prop])
      if (_.isFunction(result)) result = result.call(this, el)
      return _.clone(result) || {}
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
