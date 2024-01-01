"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Level1 = void 0;
const instance_1 = require("@/engine/instance");
const IgeSceneGraph_1 = require("@/engine/core/IgeSceneGraph");
const IgeEntity_1 = require("@/engine/core/IgeEntity");
class Level1 extends IgeSceneGraph_1.IgeSceneGraph {
    constructor() {
        super(...arguments);
        this.classId = "Level1";
    }
    /**
     * Called when loading the graph data via ige.addGraph().
     */
    addGraph() {
        const baseScene = instance_1.ige.$('baseScene');
        // Create an entity and mount it to the scene
        new IgeEntity_1.IgeEntity()
            .id('entity1')
            .depth(1)
            // Set the entity texture to the cell sheet we created earlier
            .texture(instance_1.ige.textures.get("grassSheet"))
            // Set the cell to 1... this is the FIRST cell in the sheet
            .cell(1)
            // Set the entity's width and height to match the cell we are using
            .dimensionsFromCell()
            .translateTo(0, 0, 0)
            .mount(baseScene);
        new IgeEntity_1.IgeEntity()
            .id('entity2')
            .depth(1)
            // Set the entity texture to the cell sheet we created earlier
            .texture(instance_1.ige.textures.get("grassSheet"))
            // Set the cell to 4... this is the FOURTH cell in the sheet
            .cell(4)
            // Set the entity's width and height to match the cell we are using
            .dimensionsFromCell()
            .translateTo(0, 50, 0)
            .mount(baseScene);
    }
    /**
     * The method called when the graph items are to be removed from the
     * active graph.
     */
    removeGraph() {
        // Since all our objects in addGraph() were mounted to the
        // 'scene1' entity, destroying it will remove everything we
        // added to it.
        instance_1.ige.$("scene1").destroy();
    }
}
exports.Level1 = Level1;
