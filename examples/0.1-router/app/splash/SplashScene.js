import { ige } from "../../../../engine/instance.js";
import IgeSceneGraph from "../../../../engine/core/IgeSceneGraph.js";
import IgeScene2d from "../../../../engine/core/IgeScene2d.js";
import { IgeUiButton } from "../../../../engine/ui/IgeUiButton.js";
export class SplashScene extends IgeSceneGraph {
    constructor() {
        super(...arguments);
        this.classId = "SplashScene";
    }
    /**
     * Called when loading the graph data via ige.addGraph().
     */
    addGraph() {
        const baseScene = ige.$('baseScene');
        const uiScene = new IgeScene2d()
            .id('uiScene')
            .mount(baseScene);
        new IgeUiButton()
            .width(100)
            .height(40)
            .color("#ffffff")
            .backgroundColor("#002b4b")
            .borderColor("#ffffff")
            .borderWidth(1)
            .value("Level 1")
            .mouseUp(() => {
            ige.router.go("app/level1");
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
        ige.$("uiScene").destroy();
    }
}
