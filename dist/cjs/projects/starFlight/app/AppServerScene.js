"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppServerScene = void 0;
const instance_1 = require("../../../engine/instance.js");
const IgeSceneGraph_1 = require("../../../engine/core/IgeSceneGraph.js");
const IgeViewport_1 = require("../../../engine/core/IgeViewport.js");
const IgeScene2d_1 = require("../../../engine/core/IgeScene2d.js");
require("./component/module/Module_Generic");
require("./component/module/Module_Ability");
require("./component/module/Module_MiningLaser");
class AppServerScene extends IgeSceneGraph_1.IgeSceneGraph {
    constructor() {
        super(...arguments);
        this.classId = 'AppServerScene';
    }
    addGraph() {
        // Create the root scene on which all other objects
        // will branch from in the scenegraph
        const mainScene = new IgeScene2d_1.IgeScene2d()
            .id('mainScene');
        // Create the main viewport and set the scene
        // it will "look" at as the new mainScene we just
        // created above
        new IgeViewport_1.IgeViewport()
            .id('vp1')
            .autoSize(true)
            .scene(mainScene)
            .drawBounds(false)
            .mount(instance_1.ige.engine);
    }
    removeGraph() {
        const mainScene = instance_1.ige.$('mainScene');
        mainScene === null || mainScene === void 0 ? void 0 : mainScene.destroy();
    }
}
exports.AppServerScene = AppServerScene;
