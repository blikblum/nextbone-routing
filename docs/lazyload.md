# Route lazy loading

## Lazy load Route class

The route class can be loaded dynamically allowing the bundler to do "code splitting"

It's accomplished with a function that returns a ES promise which resolves to a Route class.
This function must be assigned to class option or to a childRoutes key in a parent route

Example extracted from [Nextbone Wires](https://github.com/blikblum/nextbone-wires):

Route map (the complete route map configuration must be defined upfront)
```javascript
function AsyncColorsRoute () {
  return import('../colors/route');
}
router.map(function (route) {
  route('app', {path: '/', class: ApplicationRoute, abstract: true}, function () {   
    route('colors', {path: 'colors', class: AsyncColorsRoute}, function () {
      route('colors.index', {path: 'index'});
      route('colors.create', {path: 'new'});
      route('colors.show', {path: ':colorid'});
      route('colors.edit', {path: ':colorid/edit'});
    });
    route('books', {path: 'books', class: BooksRoute}, function () {
      route('books.index', {path: 'index', component: BooksIndexView});
      route('books.show', {path: ':bookid', class: BooksShowRoute});
    });
  })
});
``` 

ColorsRoute
```javascript
import {Route} from 'nextbone-routing';
import ColorsIndexRoute from './index/route';
import ColorsShowRoute from './show/route';
import ColorsEditRoute from './edit/route';
import ColorsCreateRoute from './create/route';

export default class extends Route {
  static childRoutes = {
    'colors.index': ColorsIndexRoute,
    'colors.show': ColorsShowRoute,
    'colors.edit': ColorsEditRoute,
    'colors.create': ColorsCreateRoute
  }
};
```

Alternatively the async route could be defined in a parent route trough childRoutes property

ApplicationRoute (in childRoutes, a promise is returned for colors route)
```javascript
import {Route} from 'nextbone-routing';

export default class extends Route {
  static childRoutes = {
    colors: function () {
      return import('../colors/route');
    }
  }
};
```
  
With the above setup, all code referenced by ColorsRoute, including its children routes, will be 
saved in a separated bundle and will be loaded only after 'colors' or one of its children routes are
visited for the first time

## Lazy load component

The component can also be lazy loaded. An async function that resolves to a HTMLElement class or an web component tag name must be set to the `component` option.

```js
async function AsyncTasksComponent() {
  const { TasksComponent } = await import('./tasks-component.js')
  return TasksComponent
}

async function AsyncRegisterComponent() {
  await import('./register-component.js')
  return 'register-component'
}

const routes = function (route) {
  route('register', { component: AsyncRegisterComponent })
  route('tasks', { component: AsyncTasksComponent })
}
```