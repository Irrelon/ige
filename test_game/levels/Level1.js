import { ige } from "../../engine/instance";
import { degreesToRadians } from "../../engine/services/utils";
import { IgeSceneGraph } from "../../engine/core/IgeSceneGraph";
import { IgeScene2d } from "../../engine/core/IgeScene2d";
import { IgeStreamMode } from "../../enums/IgeStreamMode";
import { IgeAudioEntity } from "../../engine/components/audio/IgeAudioEntity";
import { Transporter } from "../entities/Transporter";
import { ResourceBuilding } from "../entities/ResourceBuilding";
import { ResourceType } from "../enums/ResourceType";
import { FactoryBuilding } from "../entities/FactoryBuilding";
import { isClient } from "../../engine/services/clientServer";
import { Road } from "../entities/Road";
import { StorageBuilding } from "../entities/StorageBuilding";
import { IgeTileMap2d } from "../../engine/core/IgeTileMap2d";
export class Level1 extends IgeSceneGraph {
    constructor() {
        super(...arguments);
        this.classId = "Level1";
    }
    /**
     * Called when loading the graph data via ige.addGraph().
     */
    addGraph() {
        const baseScene = ige.$("baseScene");
        // Clear existing graph data
        if (ige.$("scene1")) {
            this.removeGraph();
        }
        // Create the scene
        const scene1 = new IgeScene2d()
            .id("scene1")
            .mount(baseScene);
        new IgeTileMap2d()
            .id('tileMap1')
            .tileWidth(40)
            .tileHeight(40)
            .gridSize(20, 20)
            .drawGrid(true)
            .drawMouse(true)
            .drawBounds(true)
            .drawBoundsData(false)
            .highlightOccupied(true) // Draws a red tile wherever a tile is "occupied"
            .mount(scene1);
        if (isClient) {
            console.log("Client mode");
        }
        //if (isClient) return;
        new IgeAudioEntity()
            .streamMode(IgeStreamMode.simple)
            .url("assets/audio/deepSpace.mp3")
            .play(true)
            .mount(baseScene);
        const base = new StorageBuilding()
            .translateTo(0, 0, 0)
            .mount(scene1);
        const resource1 = new ResourceBuilding(ResourceType.energy)
            .translateTo(220, 120, 0)
            .rotateTo(0, 0, degreesToRadians(-10))
            .mount(scene1);
        const factory1 = new FactoryBuilding(ResourceType.wood, [{
                resource: ResourceType.energy,
                count: 1
            }])
            .translateTo(50, 150, 0)
            .mount(scene1);
        const factory2 = new FactoryBuilding(ResourceType.wood, [{
                resource: ResourceType.energy,
                count: 1
            }])
            .translateTo(250, -50, 0)
            .mount(scene1);
        new Road(base.id(), factory2.id())
            .mount(scene1);
        new Road(factory2.id(), resource1.id())
            .mount(scene1);
        new Road(resource1.id(), factory1.id())
            .mount(scene1);
        new Transporter(factory1.id(), resource1.id())
            .translateTo(resource1._translate.x, resource1._translate.y, 0)
            .mount(scene1);
    }
    /**
     * The method called when the graph items are to be removed from the
     * active graph.
     */
    removeGraph() {
        // Since all our objects in addGraph() were mounted to the
        // 'scene1' entity, destroying it will remove everything we
        // added to it.
        ige.$("scene1").destroy();
    }
}
