import "./app/_route";
import { isServer } from "@/engine/clientServer";
import { ige } from "@/engine/exports";

export class Game {
	classId = "Game";

	constructor () {
		ige.data("isometric", true);
		ige.engine.globalSmoothing(true);
		ige.router.go("app/level1");
	}
}

if (isServer) {
	new Game();
}
