import type { IgeCanvasRenderingContext2d } from "./IgeCanvasRenderingContext2d";
import type { IgeEntity } from "@/engine/core/IgeEntity";
import type { IgeTexture } from "@/engine/core/IgeTexture";

export interface IgeSmartTexture<ParentType extends IgeEntity = IgeEntity> {
	init?: (texture: IgeTexture) => void;
	render: (ctx: IgeCanvasRenderingContext2d, entity: ParentType, texture?: IgeTexture) => void;
	meta?: Record<string, any>;
}
