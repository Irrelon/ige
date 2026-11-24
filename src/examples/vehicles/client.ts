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
import type { IgePhysicsImpact } from "@/engine/physics/IgePhysics3dTypes";
import type { IgePhysicsVehicle3dApi, IgePhysicsVehicleLanding, IgePhysicsWheelOptions } from "@/engine/physics/IgePhysicsVehicle3dApi";
import { IgeAmbientLight, IgeDirectionalLight } from "@/engine/webgl/IgeWebGlLight";
import { IgePrimitiveGeometry } from "@/engine/webgl/IgePrimitiveGeometry";
import { IgeBehaviourType } from "@/enums";
import type { IgeCanInit } from "@/types/IgeCanInit";
import type { IgeGeometryData3d } from "@/types/IgeGeometryData3d";
import type { IgeMaterialColor } from "@/types/IgeMaterialData";
import { createBox, createFlatRects, createWheel } from "./geometry";

// @ts-ignore
window.ige = ige;

/**
 * Vehicles: a car and a motorcycle on IgePhysics3d.addVehicle() (Jolt's
 * vehicle constraint underneath), on a field with roads, ramps, speed bumps
 * and crates to knock about.
 *
 * - Keyboard: W / up throttle, S / down brake and reverse, A D / left right
 *   steer, space handbrake, I K lean forward and back (pitch: air control,
 *   wheelies and stoppies), J L roll, X drop the motorcycle, C switch
 *   vehicle, R put it back on its wheels (a car on its roof also rocks
 *   itself back with steering)
 * - Gamepad: right trigger throttle, left trigger brake and reverse, left
 *   stick steer, right stick pitch and roll, A handbrake, X drop the
 *   motorcycle, Y switch, B reset
 * - A chase camera and a readout of speed, revs and gear, crashes and landings
 *
 * One IGE unit is a centimetre (unitsPerMetre 100).
 */

interface Drivable {
	name: string;
	vehicle: IgePhysicsVehicle3dApi;
	/** Chase camera distance behind and height above the vehicle. */
	distance: number;
	height: number;
	maxRpm: number;
}

const GRASS = { r: 0.36, g: 0.52, b: 0.3, a: 1 };
const ASPHALT = { r: 0.22, g: 0.23, b: 0.25, a: 1 };
const SKY = { r: 0.62, g: 0.75, b: 0.88 };

/** v rotated by the quaternion q. */
function rotate (v: { x: number; y: number; z: number }, q: { x: number; y: number; z: number; w: number }) {
	const tx = 2 * (q.y * v.z - q.z * v.y), ty = 2 * (q.z * v.x - q.x * v.z), tz = 2 * (q.x * v.y - q.y * v.x);
	return { x: v.x + q.w * tx + (q.y * tz - q.z * ty), y: v.y + q.w * ty + (q.z * tx - q.x * tz), z: v.z + q.w * tz + (q.x * ty - q.y * tx) };
}

export class Client extends IgeBaseClass implements IgeCanInit {
	classId = "Client";
	renderer?: IgeWebGlRenderer;
	scene?: IgeScene2d;
	camera?: IgeCamera;
	physics?: IgePhysics3d;
	gamePad?: IgeGamePadComponent;
	drivables: Drivable[] = [];
	active: number = 0;
	keysDown: Record<string, boolean> = {};
	keysPressed: Record<string, boolean> = {};
	/** The chase camera's heading (radians), easing after the vehicle's. */
	cameraYaw: number = 0;
	cameraHeight: number = 230;
	hud: Record<string, HTMLElement | null> = {};
	/** The last crash or landing, shown for a moment. */
	event: { text: string; until: number } = { text: "", until: 0 };

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
			this.renderer.fog({ mode: "linear", color: SKY, near: 12000, far: 45000 });

			ige.engine.addComponent("gamePad", IgeGamePadComponent);
			this.gamePad = ige.engine.components.gamePad as IgeGamePadComponent;
			await ige.engine.start();

			this.scene = new IgeScene2d();
			this.scene.id("vehiclesScene");
			const viewport = new IgeViewport();
			viewport.id("vehiclesViewport").autoSize(true).scene(this.scene);
			this.camera = viewport.camera;
			this.camera.projectionType("perspective");
			this.camera.fov(60);
			this.camera.near(20);
			this.camera.far(60000);
			viewport.mount(ige.engine);
			this.setupLights();

			this.physics = await IgePhysics3d.create({ unitsPerMetre: 100 });
			(window as any).vehiclesExample = this;
			this.buildWorld();
			this.buildCrates();
			this.drivables.push(this.buildCar(0, 0));
			this.drivables.push(this.buildMotorcycle(500, 0));
			this.physics.start();

			this.setupInput();
			// Input before the physics step...
			ige.engine.addBehaviour(IgeBehaviourType.preUpdate, "vehicleInput", () => this.applyInput());
			// ...and the camera after it (behaviours run in the order they're added)
			ige.engine.addBehaviour(IgeBehaviourType.postUpdate, "vehicleCamera", (_engine: unknown, tickDelta: number) => {
				this.updateCamera(Math.min((tickDelta || 16) / 1000, 0.1));
				this.updateHud();
				this.keysPressed = {};
			});

			for (const id of ["speed", "rpm", "gear", "rpmFill", "vehicleName", "state", "slip", "event", "physicsStatus"]) this.hud[id] = document.getElementById(id);
			const status = this.hud.physicsStatus;
			if (status) {
				status.textContent = this.physics.threaded()
					? "Jolt, multithreaded"
					: "Jolt, single-threaded (serve the page with COOP/COEP headers for threads)";
			}
			document.querySelectorAll(".igeLoading").forEach((el) => el.remove());
		} catch (error) {
			console.error("Vehicles example failed to start", error);
			const text = document.getElementById("loadingText");
			if (text) text.textContent = `Error: ${error}`;
		}
	}

	setupLights () {
		const lightManager = this.renderer?.lightManager;
		if (!this.scene || !lightManager) return;
		const ambient = new IgeAmbientLight();
		ambient.lightColor(0.6, 0.66, 0.78);
		ambient.intensity(0.55);
		ambient.mount(this.scene);
		lightManager.addLight(ambient);

		const sun = new IgeDirectionalLight();
		sun.lightColor(1, 0.95, 0.86);
		sun.intensity(1.1);
		sun.direction(-0.45, -1, -0.3);
		sun.mount(this.scene);
		lightManager.addLight(sun);
		const shadows = this.renderer!.shadowManager;
		if (shadows) {
			shadows.frustumSize(2500);
			shadows.shadowPlanes(1, 8000);
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
	solid (w: number, h: number, d: number, x: number, y: number, z: number, color: IgeMaterialColor, pitch: number = 0, id: string = "solid"): IgeEntity {
		const entity = this.part(this.scene!, createBox(w, h, d, `${id}_${w}_${h}_${d}`), color, x, y, z, { roughness: 0.85 });
		entity.rotateTo(pitch, 0, 0);
		this.physics!.addBody(entity, { type: "static", shape: { type: "box", halfExtents: { x: w / 2, y: h / 2, z: d / 2 } } });
		return entity;
	}

	/** A ramp rising towards +Z from ground level at zStart. */
	ramp (x: number, zStart: number, width: number, length: number, degrees: number, color: IgeMaterialColor) {
		const a = (degrees * Math.PI) / 180;
		const thick = 40, hl = length / 2, ht = thick / 2;
		const y = hl * Math.sin(a) - ht * Math.cos(a);
		const z = zStart + ht * Math.sin(a) + hl * Math.cos(a);
		this.solid(width, thick, length, x, y, z, color, -a, "ramp");
	}

	buildWorld () {
		const scene = this.scene!, physics = this.physics!;
		const size = 60000;

		// The field: a plane to see, a slab to drive on
		const ground = this.part(scene, IgePrimitiveGeometry.createPlane(size, size, "vehiclesGround"), GRASS, 0, 0, 0, { roughness: 0.95 });
		ground.rotateTo(-Math.PI / 2, 0, 0);
		const slab = new IgeEntity().translateTo(0, -50, 0).mount(scene);
		physics.addBody(slab, { type: "static", shape: { type: "box", halfExtents: { x: size / 2, y: 50, z: size / 2 } } });

		// A 10 m grid, so speed shows
		const grid: { x: number; z: number; w: number; d: number }[] = [];
		for (let i = -25; i <= 25; i++) {
			grid.push({ x: i * 1000, z: 0, w: 10, d: 50000 }, { x: 0, z: i * 1000, w: 50000, d: 10 });
		}
		this.part(scene, createFlatRects(grid, 1, "vehiclesGrid"), { r: 0.45, g: 0.6, b: 0.38, a: 1 }, 0, 0, 0, { roughness: 1 });

		// Two roads crossing, with dashed centre lines
		this.part(scene, createFlatRects([
			{ x: 0, z: 4000, w: 900, d: 40000 },
			{ x: 0, z: 9000, w: 40000, d: 900 }
		], 2, "vehiclesRoads"), ASPHALT, 0, 0, 0, { roughness: 0.9 });
		const dashes: { x: number; z: number; w: number; d: number }[] = [];
		for (let i = -26; i <= 40; i++) dashes.push({ x: 0, z: i * 600, w: 15, d: 300 });
		for (let i = -33; i <= 33; i++) if (Math.abs(i) > 1) dashes.push({ x: i * 600, z: 9000, w: 300, d: 15 });
		this.part(scene, createFlatRects(dashes, 3, "vehiclesDashes"), { r: 0.95, g: 0.95, b: 0.9, a: 1 }, 0, 0, 0, { roughness: 0.7 });

		// Ramps to jump, speed bumps, and walls to crash into
		const concrete = { r: 0.7, g: 0.68, b: 0.64, a: 1 };
		this.ramp(-1800, 1500, 500, 900, 12, { r: 0.85, g: 0.55, b: 0.2, a: 1 });
		this.ramp(-1800, 5000, 600, 1400, 18, { r: 0.85, g: 0.35, b: 0.25, a: 1 });
		this.ramp(1800, 2500, 450, 700, 9, { r: 0.85, g: 0.7, b: 0.25, a: 1 });
		for (let i = 0; i < 5; i++) this.solid(900, 12, 70, 0, 0, 12000 + i * 250, { r: 0.9, g: 0.8, b: 0.2, a: 1 }, 0, "bump");
		this.solid(60, 120, 5000, 4200, 60, 4000, concrete, 0, "wall");
		this.solid(3000, 120, 60, 0, 60, -3500, concrete, 0, "wall");
	}

	buildCrates () {
		const scene = this.scene!;
		const half = 30;
		const geometry = createBox(half * 2, half * 2, half * 2, "vehiclesCrate");
		const spots: { x: number; y: number; z: number }[] = [];
		// A pyramid by the road, and a wall of crates across the motorcycle's path
		for (let row = 0; row < 4; row++) {
			for (let i = 0; i < 4 - row; i++) spots.push({ x: -700 + i * 62 + row * 31, y: half + row * 61, z: 2200 });
		}
		for (let row = 0; row < 3; row++) {
			for (let i = 0; i < 5; i++) spots.push({ x: 380 + i * 62, y: half + row * 61, z: 2600 });
		}
		for (const spot of spots) {
			const crate = this.part(scene, geometry, { r: 0.62, g: 0.44, b: 0.24, a: 1 }, spot.x, spot.y, spot.z, { roughness: 0.85 });
			this.physics!.addBody(crate, { shape: { type: "box", halfExtents: { x: half, y: half, z: half } }, density: 150, friction: 0.6 });
		}
	}

	/** A wheel model: tyre, hub and a spoke so it can be seen turning. Outward is +X (left side) or -X. */
	buildWheel (parent: IgeEntity, radius: number, width: number, outward: number): IgeEntity {
		const wheel = this.part(parent, createWheel(radius, width, 28, `tyre_${radius}_${width}`), { r: 0.08, g: 0.08, b: 0.09, a: 1 }, 0, 0, 0, { roughness: 0.95 });
		const face = outward * (width / 2 + 0.6);
		this.part(wheel, createWheel(radius * 0.55, 1, 20, `hub_${radius}`), { r: 0.75, g: 0.76, b: 0.78, a: 1 }, face, 0, 0, { metallic: 0.8, roughness: 0.35 });
		this.part(wheel, createBox(1.5, radius * 1.1, radius * 0.18, `spoke_${radius}`), { r: 0.2, g: 0.2, b: 0.22, a: 1 }, face + outward * 0.8, 0, 0);
		return wheel;
	}

	buildCar (x: number, z: number): Drivable {
		const root = new IgeEntity().id("car").translateTo(x, 30, z).mount(this.scene!);
		const red = { r: 0.78, g: 0.1, b: 0.12, a: 1 };
		// Body and cabin, matching the default chassis (origin on the ground under the middle)
		this.part(root, createBox(170, 56, 440, "carBody"), red, 0, 68, 0, { metallic: 0.3, roughness: 0.35 });
		this.part(root, createBox(150, 42, 200, "carGlass"), { r: 0.1, g: 0.13, b: 0.17, a: 1 }, 0, 117, -25, { metallic: 0.2, roughness: 0.1 });
		this.part(root, createBox(146, 8, 180, "carRoof"), red, 0, 142, -30, { metallic: 0.3, roughness: 0.35 });
		for (const side of [-1, 1]) {
			this.part(root, createBox(34, 12, 3, "headlight"), { r: 1, g: 0.97, b: 0.85, a: 1 }, side * 55, 80, 221, { emissiveColor: { r: 1, g: 0.95, b: 0.8 }, emissiveIntensity: 1.5 });
			this.part(root, createBox(34, 10, 3, "taillight"), { r: 0.8, g: 0.05, b: 0.05, a: 1 }, side * 55, 84, -221, { emissiveColor: { r: 1, g: 0.1, b: 0.1 }, emissiveIntensity: 1 });
		}

		// The default car's wheels, each with a model to pose
		const layout = [{ x: 78, z: 135, steer: 32 }, { x: -78, z: 135, steer: 32 }, { x: 78, z: -130 }, { x: -78, z: -130 }];
		const wheels: IgePhysicsWheelOptions[] = layout.map((w) => ({
			position: { x: w.x, y: 53, z: w.z },
			steer: w.steer,
			entity: this.buildWheel(root, 34, 22, Math.sign(w.x))
		}));
		const vehicle = this.physics!.addVehicle(root, { wheels, impacts: true });
		this.watch("Car", vehicle);
		return { name: "Car", vehicle, distance: 700, height: 230, maxRpm: 6500 };
	}

	buildMotorcycle (x: number, z: number): Drivable {
		const root = new IgeEntity().id("motorcycle").translateTo(x, 30, z).mount(this.scene!);
		const blue = { r: 0.12, g: 0.32, b: 0.75, a: 1 };
		const dark = { r: 0.12, g: 0.12, b: 0.13, a: 1 };
		this.part(root, createBox(22, 26, 110, "bikeFrame"), dark, 0, 62, -5, { metallic: 0.6, roughness: 0.4 });
		this.part(root, createBox(32, 22, 52, "bikeTank"), blue, 0, 86, 18, { metallic: 0.4, roughness: 0.3 });
		this.part(root, createBox(26, 8, 50, "bikeSeat"), dark, 0, 82, -30);
		this.part(root, createBox(8, 60, 8, "bikeFork"), { r: 0.7, g: 0.7, b: 0.72, a: 1 }, 0, 75, 62, { metallic: 0.8 }).rotateTo(-Math.PI / 6, 0, 0);
		// The rider
		this.part(root, createBox(40, 58, 26, "riderBody"), { r: 0.2, g: 0.2, b: 0.24, a: 1 }, 0, 116, -14).rotateTo(0.35, 0, 0);
		this.part(root, IgePrimitiveGeometry.createSphere(13, 12, 10, "riderHelmet"), { r: 0.95, g: 0.8, b: 0.15, a: 1 }, 0, 156, -2, { roughness: 0.3 });

		const wheels: IgePhysicsWheelOptions[] = [
			{ position: { x: 0, y: 70, z: 75 }, steer: 30, caster: 30, brakeTorque: 500, handbrake: false, entity: this.buildWheel(root, 31, 9, 1) },
			{ position: { x: 0, y: 70, z: -75 }, brakeTorque: 250, handbrake: 500, entity: this.buildWheel(root, 31, 12, 1) }
		];
		const vehicle = this.physics!.addVehicle(root, { type: "motorcycle", wheels, impacts: true });
		this.watch("Motorcycle", vehicle);
		return { name: "Motorcycle", vehicle, distance: 520, height: 190, maxRpm: 10000 };
	}

	/**
	 * Show crashes and landings: what a game would use to decide when a
	 * hard crash or a bad landing throws the rider off.
	 */
	watch (name: string, vehicle: IgePhysicsVehicle3dApi) {
		const show = (text: string) => {
			if (this.drivables[this.active]?.vehicle === vehicle) this.event = { text, until: performance.now() + 2000 };
		};
		vehicle.on("impact", (impact: IgePhysicsImpact) => {
			if (impact.speed < 300) return; // under 3 m/s: a knock, not a crash
			const what = impact.others.map((other) => other.entity.id()).join(", ") || "something";
			show(`${name} crashed at ${(impact.speed / 100).toFixed(1)} m/s into ${what}`);
		});
		vehicle.on("landed", (landing: IgePhysicsVehicleLanding) => {
			const how = !landing.onWheels ? "badly" : landing.tilt > 30 ? "on a tilt" : "cleanly";
			show(`Landed ${how}: ${(landing.speed / 100).toFixed(1)} m/s down, ${Math.round(landing.tilt)}° tilt, ${landing.airTime.toFixed(1)} s in the air`);
		});
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

	/** The first connected gamepad's index, if any. */
	padIndex (): number {
		const pad = this.gamePad;
		if (!pad) return -1;
		for (let i = 0; i < 4; i++) if (pad.isConnected(i)) return i;
		return -1;
	}

	applyInput () {
		const keys = this.keysDown;
		let forward = keys.KeyW || keys.ArrowUp ? 1 : 0;
		let brake = keys.KeyS || keys.ArrowDown ? 1 : 0;
		let right = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
		let handbrake = keys.Space ? 1 : 0;
		// Lean forward (nose down) and back, roll right and left
		let pitch = (keys.KeyI || keys.Numpad8 ? 1 : 0) - (keys.KeyK || keys.Numpad5 ? 1 : 0);
		let roll = (keys.KeyL || keys.Numpad6 ? 1 : 0) - (keys.KeyJ || keys.Numpad4 ? 1 : 0);
		let swap = !!this.keysPressed.KeyC;
		let reset = !!this.keysPressed.KeyR;
		let drop = !!this.keysPressed.KeyX;

		const pad = this.gamePad, index = this.padIndex();
		if (pad && index >= 0) {
			forward = Math.max(forward, pad.buttonValue(index, IgeGamePadButton.rightTrigger));
			brake = Math.max(brake, pad.buttonValue(index, IgeGamePadButton.leftTrigger));
			const stick = pad.axis(index, IgeGamePadAxis.leftX);
			if (Math.abs(stick) > Math.abs(right)) right = stick;
			if (pad.button(index, IgeGamePadButton.a)) handbrake = 1;
			// Right stick: pushed forward leans forward (the axis is negative forward)
			const stickPitch = -pad.axis(index, IgeGamePadAxis.rightY), stickRoll = pad.axis(index, IgeGamePadAxis.rightX);
			if (Math.abs(stickPitch) > Math.abs(pitch)) pitch = stickPitch;
			if (Math.abs(stickRoll) > Math.abs(roll)) roll = stickRoll;
			swap = swap || pad.justPressed(index, IgeGamePadButton.y);
			reset = reset || pad.justPressed(index, IgeGamePadButton.b);
			drop = drop || pad.justPressed(index, IgeGamePadButton.x);
		}

		if (swap) this.active = (this.active + 1) % this.drivables.length;
		const active = this.drivables[this.active].vehicle;
		// Drop the motorcycle: it stops balancing and falls over (a game would throw the rider off as a ragdoll)
		if (drop && active.type === "motorcycle") active.upright(!active.upright());
		this.drivables.forEach((drivable, i) => {
			if (!drivable.vehicle.upright()) drivable.vehicle.drive({}); // nobody riding it
			else if (i === this.active) drivable.vehicle.drive({ forward, right, brake, handbrake, pitch, roll });
			else drivable.vehicle.drive({ handbrake: 1 });
		});
		if (reset) this.putBackOnWheels(active);
	}

	/** Upright, a little above where it is (and never under the field), facing the way it was. */
	putBackOnWheels (vehicle: IgePhysicsVehicle3dApi) {
		const state = vehicle.getState();
		const f = rotate({ x: 0, y: 0, z: 1 }, state.rotation);
		const yaw = Math.atan2(f.x, f.z);
		vehicle.setState({
			position: { x: state.position.x, y: Math.max(state.position.y, 0) + 60, z: state.position.z },
			rotation: { x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) },
			velocity: { x: 0, y: 0, z: 0 },
			angularVelocity: { x: 0, y: 0, z: 0 },
			upright: true
		});
	}

	/**
	 * Follow behind the active vehicle: the camera's heading eases after
	 * the vehicle's (so it swings round behind it in a turn), its distance
	 * stays fixed, and the view widens with speed.
	 */
	updateCamera (dt: number) {
		const camera = this.camera;
		const drivable = this.drivables[this.active];
		if (!camera || !drivable) return;
		const entity = drivable.vehicle.entity;
		const p = entity._translate;
		const q = entity.quaternion() || { x: 0, y: 0, z: 0, w: 1 };
		const f = rotate({ x: 0, y: 0, z: 1 }, q);
		if (Math.hypot(f.x, f.z) > 0.2) {
			const yaw = Math.atan2(f.x, f.z);
			let turn = yaw - this.cameraYaw;
			turn = Math.atan2(Math.sin(turn), Math.cos(turn));
			this.cameraYaw += turn * (1 - Math.exp(-dt * 4));
		}
		this.cameraHeight += (p.y + drivable.height - this.cameraHeight) * (1 - Math.exp(-dt * 6));
		camera.translateTo(
			p.x - Math.sin(this.cameraYaw) * drivable.distance,
			Math.max(this.cameraHeight, 60),
			p.z - Math.cos(this.cameraYaw) * drivable.distance
		);
		if (!camera._lookAt) camera._lookAt = new IgePoint3d(p.x, p.y + 100, p.z);
		camera._lookAt.x = p.x;
		camera._lookAt.y = p.y + 100;
		camera._lookAt.z = p.z;
		const kmh = Math.abs(drivable.vehicle.speedKmh());
		camera.fov(60 + Math.min(12, kmh / 12));
	}

	updateHud () {
		const drivable = this.drivables[this.active];
		if (!drivable) return;
		const v = drivable.vehicle;
		const set = (id: string, text: string) => {
			const el = this.hud[id];
			if (el && el.textContent !== text) el.textContent = text;
		};
		set("vehicleName", drivable.name);
		set("speed", Math.round(Math.abs(v.speedKmh())).toString());
		set("rpm", (Math.round(v.rpm() / 50) * 50).toString());
		const gear = v.gear();
		set("gear", gear < 0 ? "R" : gear === 0 ? "N" : gear.toString());
		const fill = this.hud.rpmFill;
		if (fill) fill.style.width = `${Math.min(100, (v.rpm() / drivable.maxRpm) * 100).toFixed(1)}%`;
		const state = !v.upright() ? "dropped (X or R to pick it up)"
			: v.airborne() ? "airborne (I K J L to steer it)"
				: v.upsideDown() ? (v.type === "car" ? "upside down (steer to rock it back, or R)" : "upside down (R to reset)")
					: v.grounded() ? "grounded" : "on its side";
		set("state", state);
		set("event", performance.now() < this.event.until ? this.event.text : "");
		let skid = 0;
		for (let i = 0; i < v.wheelCount(); i++) {
			const wheel = v.wheel(i);
			if (wheel.contact) skid = Math.max(skid, Math.abs(wheel.lateralSlip), Math.abs(wheel.longitudinalSlip));
		}
		set("slip", skid > 300 ? "skidding" : "");
	}
}
