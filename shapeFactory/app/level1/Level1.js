import { ige } from "../../../engine/instance.js";
import { isClient } from "../../../engine/clientServer.js";
import { IgeStreamMode } from "../../../enums/IgeStreamMode.js";
import { ResourceType } from "../../enums/ResourceType.js";
import { IgeAudioEntity } from "../../../engine/audio/index.js";
import { IgeSceneGraph } from "../../../engine/core/IgeSceneGraph.js";
import { IgeScene2d } from "../../../engine/core/IgeScene2d.js";
import { createStorageBuilding } from "../../services/createBuilding.js";
import { Grid } from "../../entities/Grid.js";
import { Cuboid } from "../../../examples/14.1-isoobjects/gameClasses/Cuboid.js";
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
        const cuboid = new Cuboid(null, null)
            .depth(1)
            .streamMode(1)
            .translateTo(0, 0, 0)
            .bounds3d(200, 200, 10)
            .pointerEventsActive(true)
            .triggerPolygon('bounds3dPolygon')
            .mount(scene1);
        if (isClient)
            return;
        new IgeAudioEntity()
            .streamMode(IgeStreamMode.simple)
            .url("assets/audio/deepSpace.mp3")
            .play(true)
            .mount(baseScene);
        const base = createStorageBuilding(scene1, "base1", 0, 0);
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
