import { Events } from 'nextbone'
import { Region } from 'nextbone/dom-utils'
import { findContext } from './routecontext'

const getPath = (object, path, value) => {
  // Check if path is string or array. Regex : ensure that we do not have '.' and brackets
  const pathArray = Array.isArray(path) ? path : path.split(/[,[\].]/g).filter(Boolean)
  // Find value if exist return otherwise return undefined value;
  return pathArray.reduce((prevObj, key) => prevObj && prevObj[key], object) || value
}

const parseNumber = (value) => {
  const n = parseFloat(value)
  const isNumeric = value == n
  return isNumeric ? n : value
}

const createElement = (route, Definition) => {
  if (typeof Definition === 'function') {
    if (Definition.prototype instanceof HTMLElement) {
      try {
        return new Definition()
      } catch (error) {
        throw new Error(
          `Unable to create instance of "${Definition.name}" for "${route.$name}" route\n${error}`,
        )
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

export const getComponent = (route) => {
  return route.component || route.constructor.component
}

const contextProxyHandler = {
  get: function (target, property, receiver) {
    return findContext(target, property)
  },
}

const createCallback = (route, listener) => {
  return function domCallback(event) {
    if (event.currentTarget === route.el) {
      listener.call(route, event)
    }
  }
}

const bindElEvents = (route, el, events) => {
  events.forEach(({ eventName, listener }) => {
    el.addEventListener(eventName, createCallback(route, listener))
  })
}

const registerElEvent = (ctor, eventName, listener) => {
  const elEvents = ctor._elEvents || (ctor._elEvents = [])
  elEvents.push({ eventName, listener })
}

export const elEvent = (eventName) => (targetOrDescriptor, methodName, fieldDescriptor) => {
  if (typeof methodName !== 'string') {
    // spec
    const { kind, placement, descriptor, initializer, key } = targetOrDescriptor
    return {
      kind,
      placement,
      descriptor,
      initializer,
      key,
      finisher(ctor) {
        registerElEvent(ctor, eventName, descriptor.value)
      },
    }
  }
  registerElEvent(targetOrDescriptor.constructor, eventName, fieldDescriptor.value)
}

const registerProperty = (ctor, name, key, options = {}) => {
  const properties = ctor.__properties || (ctor.__properties = [])
  properties.push({ name, ...options })
  const desc = {
    get() {
      return this[key]
    },
    set(value) {
      const oldValue = this[key]
      if (value === oldValue) return
      if (options.to && this.el) {
        this.el[options.to] = value
      }
      this[key] = value
      this.trigger(`change:${name}`, value, oldValue)
    },
    configurable: true,
    enumerable: true,
  }
  Object.defineProperty(ctor.prototype, name, desc)
}

export const property = (optionsOrProtoOrDescriptor, fieldName, options) => {
  const isLegacy = typeof fieldName === 'string'
  if (!isLegacy && typeof optionsOrProtoOrDescriptor.kind !== 'string') {
    // passed options
    return function (protoOrDescriptor, realFieldName) {
      return property(protoOrDescriptor, realFieldName, optionsOrProtoOrDescriptor)
    }
  }

  const name = isLegacy ? fieldName : optionsOrProtoOrDescriptor.key
  const key = `__${name}`

  if (!isLegacy) {
    const { kind, placement, descriptor, initializer } = optionsOrProtoOrDescriptor
    return {
      kind,
      placement,
      descriptor,
      initializer,
      key,
      finisher(ctor) {
        registerProperty(ctor, name, key, options)
      },
    }
  }
  registerProperty(optionsOrProtoOrDescriptor.constructor, name, key, options)
}

export class Route extends Events {
  constructor(classOptions, router, { name, path, options }) {
    super()
    this.$router = router
    this.$name = name
    this.$path = path
    this.$options = options
    this.initialize(classOptions)
  }

  initialize() {}

  activate() {}

  deactivate() {}

  _deleteInstanceProperties() {
    // workaround to buggy legacy decorator babel implementation
    const properties = this.constructor.__properties
    if (properties) {
      properties.forEach(({ name }) => {
        if (this.hasOwnProperty(name)) {
          const value = this[name]
          delete this[name]
          this[`__${name}`] = value
        }
      })
    }
  }

  _applyProperties(el, transition, $route) {
    el.$route = $route
    const properties = this.$options.properties
    if (properties) Object.assign(el, properties)
    const classProperties = this.constructor.__properties
    if (classProperties) {
      classProperties.forEach(({ name, from, to, format }) => {
        if (from) {
          let result = getPath(transition, from)
          if (format === 'number') {
            result = parseNumber(result)
          } else if (typeof format === 'function') {
            result = format(result)
          }
          this[name] = result
        }
        if (to && !this.el) {
          el[to] = this[name]
        }
      })
    }
  }

  _prepareEl(el, transition, $route) {
    this._applyProperties(el, transition, $route)
    if (this.prepareEl) this.prepareEl(el, transition)
  }

  renderEl(region, transition, $route) {
    if (this.el && this.updateEl(transition)) return

    const el = createElement(this, getComponent(this))
    if (!el) {
      throw new Error(
        `${this.constructor.name}: component has invalid value ${getComponent(this)}. Expected a string or HTMLElement`,
      )
    }
    if (this.constructor._elEvents) bindElEvents(this, el, this.constructor._elEvents)
    this._prepareEl(el, transition, $route)
    el.$router = this.$router
    if (region) {
      region.show(el)
    } else if (!el.isConnected) {
      // if region is undefined means no rootOutlet is defined
      throw new Error('No root outlet region defined')
    }
    this.el = el
    this.$router.trigger('render', this)
  }

  updateEl() {}

  get context() {
    return new Proxy(this, contextProxyHandler)
  }

  createOutlet(el) {
    return new Region(el)
  }

  getOutlet() {
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

  destroy() {
    this.stopListening()
  }
}
