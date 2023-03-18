import { ige } from "../../../engine/instance";
import { IgeSceneGraph } from "../../../engine/core/IgeSceneGraph";
import { IgeScene2d } from "../../../engine/core/IgeScene2d";
import { Fairy } from "../entities/Fairy";
export class Level1 extends IgeSceneGraph {
    constructor() {
        super(...arguments);
        this.classId = "Level1";
    }
    /**
     * Called when loading the graph data via ige.addGraph().
     */
    addGraph() {
        const baseScene = ige.$('baseScene');
        // Clear existing graph data
        if (ige.$('scene1')) {
            this.removeGraph();
        }
        // Create the scene
        const scene1 = new IgeScene2d()
            .id('scene1')
            .mount(baseScene);
        // Create an entity and mount it to the scene
        new Fairy(-0.01)
            .translateTo(-220, 0, 0)
            .mount(scene1);
        new Fairy(0.01)
            .translateTo(220, 0, 0)
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
