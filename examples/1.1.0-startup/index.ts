import IgeBaseClass from "../../engine/core/IgeBaseClass";
import Ige from "../../engine/core/Ige";

export class Game extends IgeBaseClass {
    classId = "Game";

    constructor(App: new (ige: Ige, ...args: any[]) => IgeBaseClass, options?: any) {
        // Create the engine
        const ige = new Ige();

        // Init the super class
        super(ige);

        if (this._ige.isClient) {
            this._ige.client = new App(ige);
        }

        if (this._ige.isServer) {
            this._ige.server = new App(ige, options);
        }
    }
}
