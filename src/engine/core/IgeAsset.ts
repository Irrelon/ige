import { IgeEventingClass } from "@/engine/core/IgeEventingClass";
import type { IgeCanAsyncLoad } from "@/types/IgeCanAsyncLoad";

/** What whenSettled() resolves with: the asset, and the error if it failed to load. */
export interface IgeAssetSettled<AssetType> {
	asset: AssetType;
	error?: Error;
}

export class IgeAsset extends IgeEventingClass implements IgeCanAsyncLoad {
	_loaded: boolean = false;
	/** Set when loading failed (see whenSettled()). */
	_loadError?: Error;
	_assetId?: string;

	id (id?: string) {
		if (id === undefined) return this._assetId;
		this._assetId = id;
	}

	/**
	 * A promise that resolves to true when the asset has loaded.
	 */
	whenLoaded (): Promise<this> {
		return new Promise((resolve) => {
			if (this._loaded) {
				return resolve(this);
			}

			const listener = () => {
				resolve(this);
				this.off("loaded", listener);
			};

			this.on("loaded", listener);
		});
	}

	/**
	 * A promise that resolves when the asset has either loaded or failed
	 * to load, with the error in the second case. Unlike whenLoaded() it
	 * never waits forever on a missing file.
	 */
	whenSettled (): Promise<IgeAssetSettled<this>> {
		return new Promise((resolve) => {
			if (this._loaded) return resolve({ asset: this });
			if (this._loadError) return resolve({ asset: this, error: this._loadError });

			const onLoaded = () => {
				done();
				resolve({ asset: this });
			};
			const onError = (error: Error) => {
				done();
				resolve({ asset: this, error });
			};
			const done = () => {
				this.off("loaded", onLoaded);
				this.off("error", onError);
			};
			this.on("loaded", onLoaded);
			this.on("error", onError);
		});
	}

	/** Record a failed load and emit "error". */
	_assetFailed (error: Error) {
		setTimeout(() => {
			this._loadError = error;
			this.emit("error", error);
		}, 5);
	}

	_assetLoaded () {
		// Set a timeout here so that when this event is emitted,
		// the code creating the asset is given a chance to
		// set a listener first, otherwise this will be emitted
		// but nothing will have time to register a listener!
		setTimeout(() => {
			this._loaded = true;
			this.emit("loaded");
		}, 5);
	}

	destroy () {
		return this;
	}
}
