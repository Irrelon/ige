import { ige } from "@/engine/exports";
import { isClient } from "../../src/engine/clientServer";

export class Game {
	classId = "Game";

	constructor () {
		if (isClient) {
			import("./client.js").then(({ Client: App }) => {
				ige.client = new App();
			});
		}
	}
}
