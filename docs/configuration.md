# Router Configuration

## `Router` class
  
 Descends from slick-router Router class. Accepts an options hash as argument:

| Option           | Default               | Description                                                                                                                                                                              |
| ---------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `log`            | `noop`                | Called with logging info - takes `true`, `false` or a custom logging function                                                                                                            |
| `logError`       | `true`                | Called when transitions error (except `TransitionRedirected` and `TransitionCancelled`). Takes `true`, `false`, or a custom function                                                     |
| `pushState`      | `false`               | Use browser History API or the default hash change                                                                                                                                       |
| `root`           | `/`                   | Used in combination with `pushState: true` - if your app isn't served from `/`, pass the new root                                                                                        |
| `interceptLinks` | (same as `pushState`) | When `pushState: true` this intercepts all link clicks, preventing the default behavior. This can take a function to set custom behavior - see [intercepting links](#intercepting-links) |
| `qs`             | `object`              | The parser function for query strings with a simple parser. Pass in an object with `parse` and `stringify` functions to customize the handling of query strings.                         |


```js
const router = new Router({log: true});
```

## `router.map(fn)`

Configures the route map. e.g.

```js
router.map(function (route) {
  route('app', {path: '/', abstract: true}, function () {
    route('about', {component: AboutView, viewOptions: {version: '1.0'}})
    route('post', {path: ':postId', class: PostRoute}, function () {
      route('edit', {class: PostRoute, component: EditPostView})
    })
  })
})
```

Each route can be configure with the following options:

 * `class`: a [`Route`](./route.md) class
 * `classOptions`: options passed to the Route constructor
 * `component`: a `HTMLElement` class or a tag name of a web component. Can be used alone or with `class`
 * `properties`: options assigned to the rendered component
 * `path`: the route path
 * `abstract`: pass true to define an abstract route
 * `outlet`: pass false to allow a component without an `outlet` region

**Is possible to define a route without component and class.**

For more information about route mapping refer to slick-router documentation

## `router.listen`

 Starts listening for URL changes


## `router.destroy`

  Cleanup a router. This is mostly used for testing.
