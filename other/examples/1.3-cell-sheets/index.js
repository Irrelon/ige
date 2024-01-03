import { isClient } from "../../engine/clientServer.js";
import { ige } from "../../engine/instance.js";

export class Game {
	constructor (options) {
		this.classId = "Game";
		if (isClient) {
			import("./client.js").then(({ Client: App }) => {
				ige.client = new App();
			});
		}
	}
}
