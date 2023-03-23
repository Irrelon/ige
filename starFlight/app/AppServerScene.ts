import { ige } from "@/engine/instance";
import { IgeSceneGraph } from "@/engine/core/IgeSceneGraph";
import { IgeViewport } from "@/engine/core/IgeViewport";
import { IgeScene2d } from "@/engine/core/IgeScene2d";

export class AppServerScene extends IgeSceneGraph {
	classId = 'AppServerScene';

	addGraph () {
		// Create the root scene on which all other objects
		// will branch from in the scenegraph
		const mainScene = new IgeScene2d()
			.id('mainScene');

		// Create the main viewport and set the scene
		// it will "look" at as the new mainScene we just
		// created above
		new IgeViewport()
			.id('vp1')
			.autoSize(true)
			.scene(mainScene)
			.drawBounds(false)
			.mount(ige.engine);
	}

	removeGraph () {
		const mainScene = ige.$('mainScene');
		mainScene?.destroy();
	}
}
