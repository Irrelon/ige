import IgeBaseClass from "../../engine/core/IgeBaseClass";
import Ige from "../../engine/core/Ige";

export class Game extends IgeBaseClass {
    classId = "Game";

    constructor(App: new (...args: any[]) => IgeBaseClass, options?: any) {
        // Init the super class
        super();

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
