import IgeBaseClass from "../../engine/core/IgeBaseClass.js";
import { ige } from "../../engine/instance.js";
export class Game extends IgeBaseClass {
    constructor(App, options) {
        // Init the super class
        super();
        this.classId = "Game";
        if (ige.isClient) {
            ige.client = new App();
        }
        if (ige.isServer) {
            ige.server = new App(options);
        }
    }
}
