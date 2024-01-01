"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeBaseScene = void 0;
const instance_1 = require("../instance");
const IgeSceneGraph_1 = require("./IgeSceneGraph");
const IgeScene2d_1 = require("./IgeScene2d");
const IgeViewport_1 = require("./IgeViewport");
const igeClassStore_1 = require("@/engine/igeClassStore");
/**
 * When loaded into memory using ige.addGraph('IgeBaseScene') will create
 * the scene "baseScene" and the viewport "vp1" that are used in almost all
 * examples and can be used as the base for your scenegraph as well.
 */
class IgeBaseScene extends IgeSceneGraph_1.IgeSceneGraph {
    constructor() {
        super(...arguments);
        this.classId = "IgeBaseScene";
        /**
         * Called when loading the graph data via ige.addGraph().
         */
        this.addGraph = () => {
            // Clear existing graph data
            if (instance_1.ige.$("baseScene")) {
                this.removeGraph();
            }
            // Create the scene
            const baseScene = new IgeScene2d_1.IgeScene2d().id("baseScene");
            // Create the main viewport to look at "baseScene"
            new IgeViewport_1.IgeViewport()
                .id("vp1")
                .autoSize(true)
                .scene(baseScene)
                .drawBounds(false)
                .drawBoundsData(false)
                .mount(instance_1.ige.engine);
        };
        /**
         * The method called when the graph items are to be removed from the
         * active graph.
         */
        this.removeGraph = () => {
            var _a, _b;
            // Destroy the viewport
            (_a = instance_1.ige.$("vp1")) === null || _a === void 0 ? void 0 : _a.destroy();
            // Destroy the baseScene
            (_b = instance_1.ige.$("baseScene")) === null || _b === void 0 ? void 0 : _b.destroy();
        };
    }
}
exports.IgeBaseScene = IgeBaseScene;
(0, igeClassStore_1.registerClass)(IgeBaseScene);
