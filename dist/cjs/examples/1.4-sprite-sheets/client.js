"use strict";
var __awaiter =
	(this && this.__awaiter) ||
	function (thisArg, _arguments, P, generator) {
		function adopt(value) {
			return value instanceof P
				? value
				: new P(function (resolve) {
						resolve(value);
				  });
		}
		return new (P || (P = Promise))(function (resolve, reject) {
			function fulfilled(value) {
				try {
					step(generator.next(value));
				} catch (e) {
					reject(e);
				}
			}
			function rejected(value) {
				try {
					step(generator["throw"](value));
				} catch (e) {
					reject(e);
				}
			}
			function step(result) {
				result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
			}
			step((generator = generator.apply(thisArg, _arguments || [])).next());
		});
	};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Client = void 0;
const instance_1 = require("../../engine/instance.js");
const IgeBaseClass_1 = require("../../engine/core/IgeBaseClass.js");
const IgeBaseScene_1 = require("../../engine/core/IgeBaseScene.js");
const Level1_1 = require("./levels/Level1");
const IgeSpriteSheet_1 = require("../../engine/core/IgeSpriteSheet.js");
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
			// Load the sprite sheet texture and store it in the gameTexture array
			new IgeSpriteSheet_1.IgeSpriteSheet("sci-fi-tiles1", "../assets/textures/tiles/future-joy-tilee.png", [
				// Format of the sprite bounding rectangle array is x, y, width, height
				[5, 32, 22, 31],
				[128, 101, 96, 52]
			]);
			// Load the sprite sheet and also assign cell ids to each cell
			new IgeSpriteSheet_1.IgeSpriteSheet("sci-fi-tiles2", "../assets/textures/tiles/future-joy-tilee.png", [
				// Format of the sprite area is x, y, width, height
				[5, 32, 22, 31, "table"],
				[128, 101, 96, 52, "panel"]
			]);
			// Because the shrubbery image has distinct bounds around each sprite image, we
			// can ask the engine to detect the sprite bounds for us by not providing them
			// so here we load the shrubbery image but do not pass any sprite area data!
			new IgeSpriteSheet_1.IgeSpriteSheet("shrubbery", "../assets/textures/tiles/shrubbery.png");
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
