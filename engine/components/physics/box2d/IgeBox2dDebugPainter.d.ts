import IgeEntity from "../../../core/IgeEntity";
import { IgeCanvasRenderingContext2d } from "../../../../types/IgeCanvasRenderingContext2d";
declare class IgeBox2dDebugPainter extends IgeEntity {
    classId: string;
    _entity: IgeEntity;
    _options?: Record<any, any>;
    constructor(entity: IgeEntity, options?: Record<any, any>);
    tick(ctx: IgeCanvasRenderingContext2d): void;
}
export default IgeBox2dDebugPainter;
