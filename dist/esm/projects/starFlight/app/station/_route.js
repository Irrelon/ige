import { ige } from "../../../../engine/instance.js";

ige.router.route("app.space", {
	client: {
		controller: "StationClient",
		sceneGraph: "StationClientScene",
		textures: "StationClientTextures"
	},
	server: {
		controller: "StationServer",
		sceneGraph: "StationServerScene"
	}
});
