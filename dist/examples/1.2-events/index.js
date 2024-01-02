import { isClient } from "../../engine/clientServer.js"
import { ige } from "../../engine/instance.js"
export class Game {
    classId = "Game";
    constructor(options) {
        if (isClient) {
            import("./client.js").then(({ Client: App }) => {
                ige.client = new App();
            });
        }
    }
}