> This is a beta branch at present. It is a re-write utilising TypeScript
> and compiling to both CommonJS (for Node.js) and ESM modules (for Webpack).
> Client and server-side rendering are working and various examples have been
> updated. If you see an index.ts in an example folder, it's been updated to
> work with ES6 modules.
>
> Compiling the engine: run the `build` npm command and then run the
> `build` will compile the TypeScript to JavaScript files and automatically
> resolve TypeScript paths in .js files to their relative equivalents using
> `npx @irrelon/fix-paths` helper app.
>
> From version 3.0.1 you can use the engine with `import { ige } from "@irrelon/ige";`
>
> All the engine's classes, functionality, types etc are exported from that module
> and can be imported as required.
>
> A `create-ige-app` npx script is on the way as well, almost ready! This will
> create a basic app with the webpack and Node.js setup to create games with
> this version of the engine without configuring all the things yourself.

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
