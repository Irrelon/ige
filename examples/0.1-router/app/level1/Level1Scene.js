import { ige } from "@/engine/instance";
import { IgeSceneGraph } from "@/engine/core/IgeSceneGraph";
import { IgeScene2d } from "@/engine/core/IgeScene2d";
import { Fairy } from "../../entities/Fairy";
import { IgeUiButton } from "@/engine/ui/IgeUiButton";
export class Level1Scene extends IgeSceneGraph {
    constructor() {
        super(...arguments);
        this.classId = "Level1Scene";
    }
    /**
     * Called when loading the graph data via ige.addGraph().
     */
    addGraph() {
        const baseScene = ige.$('baseScene');
        // Clear existing graph data
        if (ige.$('scene1')) {
            this.removeGraph();
        }
        // Create the scene
        const scene1 = new IgeScene2d()
            .id('scene1')
            .layer(0)
            .mount(baseScene);
        const uiScene = new IgeScene2d()
            .id('uiScene')
            .layer(1)
            .mount(baseScene);
        // Create an entity and mount it to the scene
        new Fairy(-0.01)
            .translateTo(-220, 0, 0)
            .mount(scene1);
        new Fairy(0.01)
            .translateTo(220, 0, 0)
            .mount(scene1);
        new IgeUiButton()
            .width(100)
            .height(40)
            .color("#ffffff")
            .backgroundColor("#002b4b")
            .borderColor("#ffffff")
            .borderWidth(1)
            .value("Back to Splash")
            .pointerUp(() => {
            ige.router.go("app/splash");
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
        ige.$("scene1").destroy();
        ige.$("uiScene").destroy();
    }
}
