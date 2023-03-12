import { ige } from "../../engine/instance.js";
import { degreesToRadians } from "../../engine/services/utils.js";
import IgeSceneGraph from "../../engine/core/IgeSceneGraph.js";
import IgeScene2d from "../../engine/core/IgeScene2d.js";
import { Square } from "../entities/base/Square.js";
import { IgeStreamMode } from "../../enums/IgeStreamMode.js";
import { IgeAudioEntity } from "../../engine/components/audio/IgeAudioEntity.js";
import { Transporter } from "../entities/Transporter.js";
import { ResourceBuilding } from "../entities/ResourceBuilding.js";
import { ResourceType } from "../enums/ResourceType.js";
import { FactoryBuilding } from "../entities/FactoryBuilding.js";
import { isClient } from "../../engine/services/clientServer.js";
import { Road } from "../entities/Road.js";
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
        if (isClient) {
            console.log("Client mode");
        }
        //if (isClient) return;
        new IgeAudioEntity()
            .streamMode(IgeStreamMode.simple)
            .url("assets/audio/deepSpace.mp3")
            .play(true)
            .mount(baseScene);
        const base = new Square()
            .translateTo(0, 0, 0)
            .mount(scene1);
        const factory2 = new FactoryBuilding(ResourceType.wood, [{
                resource: ResourceType.energy,
                count: 1
            }])
            .translateTo(250, -50, 0)
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
        new Road(base.id(), factory2.id())
            .mount(scene1);
        new Road(factory2.id(), resource1.id())
            .mount(scene1);
        new Road(resource1.id(), factory1.id())
            .mount(scene1);
        new Transporter(factory1, resource1)
            .translateTo(220, 120, 0)
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
