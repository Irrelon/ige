import { InfoWindow } from "./InfoWindow.js"
import { IgeUiLabel } from "../../../../../engine/ui/IgeUiLabel.js"
import type { IgeCanvasRenderingContext2d } from "../../../../../types/IgeCanvasRenderingContext2d.js"
export declare class MessageWindow extends InfoWindow {
    classId: string;
    _msgs: IgeUiLabel[];
    _options: {
        messageFont?: string;
        messageColor?: string;
    };
    constructor(options?: {});
    addMsg(msg: string): void;
    tick(ctx: IgeCanvasRenderingContext2d, dontTransform?: boolean): void;
}
