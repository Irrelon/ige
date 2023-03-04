import { ige } from "../engine/instance.js";
export class Game {
    constructor(App, options) {
        this.classId = "Game";
        if (ige.isClient) {
            ige.client = new App();
        }
        if (ige.isServer) {
            ige.server = new App(options);
        }
    }
}
