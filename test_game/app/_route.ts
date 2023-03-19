import { ige } from "@/engine/instance";
import "./level1/_route";

ige.router.route("app", {
	client: async () => {
		await ige.ready();
		return import("./AppClientScene.js").then(({ AppClientScene: App }) => {
			return ige.engine.addGraph(App);
		});
	},
	server: async () => {
		await ige.ready();
		return import("./AppServerScene.js").then(({ AppServerScene: App }) => {
			return ige.engine.addGraph(App);
		});
	}
});
