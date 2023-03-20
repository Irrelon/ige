import { ige } from "@/engine/instance";
import { Level1 } from "./Level1";

ige.router.route("app/level1", {
	client: async () => {
		// Add all the items in Scene1 to the scenegraph
		// (see gameClasses/Scene1.js :: addGraph() to see
		// the method being called by the engine and how
		// the items are added to the scenegraph)
		await ige.engine.addGraph(Level1);

		return async () => {
			await ige.engine.removeGraph(Level1);
		}
	},
	server: async () => {
		await ige.engine.addGraph(Level1);

		return async () => {
			await ige.engine.removeGraph(Level1);
		}
	}
});
