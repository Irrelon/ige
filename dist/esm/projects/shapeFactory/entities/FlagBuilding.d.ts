import { IgeObject } from "@/engine/core/IgeObject";
import { Building } from "./base/Building";
export declare class FlagBuilding extends Building {
    classId: string;
    constructor(tileX?: number, tileY?: number);
    streamCreateConstructorArgs(): number[];
    _mounted(obj: IgeObject): void;
}
