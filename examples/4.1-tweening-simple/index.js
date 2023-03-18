import { ige } from "../../engine/instance";
import { isClient } from "../../engine/services/clientServer";
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
