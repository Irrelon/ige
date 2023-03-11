import { ige } from "../../engine/instance";
import { isClient } from "../../engine/services/clientServer";

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

export const game = new Game();