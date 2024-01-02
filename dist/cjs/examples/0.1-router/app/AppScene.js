"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppScene = void 0;
const IgeBaseScene_1 = require("../../../engine/core/IgeBaseScene.js");
const IgeSceneGraph_1 = require("../../../engine/core/IgeSceneGraph.js");
const instance_1 = require("../../../engine/instance.js");
class AppScene extends IgeSceneGraph_1.IgeSceneGraph {
    constructor() {
        super(...arguments);
        this.classId = "AppScene";
    }
    /**
     * Called when loading the graph data via ige.addGraph().
     */
    addGraph() {
        // Creates "baseScene" and adds a viewport
        instance_1.ige.engine.addGraph(IgeBaseScene_1.IgeBaseScene);
    }
    /**
     * The method called when the graph items are to be removed from the
     * active graph.
     */
    removeGraph() {
        // Removes the { IgeBaseScene } from the scenegraph
        instance_1.ige.engine.removeGraph(IgeBaseScene_1.IgeBaseScene);
    }
}
exports.AppScene = AppScene;
