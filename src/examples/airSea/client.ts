import { IgeBaseClass } from "@/engine/core/IgeBaseClass";
import type { IgeCamera } from "@/engine/core/IgeCamera";
import { IgeEntity } from "@/engine/core/IgeEntity";
import { IgePoint3d } from "@/engine/core/IgePoint3d";
import { IgeScene2d } from "@/engine/core/IgeScene2d";
import { IgeViewport } from "@/engine/core/IgeViewport";
import { IgeWebGlRenderer } from "@/engine/core/IgeWebGlRenderer";
import { IgeGamePadAxis, IgeGamePadButton, IgeGamePadComponent } from "@/engine/components/IgeGamePadComponent";
import { ige } from "@/engine/instance";
import { IgePhysics3d } from "@/engine/physics/IgePhysics3d";
import type { IgePhysicsImpact, IgePhysicsShape } from "@/engine/physics/IgePhysics3dTypes";
import type {
	IgePhysicsAircraft3dApi,
	IgePhysicsAircraftPreset,
	IgePhysicsBoat3dApi,
	IgePhysicsCraft3dApi,
	IgePhysicsCraftLanding,
	IgePhysicsCraftState
} from "@/engine/physics/IgePhysicsCraft3dApi";
import { AIRCRAFT_PRESETS, BOAT_PRESETS } from "@/engine/physics/IgePhysicsCraft3dPresets";
import type { IgeWater3d } from "@/engine/physics/IgeWater3d";
import { IgeAmbientLight, IgeDirectionalLight } from "@/engine/webgl/IgeWebGlLight";
import { IgePrimitiveGeometry } from "@/engine/webgl/IgePrimitiveGeometry";
import { IgeBehaviourType } from "@/enums";
import type { IgeCanInit } from "@/types/IgeCanInit";
import type { IgeGeometryData3d } from "@/types/IgeGeometryData3d";
import type { IgeMaterialColor } from "@/types/IgeMaterialData";
import { createBox, createFlatRects, createWheel, SeaGrid } from "./geometry";

// @ts-ignore
window.ige = ige;

/**
 * Air and sea: a helicopter, a light plane, a floatplane, a jet, an
 * airliner and a speedboat on IgePhysics3d's boats and aircraft
 * (engine-neutral flight and buoyancy over the physics backend's forces),
 * on an airfield island in a sea with waves. The sea is drawn from the
 * same wave function the boats float on. Floating crates by the jetty.
 *
 * - 1-6 or C pick a craft, R puts it back at its start, H hides the help
 * - Planes: W S throttle, arrows pitch (up: nose down) and roll, A D rudder
 *   and nose wheel, space brakes, G gear, F flaps
 * - Helicopter: W S up and down (let go: it holds height), arrows tilt, A D turn
 * - Boat: W S ahead and astern, A D or left right rudder
 * - Gamepad: right trigger throttle (up), left trigger brakes (down), left
 *   stick pitch and roll (rudder), bumpers yaw, A gear, X flaps, Y next, B reset
 *
 * One IGE unit is a centimetre (unitsPerMetre 100).
 */

type Kind = "plane" | "helicopter" | "boat";

interface Craft {
	key: string;
	name: string;
	kind: Kind;
	craft: IgePhysicsCraft3dApi;
	start: IgePhysicsCraftState;
	/** Chase camera distance behind and height above. */
	distance: number;
	height: number;
	/** Plane levers, held between frames. */
	throttle: number;
	flaps: number;
	gear: boolean;
}

const SKY = { r: 0.6, g: 0.76, b: 0.92 };
const U = 100;
const SEA_WAVES = [
	{ direction: 25, length: 6000, amplitude: 32, steepness: 0.4 },
	{ direction: 70, length: 2300, amplitude: 12, steepness: 0.5, phase: 1.3 },
	{ direction: -30, length: 1100, amplitude: 5, steepness: 0.35, phase: 2.1 }
];
const ISLAND_TOP = 300;

const rotate = (v: { x: number; y: number; z: number }, q: { x: number; y: number; z: number; w: number }) => {
	const tx = 2 * (q.y * v.z - q.z * v.y), ty = 2 * (q.z * v.x - q.x * v.z), tz = 2 * (q.x * v.y - q.y * v.x);
	return { x: v.x + q.w * tx + (q.y * tz - q.z * ty), y: v.y + q.w * ty + (q.z * tx - q.x * tz), z: v.z + q.w * tz + (q.x * ty - q.y * tx) };
};
const yawQuat = (degrees: number) => ({ x: 0, y: Math.sin((degrees * Math.PI) / 360), z: 0, w: Math.cos((degrees * Math.PI) / 360) });
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

export class Client extends IgeBaseClass implements IgeCanInit {
	classId = "Client";
	renderer?: IgeWebGlRenderer;
	scene?: IgeScene2d;
	camera?: IgeCamera;
	physics?: IgePhysics3d;
	water?: IgeWater3d;
	gamePad?: IgeGamePadComponent;
	sea?: SeaGrid;
	seaEntity?: IgeEntity;
	farSea?: IgeEntity;
	crafts: Craft[] = [];
	active: number = 0;
	keysDown: Record<string, boolean> = {};
	keysPressed: Record<string, boolean> = {};
	cameraYaw: number = 0;
	cameraPitch: number = 0;
	cameraPos?: { x: number; y: number; z: number };
	hud: Record<string, HTMLElement | null> = {};
	event: { text: string; until: number } = { text: "", until: 0 };
	frames: number = 0;

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
			this.renderer.fog({ mode: "linear", color: SKY, near: 60000, far: 420000 });

			ige.engine.addComponent("gamePad", IgeGamePadComponent);
			this.gamePad = ige.engine.components.gamePad as IgeGamePadComponent;
			await ige.engine.start();

			this.scene = new IgeScene2d();
			this.scene.id("airSeaScene");
			const viewport = new IgeViewport();
			viewport.id("airSeaViewport").autoSize(true).scene(this.scene);
			this.camera = viewport.camera;
			this.camera.projectionType("perspective");
			this.camera.fov(60);
			this.camera.near(30);
			this.camera.far(480000);
			viewport.mount(ige.engine);
			this.setupLights();

			this.physics = await IgePhysics3d.create({ unitsPerMetre: U });
			this.water = this.physics.water({ level: 0, waves: SEA_WAVES })!;
			(window as any).airSeaExample = this;
			this.buildSea();
			this.buildIsland();
			this.buildJetty();
			this.buildCrates();
			this.crafts.push(this.buildHelicopter());
			this.crafts.push(this.buildPlane("lightPlane", "Light plane", { x: -12000, y: ISLAND_TOP, z: -146000 }, 0, 1300, 380));
			this.crafts.push(this.buildPlane("floatplane", "Floatplane", { x: 22000, y: 0, z: -2500 }, 90, 1400, 420));
			this.crafts.push(this.buildPlane("jet", "Jet", { x: 0, y: ISLAND_TOP, z: 20000 }, 0, 2000, 480));
			this.crafts.push(this.buildPlane("airliner", "Airliner", { x: 0, y: ISLAND_TOP, z: -146000 }, 0, 5600, 1500));
			this.crafts.push(this.buildSpeedboat());
			this.buildSceneryBoats();
			this.physics.start();
			this.select(1);

			this.setupInput();
			this.buildButtons();
			// Input before the physics step, camera, sea and readout after it
			ige.engine.addBehaviour(IgeBehaviourType.preUpdate, "airSeaInput", (_engine: unknown, tickDelta: number) => this.applyInput(Math.min((tickDelta || 16) / 1000, 0.1)));
			ige.engine.addBehaviour(IgeBehaviourType.postUpdate, "airSeaView", (_engine: unknown, tickDelta: number) => {
				const dt = Math.min((tickDelta || 16) / 1000, 0.1);
				this.updateCamera(dt);
				this.updateSea();
				this.updateHud();
				this.keysPressed = {};
				this.frames++;
			});

			for (const id of ["craftName", "speed", "knots", "rows", "throttleBar", "stall", "event", "physicsStatus"]) this.hud[id] = document.getElementById(id);
			const status = this.hud.physicsStatus;
			if (status) status.textContent = this.physics.threaded() ? "Jolt, multithreaded" : "Jolt, single-threaded (serve with COOP/COEP headers for threads)";
			document.querySelectorAll(".igeLoading").forEach((el) => el.remove());
		} catch (error) {
			console.error("Air and sea example failed to start", error);
			const text = document.getElementById("loadingText");
			if (text) text.textContent = `Error: ${error}`;
		}
	}

	setupLights () {
		const lightManager = this.renderer?.lightManager;
		if (!this.scene || !lightManager) return;
		const ambient = new IgeAmbientLight();
		ambient.lightColor(0.62, 0.7, 0.82);
		ambient.intensity(0.6);
		ambient.mount(this.scene);
		lightManager.addLight(ambient);

		const sun = new IgeDirectionalLight();
		sun.lightColor(1, 0.95, 0.86);
		sun.intensity(1.1);
		sun.direction(-0.4, -1, -0.35);
		sun.mount(this.scene);
		lightManager.addLight(sun);
		const shadows = this.renderer!.shadowManager;
		if (shadows) {
			shadows.frustumSize(6000);
			shadows.shadowPlanes(1, 20000);
		}
		this.renderer!.enableShadows(sun, 2048);
	}

	/** An entity with a mesh and a colour, mounted on a parent. */
	part (parent: IgeEntity, geometry: IgeGeometryData3d, color: IgeMaterialColor, x: number, y: number, z: number, extra: Record<string, unknown> = {}): IgeEntity {
		const entity = new IgeEntity();
		entity._geometryData = geometry;
		entity.material({ color, roughness: 0.6, metallic: 0, ...extra });
		entity.translateTo(x, y, z);
		entity.mount(parent);
		return entity;
	}

	/** A static box: drawn and solid. */
	solid (w: number, h: number, d: number, x: number, y: number, z: number, color: IgeMaterialColor, id: string): IgeEntity {
		const entity = this.part(this.scene!, createBox(w, h, d, `${id}_${w}_${h}_${d}`), color, x, y, z, { roughness: 0.85 });
		this.physics!.addBody(entity, { type: "static", shape: { type: "box", halfExtents: { x: w / 2, y: h / 2, z: d / 2 } } });
		return entity;
	}

	/** Draw a compound shape's boxes (IGE units) on a craft, one colour per child. */
	drawShape (parent: IgeEntity, shape: IgePhysicsShape, colors: IgeMaterialColor[], id: string) {
		if (shape.type !== "compound") return;
		shape.children.forEach((child, i) => {
			if (child.shape.type !== "box") return;
			const h = child.shape.halfExtents, p = child.position || { x: 0, y: 0, z: 0 };
			this.part(parent, createBox(h.x * 2, h.y * 2, h.z * 2, `${id}_${i}`), colors[Math.min(i, colors.length - 1)], p.x, p.y, p.z, { roughness: 0.45, metallic: 0.2 });
		});
	}

	/** Scale a preset's shape (metres) to IGE units. */
	scaled (shape: IgePhysicsShape): IgePhysicsShape {
		if (shape.type !== "compound") return shape;
		return {
			type: "compound",
			children: shape.children.map((c) => ({
				shape: c.shape.type === "box" ? { type: "box", halfExtents: { x: c.shape.halfExtents.x * U, y: c.shape.halfExtents.y * U, z: c.shape.halfExtents.z * U } } : c.shape,
				position: c.position && { x: c.position.x * U, y: c.position.y * U, z: c.position.z * U }
			}))
		};
	}

	buildSea () {
		const scene = this.scene!;
		// A seabed 25 m down for things that sink
		const bed = new IgeEntity().translateTo(0, -2550, 0).mount(scene);
		this.physics!.addBody(bed, { type: "static", shape: { type: "box", halfExtents: { x: 600000, y: 50, z: 600000 } } });

		// The far sea: flat, under the deepest trough, out to the horizon
		const far = this.part(scene, IgePrimitiveGeometry.createPlane(1200000, 1200000, "airSeaFarSea"), { r: 0.1, g: 0.33, b: 0.44, a: 1 }, 0, -60, 0, { roughness: 0.35, metallic: 0.1 });
		far.rotateTo(-Math.PI / 2, 0, 0);
		this.farSea = far;

		// The near sea: a grid moved to the wave function every frame
		this.sea = new SeaGrid(80, 300, 3, "airSeaWaves");
		this.seaEntity = this.part(scene, this.sea.geometry, { r: 0.1, g: 0.33, b: 0.44, a: 1 }, 0, 0, 0, { roughness: 0.3, metallic: 0.1 });
	}

	buildIsland () {
		const scene = this.scene!;
		const grass = { r: 0.38, g: 0.53, b: 0.31, a: 1 }, tarmac = { r: 0.2, g: 0.21, b: 0.23, a: 1 }, paint = { r: 0.95, g: 0.95, b: 0.9, a: 1 };
		// The island: an airfield 3.3 km long, 3 m above the sea
		this.solid(33000, 2800, 310000, -1500, ISLAND_TOP - 1400, 0, grass, "island");
		// Sand round its edge
		this.part(scene, createFlatRects([{ x: -1500, z: 0, w: 34400, d: 311400 }], ISLAND_TOP - 120, "airSeaSand"), { r: 0.82, g: 0.75, b: 0.55, a: 1 }, 0, 0, 0, { roughness: 1 });

		// The main runway (3 km, for the airliner and the jet) and a short one for the light plane
		const y = ISLAND_TOP + 1;
		this.part(scene, createFlatRects([
			{ x: 0, z: 0, w: 4500, d: 300000 },
			{ x: -12000, z: -75000, w: 2500, d: 150000 },
			{ x: -6000, z: -148000, w: 12000, d: 1500 }
		], y, "airSeaRunways"), tarmac, 0, 0, 0, { roughness: 0.9 });
		const marks: { x: number; z: number; w: number; d: number }[] = [];
		for (let z = -144000; z <= 144000; z += 6000) marks.push({ x: 0, z, w: 90, d: 3000 });
		for (let z = -144000; z <= 0; z += 5000) marks.push({ x: -12000, z, w: 60, d: 2500 });
		for (const side of [-1, 1]) marks.push({ x: side * 2150, z: 0, w: 60, d: 300000 }, { x: -12000 + side * 1150, z: -75000, w: 40, d: 150000 });
		for (let i = -7; i <= 7; i++) if (i) marks.push({ x: i * 280, z: -148500, w: 150, d: 3000 }, { x: i * 280, z: 148500, w: 150, d: 3000 });
		this.part(scene, createFlatRects(marks, y + 1, "airSeaRunwayMarks"), paint, 0, 0, 0, { roughness: 0.8 });

		// A helipad and a control tower
		this.solid(2000, 60, 2000, 9000, ISLAND_TOP + 30, -20000, { r: 0.35, g: 0.36, b: 0.38, a: 1 }, "helipad");
		this.part(scene, createFlatRects([
			{ x: 9000 - 350, z: -20000, w: 120, d: 900 }, { x: 9000 + 350, z: -20000, w: 120, d: 900 }, { x: 9000, z: -20000, w: 700, d: 120 },
			{ x: 9000, z: -20000 - 900, w: 1800, d: 60 }, { x: 9000, z: -20000 + 900, w: 1800, d: 60 },
			{ x: 9000 - 900, z: -20000, w: 60, d: 1800 }, { x: 9000 + 900, z: -20000, w: 60, d: 1800 }
		], ISLAND_TOP + 61, "airSeaHelipadMarks"), { r: 0.95, g: 0.85, b: 0.2, a: 1 }, 0, 0, 0, { roughness: 0.8 });
		this.solid(800, 2400, 800, 12500, ISLAND_TOP + 1200, -32000, { r: 0.85, g: 0.84, b: 0.8, a: 1 }, "tower");
		this.part(scene, createBox(1100, 400, 1100, "airSeaTowerCab"), { r: 0.15, g: 0.22, b: 0.28, a: 1 }, 12500, ISLAND_TOP + 2600, -32000, { roughness: 0.1, metallic: 0.4 });
		// A hangar by the apron
		this.solid(4000, 1200, 5000, -16000, ISLAND_TOP + 600, -132000, { r: 0.6, g: 0.62, b: 0.66, a: 1 }, "hangar");
	}

	buildJetty () {
		const wood = { r: 0.5, g: 0.36, b: 0.22, a: 1 };
		// A pier off the island's east shore, its deck 1.5 m above the sea
		this.solid(15000, 50, 400, 22500, 125, 0, wood, "jetty");
		for (let x = 16000; x <= 30000; x += 1500) {
			for (const z of [-180, 180]) this.part(this.scene!, createBox(30, 2700, 30, "airSeaPile"), { r: 0.32, g: 0.24, b: 0.16, a: 1 }, x, -1250, z, { roughness: 0.9 });
		}
	}

	buildCrates () {
		const half = 40;
		const geometry = createBox(half * 2, half * 2, half * 2, "airSeaCrate");
		// Light crates float high, heavier ones low; the dark one sinks
		const densities = [250, 350, 450, 550, 650, 300, 400, 500, 600, 2500];
		densities.forEach((density, i) => {
			const x = 25000 + (i % 5) * 700, z = 3000 + Math.floor(i / 5) * 900;
			const shade = density > 1000 ? 0.25 : 0.55 + (700 - density) / 1500;
			const crate = this.part(this.scene!, geometry, { r: shade, g: shade * 0.72, b: shade * 0.42, a: 1 }, x, 60, z, { roughness: 0.85 });
			crate.id(`crate${i}`);
			const body = this.physics!.addBody(crate, { shape: { type: "box", halfExtents: { x: half, y: half, z: half } }, density, friction: 0.6 });
			this.physics!.addBuoyancy(body);
		});
		// Barrels
		for (let i = 0; i < 3; i++) {
			const barrel = this.part(this.scene!, IgePrimitiveGeometry.createSphere(35, 14, 10, "airSeaBuoy"), { r: 0.9, g: 0.35, b: 0.1, a: 1 }, 26000 + i * 900, 60, 5200, { roughness: 0.5 });
			this.physics!.addBuoyancy(this.physics!.addBody(barrel, { shape: { type: "sphere", radius: 35 }, density: 200 }));
		}
	}

	/** A wheel model for landing gear, axle along X. */
	wheel (parent: IgeEntity, radius: number, width: number): IgeEntity {
		const wheel = this.part(parent, createWheel(radius, width, 20, `airSeaTyre_${radius}_${width}`), { r: 0.08, g: 0.08, b: 0.09, a: 1 }, 0, 0, 0, { roughness: 0.95 });
		this.part(wheel, createBox(width + 2, radius * 1.1, radius * 0.2, `airSeaHub_${radius}`), { r: 0.7, g: 0.7, b: 0.72, a: 1 }, 0, 0, 0, { metallic: 0.7 });
		return wheel;
	}

	buildPlane (preset: IgePhysicsAircraftPreset, name: string, at: { x: number; y: number; z: number }, heading: number, distance: number, height: number): Craft {
		const spec = AIRCRAFT_PRESETS[preset];
		const root = new IgeEntity().id(preset).translateTo(at.x, at.y, at.z).mount(this.scene!);
		root.quaternion(yawQuat(heading));
		const shape = this.scaled(spec.shape);
		const body = preset === "jet" ? { r: 0.45, g: 0.5, b: 0.55, a: 1 } : preset === "airliner" ? { r: 0.95, g: 0.95, b: 0.97, a: 1 } : { r: 0.95, g: 0.93, b: 0.88, a: 1 };
		const trim = preset === "jet" ? { r: 0.35, g: 0.4, b: 0.45, a: 1 } : preset === "airliner" ? { r: 0.1, g: 0.3, b: 0.65, a: 1 } : { r: 0.8, g: 0.15, b: 0.15, a: 1 };
		// Fuselage, tail cone, wing, tailplane, fin, then floats or engines
		const floats = { r: 0.95, g: 0.8, b: 0.2, a: 1 }, engines = { r: 0.6, g: 0.62, b: 0.66, a: 1 };
		const colors = [body, body, body, trim, trim, preset === "floatplane" ? floats : engines];
		this.drawShape(root, shape, colors, `airSea_${preset}`);

		// Details: the cockpit glass, a propeller, float struts
		const glass = { r: 0.08, g: 0.12, b: 0.18, a: 1 };
		const nose = (shape as Extract<IgePhysicsShape, { type: "compound" }>).children[0];
		const n = nose.position!, nh = (nose.shape as Extract<IgePhysicsShape, { type: "box" }>).halfExtents;
		let rotorEntity: IgeEntity | undefined;
		if (preset === "jet") {
			this.part(root, createBox(nh.x * 1.2, 50, 300, "airSeaJetCanopy"), glass, 0, n.y + nh.y + 15, n.z + 150, { roughness: 0.05, metallic: 0.5 });
		} else if (preset === "airliner") {
			this.part(root, createBox(nh.x * 2 + 2, 40, nh.z * 2 - 600, "airSeaWindows"), glass, 0, n.y + 60, n.z - 100, { roughness: 0.1 });
			this.part(root, createBox(nh.x * 1.6, 60, 60, "airSeaAirlinerScreen"), glass, 0, n.y + 90, n.z + nh.z, { roughness: 0.1 });
		} else {
			this.part(root, createBox(nh.x * 1.9, 60, 120, "airSeaScreen"), glass, 0, n.y + 30, n.z + nh.z - 40, { roughness: 0.05, metallic: 0.5 });
			rotorEntity = new IgeEntity().translateTo(0, n.y, n.z + nh.z + 20).mount(root);
			this.part(rotorEntity, createBox(20, 190, 6, "airSeaPropBlade"), { r: 0.15, g: 0.15, b: 0.16, a: 1 }, 0, 0, 0);
			this.part(rotorEntity, createBox(190, 20, 6, "airSeaPropBlade2"), { r: 0.15, g: 0.15, b: 0.16, a: 1 }, 0, 0, 0);
			if (preset === "floatplane") {
				for (const side of [-1, 1]) {
					for (const z of [-50, 170]) this.part(root, createBox(8, 160, 8, "airSeaStrut"), { r: 0.3, g: 0.3, b: 0.32, a: 1 }, side * 90, 130, z);
				}
			}
		}
		const gearEntities = spec.gear.map((wheel) => this.wheel(root, (wheel.radius ?? 0.3) * U, preset === "airliner" ? 50 : 18));
		const plane = this.physics!.addAircraft(root, { preset, impacts: 300, rotorEntity, gearEntities });
		this.watch(name, plane);
		return {
			key: preset, name, kind: "plane", craft: plane, start: plane.getState(), distance, height,
			throttle: 0, flaps: 0, gear: true
		};
	}

	buildHelicopter (): Craft {
		const spec = AIRCRAFT_PRESETS.helicopter;
		const root = new IgeEntity().id("helicopter").translateTo(9000, ISLAND_TOP + 60, -20000).mount(this.scene!);
		const blue = { r: 0.12, g: 0.3, b: 0.62, a: 1 }, white = { r: 0.92, g: 0.92, b: 0.9, a: 1 }, dark = { r: 0.15, g: 0.15, b: 0.16, a: 1 };
		this.drawShape(root, this.scaled(spec.shape), [blue, blue, white, dark, dark, dark, dark], "airSeaHeli");
		this.part(root, createBox(170, 90, 120, "airSeaHeliGlass"), { r: 0.08, g: 0.12, b: 0.18, a: 1 }, 0, 190, 190, { roughness: 0.05, metallic: 0.5 });
		this.part(root, createBox(20, 70, 20, "airSeaHeliMast"), dark, 0, 270, 40);
		const rotor = new IgeEntity().translateTo(0, 305, 40).mount(root);
		this.part(rotor, createBox(1000, 6, 30, "airSeaRotorBlade"), dark, 0, 0, 0);
		this.part(rotor, createBox(30, 6, 1000, "airSeaRotorBlade2"), dark, 0, 0, 0);
		const tail = new IgeEntity().translateTo(15, 240, -640).mount(root);
		this.part(tail, createBox(4, 150, 18, "airSeaTailBlade"), dark, 0, 0, 0);
		this.part(tail, createBox(4, 18, 150, "airSeaTailBlade2"), dark, 0, 0, 0);
		const heli = this.physics!.addAircraft(root, { preset: "helicopter", impacts: 300, rotorEntity: rotor, tailRotorEntity: tail });
		this.watch("Helicopter", heli);
		return { key: "helicopter", name: "Helicopter", kind: "helicopter", craft: heli, start: heli.getState(), distance: 1500, height: 500, throttle: 0, flaps: 0, gear: true };
	}

	buildSpeedboat (): Craft {
		const spec = BOAT_PRESETS.speedboat;
		const root = new IgeEntity().id("speedboat").translateTo(24000, 0, 1500).mount(this.scene!);
		root.quaternion(yawQuat(90));
		this.drawShape(root, this.scaled(spec.shape), [{ r: 0.95, g: 0.95, b: 0.97, a: 1 }, { r: 0.08, g: 0.12, b: 0.18, a: 1 }], "airSeaSpeedboat");
		this.part(root, createBox(242, 20, 702, "airSeaBoatStripe"), { r: 0.85, g: 0.1, b: 0.15, a: 1 }, 0, 90, 0);
		this.part(root, createBox(50, 90, 50, "airSeaOutboard"), { r: 0.1, g: 0.1, b: 0.12, a: 1 }, 0, 30, -360);
		const prop = new IgeEntity().translateTo(0, -15, -380).mount(root);
		this.part(prop, createBox(60, 10, 4, "airSeaBoatProp"), { r: 0.75, g: 0.75, b: 0.7, a: 1 }, 0, 0, 0, { metallic: 0.8 });
		const boat = this.physics!.addBoat(root, { preset: "speedboat", impacts: 300, propellerEntity: prop });
		this.watch("Speedboat", boat);
		return { key: "speedboat", name: "Speedboat", kind: "boat", craft: boat, start: boat.getState(), distance: 1100, height: 330, throttle: 0, flaps: 0, gear: true };
	}

	/** A fishing boat and a yacht riding the waves offshore. */
	buildSceneryBoats () {
		const place = (preset: "fishingBoat" | "yacht", x: number, z: number, heading: number, colors: IgeMaterialColor[]) => {
			const root = new IgeEntity().id(preset).translateTo(x, 0, z).mount(this.scene!);
			root.quaternion(yawQuat(heading));
			this.drawShape(root, this.scaled(BOAT_PRESETS[preset].shape), colors, `airSea_${preset}`);
			this.physics!.addBoat(root, { preset });
		};
		place("fishingBoat", 40000, 9000, 30, [{ r: 0.15, g: 0.35, b: 0.3, a: 1 }, { r: 0.9, g: 0.88, b: 0.8, a: 1 }]);
		place("yacht", 38000, -12000, -60, [{ r: 0.96, g: 0.96, b: 0.98, a: 1 }, { r: 0.2, g: 0.25, b: 0.3, a: 1 }]);
	}

	/** Show crashes and landings. */
	watch (name: string, craft: IgePhysicsCraft3dApi) {
		const show = (text: string) => {
			if (this.crafts[this.active]?.craft === craft) this.event = { text, until: performance.now() + 2500 };
		};
		craft.on("impact", (impact: IgePhysicsImpact) => {
			const what = impact.others.map((other) => other.entity.id()).filter((id) => !id.startsWith("ige")).join(", ") || "something";
			show(`${name} hit ${what} at ${(impact.speed / U).toFixed(1)} m/s`);
		});
		craft.on("landed", (landing: IgePhysicsCraftLanding) => {
			const where = landing.onWater ? "on the water" : landing.onGear ? "on its gear" : "on its belly";
			show(`${name} came down ${where}: ${(landing.speed / U).toFixed(1)} m/s down, ${Math.round(landing.tilt)}° tilt, ${landing.airTime.toFixed(1)} s in the air`);
		});
	}

	buildButtons () {
		const panel = document.getElementById("crafts");
		if (!panel) return;
		this.crafts.forEach((craft, i) => {
			const button = document.createElement("button");
			button.textContent = `${i + 1} ${craft.name}`;
			button.addEventListener("click", () => this.select(i));
			panel.appendChild(button);
		});
		this.highlightButton();
	}

	highlightButton () {
		document.querySelectorAll("#crafts button").forEach((button, i) => button.classList.toggle("active", i === this.active));
	}

	select (index: number) {
		this.active = (index + this.crafts.length) % this.crafts.length;
		const craft = this.crafts[this.active];
		const q = craft.craft.entity.quaternion() || { x: 0, y: 0, z: 0, w: 1 };
		const f = rotate({ x: 0, y: 0, z: 1 }, q);
		this.cameraYaw = Math.atan2(f.x, f.z);
		this.cameraPitch = 0;
		this.cameraPos = undefined;
		this.highlightButton();
	}

	/** Back to where it started, stopped. */
	reset (craft: Craft) {
		craft.throttle = 0;
		craft.flaps = 0;
		craft.gear = true;
		craft.craft.setState({ ...craft.start, velocity: { x: 0, y: 0, z: 0 }, angularVelocity: { x: 0, y: 0, z: 0 } });
		this.cameraPos = undefined;
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

	applyInput (dt: number) {
		const keys = this.keysDown, pressed = this.keysPressed;
		const pad = this.gamePad, index = this.padIndex();
		const button = (b: IgeGamePadButton) => (pad && index >= 0 ? pad.buttonValue(index, b) : 0);
		const justPressed = (b: IgeGamePadButton) => !!(pad && index >= 0 && pad.justPressed(index, b));
		const axis = (a: IgeGamePadAxis) => (pad && index >= 0 ? pad.axis(index, a) : 0);
		const stronger = (a: number, b: number) => (Math.abs(b) > Math.abs(a) ? b : a);

		for (let i = 0; i < this.crafts.length; i++) if (pressed[`Digit${i + 1}`]) this.select(i);
		if (pressed.KeyC || justPressed(IgeGamePadButton.y)) this.select(this.active + 1);
		if (pressed.KeyH) document.getElementById("info")?.classList.toggle("hidden");
		const current = this.crafts[this.active];
		if (pressed.KeyR || justPressed(IgeGamePadButton.b)) this.reset(current);

		const up = keys.KeyW ? 1 : 0, down = keys.KeyS ? 1 : 0;
		const rightTrigger = button(IgeGamePadButton.rightTrigger), leftTrigger = button(IgeGamePadButton.leftTrigger);
		const stickX = axis(IgeGamePadAxis.leftX), stickY = axis(IgeGamePadAxis.leftY);
		const arrowsX = (keys.ArrowRight ? 1 : 0) - (keys.ArrowLeft ? 1 : 0), arrowsY = (keys.ArrowUp ? 1 : 0) - (keys.ArrowDown ? 1 : 0);
		const ad = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
		const bumpers = button(IgeGamePadButton.rightBumper) - button(IgeGamePadButton.leftBumper);

		for (const craft of this.crafts) {
			const own = craft === current;
			if (craft.kind === "boat") {
				const boat = craft.craft as IgePhysicsBoat3dApi;
				if (!own) boat.drive({});
				else boat.drive({ throttle: stronger(up - down, rightTrigger - leftTrigger), steer: stronger(stronger(ad, arrowsX), stickX) });
				continue;
			}
			const aircraft = craft.craft as IgePhysicsAircraft3dApi;
			if (!own) {
				// Nobody at the controls: sticks centred, brakes on, levers left where they are
				aircraft.fly({ brake: aircraft.grounded() ? 1 : 0 });
				continue;
			}
			const pitch = stronger(arrowsY, -stickY), roll = stronger(arrowsX, stickX), yaw = stronger(ad, bumpers);
			if (craft.kind === "helicopter") {
				aircraft.fly({ collective: stronger(up - down, rightTrigger - leftTrigger), pitch, roll, yaw });
				continue;
			}
			craft.throttle = clamp(craft.throttle + (up - down + rightTrigger - leftTrigger * (aircraft.grounded() ? 0 : 1)) * 0.6 * dt, 0, 1);
			if (pressed.KeyG || justPressed(IgeGamePadButton.a)) craft.gear = !craft.gear;
			if (pressed.KeyF || justPressed(IgeGamePadButton.x)) craft.flaps = craft.flaps >= 1 ? 0 : craft.flaps + 0.5;
			const brake = Math.max(keys.Space ? 1 : 0, aircraft.grounded() ? leftTrigger : 0);
			aircraft.fly({ throttle: craft.throttle, pitch, roll, yaw, brake, flaps: craft.flaps, gear: craft.gear });
		}
	}

	/** Chase the active craft: behind it along its heading (and a planes' climb or dive), easing round. */
	updateCamera (dt: number) {
		const camera = this.camera;
		const craft = this.crafts[this.active];
		if (!camera || !craft) return;
		const entity = craft.craft.entity;
		const p = entity._translate;
		const q = entity.quaternion() || { x: 0, y: 0, z: 0, w: 1 };
		const f = rotate({ x: 0, y: 0, z: 1 }, q);
		const flat = Math.hypot(f.x, f.z);
		if (flat > 0.15) {
			let turn = Math.atan2(f.x, f.z) - this.cameraYaw;
			turn = Math.atan2(Math.sin(turn), Math.cos(turn));
			this.cameraYaw += turn * (1 - Math.exp(-dt * 3));
		}
		const pitchTarget = craft.kind === "plane" ? Math.atan2(f.y, flat) * 0.6 : 0;
		this.cameraPitch += (pitchTarget - this.cameraPitch) * (1 - Math.exp(-dt * 3));
		const d = craft.distance, cp = Math.cos(this.cameraPitch);
		const target = {
			x: p.x - Math.sin(this.cameraYaw) * cp * d,
			y: p.y - Math.sin(this.cameraPitch) * d + craft.height,
			z: p.z - Math.cos(this.cameraYaw) * cp * d
		};
		// Never under the sea or the island
		const floor = Math.max(this.water!.heightAt(target.x, target.z) + 150, Math.abs(target.x + 1500) < 16500 && Math.abs(target.z) < 155000 ? ISLAND_TOP + 150 : -Infinity);
		target.y = Math.max(target.y, floor);
		if (!this.cameraPos) this.cameraPos = { ...target };
		const ease = 1 - Math.exp(-dt * 8);
		const c = this.cameraPos;
		c.x += (target.x - c.x) * ease; c.y += (target.y - c.y) * ease; c.z += (target.z - c.z) * ease;
		camera.translateTo(c.x, c.y, c.z);
		if (!camera._lookAt) camera._lookAt = new IgePoint3d(p.x, p.y, p.z);
		camera._lookAt.x = p.x;
		camera._lookAt.y = p.y + craft.height * 0.35;
		camera._lookAt.z = p.z;
		camera.fov(60 + Math.min(12, Math.abs(craft.craft.speedKmh()) / 40));
	}

	/** Move the near sea to the camera and the waves to the water's clock. */
	updateSea () {
		const sea = this.sea, camera = this.camera, water = this.water;
		if (!sea || !camera || !water || !this.seaEntity) return;
		const centre = sea.update(water, camera._translate.x, camera._translate.z, water.time());
		this.seaEntity.translateTo(centre.x, 0, centre.z);
		this.farSea?.translateTo(centre.x, -60, centre.z);
		// The renderer uploads it afresh next time it's drawn
		this.renderer?.releaseGeometry(sea.geometry);
	}

	updateHud () {
		const craft = this.crafts[this.active];
		if (!craft) return;
		const set = (id: string, text: string) => {
			const el = this.hud[id];
			if (el && el.textContent !== text) el.textContent = text;
		};
		const c = craft.craft;
		const kmh = Math.abs(c.speedKmh());
		set("craftName", craft.name);
		set("speed", Math.round(kmh).toString());
		set("knots", `${Math.round(kmh / 1.852)} kn`);
		const rows: [string, string][] = [];
		let throttle = 0, stall = false;
		if (craft.kind === "boat") {
			const boat = c as IgePhysicsBoat3dApi;
			throttle = Math.abs(boat.input().throttle);
			rows.push(["Under water", `${Math.round(boat.submerged() * 100)}%`]);
			rows.push(["Propeller", boat.propellerInWater() ? "in the water" : "out of the water"]);
			rows.push(["Heading", `${Math.round((c.attitude().heading + 360) % 360)}°`]);
			rows.push(["Lean", `${c.attitude().roll.toFixed(0)}°`]);
			if (boat.airborne()) rows.push(["", "airborne"]);
		} else {
			const plane = c as IgePhysicsAircraft3dApi;
			throttle = craft.kind === "plane" ? plane.engine() : Math.abs(plane.input().collective);
			const agl = plane.heightAboveGround();
			rows.push(["Altitude", `${(plane.altitude() / U).toFixed(0)} m`]);
			rows.push(["Above ground", Number.isFinite(agl) ? `${(agl / U).toFixed(1)} m` : "-"]);
			const vs = plane.verticalSpeed() / U;
			rows.push(["Vertical speed", `${vs >= 0 ? "+" : ""}${vs.toFixed(1)} m/s`]);
			if (craft.kind === "plane") {
				rows.push(["Angle of attack", `${plane.angleOfAttack().toFixed(1)}°`]);
				const gear = plane.gear();
				rows.push(["Gear", gear >= 1 ? "down" : gear <= 0 ? "up" : "moving"]);
				rows.push(["Flaps", `${Math.round(plane.flaps() * 100)}%`]);
				rows.push(["Throttle", `${Math.round(craft.throttle * 100)}%`]);
				stall = plane.stalled();
			} else {
				rows.push(["Rotor", `${Math.round(plane.rotor() * 100)}%`]);
				rows.push(["Collective", plane.input().collective > 0 ? "up" : plane.input().collective < 0 ? "down" : "hold"]);
			}
			rows.push(["", plane.grounded() ? (plane.submerged() > 0 ? "on the water" : "on the ground") : "flying"]);
		}
		const html = rows.map(([label, value]) => `<div class="row"><span>${label}</span><span>${value}</span></div>`).join("");
		const el = this.hud.rows;
		if (el && el.innerHTML !== html) el.innerHTML = html;
		const bar = this.hud.throttleBar;
		if (bar) bar.style.width = `${Math.round(throttle * 100)}%`;
		const stallEl = this.hud.stall;
		if (stallEl) stallEl.style.display = stall ? "block" : "none";
		set("event", performance.now() < this.event.until ? this.event.text : "");
	}
}
