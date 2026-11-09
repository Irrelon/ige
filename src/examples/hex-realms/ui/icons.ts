import type { CivId } from "../sim/rules";

/**
 * The game's icon set: 24 x 24 line icons drawn in the current text colour,
 * so they take a button's colour and hover state. `icon(name)` returns inline
 * SVG markup; `size` sets the rendered pixel size.
 */

const P: Record<string, string> = {
	star: `<path d="M12 2.8l2.75 5.6 6.15.9-4.45 4.35 1.05 6.1L12 16.85 6.5 19.75l1.05-6.1L3.1 9.3l6.15-.9z" fill="currentColor" stroke="none"/>`,
	research: `<path d="M9 3h6M10 3v6l-5.3 9.3A1.8 1.8 0 006.3 21h11.4a1.8 1.8 0 001.6-2.7L14 9V3"/><path d="M7.3 15.5h9.4"/>`,
	cities: `<path d="M3.5 21V10.5L7 8.5v3h2V7.5l3-3 3 3v4h2v-3l3.5 2V21z"/><path d="M10 21v-3.5a2 2 0 014 0V21"/>`,
	economy: `<path d="M12 3.5v17M7.5 20.5h9M5 7h14M8.5 4.5l7 0"/><path d="M5 7l-2.6 6a2.7 2.7 0 005.2 0zM19 7l-2.6 6a2.7 2.7 0 005.2 0z"/>`,
	lens: `<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>`,
	diplomacy: `<path d="M7.5 4.5h10a2 2 0 012 2v11a2.5 2.5 0 01-2.5 2.5H8.5"/><path d="M7.5 4.5a2 2 0 00-2 2v1.5h2"/><path d="M7.5 6.5v11a2.5 2.5 0 002.5 2.5"/><path d="M11 9h5.5M11 12.5h5.5"/><circle cx="15" cy="16.5" r="1.6" fill="currentColor" stroke="none"/>`,
	ambition: `<path d="M5 21V3.5"/><path d="M5 4h12.5l-2.5 4 2.5 4H5"/>`,
	wonders: `<path d="M3 21h18M5 18h14M6.5 18V10M10 18v-8M14 18v-8M17.5 18V10M3.5 10L12 4.5 20.5 10z"/>`,
	log: `<path d="M9 6.5h11M9 12h11M9 17.5h11"/><circle cx="4.75" cy="6.5" r="1.1" fill="currentColor" stroke="none"/><circle cx="4.75" cy="12" r="1.1" fill="currentColor" stroke="none"/><circle cx="4.75" cy="17.5" r="1.1" fill="currentColor" stroke="none"/>`,
	chat: `<path d="M20.5 11.5a8 8 0 01-11.7 7.1L3.5 20l1.3-4.7a8 8 0 1115.7-3.8z"/>`,
	terrain: `<path d="M2.5 19.5l6.5-11 4 6.2 2.4-3.4 6.1 8.2z"/><path d="M7 11l2 1.5L11 11"/>`,
	save: `<path d="M5 3.5h11l3.5 3.5v12a1.5 1.5 0 01-1.5 1.5H5A1.5 1.5 0 013.5 19V5A1.5 1.5 0 015 3.5z"/><path d="M8 3.5V8h7V3.5M7 20.5V14h10v6.5"/>`,
	menu: `<path d="M4 7h16M4 12h16M4 17h16"/>`,
	next: `<path d="M5 6l6 6-6 6M12.5 6l6 6-6 6"/>`,
	hourglass: `<path d="M6.5 3h11M6.5 21h11"/><path d="M8 3c0 5.5 8 5.5 8 9s-8 3.5-8 9M16 3c0 5.5-8 5.5-8 9s8 3.5 8 9"/>`,
	heart: `<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0112 7.2a4.3 4.3 0 017.5 2.6C19.5 15.4 12 20 12 20z"/>`,
	sword: `<path d="M19.5 4.5L9.5 14.5M19.5 4.5h-4M19.5 4.5v4M10.5 13.5l-3 3M6 13.5l4.5 4.5M4.5 19.5l2.2-2.2"/>`,
	shield: `<path d="M12 3l8 3v6c0 4.8-3.4 8-8 9-4.6-1-8-4.2-8-9V6z"/>`,
	range: `<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/>`,
	moves: `<path d="M5 6.5l5.5 5.5L5 17.5M12.5 6.5L18 12l-5.5 5.5"/>`,
	capture: `<path d="M4 4L14 14M11 16.5L16.5 11M14 14L19 19M20 4L10 14M7.5 11L13 16.5M10 14L5 19"/>`,
	found: `<path d="M3 11L12 4L21 11M5.5 9.5V20H18.5V9.5M10 20V14.5H14V20"/>`,
	pillage: `<path d="M12 3C13 6.5 18 8.5 18 14A6 6 0 0 1 6 14C6 10.5 8.5 9.5 8.5 6.5C10 8 11 9.5 11.5 11.5C12.5 9 12.5 6 12 3Z"/>`,
	crown: `<path d="M3.5 8l4.5 4 4-7 4 7 4.5-4-1.8 11H5.3z"/>`,
	settings: `<path d="M4 7h9M17 7h3M4 12h3M11 12h9M4 17h11M19 17h1"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="17" r="2"/>`,
	help: `<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 114 2c-.9.6-1.5 1.1-1.5 2.3"/><circle cx="12" cy="17" r="1" fill="currentColor" stroke="none"/>`,
	close: `<path d="M6 6l12 12M18 6L6 18"/>`,
	dice: `<rect x="4" y="4" width="16" height="16" rx="3.5"/><circle cx="8.5" cy="8.5" r="1.2" fill="currentColor" stroke="none"/><circle cx="15.5" cy="15.5" r="1.2" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="15.5" cy="8.5" r="1.2" fill="currentColor" stroke="none"/><circle cx="8.5" cy="15.5" r="1.2" fill="currentColor" stroke="none"/>`,
	people: `<circle cx="8.5" cy="8" r="3"/><circle cx="16.5" cy="8.5" r="2.5"/><path d="M3 19.5c0-3.2 2.5-5.5 5.5-5.5s5.5 2.3 5.5 5.5M14.5 14.5c.6-.2 1.3-.3 2-.3 2.6 0 4.5 2 4.5 5"/>`,
	map: `<path d="M3 6.5l6-3 6 3 6-3v14l-6 3-6-3-6 3z"/><path d="M9 3.5v14M15 6.5v14"/>`,
	globe: `<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.6 3.8 5.6 3.8 9s-1.2 6.4-3.8 9c-2.6-2.6-3.8-5.6-3.8-9S9.4 5.6 12 3z"/>`,
	play: `<path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/>`,
	folder: `<path d="M3.5 7.5a2 2 0 012-2h4l2 2.5h7a2 2 0 012 2v8a2 2 0 01-2 2h-13a2 2 0 01-2-2z"/>`,
	continue: `<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4.5h4.5"/><path d="M10.5 8.5v7l5.5-3.5z" fill="currentColor"/>`,
	trophy: `<path d="M8 4h8v5a4 4 0 01-8 0z"/><path d="M8 6H4.5a3 3 0 003.5 4M16 6h3.5a3 3 0 01-3.5 4M12 13v4M8 20.5h8M9.5 20.5l.5-3.5h4l.5 3.5"/>`,
	eye: `<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>`,
	bell: `<path d="M6 16.5V11a6 6 0 0112 0v5.5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 004 0"/>`,
	check: `<path d="M5 12.5l4.5 4.5L19 7.5"/>`,
	info: `<circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><circle cx="12" cy="7.8" r="1.1" fill="currentColor" stroke="none"/>`,
	warning: `<path d="M12 3.5L21.5 20h-19z"/><path d="M12 10v4.5"/><circle cx="12" cy="17.2" r="1.05" fill="currentColor" stroke="none"/>`,
	grow: `<path d="M12 20.5V10"/><path d="M12 13c-4.5 0-6.5-2.5-6.5-6.5 4.5 0 6.5 2.5 6.5 6.5zM12 10.5c0-4 2-6.5 6.5-6.5 0 4-2 6.5-6.5 6.5z"/>`,
	coin: `<ellipse cx="12" cy="7" rx="7" ry="3"/><path d="M5 7v5c0 1.7 3.1 3 7 3s7-1.3 7-3V7M5 12v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5"/>`,
	hammer: `<path d="M14.5 4.5l5 5-2.5 2.5-5-5z"/><path d="M12 7L3.5 15.5l5 5L17 12"/>`,
	sleep: `<path d="M20.5 14.5A8.5 8.5 0 019.5 3.5a8.5 8.5 0 1011 11z"/>`,
	fortify: `<path d="M12 3l8 3v6c0 4.8-3.4 8-8 9-4.6-1-8-4.2-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>`,
	upgrade: `<path d="M12 20V5M6 11l6-6 6 6"/><path d="M5 20.5h14"/>`,
	edit: `<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>`,
	music: `<path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>`,
	sound: `<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 010 6M18 6.5a7.5 7.5 0 010 11"/>`,
	graph: `<path d="M4 4v16h16"/><path d="M7.5 15l3.5-4 3 2.5 5-6"/>`,
	camp: `<path d="M3 20l9-15 9 15z"/><path d="M12 5v15M9 20l3-5 3 5"/>`,
	route: `<circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 18h6.5a3.5 3.5 0 000-7h-5a3.5 3.5 0 010-7H16"/>`
};

/** Tribe emblems, used on the setup screen and the diplomacy screen. */
const EMBLEMS: Record<CivId | "random", string> = {
	highlanders: `<path d="M2 20l6.5-11.5 3.8 6 3-4.2L22 20z"/><path d="M6.4 12.2l2.1-3.7 2.2 3.5-1.2-.6-1 .9z" fill="currentColor"/>`,
	riverfolk: `<path d="M3 7.5c2-1.6 4-1.6 6 0s4 1.6 6 0 4-1.6 6 0M3 12.5c2-1.6 4-1.6 6 0s4 1.6 6 0 4-1.6 6 0M3 17.5c2-1.6 4-1.6 6 0s4 1.6 6 0 4-1.6 6 0"/>`,
	woodlanders: `<path d="M12 2.5l5 6.5h-3l4.5 6h-4l3.5 4.5H6l3.5-4.5h-4L10 9H7z"/><path d="M12 19.5v2.5"/>`,
	horselords: `<path d="M6.5 20.5V12a5.5 5.5 0 0111 0v8.5" stroke-width="3.2"/><path d="M4.5 20.5h4M15.5 20.5h4"/>`,
	coastfolk: `<path d="M2.5 12c3.2-5.2 10.2-6.2 14.5 0-4.3 6.2-11.3 5.2-14.5 0z"/><path d="M17 12l4.5-3.5v7z"/><circle cx="7" cy="11" r="1" fill="currentColor" stroke="none"/>`,
	plainsfolk: `<path d="M12 22V7.5"/><path d="M12 8c-2.2-.9-3.3-2.7-3.3-5 2.2.9 3.3 2.7 3.3 5zM12 8c2.2-.9 3.3-2.7 3.3-5-2.2.9-3.3 2.7-3.3 5zM12 13c-2.2-.9-3.3-2.7-3.3-5 2.2.9 3.3 2.7 3.3 5zM12 13c2.2-.9 3.3-2.7 3.3-5-2.2.9-3.3 2.7-3.3 5zM12 18c-2.2-.9-3.3-2.7-3.3-5 2.2.9 3.3 2.7 3.3 5zM12 18c2.2-.9 3.3-2.7 3.3-5-2.2.9-3.3 2.7-3.3 5z" fill="currentColor" stroke-width="1"/>`,
	random: `<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M9.5 9.6a2.5 2.5 0 114 2c-.9.6-1.5 1.1-1.5 2.2"/><circle cx="12" cy="16.6" r="1" fill="currentColor" stroke="none"/>`
};

/** Each tribe's colour on cards and emblems (player colours are separate, by seat). */
export const TRIBE_COLORS: Record<CivId | "random", string> = {
	highlanders: "#9fb4c8",
	riverfolk: "#3cc0cf",
	woodlanders: "#5cbf6e",
	horselords: "#e08a3c",
	coastfolk: "#4f95ff",
	plainsfolk: "#e6bf4f",
	random: "#b9a7e8"
};

export type IconName = keyof typeof P;

export function icon (name: IconName | string, size = 18, cls = "ico"): string {
	const body = P[name] ?? "";
	return `<svg class="${cls}" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}

export function emblem (civ: CivId | "random", size = 28): string {
	return `<svg class="emblem" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${EMBLEMS[civ]}</svg>`;
}
