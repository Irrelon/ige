import { ige } from "../../../engine/instance.js";
import { isClient } from "../../../engine/clientServer.js";
import { IgeStreamMode } from "../../../enums/IgeStreamMode.js";
import { ResourceType } from "../../enums/ResourceType.js";
import { IgeAudioEntity } from "../../../engine/audio/index.js";
import { IgeSceneGraph } from "../../../engine/core/IgeSceneGraph.js";
import { IgeScene2d } from "../../../engine/core/IgeScene2d.js";
import { Road } from "../../entities/Road.js";
import { Transporter } from "../../entities/Transporter.js";
import { createFactoryBuilding, createMiningBuilding, createStorageBuilding } from "../../services/createBuilding.js";
import { Grid } from "../../entities/Grid.js";
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
            .isometricMounts(true)
            .mount(baseScene);
        const grid = new Grid().mount(baseScene);
        if (isClient)
            return;
        new IgeAudioEntity()
            .streamMode(IgeStreamMode.simple)
            .url("assets/audio/deepSpace.mp3")
            .play(true)
            .mount(baseScene);
        const base = createStorageBuilding(scene1, "base1", -100, -80);
        const miningBuilding1 = createMiningBuilding(scene1, "miningBuilding1", 50, 150, ResourceType.wood);
        const miningBuilding2 = createMiningBuilding(scene1, "miningBuilding2", 250, -150, ResourceType.grain);
        const factoryBuilding1 = createFactoryBuilding(scene1, "factoryBuilding1", 220, 120);
        const factoryBuilding2 = createFactoryBuilding(scene1, "factoryBuilding2", -220, 120);
        ///////////////////////////////////////////////////////////
        new Road(base.flag.id(), factoryBuilding1.flag.id())
            .mount(scene1);
        new Road(base.flag.id(), factoryBuilding2.flag.id())
            .mount(scene1);
        new Road(base.flag.id(), miningBuilding2.flag.id())
            .mount(scene1);
        new Road(factoryBuilding1.flag.id(), miningBuilding1.flag.id())
            .mount(scene1);
        new Transporter(base.id(), base.flag.id(), factoryBuilding1.flag.id())
            .translateTo(base._translate.x, base._translate.y, 0)
            .mount(scene1);
        new Transporter(base.id(), base.flag.id(), factoryBuilding2.flag.id())
            .translateTo(base._translate.x, base._translate.y, 0)
            .mount(scene1);
        new Transporter(base.id(), base.flag.id(), miningBuilding2.flag.id())
            .translateTo(base._translate.x, base._translate.y, 0)
            .mount(scene1);
        new Transporter(base.id(), factoryBuilding1.flag.id(), miningBuilding1.flag.id())
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
