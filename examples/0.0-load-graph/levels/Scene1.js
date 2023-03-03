import { ige } from "../../../engine/instance.js";
import IgeSceneGraph from "../../../engine/core/IgeSceneGraph.js";
import IgeScene2d from "../../../engine/core/IgeScene2d.js";
import { Rotator } from "../gameClasses/Rotator.js";
export class Scene1 extends IgeSceneGraph {
    constructor() {
        super(...arguments);
        this.classId = 'Scene1';
    }
    /**
     * Called when loading the graph data via ige.addGraph().
     * @param options
     */
    addGraph(options) {
        const self = ige.client, baseScene = ige.$('baseScene');
        // Clear existing graph data
        if (ige.$('scene1')) {
            this.destroyGraph();
        }
        // Create the scene
        ige.client.scene1 = new IgeScene2d()
            .id('scene1')
            .mount(baseScene);
        // Create an entity and mount it to the scene
        ige.client.obj[0] = new Rotator(0.1)
            .id('fairy1')
            .depth(1)
            .width(100)
            .height(100)
            .texture(ige.client.gameTexture.fairy)
            .translateTo(0, 0, 0)
            .mount(self.scene1);
        // Create a second rotator entity and mount
        // it to the first one at 0, 50 relative to the
        // parent
        ige.client.obj[1] = new Rotator(0.1)
            .id('fairy2')
            .depth(1)
            .width(50)
            .height(50)
            .texture(ige.client.gameTexture.fairy)
            .translateTo(0, 50, 0)
            .mount(self.obj[0]);
        // Create a third rotator entity and mount
        // it to the first on at 0, -50 relative to the
        // parent, but assign it a smart texture!
        ige.client.obj[2] = new Rotator(0.1)
            .id('simpleBox')
            .depth(1)
            .width(50)
            .height(50)
            .texture(ige.client.gameTexture.simpleBox)
            .translateTo(0, -50, 0)
            .mount(self.obj[0]);
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
