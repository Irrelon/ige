import type { IgeTexture } from "@/engine/core/IgeTexture";
import type { IgeCanvas } from "@/types/IgeCanvas";

declare global {
	interface ImageBitmap {
		_igeTextures: IgeTexture[];
		_loaded: boolean;
		src: string;
	}
}

export type IgeImage = ImageBitmap | IgeCanvas;
