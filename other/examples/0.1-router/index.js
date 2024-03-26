import "./app/_route.js";
import { ige } from "../../engine/instance.js";

export class Game {
	constructor () {
		this.classId = "Game";
		ige.router.go("app/splash");
	}
}
