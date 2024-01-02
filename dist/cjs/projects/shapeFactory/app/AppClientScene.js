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
exports.AppClientScene = void 0;
const instance_1 = require("../../../engine/instance.js");
const IgeBaseScene_1 = require("../../../engine/core/IgeBaseScene.js");
const IgeOptions_1 = require("../../../engine/core/IgeOptions.js");
const IgeTexture_1 = require("../../../engine/core/IgeTexture.js");
const IgeSceneGraph_1 = require("../../../engine/core/IgeSceneGraph.js");
const IgeMousePanComponent_1 = require("../../../engine/components/IgeMousePanComponent.js");
const square_1 = require("../assets/textures/smartTextures/square");
const line_1 = require("../assets/textures/smartTextures/line");
const triangle_1 = require("../assets/textures/smartTextures/triangle");
const circle_1 = require("../assets/textures/smartTextures/circle");
const star_1 = require("../assets/textures/smartTextures/star");
const flag_1 = require("../assets/textures/smartTextures/flag");
const grid_1 = require("../assets/textures/smartTextures/grid");
const IgeCellSheet_1 = require("../../../engine/core/IgeCellSheet.js");
// @ts-ignore
window.ige = instance_1.ige;
class AppClientScene extends IgeSceneGraph_1.IgeSceneGraph {
	constructor() {
		super(...arguments);
		this.classId = "AppClientScene";
	}
	addGraph() {
		var _a;
		return __awaiter(this, void 0, void 0, function* () {
			const options = new IgeOptions_1.IgeOptions();
			options.set("masterVolume", 1);
			(_a = instance_1.ige.audio) === null || _a === void 0
				? void 0
				: _a.masterVolume(options.get("masterVolume", 1));
			new IgeCellSheet_1.IgeCellSheet("smoke", "assets/textures/sprites/smoke.png", 2, 2);
			new IgeTexture_1.IgeTexture("wood", "assets/textures/sprites/wood.png");
			new IgeTexture_1.IgeTexture("book", "assets/textures/sprites/science.png");
			new IgeTexture_1.IgeTexture("diamond", "assets/textures/sprites/diamond.png");
			new IgeTexture_1.IgeTexture("stone", "assets/textures/sprites/stone.png");
			new IgeTexture_1.IgeTexture("brick", "assets/textures/sprites/brick.png");
			new IgeTexture_1.IgeTexture("uranium", "assets/textures/sprites/uranium.png");
			new IgeTexture_1.IgeTexture("mystium", "assets/textures/sprites/mystium.png");
			new IgeTexture_1.IgeTexture("water", "assets/textures/sprites/water.png");
			new IgeTexture_1.IgeTexture("elerium", "assets/textures/sprites/elerium.png");
			new IgeTexture_1.IgeTexture("gold", "assets/textures/sprites/gold.png");
			new IgeTexture_1.IgeTexture("energy", "assets/textures/sprites/energy.png");
			new IgeTexture_1.IgeTexture("science", "assets/textures/sprites/science.png");
			new IgeTexture_1.IgeTexture("arrow", "assets/textures/sprites/arrow.png");
			new IgeTexture_1.IgeTexture("blueCube", "assets/textures/sprites/blueCube.png");
			new IgeTexture_1.IgeTexture("purpleCube", "assets/textures/sprites/purpleCube.png");
			new IgeTexture_1.IgeTexture("whiteCube", "assets/textures/sprites/whiteCube.png");
			new IgeTexture_1.IgeTexture("whiteTubeS", "assets/textures/sprites/whiteTubeS.png");
			new IgeTexture_1.IgeTexture("whiteTubeL", "assets/textures/sprites/whiteTubeL.png");
			new IgeTexture_1.IgeTexture("roofE", "assets/textures/sprites/roofE.png");
			new IgeTexture_1.IgeTexture("roofW", "assets/textures/sprites/roofW.png");
			new IgeTexture_1.IgeTexture("factory1", "assets/textures/sprites/factory1.png");
			new IgeTexture_1.IgeTexture("factory2", "assets/textures/sprites/factory2.png");
			new IgeTexture_1.IgeTexture("headquarters", "assets/textures/sprites/headquarters.png");
			new IgeTexture_1.IgeTexture("mine", "assets/textures/sprites/mine.png");
			new IgeTexture_1.IgeTexture("flag", "assets/textures/sprites/flag.png");
			new IgeTexture_1.IgeTexture("house1", "assets/textures/sprites/house1.png");
			new IgeTexture_1.IgeTexture("squareSmartTexture", square_1.squareSmartTexture);
			new IgeTexture_1.IgeTexture("lineSmartTexture", line_1.lineSmartTexture);
			new IgeTexture_1.IgeTexture("triangleSmartTexture", triangle_1.triangleSmartTexture);
			new IgeTexture_1.IgeTexture("circleSmartTexture", circle_1.circleSmartTexture);
			new IgeTexture_1.IgeTexture("starSmartTexture", star_1.starSmartTexture);
			new IgeTexture_1.IgeTexture("flagSmartTexture", flag_1.flagSmartTexture);
			new IgeTexture_1.IgeTexture("gridSmartTexture", grid_1.gridSmartTexture);
			const network = instance_1.ige.network;
			// Wait for our textures to load before continuing
			yield instance_1.ige.textures.whenLoaded();
			// Create the HTML canvas
			instance_1.ige.engine.createFrontBuffer(true);
			// Start the engine
			yield instance_1.ige.engine.start();
			// Load the base scene data
			yield instance_1.ige.engine.addGraph(IgeBaseScene_1.IgeBaseScene);
			const vp1 = instance_1.ige.$("vp1");
			vp1.addComponent("mousePan", IgeMousePanComponent_1.IgeMousePanComponent);
			vp1.components.mousePan.enabled(true);
			vp1.drawBounds(true, true);
			vp1.drawBoundsData(true);
			vp1.camera.translateTo(0, 540, 0);
			yield network.start("http://localhost:2000");
		});
	}
	removeGraph() {
		const network = instance_1.ige.network;
		network.stop();
		instance_1.ige.engine.stop();
	}
}
exports.AppClientScene = AppClientScene;
