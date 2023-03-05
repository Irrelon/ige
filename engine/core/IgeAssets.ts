import IgeEventingClass from "./IgeEventingClass";

export class IgeAssets<AssetType> extends IgeEventingClass {
	_assetById: Record<string, AssetType> = {};
	_assetArr: AssetType[] = [];
	_assetsLoading: number = 0;
	_assetsTotal: number = 0;
	
	getById (id: string) {
		return this._assetById[id];
	}

	onLoadStart (id: string, asset: AssetType) {
		this._assetsLoading++;
		this._assetsTotal++;

		this.emit("loadStart", asset);
	}

	onLoadEnd (id: string, asset: AssetType) {
		this._assetById[id] = asset;
		this._assetArr.push(asset);

		// Decrement the overall loading number
		this._assetsLoading--;
		this.emit("loadEnd", asset);

		// If we've finished...
		if (this._assetsLoading !== 0) {
			return;
		}

		setTimeout(() => {
			this.onAllLoaded();
		}, 100);
	}

	onAllLoaded () {
		// Fire off an event about this
		this.emit("allLoaded");
	}
}