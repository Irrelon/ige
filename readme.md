> This is a beta branch at present. It is a re-write utilising TypeScript
> and compiling to ES6 ESM modules. Client and server-side rendering are
> working and various examples have been updated. If you see an index.ts
> in an example folder, it's been updated to work with ES6 modules.
> 
> Compiling the engine: run the `build-watch` npm command and then run the
> `fixPaths` npm command. `build-watch` will compile the TypeScript changes
> to JavaScript files. The fixPaths will watch .js files and fix any paths
> to .js files that don't have a .js extension as well as resolving TS
> paths like @/something to their relative equivalent.

# Isogenic Game Engine
HTML5 2D and isometric scenegraph-based game engine written entirely in TypeScript.

## Latest Updates & Changelog
https://www.isogenicengine.com/forum/viewforum.php?f=8

## Main Features
* Full un-obfuscated source code
* Advanced networking system with built-in server
* Particle system
* Scenegraph-based
* Tile maps
* Box2D physics component for easy integration with 2d and isometric games
* Multiple viewport support
* Tweening support
* Cell-based animation support
* Native and font-sheet text support

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

* Website: https://www.isogenicengine.com
* API Docs: https://www.isogenicengine.com/docs-reference.html
* Video Tutorials: https://www.isogenicengine.com/docs-tutorials.html
* Twitter: @IsogenicEngine https://twitter.com/IsogenicEngine
* Youtube: https://www.youtube.com/user/coolbloke1324
