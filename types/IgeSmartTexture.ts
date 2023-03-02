import Ige from "../engine/core/Ige";
import IgeEntity from "../engine/core/IgeEntity";

export interface IgeSmartTexture {
    render: (ige: Ige, ctx: CanvasRenderingContext2D, entity: IgeEntity) => void;
}
