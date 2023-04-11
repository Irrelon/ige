var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { ige } from "@/engine/instance";
import { IgeTileMap2d } from "@/engine/core/IgeTileMap2d";
import { IgeSceneGraph } from "@/engine/core/IgeSceneGraph";
import { IgeScene2d } from "@/engine/core/IgeScene2d";
import { registerClass } from "@/engine/igeClassStore";
export class DefaultLevel extends IgeSceneGraph {
    constructor() {
        super(...arguments);
        this.classId = 'DefaultLevel';
    }
    /**
     * Called when loading the graph data via ige.addGraph().
     * @param options
     */
    addGraph(options) {
        return __awaiter(this, void 0, void 0, function* () {
            // Create the scene
            const baseScene = ige.$('baseScene');
            // Resize the background and then create a background pattern
            ige.client.gameTextures.background1.resize(40, 20);
            const backgroundScene = new IgeScene2d()
                .id('backgroundScene')
                .layer(0)
                .backgroundPattern(ige.client.gameTextures.background1, 'repeat', true, true)
                .ignoreCamera(true) // We want the scene to remain static
                .mount(baseScene);
            const objectScene = new IgeScene2d()
                .id('objectScene')
                .layer(1)
                .isometric(false)
                .mount(baseScene);
            // Create the UI scene that will have all the UI
            // entities mounted to it. This scene is at a higher
            // depth than gameScene so it will always be rendered
            // "on top" of the other game items which will all
            // be mounted to off of gameScene somewhere down the
            // scenegraph.
            const uiScene = new IgeScene2d()
                .id('uiScene')
                .layer(2)
                .ignoreCamera(true)
                .mount(baseScene);
            // Create the tile map that will store which buildings
            // are occupying which tiles on the map. When we create
            // new buildings we mount them to this tile map. The tile
            // map also has a number of mouse event listeners to
            // handle things like building new objects in the game.
            const tileMap1 = new IgeTileMap2d()
                .id('tileMap1')
                .isometricMounts(true)
                .tileWidth(20)
                .tileHeight(20)
                .gridSize(40, 40)
                .drawGrid(true)
                .drawMouse(true)
                .highlightOccupied(true)
                /*.mouseMove(this._mapOnMouseOver)
                .mouseUp(this._mapOnMouseUp)*/
                .mount(objectScene);
        });
    }
    /**
     * The method called when the graph items are to be removed from the
     * active graph.
     */
    removeGraph() {
        return __awaiter(this, void 0, void 0, function* () {
            // Since all our objects in addGraph() were mounted to the
            // 'scene1' entity, destroying it will remove everything we
            // added to it.
            ige.$('backgroundScene').destroy();
            ige.$('objectScene').destroy();
            ige.$('uiScene').destroy();
        });
    }
}
registerClass(DefaultLevel);
