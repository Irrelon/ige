# PLEASE READ FIRST - 11th December 2017
Isogenic Game Engine was a labour of love that has sorely lacked updates and better documentation for quite some time. While I believe it holds academic value if you are looking to see how the internals of a game engine works, if you are looking to create production-ready games, I would go and check out Unity3D instead.

It sadens me to have to make that recommendation because IGE is pretty solid, but lacks extensive documentation, a fully-fledged GUI editor, proper WebGL support and also probably most importantly, it lacks starter games that a developer could use to reverse engineer stuff even if the above was not available.

If you want a back story, you can check out this thread: https://github.com/Irrelon/ige/issues/460#issuecomment-350717484

P.S. There is a new branch called "appCore" in this repo that has updates, and I'm using that to code my own game "Starflight", however my recommendation to use Unity3D over IGE still stands, unless you are only coding your game for desktop browsers and don't mind reading engine code to figure stuff out. The engine code is very well doc-commented with JSDoc at least.

All the best,

Rob Evans

# Isogenic Game Engine
HTML5 2D and isometric scenegraph-based game engine written entirely in JavaScript.

## Latest Updates & Changelog
http://www.isogenicengine.com/forum/viewforum.php?f=8

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
http://www.isogenicengine.com/docs-manual.html

## Forum
Head over to the official help & support forum: http://www.isogenicengine.com/forum

## Feedback & Support
If you have any comments, questions, requests etc please don't hesitate to discuss them on the forum!

## License
MIT

## Intellectual Property, Ownership & Copyright
(C)opyright 2013 Irrelon Software Limited
http://www.irrelon.com

* Website: http://www.isogenicengine.com
* Store: http://www.isogenicengine.com/download.html
* Forum: http://www.isogenicengine.com/forum
* API Docs: http://www.isogenicengine.com/docs-reference.html
* Video Tutorials: http://www.isogenicengine.com/docs-tutorials.html
* Updates, News & Changelog: http://www.isogenicengine.com/forum/viewforum.php?f=8
* Twitter: @IsogenicEngine https://twitter.com/IsogenicEngine
* Youtube: http://www.youtube.com/user/coolbloke1324

### Prototype Version
Some of the art and assets that are included in the premium version are not included in the free (prototype) version because
of licensing issues.
