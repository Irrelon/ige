import { ige } from "@/engine/instance";
import { isClient } from "@/engine/utils/clientServer";

export class Game {
	classId = "Game";

	constructor (options?: any) {
		ige.init();
		ige.isReady().then(() => {
			if (isClient) {
				import("./client").then(({ Client: App }) => {
					ige.client = new App();
				});
			}
		});
	}
}

new Game();
