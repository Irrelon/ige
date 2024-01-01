"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Level1 = void 0;
const instance_1 = require("@/engine/instance");
const clientServer_1 = require("@/engine/clientServer");
const IgeStreamMode_1 = require("@/enums/IgeStreamMode");
const ResourceType_1 = require("../../enums/ResourceType");
const index_1 = require("@/engine/audio/index");
const IgeSceneGraph_1 = require("@/engine/core/IgeSceneGraph");
const IgeScene2d_1 = require("@/engine/core/IgeScene2d");
const createBuilding_1 = require("../../services/createBuilding");
const IgeTileMap2d_1 = require("@/engine/core/IgeTileMap2d");
class Level1 extends IgeSceneGraph_1.IgeSceneGraph {
    constructor() {
        super(...arguments);
        this.classId = "Level1";
    }
    /**
     * Called when loading the graph data via ige.addGraph().
     */
    addGraph() {
        const baseScene = instance_1.ige.$("baseScene");
        // Clear existing graph data
        if (instance_1.ige.$("scene1")) {
            this.removeGraph();
        }
        // Create the scene
        const scene1 = new IgeScene2d_1.IgeScene2d()
            .id("scene1")
            .isometricMounts(instance_1.ige.data("isometric"))
            .mount(baseScene);
        const tileMap1 = new IgeTileMap2d_1.IgeTileMap2d()
            .id('tileMap1')
            .isometricMounts(instance_1.ige.data("isometric"))
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
        const mapOnMouseUp = (...args) => {
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
        if (clientServer_1.isClient)
            return;
        new index_1.IgeAudioEntity()
            .streamMode(IgeStreamMode_1.IgeStreamMode.simple)
            .url("assets/audio/deepSpace.mp3")
            .play(true)
            .mount(baseScene);
        const base = (0, createBuilding_1.createStorageBuilding)(tileMap1, "base1", 11, 10);
        base.resourcePool[ResourceType_1.ResourceType.energy] = 10;
    }
    /**
     * The method called when the graph items are to be removed from the
     * active graph.
     */
    removeGraph() {
        // Since all our objects in addGraph() were mounted to the
        // 'scene1' entity, destroying it will remove everything we
        // added to it.
        instance_1.ige.$("scene1").destroy();
    }
}
exports.Level1 = Level1;
