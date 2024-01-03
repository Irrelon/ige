"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeBaseScene = void 0;
const exports_1 = require("../../export/exports.js");
const exports_2 = require("../../export/exports.js");
const exports_3 = require("../../export/exports.js");
const exports_4 = require("../../export/exports.js");
const exports_5 = require("../../export/exports.js");
/**
 * When loaded into memory using ige.addGraph('IgeBaseScene') will create
 * the scene "baseScene" and the viewport "vp1" that are used in almost all
 * examples and can be used as the base for your scenegraph as well.
 */
class IgeBaseScene extends exports_2.IgeSceneGraph {
    constructor() {
        super(...arguments);
        this.classId = "IgeBaseScene";
        /**
         * Called when loading the graph data via ige.addGraph().
         */
        this.addGraph = () => {
            // Clear existing graph data
            if (exports_5.ige.$("baseScene")) {
                this.removeGraph();
            }
            // Create the scene
            const baseScene = new exports_1.IgeScene2d().id("baseScene");
            // Create the main viewport to look at "baseScene"
            new exports_3.IgeViewport()
                .id("vp1")
                .autoSize(true)
                .scene(baseScene)
                .drawBounds(false)
                .drawBoundsData(false)
                .mount(exports_5.ige.engine);
        };
        /**
         * The method called when the graph items are to be removed from the
         * active graph.
         */
        this.removeGraph = () => {
            var _a, _b;
            // Destroy the viewport
            (_a = exports_5.ige.$("vp1")) === null || _a === void 0 ? void 0 : _a.destroy();
            // Destroy the baseScene
            (_b = exports_5.ige.$("baseScene")) === null || _b === void 0 ? void 0 : _b.destroy();
        };
    }
}
exports.IgeBaseScene = IgeBaseScene;
(0, exports_4.registerClass)(IgeBaseScene);
