> This is a beta branch at present. It is a re-write utilising TypeScript
> and compiling to both CommonJS (for Node.js) and ESM modules (for Webpack).
> Client and server-side rendering are working and various examples have been
> updated. If you see an index.ts in an example folder, it's been updated to
> work with ES6 modules.
>
> Compiling the engine: run the `build` npm command will compile the TypeScript
> to JavaScript files. The `build` command also runs `npx @irrelon/fix-paths` to
> automatically resolve TypeScript paths e.g. `@/engine/something` in .js files
> to their relative equivalents.
>
> From version 3.0.1 you can use the engine with `import { ige } from "@irrelon/ige";`
>
> All the engine's classes, functionality, types etc. are exported from that module
> and can be imported as required.
>
> A `create-ige-app` npx script is on the way as well, almost ready! This will
> create a basic app with the webpack and Node.js setup to create games with
> this version of the engine without configuring all the things yourself.
> This will also support templates, so we can get started on something faster.

#### Breaking Changes in This Version

##### Streaming Transform Data

The stream code has been updated so any transform data (translate, rotate and scale)
sent to the client/s by the server are no longer directly assigned via
`this._translate.x = streamData.x` and instead are passed to the transform method
related to the data e.g. `this.translateTo(streamData.x, streamData.y, streamData.z);`

The same goes for rotateTo() and scaleTo(). This is so that code is written that
overrides those base class methods will get called correctly when the streamed
entity is transformed. Previously there was no way to detect that a transform had
changed by streaming data.

##### IGE initialisation

> The optional modules you can call uses() for are currently:
> `network`, `audio`, `box2d`, `tweening` and `ui`

The engine expects you to specify some of the previously auto-included modules
that are now optional, then wait for them to load. For instance, if your app
is using networking you should tell the engine about that up front via

```typescript
ige.uses("engine");
```

After you've specified all the modules via uses() calls, you need to call init()
and then wait for the isReady signal before proceeding further.

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

# Isogenic Game Engine

HTML5 2D and isometric scenegraph-based game engine written entirely in TypeScript.

## Latest Updates & Changelog

https://www.isogenicengine.com/forum/viewforum.php?f=8

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

## Installation

After downloading or cloning this repository, please change to the folder you cloned the
repository to and then run:

```bash
npm i
```

You must have Node.js installed for the installation to work.
This version of the engine has been tested against Node.js 16.13.1.

## Examples

There are a lot of examples in the ./examples folder. Please see the ./examples/readme.md
file for more information about running the examples.

## Documentation

https://www.isogenicengine.com/docs-manual.html

## Feedback & Support

If you have any comments, questions, requests etc. you can post on the GitHub issue tracker.

## License

MIT

## Intellectual Property, Ownership & Copyright

(C)opyright 2023 Irrelon Software Limited
https://www.irrelon.com

- Website: https://www.isogenicengine.com
- API Docs: https://www.isogenicengine.com/docs-reference.html
- Video Tutorials: https://www.isogenicengine.com/docs-tutorials.html
- Twitter: @IsogenicEngine https://twitter.com/IsogenicEngine
- Youtube: https://www.youtube.com/user/coolbloke1324

## Gotcha Hints

### UI Entities

When working with the provided UI classes (IgeUiEntity and IgeUiElement) it's important to
understand the differences. IgeUiElement instances stop pointer even propagation by default.
This means if you mount one IgeUiElement inside another one, only the parent will get
pointer events like pointerDown and pointerUp.

IgeUiEntity instances have the same general capabilities but are considered graphical rather
than interactive so don't hook or interfere with pointer events by default.
