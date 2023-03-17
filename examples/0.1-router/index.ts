import { ige } from "../../engine/instance";
import "./app/_route";

export class Game {
	classId = "Game";

	constructor () {
		ige.router.go("app/splash");
	}
}
