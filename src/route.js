import { Events, isView } from 'nextbone'
import { Region } from './utils/region'
import { findContext } from './routecontext'
import { router } from './cherrytree-adapter'

const createElement = (route, Definition) => {
  if (typeof Definition === 'function') {
    if (Definition.prototype instanceof HTMLElement) {
      try {
        return new Definition()
      } catch (error) {
        throw new Error(`Unable to create instance of "${Definition.name}" for "${route.$name}" route`)
      }
    }
    return createElement(route, Definition.call(route))
  } else if (typeof Definition === 'string') {
    return document.createElement(Definition)
  } else if (Definition instanceof HTMLElement) {
    return Definition
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

const createDomCallback = (route, listener) => {
  return function domCallback (event) {
    if (event.currentTarget === route.el) {
      listener.call(route, event)
    }
  }
}

const createNextboneCallback = (route, listener) => {
  return function nextboneCallback (...args) {
    if (this === route.el) {
      listener.apply(route, args)
    }
  }
}

const bindElEvents = (route, el, events) => {
  events.forEach(({ eventName, listener, dom }) => {
    if (dom) {
      el.addEventListener(eventName, createDomCallback(route, listener))
    } else {
      if (!isView(el)) {
        throw new Error(`elEvent: component "${el.constructor.name}" is not a view`)
      }
      el.on(eventName, createNextboneCallback(route, listener))
    }
  })
}

const registerElEvent = (ctor, eventName, listener, dom) => {
  const elEvents = ctor._elEvents || (ctor._elEvents = [])
  elEvents.push({ eventName, listener, dom })
}

export const elEvent = (eventName, options = {}) => (targetOrDescriptor, methodName, fieldDescriptor) => {
  const { dom: defaultDom = true } = elEvent
  const { dom = defaultDom } = options
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
        registerElEvent(ctor, eventName, descriptor.value, dom)
      }
    }
  }
  registerElEvent(targetOrDescriptor.constructor, eventName, fieldDescriptor.value, dom)
}

const registerElProperty = (ctor, routeProperty, elProperty) => {
  const elProperties = ctor._elProperties || (ctor._elProperties = [])
  elProperties.push({ routeProperty, elProperty })
}

export const elProperty = (propertyOrProtoOrDescriptor, fieldName, property) => {
  const isLegacy = typeof fieldName === 'string'
  if (!isLegacy && typeof propertyOrProtoOrDescriptor.kind !== 'string') {
    // passed property name
    return function (protoOrDescriptor) {
      return elProperty(protoOrDescriptor, fieldName, propertyOrProtoOrDescriptor)
    }
  }

  if (!isLegacy) {
    const { kind, placement, descriptor, initializer, key } = propertyOrProtoOrDescriptor
    return {
      kind,
      placement,
      descriptor,
      initializer,
      key,
      finisher (ctor) {
        registerElProperty(ctor, key, property || key)
      }
    }
  }
  registerElProperty(propertyOrProtoOrDescriptor.constructor, fieldName, property || fieldName)
}

export class Route extends Events {
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
    const elProperties = this.constructor._elProperties || []
    elProperties.forEach(({ routeProperty, elProperty }) => {
      el[elProperty] = this[routeProperty]
    })
  }

  renderEl (region, transition) {
    if (this.el && this.updateEl(transition)) return

    const el = createElement(this, getComponent(this))
    if (!el) {
      throw new Error(`${this.constructor.name}: component has invalid value ${getComponent(this)}. Expected a string or HTMLElement`)
    }
    if (this.constructor._elEvents) bindElEvents(this, el, this.constructor._elEvents)
    this.prepareEl(el, transition)
    if (region) {
      region.show(el)
    } else if (!el.isConnected) {
      // if region is undefined means no rootOutlet is defined
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

  createOutlet (el) {
    return new Region(el)
  }

  getOutlet () {
    let outletRegion = outletRegionMap.get(this.el)
    if (!outletRegion) {
      const root = this.el.shadowRoot ? this.el.shadowRoot : this.el
      const selector = this.el.constructor.outlet || 'router-outlet'
      const el = root.querySelector(selector)
      if (el) {
        outletRegion = this.createOutlet(el)
        outletRegionMap.set(this.el, outletRegion)
      }
    }
    return outletRegion
  }

  destroy () {
    this.stopListening()
  }
}
