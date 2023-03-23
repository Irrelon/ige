import { ige } from "../../../engine/instance.js";
import { isClient } from "../../../engine/clientServer.js";
import { degreesToRadians } from "../../../engine/utils.js";
import { IgeStreamMode } from "../../../enums/IgeStreamMode.js";
import { FactoryBuilding } from "../../entities/FactoryBuilding.js";
import { ResourceType } from "../../enums/ResourceType.js";
import { MiningBuilding } from "../../entities/MiningBuilding.js";
import { Road } from "../../entities/Road.js";
import { StorageBuilding } from "../../entities/StorageBuilding.js";
import { IgeAudioEntity } from "../../../engine/audio/index.js";
import { IgeSceneGraph } from "../../../engine/core/IgeSceneGraph.js";
import { IgeScene2d } from "../../../engine/core/IgeScene2d.js";
import { Transporter } from "../../entities/Transporter.js";
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
        if (isClient)
            return;
        new IgeAudioEntity()
            .streamMode(IgeStreamMode.simple)
            .url("assets/audio/deepSpace.mp3")
            .play(true)
            .mount(baseScene);
        const base = new StorageBuilding()
            .id("base1")
            .translateTo(-100, -80, 0)
            .mount(scene1);
        const miningBuilding1 = new MiningBuilding(ResourceType.wood, [{
                type: ResourceType.energy,
                count: 1,
                max: 1
            }])
            .id("miningBuilding1")
            .translateTo(50, 150, 0)
            .mount(scene1);
        const miningBuilding2 = new MiningBuilding(ResourceType.grain, [{
                type: ResourceType.energy,
                count: 1,
                max: 1
            }])
            .id("miningBuilding2")
            .translateTo(250, -150, 0)
            .mount(scene1);
        const factoryBuilding1 = new FactoryBuilding(ResourceType.energy, [{
                type: ResourceType.wood,
                count: 1,
                max: 1
            }, {
                type: ResourceType.grain,
                count: 1,
                max: 1
            }])
            .id("factoryBuilding1")
            .translateTo(220, 120, 0)
            .rotateTo(0, 0, degreesToRadians(-10))
            .mount(scene1);
        new Road(base.id(), factoryBuilding1.id())
            .mount(scene1);
        new Road(base.id(), miningBuilding2.id())
            .mount(scene1);
        new Road(miningBuilding2.id(), factoryBuilding1.id())
            .mount(scene1);
        new Road(factoryBuilding1.id(), miningBuilding1.id())
            .mount(scene1);
        new Transporter(base.id(), miningBuilding1.id(), factoryBuilding1.id())
            .translateTo(base._translate.x, base._translate.y, 0)
            .mount(scene1);
        new Transporter(base.id(), factoryBuilding1.id(), miningBuilding2.id())
            .translateTo(base._translate.x, base._translate.y, 0)
            .mount(scene1);
        new Transporter(base.id(), miningBuilding2.id(), base.id())
            .translateTo(base._translate.x, base._translate.y, 0)
            .mount(scene1);
        new Transporter(base.id(), factoryBuilding1.id(), base.id())
            .translateTo(base._translate.x, base._translate.y, 0)
            .mount(scene1);
        base.resourcePool[ResourceType.energy] = 10;
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
