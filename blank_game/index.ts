import { IgeClass } from "../engine/core/IgeClass";
import { IgeEngine } from "../engine/core/IgeEngine";

class Game extends IgeClass {
    _classId: "Game";

    init(App, options) {
        // Create the engine
        this._ige = new IgeEngine();

        if (this._ige.isClient) {
            this._ige.client = new App();
        }

        if (this._ige.isServer) {
            this._ige.server = new App(options);
        }
    }
}

if (typeof module !== "undefined" && typeof module.exports !== "undefined") {
    module.exports = Game;
} else {
    const game = new Game(Client);
}
