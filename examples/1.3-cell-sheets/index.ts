import { ige } from "../../engine/instance";
import { isClient } from "@/engine/clientServer";

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
