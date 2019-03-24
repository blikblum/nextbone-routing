# Nextbone Routing

[![NPM version](http://img.shields.io/npm/v/nextbone-routing.svg?style=flat-square)](https://www.npmjs.com/package/nextbone-routing)
[![NPM downloads](http://img.shields.io/npm/dm/nextbone-routing.svg?style=flat-square)](https://www.npmjs.com/package/nextbone-routing)
[![Build Status](http://img.shields.io/travis/blikblum/nextbone-routing.svg?style=flat-square)](https://travis-ci.org/blikblum/nextbone-routing)
[![Coverage Status](https://img.shields.io/coveralls/blikblum/nextbone-routing.svg?style=flat-square)](https://coveralls.io/github/blikblum/nextbone-routing)
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
&nbsp; &nbsp; ✓ Inherits [Cherrytree](https://github.com/QubitProducts/cherrytree) features<br>
&nbsp; &nbsp; ✓ Minimal dependencies: an optimized Cherrytree fork and Events/delegate from [nextbone](https://github.com/blikblum/nextbone)<br>


### Installation

    $ npm install --save nextbone-routing nextbone

Requires a ES6 Promise implementation attached in window (native or polyfill)

### Usage

Configure and start the router

```js
import { Router } from 'nextbone-routing'
import LoginComponent from './login/component'
import ContactsRoute from './contacts/route'

function TasksRoute() {
  return import('./tasks/route')
}

// callback function that defines the route tree
// can be defined also as an array
const routes = function (route) {
  route('application', { path: '/', abstract: true }, function () {
    route('home', { path: '', component: 'home-component' }) // define component with a tag name...
    route('login', { component: LoginComponent }) // ... or with a constructor
    route('contacts', { class: ContactsRoute }) // define a route class that can control lifecycle and component
    route('tasks', { class: TasksRoute }) // lazy load a route class. Webpack and Rollup does code splitting 
  })
}

const router = new Router({
  routes,
  outlet: '#app-container', // element where the root routes will be rendered
  log: true, 
  logError: true
});

//start listening to URL changes
router.listen();

//listen an react to events
router.on('before:activate', function(transition, route) {
  let isAuthenticate = checkAuth();
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
    // called just after creating the element
    super.prepareEl(el)
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

 * [Contact Manager](https://github.com/blikblum/marionette-contact-manager) Fully functional example. Read the [tutorial](http://jsroad.blogspot.com.br/2016/11/tutorial-contact-manager-application.html)
 * [Marionette Wires Revisited](https://github.com/blikblum/marionette-wires-revisited)

### Related Projects

* [Cherrytree](https://github.com/QubitProducts/cherrytree) — The router library used by Marionette Routing under the hood 
* [Marionette Routing](https://github.com/blikblum/marionette.routing) — Original project


### License

Copyright © 2019 Luiz Américo Pereira Câmara. This source code is licensed under the MIT license found in
the [LICENSE.txt](https://github.com/blikblum/nextbone-routing/blob/master/LICENSE.txt) file.
The documentation to the project is licensed under the [CC BY-SA 4.0](http://creativecommons.org/licenses/by-sa/4.0/)
license.
