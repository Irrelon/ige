import { ige } from "../../../engine/instance";
import IgeSceneGraph from "../../../engine/core/IgeSceneGraph";
import IgeScene2d from "../../../engine/core/IgeScene2d";
import IgeEntity from "../../../engine/core/IgeEntity";

export class Level1 extends IgeSceneGraph {
	classId = "Level1";

	/**
	 * Called when loading the graph data via ige.addGraph().
	 */
	addGraph () {
		const baseScene = ige.$('baseScene') as IgeEntity;

		// Create an entity and mount it to the scene
		new IgeEntity()
			.id('entity1')
			.depth(1)
			// Set the entity texture to the cell sheet we created earlier
			.texture(ige.textures.get("grassSheet"))
			// Set the cell to 1... this is the FIRST cell in the sheet
			.cell(1)
			// Set the entity's width and height to match the cell we are using
			.dimensionsFromCell()
			.translateTo(0, 0, 0)
			.mount(baseScene);

		new IgeEntity()
			.id('entity2')
			.depth(1)
			// Set the entity texture to the cell sheet we created earlier
			.texture(ige.textures.get("grassSheet"))
			// Set the cell to 4... this is the FOURTH cell in the sheet
			.cell(4)
			// Set the entity's width and height to match the cell we are using
			.dimensionsFromCell()
			.translateTo(0, 50, 0)
			.mount(baseScene);
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
