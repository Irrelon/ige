"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Client = void 0;
const instance_1 = require("@/engine/instance");
const IgeBaseClass_1 = require("@/engine/core/IgeBaseClass");
const IgeBaseScene_1 = require("@/engine/core/IgeBaseScene");
const IgeCellSheet_1 = require("@/engine/core/IgeCellSheet");
const Level1_1 = require("./levels/Level1");
// @ts-ignore
window.ige = instance_1.ige;
class Client extends IgeBaseClass_1.IgeBaseClass {
    constructor() {
        super();
        this.classId = "Client";
        void this.init();
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            // Load the game textures
            new IgeCellSheet_1.IgeCellSheet("grassSheet", '../assets/textures/tiles/grassSheet.png', 4, 1);
            // Wait for our textures to load before continuing
            yield instance_1.ige.textures.whenLoaded();
            // Create the HTML canvas
            instance_1.ige.engine.createFrontBuffer(true);
            // Start the engine
            yield instance_1.ige.engine.start();
            // Creates "baseScene" and adds a viewport
            instance_1.ige.engine.addGraph(IgeBaseScene_1.IgeBaseScene);
            // Load our level onto the scenegraph
            instance_1.ige.engine.addGraph(Level1_1.Level1);
        });
    }
}
exports.Client = Client;
