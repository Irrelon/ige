import { ige } from "../../../engine/instance.js";
import { IgeSceneGraph } from "../../../engine/core/IgeSceneGraph.js";
import { IgeViewport } from "../../../engine/core/IgeViewport.js";
import { IgeScene2d } from "../../../engine/core/IgeScene2d.js";
import "./component/module/Module_Generic.js";
import "./component/module/Module_Ability.js";
import "./component/module/Module_MiningLaser.js";
export class AppServerScene extends IgeSceneGraph {
    constructor() {
        super(...arguments);
        this.classId = 'AppServerScene';
    }
    addGraph() {
        // Create the root scene on which all other objects
        // will branch from in the scenegraph
        const mainScene = new IgeScene2d()
            .id('mainScene');
        // Create the main viewport and set the scene
        // it will "look" at as the new mainScene we just
        // created above
        new IgeViewport()
            .id('vp1')
            .autoSize(true)
            .scene(mainScene)
            .drawBounds(false)
            .mount(ige.engine);
    }
    removeGraph() {
        const mainScene = ige.$('mainScene');
        mainScene === null || mainScene === void 0 ? void 0 : mainScene.destroy();
    }
}
