/**
 * Nextbone Routing
 *
 * Copyright © 2015-2024 Luiz Américo Pereira Câmara. All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.txt file in the root directory of this source tree.
 */

/**
 * @import { Transition } from 'slick-router/core.js'
 * @import { PropertyHook } from './route.js'
 *
 * @typedef { Transition } Transition
 * @typedef { PropertyHook } PropertyHook
 */

export { Route, elEvent, eventHandler, property, fromTransition } from './route'

export { Router } from './router'

export { bindRouterLinks } from 'slick-router/middlewares/router-links.js'
