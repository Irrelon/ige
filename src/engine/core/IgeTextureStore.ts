import { IgeAssetRegister } from "@/export/exports";
import type { IgeTexture } from "@/export/exports";

export class IgeTextureStore extends IgeAssetRegister<IgeTexture> {
	_textureImageStore: Record<string, ImageBitmap> = {};

	haveAllTexturesLoaded = () => {
		return this._assetsLoading === 0;
	};
}
