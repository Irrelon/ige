import { IgeBaseClass } from "../../../dist/index.js";
import { IgeScene2d } from "../../../dist/index.js";
import { IgeViewport } from "../../../dist/index.js";
import { ige } from "../../../dist/index.js";
import { IgeEntityBox2d } from "../../../dist/index.js";
import { IgeBox2dBodyType } from "../../../dist/index.js";
import { IgeBox2dFixtureShapeType } from "../../../dist/index.js";
import type { IgeCanInit } from "../../../dist/index.js";
import type { IgeCanvasRenderingContext2d } from "../../../dist/index.js";

export class Client extends IgeBaseClass implements IgeCanInit {
	classId = "Client";

	constructor () {
		super();

		// @ts-ignore
		window.ige = ige;

		void this.init();
	}

	async init () {
		// Wait for our textures to load before continuing
		await ige.textures.whenLoaded();

		// Create the HTML canvas
		ige.engine.createFrontBuffer(true);

		// Setup physics world
		ige.box2d.sleep(true).gravity(0, 10).createWorld().start();

		// Start the engine
		await ige.engine.start();

		// Create the scene
		const scene1 = new IgeScene2d().id("scene1");

		// Create the main viewport
		new IgeViewport().id("vp1").autoSize(true).scene(scene1).drawBounds(true).mount(ige.engine);

		class PhysicsEntity extends IgeEntityBox2d {
			update (ctx: IgeCanvasRenderingContext2d, tickDelta: number) {
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
					type: IgeBox2dBodyType.dynamic,
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
								type: IgeBox2dFixtureShapeType.circle,
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

		new IgeEntityBox2d()
			.box2dBody({
				type: IgeBox2dBodyType.dynamic,
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
							type: IgeBox2dFixtureShapeType.rectangle
						}
					}
				]
			})
			.id("square1")
			.translateTo(-40, -470, 0)
			.drawBounds(true)
			.mount(scene1);

		new IgeEntityBox2d()
			.box2dBody({
				type: IgeBox2dBodyType.dynamic,
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
							type: IgeBox2dFixtureShapeType.rectangle
						}
					}
				]
			})
			.id("square2")
			.translateTo(90, -560, 0)
			.drawBounds(true)
			.mount(scene1);

		// Create the room boundaries in box2d
		new IgeEntityBox2d()
			.translateTo(0, 50, 0)
			.width(880)
			.height(20)
			.box2dBody({
				type: IgeBox2dBodyType.static,
				allowSleep: true,
				fixtures: [
					{
						shape: {
							type: IgeBox2dFixtureShapeType.rectangle
						}
					}
				]
			})
			.drawBounds(true)
			.mount(scene1);

		// Add the box2d debug painter entity to the
		// scene to show the box2d body outlines
		ige.box2d.enableDebug(scene1);
	}
}
