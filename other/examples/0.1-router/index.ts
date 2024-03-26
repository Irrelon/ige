import "./app/_route";
import { ige } from "@/engine/exports";

export class Game {
	classId = "Game";

	constructor () {
		ige.router.go("app/splash");
	}
}
