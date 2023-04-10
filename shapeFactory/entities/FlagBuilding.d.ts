import { Flag } from "./base/Flag";
import { IgeObject } from "@/engine/core/IgeObject";
export declare class FlagBuilding extends Flag {
    classId: string;
    constructor(tileX?: number, tileY?: number);
    streamCreateConstructorArgs(): number[];
    _mounted(obj: IgeObject): void;
}
