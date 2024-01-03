import { isClient } from "../../../dist/index.js";
import { ige } from "../../../dist/index.js";

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
