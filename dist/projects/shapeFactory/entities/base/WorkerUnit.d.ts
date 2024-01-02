import { Circle } from "./Circle.js"
import type { WorkerUnitType } from "../../enums/WorkerUnitType.js"
export declare class WorkerUnit extends Circle {
    _type: WorkerUnitType;
    constructor(type: WorkerUnitType);
}
