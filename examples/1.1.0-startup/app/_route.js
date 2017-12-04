// In normal development you'd just do require('ige'). Since we are *inside* the ige folder, we do relative path instead
var appCore = require('../../../index');

require('./splash/_route');

require('./AppClient');
require('./AppClientTextures');
require('./AppClientScene');

appCore.config(function ($ige) {
	$ige.route('app', {
		client: {
			controller: 'AppClient',
			sceneGraph: 'AppClientScene',
			textures: 'AppClientTextures'
		},
		server: {
			controller: 'AppServer',
			sceneGraph: 'AppServerScene'
		}
	});
});