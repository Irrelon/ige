import { IgeBaseClass } from "@/engine/core/IgeBaseClass";
import { IgeEntity } from "@/engine/core/IgeEntity";
import { IgeScene2d } from "@/engine/core/IgeScene2d";
import { IgeViewport } from "@/engine/core/IgeViewport";
import { IgeWebGlRenderer } from "@/engine/core/IgeWebGlRenderer";
import { ige } from "@/engine/instance";
import { IgeAmbientLight, IgeDirectionalLight } from "@/engine/webgl/IgeWebGlLight";
import { IgeBehaviourType } from "@/enums";
import type { IgeCanInit } from "@/types/IgeCanInit";
import type { FogMode } from "./fog";
import { HexLayout } from "./hex";
import { Minimap } from "./minimap";
import { IgeRoomClient, type IgeRoomCommandEvent } from "@/engine/network/rooms/IgeRoomClient";
import type { IgeRoomChatLine } from "@/engine/network/rooms/igeRoomProtocol";
import { connectRoomTransport, serverAvailable } from "./net/netClient";
import type { ChatLine, OnlineCommand, RoomInfo, RoomOptions, TimerInfo } from "./net/protocol";
import { ModelLibrary } from "./view/models";
import { runAiTurn } from "./sim/ai";
import { attackTargets } from "./sim/combat";
import { pathTo, type Reach, reachable } from "./sim/movement";
import { gotoProblem, isReady, planRoute } from "./sim/orders";
import { UNIT_TYPES } from "./sim/rules";
import { defaultOptions, Sim } from "./sim/sim";
import { hashString } from "./noise";
import type { Command, GameOptions, SimEvent } from "./sim/types";
import { StrategyCamera } from "./strategyCamera";
import type { TerrainStyle } from "./surface";
import { esc, setHtml } from "./ui/html";
import { Hud, type HudHost } from "./ui/hud";
import { play } from "./ui/sfx";
import { type SaveData, type SaveKind, type SaveMeta, SaveStore } from "./saves";
import { downloadText } from "./ui/savesScreen";
import { onMusicProgress, playTitleMusic, prepareTitleMusic, startGameMusic, stopTitleMusic } from "./ui/music";
import { MAP_PRESETS, optionsFromUrl, type SetupResult, showSetup } from "./ui/setup";
import { TerrainView } from "./view/terrainView";
import { WorldView } from "./view/worldView";
import { WaterView } from "./view/water";

// @ts-ignore
window.ige = ige;

/**
 * Hex Realms: a hex strategy game (Polytopia pacing, some Civilization
 * depth, a Settlers-style economy) on the IGE WebGL renderer.
 *
 * This controller wires the pieces together:
 * - sim/   the deterministic rules (commands in, events out), run locally
 *          or mirrored from the online server
 * - view/  terrain chunks and everything standing on the map, animated
 *          from simulation events
 * - ui/    the DOM interface, setup screen, tips and sounds
 * - net/   the online client (server/ holds the Node game server)
 *
 * URL options: see ui/setup.ts (optionsFromUrl); ?quick=1 skips the setup
 * screen; ?join=CODE joins an online game; ?chunk=16, ?shadows=0, ?shadowcache=0.
 */

const HEX_SIZE = 50;
const CLEAR_COLOR = { r: 0.055, g: 0.09, b: 0.14 };
const PICK_BOTTOM = -16;
const REPLAY_KEY = "hexRealms.replay";
const NEXT_KEY = "hexRealms.next";

interface LogEntry {
	p: number;
	cmd?: Command;
	option?: { fog?: FogMode; los?: boolean };
}

interface Recording {
	options: GameOptions;
	style: TerrainStyle;
	player: number;
	log: LogEntry[];
}

function sleep (ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function nextFrame (): Promise<void> {
	return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

function storageGet (key: string): string | null {
	try {
		return localStorage.getItem(key);
	} catch {
		return null;
	}
}

function storageSet (key: string, value: string): boolean {
	try {
		localStorage.setItem(key, value);
		return true;
	} catch {
		return false;
	}
}

export class Client extends IgeBaseClass implements IgeCanInit, HudHost {
	classId = "Client";

	renderer!: IgeWebGlRenderer;
	scene!: IgeScene2d;
	viewport!: IgeViewport;
	terrainLayer!: IgeEntity;
	overlayLayer!: IgeEntity;
	unitLayer!: IgeEntity;
	sun!: IgeDirectionalLight;

	sim!: Sim;
	terrain!: TerrainView;
	world!: WorldView;
	hud!: Hud;
	minimap?: Minimap;
	cam = new StrategyCamera();
	layout = new HexLayout(HEX_SIZE);

	player = 0;
	selectedUnit: number | null = null;
	/** The unit selected when you ended your turn: your next turn picks up with it. */
	resumeUnit: number | null = null;
	selectedTile = -1;
	hoverTile = -1;
	reach?: Reach;
	targets: number[] = [];

	busy = false;
	replaying = false;
	/** Surf along the shores and flowing rivers. */
	water?: WaterView;
	/** A small all-AI world turning slowly behind the title screen. */
	showcase = false;
	online = false;
	rooms?: IgeRoomClient<OnlineCommand>;
	/** Saved games (IndexedDB) and the latest list of them (null while reading). */
	saveStore = new SaveStore();
	saves: SaveMeta[] | null = null;
	/** The game's 3D models (shared by every game started in this page). */
	models?: ModelLibrary;
	modelsStarted = false;
	netCode = "";
	/** Online: seats, presence and the turn timer. */
	room?: RoomInfo;
	chat: ChatLine[] = [];
	ready = false;
	reducedMotion = storageGet("hexRealms.motion") === "reduced";
	showStats = storageGet("hexRealms.stats") === "on";

	recording?: Recording;
	keys: Record<string, boolean> = {};
	pointer = { x: 0, y: 0, moved: false, down: false, button: 0, startX: 0, startY: 0, dragging: false, grabX: 0, grabZ: 0 };
	touches = new Map<number, { x: number; y: number }>();
	pinch = { distance: 0, angle: 0, midY: 0 };
	time = 0;
	lastMinimap = 0;
	minimapTerrainDirty = true;
	minimapTerritoryDirty = true;
	renderDirty = true;
	lastCam = { x: NaN, z: NaN, yaw: NaN, distance: NaN, tilt: NaN };
	idleFrame = 0;
	renders = 0;
	rendersPerSecond = 0;
	timings = { generate: 0, mesh: 0 };

	constructor () {
		super();
		void this.init();
	}

	// ------------------------------------------------------------------
	// Start-up
	// ------------------------------------------------------------------

	async init () {
		try {
			this.status("Creating renderer...");
			this.renderer = new IgeWebGlRenderer();
			this.renderer.maxPixelRatio(2);
			ige.engine.renderer(this.renderer);
			await this.renderer.setup();
			this.renderer.createFrontBuffer(true);
			this.renderer.setClearColor(CLEAR_COLOR.r, CLEAR_COLOR.g, CLEAR_COLOR.b, 1);
			this.renderer.backFaceCulling(true);
			await ige.engine.start();

			this.scene = new IgeScene2d();
			this.scene.id("mainScene");
			this.terrainLayer = new IgeEntity().id("terrainLayer").mount(this.scene);
			this.overlayLayer = new IgeEntity().id("overlayLayer").mount(this.scene);
			this.unitLayer = new IgeEntity().id("unitLayer").mount(this.scene);
			this.setupLights();
			this.setupViewport();
			this.hud = new Hud(this);
			this.setupInput();

			this.scene.addBehaviour(IgeBehaviourType.preUpdate, "hexRealms", (_e: IgeEntity, tickDelta: number) => {
				this.tick(Math.min(tickDelta / 1000, 0.1));
			});
			setInterval(() => {
				this.rendersPerSecond = this.renders;
				this.renders = 0;
				this.updateStats();
			}, 1000);

			await this.chooseGame();
		} catch (error) {
			console.error(error);
			this.status(`Error: ${error}`);
		}
	}

	/** Decide what to start: a pending load/replay, a quick start, an online join, or the setup screen. */
	async chooseGame (): Promise<void> {
		const q = new URLSearchParams(window.location.search);
		const next = sessionStorage.getItem(NEXT_KEY);
		sessionStorage.removeItem(NEXT_KEY);

		if (next?.startsWith("load")) return this.startFromSave(next.slice(5) || undefined);
		if (next === "replay" && this.hasReplay()) return this.startReplay();
		if (q.get("join")) return this.startOnline({ action: "join", code: String(q.get("join")).toUpperCase(), name: q.get("name") ?? "Player", style: optionsFromUrl().style });
		if (q.get("quick") === "1") {
			const { options, style } = optionsFromUrl();
			return this.startLocal(options, style);
		}

		await this.setupScreen();
	}

	/** The setup screen, then whatever it chose. */
	async setupScreen (): Promise<void> {
		prepareTitleMusic();
		const live = this.showcase || await this.startShowcase();
		hideLoading();
		const [online] = await Promise.all([serverAvailable(), this.refreshSaves()]);
		// The title theme renders in a worker: show its progress in the menu's footer
		const unwatch = onMusicProgress((p, label) => {
			if (label !== "title") return;
			const el = document.getElementById("musicStatus");
			if (!el) return;
			el.innerHTML = p < 1 ? `&#9835; Tuning the orchestra <i><s style="width:${Math.round(p * 100)}%"></s></i>` : "&#9835; Orchestra ready";
			el.classList.toggle("done", p >= 1);
		});
		const result = await showSetup(this.saves ?? [], online, this.saveStore, { onBegin: () => this.titleMusic(), live });
		unwatch();
		showLoading();
		// The showcase world can't be taken down in place: start the chosen game on a fresh page
		if (live) return this.goTo(result);
		await this.applySetup(result);
	}

	/**
	 * The title screen's backdrop: a small world that four AI civs have
	 * played for a while (cities, roads, farms, armies), fog off, with the
	 * camera slowly circling it. ?backdrop=0 turns it off.
	 */
	async startShowcase (): Promise<boolean> {
		if (new URLSearchParams(window.location.search).get("backdrop") === "0") return false;
		try {
			this.status("Raising the world...");
			await nextFrame();
			const seedText = `title-${Math.floor(Math.random() * 1e6)}`;
			const options = defaultOptions({ width: 30, height: 20, players: 4, humans: [], seed: hashString(seedText), seedText, fog: "off", turnLimit: 999 });
			for (const v of Object.keys(options.victories) as (keyof typeof options.victories)[]) options.victories[v] = false;
			const t0 = performance.now();
			const sim = Sim.create(options);
			const until = performance.now() + 1500;
			for (let i = 0; i < 4 * 18 && performance.now() < until; i++) {
				const p = sim.current;
				runAiTurn(sim, p);
				sim.apply(p, { type: "endTurn" });
			}
			sim.drainEvents();
			const t1 = performance.now();
			this.sim = sim;
			this.player = 0;
			this.terrain = new TerrainView({ sim, layout: this.layout, renderer: this.renderer, viewport: this.viewport, layer: this.terrainLayer, style: "tiles", chunkSize: 16, player: 0 });
			const map = sim.map;
			const worldW = this.layout.colSpacing * map.width, worldH = this.layout.rowSpacing * map.height;
			this.cam.bounds = { minX: 0, maxX: worldW, minZ: 0, maxZ: worldH };
			this.cam.maxDistance = Math.max(4000, Math.max(worldW, worldH * 1.6) * 0.95);
			// Frame the busiest part of the world: the middle of its cities
			const cities = sim.state.cities.filter((c) => c.owner >= 0);
			const cx = cities.length ? cities.reduce((a, c) => a + this.tileX(c.tile), 0) / cities.length : worldW / 2;
			const cz = cities.length ? cities.reduce((a, c) => a + this.tileZ(c.tile), 0) / cities.length : worldH / 2;
			this.cam.jumpTo(cx, cz, 1200);
			// A lower, cinematic angle, with the far side fading into the night
			this.cam.tilt = this.cam.targetTilt = -this.cam.maxTilt;
			this.cam.apply(this.viewport.camera);
			const night = { r: 0.1, g: 0.15, b: 0.22 };
			this.renderer.fog({ mode: "linear", color: night, near: 1500, far: 4200 });
			this.renderer.setClearColor(night.r, night.g, night.b, 1);
			await this.terrain.build(async () => nextFrame());
			this.world = new WorldView(sim, this.layout, this.terrain, this.renderer, this.unitLayer, this.overlayLayer, 0, {
				onDamage: () => undefined,
				invalidate: () => this.invalidate()
			});
			this.models ??= new ModelLibrary();
			this.world.models = this.models;
			this.models.onLoaded = (id) => this.world?.modelLoaded(id);
			this.modelsStarted = true;
			void this.models.start(["village", "town", "city", "warrior", "archer", "swordsman", "rider", "settler", "construction", "boat", "catapult"]);
			this.world.build();
			this.water ??= new WaterView(this.renderer, this.overlayLayer);
			this.water.dirty = true;
			console.info(`[title] world: sim ${(t1 - t0).toFixed(0)} ms (turn ${sim.state.turn}), views ${(performance.now() - t1).toFixed(0)} ms`);
			ige.engine.useManualRender(true);
			this.showcase = true;
			this.updateLighting();
			this.invalidate();
			return true;
		} catch (error) {
			console.warn("No title backdrop", error);
			return false;
		}
	}

	/** Start what the setup screen chose on a fresh page (from the menu, or over the title backdrop). */
	goTo (result: SetupResult): void {
		if (result.action === "cancel") return;
		if (result.action === "load") {
			sessionStorage.setItem(NEXT_KEY, `load:${result.id ?? ""}`);
			window.location.assign(window.location.pathname);
			return;
		}
		if (result.action === "join") {
			window.location.search = `?join=${encodeURIComponent(result.code)}&name=${encodeURIComponent(result.name)}&style=${result.style}`;
			return;
		}
		if (result.action === "host") {
			window.location.search = `?host=1&${urlForOptions(result.options, result.style).slice(1)}&name=${encodeURIComponent(result.name)}`;
			return;
		}
		window.location.search = urlForOptions(result.options, result.style);
	}

	async applySetup (result: SetupResult): Promise<void> {
		if (result.action === "cancel") return this.setupScreen();
		if (result.action === "load") return this.startFromSave(result.id);
		if (result.action === "host" || result.action === "join") return this.startOnline(result);
		return this.startLocal(result.options, result.style);
	}

	/** New game from the menu: the setup screen, then a clean page load into the chosen game. */
	async newGame (): Promise<void> {
		this.hud.closeModal();
		const [online] = await Promise.all([serverAvailable(), this.refreshSaves()]);
		const result = await showSetup(this.saves ?? [], online, this.saveStore, { skipSplash: true, pane: "new", inGame: true });
		this.goTo(result);
	}

	async startLocal (options: GameOptions, style: TerrainStyle): Promise<void> {
		if (new URLSearchParams(window.location.search).get("host") === "1") {
			const q = new URLSearchParams(window.location.search);
			return this.startOnline({ action: "host", options, style, name: q.get("name") ?? "Player", turnSeconds: Number(q.get("timer")) || 0 });
		}
		this.status(`Generating ${options.width} x ${options.height} map...`);
		await nextFrame();
		const t = performance.now();
		const sim = Sim.create(options);
		this.timings.generate = performance.now() - t;
		this.recording = { options: structuredClone(options), style, player: options.humans[0] ?? 0, log: [] };
		await this.startWorld(sim, style, options.humans[0] ?? 0);
		this.saveReplay();
		if (!sim.isHuman(sim.current)) void this.runAiTurns();
	}

	/** Start a saved game: the one with this id, or the newest. Back to the setup screen if it can't be read. */
	async startFromSave (id?: string): Promise<void> {
		this.status("Loading saved game...");
		let save: { meta: SaveMeta; data: SaveData } | null = null;
		let sim: Sim | null = null;
		try {
			if (!id) id = (await this.saveStore.list())[0]?.id;
			save = id ? await this.saveStore.read(id) : null;
			if (save) sim = Sim.load(save.data.sim);
		} catch (error) {
			console.error(error);
		}
		if (!save || !sim) {
			await this.setupScreen();
			this.hud?.toast("That saved game couldn't be read", "bad", 6);
			return;
		}
		await nextFrame();
		this.recording = save.data.recording as Recording;
		await this.startWorld(sim, save.data.style as TerrainStyle, this.recording.player);
		if (Array.isArray(save.data.log)) this.hud.restoreLog(save.data.log as Hud["logEntries"]);
		this.hud.toast(`Loaded "${esc(save.meta.name)}"`, "good");
		this.saveReplay();
		if (!sim.isHuman(sim.current)) void this.runAiTurns();
	}

	/** Build the views for a game and start playing it. */
	async startWorld (sim: Sim, style: TerrainStyle, player: number): Promise<void> {
		this.sim = sim;
		this.player = player;
		sim.onApplied = (p, cmd) => this.recording?.log.push({ p, cmd: structuredClone(cmd) });

		this.terrain = new TerrainView({
			sim, layout: this.layout, renderer: this.renderer, viewport: this.viewport, layer: this.terrainLayer,
			style, chunkSize: Number(new URLSearchParams(window.location.search).get("chunk")) || 16, player
		});
		this.setupCamera();
		const t = performance.now();
		await this.terrain.build(async (done, total) => {
			this.status(`Building terrain: ${done} / ${total} chunks`, done / total);
			await nextFrame();
		});
		this.timings.mesh = performance.now() - t;

		this.world = new WorldView(sim, this.layout, this.terrain, this.renderer, this.unitLayer, this.overlayLayer, player, {
			onDamage: (tile, amount) => this.hud.floatDamage(tile, amount),
			invalidate: () => this.invalidate()
		});
		// 3D models load in the background (units and cities first) and swap in as they arrive
		this.models ??= new ModelLibrary();
		this.world.models = this.models;
		this.models.onLoaded = (id) => this.world?.modelLoaded(id);
		if (!this.modelsStarted) {
			this.modelsStarted = true;
			void this.models.start(["warrior", "archer", "swordsman", "settler", "rider", "catapult", "boat", "village", "town", "city", "construction"]);
		} else {
			for (const id of this.models.models.keys()) this.world.modelLoaded(id);
		}
		this.world.build();
		this.water ??= new WaterView(this.renderer, this.overlayLayer);
		this.water.dirty = true;

		this.minimap = new Minimap(document.getElementById("minimap") as HTMLCanvasElement, sim.map, this.layout, 260, 190);
		this.minimapTerrainDirty = this.minimapTerritoryDirty = true;

		ige.engine.useManualRender(true);
		this.ready = true;
		for (const id of ["topbar", "infoPanel", "minimapPanel", "turnPanel"]) document.getElementById(id)?.classList.remove("hidden");
		const mini = document.getElementById("minimapPanel");
		if (mini) document.documentElement.style.setProperty("--mini-h", `${mini.offsetHeight}px`);
		if (!this.replaying) startGameMusic();
		else stopTitleMusic();
		hideLoading();
		sim.drainEvents();
		this.hud.refresh();
		this.updateLighting();
		if (sim.current === player) this.nextUnit();
	}

	setupLights () {
		const lightManager = this.renderer.lightManager;
		if (!lightManager) return;
		const ambient = new IgeAmbientLight();
		ambient.id("ambient");
		// Hemisphere light: cool sky from above, warm bounce from the ground below
		ambient.lightColor(0.8, 0.87, 1.0);
		ambient.groundColor(0.52, 0.45, 0.36);
		ambient.intensity(0.58);
		ambient.mount(this.scene);
		lightManager.addLight(ambient);
		this.sun = new IgeDirectionalLight();
		this.sun.id("sun");
		this.sun.lightColor(1.0, 0.95, 0.85);
		this.sun.intensity(0.62);
		this.sun.direction(-0.55, -1.0, -0.4);
		this.sun.mount(this.scene);
		lightManager.addLight(this.sun);
		this.applyGraphics();
		if (new URLSearchParams(window.location.search).get("shadows") !== "0") {
			this.renderer.shadowManager?.shadowPlanes(1, 9000);
			// The bias is a fraction of the light's depth range (here 9000, so the whole map fits
			// when zoomed out): the default 0.005 is 45 units, which lifted every shadow off its
			// caster by about a unit's height. 0.0003 is under 3 units, still above the shadow
			// map's texel size (0.2-1.6 units), so surfaces don't shadow themselves.
			this.sun.shadowBias(0.0003);
			this.renderer.enableShadows(this.sun, 4096);
			// Terrain, cities and buildings never move: draw them into the shadow map once,
			// and only redraw units on top each frame (?shadowcache=0 turns it off)
			if (new URLSearchParams(window.location.search).get("shadowcache") !== "0") this.renderer.shadowCaching(true);
		}
	}

	/** Post-processing: a gentle filmic grade, soft bloom and a vignette (?post=0 turns it off). */
	applyGraphics (): void {
		const off = new URLSearchParams(window.location.search).get("post") === "0";
		// The lighting is already display-ready, so no tone mapping: just a grade, a glow on the brightest whites and a vignette
		this.renderer.postProcess({
			enabled: !off,
			toneMapping: "none",
			exposure: 1,
			contrast: 1.08,
			saturation: 1.12,
			temperature: 0.06,
			vignette: 0.32,
			vignetteSoftness: 0.6,
			bloom: 0.22,
			bloomThreshold: 0.97,
			bloomKnee: 0.15,
			bloomRadius: 1.2
		});
	}

	setupViewport () {
		this.viewport = new IgeViewport();
		this.viewport.id("mainViewport");
		this.viewport.autoSize(true);
		this.viewport.scene(this.scene);
		this.viewport.camera.projectionType("perspective");
		this.viewport.camera.fov(40);
		this.viewport.mount(ige.engine);
	}

	setupCamera () {
		const map = this.sim.map;
		const worldW = this.layout.colSpacing * map.width;
		const worldH = this.layout.rowSpacing * map.height;
		this.cam.bounds = { minX: 0, maxX: worldW, minZ: 0, maxZ: worldH };
		this.cam.maxDistance = Math.max(4000, Math.max(worldW, worldH * 1.6) * 0.95);
		const home = this.sim.citiesOf(this.player)[0];
		if (home) this.cam.jumpTo(this.tileX(home.tile), this.tileZ(home.tile), 1200);
		else this.cam.jumpTo(worldW / 2, worldH / 2, 3000);
		this.cam.apply(this.viewport.camera);
	}

	// ------------------------------------------------------------------
	// Online
	// ------------------------------------------------------------------

	async startOnline (setup: Extract<SetupResult, { action: "host" | "join" }>): Promise<void> {
		this.status("Connecting to the game server...");
		let transport;
		try {
			transport = await connectRoomTransport();
		} catch (error) {
			this.status(String(error instanceof Error ? error.message : error));
			return;
		}
		// The engine's game rooms: seats, presence, chat and the ordered command stream
		const rooms = new IgeRoomClient<OnlineCommand>(transport);
		this.rooms = rooms;
		this.online = true;
		const style = setup.style;
		let started = false;
		const pending: IgeRoomCommandEvent<OnlineCommand>[] = [];
		const line = (l: IgeRoomChatLine): ChatLine => ({ from: l.seat, name: l.name, text: l.text, time: l.time });

		rooms.on("command", (e: IgeRoomCommandEvent<OnlineCommand>) => {
			if (started) this.onRoomCommand(e);
			else pending.push(e);
		});
		// Fell out of step (a missed command): start again from the server's state
		rooms.on("snapshot", () => window.location.reload());
		rooms.on("seats", () => this.refreshRoom());
		rooms.on("info", () => this.refreshRoom());
		rooms.on("chat", (l: IgeRoomChatLine) => {
			const entry = line(l);
			this.chat.push(entry);
			if (this.chat.length > 100) this.chat.shift();
			this.hud?.chatLine(entry);
		});
		rooms.on("error", (message: string) => {
			if (!started) return;
			this.hud.toast(esc(message), "bad");
			play("error");
		});
		rooms.on("left", () => this.hud?.toast("You left the game: the AI plays your civ now.", "info", 8));
		rooms.on("disconnected", () => this.hud?.toast("Disconnected from the game server", "bad", 10));

		let welcome;
		try {
			if (setup.action === "host") {
				setup.options.humans = [0];
				const options: RoomOptions = { game: setup.options, turnSeconds: setup.turnSeconds };
				welcome = await rooms.create(setup.name, options);
			} else {
				welcome = await rooms.join(setup.code, setup.name);
			}
		} catch (error) {
			this.status(String(error instanceof Error ? error.message : error));
			return;
		}
		this.netCode = welcome.code;
		this.chat = welcome.chat.map(line);
		const url = new URL(window.location.href);
		url.search = `?join=${welcome.code}&name=${encodeURIComponent(setup.name)}&style=${style}`;
		window.history.replaceState(null, "", url.toString());
		const sim = Sim.load(welcome.snapshot as string);
		this.recording = undefined;
		await this.startWorld(sim, style, welcome.seat);
		started = true;
		this.refreshRoom();
		this.hud.toast(`Online game <b>${welcome.code}</b>: you are ${sim.player(welcome.seat).name}. Share the invite link from the menu.`, "good", 8);
		for (const e of pending.splice(0)) this.onRoomCommand(e);
	}

	/** Apply a command from the room's ordered stream to our copy of the game. */
	onRoomCommand ({ seat, command }: IgeRoomCommandEvent<OnlineCommand>): void {
		if (command.type === "timer") return; // a room setting, not a game command
		const result = this.sim.apply(seat, command);
		if (!result.ok) console.warn("Server command failed locally", seat, command, result.error);
		this.ingest(this.sim.drainEvents());
		if (command.type === "endTurn" && this.sim.current === this.player) {
			play("turn");
			this.startTurn();
		}
	}

	/** Seats, presence and timers, as the HUD shows them. */
	refreshRoom (): void {
		const rooms = this.rooms;
		if (!rooms) return;
		const info = (rooms.info ?? {}) as Partial<TimerInfo>;
		this.room = {
			names: rooms.seats.map((s) => (s.taken ? s.name : "")),
			online: rooms.seats.map((s) => s.connected),
			host: rooms.seats.find((s) => s.host)?.seat ?? 0,
			turnSeconds: info.turnSeconds ?? 0,
			seatSeconds: rooms.seats.map((s) => info.seatSeconds?.[s.seat] ?? null),
			deadline: info.deadline ?? 0
		};
		this.hud?.refresh();
	}

	sendChat (text: string): void {
		if (this.online && text.trim()) this.rooms?.say(text);
	}

	/** The game's default turn timer, or (with a civ) that civ's own; -1 clears a civ's own. */
	setTurnTimer (seconds: number, player?: number): void {
		if (this.online) this.rooms?.send({ type: "timer", seconds, ...(player === undefined ? {} : { player }) });
	}

	/** Leave an online game for good: the AI plays our civ from now on. */
	leaveGame (): void {
		if (!this.online) return;
		this.rooms?.leave();
	}

	/** The person playing a civ online ("" for AI civs or offline). */
	playerName (p: number): string {
		return this.online ? this.room?.names[p] ?? "" : "";
	}

	inviteLink (): string | null {
		if (!this.online || !this.netCode) return null;
		const url = new URL(window.location.href);
		url.search = `?join=${this.netCode}`;
		return url.toString();
	}

	// ------------------------------------------------------------------
	// Commands and turns
	// ------------------------------------------------------------------

	get myTurn (): boolean {
		return this.ready && this.sim.current === this.player && !this.sim.state.winner && !this.busy && !this.replaying;
	}

	/** Issue a command as the local player. Online, it goes to the server and is applied when echoed. */
	command (cmd: Command): boolean {
		if (!this.ready || this.replaying) return false;
		if (this.online) {
			this.rooms?.send(cmd);
			return true;
		}
		const result = this.sim.apply(this.player, cmd);
		if (!result.ok) {
			this.hud.toast(result.error ?? "Can't do that", "bad", 3);
			play("error");
			return false;
		}
		this.ingest(this.sim.drainEvents());
		if (cmd.type === "move") play("move");
		if (cmd.type === "build" || cmd.type === "road") play("build");
		return true;
	}

	/** Hand simulation events to the views and HUD. */
	ingest (events: SimEvent[]): void {
		if (!events.length) return;
		this.world.ingest(events);
		this.hud.notify(events);
		for (const e of events) {
			if (e.type === "fog" && e.player === this.player) {
				this.minimapTerrainDirty = this.minimapTerritoryDirty = true;
				if (this.water) this.water.dirty = true;
			}
			if (e.type === "territory" || e.type === "cityCaptured" || e.type === "eliminated") this.minimapTerritoryDirty = true;
			if (e.type === "featureCleared") this.minimapTerrainDirty = true;
			if (e.type === "unitRemoved" && e.unit === this.selectedUnit) this.selectedUnit = null;
			if (e.type === "gameOver") this.saveReplay();
		}
		this.refreshSelection();
		this.hud.refresh();
		this.invalidate();
	}

	endTurn (): void {
		if (!this.myTurn) return;
		this.resumeUnit = this.selectedUnit;
		this.deselect();
		this.command({ type: "endTurn" });
		if (this.online) return;
		this.saveReplay();
		void this.runAiTurns();
	}

	/** Play the AI civs' turns one after another, letting their visible moves animate. */
	async runAiTurns (): Promise<void> {
		const sim = this.sim;
		this.busy = true;
		this.hud.refresh();
		while (!sim.state.winner && !sim.isHuman(sim.current)) {
			const p = sim.current;
			runAiTurn(sim, p);
			this.ingest(sim.drainEvents());
			await this.waitForAnimations(1600);
			sim.apply(p, { type: "endTurn" });
			this.ingest(sim.drainEvents());
			await nextFrame();
		}
		this.busy = false;
		this.saveReplay();
		this.hud.refresh();
		if (sim.current === this.player) this.startTurn();
	}

	/**
	 * Let the AI play your seat for a number of rounds (handy for testing and
	 * for watching a game unfold). From the console: ige.client.autoplay(20).
	 * Online, the AI plans the turn on a private copy of the game and the
	 * commands go to the server like any others; other seats are left to
	 * their own players.
	 */
	async autoplay (rounds = 10, fast = false): Promise<void> {
		const sim = this.sim;
		const end = sim.state.turn + rounds;
		while (sim.state.turn < end && !sim.state.winner && !this.replaying) {
			if (!this.myTurn) {
				await sleep(20); // (timers, not frames: hidden tabs don't get frames)
				continue;
			}
			const turn = sim.state.turn;
			if (this.online) {
				const plan = Sim.load(sim.serialize());
				const commands: Command[] = [];
				plan.onApplied = (_player, command) => commands.push(command);
				runAiTurn(plan, this.player);
				for (const command of commands) this.command(command);
				this.command({ type: "endTurn" });
				while (sim.current === this.player && sim.state.turn === turn && !sim.state.winner && this.online) await sleep(20);
				continue;
			}
			runAiTurn(sim, this.player);
			this.ingest(sim.drainEvents());
			if (!fast) await this.waitForAnimations(1600);
			this.endTurn();
			await nextFrame();
		}
	}

	async waitForAnimations (maxMs: number): Promise<void> {
		if (this.reducedMotion) return;
		const start = performance.now();
		await nextFrame();
		while (this.world.animating && performance.now() - start < maxMs) await nextFrame();
	}

	// ------------------------------------------------------------------
	// Selection
	// ------------------------------------------------------------------

	selectUnit (id: number | null): void {
		this.selectedUnit = id;
		this.selectedTile = -1;
		this.world.setSelected(id);
		if (id !== null) play("select");
		this.refreshSelection();
		this.hud.refresh();
		this.invalidate();
	}

	selectTile (tile: number): void {
		this.selectedUnit = null;
		this.selectedTile = tile;
		this.world.setSelected(null);
		this.refreshSelection();
		this.hud.refresh();
		this.invalidate();
	}

	deselect (): void {
		this.selectedUnit = null;
		this.selectedTile = -1;
		this.world.setSelected(null);
		this.refreshSelection();
		this.hud.refresh();
	}

	/** Movement range and attack targets of the selected unit. */
	refreshSelection (): void {
		if (!this.world) return;
		const unit = this.selectedUnit !== null ? this.sim.unit(this.selectedUnit) : undefined;
		if (!unit) this.selectedUnit = null;
		const mine = !!unit && unit.owner === this.player && this.myTurn;
		this.reach = mine && unit!.moves > 0 && !unit!.attacked ? reachable(this.sim, unit!) : undefined;
		this.targets = mine ? attackTargets(this.sim, unit!) : [];
		this.world.showReach(this.reach?.tiles ?? [], this.pathPreview());
		this.world.showTargets(this.targets);
		this.world.setSelectedTile(unit ? unit.tile : this.selectedTile);
		this.showRoute();
	}

	/**
	 * Multi-turn routes: the selected unit's go-to order, or, when the
	 * pointer is over a far tile it could walk to, the route a click would
	 * give it.
	 */
	showRoute (): void {
		const unit = this.selectedUnit !== null ? this.sim.unit(this.selectedUnit) : undefined;
		if (!unit || unit.owner !== this.player) {
			this.world.showRoute([]);
			return;
		}
		const hover = this.hoverTile;
		const far = hover >= 0 && hover !== unit.tile && !this.reach?.tiles.includes(hover) && !this.targets.includes(hover) && this.myTurn;
		const target = far && this.sim.knows(this.player, hover) ? hover : unit.goto;
		if (target === undefined) {
			this.world.showRoute([]);
			return;
		}
		const route = planRoute(this.sim, unit, target);
		// The part it can walk this turn
		let firstTurn = 0;
		while (firstTurn < route.length && this.reach?.tiles.includes(route[firstTurn])) firstTurn++;
		this.world.showRoute(route, firstTurn);
	}

	pathPreview (): number[] {
		const unit = this.selectedUnit !== null ? this.sim.unit(this.selectedUnit) : undefined;
		if (!unit || !this.reach || !this.reach.tiles.includes(this.hoverTile)) return [];
		return pathTo(unit, this.reach, this.hoverTile);
	}

	clickTile (tile: number): void {
		if (tile < 0 || !this.ready) return;
		const unit = this.selectedUnit !== null ? this.sim.unit(this.selectedUnit) : undefined;
		if (unit && unit.owner === this.player && this.myTurn) {
			if (this.targets.includes(tile)) {
				this.command({ type: "attack", unit: unit.id, target: tile });
				return;
			}
			if (this.reach?.tiles.includes(tile)) {
				this.command({ type: "move", unit: unit.id, to: tile });
				return;
			}
			// A far tile it could walk to over several turns: march there
			const occupied = this.sim.unitOn(tile);
			if (!occupied && tile !== unit.tile && gotoProblem(this.sim, this.player, unit.id, tile) === null) {
				if (this.command({ type: "goto", unit: unit.id, to: tile })) {
					this.hud.toast(`${UNIT_TYPES[unit.type].name} is marching there: it walks on at the start of each turn`, "info", 3);
				}
				return;
			}
		}
		const other = this.sim.unitOn(tile);
		const visible = other && (other.owner === this.player || this.terrain.fogView[tile] === 2);
		if (other && visible && other.id !== this.selectedUnit) {
			this.selectUnit(other.id);
			return;
		}
		this.selectTile(tile);
	}

	/**
	 * Your turn begins: carry on with the unit you had selected when you ended
	 * the last one (so the view stays where you left it), or else the first
	 * unit that can act.
	 */
	startTurn (autosave = true): void {
		if (autosave && !this.online && !this.replaying && !this.sim.state.winner) void this.saveGame("auto", `Autosave, turn ${this.sim.state.turn}`);
		const keep = this.resumeUnit !== null ? this.sim.unit(this.resumeUnit) : undefined;
		this.resumeUnit = null;
		if (keep && keep.owner === this.player) {
			this.selectUnit(keep.id);
			this.centreOn(keep.tile);
			return;
		}
		this.nextUnit();
	}

	/** Select the next own unit that can still act, and glide to it. */
	nextUnit (): void {
		if (!this.ready) return;
		const ready = this.sim.unitsOf(this.player).filter(isReady);
		if (!ready.length) {
			this.deselect();
			return;
		}
		const index = ready.findIndex((u) => u.id === this.selectedUnit);
		const next = ready[(index + 1) % ready.length];
		this.selectUnit(next.id);
		this.cam.glideTo(this.tileX(next.tile), this.tileZ(next.tile));
	}

	centreOn (tile: number): void {
		this.cam.glideTo(this.tileX(tile), this.tileZ(tile));
	}

	// ------------------------------------------------------------------
	// Options, saving, replays
	// ------------------------------------------------------------------

	toggleStyle (): void {
		const style: TerrainStyle = this.terrain.style === "tiles" ? "natural" : "tiles";
		if (!this.terrain.setStyle(style)) return;
		this.world.reseatAll();
		if (this.water) this.water.dirty = true;
		this.minimapTerrainDirty = true;
		const url = new URL(window.location.href);
		url.searchParams.set("style", style);
		window.history.replaceState(null, "", url.toString());
		this.refreshSelection();
		this.invalidate();
	}

	setFogMode (mode: FogMode): void {
		if (this.online) return;
		this.sim.options.fog = mode;
		this.recording?.log.push({ p: -1, option: { fog: mode } });
		this.world.fogChanged(this.terrain.refreshFogView());
		this.minimapTerrainDirty = this.minimapTerritoryDirty = true;
		this.refreshSelection();
		this.invalidate();
	}

	setLineOfSight (on: boolean): void {
		if (this.online) return;
		this.sim.options.lineOfSight = on;
		this.sim.fog.los = on;
		this.recording?.log.push({ p: -1, option: { los: on } });
		this.sim.markAllFog();
		this.sim.updateFog();
		this.ingest(this.sim.drainEvents());
	}

	setReducedMotion (on: boolean): void {
		this.reducedMotion = on;
		storageSet("hexRealms.motion", on ? "reduced" : "full");
	}

	/** Turn the 3D models on or off (primitives otherwise). */
	setModels (on: boolean): void {
		if (!this.models) return;
		this.models.setEnabled(on);
		this.world?.rebuildModels();
		this.invalidate();
	}

	setShowStats (on: boolean): void {
		this.showStats = on;
		storageSet("hexRealms.stats", on ? "on" : "off");
		document.getElementById("stats")?.classList.toggle("hidden", !on);
	}

	/** The title theme (starts when the splash is dismissed). */
	titleMusic (): void {
		try {
			playTitleMusic();
		} catch (error) {
			console.warn("Title music unavailable", error);
		}
	}

	/** Re-read the save list (and redraw the save screen if it is open). */
	async refreshSaves (): Promise<void> {
		try {
			this.saves = await this.saveStore.list();
		} catch (error) {
			console.warn("Couldn't read saved games", error);
			this.saves = [];
		}
		if (this.hud?.modal === "saves") this.hud.renderModal();
	}

	get canSave (): boolean {
		return !this.online && !this.replaying && !!this.recording;
	}

	/**
	 * Write the game as it is now: a new named save, over an existing one
	 * (`id`), the quicksave slot, or the next autosave slot.
	 */
	async saveGame (kind: SaveKind, name: string, id?: string): Promise<boolean> {
		if (!this.canSave || !this.recording || !this.saveStore.available) return false;
		const sim = this.sim, me = sim.player(this.player), o = sim.options;
		const data: SaveData = { id: "", sim: sim.serialize(), style: this.terrain.style, recording: this.recording, log: this.hud.logEntries };
		let size = data.sim.length;
		try {
			size += JSON.stringify(this.recording).length;
		} catch {
			// Only used for the size shown in the list
		}
		try {
			const slot = id ?? (kind === "quick" ? "quick" : kind === "auto" ? await this.saveStore.autosaveId() : `save-${Date.now().toString(36)}`);
			const meta: SaveMeta = {
				id: slot, name: name.trim() || "Saved game", kind, savedAt: Date.now(), turn: sim.state.turn, turnLimit: o.turnLimit,
				civ: me.name, color: me.color, players: sim.playerCount, width: o.width, height: o.height, size,
				thumb: this.minimap?.thumbnail()
			};
			await this.saveStore.write(meta, data);
		} catch (error) {
			console.error(error);
			if (kind !== "auto") this.hud.toast("Couldn't save: the browser's storage is full or blocked", "bad", 6);
			return false;
		}
		void this.refreshSaves();
		return true;
	}

	async quickSave (): Promise<void> {
		if (!this.canSave) {
			this.hud.toast(this.online ? "Online games save on the server automatically" : "Nothing to save right now", "info", 3);
			return;
		}
		if (await this.saveGame("quick", `Quicksave, turn ${this.sim.state.turn}`)) this.hud.toast("Quicksaved", "good", 2);
	}

	/** Reload the page into a saved game (a clean start for the views). */
	loadGame (id: string): void {
		sessionStorage.setItem(NEXT_KEY, `load:${id}`);
		window.location.search = "";
	}

	async deleteSave (id: string): Promise<void> {
		try {
			await this.saveStore.remove(id);
		} catch (error) {
			console.error(error);
			this.hud.toast("Couldn't delete that save", "bad");
		}
		await this.refreshSaves();
	}

	async exportSave (id: string): Promise<void> {
		const file = await this.saveStore.exportFile(id).catch(() => null);
		if (!file) {
			this.hud.toast("Couldn't export that save", "bad");
			return;
		}
		downloadText(file.name, file.text);
	}

	async importSave (file: File): Promise<void> {
		try {
			const meta = await this.saveStore.importFile(await file.text());
			this.hud.toast(`Imported "${esc(meta.name)}"`, "good");
		} catch (error) {
			this.hud.toast(error instanceof Error ? esc(error.message) : "Couldn't import that file", "bad", 5);
		}
		await this.refreshSaves();
	}

	hasReplay (): boolean {
		return !!storageGet(REPLAY_KEY) && !this.online;
	}

	saveReplay (): void {
		if (this.recording && !this.replaying) storageSet(REPLAY_KEY, JSON.stringify(this.recording));
	}

	replay (): void {
		this.saveReplay();
		sessionStorage.setItem(NEXT_KEY, "replay");
		window.location.reload();
	}

	/** Re-run a recorded game from its options and command log. */
	async startReplay (): Promise<void> {
		const rec = JSON.parse(storageGet(REPLAY_KEY) as string) as Recording;
		const sim = Sim.create(rec.options);
		this.replaying = true;
		await this.startWorld(sim, rec.style, rec.player);
		this.hud.toast("Replaying the last game. Start a new game from the menu at any time.", "info", 6);
		for (const entry of rec.log) {
			if (entry.option) {
				if (entry.option.fog) {
					sim.options.fog = entry.option.fog;
					this.world.fogChanged(this.terrain.refreshFogView());
				}
				if (entry.option.los !== undefined) {
					sim.options.lineOfSight = sim.fog.los = entry.option.los;
					sim.markAllFog();
					sim.updateFog();
				}
			} else if (entry.cmd) {
				sim.apply(entry.p, entry.cmd);
			}
			this.ingest(sim.drainEvents());
			if (entry.cmd?.type === "endTurn" || entry.cmd?.type === "attack" || entry.cmd?.type === "move") await this.waitForAnimations(1200);
			else await nextFrame();
		}
		this.replaying = false;
		this.hud.toast("Replay finished", "good");
		this.hud.refresh();
	}

	// ------------------------------------------------------------------
	// Per frame
	// ------------------------------------------------------------------

	tick (dt: number): void {
		this.time += dt;
		if (this.showcase) {
			this.cam.rotate(0.045 * dt);
			this.cam.update(dt, this.viewport.camera);
			this.terrain.update();
			this.world.update(dt, this.time);
			this.updateWater();
			this.updateLighting();
			this.queueRender(true);
			return;
		}
		if (!this.ready) return;
		const camera = this.viewport.camera;

		const k = this.keys;
		const pan = 0.9 * dt;
		let px = 0, py = 0;
		if (k.KeyA || k.ArrowLeft) px -= pan;
		if (k.KeyD || k.ArrowRight) px += pan;
		if (k.KeyW || k.ArrowUp) py += pan;
		if (k.KeyS || k.ArrowDown) py -= pan;
		if (px || py) this.cam.panScreen(px, py);
		if (k.KeyQ) this.cam.rotate(-1.6 * dt);
		if (k.KeyE) this.cam.rotate(1.6 * dt);
		if (k.PageUp) this.cam.pitchBy(-0.5 * dt);
		if (k.PageDown) this.cam.pitchBy(0.5 * dt);
		if (k.KeyZ || k.Equal || k.NumpadAdd) this.cam.zoom(Math.exp(-1.8 * dt));
		if (k.KeyX || k.Minus || k.NumpadSubtract) this.cam.zoom(Math.exp(1.8 * dt));
		this.cam.update(dt, camera);

		this.terrain.update();
		const moving = this.world.update(this.reducedMotion ? 10 : dt, this.time);
		const flowing = this.updateWater();
		this.updateLighting();

		if (this.pointer.moved) {
			this.pointer.moved = false;
			this.updateHover(this.pickTile(this.pointer.x, this.pointer.y));
		}
		if (this.selectedUnit !== null) {
			const v = this.world.units.get(this.selectedUnit);
			if (v) this.world.setSelectedTile(v.tile);
		}

		this.hud.frame(dt);

		if (this.time - this.lastMinimap > 0.15 && this.minimap) {
			this.lastMinimap = this.time;
			if (this.minimapTerrainDirty) {
				this.minimapTerrainDirty = false;
				this.minimap.renderTerrain(this.terrain.fogView, this.terrain.unexploredLook());
			}
			if (this.minimapTerritoryDirty) {
				this.minimapTerritoryDirty = false;
				this.minimap.renderTerritory(this.sim, this.terrain.fogView);
			}
			this.minimap.draw(this.sim, this.player, (id) => this.world.unitPosition(id), this.viewFootprint(), this.terrain.fogView);
		}

		this.queueRender(moving || flowing);
	}

	/** Rebuild the water when the explored map changed; move it on. Returns true when a frame is due. */
	updateWater (): boolean {
		const w = this.water;
		if (!w) return false;
		if (w.dirty) {
			w.rebuild(this.sim.map, this.layout, this.terrain.surface, this.terrain.fogView);
			this.invalidate();
		}
		return !this.reducedMotion && w.update(this.time);
	}

	invalidate (): void {
		this.renderDirty = true;
	}

	/** Draw a frame only when something changed (render on demand). */
	queueRender (moving: boolean): void {
		const cam = this.cam, last = this.lastCam;
		const cameraMoved = Number.isNaN(last.x) || Math.abs(cam.x - last.x) > 0.01 || Math.abs(cam.z - last.z) > 0.01 ||
			Math.abs(cam.yaw - last.yaw) > 1e-5 || Math.abs(cam.distance - last.distance) > 0.01 || Math.abs(cam.tilt - last.tilt) > 1e-5;
		let render = this.renderDirty || cameraMoved || moving || this.terrain.changed;
		if (!render && this.sim.state.units.some((u) => u.type === "settler")) render = ++this.idleFrame % 3 === 0;
		// A selected character breathes: a frame every other tick is plenty
		if (!render && this.world.idleAnimating) render = ++this.idleFrame % 2 === 0;
		if (!render) return;
		ige.engine.manualRender();
		this.renders++;
		this.renderDirty = false;
		this.terrain.changed = false;
		last.x = cam.x;
		last.z = cam.z;
		last.yaw = cam.yaw;
		last.distance = cam.distance;
		last.tilt = cam.tilt;
	}

	updateLighting (): void {
		const d = this.cam.distance;
		this.renderer.shadowManager?.frustumSize(Math.min(3200, Math.max(450, d * 0.8)));
		this.renderer.fog({ mode: "linear", color: CLEAR_COLOR, near: d * 1.6, far: d * 3.6 });
	}

	updateHover (tile: number): void {
		if (tile === this.hoverTile) return;
		this.hoverTile = tile;
		const kind = this.targets.includes(tile) ? "attack" : this.reach?.tiles.includes(tile) ? "move" : "normal";
		this.world.setHover(tile, kind);
		if (this.reach) this.world.showReach(this.reach.tiles, this.pathPreview());
		this.showRoute();
		this.hud.refreshPanel();
		this.invalidate();
	}

	updateStats (): void {
		if (!this.ready) return;
		const s = this.renderer.stats();
		const map = this.sim.map;
		setText("fps", `${Math.round(ige.engine._fps)} (${this.rendersPerSecond} rendered)`);
		setText("mapInfo", `${map.width} x ${map.height} (${map.count.toLocaleString()} tiles)`);
		setText("chunkInfo", `${this.terrain.chunks.length} chunks, ${(this.terrain.triangles / 1e6).toFixed(2)}M tris, ${this.terrain.liteChunks} lite${this.terrain.queue.length ? `, ${this.terrain.queue.length} rebuilding` : ""}`);
		setText("drawCalls", `${s.drawCalls + s.instancedDrawCalls} (${s.instances} instanced, ${s.shadowDrawCalls} shadow${this.renderer.shadowCaching() ? `, cache rebuilt ${s.shadowCacheRebuilds}` : ""})`);
		setText("timings", `gen ${this.timings.generate.toFixed(0)} ms, mesh ${this.timings.mesh.toFixed(0)} ms`);
	}

	// ------------------------------------------------------------------
	// Input
	// ------------------------------------------------------------------

	tileX (tile: number): number {
		return this.layout.centerX(this.sim.map.col(tile), this.sim.map.row(tile));
	}

	tileZ (tile: number): number {
		return this.layout.centerZ(this.sim.map.row(tile));
	}

	tileAt (x: number, z: number): number {
		const o = this.layout.worldToOffset(x, z, { col: 0, row: 0 });
		return this.sim.map.inBounds(o.col, o.row) ? this.sim.map.index(o.col, o.row) : -1;
	}

	pickTile (sx: number, sy: number): number {
		if (!this.ready) return -1;
		const surface = this.terrain.surface;
		const hit = this.renderer.screenToHeightfield(this.viewport, sx, sy, (x, z) => surface.pickHeight(x, z), {
			minHeight: PICK_BOTTOM, maxHeight: surface.pickTop, step: HEX_SIZE * 0.15
		});
		return hit ? this.tileAt(hit.x, hit.z) : -1;
	}

	groundAt (sx: number, sy: number): { x: number; z: number } | null {
		return this.renderer.screenToGround(this.viewport, sx, sy, this.cam.groundY);
	}

	viewFootprint (): { x: number; z: number }[] | null {
		const w = this.viewport._bounds2d.x, h = this.viewport._bounds2d.y;
		const out: { x: number; z: number }[] = [];
		for (const [sx, sy] of [[0, 0], [w, 0], [w, h], [0, h]]) {
			let g = this.renderer.screenToGround(this.viewport, sx, Math.max(sy, h * 0.02), this.cam.groundY);
			if (!g) {
				const ray = this.renderer.screenToWorldRay(this.viewport, sx, sy);
				if (!ray) return null;
				const far = this.cam.distance * 3;
				g = { x: ray.origin.x + ray.direction.x * far, y: 0, z: ray.origin.z + ray.direction.z * far };
			}
			out.push({ x: g.x, z: g.z });
		}
		return out;
	}

	setupInput (): void {
		const canvas = this.renderer.canvasElement() as HTMLCanvasElement;
		const p = this.pointer;
		const local = (e: { clientX: number; clientY: number }) => {
			const rect = canvas.getBoundingClientRect();
			return { x: e.clientX - rect.left, y: e.clientY - rect.top };
		};
		for (const type of ["pointermove", "pointerdown", "pointerup", "wheel", "keydown", "keyup"]) {
			window.addEventListener(type, () => this.invalidate(), { capture: true, passive: true });
		}
		canvas.addEventListener("contextmenu", (e) => e.preventDefault());
		canvas.style.touchAction = "none";

		canvas.addEventListener("pointerdown", (e) => {
			const at = local(e);
			this.touches.set(e.pointerId, at);
			if (this.touches.size === 2) {
				// Two fingers: pinch to zoom, twist to rotate
				const [a, b] = [...this.touches.values()];
				this.pinch.distance = Math.hypot(a.x - b.x, a.y - b.y);
				this.pinch.angle = Math.atan2(b.y - a.y, b.x - a.x);
				this.pinch.midY = (a.y + b.y) / 2;
				p.dragging = true;
				return;
			}
			p.down = true;
			p.dragging = false;
			p.button = e.button;
			p.startX = at.x;
			p.startY = at.y;
			const ground = this.groundAt(at.x, at.y);
			if (ground) {
				p.grabX = ground.x;
				p.grabZ = ground.z;
			}
			canvas.setPointerCapture(e.pointerId);
		});

		canvas.addEventListener("pointermove", (e) => {
			const at = local(e);
			if (this.touches.has(e.pointerId)) this.touches.set(e.pointerId, at);
			if (this.touches.size === 2) {
				const [a, b] = [...this.touches.values()];
				const distance = Math.hypot(a.x - b.x, a.y - b.y);
				const angle = Math.atan2(b.y - a.y, b.x - a.x);
				if (this.pinch.distance > 0 && distance > 0) this.cam.zoom(this.pinch.distance / distance);
				this.cam.rotate(-(angle - this.pinch.angle));
				// Both fingers sliding up or down tilts the view
				const midY = (a.y + b.y) / 2;
				this.cam.pitchBy((midY - this.pinch.midY) * 0.004);
				this.pinch.distance = distance;
				this.pinch.angle = angle;
				this.pinch.midY = midY;
				return;
			}
			const dx = at.x - p.x, dy = at.y - p.y;
			p.x = at.x;
			p.y = at.y;
			p.moved = true;
			if (!p.down) return;
			if (!p.dragging && Math.hypot(at.x - p.startX, at.y - p.startY) > 6) p.dragging = true;
			if (!p.dragging) return;
			if (p.button === 2) {
				// Right-drag: sideways rotates, up and down tilts
				this.cam.rotate(-dx * 0.006);
				this.cam.pitchBy(dy * 0.004);
			} else {
				const ground = this.groundAt(at.x, at.y);
				if (ground) {
					this.cam.shift(p.grabX - ground.x, p.grabZ - ground.z);
					this.cam.apply(this.viewport.camera);
				}
			}
		});

		const release = (e: PointerEvent) => {
			const at = local(e);
			const wasTwo = this.touches.size === 2;
			this.touches.delete(e.pointerId);
			if (wasTwo) {
				p.down = false;
				return;
			}
			if (p.down && !p.dragging) {
				if (p.button === 0) this.clickTile(this.pickTile(at.x, at.y));
				else if (p.button === 2) this.deselect();
			}
			p.down = false;
			p.dragging = false;
			if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
		};
		canvas.addEventListener("pointerup", release);
		canvas.addEventListener("pointercancel", release);
		canvas.addEventListener("pointerleave", () => this.updateHover(-1));
		canvas.addEventListener("wheel", (e) => {
			e.preventDefault();
			const at = local(e);
			const ground = this.groundAt(at.x, at.y);
			this.cam.zoom(Math.exp(e.deltaY * 0.0015), ground?.x, ground?.z);
		}, { passive: false });

		window.addEventListener("keydown", (e) => {
			const tag = (e.target as HTMLElement)?.tagName;
			if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA" || !this.ready) return;
			if ((e.ctrlKey || e.metaKey) && e.code === "KeyS") {
				// Not recorded as held: with Cmd down, macOS never sends the key's keyup
				e.preventDefault();
				void this.quickSave();
				return;
			}
			if (e.ctrlKey || e.metaKey) return;
			this.keys[e.code] = true;
			const modal = (name: string) => (this.hud.modal === name ? this.hud.closeModal() : this.hud.openModal(name));
			switch (e.code) {
				case "Enter": this.endTurn(); break;
				case "Space": this.nextUnit(); e.preventDefault(); break;
				case "Escape": if (this.hud.modal) this.hud.closeModal(); else this.deselect(); break;
				case "KeyC": {
					const u = this.selectedUnit !== null ? this.sim.unit(this.selectedUnit) : undefined;
					const t = u ? u.tile : this.selectedTile >= 0 ? this.selectedTile : this.sim.citiesOf(this.player)[0]?.tile ?? -1;
					if (t >= 0) this.centreOn(t);
					break;
				}
				case "KeyT": this.toggleStyle(); break;
				case "KeyR": modal("tech"); break;
				case "KeyG": modal("diplomacy"); break;
				case "KeyJ": modal("ambitions"); break;
				case "KeyM": modal("wonders"); break;
				case "KeyB": modal("economy"); break;
				case "KeyL": modal("cities"); break;
				case "KeyV": this.hud.toggleLens(); break;
				case "KeyO": modal("menu"); break;
				case "KeyH": modal("help"); break;
				case "KeyN": modal("log"); break;
				case "KeyY": modal("history"); break;
				case "KeyF": {
					const u = this.selectedUnit !== null ? this.sim.unit(this.selectedUnit) : undefined;
					if (u && UNIT_TYPES[u.type].founder) this.command({ type: "found", unit: u.id });
					break;
				}
				case "KeyK":
				case "KeyI":
				case "KeyU": {
					const u = this.selectedUnit !== null ? this.sim.unit(this.selectedUnit) : undefined;
					if (!u || u.owner !== this.player) break;
					const type = e.code === "KeyK" ? (u.order === "sleep" ? "wake" : "sleep") : e.code === "KeyI" ? "fortify" : "upgrade";
					if (this.command({ type, unit: u.id }) && type !== "wake" && type !== "upgrade") this.nextUnit();
					break;
				}
			}
			if (e.code.startsWith("Arrow")) e.preventDefault();
		});
		window.addEventListener("keyup", (e) => {
			this.keys[e.code] = false;
		});
		window.addEventListener("blur", () => {
			this.keys = {};
		});
		window.addEventListener("resize", () => this.invalidate());

		const mini = document.getElementById("minimap") as HTMLCanvasElement;
		let miniDown = false;
		const miniMove = (e: PointerEvent) => {
			if (!this.minimap) return;
			const rect = mini.getBoundingClientRect();
			const w = this.minimap.minimapToWorld(e.clientX - rect.left, e.clientY - rect.top);
			this.cam.glideTo(w.x, w.z);
		};
		mini.addEventListener("pointerdown", (e) => {
			miniDown = true;
			mini.setPointerCapture(e.pointerId);
			miniMove(e);
		});
		mini.addEventListener("pointermove", (e) => {
			if (miniDown) miniMove(e);
		});
		mini.addEventListener("pointerup", (e) => {
			miniDown = false;
			mini.releasePointerCapture(e.pointerId);
		});

		document.getElementById("stats")?.classList.toggle("hidden", !this.showStats);
	}

	status (text: string, progress?: number): void {
		setText("loadingText", text);
		if (progress !== undefined) {
			const bar = document.getElementById("loadingProgressBar");
			if (bar) bar.style.width = `${Math.round(progress * 100)}%`;
		}
	}
}

/** The URL that starts a game with these options (used for "New game"). */
function urlForOptions (o: GameOptions, style: TerrainStyle): string {
	const size = Object.entries(MAP_PRESETS).find(([, p]) => p.width === o.width && p.height === o.height)?.[0];
	const q = new URLSearchParams();
	q.set("quick", "1");
	if (size) q.set("size", size);
	else {
		q.set("w", String(o.width));
		q.set("h", String(o.height));
	}
	q.set("players", String(o.players));
	q.set("seed", o.seedText);
	q.set("difficulty", o.difficulty);
	q.set("fog", o.fog);
	q.set("los", o.lineOfSight ? "1" : "0");
	q.set("founding", o.allowFounding ? "1" : "0");
	q.set("tribetech", o.tribeTechs === false ? "0" : "1");
	q.set("turns", String(o.turnLimit));
	q.set("v", Object.entries(o.victories).filter(([, v]) => v).map(([k]) => k).join(","));
	q.set("style", style);
	if (o.civs?.[0]) q.set("civ", o.civs[0]);
	return `?${q.toString()}`;
}

function setText (id: string, html: string): void {
	setHtml(id, html);
}

function hideLoading (): void {
	document.querySelectorAll(".igeLoading").forEach((el) => ((el as HTMLElement).style.display = "none"));
}

function showLoading (): void {
	document.querySelectorAll(".igeLoading").forEach((el) => ((el as HTMLElement).style.display = ""));
}
