/**
 * Nextbone Routing
 *
 * Copyright © 2019 Luiz Américo Pereira Câmara. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.txt file in the root directory of this source tree.
 */

import { isEqual, isFunction, extend } from 'underscore'
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
    let { outlet = 'app-root' } = options
    if (outlet) {
      if (typeof outlet === 'string') {
        outlet = document.querySelector(outlet)
      }
      if (outlet instanceof HTMLElement) {
        this.rootOutlet = new Region(outlet)
      } else if (outlet instanceof Region) {
        this.rootOutlet = outlet
      } else {
        throw new Error(`Router: invalid outlet argument: ${outlet}`)
      }
    }
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
  return router.rootOutlet
}

const resolved = Promise.resolve()

function renderElements (instances, activated, transition) {
  // ensure at least the target (last) route is rendered
  const renderCandidates = activated.length ? activated : instances.slice(-1)

  const renderQueue = renderCandidates.reduce(function (memo, instance) {
    if (getComponent(instance)) {
      if (memo.length && memo[memo.length - 1].$options.outlet === false) {
        memo.pop()
      }
      memo.push(instance)
    }
    return memo
  }, [])

  renderQueue.reduce((prevPromise, instance) => {
    let parentRegion
    if (prevPromise) {
      return prevPromise.then(function () {
        parentRegion = getParentRegion(instances, instance)
        instance.renderEl(parentRegion, transition)
        return instance.el.updateComplete
      }).catch(function () {
        parentRegion = getParentRegion(instances, instance)
        instance.renderEl(parentRegion, transition)
        return instance.el.updateComplete
      })
    }
    parentRegion = getParentRegion(instances, instance)
    instance.renderEl(parentRegion, transition)
    return instance.el.updateComplete
  }, undefined)
}

function runAsyncMethod (transition, routes, method) {
  return routes.reduce(function (prevPromise, instance) {
    router.trigger(`before:${method}`, transition, instance)
    return prevPromise.then(function () {
      if (!transition.isCancelled) {
        return Promise.resolve(instance[method](transition)).then(function (result) {
          if (result === false) {
            transition.cancel()
          }
          if (!transition.isCancelled) {
            router.trigger(method, transition, instance)
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
  return this.instances && this.instances.indexOf(route) === this.instances.length - 1
}

const middleware = {
  resolve: function routeResolver (transition) {
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

    let promise = runAsyncMethod(transition, deactivated, 'deactivate')

    // build route tree and creating instances if necessary
    const instances = transition.instances = []

    promise = promise.then(() => {
      return transition.routes.reduce(function (acc, route, i, routes) {
        return acc.then(function (res) {
          let instance = instanceMap[route.name]
          if (instance) {
            res.push(instance)
            return res
          } else {
            instance = resolveRoute(route, i, routes)
            return Promise.resolve(instance).then(function (resolvedInstance) {
              if (!resolvedInstance) {
                throw new Error(`Unable to create route ${route.name}: class or component must be defined`)
              }
              instanceMap[route.name] = resolvedInstance
              resolvedInstance.$parent = res[i - 1]
              res.push(resolvedInstance)
              return res
            })
          }
        })
      }, Promise.resolve(instances))
    })

    // activate routes in order
    let activated

    promise = promise.then(function () {
      activated = transition.activating = instances.slice(changingIndex)
      return runAsyncMethod(transition, activated, 'activate')
    })

    // render components
    return promise.then(function () {
      if (transition.isCancelled) return

      const loadPromise = instances.reduce(function (prevPromise, instance) {
        if (isFunction(instance.load)) {
          if (prevPromise) {
            return prevPromise.then(function () {
              return Promise.resolve(instance.load(transition))
            }).catch(function () {
              return Promise.resolve(instance.load(transition))
            })
          } else {
            return Promise.resolve(instance.load(transition))
          }
        }
        return prevPromise
      }, undefined)

      deactivated.forEach(route => {
        if (activated.indexOf(route) === -1) {
          route.el = undefined
        }
      })

      if (loadPromise) {
        return new Promise(function (resolve) {
          loadPromise.then(function () {
            renderElements(instances, activated, transition)
            resolve()
          }).catch(function () {
            renderElements(instances, activated, transition)
            resolve()
          })
        })
      } else {
        renderElements(instances, activated, transition)
      }
    })
  },

  done: function (transition) {
    router.state.instances = transition.instances
    transition.instances.forEach((route) => {
      if (route.el) {
        route.el.$route = router.state
      }
    })
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
