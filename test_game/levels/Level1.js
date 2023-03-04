import { ige } from "../../engine/instance.js";
import IgeSceneGraph from "../../engine/core/IgeSceneGraph.js";
import IgeScene2d from "../../engine/core/IgeScene2d.js";
import { degreesToRadians } from "../../engine/services/utils.js";
import { Square } from "../entity/Square.js";
import { Circle } from "../entity/Circle.js";
import { Triangle } from "../entity/Triangle.js";
import { Line } from "../entity/Line.js";
export class Level1 extends IgeSceneGraph {
    constructor() {
        super(...arguments);
        this.classId = 'Level1';
    }
    /**
     * Called when loading the graph data via ige.addGraph().
     */
    addGraph() {
        const client = ige.client;
        const baseScene = ige.$('baseScene');
        // Clear existing graph data
        if (ige.$('scene1')) {
            this.removeGraph();
        }
        // Create the scene
        const scene1 = new IgeScene2d()
            .id('scene1')
            .mount(baseScene);
        // Create a third rotator entity and mount
        // it to the first on at 0, -50 relative to the
        // parent, but assign it a smart texture!
        new Square()
            .translateTo(0, 0, 0)
            .mount(scene1);
        new Circle()
            .translateTo(250, -50, 0)
            .mount(scene1);
        new Triangle()
            .translateTo(220, 120, 0)
            .rotateTo(0, 0, degreesToRadians(-10))
            .mount(scene1);
        new Circle()
            .translateTo(50, 150, 0)
            .mount(scene1);
        new Line(0, 0, 250, -50)
            .mount(scene1);
        new Line(250, -50, 220, 120)
            .mount(scene1);
        new Line(220, 120, 50, 150)
            .mount(scene1);
        new Circle()
            .translateTo(150, 150, 0)
            .scaleTo(0.3, 0.3, 0.3)
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
        ige.$('scene1').destroy();
    }
}
