/**
 * Saved games, kept in the browser's IndexedDB (localStorage holds only about
 * 5 MB, which a long game on a big map can fill on its own).
 *
 * Each save is two records: a small summary for the save list (name, civ,
 * turn, time, a minimap thumbnail) and the game itself (the serialised sim,
 * the command log for replays, the notice log). The list reads only the
 * summaries, so it stays quick however many large saves there are.
 *
 * Kinds: "manual" saves are named by the player; "quick" is the single
 * Ctrl/Cmd+S slot; "auto" saves are written at the start of each of your
 * turns, keeping the last AUTOSAVES of them.
 */

export type SaveKind = "manual" | "quick" | "auto";

export interface SaveMeta {
	id: string;
	name: string;
	kind: SaveKind;
	/** Milliseconds since 1970. */
	savedAt: number;
	turn: number;
	turnLimit: number;
	civ: string;
	color: string;
	players: number;
	width: number;
	height: number;
	/** Size of the game record in characters (about bytes). */
	size: number;
	/** PNG data URL of the minimap (only what the player had explored). */
	thumb?: string;
}

export interface SaveData {
	id: string;
	/** Sim.serialize() output. */
	sim: string;
	style: string;
	/** The command log and options (replays). */
	recording: unknown;
	/** The notice log at the time of saving. */
	log?: unknown[];
}

/** A save as written to a file by Export. */
export interface SaveFile {
	format: "hex-realms-save";
	version: 1;
	meta: SaveMeta;
	data: SaveData;
}

/** Autosaves kept (oldest replaced first). */
export const AUTOSAVES = 3;

const DB_NAME = "hexRealms";
const DB_VERSION = 1;
const LEGACY_KEY = "hexRealms.save";

function request<T> (req: IDBRequest<T>): Promise<T> {
	return new Promise((resolve, reject) => {
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
}

function done (tx: IDBTransaction): Promise<void> {
	return new Promise((resolve, reject) => {
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
		tx.onabort = () => reject(tx.error ?? new Error("Save cancelled"));
	});
}

export class SaveStore {
	protected _db?: Promise<IDBDatabase>;

	/** Whether IndexedDB exists here at all (private windows in some browsers lack it). */
	get available (): boolean {
		try {
			return typeof indexedDB !== "undefined";
		} catch {
			return false;
		}
	}

	protected db (): Promise<IDBDatabase> {
		if (!this._db) {
			this._db = new Promise((resolve, reject) => {
				const open = indexedDB.open(DB_NAME, DB_VERSION);
				open.onupgradeneeded = () => {
					const db = open.result;
					if (!db.objectStoreNames.contains("meta")) db.createObjectStore("meta", { keyPath: "id" });
					if (!db.objectStoreNames.contains("data")) db.createObjectStore("data", { keyPath: "id" });
				};
				open.onsuccess = () => resolve(open.result);
				open.onerror = () => reject(open.error);
				open.onblocked = () => reject(new Error("Saved games are open in another tab"));
			});
			// Let a later call try again after a failure
			this._db.catch(() => (this._db = undefined));
		}
		return this._db;
	}

	/** Every save's summary, newest first. */
	async list (): Promise<SaveMeta[]> {
		if (!this.available) return [];
		await this.importLegacy();
		const db = await this.db();
		const all = await request(db.transaction("meta").objectStore("meta").getAll() as IDBRequest<SaveMeta[]>);
		return all.sort((a, b) => b.savedAt - a.savedAt);
	}

	async read (id: string): Promise<{ meta: SaveMeta; data: SaveData } | null> {
		const db = await this.db();
		const tx = db.transaction(["meta", "data"]);
		const [meta, data] = await Promise.all([
			request(tx.objectStore("meta").get(id) as IDBRequest<SaveMeta | undefined>),
			request(tx.objectStore("data").get(id) as IDBRequest<SaveData | undefined>)
		]);
		return meta && data ? { meta, data } : null;
	}

	async write (meta: SaveMeta, data: SaveData): Promise<void> {
		const db = await this.db();
		const tx = db.transaction(["meta", "data"], "readwrite");
		tx.objectStore("meta").put(meta);
		tx.objectStore("data").put({ ...data, id: meta.id });
		await done(tx);
	}

	async remove (id: string): Promise<void> {
		const db = await this.db();
		const tx = db.transaction(["meta", "data"], "readwrite");
		tx.objectStore("meta").delete(id);
		tx.objectStore("data").delete(id);
		await done(tx);
	}

	async rename (id: string, name: string): Promise<void> {
		const db = await this.db();
		const tx = db.transaction("meta", "readwrite");
		const store = tx.objectStore("meta");
		const meta = await request(store.get(id) as IDBRequest<SaveMeta | undefined>);
		if (meta) store.put({ ...meta, name, kind: meta.kind === "auto" || meta.kind === "quick" ? "manual" : meta.kind });
		await done(tx);
	}

	/** The id an autosave should use: a free slot, else the oldest autosave. */
	async autosaveId (): Promise<string> {
		const autos = (await this.list()).filter((m) => m.kind === "auto");
		for (let i = 1; i <= AUTOSAVES; i++) if (!autos.some((m) => m.id === `auto-${i}`)) return `auto-${i}`;
		return autos.sort((a, b) => a.savedAt - b.savedAt)[0].id;
	}

	/** A save as a downloadable file. */
	async exportFile (id: string): Promise<{ name: string; text: string } | null> {
		const save = await this.read(id);
		if (!save) return null;
		const file: SaveFile = { format: "hex-realms-save", version: 1, meta: save.meta, data: save.data };
		const slug = `${save.meta.civ}-turn-${save.meta.turn}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
		return { name: `hex-realms-${slug}.json`, text: JSON.stringify(file) };
	}

	/** Add a save from an exported file's text. Returns the new save's summary. */
	async importFile (text: string): Promise<SaveMeta> {
		let file: SaveFile;
		try {
			file = JSON.parse(text) as SaveFile;
		} catch {
			throw new Error("That file isn't a Hex Realms save");
		}
		if (file?.format !== "hex-realms-save" || !file.meta || typeof file.data?.sim !== "string") throw new Error("That file isn't a Hex Realms save");
		const id = `save-${Date.now().toString(36)}`;
		const meta: SaveMeta = { ...file.meta, id, kind: "manual", name: file.meta.name || "Imported game" };
		await this.write(meta, { ...file.data, id });
		return meta;
	}

	/**
	 * Saves from before IndexedDB lived in one localStorage key: move that
	 * save into the store (once), then free the key.
	 */
	protected async importLegacy (): Promise<void> {
		let raw: string | null = null;
		try {
			raw = localStorage.getItem(LEGACY_KEY);
		} catch {
			return;
		}
		if (!raw) return;
		try {
			const old = JSON.parse(raw) as { sim: string; style: string; recording: { options?: { width?: number; height?: number; turnLimit?: number; players?: number }; player?: number } };
			const parsed = JSON.parse(old.sim) as { state?: { turn?: number; players?: { name?: string; color?: string }[] } };
			const state = parsed.state ?? {};
			const me = state.players?.[old.recording?.player ?? 0];
			const o = old.recording?.options ?? {};
			const meta: SaveMeta = {
				id: "legacy", name: "Saved game", kind: "manual", savedAt: Date.now(), turn: state.turn ?? 1,
				turnLimit: o.turnLimit ?? 0, civ: me?.name ?? "Your civ", color: me?.color ?? "#888", players: o.players ?? state.players?.length ?? 0,
				width: o.width ?? 0, height: o.height ?? 0, size: raw.length
			};
			const db = await this.db();
			const tx = db.transaction(["meta", "data"], "readwrite");
			tx.objectStore("meta").put(meta);
			tx.objectStore("data").put({ id: "legacy", sim: old.sim, style: old.style, recording: old.recording });
			await done(tx);
			localStorage.removeItem(LEGACY_KEY);
		} catch (error) {
			console.warn("Couldn't move the old saved game into the save list", error);
		}
	}
}

/** "just now", "5 min ago", "yesterday 14:05", "3 Nov 09:12". */
export function savedWhen (time: number, now = Date.now()): string {
	const s = (now - time) / 1000;
	if (s < 45) return "just now";
	if (s < 3600) return `${Math.max(1, Math.round(s / 60))} min ago`;
	const d = new Date(time);
	const hm = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
	const today = new Date(now);
	if (d.toDateString() === today.toDateString()) return `today ${hm}`;
	today.setDate(today.getDate() - 1);
	if (d.toDateString() === today.toDateString()) return `yesterday ${hm}`;
	return `${d.toLocaleDateString(undefined, { day: "numeric", month: "short" })} ${hm}`;
}
