import { IgeAudioEntity } from "@/engine/audio/index";
import { isClient } from "@/engine/clientServer";
import { IgeScene2d } from "@/engine/core/IgeScene2d";
import { IgeSceneGraph } from "@/engine/core/IgeSceneGraph";
import { IgeTileMap2d } from "@/engine/core/IgeTileMap2d";
import { ige } from "@/engine/exports";
import { createStorageBuilding } from "../../services/createBuilding";
import { ResourceType } from "../../enums/ResourceType";
import { IgeStreamMode } from "@/enums/IgeStreamMode";

export class Level1 extends IgeSceneGraph {
	classId = "Level1";

	/**
	 * Called when loading the graph data via ige.addGraph().
	 */
	addGraph () {
		const baseScene = ige.$("baseScene") as IgeScene2d;

		// Clear existing graph data
		if (ige.$("scene1")) {
			this.removeGraph();
		}

		// Create the scene
		const scene1 = new IgeScene2d().id("scene1").isometricMounts(ige.data("isometric")).mount(baseScene);

		const tileMap1 = new IgeTileMap2d()
			.id("tileMap1")
			.isometricMounts(ige.data("isometric"))
			.tileWidth(50)
			.tileHeight(50)
			.gridSize(50, 50)
			.drawGrid(true)
			.drawMouse(true)
			.highlightOccupied(false)
			.highlightTileRect(false)
			.translateTo(0, 0, 0)
			//.mouseMove(this.mapOnMouseOver)
			.mount(baseScene);

		const mapOnMouseUp = (...args: any[]) => {
			const tile = tileMap1.mouseToTile();
			console.log("Mouse up", tile);

			// const tile = tileMap.mouseToTile(),
			// 	objectTileWidth = cursorObject._bounds3d.x / tileMap._tileWidth,
			// 	objectTileHeight = cursorObject._bounds3d.y / tileMap._tileHeight;
			//
			// // Check that the tiles this object will occupy if moved are
			// // not already occupied
			// if (!tileMap.isTileOccupied(
			// 	tile.x,
			// 	tile.y,
			// 	objectTileWidth,
			// 	objectTileHeight
			// ) && tileMap.inGrid(tile.x, tile.y, objectTileWidth, objectTileHeight)) {
			// 	// Move our cursor object to the tile
			// 	cursorObject.translateToTile(tile.x + cursorObject._tileAdjustX, tile.y + cursorObject._tileAdjustY);
			// 	this.cursorTile = tile;
			// }
		};

		//tileMap.pointerUp(mapOnMouseUp);

		// if (isClient) {
		// 	new Grid().id("buildGrid").mount(baseScene);
		// }

		if (isClient) return;

		new IgeAudioEntity()
			.streamMode(IgeStreamMode.simple)
			.url("assets/audio/deepSpace.mp3")
			.play(true)
			.mount(baseScene);

		const base = createStorageBuilding(tileMap1, "base1", 11, 10);

		base.resourcePool[ResourceType.energy] = 10;
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
