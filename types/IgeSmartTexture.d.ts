import IgeTexture from "../engine/core/IgeTexture";
import { IgeCanvasRenderingContext2d } from "./IgeCanvasRenderingContext2d";
import { IgeObject } from "../engine/core/IgeObject";
export interface IgeSmartTexture<ParentType extends IgeObject = IgeObject> {
    init?: (texture: IgeTexture) => void;
    render: (ctx: IgeCanvasRenderingContext2d, entity: ParentType, texture?: IgeTexture) => void;
    meta?: Record<string, any>;
}
