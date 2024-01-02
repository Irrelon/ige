import { IgeEntity } from "@/engine/core/IgeEntity";
import { IgeScene2d } from "@/engine/core/IgeScene2d";
import { IgeSceneGraph } from "@/engine/core/IgeSceneGraph";
import { ige } from "@/engine/instance";
import { IgeUiButton } from "@/engine/ui/IgeUiButton";

export class SplashScene extends IgeSceneGraph {
	classId = "SplashScene";

	/**
	 * Called when loading the graph data via ige.addGraph().
	 */
	addGraph() {
		const baseScene = ige.$("baseScene") as IgeEntity;

		const uiScene = new IgeScene2d().id("uiScene").mount(baseScene);

		new IgeUiButton()
			.width(100)
			.height(40)
			.color("#ffffff")
			.backgroundColor("#002b4b")
			.borderColor("#ffffff")
			.borderWidth(1)
			.value("Level 1")
			.pointerUp(() => {
				ige.router.go("app/level1");
			})
			.mount(uiScene);
	}

	/**
	 * The method called when the graph items are to be removed from the
	 * active graph.
	 */
	removeGraph() {
		// Since all our objects in addGraph() were mounted to the
		// 'scene1' entity, destroying it will remove everything we
		// added to it.
		(ige.$("uiScene") as IgeScene2d).destroy();
	}
}
