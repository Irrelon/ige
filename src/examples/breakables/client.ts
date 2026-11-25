import { IgeBaseClass } from "@/engine/core/IgeBaseClass";
import type { IgeCamera } from "@/engine/core/IgeCamera";
import { IgeEntity } from "@/engine/core/IgeEntity";
import { IgePoint3d } from "@/engine/core/IgePoint3d";
import { IgeScene2d } from "@/engine/core/IgeScene2d";
import { IgeViewport } from "@/engine/core/IgeViewport";
import { IgeWebGlRenderer } from "@/engine/core/IgeWebGlRenderer";
import { IgeGamePadAxis, IgeGamePadButton, IgeGamePadComponent } from "@/engine/components/IgeGamePadComponent";
import { ige } from "@/engine/instance";
import type { IgeBreakResult, IgeBreakableOptions } from "@/engine/physics/IgeBreakable3d";
import { IgePhysics3d } from "@/engine/physics/IgePhysics3d";
import type { IgePhysicsBodyOptions } from "@/engine/physics/IgePhysics3dTypes";
import type { IgePhysicsVehicle3dApi, IgePhysicsWheelOptions } from "@/engine/physics/IgePhysicsVehicle3dApi";
import { IgeBreakableEffects3d } from "@/engine/webgl/IgeBreakableEffects3d";
import { IgeDecalSystem3d } from "@/engine/webgl/IgeDecalSystem3d";
import { IgeAmbientLight, IgeDirectionalLight } from "@/engine/webgl/IgeWebGlLight";
import { IgePrimitiveGeometry } from "@/engine/webgl/IgePrimitiveGeometry";
import { IgeBehaviourType } from "@/enums";
import type { IgeCanInit } from "@/types/IgeCanInit";
import type { IgeGeometryData3d } from "@/types/IgeGeometryData3d";
import type { IgeMaterialColor, IgeMaterialData } from "@/types/IgeMaterialData";
import {
	barrierMesh,
	benchMesh,
	binMesh,
	bollardMesh,
	COLORS,
	coneMesh,
	crateMesh,
	fenceMesh,
	frameMesh,
	palletMesh,
	paneMesh,
	plasticBarrierMesh,
	wheelMesh
} from "./props";

// @ts-ignore
window.ige = ige;

/**
 * Breakables: drive a car down a street and smash through crates and
 * pallets, a roadworks fence, plastic and concrete barriers, cones, a bin,
 * a bench, bollards, a bus shelter's glass, a phone box and a shop window.
 * Every prop is cut where it's hit at run time (igeFracture() through
 * physics.addBreakable()); nothing is pre-broken. The panel shows how
 * long each break took to cut and to spawn, and how many pieces there are.
 *
 * - Keyboard: W / up throttle, S / down brake and reverse, A D / left right
 *   steer, space handbrake, R put the car back on its wheels, T rebuild the
 *   street, M slow motion
 * - Gamepad: right trigger throttle, left trigger brake, left stick steer,
 *   A handbrake, B reset, Y rebuild
 *
 * One IGE unit is a centimetre (unitsPerMetre 100).
 */

const GRASS = { r: 0.36, g: 0.5, b: 0.3, a: 1 };
const ASPHALT = { r: 0.2, g: 0.21, b: 0.23, a: 1 };
const PAVING = { r: 0.62, g: 0.61, b: 0.58, a: 1 };
const SKY = { r: 0.62, g: 0.75, b: 0.88 };
const WHITE = { r: 1, g: 1, b: 1, a: 1 };
const GLASS: IgeMaterialData = { color: { r: 0.55, g: 0.72, b: 0.8, a: 0.35 }, roughness: 0.05, metallic: 0.2 };

/** How each kind of prop is made: its mesh, body and how it breaks. */
interface PropKind {
	mesh: () => IgeGeometryData3d;
	material?: IgeMaterialData;
	/** Without one, addBreakable() makes a static hull of the mesh. */
	body?: IgePhysicsBodyOptions;
	breakable: Omit<IgeBreakableOptions, "key">;
}

function v (x: number, y: number, z: number) {
	return { x, y, z };
}

/** v rotated by the quaternion q. */
function rotate (p: { x: number; y: number; z: number }, q: { x: number; y: number; z: number; w: number }) {
	const tx = 2 * (q.y * p.z - q.z * p.y), ty = 2 * (q.z * p.x - q.x * p.z), tz = 2 * (q.x * p.y - q.y * p.x);
	return { x: p.x + q.w * tx + (q.y * tz - q.z * ty), y: p.y + q.w * ty + (q.z * tx - q.x * tz), z: p.z + q.w * tz + (q.x * ty - q.y * tx) };
}

export class Client extends IgeBaseClass implements IgeCanInit {
	classId = "Client";
	renderer?: IgeWebGlRenderer;
	scene?: IgeScene2d;
	camera?: IgeCamera;
	physics?: IgePhysics3d;
	gamePad?: IgeGamePadComponent;
	car?: IgePhysicsVehicle3dApi;
	effects?: IgeBreakableEffects3d;
	decals?: IgeDecalSystem3d;
	kinds: Record<string, PropKind> = {};
	meshes: Record<string, IgeGeometryData3d> = {};
	/** The props standing now (rebuilt with T). */
	props: IgeEntity[] = [];
	generation: number = 0;
	keysDown: Record<string, boolean> = {};
	keysPressed: Record<string, boolean> = {};
	cameraYaw: number = 0;
	cameraHeight: number = 230;
	hud: Record<string, HTMLElement | null> = {};
	recent: string[] = [];
	/** Scripted driving (for tests and screenshots): full throttle until this time. */
	autoDriveUntil: number = 0;
	frameTimes: number[] = [];
	lastFrame: number = performance.now();
	/** The longest frame in the second after the last break (the hitch it caused), ms. */
	worstFrameAfterBreak: number = 0;
	watchFramesUntil: number = 0;
	/** A fixed camera (eye and target) instead of the chase camera, for watching a break from the side. */
	fixedView: { x: number; y: number; z: number; tx: number; ty: number; tz: number } | null = null;

	constructor () {
		super();
		void this.init();
	}

	async init () {
		try {
			this.renderer = new IgeWebGlRenderer();
			this.renderer.backFaceCulling(true);
			ige.engine.renderer(this.renderer);
			await this.renderer.setup();
			this.renderer.createFrontBuffer(true);
			this.renderer.setClearColor(SKY.r, SKY.g, SKY.b, 1);
			this.renderer.fog({ mode: "linear", color: SKY, near: 9000, far: 30000 });

			ige.engine.addComponent("gamePad", IgeGamePadComponent);
			this.gamePad = ige.engine.components.gamePad as IgeGamePadComponent;
			await ige.engine.start();

			this.scene = new IgeScene2d();
			this.scene.id("breakablesScene");
			const viewport = new IgeViewport();
			viewport.id("breakablesViewport").autoSize(true).scene(this.scene);
			this.camera = viewport.camera;
			this.camera.projectionType("perspective");
			this.camera.fov(60);
			this.camera.near(10);
			this.camera.far(40000);
			viewport.mount(ige.engine);
			this.setupLights();

			this.physics = await IgePhysics3d.create({ unitsPerMetre: 100 });
			this.physics.breakables.maxDebris(260);
			(window as any).breakablesExample = this;

			this.decals = new IgeDecalSystem3d({ maxDecals: 64, lifetime: 40 });
			this.decals.mount(this.scene);
			this.effects = new IgeBreakableEffects3d(this.physics.breakables, this.scene, { decals: this.decals, groundAt: (x) => (Math.abs(x) > 450 && Math.abs(x) < 850 ? 15 : 0) });
			this.physics.breakables.on("break", (result: IgeBreakResult) => this.onBreak(result));

			this.defineKinds();
			this.buildStreet();
			this.buildProps();
			this.car = this.buildCar(0, -700);
			this.physics.start();

			this.setupInput();
			ige.engine.addBehaviour(IgeBehaviourType.preUpdate, "breakablesInput", () => this.applyInput());
			ige.engine.addBehaviour(IgeBehaviourType.postUpdate, "breakablesCamera", (_engine: unknown, tickDelta: number) => {
				this.updateCamera(Math.min((tickDelta || 16) / 1000, 0.1));
				this.updateHud();
				this.keysPressed = {};
			});

			for (const id of ["speed", "physicsStatus", "lastBreak", "totals", "recent", "slowmo"]) this.hud[id] = document.getElementById(id);
			const status = this.hud.physicsStatus;
			if (status) status.textContent = this.physics.threaded() ? "Jolt, multithreaded" : "Jolt, single-threaded";
			document.querySelectorAll(".igeLoading").forEach((el) => el.remove());
		} catch (error) {
			console.error("Breakables example failed to start", error);
			const text = document.getElementById("loadingText");
			if (text) text.textContent = `Error: ${error}`;
		}
	}

	setupLights () {
		const lightManager = this.renderer?.lightManager;
		if (!this.scene || !lightManager) return;
		const ambient = new IgeAmbientLight();
		ambient.lightColor(0.62, 0.68, 0.8);
		ambient.intensity(0.6);
		ambient.mount(this.scene);
		lightManager.addLight(ambient);
		const sun = new IgeDirectionalLight();
		sun.lightColor(1, 0.95, 0.86);
		sun.intensity(1.05);
		sun.direction(-0.5, -1, -0.25);
		sun.mount(this.scene);
		lightManager.addLight(sun);
		const shadows = this.renderer!.shadowManager;
		if (shadows) {
			shadows.frustumSize(2600);
			shadows.shadowPlanes(1, 8000);
		}
		this.renderer!.enableShadows(sun, 2048);
	}

	/** An entity with a mesh and a material, mounted on a parent. */
	part (parent: IgeEntity, geometry: IgeGeometryData3d, material: IgeMaterialData, x: number, y: number, z: number): IgeEntity {
		const entity = new IgeEntity();
		entity.geometry(geometry);
		entity.material(material);
		entity.translateTo(x, y, z);
		entity.mount(parent);
		return entity;
	}

	/** A static box: drawn and solid. */
	solid (w: number, h: number, d: number, x: number, y: number, z: number, color: IgeMaterialColor, id: string): IgeEntity {
		const entity = this.part(this.scene!, IgePrimitiveGeometry.createBoxes([{ x: 0, y: 0, z: 0, w, h, d }], `${id}_${w}_${h}_${d}`), { color, roughness: 0.85 }, x, y, z);
		this.physics!.addBody(entity, { type: "static", shape: { type: "box", halfExtents: { x: w / 2, y: h / 2, z: d / 2 } } });
		return entity;
	}

	buildStreet () {
		const scene = this.scene!, physics = this.physics!;
		const size = 40000;
		const ground = this.part(scene, IgePrimitiveGeometry.createPlane(size, size, "breakGround"), { color: GRASS, roughness: 0.95 }, 0, 0, 0);
		ground.rotateTo(-Math.PI / 2, 0, 0);
		const slab = new IgeEntity().translateTo(0, -50, 0).mount(scene);
		physics.addBody(slab, { type: "static", shape: { type: "box", halfExtents: { x: size / 2, y: 50, z: size / 2 } } });

		// The road, its markings, and a pavement each side behind a 15 cm kerb
		this.part(scene, IgePrimitiveGeometry.createBoxes([{ x: 0, y: 0.5, z: 4000, w: 900, h: 1, d: 13000 }], "breakRoad"), { color: ASPHALT, roughness: 0.9 }, 0, 0, 0);
		const dashes: { x: number; y: number; z: number; w: number; h: number; d: number }[] = [];
		for (let i = 0; i < 40; i++) dashes.push({ x: 0, y: 1.2, z: -2000 + i * 320, w: 12, h: 0.5, d: 160 });
		this.part(scene, IgePrimitiveGeometry.createBoxes(dashes, "breakDashes"), { color: { r: 0.95, g: 0.95, b: 0.9, a: 1 }, roughness: 0.7 }, 0, 0, 0);
		for (const side of [-1, 1]) this.solid(400, 15, 13000, side * 650, 7.5, 4000, PAVING, "pavement");

		// Buildings behind the pavements, and a shop with a big window
		const brick = { r: 0.55, g: 0.36, b: 0.3, a: 1 }, render = { r: 0.82, g: 0.78, b: 0.7, a: 1 };
		for (let i = 0; i < 6; i++) this.solid(900, 700 + (i % 3) * 200, 1300, -1300, 350 + (i % 3) * 100, -1000 + i * 1600, i % 2 ? brick : render, "house");
		this.solid(900, 800, 2500, 1300, 400, 1000, brick, "house");
		this.solid(900, 700, 2200, 1300, 350, 4600, render, "house");
		// The shop: a front wall round a 3 m x 2 m window (its glass is a prop), and a room behind it
		const shopZ = 7400;
		this.solid(30, 500, 600, 865, 465, shopZ, render, "shopFront"); // above the window
		this.solid(30, 700, 450, 865, 350, shopZ - 375, render, "shopFront");
		this.solid(30, 700, 450, 865, 350, shopZ + 375, render, "shopFront");
		this.solid(30, 700, 1200, 1700, 350, shopZ, render, "shopBack");
		this.solid(850, 700, 30, 1275, 350, shopZ - 600, render, "shopSide");
		this.solid(850, 700, 30, 1275, 350, shopZ + 600, render, "shopSide");
		this.solid(850, 15, 1200, 1275, 7.5, shopZ, { r: 0.45, g: 0.4, b: 0.36, a: 1 }, "shopFloor");
		this.part(scene, IgePrimitiveGeometry.createBoxes([{ x: 0, y: 0, z: 0, w: 4, h: 30, d: 330 }], "shopSign"), { color: { r: 0.15, g: 0.3, b: 0.6, a: 1 }, roughness: 0.4 }, 848, 260, shopZ);
		this.solid(900, 900, 3000, 1300, 450, 9600, brick, "house");
		// The end of the street
		this.solid(3000, 200, 60, 0, 100, 10600, { r: 0.7, g: 0.68, b: 0.64, a: 1 }, "endWall");

		// Frames that hold glass but don't break: a bus shelter and a phone box
		const steel = { color: { r: 0.3, g: 0.32, b: 0.35, a: 1 }, metallic: 0.6, roughness: 0.4 };
		const shelter = this.part(scene, frameMesh([
			{ x: -150, y: 125, z: -75, w: 8, h: 250, d: 8 }, { x: 150, y: 125, z: -75, w: 8, h: 250, d: 8 },
			{ x: -150, y: 125, z: 75, w: 8, h: 250, d: 8 }, { x: 150, y: 125, z: 75, w: 8, h: 250, d: 8 },
			{ x: 0, y: 254, z: 0, w: 320, h: 8, d: 170 }, { x: 0, y: 40, z: 60, w: 280, h: 4, d: 30 }
		], "shelterFrame"), steel, 0, 0, 0);
		shelter.rotateTo(0, Math.PI / 2, 0).translateTo(640, 15, 5300);
		this.physics!.addBody(shelter, { type: "static", shape: { type: "compound", children: [
			{ shape: { type: "box", halfExtents: v(4, 125, 4) }, position: v(-150, 125, -75) }, { shape: { type: "box", halfExtents: v(4, 125, 4) }, position: v(150, 125, -75) },
			{ shape: { type: "box", halfExtents: v(4, 125, 4) }, position: v(-150, 125, 75) }, { shape: { type: "box", halfExtents: v(4, 125, 4) }, position: v(150, 125, 75) },
			{ shape: { type: "box", halfExtents: v(160, 4, 85) }, position: v(0, 254, 0) }
		] } });
		const red = { color: { r: 0.75, g: 0.08, b: 0.08, a: 1 }, metallic: 0.2, roughness: 0.4 };
		const phone = this.part(scene, frameMesh([
			{ x: -50, y: 120, z: -50, w: 10, h: 240, d: 10 }, { x: 50, y: 120, z: -50, w: 10, h: 240, d: 10 },
			{ x: -50, y: 120, z: 50, w: 10, h: 240, d: 10 }, { x: 50, y: 120, z: 50, w: 10, h: 240, d: 10 },
			{ x: 0, y: 248, z: 0, w: 116, h: 16, d: 116 }, { x: 0, y: 20, z: 0, w: 110, h: 40, d: 110 }
		], "phoneFrame"), red, 0, 0, 0);
		phone.translateTo(620, 15, 6500);
		this.physics!.addBody(phone, { type: "static", shape: { type: "compound", children: [
			{ shape: { type: "box", halfExtents: v(5, 120, 5) }, position: v(-50, 120, -50) }, { shape: { type: "box", halfExtents: v(5, 120, 5) }, position: v(50, 120, -50) },
			{ shape: { type: "box", halfExtents: v(5, 120, 5) }, position: v(-50, 120, 50) }, { shape: { type: "box", halfExtents: v(5, 120, 5) }, position: v(50, 120, 50) },
			{ shape: { type: "box", halfExtents: v(58, 8, 58) }, position: v(0, 248, 0) }, { shape: { type: "box", halfExtents: v(55, 20, 55) }, position: v(0, 20, 0) }
		] } });
	}

	/** Every kind of prop: its mesh, its body and how it breaks. */
	defineKinds () {
		const box = (x: number, y: number, z: number) => ({ type: "box" as const, halfExtents: v(x, y, z) });
		this.kinds = {
			crate: {
				mesh: crateMesh,
				body: { shape: box(30, 30, 30), offset: v(0, 30, 0), density: 90, friction: 0.6 },
				breakable: { threshold: 5000, material: "wood", mass: 20, debrisLifetime: 8 }
			},
			pallet: {
				mesh: palletMesh,
				body: { shape: box(60, 7, 50), offset: v(0, 7, 0), density: 260, friction: 0.7 },
				breakable: { threshold: 6000, material: "wood", mass: 22, debrisLifetime: 8 }
			},
			fence: {
				mesh: fenceMesh,
				breakable: { threshold: 350000, material: "wood", mass: 25, radius: 80, debrisLifetime: 10 }
			},
			plasticBarrier: {
				mesh: plasticBarrierMesh,
				body: { shape: box(125, 40, 25), offset: v(0, 40, 0), density: 50, friction: 0.6 },
				breakable: { threshold: 2500, material: "plastic", mass: 10, pieces: 8, debrisLifetime: 8 }
			},
			cone: {
				mesh: coneMesh,
				body: { shape: { type: "convex", geometry: coneMesh() }, density: 200, friction: 0.7 },
				breakable: { threshold: 3500, material: "plastic", mass: 3, pieces: 6, debrisLifetime: 8 }
			},
			bin: {
				mesh: binMesh,
				body: { shape: box(30, 50, 36), offset: v(0, 50, 0), density: 60, friction: 0.6 },
				breakable: { threshold: 4000, material: "plastic", mass: 12, pieces: 5, debrisLifetime: 8 }
			},
			bench: {
				mesh: benchMesh,
				breakable: { threshold: 300000, material: "wood", mass: 35, debrisLifetime: 10 }
			},
			bollard: {
				mesh: bollardMesh,
				body: { type: "static", shape: box(9, 50, 9), offset: v(0, 50, 0) },
				breakable: { threshold: 900000, material: "metal", mass: 60, bigVolume: 1000 }
			},
			barrier: {
				mesh: barrierMesh,
				breakable: { threshold: 1000000, material: "concrete", mass: 900, pieces: 9, bigLifetime: 60 }
			},
			shopWindow: {
				mesh: () => paneMesh(300, 200, "shopPane"),
				material: GLASS,
				breakable: { threshold: 40000, material: "glass", pieces: 16, debrisLifetime: 7 }
			},
			shelterPane: {
				mesh: () => paneMesh(140, 200, "shelterPane"),
				material: GLASS,
				breakable: { threshold: 30000, material: "glass", pieces: 14, debrisLifetime: 7 }
			},
			phonePane: {
				mesh: () => paneMesh(88, 150, "phonePane"),
				material: GLASS,
				breakable: { threshold: 30000, material: "glass", pieces: 12, debrisLifetime: 7 }
			}
		};
	}

	/** A prop of a kind at a place, turned round y, made breakable. */
	prop (kind: string, x: number, y: number, z: number, heading: number = 0): IgeEntity {
		const spec = this.kinds[kind];
		const mesh = (this.meshes[kind] ??= spec.mesh());
		const entity = this.part(this.scene!, mesh, spec.material ?? { color: WHITE, roughness: 0.8 }, x, y, z);
		entity.rotateTo(0, heading, 0);
		if (spec.body) this.physics!.addBody(entity, spec.body);
		this.physics!.addBreakable(entity, { ...spec.breakable, key: `${kind}-${this.generation}-${this.props.length}` });
		this.props.push(entity);
		return entity;
	}

	/** Every prop along the street. */
	buildProps () {
		const half = Math.PI / 2;
		// Crates stacked in one lane, and pallets in the other
		for (let row = 0; row < 3; row++) {
			for (let i = 0; i < 3 - row; i++) this.prop("crate", 140 + i * 62 + row * 31, row * 61, 900);
		}
		this.prop("crate", -260, 0, 1200);
		this.prop("crate", -200, 0, 1290, 0.4);
		for (let i = 0; i < 3; i++) this.prop("pallet", -230, i * 14.2, 1500, half);
		this.prop("pallet", 200, 0, 1700, 0.3);

		// Roadworks: plastic barriers, then cones across the road
		this.prop("plasticBarrier", -200, 0, 2400);
		this.prop("plasticBarrier", 200, 0, 2550);
		for (let i = 0; i < 6; i++) this.prop("cone", -375 + i * 150, 0, 2900 + (i % 2) * 60);

		// A wooden fence across the road
		for (let i = 0; i < 4; i++) this.prop("fence", -300 + i * 200, 0, 3600);

		// Concrete barriers, staggered
		this.prop("barrier", -200, 0, 4300);
		this.prop("barrier", 220, 0, 4700);

		// The pavement at +x: bus shelter glass facing the road, bollards, a bench, a bin, a phone box
		this.prop("shelterPane", 565, 30, 5227, half);
		this.prop("shelterPane", 565, 30, 5373, half);
		this.prop("shelterPane", 640, 30, 5148);
		for (let i = 0; i < 3; i++) this.prop("bollard", 500, 15, 5600 + i * 150);
		this.prop("bench", 650, 15, 6050, -half);
		this.prop("bin", 560, 15, 6250, half);
		this.prop("phonePane", 569, 55, 6500, half);
		this.prop("phonePane", 620, 55, 6449);
		this.prop("phonePane", 620, 55, 6551);
		this.prop("crate", 1100, 15, 7300);
		this.prop("crate", 1180, 15, 7500, 0.5);

		// The shop window
		this.prop("shopWindow", 860, 15, 7400, half);

		// The pavement at -x: more fence, a bin, a bench, cones and crates
		for (let i = 0; i < 3; i++) this.prop("fence", -830, 15, 2000 + i * 200, half);
		this.prop("bin", -560, 15, 3000);
		this.prop("bench", -650, 15, 5000, half);
		for (let i = 0; i < 4; i++) this.prop("cone", -520, 15, 6000 + i * 120);
		this.prop("barrier", -560, 15, 8000, half);
		for (let i = 0; i < 3; i++) this.prop("crate", -100 + i * 64, 0, 8800);
	}

	/** Take every prop and piece away and stand the street up again. */
	rebuild () {
		const physics = this.physics!;
		physics.breakables.destroy();
		for (const entity of this.props) {
			const body = physics.bodyOf(entity);
			if (body) body.destroy();
			if (entity._alive !== false) entity.destroy();
		}
		this.props = [];
		this.generation++;
		this.decals?.clear();
		this.buildProps();
		this.recent = [];
	}

	/** Watch from a fixed place (eye, then target), or null for the chase camera again. */
	view (x: number | null, y = 0, z = 0, tx = 0, ty = 0, tz = 0) {
		this.fixedView = x === null ? null : { x, y, z, tx, ty, tz };
	}

	onBreak (result: IgeBreakResult) {
		if (performance.now() > this.watchFramesUntil) this.worstFrameAfterBreak = 0;
		this.watchFramesUntil = performance.now() + 1000;
		const big = result.big.length, small = result.pieces.length - big;
		const name = result.event.id.split("-")[0];
		const line = `${name}: ${result.pieces.length} pieces (${big} big), cut ${result.fractureMs.toFixed(1)} ms, spawn ${result.spawnMs.toFixed(1)} ms`;
		this.recent.unshift(line);
		this.recent.length = Math.min(this.recent.length, 7);
		const last = this.hud.lastBreak;
		if (last) last.textContent = `${name} broke at ${(result.strength).toFixed(1)}x its threshold: ${small} small + ${big} big pieces`;
	}

	/** A wheel model: tyre, hub and a spoke so it can be seen turning. */
	buildWheel (parent: IgeEntity, radius: number, width: number, outward: number): IgeEntity {
		const wheel = this.part(parent, wheelMesh(radius, width, 28, `tyre_${radius}_${width}`), { color: { r: 0.08, g: 0.08, b: 0.09, a: 1 }, roughness: 0.95 }, 0, 0, 0);
		const face = outward * (width / 2 + 0.6);
		this.part(wheel, wheelMesh(radius * 0.55, 1, 20, `hub_${radius}`), { color: { r: 0.75, g: 0.76, b: 0.78, a: 1 }, metallic: 0.8, roughness: 0.35 }, face, 0, 0);
		this.part(wheel, IgePrimitiveGeometry.createBoxes([{ x: 0, y: 0, z: 0, w: 1.5, h: radius * 1.1, d: radius * 0.18 }], `spoke_${radius}`), { color: { r: 0.2, g: 0.2, b: 0.22, a: 1 } }, face + outward * 0.8, 0, 0);
		return wheel;
	}

	/** The vehicles example's saloon car (its body in blue). */
	buildCar (x: number, z: number): IgePhysicsVehicle3dApi {
		const root = new IgeEntity().id("car").translateTo(x, 30, z).mount(this.scene!);
		const paint = { color: { r: 0.15, g: 0.32, b: 0.7, a: 1 }, metallic: 0.3, roughness: 0.35 };
		const box = (w: number, h: number, d: number, id: string) => IgePrimitiveGeometry.createBoxes([{ x: 0, y: 0, z: 0, w, h, d }], id);
		this.part(root, box(170, 56, 440, "carBody"), paint, 0, 68, 0);
		this.part(root, box(150, 42, 200, "carGlass"), { color: { r: 0.1, g: 0.13, b: 0.17, a: 1 }, metallic: 0.2, roughness: 0.1 }, 0, 117, -25);
		this.part(root, box(146, 8, 180, "carRoof"), paint, 0, 142, -30);
		for (const side of [-1, 1]) {
			this.part(root, box(34, 12, 3, "headlight"), { color: { r: 1, g: 0.97, b: 0.85, a: 1 }, emissiveColor: { r: 1, g: 0.95, b: 0.8 }, emissiveIntensity: 1.5 }, side * 55, 80, 221);
			this.part(root, box(34, 10, 3, "taillight"), { color: { r: 0.8, g: 0.05, b: 0.05, a: 1 }, emissiveColor: { r: 1, g: 0.1, b: 0.1 }, emissiveIntensity: 1 }, side * 55, 84, -221);
		}
		const layout = [{ x: 78, z: 135, steer: 32 }, { x: -78, z: 135, steer: 32 }, { x: 78, z: -130 }, { x: -78, z: -130 }];
		const wheels: IgePhysicsWheelOptions[] = layout.map((w) => ({
			position: { x: w.x, y: 53, z: w.z },
			steer: w.steer,
			entity: this.buildWheel(root, 34, 22, Math.sign(w.x))
		}));
		return this.physics!.addVehicle(root, { wheels });
	}

	setupInput () {
		window.addEventListener("keydown", (e) => {
			if (!this.keysDown[e.code]) this.keysPressed[e.code] = true;
			this.keysDown[e.code] = true;
			if (e.code === "Space" || e.code.startsWith("Arrow")) e.preventDefault();
		});
		window.addEventListener("keyup", (e) => {
			this.keysDown[e.code] = false;
		});
		window.addEventListener("blur", () => {
			this.keysDown = {};
		});
	}

	padIndex (): number {
		const pad = this.gamePad;
		if (!pad) return -1;
		for (let i = 0; i < 4; i++) if (pad.isConnected(i)) return i;
		return -1;
	}

	applyInput () {
		const car = this.car;
		if (!car) return;
		const keys = this.keysDown;
		let forward = keys.KeyW || keys.ArrowUp ? 1 : 0;
		let brake = keys.KeyS || keys.ArrowDown ? 1 : 0;
		let right = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
		let handbrake = keys.Space ? 1 : 0;
		let reset = !!this.keysPressed.KeyR;
		let rebuild = !!this.keysPressed.KeyT;
		const pad = this.gamePad, index = this.padIndex();
		if (pad && index >= 0) {
			forward = Math.max(forward, pad.buttonValue(index, IgeGamePadButton.rightTrigger));
			brake = Math.max(brake, pad.buttonValue(index, IgeGamePadButton.leftTrigger));
			const stick = pad.axis(index, IgeGamePadAxis.leftX);
			if (Math.abs(stick) > Math.abs(right)) right = stick;
			if (pad.button(index, IgeGamePadButton.a)) handbrake = 1;
			reset = reset || pad.justPressed(index, IgeGamePadButton.b);
			rebuild = rebuild || pad.justPressed(index, IgeGamePadButton.y);
		}
		if (performance.now() < this.autoDriveUntil) forward = 1;
		if (this.keysPressed.KeyM) this.slowMotion(ige.engine.timeScale() === 1);
		car.drive({ forward, right, brake, handbrake });
		if (reset) this.putBackOnWheels();
		if (rebuild) this.rebuild();
	}

	/** Slow the world down to watch a break, or back to normal. */
	slowMotion (on: boolean) {
		ige.engine.timeScale(on ? 0.2 : 1);
		const el = this.hud.slowmo;
		if (el) el.textContent = on ? "slow motion (M)" : "";
	}

	putBackOnWheels () {
		const car = this.car!;
		const state = car.getState();
		const f = rotate({ x: 0, y: 0, z: 1 }, state.rotation);
		const heading = Math.atan2(f.x, f.z);
		car.setState({
			position: { x: state.position.x, y: Math.max(state.position.y, 0) + 60, z: state.position.z },
			rotation: { x: 0, y: Math.sin(heading / 2), z: 0, w: Math.cos(heading / 2) },
			velocity: { x: 0, y: 0, z: 0 },
			angularVelocity: { x: 0, y: 0, z: 0 },
			upright: true
		});
	}

	/**
	 * Put the car somewhere heading somewhere at a speed, with the throttle
	 * held for a while: for screenshots and checks from the console.
	 * @example #Into the fence at 50 km/h
	 *     breakablesExample.launch(0, 2800, 0, 50, 2)
	 */
	launch (x: number, z: number, heading: number, kmh: number, seconds: number = 1.5) {
		const car = this.car!;
		const speed = (kmh / 3.6) * 100;
		car.setState({
			position: { x, y: 5, z },
			rotation: { x: 0, y: Math.sin(heading / 2), z: 0, w: Math.cos(heading / 2) },
			velocity: { x: Math.sin(heading) * speed, y: 0, z: Math.cos(heading) * speed },
			angularVelocity: { x: 0, y: 0, z: 0 },
			upright: true
		});
		this.cameraYaw = heading;
		this.autoDriveUntil = performance.now() + seconds * 1000;
	}

	updateCamera (dt: number) {
		const camera = this.camera, car = this.car;
		if (!camera || !car) return;
		const fixed = this.fixedView;
		if (fixed) {
			camera.translateTo(fixed.x, fixed.y, fixed.z);
			if (!camera._lookAt) camera._lookAt = new IgePoint3d(fixed.tx, fixed.ty, fixed.tz);
			camera._lookAt.x = fixed.tx;
			camera._lookAt.y = fixed.ty;
			camera._lookAt.z = fixed.tz;
			camera.fov(60);
			return;
		}
		const entity = car.entity;
		const p = entity._translate;
		const q = entity.quaternion() || { x: 0, y: 0, z: 0, w: 1 };
		const f = rotate({ x: 0, y: 0, z: 1 }, q);
		if (Math.hypot(f.x, f.z) > 0.2) {
			let turn = Math.atan2(f.x, f.z) - this.cameraYaw;
			turn = Math.atan2(Math.sin(turn), Math.cos(turn));
			this.cameraYaw += turn * (1 - Math.exp(-dt * 4));
		}
		this.cameraHeight += (p.y + 260 - this.cameraHeight) * (1 - Math.exp(-dt * 6));
		camera.translateTo(p.x - Math.sin(this.cameraYaw) * 760, Math.max(this.cameraHeight, 60), p.z - Math.cos(this.cameraYaw) * 760);
		if (!camera._lookAt) camera._lookAt = new IgePoint3d(p.x, p.y + 100, p.z);
		camera._lookAt.x = p.x;
		camera._lookAt.y = p.y + 100;
		camera._lookAt.z = p.z;
		camera.fov(60 + Math.min(12, Math.abs(car.speedKmh()) / 12));
	}

	updateHud () {
		const physics = this.physics, car = this.car;
		if (!physics || !car) return;
		const t = performance.now();
		this.frameTimes.push(t - this.lastFrame);
		if (t < this.watchFramesUntil) this.worstFrameAfterBreak = Math.max(this.worstFrameAfterBreak, t - this.lastFrame);
		this.lastFrame = t;
		if (this.frameTimes.length > 60) this.frameTimes.shift();
		const set = (id: string, text: string) => {
			const el = this.hud[id];
			if (el && el.textContent !== text) el.textContent = text;
		};
		set("speed", Math.round(Math.abs(car.speedKmh())).toString());
		const stats = physics.breakables.stats();
		const step = physics.stats();
		const frame = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
		const hitch = this.worstFrameAfterBreak ? `, longest frame after the last break ${this.worstFrameAfterBreak.toFixed(0)} ms` : "";
		set("totals", `${stats.breaks} breaks, ${stats.intact} props standing. Pieces: ${stats.debris} small (of ${physics.breakables.maxDebris()} at most), ${stats.big} big. Bodies ${step.bodies}, ${step.activeBodies} awake, physics ${step.stepMs.toFixed(1)} ms, frame ${frame.toFixed(1)} ms${hitch}`);
		set("recent", this.recent.join("\n"));
	}
}
