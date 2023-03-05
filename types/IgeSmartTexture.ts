import Ige from "../engine/core/Ige";
import IgeEntity from "../engine/core/IgeEntity";
import IgeTexture from "../engine/core/IgeTexture";

export interface IgeSmartTexture {
    init?: (texture: IgeTexture) => void;
    render: (ige: Ige, ctx: CanvasRenderingContext2D, entity: IgeEntity, texture: IgeTexture) => void;
}
