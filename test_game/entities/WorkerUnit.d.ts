import { Circle } from "./base/Circle";
import { WorkerUnitType } from "../enums/WorkerUnitType";
export declare class WorkerUnit extends Circle {
    _type: WorkerUnitType;
    constructor(type: WorkerUnitType);
}
