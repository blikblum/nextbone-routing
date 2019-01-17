import { Events } from 'nextbone'
import { Channel } from 'nextbone-radio'
import { bindEvents } from './utils/bind-events'
import { bindRequests } from './utils/bind-requests'
import { Region } from './utils/region'
import RouteContext from './routecontext'
import { getMnRoutes, routerChannel } from './cherrytree-adapter'

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

export default class Route extends Events {
  constructor (classOptions, router, { name, path, options }) {
    super()
    this.$router = router
    this.$name = name
    this.$path = path
    this.$options = options
    this._bindContext()
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
    routerChannel.trigger('route:render', this)
  }

  updateEl () {

  }

  getContext () {
    // todo: cache context??
    let state = this.$router.state
    let mnRoutes = (state.activeTransition || state).mnRoutes
    if (!mnRoutes) {
      mnRoutes = getMnRoutes(state.routes)
    }
    return new RouteContext(mnRoutes, this)
  }

  getOutlet () {
    let outletRegion = outletRegionMap.get(this.el)
    if (!outletRegion) {
      const root = this.el.shadowRoot ? this.el.shadowRoot : this.el
      const selector = this.constructor.outletSelector || 'router-outlet'
      const el = root.querySelector(selector)
      if (el) {
        outletRegion = new Region(el)
        outletRegionMap.set(this.el, outletRegion)
      }
    }
    return outletRegion
  }

  _bindContext () {
    const requests = this.constructor.contextRequests
    const events = this.constructor.contextEvents
    let channel
    if (!requests && !events) {
      return
    }

    this._contextChannel = channel = new Channel('__routeContext_' + this.cid)

    bindRequests.call(this, channel, requests)
    bindEvents.call(this, channel, events)
  }

  destroy () {
    this.stopListening()
  }
}
