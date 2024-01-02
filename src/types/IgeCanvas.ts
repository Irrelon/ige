import type { IgeTexture } from "@/engine/core";

export interface IgeCanvas extends OffscreenCanvas {
	_igeTextures: IgeTexture[];
	_loaded: boolean;
	src: string;
}
