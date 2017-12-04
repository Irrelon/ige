# App Core Branch
This branch holds a re-write of some of the core areas of the engine to allow it to
operate using the latest version of Node.js, as well as bringing some modern web application fundamentals to IGE.

Borrowing ideas from various SPA framewors like AngularJS, this branch includes some new functionality like automatic
dependency injection, easy router-based navigation around your game (think of each scene as a page in
an SPA) etc.

**Some things to note**:
* Literally none of the examples will work in this branch. We have done away with the old loader.js which loaded all
the engine files into memory on the browser. The new dependency injection system being used is far superior and allows
both ahead-of-time and just-in-time game compilation, but that means modifying the existing examples to use this new
way of bootstrapping the engine. Can be done, just gonna take time.

* This branch uses Irrelon AppCore to handle module definition and dependency injection.
See https://github.com/Irrelon/irrelon-appcore for some more info. If you are familiar with defining modules using
AngularJS, this will look very similar.

* WORK IN PROGRESS - This branch is usable - I know this because I am creating a production-ready game using it, however
it may have some rough edges including NO DOCUMENTATION OR EXAMPLES which is by far the largest issue with using this
branch right now for your own development.

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
