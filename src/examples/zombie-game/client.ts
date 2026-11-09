import { IgeBaseClass } from "@/engine/core/IgeBaseClass";
import { IgeEntity } from "@/engine/core/IgeEntity";
import { IgeScene2d } from "@/engine/core/IgeScene2d";
import { IgeWebGlRenderer } from "@/engine/core/IgeWebGlRenderer";
import { IgeViewport } from "@/engine/core/IgeViewport";
import { IgePoint3d } from "@/engine/core/IgePoint3d";
import { ige } from "@/engine/instance";
import type { IgeCanInit } from "@/types/IgeCanInit";
import { IgeBehaviourType } from "@/enums";
import { IgeAmbientLight, IgeDirectionalLight, IgePointLight } from "@/engine/webgl/IgeWebGlLight";
import { igeLoadAssets } from "@/engine/core/igeLoadAssets";
import { IgeParticleSystem3d } from "@/engine/webgl/IgeParticleSystem3d";
import { IgeDecalSystem3d } from "@/engine/webgl/IgeDecalSystem3d";
import { IgePhysics3d, type IgePhysicsBody3d, type IgePhysicsImpact } from "@/engine/physics/IgePhysics3d";
import type { IgeRagdoll3d } from "@/engine/physics/IgeRagdoll3d";
import type { IgePhysicsCharacter3d } from "@/engine/physics/IgePhysicsCharacter3d";
import { IgeViewportOverlay, type IgeOverlayMarker } from "@/engine/webgl/IgeViewportOverlay";
import { IgeGamePadAxis, IgeGamePadButton, IgeGamePadComponent } from "@/engine/components/IgeGamePadComponent";
import { createBoxGeometry, createHospitalLobby, resolveLevelCollision, ARENA, WALL_FACES, type IgeLevelObstacle } from "./level";
import type { IgeGeometryData3d } from "@/types/IgeGeometryData3d";
import {
	type CharacterAction,
	type CharacterKind,
	type CharacterRig,
	createCharacterModel,
	generatedKind,
	PLAYER_KINDS,
	prepareCharacter,
	rightFistMatrix,
	weaponMatrix,
	type WeaponInfo,
	ZOMBIE_KINDS
} from "./characters";
import type { IgeGltfModel } from "@/engine/webgl/IgeGltfLoader";
import { createPropModel, fitProp, LOBBY_PROPS, type PropInfo } from "./props";

// @ts-ignore
window.ige = ige;

/**
 * Zombie Game - 4 player split-screen zombie ARPG prototype.
 *
 * Demonstrates the WebGL renderer features a split-screen action game needs:
 * - Four viewports, each with an isometric camera following its player
 * - A horde of animated, GPU-instanced skinned characters from one GLB
 *   (IgeEntity.model(), shared pose cache, off-screen animation culling)
 * - Per-instance material overrides (zombie tint, red hit flash)
 * - Moonlight shadows centred on each viewport, distance fog, player lanterns
 * - IgeParticleSystem3d blood and slash effects
 * - Floating damage numbers placed with renderer.worldToScreen()
 * - Gamepad input for 4 players (IgeGamePadComponent) with keyboard fallback
 *
 * - Generated level-of-detail meshes for the horde (IgeEntity.lod())
 * - Swords that follow each player's hand bone (IgeEntity.attachToBone())
 * - Blood stains on the floor, and splashes projected onto the walls and
 *   furniture behind a hit (IgeDecalSystem3d add() and project())
 * - Name tags, zombie health bars and damage numbers kept inside each
 *   player's view (IgeViewportOverlay)
 *
 * URL options: ?zombies=200 to change the horde size, ?lod=0 to draw every
 * zombie at full detail.
 */

// Zombies switch to generated lower-detail meshes while small on screen.
// Sizes are bounding-sphere diameters in device pixels; players always draw
// at full detail.
const ZOMBIE_LOD = [
	{ screenSize: 220, ratio: 0.5 },
	{ screenSize: 120, ratio: 0.25 }
];

// Player configuration
const PLAYER_CONFIGS = [
	{ color: { r: 0.3, g: 0.5, b: 1.0 }, name: "Blue", startPos: { x: -150, z: 100 } },
	{ color: { r: 0.3, g: 1.0, b: 0.5 }, name: "Green", startPos: { x: 150, z: 100 } },
	{ color: { r: 1.0, g: 0.3, b: 0.3 }, name: "Red", startPos: { x: -150, z: 300 } },
	{ color: { r: 1.0, g: 1.0, b: 0.3 }, name: "Yellow", startPos: { x: 150, z: 300 } }
];

/** Keyboard fallback: move keys (up, left, down, right) and attack key per player. */
const KEYBOARD_MAPS = [
	{ up: "KeyW", left: "KeyA", down: "KeyS", right: "KeyD", attack: "Space" },
	{ up: "ArrowUp", left: "ArrowLeft", down: "ArrowDown", right: "ArrowRight", attack: "Enter" },
	{ up: "KeyI", left: "KeyJ", down: "KeyK", right: "KeyL", attack: "KeyU" },
	{ up: "Numpad8", left: "Numpad4", down: "Numpad5", right: "Numpad6", attack: "Numpad0" }
];

// Camera configuration
const CAMERA_DISTANCE = 500;
const CAMERA_ORTHO_SIZE = 700;

// Gameplay tuning (world units and seconds)
const PLAYER_SPEED = 260;
const PLAYER_RADIUS = 28;
const PLAYER_MAX_HEALTH = 100;
const HEAL_RATE = 15; // health per second on the healing pad
const PLAYER_RESPAWN_TIME = 3;
const ATTACK_COOLDOWN = 0.35;
const ATTACK_RANGE = 150;
const ATTACK_ARC = Math.cos((70 * Math.PI) / 180);
const ATTACK_DAMAGE: [number, number] = [30, 55];
const ZOMBIE_RADIUS = 26;
const ZOMBIE_SPEED: [number, number] = [55, 95];
const ZOMBIE_HEALTH = 100;
const ZOMBIE_DAMAGE = 8;
const ZOMBIE_ATTACK_RANGE = 70;
const ZOMBIE_ATTACK_COOLDOWN = 1.1;
const ZOMBIE_RESPAWN_TIME = 2.5;
const HIT_FLASH_TIME = 0.15;
const RESPAWN_INVULNERABLE_TIME = 2;
const IDLE_AUTO_FIGHT_TIME = 2;
const CHARACTER_HEIGHT = 130; // stand-in height (world units); generated characters have their own

/** A character's standing height in world units: physics capsules, hit effects and HUD markers follow it. */
function heightOf (rig: CharacterRig): number {
	return rig.kind.height ?? CHARACTER_HEIGHT;
}
/** Corpses darken: multiplied over a stand-in's tint, or over a generated model's own colours. */
const DEAD_SHADE = 0.6;
/** CesiumMan's rest height between its lowest and highest joints: swords are sized for it. */
const SWORD_RIG_HEIGHT = 1.1688;
/** Generated melee weapons the players carry, in player order (cycled), and their length against the holder's height. */
const PLAYER_WEAPONS = ["weapon_bat", "weapon_machete", "weapon_axe"];
const WEAPON_LENGTH = 0.55;

interface PlayerState {
	index: number;
	/** Moved, turned and given a physics body by the game. */
	entity: IgeEntity;
	/** The animated model, a child of entity (see createCharacterModel()). */
	model: IgeEntity;
	rig: CharacterRig;
	/** The locomotion or one-off action playing, and how long a one-off has left. */
	action?: CharacterAction;
	actionTime: number;
	lantern: IgePointLight;
	health: number;
	kills: number;
	attackCooldown: number;
	hitFlash: number;
	respawnTimer: number;
	invulnerable: number;
	idleTime: number;
	facingX: number;
	facingZ: number;
	/** Physics character controller (with ?physics=1). */
	character?: IgePhysicsCharacter3d;
	/** The character's body, as sensors and raycasts report it. */
	body?: IgePhysicsBody3d;
	/** Standing on the healing pad (a physics sensor). */
	healing?: boolean;
}

interface ZombieState {
	entity: IgeEntity;
	model: IgeEntity;
	rig: CharacterRig;
	action?: CharacterAction;
	actionTime: number;
	health: number;
	speed: number;
	attackCooldown: number;
	hitFlash: number;
	knockbackX: number;
	knockbackZ: number;
	respawnTimer: number;
	alive: boolean;
	/** Shown once the zombie has been hurt. */
	healthBar?: IgeOverlayMarker;
	/** Physics capsule (with ?physics=1). */
	body?: IgePhysicsBody3d;
	/** While dead, with physics: the body falls as a ragdoll. */
	ragdoll?: IgeRagdoll3d;
}

/** A generated character in assets/characters.json (written by the import step). */
interface CharacterListEntry {
	id: string;
	/** Under assets/models/. */
	file: string;
	role: "zombie" | "player";
	/** Standing height in world units. */
	height: number;
	/** Ground speed of the walk (and run) clips at normal speed, world units per second. */
	walkSpeed: number;
	runSpeed?: number;
	/** Degrees to turn the model to face +Z. */
	yaw?: number;
}

interface DamageNumber {
	el: HTMLDivElement;
	marker: IgeOverlayMarker;
	position: { x: number; y: number; z: number };
	age: number;
}

export class Client extends IgeBaseClass implements IgeCanInit {
	classId = "Client";

	renderer?: IgeWebGlRenderer;
	scene?: IgeScene2d;
	gamePad?: IgeGamePadComponent;

	viewports: IgeViewport[] = [];
	players: PlayerState[] = [];
	zombies: ZombieState[] = [];
	zombieRigs: CharacterRig[] = [];
	playerRigs: CharacterRig[] = [];
	/** Generated weapons from assets/props.json, by id. */
	weapons: Map<string, { info: WeaponInfo; model: IgeGltfModel }> = new Map();
	/** Generated props (crates, barrels, the car wreck...) from assets/props.json, by id. */
	props: Map<string, IgeGltfModel> = new Map();
	obstacles: IgeLevelObstacle[] = [];
	level?: IgeEntity;
	/** Jolt physics (?physics=1): character capsules, the level, and crates to knock about. */
	physics?: IgePhysics3d;
	crates: IgePhysicsBody3d[] = [];

	bloodFx?: IgeParticleSystem3d;
	bloodStains?: IgeDecalSystem3d;
	slashFx?: IgeParticleSystem3d;
	damageNumbers: DamageNumber[] = [];
	overlay?: IgeViewportOverlay;

	keysDown: Record<string, boolean> = {};
	ticks = 0;
	keysPressed: Record<string, boolean> = {};
	totalKills = 0;

	// Isometric camera offset (computed once)
	cameraOffset = { x: 0, y: 0, z: 0 };

	// Spatial hash for zombie separation
	grid: Map<number, ZombieState[]> = new Map();

	constructor () {
		super();
		void this.init();
	}

	async init () {
		try {
			this.updateStatus("Creating renderer...");

			this.renderer = new IgeWebGlRenderer();
			// ?webgl=1 runs the WebGL 1 fallback path
			if (new URLSearchParams(window.location.search).get("webgl") === "1") {
				this.renderer.preferredWebGlVersion(1);
			}
			// Four views on a high-DPI screen is a lot of pixels; 1.5x keeps
			// the image sharp while staying comfortably inside the GPU budget
			this.renderer.maxPixelRatio(1.5);
			// Every mesh here is closed, so skip the triangles facing away
			// from the camera (about a fifth less GPU time)
			this.renderer.backFaceCulling(true);
			ige.engine.renderer(this.renderer);
			await this.renderer.setup();
			this.renderer.createFrontBuffer(true);

			// Night-time atmosphere: dark clear colour that the fog fades into
			this.renderer.setClearColor(0.02, 0.025, 0.04, 1);
			this.renderer.fog({ mode: "linear", color: { r: 0.02, g: 0.025, b: 0.04 }, near: 700, far: 1500 });

			ige.engine.addComponent("gamePad", IgeGamePadComponent);
			this.gamePad = ige.engine.components.gamePad as IgeGamePadComponent;

			this.updateStatus("Starting engine...");
			await ige.engine.start();

			this.scene = new IgeScene2d();
			this.scene.id("mainScene");

			this.updateStatus("Setting up lights...");
			this.setupLights();

			this.updateStatus("Building hospital lobby...");
			const lobby = createHospitalLobby(this.scene);
			this.obstacles = lobby.obstacles;
			this.level = lobby.root;

			this.updateStatus("Loading characters and props...");
			await this.loadCharacters();

			if (this.physicsFromUrl()) {
				this.updateStatus("Loading physics...");
				this.physics = await IgePhysics3d.create({
					unitsPerMetre: 100,
					// The living walk through corpses; corpses still land on the floor, crates and each other
					layers: [{ name: "static", static: true }, { name: "moving" }, { name: "characters" }, { name: "corpses" }],
					ignore: [["characters", "corpses"]]
				});
				for (const box of lobby.boxes) {
					this.physics.addBody(box.entity, {
						type: "static",
						shape: { type: "box", halfExtents: { x: box.w / 2, y: box.h / 2, z: box.d / 2 } }
					});
				}
				this.createCrates();
				this.createHealingPad();
			}
			this.createDressing();


			this.updateStatus("Spawning players and zombies...");
			this.createEffects();
			this.createPlayers();
			this.createZombies(this.zombieCountFromUrl());

			this.setupSplitScreenViewports();
			this.computeCameraOffset();
			this.updateCameraPositions();

			if (this.physics) {
				// Cameras follow the characters where the step left them
				this.physics.on("afterStep", () => this.updateCameraPositions());
				this.physics.start();
			}
			this.setupInput();
			this.createOverlay();

			// One behaviour drives the whole simulation; cameras follow after it
			this.scene.addBehaviour(IgeBehaviourType.preUpdate, "zombieGame", (_entity: IgeEntity, tickDelta: number) => {
				this.tick(Math.min(tickDelta / 1000, 0.1));
			});

			window.addEventListener("resize", () => this.updateViewportLayout());

			this.hideLoadingScreen();
			this.updateStatus("Playing");
			this.updatePlayerCount(this.players.length);
			setInterval(() => this.updateStats(), 250);

			this.log(`Zombie Game initialized - ${this.zombies.length} zombies, 4 player split screen`);
		} catch (error) {
			this.log(`Error initializing: ${error}`, "error");
			this.updateStatus(`Error: ${error}`);
		}
	}

	physicsFromUrl (): boolean {
		return new URLSearchParams(window.location.search).get("physics") === "1";
	}

	/**
	 * Load the characters: the generated ones listed in assets/characters.json
	 * when there are any (zombies and survivors), otherwise the CesiumMan
	 * stand-in. ?standin=1 uses the stand-in regardless.
	 */
	async loadCharacters () {
		let zombieKinds: CharacterKind[] = ZOMBIE_KINDS;
		let playerKinds: CharacterKind[] = PLAYER_KINDS;
		let weaponList: WeaponInfo[] = [];
		let propList: PropInfo[] = [];
		if (new URLSearchParams(window.location.search).get("standin") !== "1") {
			const listed = await igeLoadAssets({ data: { characters: "./assets/characters.json", props: "./assets/props.json" } }, { failOnError: false });
			const list = (listed.data.characters as CharacterListEntry[] | undefined) || [];
			const props = (listed.data.props as (PropInfo | WeaponInfo)[] | undefined) || [];
			weaponList = props.filter((p): p is WeaponInfo => p.role === "weapon" && PLAYER_WEAPONS.includes(p.id));
			propList = props.filter((p) => p.role === "prop");
			const kinds = (role: string) => list.filter((c) => c.role === role)
				.map((c) => ({ ...generatedKind(c.id, `./assets/models/${c.file}`, c.height, c.walkSpeed, c.runSpeed), yaw: c.yaw }));
			if (kinds("zombie").length) zombieKinds = kinds("zombie");
			if (kinds("player").length) playerKinds = kinds("player");
		}

		const all = [...new Set([...zombieKinds, ...playerKinds])];
		const assets = await igeLoadAssets(
			{
				models: Object.fromEntries([
					...all.map((kind) => [kind.id, kind.file]),
					...weaponList.map((weapon) => [weapon.id, `./assets/models/${weapon.file}`]),
					...propList.map((prop) => [prop.id, `./assets/models/${prop.file}`])
				])
			},
			{ onProgress: (done, total) => this.updateStatus(`Loading characters ${done}/${total}...`), failOnError: false }
		);
		const rigs = (kinds: CharacterKind[], fallback: CharacterKind[]): CharacterRig[] => {
			const loaded = kinds.filter((kind) => assets.models[kind.id]).map((kind) => prepareCharacter(kind, assets.models[kind.id]));
			return loaded.length || kinds === fallback ? loaded : rigs(fallback, fallback);
		};
		for (const failure of assets.failures) this.log(`Couldn't load ${failure.url}: ${failure.error}`, "warning");
		if (assets.failures.length && !assets.models[ZOMBIE_KINDS[0].id]) {
			// A generated model failed: make sure the stand-in is there to fall back on
			Object.assign(assets.models, (await igeLoadAssets({ models: { [ZOMBIE_KINDS[0].id]: ZOMBIE_KINDS[0].file } })).models);
		}
		for (const info of weaponList) {
			if (assets.models[info.id]) this.weapons.set(info.id, { info, model: assets.models[info.id] });
		}
		for (const info of propList) {
			if (assets.models[info.id]) this.props.set(info.id, assets.models[info.id]);
		}
		this.zombieRigs = rigs(zombieKinds, ZOMBIE_KINDS);
		this.playerRigs = rigs(playerKinds, PLAYER_KINDS);
	}

	/**
	 * Play a character's clip for an action, when its model has one:
	 * locomotion (idle, walk, run) loops and only restarts when it changes;
	 * attack, hit and death play once (actionTime counts down their length).
	 * Returns false when the model has no clip for it.
	 */
	playAction (who: PlayerState | ZombieState, action: CharacterAction, speed = 1): boolean {
		const clip = who.rig.clips[action];
		const anim = who.model.skeletalAnimation();
		if (!clip || !anim) return false;
		const once = action === "attack" || action === "hit" || action === "death";
		if (who.action !== action || once) {
			anim.play(clip, { loop: !once, crossFadeDuration: once ? 0.08 : 0.2, speed });
			who.action = action;
			who.actionTime = once ? (anim.getClip(clip)?.duration ?? 0.5) / Math.max(0.1, speed) : 0;
		} else {
			anim.setSpeed(speed);
		}
		return true;
	}

	/** Walk, run or stand, unless a one-off action is still playing. */
	playLocomotion (who: PlayerState | ZombieState, groundSpeed: number, dt: number) {
		if (who.actionTime > 0) {
			who.actionTime -= dt;
			if (who.actionTime > 0) return;
		}
		const kind = who.rig.kind;
		if (groundSpeed < 5) {
			if (!this.playAction(who, "idle")) this.playAction(who, "walk", 0);
			return;
		}
		const run = who.rig.clips.run && kind.runSpeed && groundSpeed > (kind.walkSpeed + kind.runSpeed) / 2;
		if (run) this.playAction(who, "run", groundSpeed / kind.runSpeed!);
		else this.playAction(who, "walk", groundSpeed / kind.walkSpeed);
	}

	/** An upright capsule for a character, its bottom at the entity's feet. */
	addCharacterBody (entity: IgeEntity, radius: number, density: number, height: number): IgePhysicsBody3d | undefined {
		if (!this.physics) return;
		const halfHeight = Math.max(1, height / 2 - radius);
		return this.physics.addBody(entity, {
			shape: { type: "capsule", radius, halfHeight },
			offset: { x: 0, y: height / 2, z: 0 },
			lockRotation: true,
			friction: 0, // slide along walls and each other
			linearDamping: 0,
			density,
			layer: "characters"
		});
	}

	/** Wooden crates around the lobby, and a stack by the desk, for characters and swords to knock about. */
	createCrates () {
		if (!this.scene || !this.physics) return;
		const spots = [
			[-650, -350, 30], [-600, 120, 26], [-180, -380, 32], [180, -330, 28], [620, -380, 30],
			[640, 150, 26], [-120, 420, 28], [460, 480, 30], [-480, 520, 26], [80, -150, 24]
		].map(([x, z, half]) => ({ x, z, half, y: half + 1, turn: Math.random() * Math.PI }));
		// A pyramid of crates beside the reception desk
		for (let row = 0; row < 3; row++) {
			for (let i = 0; i < 3 - row; i++) {
				spots.push({ x: 330 + i * 62 + row * 31, z: -560, half: 30, y: 31 + row * 61, turn: 0 });
			}
		}

		for (const { x, y, z, half, turn } of spots) {
			const crate = new IgeEntity()
				.translateTo(x, y, z)
				.rotateTo(0, turn, 0)
				.mount(this.scene);
			const crateModel = this.props.get("prop_crate");
			if (crateModel) {
				// The generated crate, fitted to the box the physics simulates (its base at the box's bottom)
				const fit = fitProp(crateModel, half * 2);
				createPropModel(crateModel, fit, crate).translateTo(fit.offset.x, fit.offset.y - half, fit.offset.z);
			} else {
				crate._geometryData = createBoxGeometry(half * 2, half * 2, half * 2, `crate_${half}`);
				crate.material({ color: { r: 0.55, g: 0.38, b: 0.2, a: 1 }, roughness: 0.85 });
			}
			const body = this.physics.addBody(crate, {
				shape: { type: "box", halfExtents: { x: half, y: half, z: half } },
				density: 250,
				friction: 0.6,
				impacts: 220 // hard knocks throw up splinters
			});
			body.on("impact", (impact: IgePhysicsImpact) => {
				const t = crate._translate;
				this.slashFx?.burst(Math.min(14, Math.round(impact.speed / 40)), { x: t.x, y: t.y, z: t.z }, { x: 0, y: 1, z: 0 });
			});
			this.crates.push(body);
		}
	}

	/**
	 * A glowing pad by the reception desk that heals players standing on
	 * it: a physics sensor reports players stepping on and off.
	 */
	/**
	 * Generated props around the lobby (see LOBBY_PROPS), when their models
	 * exist: solid ones block characters (a static box from their bounds, or
	 * a level obstacle without physics); loose ones (barrels, cones) get
	 * knocked about like the crates.
	 */
	createDressing () {
		if (!this.scene) return;
		for (const [i, place] of LOBBY_PROPS.entries()) {
			const model = this.props.get(place.id);
			if (!model) continue;
			const fit = fitProp(model, place.height);
			const turn = place.turn ?? Math.random() * Math.PI * 2;
			const root = new IgeEntity()
				.id(`${place.id}_${i}`)
				.translateTo(place.x, place.loose && this.physics ? 1 : 0, place.z)
				.rotateTo(0, turn, 0)
				.mount(this.scene);
			createPropModel(model, fit, root);
			if (place.decor) continue;

			const shape = { type: "box" as const, halfExtents: { x: fit.half.x, y: fit.half.y, z: fit.half.z } };
			if (this.physics) {
				const body = this.physics.addBody(root, {
					type: place.loose ? "dynamic" : "static",
					shape,
					offset: { x: 0, y: fit.half.y, z: 0 },
					density: 300,
					friction: 0.6
				});
				if (place.loose) this.crates.push(body);
				continue;
			}
			// Without physics: an obstacle covering the turned footprint
			const c = Math.abs(Math.cos(turn)), s = Math.abs(Math.sin(turn));
			const hx = fit.half.x * c + fit.half.z * s, hz = fit.half.x * s + fit.half.z * c;
			this.obstacles.push({ minX: place.x - hx, maxX: place.x + hx, minZ: place.z - hz, maxZ: place.z + hz });
		}
	}

	createHealingPad () {
		if (!this.scene || !this.physics) return;
		const pad = new IgeEntity().id("healingPad").translateTo(0, 1, -380).mount(this.scene);
		pad._geometryData = createBoxGeometry(180, 2, 120, "healingPad");
		pad.material({ color: { r: 0.1, g: 0.35, b: 0.15, a: 1 }, emissiveColor: { r: 0.2, g: 1, b: 0.4 }, emissiveIntensity: 0.6 });
		pad._noShadowCast = true;

		const zone = this.physics.addSensor(pad, {
			shape: { type: "box", halfExtents: { x: 90, y: 60, z: 60 } },
			offset: { x: 0, y: 60, z: 0 }
		});
		const playerOf = (body: IgePhysicsBody3d) => this.players.find((p) => p.body === body);
		zone.on("enter", (body: IgePhysicsBody3d) => {
			const player = playerOf(body);
			if (player) player.healing = true;
		});
		zone.on("exit", (body: IgePhysicsBody3d) => {
			const player = playerOf(body);
			if (player) player.healing = false;
		});
	}

	lodFromUrl (): boolean {
		return new URLSearchParams(window.location.search).get("lod") !== "0";
	}

	zombieCountFromUrl (): number {
		const value = Number(new URLSearchParams(window.location.search).get("zombies"));
		return Number.isFinite(value) && value > 0 ? Math.min(1000, Math.floor(value)) : 120;
	}

	setupLights () {
		if (!this.scene || !this.renderer) return;
		const lightManager = this.renderer.lightManager;
		if (!lightManager) return;

		const ambient = new IgeAmbientLight();
		ambient.id("ambientLight");
		ambient.lightColor(0.35, 0.4, 0.55);
		ambient.intensity(0.45);
		ambient.mount(this.scene);
		lightManager.addLight(ambient);

		// Cold moonlight casting shadows. The shadow map follows each
		// viewport's camera target, so all four players get shadows wherever
		// they are in the level.
		const moon = new IgeDirectionalLight();
		moon.id("moonLight");
		moon.lightColor(0.6, 0.7, 1.0);
		moon.intensity(0.75);
		moon.direction(-0.45, -1.0, -0.35);
		moon.mount(this.scene);
		lightManager.addLight(moon);

		const shadowManager = this.renderer.shadowManager;
		if (shadowManager) {
			shadowManager.frustumSize(900);
			shadowManager.shadowPlanes(1, 3000);
		}
		this.renderer.enableShadows(moon, 2048);
	}

	createEffects () {
		if (!this.scene) return;

		// Dark blood that sprays out and falls to the floor
		this.bloodFx = new IgeParticleSystem3d({
			maxParticles: 1500,
			blending: "normal",
			lifetime: [0.45, 0.9],
			speed: [120, 320],
			spread: Math.PI / 2.5,
			gravity: { x: 0, y: -900, z: 0 },
			drag: 0.6,
			size: [14, 6],
			startColor: { r: 0.55, g: 0.02, b: 0.02, a: 1 },
			endColor: { r: 0.25, g: 0, b: 0, a: 0 }
		});
		this.bloodFx.id("bloodFx").mount(this.scene);

		// Stains left on the floor. Multiply blending darkens the floor, so
		// stains are only visible where the floor itself is lit.
		this.bloodStains = new IgeDecalSystem3d({ maxDecals: 400, lifetime: 40, fadeTime: 6, maxProjected: 120 });
		this.bloodStains.id("bloodStains").mount(this.scene);

		// Bright additive sparks for weapon swings
		this.slashFx = new IgeParticleSystem3d({
			maxParticles: 600,
			blending: "additive",
			lifetime: [0.15, 0.3],
			speed: [200, 450],
			spread: Math.PI / 5,
			gravity: { x: 0, y: 0, z: 0 },
			drag: 2,
			size: [22, 4],
			startColor: { r: 1, g: 0.9, b: 0.6, a: 0.9 },
			endColor: { r: 1, g: 0.4, b: 0.1, a: 0 }
		});
		this.slashFx.id("slashFx").mount(this.scene);
	}

	createPlayers () {
		if (!this.scene || !this.playerRigs.length || !this.renderer?.lightManager) return;

		for (let i = 0; i < PLAYER_CONFIGS.length; i++) {
			const config = PLAYER_CONFIGS[i];
			const rig = this.playerRigs[i % this.playerRigs.length];

			// The root is what moves; the model under it sets up meshes, textures,
			// skeleton and animation clips, sized and standing on the floor
			const entity = new IgeEntity()
				.id(`player_${i}`)
				.translateTo(config.startPos.x, 0, config.startPos.z)
				.mount(this.scene);
			const model = createCharacterModel(rig, entity).id(`player_${i}_model`);

			// Heroes animate at full frame rate rather than from the crowd cache
			model.skeletalAnimation()?.poseCache(false);
			// Players walk with a character controller: up steps, pushing crates and zombies aside
			const character = this.physics?.addCharacter(entity, {
				radius: PLAYER_RADIUS,
				height: heightOf(rig),
				mass: 90,
				maxStrength: 900,
				layer: "characters",
				pushable: false // the horde blocks players rather than shoving them about
			});


			// Each player carries a lantern so they can see in the dark
			const lantern = new IgePointLight();
			lantern.id(`lantern_${i}`);
			lantern.lightColor(1.0, 0.8, 0.55);
			lantern.intensity(1.6);
			lantern.range(420);
			lantern.decay(2);
			lantern.mount(this.scene);
			this.renderer.lightManager.addLight(lantern);

			const player: PlayerState = {
				index: i,
				entity,
				model,
				rig,
				actionTime: 0,
				lantern,
				health: PLAYER_MAX_HEALTH,
				kills: 0,
				attackCooldown: 0,
				hitFlash: 0,
				respawnTimer: 0,
				invulnerable: 0,
				idleTime: 0,
				facingX: 0,
				facingZ: 1,
				character,
				body: character?.body
			};
			this.applyPlayerMaterial(player);
			this.players.push(player);
		}
	}

	createZombies (count: number) {
		if (!this.scene || !this.zombieRigs.length) return;
		const lod = this.lodFromUrl() ? ZOMBIE_LOD : undefined;

		for (let i = 0; i < count; i++) {
			const rig = this.zombieRigs[i % this.zombieRigs.length];
			const entity = new IgeEntity().id(`zombie_${i}`).mount(this.scene);
			const model = createCharacterModel(rig, entity, { lod }).id(`zombie_${i}_model`);

			const zombie: ZombieState = {
				entity,
				model,
				rig,
				actionTime: 0,
				health: ZOMBIE_HEALTH,
				speed: lerp(ZOMBIE_SPEED[0], ZOMBIE_SPEED[1], Math.random()),
				attackCooldown: Math.random() * ZOMBIE_ATTACK_COOLDOWN,
				hitFlash: 0,
				knockbackX: 0,
				knockbackZ: 0,
				respawnTimer: 0,
				alive: true,
				body: this.addCharacterBody(entity, ZOMBIE_RADIUS, 1000, heightOf(rig))
			};

			// Per-instance tint over the shared model material (stand-ins)
			this.applyZombieMaterial(zombie);

			// Desynchronise the walk cycles; slower zombies shamble slower
			this.playAction(zombie, "walk", zombie.speed / rig.kind.walkSpeed);
			const state = (model.skeletalAnimation() as any)?._activeStates?.at(-1);
			if (state) state.time = Math.random() * state.clip.duration;

			this.placeZombieAwayFromPlayers(zombie);
			this.zombies.push(zombie);
		}
	}

	swordParts?: { blade: IgeGeometryData3d; guard: IgeGeometryData3d; grip: IgeGeometryData3d };

	/**
	 * Put a sword in a character's right fist, pointing the way it faces.
	 * The sword root follows the hand bone (found from the rig's shape, so
	 * any humanoid works) and placed against the pose the character is
	 * animated to now (called once it has been animated); its parts are
	 * ordinary children of it, sized for CesiumMan and scaled to the
	 * character. Every player shares the same geometry, so the four swords
	 * draw as instanced batches.
	 */
	createWeapon (player: PlayerState) {
		const owner = player.model, rig = player.rig;
		const hand = rig.bones?.right.hand;
		const available = PLAYER_WEAPONS.filter((id) => this.weapons.has(id));
		const weapon = available.length ? this.weapons.get(available[player.index % available.length]) : undefined;
		const grip = hand && weapon ? weaponMatrix(rig, owner, weapon.info, heightOf(rig) * WEAPON_LENGTH) : undefined;
		if (hand && weapon && grip) {
			// A generated weapon: held by the grip the import step found
			new IgeEntity()
				.id(`${owner.id()}_weapon`)
				.model(weapon.model)
				.mount(owner)
				.attachToBone(hand)
				.attachAt(grip, { pose: "current" });
			return;
		}
		this.createSword(owner, rig);
	}

	createSword (owner: IgeEntity, rig: CharacterRig) {
		const hand = rig.bones?.right.hand;
		const grip = hand ? rightFistMatrix(rig, owner, rig.bones!.height / SWORD_RIG_HEIGHT) : undefined;
		if (!hand || !grip) return;
		const parts = this.swordParts || (this.swordParts = {
			blade: createBoxGeometry(0.045, 0.5, 0.012, "swordBlade"),
			guard: createBoxGeometry(0.14, 0.022, 0.035, "swordGuard"),
			grip: createBoxGeometry(0.026, 0.12, 0.026, "swordGrip")
		});

		const sword = new IgeEntity()
			.id(`${owner.id()}_sword`)
			.mount(owner)
			.attachToBone(hand)
			.attachAt(grip, { pose: "current" });

		const part = (geometry: IgeGeometryData3d, y: number, color: { r: number; g: number; b: number }, metallic: number, roughness: number) => {
			const entity = new IgeEntity().translateTo(0, y, 0).mount(sword);
			entity._geometryData = geometry;
			entity.material({ color: { ...color, a: 1 }, metallic, roughness });
			return entity;
		};

		part(parts.blade, 0.28, { r: 0.78, g: 0.8, b: 0.84 }, 0.9, 0.25);
		part(parts.guard, 0.025, { r: 0.35, g: 0.28, b: 0.15 }, 0.6, 0.4);
		part(parts.grip, -0.04, { r: 0.22, g: 0.14, b: 0.08 }, 0.0, 0.8);
	}

	placeZombieAwayFromPlayers (zombie: ZombieState) {
		for (let attempt = 0; attempt < 30; attempt++) {
			const x = lerp(ARENA.minX + 60, ARENA.maxX - 60, Math.random());
			const z = lerp(ARENA.minZ + 60, ARENA.maxZ - 60, Math.random());
			const tooClose = this.players.some((p) => {
				const dx = p.entity._translate.x - x, dz = p.entity._translate.z - z;
				return dx * dx + dz * dz < 450 * 450;
			});
			if (!tooClose || attempt === 29) {
				const pos = resolveLevelCollision(x, z, ZOMBIE_RADIUS, this.obstacles);
				zombie.entity.translateTo(pos.x, 0, pos.z);
				zombie.body?.enabled(true).teleport(pos.x, 0, pos.z);
				return;
			}
		}
	}

	// ------------------------------------------------------------------
	// Simulation
	// ------------------------------------------------------------------

	tick (dt: number) {
		// Swords go in hand once the characters have been animated (see createSword())
		if (++this.ticks === 3) for (const player of this.players) this.createWeapon(player);
		for (const player of this.players) this.updatePlayer(player, dt);
		this.rebuildGrid();
		for (const zombie of this.zombies) this.updateZombie(zombie, dt);
		this.updateCameraPositions();
		this.updateDamageNumbers(dt);
		this.updatePlayerHud();
		this.keysPressed = {};
	}

	readPlayerInput (index: number): { moveX: number; moveZ: number; attack: boolean } {
		let moveX = 0, moveZ = 0, attack = false;

		// Gamepad: left stick moves, A / X / right trigger attacks
		const pad = this.gamePad;
		if (pad?.states[index]?.connected) {
			moveX = pad.axis(index, IgeGamePadAxis.leftX);
			moveZ = pad.axis(index, IgeGamePadAxis.leftY);
			attack = pad.justPressed(index, IgeGamePadButton.a) ||
				pad.justPressed(index, IgeGamePadButton.x) ||
				pad.justPressed(index, IgeGamePadButton.rightTrigger);
		}

		// Keyboard fallback
		const keys = KEYBOARD_MAPS[index];
		if (this.keysDown[keys.left]) moveX -= 1;
		if (this.keysDown[keys.right]) moveX += 1;
		if (this.keysDown[keys.up]) moveZ -= 1;
		if (this.keysDown[keys.down]) moveZ += 1;
		if (this.keysPressed[keys.attack]) attack = true;

		// The isometric camera looks along (-1, -1) on the ground, so rotate
		// stick/key input by 45 degrees to make "up" move away from the camera
		const s = Math.SQRT1_2;
		const worldX = (moveX + moveZ) * s;
		const worldZ = (moveZ - moveX) * s;
		const len = Math.hypot(worldX, worldZ);
		if (len > 1) return { moveX: worldX / len, moveZ: worldZ / len, attack };
		return { moveX: worldX, moveZ: worldZ, attack };
	}

	updatePlayer (player: PlayerState, dt: number) {
		const entity = player.entity;
		player.attackCooldown = Math.max(0, player.attackCooldown - dt);
		player.invulnerable = Math.max(0, player.invulnerable - dt);

		if (player.hitFlash > 0) {
			player.hitFlash -= dt;
			if (player.hitFlash <= 0) this.applyPlayerMaterial(player);
		}

		// Dead players wait, then respawn at their start position
		if (player.health <= 0) {
			player.respawnTimer -= dt;
			if (player.respawnTimer <= 0) {
				const start = PLAYER_CONFIGS[player.index].startPos;
				player.health = PLAYER_MAX_HEALTH;
				player.invulnerable = RESPAWN_INVULNERABLE_TIME;
				entity.translateTo(start.x, 0, start.z).show();
				player.character?.enabled(true).teleport(start.x, 0, start.z);
				player.lantern.intensity(1.6);
				this.shoveZombiesAway(start.x, start.z, 320);
			}
			return;
		}

		if (player.healing && player.health < PLAYER_MAX_HEALTH) {
			player.health = Math.min(PLAYER_MAX_HEALTH, player.health + HEAL_RATE * dt);
		}

		const input = this.readPlayerInput(player.index);
		const len = Math.hypot(input.moveX, input.moveZ);

		// Players nobody is controlling stand their ground and fight back,
		// so every view stays lively when fewer than four people are playing
		player.idleTime = len > 0.05 || input.attack ? 0 : player.idleTime + dt;
		if (player.idleTime > IDLE_AUTO_FIGHT_TIME) {
			const target = this.nearestZombie(entity._translate.x, entity._translate.z, ATTACK_RANGE * 0.9);
			if (target) {
				const dx = target.entity._translate.x - entity._translate.x;
				const dz = target.entity._translate.z - entity._translate.z;
				const d = Math.hypot(dx, dz) || 1;
				player.facingX = dx / d;
				player.facingZ = dz / d;
				entity.rotateTo(0, Math.atan2(player.facingX, player.facingZ), 0);
				input.attack = true;
			}
		}

		if (len > 0.05) {
			if (player.character) {
				// The character controller walks it, keeping it out of walls and zombies
				player.character.move(input.moveX * PLAYER_SPEED, input.moveZ * PLAYER_SPEED);
			} else {
				const pos = resolveLevelCollision(
					entity._translate.x + input.moveX * PLAYER_SPEED * dt,
					entity._translate.z + input.moveZ * PLAYER_SPEED * dt,
					PLAYER_RADIUS,
					this.obstacles
				);
				entity.translateTo(pos.x, 0, pos.z);
			}

			player.facingX = input.moveX / len;
			player.facingZ = input.moveZ / len;
			// glTF models face +Z; a Y rotation of a turns +Z toward (sin a, cos a)
			entity.rotateTo(0, Math.atan2(player.facingX, player.facingZ), 0);
			// Stand-ins without a run clip stride a little faster than their walk
			const kind = player.rig.kind;
			const stride = player.rig.clips.run ? PLAYER_SPEED : kind.walkSpeed * 1.4;
			this.playLocomotion(player, stride * Math.min(1, len), dt);
		} else {
			player.character?.move(0, 0);
			this.playLocomotion(player, 0, dt);
		}

		// Lantern floats above the player's shoulder
		player.lantern.translateTo(entity._translate.x, 180, entity._translate.z);

		if (input.attack && player.attackCooldown <= 0) {
			player.attackCooldown = ATTACK_COOLDOWN;
			this.playerAttack(player);
		}
	}

	playerAttack (player: PlayerState) {
		this.playAction(player, "attack", 1.3);
		const px = player.entity._translate.x;
		const pz = player.entity._translate.z;

		// Swords knock crates flying
		for (const crate of this.crates) {
			const dx = crate.entity._translate.x - px, dz = crate.entity._translate.z - pz;
			const dist = Math.hypot(dx, dz);
			if (dist > ATTACK_RANGE * 1.2 || dist < 1) continue;
			if ((dx * player.facingX + dz * player.facingZ) / dist < ATTACK_ARC) continue;
			const push = crate.mass() * 420; // kg * units per second
			crate.applyImpulse((dx / dist) * push, push * 0.45, (dz / dist) * push);
		}

		// Swing sparks in front of the player
		// The slash starts at the sword hand
		const handBone = player.rig.bones?.right.hand;
		const hand = handBone ? player.model.bonePosition(handBone) : undefined;
		const slashY = hand ? hand.y + 10 : 110;
		this.slashFx?.burst(18, { x: px + player.facingX * 60, y: slashY, z: pz + player.facingZ * 60 }, {
			x: player.facingX,
			y: 0.2,
			z: player.facingZ
		});

		for (const zombie of this.zombies) {
			if (!zombie.alive) continue;
			const dx = zombie.entity._translate.x - px;
			const dz = zombie.entity._translate.z - pz;
			const dist = Math.hypot(dx, dz);
			if (dist > ATTACK_RANGE || dist < 1) continue;
			if ((dx * player.facingX + dz * player.facingZ) / dist < ATTACK_ARC) continue;

			const damage = Math.round(lerp(ATTACK_DAMAGE[0], ATTACK_DAMAGE[1], Math.random()));
			zombie.health -= damage;
			if (!zombie.healthBar && zombie.health > 0) zombie.healthBar = this.addHealthBar(zombie);
			zombie.hitFlash = HIT_FLASH_TIME;
			zombie.knockbackX = (dx / dist) * 420;
			zombie.knockbackZ = (dz / dist) * 420;
			this.applyZombieMaterial(zombie);
			if (zombie.health > 0) this.playAction(zombie, "hit", 1.5);

			const height = heightOf(zombie.rig);
			const hitPoint = { x: zombie.entity._translate.x, y: height * 0.65, z: zombie.entity._translate.z };
			this.bloodFx?.burst(24, hitPoint, { x: dx / dist, y: 0.6, z: dz / dist });
			this.bloodStains?.add(hitPoint.x + (dx / dist) * 25, hitPoint.z + (dz / dist) * 25, {
				size: 30 + Math.random() * 25,
				opacity: 0.6 + Math.random() * 0.3
			});
			this.splashBehind(hitPoint.x, hitPoint.z, dx / dist, dz / dist);
			this.spawnDamageNumber(player.index, hitPoint.x, height + 50, hitPoint.z, damage);

			if (zombie.health <= 0) {
				this.killZombie(zombie, dx / dist, dz / dist);
				player.kills++;
				this.totalKills++;
			}
		}
	}

	nearestZombie (x: number, z: number, maxDist: number): ZombieState | undefined {
		let best: ZombieState | undefined;
		let bestDistSq = maxDist * maxDist;
		for (const zombie of this.zombies) {
			if (!zombie.alive) continue;
			const dx = zombie.entity._translate.x - x, dz = zombie.entity._translate.z - z;
			const d = dx * dx + dz * dz;
			if (d < bestDistSq) {
				bestDistSq = d;
				best = zombie;
			}
		}
		return best;
	}

	shoveZombiesAway (x: number, z: number, radius: number) {
		for (const zombie of this.zombies) {
			if (!zombie.alive) continue;
			const dx = zombie.entity._translate.x - x, dz = zombie.entity._translate.z - z;
			const d = Math.hypot(dx, dz);
			if (d < radius && d > 1) {
				zombie.knockbackX = (dx / d) * 900;
				zombie.knockbackZ = (dz / d) * 900;
			}
		}
	}

	/**
	 * Splash blood onto the wall, pillar or furniture behind a hit, if one
	 * is close: a short ray along the hit direction finds the surface and
	 * a projected decal wraps over it.
	 */
	splashBehind (x: number, z: number, dirX: number, dirZ: number) {
		if (!this.bloodStains || !this.level) return;

		let best = 160; // furthest a splash reaches
		let normalX = 0, normalZ = 0;
		const testBox = (minX: number, maxX: number, minZ: number, maxZ: number) => {
			let enter = 0, exit = best, nx = 0, nz = 0;
			for (const [origin, dir, min, max, axis] of [[x, dirX, minX, maxX, 0], [z, dirZ, minZ, maxZ, 1]]) {
				if (Math.abs(dir) < 1e-6) {
					if (origin < min || origin > max) return;
					continue;
				}
				const tMin = (min - origin) / dir, tMax = (max - origin) / dir;
				const near = Math.min(tMin, tMax), far = Math.max(tMin, tMax);
				if (near > enter) {
					enter = near;
					nx = axis === 0 ? -Math.sign(dir) : 0;
					nz = axis === 1 ? -Math.sign(dir) : 0;
				}
				exit = Math.min(exit, far);
			}
			if (enter > 0 && enter <= exit && enter < best) {
				best = enter;
				normalX = nx;
				normalZ = nz;
			}
		};
		for (const o of this.obstacles) testBox(o.minX, o.maxX, o.minZ, o.maxZ);

		// The lobby walls, from inside
		const w = WALL_FACES;
		if (dirX > 0 && (w.maxX - x) / dirX < best) { best = (w.maxX - x) / dirX; normalX = -1; normalZ = 0; }
		if (dirX < 0 && (w.minX - x) / dirX < best) { best = (w.minX - x) / dirX; normalX = 1; normalZ = 0; }
		if (dirZ > 0 && (w.maxZ - z) / dirZ < best) { best = (w.maxZ - z) / dirZ; normalX = 0; normalZ = -1; }
		if (dirZ < 0 && (w.minZ - z) / dirZ < best) { best = (w.minZ - z) / dirZ; normalX = 0; normalZ = 1; }
		if (normalX === 0 && normalZ === 0) return;

		this.bloodStains.project(
			{ x: x + dirX * best, y: 30 + Math.random() * 90, z: z + dirZ * best },
			{ x: normalX, y: 0, z: normalZ },
			this.level,
			{ size: 50 + Math.random() * 40, depth: 30, opacity: 0.7 + Math.random() * 0.25 }
		);
	}

	/** @param dirX, dirZ Direction of the killing blow (for the ragdoll). */
	killZombie (zombie: ZombieState, dirX = 0, dirZ = 0) {
		zombie.alive = false;
		zombie.healthBar?.remove();
		zombie.healthBar = undefined;
		zombie.respawnTimer = ZOMBIE_RESPAWN_TIME;
		const t = zombie.entity._translate;
		this.bloodFx?.burst(70, { x: t.x, y: heightOf(zombie.rig) * 0.5, z: t.z }, { x: 0, y: 1, z: 0 });
		this.bloodStains?.add(t.x, t.z, { size: 80 + Math.random() * 40, color: { r: 0.3, g: 0.01, b: 0.01 } });

		if (this.physics && zombie.body) {
			// The capsule gives way to a ragdoll thrown along the blow
			zombie.body.enabled(false);
			zombie.hitFlash = 0;
			this.applyZombieMaterial(zombie, true);
			// Parts default to humanoidRagdollParts(): torso, head, arms and legs found from the rig
			zombie.ragdoll = this.physics.createRagdoll(zombie.model, {
				layer: "corpses",
				velocity: { x: dirX * 380, y: 160, z: dirZ * 380 }
			});
			zombie.respawnTimer = ZOMBIE_RESPAWN_TIME * 2;
			return;
		}
		if (this.playAction(zombie, "death")) {
			// Without physics: play the death clip, then lie there until respawning
			this.applyZombieMaterial(zombie, true);
			return;
		}
		zombie.entity.hide();
	}

	rebuildGrid () {
		this.grid.clear();
		for (const zombie of this.zombies) {
			if (!zombie.alive) continue;
			const key = gridKey(zombie.entity._translate.x, zombie.entity._translate.z);
			let cell = this.grid.get(key);
			if (!cell) {
				cell = [];
				this.grid.set(key, cell);
			}
			cell.push(zombie);
		}
	}

	updateZombie (zombie: ZombieState, dt: number) {
		const entity = zombie.entity;

		if (!zombie.alive) {
			zombie.respawnTimer -= dt;
			if (zombie.respawnTimer <= 0) {
				if (zombie.ragdoll) {
					zombie.ragdoll.destroy();
					zombie.ragdoll = undefined;
				}
				// Back on its feet: walking again, driven by animation
				zombie.action = undefined;
				zombie.actionTime = 0;
				this.playAction(zombie, "walk", zombie.speed / zombie.rig.kind.walkSpeed);
				zombie.alive = true;
				zombie.health = ZOMBIE_HEALTH;
				zombie.hitFlash = 0;
				zombie.knockbackX = zombie.knockbackZ = 0;
				this.applyZombieMaterial(zombie);
				this.placeZombieAwayFromPlayers(zombie);
				entity.show();
			}
			return;
		}

		if (zombie.hitFlash > 0) {
			zombie.hitFlash -= dt;
			if (zombie.hitFlash <= 0) this.applyZombieMaterial(zombie);
		}
		zombie.attackCooldown = Math.max(0, zombie.attackCooldown - dt);

		// Shamble toward the nearest living player
		const zx = entity._translate.x, zz = entity._translate.z;
		let target: PlayerState | undefined;
		let bestDistSq = Infinity;
		for (const player of this.players) {
			if (player.health <= 0) continue;
			const dx = player.entity._translate.x - zx, dz = player.entity._translate.z - zz;
			const d = dx * dx + dz * dz;
			if (d < bestDistSq) {
				bestDistSq = d;
				target = player;
			}
		}

		let vx = 0, vz = 0;
		if (target) {
			const dx = target.entity._translate.x - zx, dz = target.entity._translate.z - zz;
			const dist = Math.sqrt(bestDistSq);

			if (dist > ZOMBIE_ATTACK_RANGE * 0.8) {
				vx = (dx / dist) * zombie.speed;
				vz = (dz / dist) * zombie.speed;
			}

			if (dist < ZOMBIE_ATTACK_RANGE && zombie.attackCooldown <= 0) {
				zombie.attackCooldown = ZOMBIE_ATTACK_COOLDOWN;
				this.playAction(zombie, "attack");
				this.damagePlayer(target, ZOMBIE_DAMAGE);
			}

			if (dist > 1) {
				entity.rotateTo(0, Math.atan2(dx, dz), 0);
			}
		}

		// Zombies shuffle on even while they claw (between one-off attack and hit clips)
		this.playLocomotion(zombie, zombie.speed, dt);

		// With physics the capsules push each other apart and stop at walls
		if (zombie.body) {
			vx += zombie.knockbackX;
			vz += zombie.knockbackZ;
			const decay = Math.max(0, 1 - dt * 8);
			zombie.knockbackX *= decay;
			zombie.knockbackZ *= decay;
			zombie.body.setVelocityXZ(vx, vz);
			return;
		}

		// Separation from nearby zombies so the horde spreads out
		const cx = Math.floor(zx / GRID_CELL), cz = Math.floor(zz / GRID_CELL);
		const minDist = ZOMBIE_RADIUS * 2;
		for (let gx = cx - 1; gx <= cx + 1; gx++) {
			for (let gz = cz - 1; gz <= cz + 1; gz++) {
				const cell = this.grid.get(gridKeyFromCell(gx, gz));
				if (!cell) continue;
				for (const other of cell) {
					if (other === zombie) continue;
					const dx = zx - other.entity._translate.x, dz = zz - other.entity._translate.z;
					const d2 = dx * dx + dz * dz;
					if (d2 > 0.01 && d2 < minDist * minDist) {
						const d = Math.sqrt(d2);
						const push = ((minDist - d) / minDist) * 160;
						vx += (dx / d) * push;
						vz += (dz / d) * push;
					}
				}
			}
		}

		// Knockback decays quickly
		vx += zombie.knockbackX;
		vz += zombie.knockbackZ;
		const decay = Math.max(0, 1 - dt * 8);
		zombie.knockbackX *= decay;
		zombie.knockbackZ *= decay;

		const pos = resolveLevelCollision(zx + vx * dt, zz + vz * dt, ZOMBIE_RADIUS, this.obstacles);
		entity.translateTo(pos.x, 0, pos.z);
	}

	damagePlayer (player: PlayerState, damage: number) {
		if (player.health <= 0 || player.invulnerable > 0) return;
		player.health = Math.max(0, player.health - damage);
		player.hitFlash = HIT_FLASH_TIME;
		this.applyPlayerMaterial(player);

		const t = player.entity._translate;
		this.bloodFx?.burst(10, { x: t.x, y: heightOf(player.rig) * 0.7, z: t.z });

		if (player.health <= 0) {
			player.respawnTimer = PLAYER_RESPAWN_TIME;
			player.entity.hide();
			player.character?.enabled(false);
			player.lantern.intensity(0);
			this.bloodFx?.burst(80, { x: t.x, y: heightOf(player.rig) * 0.55, z: t.z }, { x: 0, y: 1, z: 0 });
			this.bloodStains?.add(t.x, t.z, { size: 110 });
		}
	}

	/** Player colour on stand-ins (generated survivors keep their own), and a red hit flash via the emissive override. */
	applyPlayerMaterial (player: PlayerState) {
		const c = PLAYER_CONFIGS[player.index].color;
		const color = player.rig.kind.playerTint ? { color: { r: c.r, g: c.g, b: c.b, a: 1 } } : {};
		const flash = player.hitFlash > 0 ? { emissiveColor: { r: 1, g: 0.1, b: 0.1 }, emissiveIntensity: 0.9 } : undefined;
		player.model.material(flash || player.rig.kind.playerTint ? { ...color, ...flash } : null);
	}

	/** The kind's tint (stand-ins), darker when dead, or a red hit flash. */
	applyZombieMaterial (zombie: ZombieState, dead = false) {
		const tint = zombie.rig.kind.tint;
		const shade = dead ? DEAD_SHADE : 1;
		const color = tint ? { r: tint.r * shade, g: tint.g * shade, b: tint.b * shade, a: 1 } : dead ? { r: shade, g: shade, b: shade, a: 1 } : undefined;
		const flash = zombie.hitFlash > 0 ? { emissiveColor: { r: 1, g: 0.15, b: 0.1 }, emissiveIntensity: 1.2 } : undefined;
		zombie.model.material(color || flash ? { ...(color ? { color } : {}), ...flash } : null);
	}

	// ------------------------------------------------------------------
	// HUD over the 3D views: name tags, health bars and damage numbers.
	// IgeViewportOverlay clips each view's markers to that view.
	// ------------------------------------------------------------------

	createOverlay () {
		if (!this.renderer) return;
		const overlay = (this.overlay = new IgeViewportOverlay(this.renderer));

		// A name tag over every player, in every view
		for (const player of this.players) {
			const config = PLAYER_CONFIGS[player.index];
			const c = config.color;
			overlay.add({
				entity: player.entity,
				offset: { x: 0, y: heightOf(player.rig) + 45, z: 0 },
				create: () => {
					const tag = document.createElement("div");
					tag.textContent = `P${player.index + 1}`;
					tag.style.cssText = `font:bold 11px monospace;padding:1px 4px;border-radius:3px;color:#fff;` +
						`background:rgba(${Math.round(c.r * 200)},${Math.round(c.g * 200)},${Math.round(c.b * 200)},0.75);`;
					return tag;
				}
			});
		}
	}

	/** A health bar over a hurt zombie, in every view. */
	addHealthBar (zombie: ZombieState): IgeOverlayMarker | undefined {
		return this.overlay?.add({
			entity: zombie.entity,
			offset: { x: 0, y: heightOf(zombie.rig) + 20, z: 0 },
			create: () => {
				const bar = document.createElement("div");
				bar.style.cssText = "width:30px;height:4px;background:rgba(0,0,0,0.65);border:1px solid rgba(0,0,0,0.8);";
				const fill = document.createElement("div");
				fill.style.cssText = "height:100%;background:#d23b2b;";
				bar.appendChild(fill);
				return bar;
			},
			update: (bar) => {
				const width = `${Math.round((Math.max(0, zombie.health) / ZOMBIE_HEALTH) * 100)}%`;
				const fill = bar.firstChild as HTMLElement;
				if (fill.style.width !== width) fill.style.width = width;
			}
		});
	}

	spawnDamageNumber (viewportIndex: number, x: number, y: number, z: number, damage: number) {
		const viewport = this.viewports[viewportIndex];
		if (!this.overlay || !viewport) return;
		const el = document.createElement("div");
		el.textContent = String(damage);
		el.style.cssText = "font:bold 20px monospace;color:#ffd84d;text-shadow:0 0 3px #000,0 0 6px #000;";

		// Only shown in the view of the player who dealt the damage
		const position = { x: x + (Math.random() - 0.5) * 30, y, z };
		const marker = this.overlay.add({ position, viewports: [viewport], create: () => el });
		this.damageNumbers.push({ el, marker, position, age: 0 });
	}

	updateDamageNumbers (dt: number) {
		for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
			const n = this.damageNumbers[i];
			n.age += dt;
			n.position.y += 90 * dt; // the overlay reads the moved position

			if (n.age > 0.9) {
				n.marker.remove();
				this.damageNumbers.splice(i, 1);
				continue;
			}
			n.el.style.opacity = String(1 - n.age / 0.9);
		}
	}

	// ------------------------------------------------------------------
	// Viewports and cameras
	// ------------------------------------------------------------------

	/**
	 * Create 4 viewports arranged in a 2x2 grid.
	 * All viewports share the same scene but each has its own camera.
	 *
	 * WebGL viewport coordinates use (0,0) at bottom-left, so:
	 * - P1 (top-left):     x=0,       y=halfH
	 * - P2 (top-right):    x=halfW,   y=halfH
	 * - P3 (bottom-left):  x=0,       y=0
	 * - P4 (bottom-right): x=halfW,   y=0
	 */
	setupSplitScreenViewports () {
		if (!this.scene) return;

		for (let i = 0; i < 4; i++) {
			const viewport = new IgeViewport();
			viewport.id(`viewport_${i}`);
			viewport.autoSize(false);
			viewport.scene(this.scene);

			const camera = viewport.camera;
			camera.projectionType("orthographic");
			camera.orthoSize(CAMERA_ORTHO_SIZE);
			camera.near(-1500);
			camera.far(3000);

			viewport.mount(ige.engine);
			this.viewports.push(viewport);
		}

		this.updateViewportLayout();
	}

	updateViewportLayout () {
		const halfW = Math.floor(ige.engine._bounds2d.x / 2);
		const halfH = Math.floor(ige.engine._bounds2d.y / 2);
		const positions = [
			{ x: 0, y: halfH },
			{ x: halfW, y: halfH },
			{ x: 0, y: 0 },
			{ x: halfW, y: 0 }
		];

		for (let i = 0; i < this.viewports.length; i++) {
			const vp = this.viewports[i];
			vp._bounds2d.x = halfW;
			vp._bounds2d.y = halfH;
			vp._translate.x = positions[i].x;
			vp._translate.y = positions[i].y;
		}
	}

	/** Pre-compute the isometric camera offset from a player. */
	computeCameraOffset () {
		const isoAngle = Math.atan(1 / Math.sqrt(2)); // ~35.264 degrees
		const angle45 = Math.PI / 4;
		const horizontalDist = CAMERA_DISTANCE * Math.cos(isoAngle);

		this.cameraOffset = {
			x: horizontalDist * Math.sin(angle45),
			y: CAMERA_DISTANCE * Math.sin(isoAngle),
			z: horizontalDist * Math.cos(angle45)
		};
	}

	/** Position each viewport's camera at its player's isometric offset. */
	updateCameraPositions () {
		const { x: ox, y: oy, z: oz } = this.cameraOffset;

		for (let i = 0; i < this.viewports.length; i++) {
			const player = this.players[i];
			const viewport = this.viewports[i];
			if (!player || !viewport) continue;

			const camera = viewport.camera;
			const p = player.entity._translate;
			camera._translate.x = p.x + ox;
			camera._translate.y = oy;
			camera._translate.z = p.z + oz;

			if (!camera._lookAt) {
				camera._lookAt = new IgePoint3d(p.x, 0, p.z);
			} else {
				camera._lookAt.x = p.x;
				camera._lookAt.y = 0;
				camera._lookAt.z = p.z;
			}
		}
	}

	// ------------------------------------------------------------------
	// Input and UI
	// ------------------------------------------------------------------

	setupInput () {
		window.addEventListener("keydown", (e) => {
			if (!this.keysDown[e.code]) this.keysPressed[e.code] = true;
			this.keysDown[e.code] = true;
			if (e.code === "Space" || e.code.startsWith("Arrow")) e.preventDefault();
		});

		window.addEventListener("keyup", (e) => {
			this.keysDown[e.code] = false;
		});
	}

	updatePlayerHud () {
		for (const player of this.players) {
			const el = document.getElementById(`label-p${player.index + 1}`);
			if (!el) continue;
			const config = PLAYER_CONFIGS[player.index];
			const text = player.health > 0
				? `P${player.index + 1} ${config.name} | HP ${player.health} | Kills ${player.kills}`
				: `P${player.index + 1} ${config.name} | DOWN - respawning`;
			if (el.textContent !== text) el.textContent = text;
		}
	}

	updateStatus (status: string) {
		const el = document.getElementById("status");
		if (el) el.textContent = status;
	}

	updatePlayerCount (count: number) {
		const el = document.getElementById("playerCount");
		if (el) el.textContent = count.toString();
	}

	updateStats () {
		const fpsEl = document.getElementById("fps");
		if (fpsEl) fpsEl.textContent = Math.round(ige.engine._fps).toString();

		const zombiesEl = document.getElementById("zombieCount");
		if (zombiesEl) zombiesEl.textContent = `${this.zombies.filter((z) => z.alive).length} (${this.totalKills} killed)`;

		const drawEl = document.getElementById("drawCalls");
		const stats = this.renderer?.stats();
		if (drawEl && stats) drawEl.textContent = `${stats.drawCalls + stats.instancedDrawCalls} (${stats.instances} instanced)`;

		const trianglesEl = document.getElementById("triangles");
		if (trianglesEl && stats) trianglesEl.textContent = `${(stats.triangles / 1000).toFixed(0)}k (${stats.lodItems} LOD)`;

		const physicsEl = document.getElementById("physics");
		if (physicsEl) {
			const p = this.physics?.stats();
			physicsEl.textContent = p
				? `${p.stepMs.toFixed(2)} ms, ${p.activeBodies}/${p.bodies} bodies awake, ${p.ragdolls} ragdolls${p.threaded ? ", threaded" : ""}`
				: "off (?physics=1)";
		}
	}

	hideLoadingScreen () {
		document.querySelectorAll(".igeLoading").forEach((el) => {
			(el as HTMLElement).style.display = "none";
		});
	}
}

const GRID_CELL = 120;

function gridKeyFromCell (cx: number, cz: number): number {
	return (cx + 1000) * 4096 + (cz + 1000);
}

function gridKey (x: number, z: number): number {
	return gridKeyFromCell(Math.floor(x / GRID_CELL), Math.floor(z / GRID_CELL));
}

function lerp (a: number, b: number, t: number): number {
	return a + (b - a) * t;
}
