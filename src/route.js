import { Events, isView } from 'nextbone'
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

const bindElEvents = (el, events, context) => {
  if (!isView(el)) {
    throw new Error(`elEvent: component "${el.constructor.name}" is not a view`)
  }
  events.forEach(({ eventName, listener }) => {
    el.listenTo(el, eventName, listener.bind(context))
  })
}

const registerElEvent = (ctor, eventName, listener) => {
  const elEvents = ctor._elEvents || (ctor._elEvents = [])
  elEvents.push({ eventName, listener })
}

export const elEvent = eventName => (targetOrDescriptor, methodName, fieldDescriptor) => {
  if (typeof methodName !== 'string') {
    // spec
    const { kind, placement, descriptor, initializer, key } = targetOrDescriptor
    return {
      kind,
      placement,
      descriptor,
      initializer,
      key,
      finisher (ctor) {
        registerElEvent(ctor, eventName, descriptor.value)
      }
    }
  }
  registerElEvent(targetOrDescriptor.constructor, eventName, fieldDescriptor.value)
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
    if (this.constructor._elEvents) bindElEvents(el, this.constructor._elEvents, this)
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
