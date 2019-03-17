import { Events } from 'nextbone'
import { Region } from './utils/region'
import { findContext } from './routecontext'
import { router } from './cherrytree-adapter'

const createElement = (route, Definition) => {
  if (typeof Definition === 'function') {
    if (Definition.prototype instanceof HTMLElement) {
      return new Definition()
    }
    return createElement(route, Definition.call(route))
  } else if (typeof Definition === 'string') {
    return document.createElement(Definition)
  }
}

// stores the outletRegion for each element
const outletRegionMap = new WeakMap()

export const getComponent = route => {
  return route.component || route.constructor.component
}

const contextProxyHandler = {
  get: function (target, property, receiver) {
    return findContext(target, property)
  }
}

export default class Route extends Events {
  constructor (classOptions, router, { name, path, options }) {
    super()
    this.$router = router
    this.$name = name
    this.$path = path
    this.$options = options
    this.initialize(classOptions)
  }

  initialize () {

  }

  activate () {

  }

  deactivate () {

  }

  prepareEl (el, transition) {
    const properties = this.$options.properties
    if (properties) Object.assign(el, properties)
  }

  renderEl (region, transition) {
    if (this.el && this.updateEl(transition)) return

    const el = createElement(this, getComponent(this))
    if (!el) {
      throw new Error(`${this.constructor.name}: component has invalid value ${getComponent(this)}. Expected a string or HTMLElement`)
    }
    this.prepareEl(el, transition)
    if (region) {
      region.show(el)
    } else {
      // if region is undefined means no rootRegion is defined
      throw new Error('No root outlet region defined')
    }
    this.el = el
    router.trigger('render', this)
  }

  updateEl () {

  }

  get context () {
    return new Proxy(this, contextProxyHandler)
  }

  getOutlet () {
    let outletRegion = outletRegionMap.get(this.el)
    if (!outletRegion) {
      const root = this.el.shadowRoot ? this.el.shadowRoot : this.el
      const selector = this.el.constructor.outlet || 'router-outlet'
      const el = root.querySelector(selector)
      if (el) {
        outletRegion = new Region(el)
        outletRegionMap.set(this.el, outletRegion)
      }
    }
    return outletRegion
  }

  destroy () {
    this.stopListening()
  }
}
