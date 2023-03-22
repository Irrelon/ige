import { ige } from "@/engine/instance";
import { SpaceServerScene } from "./SpaceServerScene";

// require('../component/SpaceStation');
//
// require('./SpaceClient');
// require('./SpaceClientScene');
// require('./SpaceClientTextures');
//
// require('./SpaceServer');
// require('./SpaceServerScene');

ige.router.route('app/space', {
	client: async () => {

	},
	server: async () => {
		await ige.engine.addGraph(SpaceServerScene);

		return async () => {
			await ige.engine.removeGraph(SpaceServerScene);
		}
	}
});
