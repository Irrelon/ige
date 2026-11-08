import type { IgeAsset } from "@/engine/core/IgeAsset";
import { IgeEventingClass } from "@/engine/core/IgeEventingClass";

export class IgeAssetRegister<AssetType extends IgeAsset> extends IgeEventingClass {
	classId = "IgeAssetRegister";
	_assetById: Record<string, AssetType> = {};
	_assetsLoading: number = 0;
	_assetsTotal: number = 0;

	exists (id: string): boolean {
		return Boolean(this._assetById[id]);
	}

	get (id: string) {
		if (!this._assetById[id]) throw new Error(`No asset registered with the id: ${id}`);
		return this._assetById[id];
	}

	add (id: string, item: AssetType) {
		if (this._assetById[id]) {
			throw new Error(`Cannot add asset with id ${id} because one with this id already exists!`);
		}

		this._assetsTotal++;
		this._assetById[id] = item;

		if (item._loaded) return;
		this._assetsLoading++;

		// A failed asset counts as finished, so nothing waits for it forever
		item.whenSettled().then(() => {
			this._assetsLoading--;
		});
	}

	remove (id: string) {
		this._assetsTotal--;
		delete this._assetById[id];
	}

	addGroup (group: Record<string, AssetType>) {
		Object.keys(group).forEach((key) => {
			this.add(key, group[key]);
		});
	}

	removeGroup (group: Record<string, AssetType>) {
		Object.keys(group).forEach((key) => {
			this.remove(key);
		});
	}

	removeList (list: AssetType[]) {
		list.forEach((tmpAsset) => tmpAsset.destroy());
	}

	/**
	 * Resolves when every registered asset has loaded or failed (failures
	 * are logged by the asset and don't block).
	 */
	whenLoaded () {
		const promiseArr = Object.values(this._assetById).map((tmpAsset) => {
			return tmpAsset.whenSettled().then(({ asset }) => asset);
		});

		return Promise.all(promiseArr);
	}
}
