import { Events } from 'nextbone'
import { Region } from 'nextbone/dom-utils'
import { findContext } from './routecontext'

const getPath = (object, path, value) => {
  // Check if path is string or array. Regex : ensure that we do not have '.' and brackets
  const pathArray = Array.isArray(path) ? path : path.split(/[,[\].]/g).filter(Boolean)
  // Find value if exist return otherwise return undefined value;
  return pathArray.reduce((prevObj, key) => prevObj && prevObj[key], object) || value
}

/**
 * @callback PropertySetter
 * @param {*} value
 * @returns {void}
 */

/**
 * @typedef PropertyHook
 * @property {function(PropertySetter): void} [init]
 * @property {function(Transition, PropertySetter): void} [enter]
 * @property {function(Transition, PropertySetter): void} [transition]
 * @property {function(Transition, PropertySetter): void} [leave]
 * @property {function(any, HTMLElement): void} [update]
 */

/**
 * @param {*} value
 * @return {*}
 */
function parseNumber(value) {
  const n = parseFloat(value)
  const isNumeric = value == n
  return isNumeric ? n : value
}

function getFormattedValue(value, format) {
  let v = value
  if (v !== undefined) {
    if (format === 'number') {
      v = parseNumber(value)
    } else if (typeof format === 'function') {
      v = format(value)
    }
  }
  return v
}

/**
 * @param {*} value
 * @returns {PropertyHook}
 */
export function fromValue(value) {
  return {
    init(setValue) {
      setValue(value)
    },
  }
}

/**
 *
 * @param {string} path
 * @param {string | Function} format
 * @returns {PropertyHook}
 */
export function fromTransition(path, format) {
  return {
    transition(transition, setValue) {
      setValue(getPath(transition, path), format)
    },
  }
}

function runPropertyHookMethod(transition, route, method) {
  const propertiesData = route._propertiesData
  if (!propertiesData) {
    return
  }
  for (const { hooks, set } of Object.values(propertiesData)) {
    hooks.forEach((hook) => {
      if (typeof hook[method] === 'function') {
        hook[method](transition, set)
      }
    })
  }
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

export const eventHandler = elEvent

function getPropertyHooks({ from }) {
  const result = []
  switch (typeof from) {
    case 'string':
      result.push(fromTransition(from))
      break
    case 'object':
      if (from) {
        result.push(from)
      }
      break
  }

  return result
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
    const properties = this.constructor.__properties
    if (properties) {
      const propertiesData = (this._propertiesData = {})
      for (const { name, ...options } of properties) {
        const hooks = getPropertyHooks(options)

        const set = (v, format) => {
          let newValue = getFormattedValue(v, format)
          newValue = getFormattedValue(newValue, options.format)
          this[name] = newValue
          hooks.forEach((hook) => {
            if (typeof hook.update === 'function') {
              hook.update(newValue, el)
            }
          })
        }
        propertiesData[name] = { hooks, set }
      }
    }

    this.initialize(classOptions)
  }

  initialize() {}

  activate() {}

  deactivate() {}

  _initInstanceProperties() {
    // workaround to buggy legacy decorator babel implementation
    const { _propertiesData } = this
    if (_propertiesData) {
      for (const [name, { hooks, set }] of Object.entries(_propertiesData)) {
        if (this.hasOwnProperty(name)) {
          const value = this[name]
          delete this[name]
          this[`__${name}`] = value
        }

        // init hooks must be called after constructor to avoid being overwritten by decorator code
        hooks.forEach((hook) => {
          if (typeof hook.init === 'function') {
            hook.init(set)
          }
        })
      }
    }
  }

  _applyProperties(el, transition, $route) {
    el.$route = $route
    const properties = this.$options.properties
    if (properties) Object.assign(el, properties)
    runPropertyHookMethod(transition, this, 'transition')
    const classProperties = this.constructor.__properties
    if (classProperties) {
      classProperties.forEach(({ name, to }) => {
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
