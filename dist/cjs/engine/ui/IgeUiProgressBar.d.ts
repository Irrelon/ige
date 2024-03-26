import type { IgeObject } from "../core/IgeObject.js"
import { IgeUiElement } from "../core/IgeUiElement.js"
import type { IgeCanvasRenderingContext2d } from "../../types/IgeCanvasRenderingContext2d.js"
export declare class IgeUiProgressBar extends IgeUiElement {
    classId: string;
    private _bindDataObject?;
    private _bindDataProperty?;
    constructor();
    private _min;
    get min(): number;
    set min(value: number);
    private _max;
    get max(): number;
    set max(value: number);
    private _progress;
    get progress(): number;
    set progress(value: number);
    private _barColor;
    get barColor(): string;
    set barColor(value: string);
    private _barText;
    get barText(): {
        pre: string;
        post: string;
        color: string;
        percent?: boolean | undefined;
        func?: ((progress: number, max: number) => any) | undefined;
    };
    set barText({ pre, post, color, percent, func }: {
        pre: string;
        post: string;
        color: string;
        percent?: boolean | undefined;
        func?: ((progress: number, max: number) => any) | undefined;
    });
    private _barBackColor?;
    get barBackColor(): string | undefined;
    set barBackColor(value: string | undefined);
    private _barBorderColor?;
    get barBorderColor(): string | undefined;
    set barBorderColor(value: string | undefined);
    set bindData({ obj, propName }: {
        obj: IgeObject;
        propName: string;
    });
    render: (ctx: IgeCanvasRenderingContext2d) => void;
    tick(ctx: IgeCanvasRenderingContext2d): void;
}
