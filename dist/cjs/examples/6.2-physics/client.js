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
const IgeBaseClass_1 = require("../../engine/core/IgeBaseClass.js");
const instance_1 = require("../../engine/instance.js");
const IgeScene2d_1 = require("../../engine/core/IgeScene2d.js");
const IgeViewport_1 = require("../../engine/core/IgeViewport.js");
const IgeEntityBox2d_1 = require("../../engine/components/physics/box2d/IgeEntityBox2d.js");
const IgeBox2dBodyType_1 = require("../../enums/IgeBox2dBodyType.js");
const IgeBox2dFixtureShapeType_1 = require("../../enums/IgeBox2dFixtureShapeType.js");
class Client extends IgeBaseClass_1.IgeBaseClass {
	constructor() {
		super();
		this.classId = "Client";
		// @ts-ignore
		window.ige = instance_1.ige;
		void this.init();
	}
	init() {
		return __awaiter(this, void 0, void 0, function* () {
			// Wait for our textures to load before continuing
			yield instance_1.ige.textures.whenLoaded();
			// Create the HTML canvas
			instance_1.ige.engine.createFrontBuffer(true);
			// Setup physics world
			instance_1.ige.box2d.sleep(true).gravity(0, 10).createWorld().start();
			// Start the engine
			yield instance_1.ige.engine.start();
			// Create the scene
			const scene1 = new IgeScene2d_1.IgeScene2d().id("scene1");
			// Create the main viewport
			new IgeViewport_1.IgeViewport()
				.id("vp1")
				.autoSize(true)
				.scene(scene1)
				.drawBounds(true)
				.mount(instance_1.ige.engine);
			class PhysicsEntity extends IgeEntityBox2d_1.IgeEntityBox2d {
				update(ctx, tickDelta) {
					super.update(ctx, tickDelta);
					if (this._translate.y > 4000) {
						this.destroy();
						console.log("Destroy", scene1._children.length);
					}
				}
			}
			for (let i = 0; i < 1000; i++) {
				new PhysicsEntity()
					.width(8)
					.height(8)
					.box2dBody({
						type: IgeBox2dBodyType_1.IgeBox2dBodyType.dynamic,
						linearDamping: 0.0,
						angularDamping: 0.1,
						allowSleep: true,
						bullet: false,
						gravitic: true,
						fixedRotation: false,
						fixtures: [
							{
								density: 1.0,
								friction: 0.5,
								restitution: 0.2,
								shape: {
									type: IgeBox2dFixtureShapeType_1.IgeBox2dFixtureShapeType.circle,
									data: {
										// The position of the fixture relative to the body
										x: 0,
										y: 0
									}
								}
							}
						]
					})
					.translateTo(Math.random() * 30 - 15, -300 - i * 25, 0)
					.drawBounds(true)
					.mount(scene1);
			}
			new IgeEntityBox2d_1.IgeEntityBox2d()
				.box2dBody({
					type: IgeBox2dBodyType_1.IgeBox2dBodyType.dynamic,
					linearDamping: 0.0,
					angularDamping: 0.1,
					allowSleep: true,
					bullet: false,
					gravitic: true,
					fixedRotation: false,
					fixtures: [
						{
							density: 1.0,
							friction: 0.5,
							restitution: 0.2,
							shape: {
								type: IgeBox2dFixtureShapeType_1.IgeBox2dFixtureShapeType.rectangle
							}
						}
					]
				})
				.id("square1")
				.translateTo(-40, -470, 0)
				.drawBounds(true)
				.mount(scene1);
			new IgeEntityBox2d_1.IgeEntityBox2d()
				.box2dBody({
					type: IgeBox2dBodyType_1.IgeBox2dBodyType.dynamic,
					linearDamping: 0.0,
					angularDamping: 0.1,
					allowSleep: true,
					bullet: false,
					gravitic: true,
					fixedRotation: false,
					fixtures: [
						{
							density: 1.0,
							friction: 0.5,
							restitution: 0.2,
							shape: {
								type: IgeBox2dFixtureShapeType_1.IgeBox2dFixtureShapeType.rectangle
							}
						}
					]
				})
				.id("square2")
				.translateTo(90, -560, 0)
				.drawBounds(true)
				.mount(scene1);
			// Create the room boundaries in box2d
			new IgeEntityBox2d_1.IgeEntityBox2d()
				.translateTo(0, 50, 0)
				.width(880)
				.height(20)
				.box2dBody({
					type: IgeBox2dBodyType_1.IgeBox2dBodyType.static,
					allowSleep: true,
					fixtures: [
						{
							shape: {
								type: IgeBox2dFixtureShapeType_1.IgeBox2dFixtureShapeType.rectangle
							}
						}
					]
				})
				.drawBounds(true)
				.mount(scene1);
			// Add the box2d debug painter entity to the
			// scene to show the box2d body outlines
			instance_1.ige.box2d.enableDebug(scene1);
		});
	}
}
exports.Client = Client;
