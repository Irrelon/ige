import { ige } from "../../../../engine/instance";
import IgeSceneGraph from "../../../../engine/core/IgeSceneGraph";
import IgeScene2d from "../../../../engine/core/IgeScene2d";
import IgeEntity from "../../../../engine/core/IgeEntity";
import { IgeUiButton } from "../../../../engine/ui/IgeUiButton";

export class SplashScene extends IgeSceneGraph {
	classId = "SplashScene";

	/**
	 * Called when loading the graph data via ige.addGraph().
	 */
	addGraph () {
		const baseScene = ige.$('baseScene') as IgeEntity;

		// Create the scene
		const scene1 = new IgeScene2d()
			.id('scene1')
			.mount(baseScene);

		new IgeUiButton()
			.width(100)
			.height(40)
			.color("#ffffff")
			.borderColor("#ffffff")
			.borderWidth(1)
			.value("Level 1")
			.mouseUp(() => {
				ige.router.go("app/level1");
			})
			.mount(scene1);
	}

	/**
	 * The method called when the graph items are to be removed from the
	 * active graph.
	 */
	removeGraph () {
		// Since all our objects in addGraph() were mounted to the
		// 'scene1' entity, destroying it will remove everything we
		// added to it.
		(ige.$("scene1") as IgeScene2d).destroy();
	}
}
