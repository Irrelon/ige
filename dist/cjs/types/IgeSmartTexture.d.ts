import { IgeCanvasRenderingContext2d } from "./IgeCanvasRenderingContext2d";
import { IgeEntity } from "@/engine/core/IgeEntity";
import { IgeTexture } from "@/engine/core/IgeTexture";

export interface IgeSmartTexture<ParentType extends IgeEntity = IgeEntity> {
	init?: (texture: IgeTexture) => void;
	render: (ctx: IgeCanvasRenderingContext2d, entity: ParentType, texture?: IgeTexture) => void;
	meta?: Record<string, any>;
}
