# Router Configuration

## `Router` class
  
 Descends from slick-router Router class. Accepts an options hash as argument:

| Option           | Default               | Description                                                                                                                                                                              |
| ---------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `routes`            | `undefined`                | The routes definitions (declared as function callbacks or array). Can be defined later using `map`       | mathos
| `log`            | `undefined`                | Called with logging info - takes `true`, `false` or a custom logging function                                                                                                            |
| `logError`       | `true`                | Called when transitions error (except `TransitionRedirected` and `TransitionCancelled`). Takes `true`, `false`, or a custom function                                                     |
| `pushState`      | `false`               | Use browser History API or the default hash change                                                                                                                                       |
| `root`           | `/`                   | Used in combination with `pushState: true` - if your app isn't served from `/`, pass the new root                                                                                        |
| `qs`             | `object`              | The parser function for query strings with a simple parser. Pass in an object with `parse` and `stringify` functions to customize the handling of query strings.                         |


```js
const router = new Router({log: true});
```

## `router.map(fn)`

Configures the route map. e.g.


```js
// with function callback notation
router.map(function (route) {
  route('app', {path: '/'}, function () {
    route('about', {component: AboutComponent, properties: {version: '1.0'}})
    route('post', {path: ':postId', class: PostRoute}, function () {
      route('post.edit', {class: PostRoute, component: 'post-editor'})
    })
  })
})

// or with array notation
const routes = [
  { 
    name: 'app',
    path: '/',
    children: [
      {
        name: 'about',
        component: AboutComponent, 
        properties: { version: '1.0' }
      },
      {
        name: 'post',
        class: PostRoute,
        path: ':postId',
        children: [
          {
            name: 'post.edit',
            class: PostRoute, 
            component: 'post-editor'
          }
        ]
      }
    ]
  }
]

router.map(routes)
```

Each route can be configure with the following options:

 * `name`: the route name. Must be unique among all routes
 * `class`: a [`Route`](./route.md) class or an async function that resolves to one
 * `classOptions`: options passed to the Route constructor
 * `component`: a `HTMLElement` class, a web component tag name or an async function that resolves to one a `HTMLElement` class or a tag name. Can be used alone or with `class`
 * `properties`: options assigned to the created component instance
 * `path`: the route path. If omitted, the name will be used as path
 * `outlet`: pass false to allow a component without an `outlet` region

**Is possible to define a route without component and class.**

For more information about route mapping refer to slick-router documentation

## `router.listen`

 Starts listening for URL changes


## `router.destroy`

  Cleanup a router. This is mostly used for testing.
