import { ige } from "../engine/instance.js";
import { isClient, isServer } from "../engine/services/clientServer.js";
export class Game {
    constructor(options) {
        this.classId = "Game";
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
