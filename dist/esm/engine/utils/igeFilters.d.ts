import type { IgeCanvasRenderingContext2d } from "../../types/IgeCanvasRenderingContext2d.js"
import type { IgeSmartFilter } from "../../types/IgeSmartFilter.js"
export type IgeFilterHelperFunction = (...args: any[]) => any;
export declare class IgeFilters {
    filter: Record<string, IgeSmartFilter>;
    helper: Record<string, IgeFilterHelperFunction>;
    tmpCanvas?: OffscreenCanvas;
    tmpCtx?: IgeCanvasRenderingContext2d | null;
    constructor();
    getFilter(name: string): IgeSmartFilter | undefined;
    registerFilter(name: string, filter: IgeSmartFilter): void;
    getHelper(name: string): IgeFilterHelperFunction | undefined;
    registerHelper(name: string, filter: IgeFilterHelperFunction): void;
}
export declare const igeFilters: IgeFilters;
