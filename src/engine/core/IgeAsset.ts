import { IgeEventingClass } from "./IgeEventingClass";
import { IgeCanAsyncLoad } from "@/types/IgeCanAsyncLoad";

export class IgeAsset extends IgeEventingClass implements IgeCanAsyncLoad {
	_loaded: boolean = false;
	_assetId?: string;

	id(id?: string) {
		if (id === undefined) return this._assetId;
		this._assetId = id;
	}

	/**
	 * A promise that resolves to true when the asset has loaded.
	 */
	whenLoaded(): Promise<boolean> {
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

	destroy() {
		return this;
	}
}
