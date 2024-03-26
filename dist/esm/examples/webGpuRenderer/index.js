import { ige } from "../../engine/instance.js"
import { isClient } from "../../engine/utils/clientServer.js"
export class Game {
    classId = "Game";
    constructor(options) {
        ige.init();
        ige.isReady().then(() => {
            if (isClient) {
                import("./client.js").then(({ Client: App }) => {
                    ige.client = new App();
                });
            }
        });
    }
}
