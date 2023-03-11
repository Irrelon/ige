import { ige } from "../../engine/instance.js";
import { degreesToRadians } from "../../engine/services/utils.js";
import IgeSceneGraph from "../../engine/core/IgeSceneGraph.js";
import IgeScene2d from "../../engine/core/IgeScene2d.js";
import { Square } from "../entities/Square.js";
import { Circle } from "../entities/Circle.js";
import { Triangle } from "../entities/Triangle.js";
import { Line } from "../entities/Line.js";
import { IgeStreamMode } from "../../enums/IgeStreamMode.js";
import { IgeAudioEntity } from "../../engine/components/audio/IgeAudioEntity.js";
import { Worker } from "../entities/Worker.js";
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
        //if (isClient) return;
        new IgeAudioEntity()
            .streamMode(IgeStreamMode.simple)
            .url("assets/audio/deepSpace.mp3")
            .play(true)
            .mount(baseScene);
        const base = new Square()
            .translateTo(0, 0, 0)
            .mount(scene1);
        const industry2 = new Circle()
            .translateTo(250, -50, 0)
            .mount(scene1);
        const factory1 = new Triangle()
            .translateTo(220, 120, 0)
            .rotateTo(0, 0, degreesToRadians(-10))
            .mount(scene1);
        const industry1 = new Circle()
            .translateTo(50, 150, 0)
            .mount(scene1);
        new Line(0, 0, 250, -50)
            .mount(scene1);
        new Line(250, -50, 220, 120)
            .mount(scene1);
        new Line(220, 120, 50, 150)
            .mount(scene1);
        new Worker(industry1, factory1)
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
