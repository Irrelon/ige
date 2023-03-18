var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { IgeBaseClass } from "../engine/core/IgeBaseClass";
import { ige } from "../engine/instance";
export class Client extends IgeBaseClass {
    constructor() {
        super();
        this.classId = "Client";
        void this.init();
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            // Load a game texture here
            //new IgeTexture("someImageName", './assets/somePathToImage.png');
            ///////////////////////////////////////////////////////////////////////////////
            // *** PLEASE READ - BLANK PROJECT RUNNING DETAILS ***
            ///////////////////////////////////////////////////////////////////////////////
            // The engine will wait for your textures to load before it starts because
            // of the code below waiting for an "on('texturesLoaded')" before executing.
            // The problem is there are no textures loaded because this is a blank project
            // so if you run this from the index.html the loading symbol will spin forever.
            // I've added an example line (line 16) to show how to load at least one
            // texture into memory, but you'll have to provide an image file for it :)
            ///////////////////////////////////////////////////////////////////////////////
            // Wait for our textures to load before continuing
            yield ige.textures.whenLoaded();
            // Create the HTML canvas
            ige.engine.createFrontBuffer(true);
            // Start the engine
            yield ige.engine.start();
            // Add base scene data
            ige.engine.addGraph("IgeBaseScene");
            // CREATE SOME ENTITIES AND WHOTNOT HERE
        });
    }
}
