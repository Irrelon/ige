import { Building } from "./base/Building.js"
import type { IgeObject } from "../../../engine/core/IgeObject.js"
export declare class FlagBuilding extends Building {
    classId: string;
    constructor(tileX?: number, tileY?: number);
    streamCreateConstructorArgs(): number[];
    _mounted(obj: IgeObject): void;
}
