import { ige } from "../../engine/instance.js";
import { isClient } from "../../engine/services/clientServer.js";
export class Game {
    constructor(options) {
        this.classId = "Game";
        if (isClient) {
            import("./client.js").then(({ Client: App }) => {
                ige.client = new App();
            });
        }
    }
}
