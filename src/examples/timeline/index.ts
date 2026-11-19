import { ige } from "@/engine/instance";
import { isClient } from "@/engine/utils/clientServer";

export class Game {
	classId = "Game";

	constructor(options?: any) {
		ige.init();
		// The timeline's sound cues use the engine's audio
		ige.uses("audio");
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
