import { IgeBaseClass } from "../engine/core/IgeBaseClass.js";
import Ige from "../engine/core/Ige.js";
class Game extends IgeBaseClass {
    constructor(App, options) {
        // Create the engine
        const ige = new Ige();
        // Init the super class
        super(ige);
        this.classId = "Game";
        if (this._ige.isClient) {
            this._ige.client = new App(ige);
        }
        if (this._ige.isServer) {
            this._ige.server = new App(ige, options);
        }
    }
}
