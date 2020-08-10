# Route Class

  The base class for defining routes. Extends from nextbone Events

## Methods

### <code>activate(transition) [-> Promise]</code>

 Called when route is currently inactive and about to be activated

 The transition argument provides information about the routes being
 transitioned to and methods to manipulate the transition like
 cancel and redirectTo

 If a Promise is returned, the route activation is complete only after
 the Promise is resolved. If the returned Promise is rejected, the transition will be cancelled 
 and children routes `activate` methods will not be called
 
### <code>load(transition) [-> Promise]</code>

 Called in transition regardless of the route active state 

 The transition argument provides information about the routes being
 transitioned to and methods to manipulate the transition like
 cancel and redirectTo

 If a Promise is returned, the route loadind is complete only after the 
 Promise resolution, being resolved or rejected. The children routes `load` methods
 will always be called independent of return Promise state.

### <code>deactivate(transition)</code>

 Called when route is active and about to be deactivated

 The transition argument provides information about the routes being
 transitioned to and methods to manipulate the transition like
 cancel and redirectTo

### <code>updateEl(transition)</code>

 Called when the element associated with the route is about to be re-rendered.

Allows to configure how a view already rendered will be updated. Returning
a truthy value will prevent the default behavior (render a new view)

### <code>prepareEl(el, transition)</code>

 Called when the element associated with the route is rendered.

Allows to configure the element being rendered. 

## Static Properties

### <code>component</code>

 Defines the HTMLElement or tag name that will be rendered when the route is activated

```js
class NoteRoute exends Route {
  static component = NoteLayoutView
};
```

### <code>childRoutes</code>

 A hash defining route definitions for children routes

```js
class NoteRoute extends Route {
 static childRoutes = {
    'note.list': NoteListRoute,
    'note.detail': NoteDetailRoute,
    'note.create': NoteCreateRoute
  }
};
```

### <code>providedContexts</code>

 A hash defining the contexts provided by the route.

 Each context can be defined as a static value by passing the value option or as a property of the route instance by passing the property option

```js
class NoteDetailRoute extends Route {
  static providedContexts = {
    noteModel: { property: 'noteModel' },
    theme: { value: 'black' }
  }
 
  activate(transition) {
    this.noteModel = new NoteModel({ id: parseInt(transition.params.noteId) });
    this.noteModel.fetch();
  }  
}
```

## Properties

### <code>context</code>
The route context object.

Accessing a property of it will retrieve the value from the provided context in parent routes

```js
class NoteEditRoute extends Route {
  static component = NoteEditView

  activate() { // see how noteModel context could be declared in providedContext documentation
    this.model = this.context.noteModel
  }
}
```

### <code>$router</code>
The router instance

### <code>$name</code>
The route name

### <code>$path</code>
The route path

### <code>$options</code>
The route options (the same declared in the route definition)