# Nextbone Routing

[![NPM version](http://img.shields.io/npm/v/nextbone-routing.svg?style=flat-square)](https://www.npmjs.com/package/nextbone-routing)
[![NPM downloads](http://img.shields.io/npm/dm/nextbone-routing.svg?style=flat-square)](https://www.npmjs.com/package/nextbone-routing)
[![Build Status](http://img.shields.io/travis/blikblum/nextbone-routing.svg?style=flat-square)](https://travis-ci.org/blikblum/nextbone-routing)
[![Dependency Status](http://img.shields.io/david/dev/blikblum/nextbone-routing.svg?style=flat-square)](https://david-dm.org/blikblum/nextbone-routing#info=devDependencies)

> An advanced router for Web Components

### Features

&nbsp; &nbsp; ✓ Nested routes / states / rendering<br>
&nbsp; &nbsp; ✓ Handles asynchronous data fetching<br>
&nbsp; &nbsp; ✓ Lazy loading of routes with code splitting<br>
&nbsp; &nbsp; ✓ Exposes events through a pub/sub mechanism<br>
&nbsp; &nbsp; ✓ Implements route context for scoped messaging<br>
&nbsp; &nbsp; ✓ Handles nested asynchronous rendering (LitElement, SkateJs)<br>
&nbsp; &nbsp; ✓ Automatic configuration of router links<br>
&nbsp; &nbsp; ✓ Inherits from [Slick Router](https://github.com/blikblum/slick-router)<br>
&nbsp; &nbsp; ✓ Minimal dependencies: slick-router and Events class from [nextbone](https://github.com/blikblum/nextbone)<br>


### Installation

    $ npm install --save nextbone-routing nextbone lodash-es

Requires a ES6 Promise implementation attached in window (native or polyfill)

### Usage

Configure and start the router

```js
import { Router } from 'nextbone-routing'
import LoginComponent from './login/component'
import ContactsRoute from './contacts/route'

function AsyncTasksRoute() {
  return import('./tasks/route.js')
}

async function AsyncRegisterComponent() {
  await import('./register-component.js')
  return 'register-component'
}

// callback function that defines the route tree
// can be defined also as an array
const routes = function (route) {
  route('application', { path: '/' }, function () {
    route('home', { path: '', component: 'home-component' }) // define component with a tag name...
    route('login', { component: LoginComponent }) // ... or with a constructor
    route('register', { component: AsyncRegisterComponent }) // lazy load component definition
    route('contacts', { class: ContactsRoute }) // define a route class that can control lifecycle and component
    route('tasks', { class: AsyncTasksRoute }) // lazy load a route class. Webpack and Rollup does code splitting 
  })
}

const router = new Router({
  routes,
  outlet: '#app-container', // element where the root routes will be rendered. Can be an HTML element instance, a selector or a function returning a HTML element
  log: true, 
  logError: true
});

//start listening to URL changes
router.listen();

//listen an react to events
router.on('before:activate', function(transition, route) {
  const isAuthenticate = checkAuth();
  if (!isAuthenticate && route.requiresAuth) {
    transition.redirectTo('login');
  }
})
```

Define a Route class

```js
import { Route } from 'nextbone-routing';
import { API } from '../data-api';
import ContactsComponent from './component';

export default class extends Route {
  static component = ContactsComponent,

  activate(){
    // the route children will only be activated after API.getContactList is resolved 
    return API.getContactList().then(contacts => {
      this.contacts = contacts
    });
  }

  prepareEl(el) {
    // called just after creating the element and before rendering the element
    // @property decorator can also be used to bind route properties to el
    el.contacts = this.contacts
  }
})
```


### Documentation

* API
  * [Router Configuration](docs/configuration.md)
  * [Route Class](docs/route.md)
  * [Events](docs/events.md)
  * [RouterLink](docs/routerlink.md)
* Guides
  * [Route lazy loading](docs/lazyload.md)
  * [Managing authorization](docs/authorization.md)
  * [Handling errors](docs/errors.md)

### Examples

 * [Contact Manager](https://github.com/blikblum/nextbone-contact-manager) Example of data down / events up pattern
 * [Nextbone Wires](https://github.com/blikblum/nextbone-wires) Shows code lazy loading and route animation 

### Related Projects

* [Marionette Routing](https://github.com/blikblum/marionette.routing) — Original project

### License

Copyright © 2020 Luiz Américo Pereira Câmara. This source code is licensed under the MIT license found in
the [LICENSE.txt](https://github.com/blikblum/nextbone-routing/blob/master/LICENSE.txt) file.
The documentation to the project is licensed under the [CC BY-SA 4.0](http://creativecommons.org/licenses/by-sa/4.0/)
license.
