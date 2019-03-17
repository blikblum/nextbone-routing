import { getMnRoutes } from './cherrytree-adapter'

export function findContext (route, property) {
  const state = route.$router.state
  let mnRoutes = (state.activeTransition || state).mnRoutes
  if (!mnRoutes) {
    mnRoutes = getMnRoutes(state.routes)
  }
  const routeIndex = mnRoutes.indexOf(route)
  const parentRoutes = mnRoutes.slice(0, routeIndex)
  for (let i = parentRoutes.length - 1; i >= 0; i--) {
    const parentRoute = parentRoutes[i]
    const providedContexts = parentRoute.constructor.providedContexts
    const contextDef = providedContexts && providedContexts[property]
    if (contextDef) {
      return contextDef.property ? parentRoute[contextDef.property] : contextDef.value
    }
  }
}
