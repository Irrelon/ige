import { IgeUiElement } from "@/engine/core/IgeUiElement";
export declare class IgeUiProgressBar extends IgeUiElement {
    classId: string;
    constructor();
    barBackColor(val: any): any;
    barColor(val: any): any;
    barBorderColor(val: any): any;
    barText(pre: any, post: any, color: any, percent: any): any;
    min(val: any): any;
    max(val: any): any;
    progress(val: any): any;
    bindData(obj: any, propName: any): this;
    render(ctx: any): void;
    tick(ctx: any): void;
}
