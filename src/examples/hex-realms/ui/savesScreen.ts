import { type SaveMeta, savedWhen } from "../saves";
import { esc } from "./html";

/**
 * The Save and Load screen (in game) and the saved-game list (also on the
 * setup screen). Buttons carry data-action names handled by the HUD or the
 * setup screen:
 *
 * - save-new (the name field #saveName), save-over (data-id): write a save
 * - save-load, save-export, save-delete-ask / save-delete / save-delete-cancel (data-id)
 * - save-import: opens the hidden file field #saveImport
 */

export interface SaveListOptions {
	/** Show Overwrite on each row (saving is possible here). */
	canSave: boolean;
	/** The save whose Delete is waiting for confirmation. */
	confirmDelete: string | null;
	/** Rows to show before "Show all" (0 = all). */
	limit?: number;
}

const KIND_LABEL: Record<SaveMeta["kind"], string> = { manual: "", quick: "Quicksave", auto: "Autosave" };

function sizeLabel (chars: number): string {
	return chars > 1e6 ? `${(chars / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(chars / 1000))} KB`;
}

export function saveRow (m: SaveMeta, o: SaveListOptions): string {
	const kind = KIND_LABEL[m.kind];
	const turn = m.turnLimit ? `Turn ${m.turn} / ${m.turnLimit}` : `Turn ${m.turn}`;
	const thumb = m.thumb ? `<img src="${m.thumb}" alt="">` : `<span class="save-thumb-empty"></span>`;
	const actions = o.confirmDelete === m.id
		? `<span class="save-confirm">Delete this save?</span>
			<button class="danger" data-action="save-delete" data-id="${m.id}">Delete</button>
			<button data-action="save-delete-cancel">Keep</button>`
		: `<button class="primary" data-action="save-load" data-id="${m.id}">Load</button>
			${o.canSave ? `<button data-action="save-over" data-id="${m.id}" title="Replace this save with the game as it is now">Overwrite</button>` : ""}
			<button class="icon-btn" data-action="save-export" data-id="${m.id}" title="Download this save as a file" aria-label="Export">${ICON_DOWNLOAD}</button>
			<button class="icon-btn" data-action="save-delete-ask" data-id="${m.id}" title="Delete this save" aria-label="Delete">${ICON_TRASH}</button>`;
	return `<div class="save-row${o.confirmDelete === m.id ? " confirming" : ""}">
		<div class="save-thumb" style="--c:${esc(m.color)}">${thumb}</div>
		<div class="save-text">
			<div class="save-name">${esc(m.name)}${kind ? ` <span class="pill">${kind}</span>` : ""}</div>
			<div class="save-sub"><span class="swatch" style="background:${esc(m.color)}"></span>${esc(m.civ)} &middot; ${turn} &middot; ${m.players} civs, ${m.width} &times; ${m.height}</div>
			<div class="save-sub dim">${savedWhen(m.savedAt)} &middot; ${sizeLabel(m.size)}</div>
		</div>
		<div class="save-actions">${actions}</div>
	</div>`;
}

export function saveList (saves: SaveMeta[] | null, o: SaveListOptions): string {
	if (!saves) return `<div class="save-empty dim">Reading saved games...</div>`;
	if (!saves.length) return `<div class="save-empty dim">No saved games yet.</div>`;
	return `<div class="save-list">${saves.map((m) => saveRow(m, o)).join("")}</div>`;
}

export const ICON_DOWNLOAD = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/></svg>`;
export const ICON_TRASH = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>`;
export const ICON_UPLOAD = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 16V5M7 9.5l5-5 5 5M5 20h14"/></svg>`;

/** The in-game Save and Load screen. */
export function savesModal (opts: {
	saves: SaveMeta[] | null;
	local: boolean;
	defaultName: string;
	confirmDelete: string | null;
	storage: boolean;
}): string {
	if (!opts.storage) {
		return `<h3>Save and load</h3><p class="dim">This browser isn't letting the game store anything (a private window, or site data is blocked), so games can't be saved here.</p>`;
	}
	const head = opts.local
		? `<div class="save-new">
				<input id="saveName" maxlength="60" value="${esc(opts.defaultName)}" aria-label="Save name" autocomplete="off">
				<button class="primary" data-action="save-new">Save game</button>
			</div>
			<p class="dim small">The game also saves itself at the start of each of your turns (the last ${3} are kept), and <kbd>Ctrl</kbd>/<kbd>&#8984;</kbd> + <kbd>S</kbd> quicksaves.</p>`
		: `<p class="dim">Online games are saved on the server after every move: rejoin any time with your invite link. Loading a game below leaves this online game.</p>`;
	return `<h3>Save and load</h3>
		${head}
		<div class="save-head"><h4>Saved games</h4>
			<button class="ghost" data-action="save-import" title="Load a save file exported from this or another browser">${ICON_UPLOAD} Import file</button>
			<input id="saveImport" type="file" accept=".json,application/json" class="hidden">
		</div>
		${saveList(opts.saves, { canSave: opts.local, confirmDelete: opts.confirmDelete })}`;
}

/** Offer text as a file download (an exported save). */
export function downloadText (name: string, text: string): void {
	const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
	const a = document.createElement("a");
	a.href = url;
	a.download = name;
	document.body.appendChild(a);
	a.click();
	a.remove();
	setTimeout(() => URL.revokeObjectURL(url), 2000);
}
