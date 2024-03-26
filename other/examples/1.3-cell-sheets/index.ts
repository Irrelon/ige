import { isClient } from "@/engine/clientServer";
import { ige } from "@/engine/exports";

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
