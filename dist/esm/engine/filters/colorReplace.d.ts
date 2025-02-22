import type { IgeRgbaArray } from "../../types/IgeRgbaArray.js"
import type { IgeSmartFilter } from "../../types/IgeSmartFilter.js"
export interface IgeFilterColorReplaceData {
    sourceColor: IgeRgbaArray;
    targetColor: IgeRgbaArray;
}
export declare const colorReplace: IgeSmartFilter<IgeFilterColorReplaceData>;
