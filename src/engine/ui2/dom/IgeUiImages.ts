/**
 * Pictures for the engine UI's `<img>` elements: each `src` loaded once (as
 * soon as layout meets it), its natural size given to layout (an `<img>`
 * with no width or height is its picture's size, object-fit works from it),
 * and the UI told when one arrives (laid out and drawn again, `load` sent to
 * the elements showing it). `ready()` waits for every picture asked for so
 * far (a UI fixture settles on it).
 */

import type { IgeUiHost, IgeUiHostImage } from "@/engine/ui2/IgeUiHost";

export class IgeUiImages {
	/** Natural sizes by src (layout's imageSizes). */
	readonly sizes = new Map<string, { w: number; h: number }>();
	/** One arrived (or failed: its size stays unknown). */
	onLoad?: (src: string, ok: boolean) => void;
	/** Where pictures come from (the root's host: the page's images on the web). */
	host?: IgeUiHost;
	_els = new Map<string, IgeUiHostImage>();
	_pending = new Map<string, Promise<void>>();

	/** Starts loading a picture (once per src); nothing where the host has no images (a test, a server). */
	request (src: string): void {
		if (!src || this._els.has(src) || !this.host) return;
		let img: IgeUiHostImage | undefined;
		let resolve!: () => void;
		const pending = new Promise<void>((r) => (resolve = r));
		const done = (ok: boolean) => {
			this._pending.delete(src);
			if (ok && img && img.width) this.sizes.set(src, { w: img.width, h: img.height });
			this.onLoad?.(src, ok);
			resolve();
		};
		this._pending.set(src, pending);
		img = this.host.images.load(src, done);
		if (!img) {
			this._pending.delete(src);
			return;
		}
		this._els.set(src, img);
	}

	/** What's drawn for a src (the web: its image element), if it's arrived. */
	get (src: string): unknown {
		const img = this._els.get(src);
		return img?.ready ? img.source() : undefined;
	}

	/** Every picture asked for so far has arrived (or failed). */
	async ready (): Promise<void> {
		while (this._pending.size) await Promise.all([...this._pending.values()]);
	}
}
