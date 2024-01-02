import "./app/_route";
import { isServer } from "../../engine/clientServer.js";
import { ige } from "../../engine/instance.js";

export class Game {
	classId = "Game";
	constructor() {
		ige.data("isometric", true);
		ige.engine.globalSmoothing(true);
		ige.router.go("app/level1");
	}
}
if (isServer) {
	new Game();
}
