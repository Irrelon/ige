import { IgeEventingClass } from "@/engine/core/IgeEventingClass";
import type { IgeCanAsyncLoad } from "@/types/IgeCanAsyncLoad";

export class IgeAsset extends IgeEventingClass implements IgeCanAsyncLoad {
	_loaded: boolean = false;
	_assetId?: string;

	id (id?: string) {
		if (id === undefined) return this._assetId;
		this._assetId = id;
	}

	/**
	 * A promise that resolves to true when the asset has loaded.
	 */
	whenLoaded (): Promise<boolean> {
		return new Promise((resolve) => {
			if (this._loaded) {
				return resolve(true);
			}

			const listener = () => {
				resolve(true);
				this.off("loaded", listener);
			};

			this.on("loaded", listener);
		});
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
