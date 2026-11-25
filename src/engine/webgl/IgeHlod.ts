/**
 * Hierarchical level of detail for big static worlds streamed in chunks (a city, terrain): groups of chunks (2 x 2,
 * 4 x 4, 8 x 8...) drawn as low-detail proxies far away and from high up, one draw a group.
 *
 * The world is a grid of cells (the game's chunks: level 0). Level 1 groups them 2 x 2, level 2 4 x 4 and so on: a
 * quadtree over the grid. Each frame IgeHlod picks a cut through it for the cameras that see it: a group close
 * enough to need more detail (its level's `distance`, or its on-screen size over its level's `screenSize`) is
 * replaced by its four children, down to the chunks; beyond `maxDistance` nothing is drawn. Every cell of the world
 * in range is drawn by exactly one node.
 *
 * What a node draws comes from the game: `load(node)` hands back its content (the chunk's entity, or meshes the
 * engine makes entities for), sync or async, built on the main thread, in a worker (igeBuildHlodProxy() builds a
 * group's proxy from its chunks' pieces), or read from a file. IgeHlod asks for the nodes of the cut nearest first,
 * a few at a time (`concurrency`), and their parents ahead of need (`prefetch`); waits for their meshes to reach the
 * GPU (the renderer's upload budget is kept); keeps what's been drawn for `keep` seconds after it's left the cut (so
 * flying back and forth doesn't load it again) and then lets it go (`unload`).
 *
 * Swaps never leave a hole: a group is split only once all its children are ready (it stays drawn meanwhile), and
 * children stay until their group is ready. Swaps don't flicker: a level is taken up closer than its threshold and
 * let go further than it (`hysteresis`). And they don't pop: the old and new levels cross-fade over `fade` seconds,
 * dithered (IgeObject._lodFade; each pixel is one or the other, so nothing is blended or sorted).
 *
 * @example #A city of 64 m chunks, merged groups from 2 x 2 up, built in a worker
 *     const hlod = new IgeHlod({
 *         cellSize: 6400, cells: { x: 160, z: 160 }, minY: 0, maxY: 6000,
 *         levels: [{ distance: 30000 }, { distance: 60000 }, { distance: 120000 }, { distance: 240000 }],
 *         maxDistance: 900000,
 *         load: (node, signal) => node.level === 0 ? buildChunk(node.x, node.z, signal) : buildProxy(node, signal)
 *     }).mount(scene);
 */
import { IgeEntity } from "@/engine/core/IgeEntity";
import type { IgeObject } from "@/engine/core/IgeObject";
import type { IgeViewport } from "@/engine/core/IgeViewport";
import { ige } from "@/engine/instance";
import { markSceneChanged } from "@/engine/utils/sceneChange";
import { IgeBehaviourType } from "@/enums";
import type { IgeGeometryData3d } from "@/types/IgeGeometryData3d";
import type { IgeMaterialData } from "@/types/IgeMaterialData";

/** When a level is used: beyond a distance, or while its groups are small on screen. */
export interface IgeHlodLevel {
	/** Used where a group's nearest point is at least this far from the camera (world units). */
	distance?: number;
	/**
	 * Or: used while a group's on-screen size (its box's diagonal across the ground, device pixels) is under this. Works
	 * for orthographic cameras too; for perspective ones it's a distance that scales with the view's size and lens.
	 */
	screenSize?: number;
}

/** A node of the quadtree: a chunk (level 0) or a group of 2^level x 2^level of them. */
export interface IgeHlodNode {
	readonly level: number;
	/** Its column and row among its level's nodes. */
	readonly x: number;
	readonly z: number;
	/** `${level}:${x}:${z}` */
	readonly key: string;
	/** The chunks (level-0 cells) it covers: x0 to x1 and z0 to z1, the ends not included. */
	readonly cells: { readonly x0: number; readonly z0: number; readonly x1: number; readonly z1: number };
	/** Its box across the ground, world units. */
	readonly minX: number;
	readonly minZ: number;
	readonly maxX: number;
	readonly maxZ: number;
}

/** Meshes for a node: IgeHlod makes an entity for each, and releases their GPU copies when it lets the node go. */
export interface IgeHlodMeshes {
	meshes: { geometry: IgeGeometryData3d; material?: IgeMaterialData | null }[];
	/** Cast shadows (default true). Far proxies often needn't: past the shadow distance they'd cast none anyway. */
	castShadow?: boolean;
}

/**
 * What a node draws: an entity (mounted under the IgeHlod entity; the game frees its meshes in `unload`), meshes, or
 * null for nothing (an empty bit of sea).
 */
export type IgeHlodContent = IgeEntity | IgeHlodMeshes | null;

/** A camera's place, and how big things look from it. */
export interface IgeHlodViewpoint {
	x: number;
	y: number;
	z: number;
	/**
	 * Device pixels per world unit: at one unit's distance (perspective), or everywhere (orthographic). Needed only
	 * for levels given by `screenSize`.
	 */
	pixelsPerUnit?: number;
	orthographic?: boolean;
}

export interface IgeHlodOptions {
	/** A chunk's size (world units). */
	cellSize: number;
	/** How many chunks the world is across x and z. */
	cells: { x: number; z: number };
	/** Where chunk (0, 0)'s corner is (world x, z; default 0, 0). Chunk (i, j) spans origin + (i, j) × cellSize. */
	origin?: { x: number; z: number };
	/** The heights the world's content spans (world y; default 0 to cellSize): distances are to the nodes' boxes. */
	minY?: number;
	maxY?: number;
	/** Levels 1 (2 x 2 chunks) upwards: when each is used. Each should start further off than the one below. */
	levels: IgeHlodLevel[];
	/** Nothing is drawn beyond this distance (default Infinity). */
	maxDistance?: number;
	/** A level is taken up this fraction closer than its threshold, and let go this much further (default 0.1). */
	hysteresis?: number;
	/** Seconds the old and new levels take to cross-fade (default 0.3; 0 swaps at once). */
	fade?: number;
	/** Loads in flight at once (default 4). */
	concurrency?: number;
	/** How many levels above what's drawn are loaded ahead (default 1: groups are ready before they're needed). */
	prefetch?: number;
	/** Seconds a node's content is kept after it last was drawn or wanted (default 10). */
	keep?: number;
	/** Free each mesh's CPU arrays once it's on the GPU (renderer.discardGeometryArrays(); default false). */
	discardArrays?: boolean;
	/** A node's content. Aborted (the signal) when it isn't wanted any more before it's done. */
	load: (node: IgeHlodNode, signal: AbortSignal) => IgeHlodContent | Promise<IgeHlodContent>;
	/** Called when a node's content is let go (its entity already destroyed; meshes content already released). */
	unload?: (node: IgeHlodNode, content: IgeHlodContent) => void;
	/** The cameras to pick levels for (default: every viewport showing the scene IgeHlod is in). */
	viewpoints?: () => IgeHlodViewpoint[];
}

/** What IgeHlod is doing (stats()). */
export interface IgeHlodStats {
	/** Nodes drawn at each level (0: chunks), cross-fades included. */
	drawn: number[];
	/** Nodes cross-fading. */
	fading: number;
	/** Nodes with content, loading, and waiting to load. */
	loaded: number;
	loading: number;
	wanted: number;
	/** Loads started and contents let go, since the IgeHlod was made. */
	loads: number;
	unloads: number;
	/** Cells in range not drawn by anything ready (a hole while loading; 0 once settled). */
	holes: number;
}

interface HlodNode extends IgeHlodNode {
	parent?: HlodNode;
	kids?: HlodNode[];
	state: "none" | "loading" | "ready" | "failed";
	content: IgeHlodContent;
	entity?: IgeEntity;
	abort?: AbortController;
	/** How much it's drawn (0 to 1) and where it's going. */
	vis: number;
	target: number;
	/** The last selection's choices (for hysteresis). */
	refined: boolean;
	out: boolean;
	/** This selection's distance to the nearest camera, and when it was last drawn or wanted. */
	dist: number;
	usedAt: number;
	failedAt: number;
	/** The selection it was last queued to load ahead in. */
	aheadAt: number;
}

const DEFAULTS = { hysteresis: 0.1, fade: 0.3, concurrency: 4, prefetch: 1, keep: 10, maxDistance: Infinity };

/**
 * Hierarchical level of detail over a grid of chunks (see the file's notes). Mount it in the scene: the content it
 * loads is mounted under it, so keep it at the origin for content in world units. It picks levels in its preUpdate
 * behaviour for the viewports showing its scene (or call select() with viewpoints yourself).
 */
export class IgeHlod extends IgeEntity {
	classId = "IgeHlod";
	options: IgeHlodOptions;
	protected _top: HlodNode[] = [];
	protected _drawnNodes = new Set<HlodNode>();
	protected _loadedNodes = new Set<HlodNode>();
	protected _inFlight = 0;
	protected _last = -1;
	protected _selection = 0;
	protected _stats: IgeHlodStats = { drawn: [], fading: 0, loaded: 0, loading: 0, wanted: 0, loads: 0, unloads: 0, holes: 0 };
	protected _draw: HlodNode[] = [];
	protected _want: HlodNode[] = [];
	protected _ahead: HlodNode[] = [];

	constructor (options: IgeHlodOptions) {
		super();
		this.options = options;
		const top = options.levels.length;
		const span = 1 << top;
		for (let z = 0; z < Math.ceil(options.cells.z / span); z++) {
			for (let x = 0; x < Math.ceil(options.cells.x / span); x++) this._top.push(this._node(top, x, z));
		}
		this.addBehaviour(IgeBehaviourType.preUpdate, "hlod", () => this.select());
	}

	/** The levels' count above the chunks. */
	levels (): number {
		return this.options.levels.length;
	}

	/** What it's drawing and loading (see IgeHlodStats). */
	stats (): IgeHlodStats {
		return { ...this._stats, drawn: [...this._stats.drawn] };
	}

	/** The node at a level, column and row (made as first asked for), or undefined outside the world. */
	node (level: number, x: number, z: number): IgeHlodNode | undefined {
		const top = this.levels();
		if (level < 0 || level > top) return;
		const span = 1 << (top - level);
		const t = this._top.find((n) => n.x === Math.floor(x / span) && n.z === Math.floor(z / span));
		let n: HlodNode | undefined = t;
		while (n && n.level > level) n = this._kids(n).find((k) => k.x === Math.floor(x / (1 << (k.level - level))) && k.z === Math.floor(z / (1 << (k.level - level))));
		return n;
	}

	/** Whether a node is drawn now (fading in or out counts). */
	drawn (node: IgeHlodNode): boolean {
		return this._drawnNodes.has(node as HlodNode);
	}

	/**
	 * Pick the levels for these cameras (default: the viewports' showing its scene, or options.viewpoints()), load
	 * what's needed, swap what's ready and let go of what's old. Called each frame by its behaviour; `now` is ms
	 * (performance.now() by default).
	 */
	select (viewpoints?: IgeHlodViewpoint[], now: number = performance.now()): void {
		const views = viewpoints ?? this.options.viewpoints?.() ?? this._viewpoints();
		if (!views.length) return;
		const dt = this._last < 0 ? 0 : Math.max(0, now - this._last) / 1000;
		this._last = now;
		const selection = ++this._selection;

		// The cut: what to draw (the best that's ready), and what it'd draw with everything ready
		const draw = this._draw, want = this._want;
		draw.length = 0;
		want.length = 0;
		let holes = 0;
		for (const top of this._top) {
			const mark = draw.length;
			if (!this._plan(top, views, draw, want)) holes += this._holes(top, draw, mark);
		}

		// Draw targets: the cut in, the rest out
		for (const n of this._drawnNodes) n.target = 0;
		for (const n of draw) {
			n.target = 1;
			n.usedAt = now;
			this._drawnNodes.add(n);
		}
		const fading = this._fade(dt);
		this._loadAhead(want, now, selection);
		const s = this._stats;
		this._letGo(now);
		s.fading = fading;
		s.wanted = want.length;
		s.holes = holes;
	}

	/** Cross-fades moved on `dt` seconds: what's in fades in as what's out fades out, through the same dither. Returns how many are fading. */
	protected _fade (dt: number): number {
		const fade = this.options.fade ?? DEFAULTS.fade;
		const step = fade > 0 ? dt / fade : 1;
		const drawn = this._stats.drawn;
		drawn.length = 0;
		for (let l = 0; l <= this.levels(); l++) drawn.push(0);
		let fading = 0;
		for (const n of this._drawnNodes) {
			// (With nothing to replace, at the start or into a hole, it fades in from nothing)
			n.vis = n.target ? Math.min(1, n.vis + step) : Math.max(0, n.vis - step);
			const entity = n.entity;
			if (n.target === 0 && n.vis <= 0) {
				this._drawnNodes.delete(n);
				if (entity) {
					entity._lodFade = 0;
					entity.hide();
				}
				continue;
			}
			drawn[n.level]++;
			if (n.vis < 1) fading++;
			if (!entity) continue;
			entity.show();
			entity._lodFade = n.vis >= 1 ? 0 : n.target ? Math.max(n.vis, 1e-3) : -(1 - n.vis);
		}
		if (fading) markSceneChanged();
		return fading;
	}

	/** Loads started: the cut nearest first, then what's ahead of it (`prefetch` levels of parents). */
	protected _loadAhead (want: HlodNode[], now: number, selection: number): void {
		const ahead = this._ahead;
		ahead.length = 0;
		const prefetch = this.options.prefetch ?? DEFAULTS.prefetch;
		for (const n of want) {
			n.usedAt = now;
			let p = n.parent;
			for (let k = 0; p && k < prefetch; k++, p = p.parent) {
				p.usedAt = now;
				if (p.aheadAt !== selection) {
					p.aheadAt = selection;
					ahead.push(p);
				}
			}
		}
		const concurrency = this.options.concurrency ?? DEFAULTS.concurrency;
		if (this._inFlight >= concurrency) return;
		const queue = want.filter((n) => this._loadable(n, now)).sort(byDistance);
		const later = ahead.filter((n) => this._loadable(n, now)).sort(byDistance);
		for (const n of queue.concat(later)) {
			if (this._inFlight >= concurrency) break;
			this._load(n);
		}
	}

	/** Lets go of what's been out of use for `keep` seconds, and of loads no longer wanted; counts what's loaded and loading. */
	protected _letGo (now: number): void {
		const keep = (this.options.keep ?? DEFAULTS.keep) * 1000;
		let loading = 0, loaded = 0;
		for (const n of this._loadedNodes) {
			if (n.state === "loading") loading++;
			else if (n.state === "ready") loaded++;
			if (this._drawnNodes.has(n)) continue;
			if (n.state === "loading" ? n.usedAt < now : now - n.usedAt > keep) this._unload(n);
		}
		this._stats.loaded = loaded;
		this._stats.loading = loading;
	}

	/** Let go of everything (on destroy, or to start again). */
	clear (): void {
		for (const n of [...this._loadedNodes]) this._unload(n);
		this._drawnNodes.clear();
	}

	destroy (): this {
		this.clear();
		return super.destroy();
	}

	// ------------------------------------------------------------------ the tree

	protected _node (level: number, x: number, z: number, parent?: HlodNode): HlodNode {
		const o = this.options, span = 1 << level, size = o.cellSize, origin = o.origin ?? { x: 0, z: 0 };
		const x0 = x * span, z0 = z * span, x1 = Math.min(o.cells.x, x0 + span), z1 = Math.min(o.cells.z, z0 + span);
		return {
			level, x, z, key: `${level}:${x}:${z}`, cells: { x0, z0, x1, z1 },
			minX: origin.x + x0 * size, minZ: origin.z + z0 * size, maxX: origin.x + x1 * size, maxZ: origin.z + z1 * size,
			parent, state: "none", content: null, vis: 0, target: 0, refined: false, out: false, dist: Infinity, usedAt: -Infinity, failedAt: -Infinity, aheadAt: -1
		};
	}

	/** A group's children (those inside the world), made as first asked for. */
	protected _kids (n: HlodNode): HlodNode[] {
		if (n.kids) return n.kids;
		const kids: HlodNode[] = [];
		if (n.level > 0) {
			const o = this.options, span = 1 << (n.level - 1);
			for (let dz = 0; dz < 2; dz++) {
				for (let dx = 0; dx < 2; dx++) {
					const x = n.x * 2 + dx, z = n.z * 2 + dz;
					if (x * span < o.cells.x && z * span < o.cells.z) kids.push(this._node(n.level - 1, x, z, n));
				}
			}
		}
		return (n.kids = kids);
	}

	/** The nearest camera's distance to a node's box. */
	protected _distance (n: HlodNode, views: IgeHlodViewpoint[]): number {
		const minY = this.options.minY ?? 0, maxY = this.options.maxY ?? this.options.cellSize;
		let best = Infinity;
		for (const v of views) {
			const dx = Math.max(n.minX - v.x, 0, v.x - n.maxX);
			const dy = Math.max(minY - v.y, 0, v.y - maxY);
			const dz = Math.max(n.minZ - v.z, 0, v.z - n.maxZ);
			const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
			if (d < best) best = d;
		}
		return best;
	}

	/** Whether a group needs more detail than its level for any camera (with hysteresis on its last choice). */
	protected _refine (n: HlodNode, views: IgeHlodViewpoint[]): boolean {
		const level = this.options.levels[n.level - 1];
		if (!level) return false;
		const h = this.options.hysteresis ?? DEFAULTS.hysteresis;
		const k = n.refined ? 1 + h : 1 - h;
		if (level.distance !== undefined) return n.dist < level.distance * k;
		if (level.screenSize === undefined) return false;
		const size = Math.hypot(n.maxX - n.minX, n.maxZ - n.minZ);
		for (const v of views) {
			const ppu = v.pixelsPerUnit ?? 0;
			if (ppu <= 0) continue;
			if (v.orthographic) {
				if (size * ppu > level.screenSize / k) return true;
				continue;
			}
			const dx = Math.max(n.minX - v.x, 0, v.x - n.maxX);
			const dy = Math.max((this.options.minY ?? 0) - v.y, 0, v.y - (this.options.maxY ?? this.options.cellSize));
			const dz = Math.max(n.minZ - v.z, 0, v.z - n.maxZ);
			if (Math.hypot(dx, dy, dz) < (size * ppu / level.screenSize) * k) return true;
		}
		return false;
	}

	/**
	 * A node's part of the cut into `draw` (the best of it that's ready) and `want` (what the cut would be with
	 * everything ready). Returns false when part of its area is left undrawn.
	 */
	protected _plan (n: HlodNode, views: IgeHlodViewpoint[], draw: HlodNode[], want: HlodNode[]): boolean {
		const h = this.options.hysteresis ?? DEFAULTS.hysteresis;
		const max = this.options.maxDistance ?? DEFAULTS.maxDistance;
		n.dist = this._distance(n, views);
		n.out = max < Infinity && n.dist > max * (n.out ? 1 - h : 1 + h);
		if (n.out) return true;
		const mark = draw.length;
		n.refined = n.level > 0 && this._refine(n, views);
		if (n.refined) {
			let ok = true;
			for (const kid of this._kids(n)) ok = this._plan(kid, views, draw, want) && ok;
			if (ok) return true;
			// Its children aren't all ready: it stays (if it can) until they are
			if (n.state === "ready") {
				draw.length = mark;
				draw.push(n);
				return true;
			}
			return false;
		}
		want.push(n);
		if (n.state === "ready") {
			draw.push(n);
			return true;
		}
		// Not ready yet: the children it's taking over from, while they're still there
		if (n.level > 0) {
			let ok = true;
			for (const kid of this._kids(n)) ok = this._planReady(kid, views, draw) && ok;
			if (ok) return true;
		}
		return false;
	}

	/** What's ready under a node, covering it (no new loads). */
	protected _planReady (n: HlodNode, views: IgeHlodViewpoint[], draw: HlodNode[]): boolean {
		const max = this.options.maxDistance ?? DEFAULTS.maxDistance;
		if (max < Infinity && this._distance(n, views) > max) return true;
		if (n.state === "ready") {
			draw.push(n);
			return true;
		}
		if (n.level === 0 || !n.kids) return false;
		let ok = true;
		for (const kid of n.kids) ok = this._planReady(kid, views, draw) && ok;
		return ok;
	}

	/** Chunks of a top node in range that nothing in `draw` (from `from`) covers. */
	protected _holes (top: HlodNode, draw: HlodNode[], from: number): number {
		let covered = 0;
		for (let i = from; i < draw.length; i++) {
			const c = draw[i].cells;
			covered += (c.x1 - c.x0) * (c.z1 - c.z0);
		}
		const c = top.cells;
		return Math.max(0, (c.x1 - c.x0) * (c.z1 - c.z0) - covered);
	}

	// ------------------------------------------------------------------ loading

	protected _loadable (n: HlodNode, now: number): boolean {
		// (A load that failed is tried again after 5 s)
		return n.state === "none" || (n.state === "failed" && now - n.failedAt > 5000);
	}

	protected _load (n: HlodNode): void {
		const abort = new AbortController();
		n.abort = abort;
		n.state = "loading";
		this._loadedNodes.add(n);
		this._inFlight++;
		this._stats.loads++;
		const stale = () => n.abort !== abort || abort.signal.aborted;
		Promise.resolve()
			.then(() => this.options.load(n, abort.signal))
			.then(async (content) => {
				if (stale()) {
					this._dispose(n, content, undefined);
					return;
				}
				const entity = this._mount(n, content);
				await this._upload(entity, n.dist);
				if (stale()) {
					this._dispose(n, content, entity);
					return;
				}
				n.content = content;
				n.entity = entity;
				n.state = "ready";
				markSceneChanged();
			})
			.catch((error) => {
				if (stale()) return;
				n.state = "failed";
				n.failedAt = performance.now();
				this.log(`Loading ${n.key} failed: ${error}`, "warning");
			})
			.finally(() => {
				this._inFlight--;
			});
	}

	/** A node's content mounted under this entity, hidden till it's drawn. */
	protected _mount (n: HlodNode, content: IgeHlodContent): IgeEntity | undefined {
		if (!content) return;
		let entity: IgeEntity;
		if (content instanceof IgeEntity) {
			entity = content;
		} else {
			entity = new IgeEntity();
			for (const mesh of content.meshes) {
				const part = new IgeEntity().geometry(mesh.geometry).material(mesh.material ?? null);
				if (content.castShadow === false) part._noShadowCast = true;
				part.mount(entity);
			}
		}
		entity.id(`hlod_${this.id()}_${n.key}`);
		entity.hide();
		entity.mount(this);
		return entity;
	}

	/** Every mesh under an entity on the GPU (in the renderer's upload budget, nearest first). */
	protected async _upload (entity: IgeEntity | undefined, priority: number): Promise<void> {
		const renderer = ige.engine?._renderer as unknown as { uploadGeometry?: (g: IgeGeometryData3d, o: { priority?: number; discardArrays?: boolean }) => Promise<boolean> } | undefined;
		if (!entity || !renderer?.uploadGeometry) return;
		const waits: Promise<boolean>[] = [];
		const visit = (o: IgeObject) => {
			const g = (o as IgeEntity)._geometryData;
			if (g && (g.vertices || g.packed)) waits.push(renderer.uploadGeometry!(g, { priority, discardArrays: this.options.discardArrays }));
			for (const c of o._children ?? []) visit(c);
		};
		visit(entity);
		await Promise.all(waits);
	}

	/** A node's content let go: its entity destroyed, meshes content released, the game told. */
	protected _dispose (n: HlodNode, content: IgeHlodContent, entity: IgeEntity | undefined): void {
		const target = entity ?? (content instanceof IgeEntity ? content : undefined);
		target?.destroy();
		if (content && !(content instanceof IgeEntity)) {
			const renderer = ige.engine?._renderer as unknown as { releaseGeometry?: (g: IgeGeometryData3d) => void } | undefined;
			for (const mesh of content.meshes) renderer?.releaseGeometry?.(mesh.geometry);
		}
		if (content !== undefined) this.options.unload?.(n, content);
	}

	protected _unload (n: HlodNode): void {
		n.abort?.abort();
		n.abort = undefined;
		if (n.state === "ready") {
			this._dispose(n, n.content, n.entity);
			this._stats.unloads++;
		}
		n.state = "none";
		n.content = null;
		n.entity = undefined;
		n.vis = 0;
		n.target = 0;
		this._loadedNodes.delete(n);
		this._drawnNodes.delete(n);
	}

	// ------------------------------------------------------------------ cameras

	/** The cameras of the viewports showing the scene this is in, with their pixels per world unit. */
	protected _viewpoints (): IgeHlodViewpoint[] {
		const engine = ige.engine;
		if (!engine) return [];
		// (The renderer mounts a scene to each viewport that shows it as it draws: look up from here for a viewport's scene)
		const viewports = (engine._children ?? []) as IgeViewport[];
		let scene: IgeObject | null = this;
		while (scene && !viewports.some((vp) => vp._scene === scene)) scene = scene._parent;
		if (!scene) return [];
		const renderer = engine._renderer as unknown as {
			cameraMatrices?: (vp: IgeViewport) => { projection: { matrix: Float32Array }; cameraPosition: { x: number; y: number; z: number } } | null;
			_devicePixelRatio?: number;
		} | undefined;
		const out: IgeHlodViewpoint[] = [];
		for (const vp of viewports) {
			if (vp._scene !== scene || !vp.camera) continue;
			const m = renderer?.cameraMatrices?.(vp);
			if (m) {
				const p = m.projection.matrix, height = vp._bounds2d.y * (renderer?._devicePixelRatio ?? 1);
				out.push({ ...m.cameraPosition, pixelsPerUnit: p[5] * height * 0.5, orthographic: p[11] === 0 });
			} else {
				const t = vp.camera._translate;
				out.push({ x: t.x, y: t.y, z: t.z });
			}
		}
		return out;
	}
}

function byDistance (a: { dist: number }, b: { dist: number }): number {
	return a.dist - b.dist;
}
