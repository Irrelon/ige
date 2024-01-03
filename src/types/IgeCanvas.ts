import type { IgeTexture } from "@/export/exports";

export interface IgeCanvas extends OffscreenCanvas {
	_igeTextures: IgeTexture[];
	_loaded: boolean;
	src: string;
}
