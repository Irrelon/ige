import IgeUiElement from "../core/IgeUiElement";
import { IgeCanvasRenderingContext2d } from "../../types/IgeCanvasRenderingContext2d";
declare class IgeUiColumn extends IgeUiElement {
    classId: string;
    tick(ctx: IgeCanvasRenderingContext2d): void;
}
export default IgeUiColumn;
