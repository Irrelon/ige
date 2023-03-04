import { ige } from "../../engine/instance.js";
import IgeSceneGraph from "../../engine/core/IgeSceneGraph.js";
import IgeScene2d from "../../engine/core/IgeScene2d.js";
import IgeEntity from "../../engine/core/IgeEntity.js";
import { textures } from "../services/textures.js";
import { degreesToRadians } from "../../engine/services/utils.js";
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
        new IgeEntity()
            .data("glowColor", "#00d0ff")
            .depth(1)
            .width(50)
            .height(50)
            .texture(textures.getTextureById("square"))
            .translateTo(0, 0, 0)
            .mount(scene1);
        new IgeEntity()
            .data("glowColor", "#c852ff")
            .depth(1)
            .width(50)
            .height(50)
            .texture(textures.getTextureById("circle"))
            .translateTo(250, -50, 0)
            .mount(scene1);
        new IgeEntity()
            .data("glowColor", "#00ff00")
            .depth(1)
            .width(50)
            .height(50)
            .texture(textures.getTextureById("triangle"))
            .translateTo(220, 120, 0)
            .rotateTo(0, 0, degreesToRadians(-10))
            .mount(scene1);
        new IgeEntity()
            .data("glowColor", "#ffea00")
            .depth(0)
            .width(250)
            .height(-50)
            .texture(textures.getTextureById("line"))
            .translateTo(125, -25, 0)
            .mount(scene1);
        new IgeEntity()
            .data("glowColor", "#ffea00")
            .depth(0)
            .width(-30)
            .height(170)
            .texture(textures.getTextureById("line"))
            .translateTo(250 - 15, 170 / 2 - 50, 0)
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
