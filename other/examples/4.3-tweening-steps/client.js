import { IgeBaseClass } from "../../engine/core/IgeBaseClass.js";
import { IgeEntity } from "../../engine/core/IgeEntity.js";
import { IgeScene2d } from "../../engine/core/IgeScene2d.js";
import { IgeTexture } from "../../engine/core/IgeTexture.js";
import { IgeTween } from "../../engine/core/IgeTween.js";
import { IgeViewport } from "../../engine/core/IgeViewport.js";
import { ige } from "../../engine/instance.js";

var __awaiter =
	(this && this.__awaiter) ||
	function (thisArg, _arguments, P, generator) {
		function adopt (value) {
			return value instanceof P
				? value
				: new P(function (resolve) {
					resolve(value);
				  });
		}
		return new (P || (P = Promise))(function (resolve, reject) {
			function fulfilled (value) {
				try {
					step(generator.next(value));
				} catch (e) {
					reject(e);
				}
			}
			function rejected (value) {
				try {
					step(generator["throw"](value));
				} catch (e) {
					reject(e);
				}
			}
			function step (result) {
				result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
			}
			step((generator = generator.apply(thisArg, _arguments || [])).next());
		});
	};

// @ts-ignore
window.ige = ige;
export class Client extends IgeBaseClass {
	constructor () {
		super();
		this.classId = "Client";
		void this.init();
	}
	init () {
		return __awaiter(this, void 0, void 0, function* () {
			// Load the game textures
			new IgeTexture("fairy", "../assets/textures/sprites/fairy.png");
			// Wait for our textures to load before continuing
			yield ige.textures.whenLoaded();
			// Create the HTML canvas
			ige.engine.createFrontBuffer(true);
			// Start the engine
			yield ige.engine.start();
			// Create the scene
			const scene1 = new IgeScene2d().id("scene1");
			// Create the main viewport
			new IgeViewport()
				.id("vp1")
				.autoSize(true)
				.scene(scene1)
				.drawBounds(true)
				.drawBoundsData(true)
				.mount(ige.engine);
			const obj = [];
			for (let i = 0; i < 10; i++) {
				obj[i] = new IgeEntity()
					.id("fairy" + i)
					.depth(i)
					.width(100)
					.height(100)
					.texture(ige.textures.get("fairy"))
					.drawBounds(false)
					.drawBoundsData(false)
					.opacity(0)
					.mount(scene1);
				obj[i]._translate
					.tween()
					.stepTo(
						{
							x: 100 + i * 20,
							y: 0 + i * 20
						},
						1000,
						"inOutSine"
					)
					.stepTo(
						{
							x: 0,
							y: -100 - i * 20
						},
						1000,
						"inOutSine"
					)
					.stepTo(
						{
							x: -100 - i * 20,
							y: 100 + i * 20
						},
						1000,
						"inOutSine"
					)
					.beforeStep(function (tween, step) {
						console.log("beforeStep", step);
					})
					.afterStep(function (tween, step) {
						console.log("afterStep", step);
					})
					.repeatMode(1, -1)
					.startTime(ige.engine._currentTime + i)
					.start();
				new IgeTween(obj[i])
					.properties({
						_opacity: 0.6
					})
					.duration(2000)
					.start();
			}
		});
	}
}
