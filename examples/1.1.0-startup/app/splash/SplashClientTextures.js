"use strict";

var appCore = require('../../../../index');

// Make sure we load our smart texture into appCore first before asking for it
// to be injected in the "SplashClientTextures" module below - look in /assets/textures/smartTextures/simpleBox.js
// to see how the smart texture is defined as a module within appCore called "simpleBoxSmartTexture".
require('../../assets/textures/smartTextures/simpleBox');

appCore.module('SplashClientTextures', function (ige, $textures, IgeTexture, simpleBoxSmartTexture) {
	// Define a textures object that will hold all the textures unique to this route
	var textures = {};
	
	textures.fairy = new IgeTexture('assets/textures/sprites/fairy.png');
	textures.simpleBox = new IgeTexture(simpleBoxSmartTexture);
	
	// Notice how we didn't create an appCore module for this texture? This is still a valid way to do things
	// but should be phased out ASAP in favour of declaring an appCore module for each smart texture
	textures.button = new IgeTexture('assets/textures/smartTextures/igeButton.js');
	
	// Add the route's textures to the engine
	$textures.addGroup(textures);
	
	// Define an on destroy that will unload our textures we use in this route when
	// the route is navigated away from
	this.on('destroy', function () {
		$textures.removeGroup(textures);
	});
});