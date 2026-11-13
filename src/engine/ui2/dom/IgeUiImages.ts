/**
 * Pictures for the engine UI's `<img>` elements: each `src` loaded once (as
 * soon as layout meets it), its natural size given to layout (an `<img>`
 * with no width or height is its picture's size, object-fit works from it),
 * and the UI told when one arrives (laid out and drawn again, `load` sent to
 * the elements showing it). `ready()` waits for every picture asked for so
 * far (a UI fixture settles on it).
 */

export class IgeUiImages {
	/** Natural sizes by src (layout's imageSizes). */
	readonly sizes = new Map<string, { w: number; h: number }>();
	/** One arrived (or failed: its size stays unknown). */
	onLoad?: (src: string, ok: boolean) => void;
	_els = new Map<string, HTMLImageElement>();
	_pending = new Map<string, Promise<void>>();

	/** Starts loading a picture (once per src); nothing where there are no images (a test, a server). */
	request (src: string): void {
		if (!src || this._els.has(src) || typeof Image === "undefined") return;
		const img = new Image();
		img.decoding = "async";
		this._els.set(src, img);
		this._pending.set(src, new Promise<void>((resolve) => {
			const done = (ok: boolean) => {
				this._pending.delete(src);
				if (ok && img.naturalWidth) this.sizes.set(src, { w: img.naturalWidth, h: img.naturalHeight });
				this.onLoad?.(src, ok);
				resolve();
			};
			img.onload = () => done(true);
			img.onerror = () => done(false);
		}));
		img.src = src;
	}

	/** The picture for a src, if it's arrived. */
	get (src: string): HTMLImageElement | undefined {
		const img = this._els.get(src);
		return img?.complete && img.naturalWidth ? img : undefined;
	}

	/** Every picture asked for so far has arrived (or failed). */
	async ready (): Promise<void> {
		while (this._pending.size) await Promise.all([...this._pending.values()]);
	}
}
