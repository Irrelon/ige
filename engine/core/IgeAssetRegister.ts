import IgeEventingClass from "./IgeEventingClass";
import { IgeAsset } from "./IgeAsset";

export class IgeAssetRegister<AssetType extends IgeAsset> extends IgeEventingClass {
	_assetById: Record<string, AssetType> = {};
	_assetsLoading: number = 0;
	_assetsTotal: number = 0;

	get (id: string) {
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

		item.whenLoaded().then(() => {
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
		list.forEach((texture) => texture.destroy());
	}

	whenLoaded () {
		const promiseArr = Object.values(this._assetById).map((tmpIgeTexture) => {
			return tmpIgeTexture.whenLoaded();
		});

		return Promise.all(promiseArr);
	}
}
