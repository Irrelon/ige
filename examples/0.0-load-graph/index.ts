import IgeBaseClass from "../../engine/core/IgeBaseClass";
import { ige } from "../../engine/instance";

export class Game extends IgeBaseClass {
	classId = "Game";

	constructor (App: new (...args: any[]) => IgeBaseClass, options?: any) {
		// Init the super class
		super();

		if (ige.isClient) {
			ige.client = new App();
		}

		if (ige.isServer) {
			ige.server = new App(options);
		}
	}
}