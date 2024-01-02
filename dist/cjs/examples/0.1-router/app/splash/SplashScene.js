"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SplashScene = void 0;
const IgeScene2d_1 = require("../../../../engine/core/IgeScene2d.js");
const IgeSceneGraph_1 = require("../../../../engine/core/IgeSceneGraph.js");
const instance_1 = require("../../../../engine/instance.js");
const IgeUiButton_1 = require("../../../../engine/ui/IgeUiButton.js");
class SplashScene extends IgeSceneGraph_1.IgeSceneGraph {
    constructor() {
        super(...arguments);
        this.classId = "SplashScene";
    }
    /**
     * Called when loading the graph data via ige.addGraph().
     */
    addGraph() {
        const baseScene = instance_1.ige.$("baseScene");
        const uiScene = new IgeScene2d_1.IgeScene2d().id("uiScene").mount(baseScene);
        new IgeUiButton_1.IgeUiButton()
            .width(100)
            .height(40)
            .color("#ffffff")
            .backgroundColor("#002b4b")
            .borderColor("#ffffff")
            .borderWidth(1)
            .value("Level 1")
            .pointerUp(() => {
            instance_1.ige.router.go("app/level1");
        })
            .mount(uiScene);
    }
    /**
     * The method called when the graph items are to be removed from the
     * active graph.
     */
    removeGraph() {
        // Since all our objects in addGraph() were mounted to the
        // 'scene1' entity, destroying it will remove everything we
        // added to it.
        instance_1.ige.$("uiScene").destroy();
    }
}
exports.SplashScene = SplashScene;
