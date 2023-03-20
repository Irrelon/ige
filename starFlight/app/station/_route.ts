var appCore = require('../../../ige');

require('./StationClient');
require('./StationClientScene');
require('./StationClientTextures');

require('./StationServer');
require('./StationServerScene');

appCore.config(function ($ige) {
	$ige.route('app.space', {
		client: {
			controller: 'StationClient',
			sceneGraph: 'StationClientScene',
			textures: 'StationClientTextures'
		},
		server: {
			controller: 'StationServer',
			sceneGraph: 'StationServerScene'
		}
	});
});