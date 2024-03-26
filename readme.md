# Isogenic Game Engine

HTML5 2D and isometric scenegraph-based game engine written entirely in TypeScript / JavaScript.

## Main Features

- Full un-obfuscated source code
- Advanced networking system with built-in server
- Particle system
- Scenegraph-based
- Tile maps
- Box2D physics component for easy integration with 2d and isometric games
- Multiple viewport support
- Tweening support
- Cell-based animation support
- Native and font-sheet text support
- WebGPU support is incoming, currently all the above renders using canvas 2d context

## Latest Updates & Changelog

### Version 3.0.2

#### Module Based Import

From version 3.0.1 the engine expects to be installed into a project and used as
a module via npm:

```bash
npm i @irrelon/ige
```

You should use the engine via an import statement:

```typescript
import { ige } from "@irrelon/ige";
```

#### Streaming Transform Data

The stream code has been updated so any transform data (translate, rotate and scale)
sent to the client/s by the server are no longer directly assigned via
`this._translate.x = streamData.x` and instead are passed to the transform method
related to the data e.g. `this.translateTo(streamData.x, streamData.y, streamData.z);`

The same goes for rotateTo() and scaleTo(). This is so that code is written that
overrides those base class methods will get called correctly when the streamed
entity is transformed. Previously there was no way to detect that a transform had
changed by streaming data.

#### IGE Initialisation

> The optional modules you can call uses() for are currently:
> `network`, `audio`, `box2d`, `tweening` and `ui`

The engine expects you to specify some of the previously auto-included modules
that are now optional, then wait for them to load. For instance, if your app
is using networking you should tell the engine about that up front via

```typescript
ige.uses("network");
```

You should call this for each module you wish to use before calling `ige.init();`.

After you've specified all the modules via uses() calls, you need to call `init()`
and then wait for the isReady signal before proceeding further:

```typescript
ige.uses("network");
ige.uses("ui");

// Now tell the engine we are OK to proceed, having declared what we want to use
ige.init();

// Now wait for the engine
ige.isReady().then(() => {
	// Proceed with the rest of your code
});
```

### Version 3.0.0

The original engine was written over 12 years ago, and it is a testament to that work
that it is still by far the most feature-rich browser-based game engine available today.
There is still NO OTHER engine that supports realtime multiplayer streaming out of the
box written purely in JavaScript in a 2d and isometric rendering engine.

With all that said, it's 2024 and back in 2011, ES classes, ES modules, TypeScript, webpack
etc did not exist. As such, language functionality such as classes were custom-created to
facilitate an inheritance-style codebase. This was great, as was the magic of using ES
classes years before they even existed, but now we have native functionality in JavaScript,
a rewrite of the engine needs to happen to make use of that new functionality.

Minor changes exist as well as some breaking changes (such as the removal of ClientConfig
and ServerConfig files) that were ultimately made to increase functionality or update
anachronistic coding patterns to more modern expectations.

**The major changes are:**

The built-in compiler is no longer required since `import` now exists in browsers natively,
so it is no longer a requirement to compile using the engine's compiler to get a runnable
project / game. You should code with ES modules `import` and `export`, not CommonJS `require`
and `module.exports` (although CommonJS is still currently supported).

The node.js server-side executable system that ran IGE on your server for multiplayer support
has been removed as the isomorphic JavaScript output runs natively in Node.js - again due to
the support for ES modules, ES classes and there is no need to "package" projects / games
anymore! :)

The `ClientConfig.js` and `ServerConfig.js` are no longer required and can be removed everywhere.
The engine simply uses ES module imports and exports now, directly in the files that need them.

Many of the examples in the `examples` folder have been converted to TypeScript and ES modules
although this work is still ongoing. You can tell which ones can be run because there will be an
`index.ts` rather than only an `index.js` file. Examples might be in a broken state for a while
but focus has been on the core functionality of the engine and bringing it up to modern standards
of code rather than updating example code for the moment.

## Developing / Building / Modifying the Engine

> This is only required if you intend to make changes to the core engine. If you only
> want to use the engine in a project, you do not need to clone the repo from GitHub
> since you can use the engine via `npm i @irrelon/ige` and then import it normally.

After downloading or cloning this repository, please change to the folder you cloned
the repository to and then run:

```bash
npm i
```

You must have Node.js installed for the installation to work. This version of the engine
has been tested against Node.js 16.13.1 and higher.

### Compiling the Engine from Source

> Run the `build` npm command will compile the TypeScript to JavaScript files.
> The `build` command also runs `npx @irrelon/fix-paths` to automatically resolve
> TypeScript paths e.g. `@/engine/something` in .js files to their relative
> equivalents like `../engine/something`.

```bash
npm run build
```

The resulting build will be available in the `dist` folder. The `docs` folder will
also update during the build to output JSDoc compatible documentation.

## Examples

There are a lot of examples in the ./examples folder. Please see the ./examples/readme.md
file for more information about running the examples.

## Documentation

https://www.isogenicengine.com/docs-manual.html

## Feedback & Support

If you have any comments, questions, requests etc. you can post on the GitHub issue tracker.

## Gotcha Hints

### Create IGE App Helper

A `create-ige-app` npx script is on the way as well, almost ready! This will
create a basic app with the webpack and Node.js setup to create games with
this version of the engine without configuring all the things yourself.
This will also support templates, so we can get started on something faster.

### UI Entities

When working with the provided UI classes (IgeUiEntity and IgeUiElement) it's important to
understand the differences. IgeUiElement instances stop pointer even propagation by default.
This means if you mount one IgeUiElement inside another one, only the parent will get
pointer events like pointerDown and pointerUp.

IgeUiEntity instances have the same general capabilities but are considered graphical rather
than interactive so don't hook or interfere with pointer events by default.

## License

MIT

## Intellectual Property, Ownership & Copyright

(C)opyright 2023 Irrelon Software Limited
https://www.irrelon.com

* Website: https://www.isogenicengine.com
* Download: https://www.isogenicengine.com/download.html
* API Docs: https://www.isogenicengine.com/docs-reference.html
* Twitter: @IsogenicEngine https://twitter.com/IsogenicEngine
* Youtube: http://www.youtube.com/user/coolbloke1324
