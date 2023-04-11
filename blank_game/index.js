import { isClient } from "@/engine/clientServer";
import { ige } from "@/engine/instance";
export class Game {
    constructor() {
        this.classId = "Game";
        if (isClient) {
            import("./client.js").then(({ Client: App }) => {
                ige.client = new App();
            });
        }
    }
}
