/* global history */
/**
 * Marionette Routing
 *
 * Copyright © 2015-2016 Luiz Américo Pereira Câmara. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.txt file in the root directory of this source tree.
 */

import { isEqual, isFunction, extend } from 'underscore'
import Cherrytree from 'cherrytreex'
import Route, { getComponent } from './route'
import { Region } from './utils/region'
import { Events } from 'nextbone'

let mnRouteMap = Object.create(null)

export let router

export function Router (options, renderRoot) {
  if (router) {
    throw new Error('Instance of router already created')
  }
  Cherrytree.call(this, options)
  this.middleware.push(middleware)
  if (renderRoot) {
    if (typeof renderRoot === 'string') {
      renderRoot = document.querySelector(renderRoot)
    }
    if (renderRoot instanceof HTMLElement) {
      this.rootRegion = new Region(renderRoot)
    } else if (renderRoot instanceof Region) {
      this.rootRegion = renderRoot
    } else {
      throw new Error(`Invalid renderRoot argument: ${renderRoot}`)
    }
  }
  router = this
}

Router.prototype = Object.create(Cherrytree.prototype)
Router.prototype.constructor = Router

Router.prototype.use = function (customMiddleware, options = {}) {
  const m = typeof customMiddleware === 'function' ? { next: customMiddleware } : customMiddleware
  if (options.before) {
    this.middleware.splice(this.middleware.indexOf(middleware), 0, m)
  } else {
    this.middleware.push(m)
  }
  return this
}

Router.prototype.destroy = function () {
  this.off()
  router = null
  mnRouteMap = Object.create(null)
  Cherrytree.prototype.destroy.call(this)
}

Events.extend(Router.prototype)

export function getMnRoutes (routes) {
  return routes.map(function (route) {
    return mnRouteMap[route.name]
  })
}

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
      return mnRouteMap[route.name]
    })
    parentRoutes.some(function (route) {
      let childRoutes = route.constructor.childRoutes
      result = childRoutes && childRoutes[routeName]
      return result
    })
  }
  return result
}

function createRouteInstance (RouteClass, route) {
  const options = route.options
  const classOptions = extend({}, options.classOptions)
  if (!RouteClass && options.component) {
    RouteClass = Route
  }
  if (RouteClass) {
    if (RouteClass.__esModule) RouteClass = RouteClass.default
    const result = new RouteClass(classOptions, router, route)
    if (options.component) {
      result.component = options.component
    }
    return result
  }
}

function createMnRoute (route, index, routes) {
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
  return router.rootRegion
}

const resolved = Promise.resolve()

function renderElements (mnRoutes, activated, transition) {
  // ensure at least the target (last) route is rendered
  let renderCandidates = activated.length ? activated : mnRoutes.slice(-1)

  let renderQueue = renderCandidates.reduce(function (memo, mnRoute) {
    if (getComponent(mnRoute)) {
      if (memo.length && memo[memo.length - 1].$options.outlet === false) {
        memo.pop()
      }
      memo.push(mnRoute)
    }
    return memo
  }, [])

  renderQueue.reduce((prevPromise, mnRoute) => {
    let parentRegion
    if (prevPromise) {
      return prevPromise.then(function () {
        parentRegion = getParentRegion(mnRoutes, mnRoute)
        mnRoute.renderEl(parentRegion, transition)
        return mnRoute.el.updateComplete
      }).catch(function () {
        parentRegion = getParentRegion(mnRoutes, mnRoute)
        mnRoute.renderEl(parentRegion, transition)
        return mnRoute.el.updateComplete
      })
    }
    parentRegion = getParentRegion(mnRoutes, mnRoute)
    mnRoute.renderEl(parentRegion, transition)
    return mnRoute.el.updateComplete
  }, undefined)
}

function runAsyncMethod (transition, routes, method) {
  return routes.reduce(function (prevPromise, mnRoute) {
    router.trigger(`before:${method}`, transition, mnRoute)
    return prevPromise.then(function () {
      if (!transition.isCancelled) {
        return Promise.resolve(mnRoute[method](transition)).then(function () {
          if (!transition.isCancelled) {
            router.trigger(method, transition, mnRoute)
          }
        })
      }
    })
  }, resolved)
}

function isActivatingRoute (route) {
  return this.activating && this.activating.indexOf(route) !== -1
}

function isTargetRoute (route) {
  return this.mnRoutes && this.mnRoutes.indexOf(route) === this.mnRoutes.length - 1
}

const middleware = {
  next: function routeResolver (transition) {
    transition.isActivating = isActivatingRoute
    transition.isTarget = isTargetRoute

    router.trigger('before:transition', transition)

    if (transition.isCancelled) return

    let prevRoutes = transition.prev.routes
    let changingIndex = getChangingIndex(prevRoutes, transition.routes)
    let deactivated = []
    let routeIndex, routeInstance

    // deactivate previous routes
    for (routeIndex = prevRoutes.length - 1; routeIndex >= changingIndex; routeIndex--) {
      routeInstance = mnRouteMap[prevRoutes[routeIndex].name]
      if (routeInstance) {
        deactivated.push(routeInstance)
      }
    }

    let promise = runAsyncMethod(transition, deactivated, 'deactivate')

    // build route tree and creating instances if necessary
    let mnRoutes = transition.mnRoutes = []

    promise = promise.then(() => {
      return transition.routes.reduce(function (acc, route, i, routes) {
        return acc.then(function (res) {
          let instance = mnRouteMap[route.name]
          if (instance) {
            res.push(instance)
            return res
          } else {
            instance = createMnRoute(route, i, routes)
            return Promise.resolve(instance).then(function (mnRoute) {
              if (!mnRoute) {
                throw new Error(`Unable to create route ${route.name}: class or component must be defined`)
              }
              mnRouteMap[route.name] = mnRoute
              res.push(mnRoute)
              return res
            })
          }
        })
      }, Promise.resolve(mnRoutes))
    })

    // activate routes in order
    let activated

    promise = promise.then(function () {
      activated = transition.activating = mnRoutes.slice(changingIndex)
      return runAsyncMethod(transition, activated, 'activate')
    })

    promise.catch(() => {
      // catch errors occurred inside routing classes / methods
      // Should be handled in error event or in a transition.catch method
    })

    // render components
    return promise.then(function () {
      if (transition.isCancelled) return

      let loadPromise = mnRoutes.reduce(function (prevPromise, mnRoute) {
        if (isFunction(mnRoute.load)) {
          if (prevPromise) {
            return prevPromise.then(function () {
              return Promise.resolve(mnRoute.load(transition))
            }).catch(function () {
              return Promise.resolve(mnRoute.load(transition))
            })
          } else {
            return Promise.resolve(mnRoute.load(transition))
          }
        }
        return prevPromise
      }, undefined)

      deactivated.forEach(route => { route.el = undefined })

      if (loadPromise) {
        return new Promise(function (resolve) {
          loadPromise.then(function () {
            renderElements(mnRoutes, activated, transition)
            resolve()
          }).catch(function () {
            renderElements(mnRoutes, activated, transition)
            resolve()
          })
        })
      } else {
        renderElements(mnRoutes, activated, transition)
      }
    })
  },

  done: function (transition) {
    router.state.mnRoutes = transition.mnRoutes
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
