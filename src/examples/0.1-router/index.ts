import "./app/_route";
import { ige } from "@/engine/instance";

export class Game {
	classId = "Game";

	constructor () {
		ige.router.go("app/splash");
	}
}
