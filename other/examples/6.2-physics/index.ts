import { ige } from "../../../dist/index.js";
import { isClient } from "../../../dist/index.js";

export class Game {
	classId = "Game";

	constructor (options?: any) {
		if (isClient) {
			import("./client.js").then(({ Client: App }) => {
				ige.client = new App();
			});
		}
	}
}
