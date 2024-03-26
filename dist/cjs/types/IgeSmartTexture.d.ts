import type { IgeCanvasRenderingContext2d } from "./IgeCanvasRenderingContext2d.js"
import type { IgeEntity } from "../engine/core/IgeEntity.js"
import type { IgeTexture } from "../engine/core/IgeTexture.js"
export interface IgeSmartTexture<ParentType extends IgeEntity = IgeEntity> {
    init?: (texture: IgeTexture) => void;
    render: (ctx: IgeCanvasRenderingContext2d, entity: ParentType, texture?: IgeTexture) => void;
    meta?: Record<string, any>;
}
