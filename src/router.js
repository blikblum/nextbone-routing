/**
 * Nextbone Routing
 *
 * Copyright © 2019 Luiz Américo Pereira Câmara. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.txt file in the root directory of this source tree.
 */

import { isEqual, isFunction, extend, pick } from 'underscore'
import { Router as SlickRouter } from 'slick-router'
import { routerLinks } from 'slick-router/middlewares/router-links'
import { Events } from 'nextbone'
import { Region } from 'nextbone/dom-utils'
import { Route, getComponent } from './route'

let instanceMap = Object.create(null)

let router

export class Router extends SlickRouter {
  constructor (options = {}) {
    if (router) {
      throw new Error('Instance of router already created')
    }
    super(options)
    this.middleware.push(middleware)
    this.use(routerLinks)
    router = this
  }

  destroy () {
    this.off()
    router = null
    instanceMap = Object.create(null)
    super.destroy()
  }
}

Events.extend(Router.prototype)

function getChangingIndex (prevRoutes, currentRoutes) {
  let index, prev, current
  const count = Math.max(prevRoutes.length, currentRoutes.length)
  for (index = 0; index < count; index++) {
    prev = prevRoutes[index]
    current = currentRoutes[index]
    if (!(prev && current) || (prev.name !== current.name) || !isEqual(prev.params, current.params)) {
      break
    }
  }
  return index
}

function findRouteClass (options, routeName, index, routes) {
  let result = options.class
  // look in parent routes
  if (!result) {
    const parentRoutes = routes.slice(0, index).reverse().map(function (route) {
      return instanceMap[route.name]
    })
    parentRoutes.some(function (route) {
      const childRoutes = route.constructor.childRoutes
      result = childRoutes && childRoutes[routeName]
      return result
    })
  }
  return result
}

function createRouteInstance (RouteClass = Route, route) {
  const options = route.options
  const classOptions = extend({}, options.classOptions)

  if (RouteClass.__esModule) RouteClass = RouteClass.default
  const result = new RouteClass(classOptions, router, route)
  result._deleteInstanceProperties()
  if (options.component) {
    result.component = options.component
  }
  return result
}

function resolveRoute (route, index, routes) {
  let RouteClass = findRouteClass(route.options, route.name, index, routes)
  if (isFunction(RouteClass) && !(RouteClass.prototype instanceof Route)) {
    // possible async route definition
    RouteClass = RouteClass.call(route)
    return Promise.resolve(RouteClass).then(function (result) {
      return result && createRouteInstance(result, route)
    })
  }
  return createRouteInstance(RouteClass, route)
}

function resolveRootOutlet () {
  const outletOption = router.options.outlet || 'app-root'
  const outlet = typeof outletOption === 'string' ? document.querySelector(outletOption) : outletOption

  if (outlet instanceof HTMLElement) {
    router.rootOutlet = new Region(outlet)
  } else if (outlet instanceof Region) {
    router.rootOutlet = outlet
  } else if (typeof outlet === 'function') {
    router.rootOutlet = outlet()
  }

  return router.rootOutlet
}

function getParentRegion (routes, route) {
  let region, parent
  let routeIndex = routes.indexOf(route) - 1
  while (routeIndex >= 0) {
    parent = routes[routeIndex]
    if (parent.el && parent.$options.outlet !== false) {
      region = parent.getOutlet()
      if (region) {
        return region
      } else {
        throw new Error(`No outlet region defined in ${parent.$name} route`)
      }
    } else {
      // remove el reference for outlet less routes
      parent.el = undefined
    }
    routeIndex--
  }
  return router.rootOutlet || resolveRootOutlet()
}

async function renderElements (instances, activated, transition) {
  // ensure at least the target (last) route is rendered
  const renderCandidates = activated.length ? activated : instances.slice(-1)

  const routeState = pick(transition, 'path', 'pathname', 'routes', 'params', 'query')
  const notRenderingCount = instances.length - renderCandidates.length
  for (let i = 0; i < notRenderingCount; i++) {
    const instance = instances[i]
    if (instance.el) {
      instance._applyProperties(instance.el, transition, routeState)
    }
  }

  const renderQueue = renderCandidates.reduce(function (memo, instance) {
    if (getComponent(instance)) {
      if (memo.length && memo[memo.length - 1].$options.outlet === false) {
        memo.pop()
      }
      memo.push(instance)
    }
    return memo
  }, [])

  for (const instance of renderQueue) {
    const parentRegion = getParentRegion(instances, instance)
    instance.renderEl(parentRegion, transition, routeState)
    await instance.el.updateComplete
  }
}

async function runAsyncMethod (transition, routes, method) {
  for (const route of routes) {
    router.trigger(`before:${method}`, transition, route)
  }

  for (const route of routes) {
    if (!transition.isCancelled) {
      const result = await route[method](transition)
      if (result === false) {
        transition.cancel()
      }
      if (!transition.isCancelled) {
        router.trigger(method, transition, route)
      }
    }
  }
}

function isActivatingRoute (route) {
  return this.activating && this.activating.indexOf(route) !== -1
}

function isTargetRoute (route) {
  return this.instances && this.instances.indexOf(route) === this.instances.length - 1
}

const middleware = {
  resolve: async function routeResolver (transition) {
    transition.isActivating = isActivatingRoute
    transition.isTarget = isTargetRoute

    router.trigger('before:transition', transition)

    if (transition.isCancelled) return

    const prevRoutes = transition.prev.routes
    const changingIndex = getChangingIndex(prevRoutes, transition.routes)
    const deactivated = []
    let routeIndex, routeInstance

    // deactivate previous routes
    for (routeIndex = prevRoutes.length - 1; routeIndex >= changingIndex; routeIndex--) {
      routeInstance = instanceMap[prevRoutes[routeIndex].name]
      if (routeInstance) {
        deactivated.push(routeInstance)
      }
    }

    await runAsyncMethod(transition, deactivated, 'deactivate')

    // build route tree and creating instances if necessary
    const instances = transition.instances = []

    for (let i = 0; i < transition.routes.length; i++) {
      const route = transition.routes[i]
      let instance = instanceMap[route.name]
      if (instance) {
        instances.push(instance)
      } else {
        instance = resolveRoute(route, i, transition.routes)
        const resolvedInstance = await instance
        instanceMap[route.name] = resolvedInstance
        resolvedInstance.$parent = instances[i - 1]
        instances.push(resolvedInstance)
      }
    }
    // activate routes in order
    const activated = transition.activating = instances.slice(changingIndex)

    await runAsyncMethod(transition, activated, 'activate')

    if (transition.isCancelled) return

    for (const instance of instances) {
      if (isFunction(instance.load)) {
        try {
          await instance.load(transition)
        } catch (error) {
        }
      }
    }

    deactivated.forEach(route => {
      if (activated.indexOf(route) === -1) {
        route.el = undefined
      }
    })

    await renderElements(instances, activated, transition)
  },

  done: function (transition) {
    router.state.instances = transition.instances
    router.trigger('transition', transition)
  },

  cancel: function (transition, err) {
    if (err.type !== 'TransitionRedirected') {
      router.trigger('transition:abort', transition, err)
    }
  },

  error: function (transition, err) {
    router.trigger('transition:abort', transition, err)
    router.trigger('transition:error', transition, err)
  }
}
