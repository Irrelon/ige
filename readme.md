# Isogenic Game Engine
HTML5 2D and isometric scenegraph-based game engine written entirely in JavaScript.

### 25th March 2023
> The original engine was written over 12 years ago, and it is a testament to that work
> that it is still by far the most feature-rich browser-based game engine available today.
> There is still NO OTHER engine that supports realtime multiplayer streaming out of the
> box written purely in JavaScript in a 2d and isometric rendering engine.
>
> With all that said, it's 2023 and back in 2011, ES classes, ES modules, TypeScript, webpack
> etc did not exist. As such, language functionality such as classes were custom-created to
> facilitate an inheritance-style codebase. This was great, as was the magic of using ES
> classes years before they even existed, but now we have native functionality in 
> JavaScript, a rewrite of the engine needs to happen to make use of that new functionality.
> The changes to the engine to support native functionality is in the branch `es6-typescript`
> that has largely completed the work of converting the engine to use native ES6 classes and
> TypeScript for all engine features. It will soon be merged into the master branch and
> will be considered the production version.
>
> Minor changes exist as well as some breaking changes (such as the removal of ClientConfig and ServerConfig files)
> that were ultimately made to increase functionality or update anachronistic coding patterns to more modern expectations.
>
> **The major changes are:**
>
> The built-in compiler is no longer required since `import` now exists in browsers natively,
> so it is no longer a requirement to compile using the engine's compiler to get a runnable
> project / game. You should code with ES modules `import` and `export`, not CommonJS `require`
> and `module.exports`.
>
> The node.js server-side executable system that ran IGE on your server for multiplayer support
> has been removed as the isomorphic JavaScript output runs natively in Node.js - again due to
> the support for ES modules, ES classes and there is no need to "package" projects / games
> anymore! :)
>
> The `ClientConfig.js` and `ServerConfig.js` are no longer required and can be removed everywhere.
> The engine simply uses ES module imports and exports now, directly in the files that need them.
>
> Many of the examples in the `examples` folder have been converted to TypeScript and ES modules.
> You can tell which ones can be run because there will be an `index.ts` rather than only an
> `index.js` file.
>
> If you are starting a new project, you should use the `es6-typescript` branch in order
> to remain compatible with changes being made there rather than using the `master` branch.

*Rob Evans, CEO at Irrelon Software, Author of Isogenic Game Engine*

## Latest Updates & Changelog
https://www.isogenicengine.com

## Main Features
* Full un-obfuscated source code
* Advanced networking system with built-in server
* Particle system
* Scenegraph-based rendering pipeline
* Tile maps
* Box2D physics component for easy integration with 2d and isometric games
* Multiple viewport support
* Tweening support
* Cell-based animation support
* Native and font-sheet text support

## Installation
After downloading or cloning this repository, if you plan to use the multiplayer aspects of the engine you should run
(assumes that you cloned / extracted the engine repository to /ige)**:

    cd /ige/server
    npm install

This will automatically download and install any required Node.js modules.

** You must have Node.js installed for the installation to work

## Examples
There are a lot of examples in the ./examples folder. Please see the ./examples/readme.md file for more information
about running the examples.

## Documentation
https://www.isogenicengine.com/docs-manual.html

## Forum
Head over to the official help & support forum: https://www.isogenicengine.com/forum

## Font Sheet Generator
https://www.isogenicengine.com/tools/fontSheetGenerator/

## Feedback & Support
If you have any comments, questions, requests etc please don't hesitate to discuss them on the forum!

## License
MIT

## Intellectual Property, Ownership & Copyright
(C)opyright 2013 Irrelon Software Limited
https://www.irrelon.com

* Website: https://www.isogenicengine.com
* Download: https://www.isogenicengine.com/download.html
* API Docs: https://www.isogenicengine.com/docs-reference.html
* Video Tutorials: https://www.isogenicengine.com/docs-tutorials.html
* Updates, News & Changelog: https://www.isogenicengine.com
* Twitter: @IsogenicEngine https://twitter.com/IsogenicEngine
* Youtube: https://www.youtube.com/user/coolbloke1324

### Prototype Version
Some art and assets that are included in the premium version are not included in the free (prototype) version because
of licensing issues.
