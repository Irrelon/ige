import type { IgeObject } from "./IgeObject.js"
import type { IgePoint2d } from "./IgePoint2d.js";
import { IgeRenderer } from "./IgeRenderer.js"
export declare class IgeRenderer2d extends IgeRenderer {
    _updateDevicePixelRatio(): void;
    renderSceneGraph(arr: IgeObject[], bounds: IgePoint2d): boolean;
}
