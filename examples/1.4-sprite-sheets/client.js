var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { ige } from "../../engine/instance.js";
import { IgeBaseClass } from "../../engine/core/IgeBaseClass.js";
import { IgeBaseScene } from "../../engine/core/IgeBaseScene.js";
import { Level1 } from "./levels/Level1.js";
import { IgeSpriteSheet } from "../../engine/core/IgeSpriteSheet.js";
// @ts-ignore
window.ige = ige;
export class Client extends IgeBaseClass {
    constructor() {
        super();
        this.classId = "Client";
        void this.init();
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            ige.init();
            // Load the game textures
            // Load the sprite sheet texture and store it in the gameTexture array
            new IgeSpriteSheet("sci-fi-tiles1", '../assets/textures/tiles/future-joy-tilee.png', [
                // Format of the sprite bounding rectangle array is x, y, width, height
                [5, 32, 22, 31],
                [128, 101, 96, 52]
            ]);
            // Load the sprite sheet and also assign cell ids to each cell
            new IgeSpriteSheet("sci-fi-tiles2", '../assets/textures/tiles/future-joy-tilee.png', [
                // Format of the sprite area is x, y, width, height
                [5, 32, 22, 31, 'table'],
                [128, 101, 96, 52, 'panel']
            ]);
            // Because the shrubbery image has distinct bounds around each sprite image, we
            // can ask the engine to detect the sprite bounds for us by not providing them
            // so here we load the shrubbery image but do not pass any sprite area data!
            new IgeSpriteSheet("shrubbery", '../assets/textures/tiles/shrubbery.png');
            // Wait for our textures to load before continuing
            yield ige.textures.whenLoaded();
            // Create the HTML canvas
            ige.engine.createFrontBuffer(true);
            // Start the engine
            yield ige.engine.start();
            // Creates "baseScene" and adds a viewport
            ige.engine.addGraph(IgeBaseScene);
            // Load our level onto the scenegraph
            ige.engine.addGraph(Level1);
        });
    }
}
