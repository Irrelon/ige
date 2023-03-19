import { ige } from "@/engine/instance";
import { isClient, isServer } from "@/engine/clientServer";

export class Game {
	classId = "Game";

	constructor (options?: any) {
		if (isClient) {
			import("./client.js").then(({ Client: App }) => {
				ige.client = new App();
			});
		}

		if (isServer) {
			console.log("Init server instance");
			import("./server.js").then(({ Server: App }) => {
				ige.server = new App();
			});
		}
	}
}

if (isServer) {
	new Game();
}
