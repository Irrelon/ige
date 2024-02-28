import type { IgeCanvasRenderingContext2d } from "./IgeCanvasRenderingContext2d.js"
import type { IgeCanvasRenderingContext3d } from "./IgeCanvasRenderingContext3d.js"
export type IgeRendererMode = "2d" | "webgl" | "webgpu";
export interface IgeRendererInterface {
    _mode?: IgeRendererMode;
    _canvasElement?: HTMLCanvasElement;
    _canvasContext2d?: IgeCanvasRenderingContext2d | null;
    _canvasContext3d?: IgeCanvasRenderingContext3d | null;
}
