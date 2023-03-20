import { ige } from "@/engine/instance";

// require('../component/SpaceStation');
//
// require('./SpaceClient');
// require('./SpaceClientScene');
// require('./SpaceClientTextures');
//
// require('./SpaceServer');
// require('./SpaceServerScene');

ige.router.route('app.space', {
	client: async () => {

	},
	client: {
		controller: 'SpaceClient',
		sceneGraph: 'SpaceClientScene',
		textures: 'SpaceClientTextures'
	},
	server: {
		controller: 'SpaceServer',
		sceneGraph: 'SpaceServerScene'
	}
});
