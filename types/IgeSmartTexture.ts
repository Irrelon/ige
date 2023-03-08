import { Ige } from "../engine/core/Ige";
import IgeEntity from "../engine/core/IgeEntity";
import IgeTexture from "../engine/core/IgeTexture";
import { IgeCanvasRenderingContext2d } from "./IgeCanvasRenderingContext2d";

export interface IgeSmartTexture {
    init?: (texture: IgeTexture) => void;
    render: (ige: Ige, ctx: IgeCanvasRenderingContext2d, entity: IgeEntity, texture?: IgeTexture) => void;
}
