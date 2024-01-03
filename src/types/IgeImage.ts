import type { IgeTexture } from "@/export/exports";
import type { IgeCanvas } from "@/export/exports";

declare global {
	interface ImageBitmap {
		_igeTextures: IgeTexture[];
		_loaded: boolean;
		src: string;
	}
}

export type IgeImage = ImageBitmap | IgeCanvas;
