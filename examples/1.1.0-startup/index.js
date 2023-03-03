import IgeBaseClass from "../../engine/core/IgeBaseClass.js";
import Ige from "../../engine/core/Ige.js";
export class Game extends IgeBaseClass {
    constructor(App, options) {
        // Init the super class
        super();
        this.classId = "Game";
        // Create the engine
        const ige = new Ige();
        if (ige.isClient) {
            ige.client = new App();
        }
        if (ige.isServer) {
            ige.server = new App(options);
        }
    }
}
