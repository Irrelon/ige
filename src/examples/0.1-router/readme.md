# Router Demo
This demo gives an example of how to use the routing system
built into IGE version 3.

Routing allows you to automatically build up and tear down
textures and scenes based on a path / route.

For instance in this demo, we load the `app/splash` route
and when the user clicks the login button, we
navigate to the `app/login` route.

Both of the routes are child routes of the "app" route.
The `app` route loads a base scene and since navigating
from `app/splash` to `app/login` doesn't navigate away
from `app`, the `app` route scene stays in the scenegraph.

When navigating each part of the route is loaded before the
next one, with each route signalling when it is ready by
resolving its async/promise.

app -> AppScene.ts
|--splash -> AppSplashScene.ts
|--login  -> AppLoginScene.ts

The scenegraph from AppScene.ts stays mounted because we don't
navigate away from `app`.

This demo is a client-side only demo. Load the index.html file.
