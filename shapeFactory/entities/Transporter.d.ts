import { IgeCanvasRenderingContext2d } from "@/types/IgeCanvasRenderingContext2d";
import { WorkerUnit } from "./base/WorkerUnit";
import type { Building } from "./base/Building";
import type { Resource } from "./Resource";
export declare class Transporter extends WorkerUnit {
    classId: string;
    _depotAId: string;
    _depotA?: Building;
    _depotBId: string;
    _depotB?: Building;
    _resource?: Resource;
    _state: "idle" | "retrieving" | "transporting" | "returning";
    constructor(depotAId: string, depotBId: string);
    setDepots(): void;
    retrieveResource(resource?: Resource): void;
    pickUpResource(resource?: Resource): void;
    dropResource(resource?: Resource): void;
    update(ctx: IgeCanvasRenderingContext2d, tickDelta: number): void;
    streamCreateConstructorArgs(): string[];
}
