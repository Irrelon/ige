var appCore = require('../../../../index');

require('./SplashClient');
require('./SplashClientScene');
require('./SplashClientTextures');

appCore.config(function ($ige) {
	$ige.route('app.splash', {
		controller: 'SplashClient',
		sceneGraph: 'SplashClientScene',
		textures: 'SplashClientTextures'
	});
});