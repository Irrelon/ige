import { ige } from "@/engine/instance";
import { isServer } from "@/engine/clientServer";
import "./app/_route";

export class Game {
	classId = "Game";

	constructor (options?: any) {
		ige.router.go("app/level1");
	}
}

if (isServer) {
	new Game();
}