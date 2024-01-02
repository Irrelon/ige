import type { Resource } from "./Resource.js"
import type { Building } from "./base/Building.js"
import { WorkerUnit } from "./base/WorkerUnit.js"
import type { IgePoint3d } from "../../../engine/core/IgePoint3d.js"
import type { IgeCanvasRenderingContext2d } from "../../../types/IgeCanvasRenderingContext2d.js"
export declare class Transporter extends WorkerUnit {
    classId: string;
    _baseId: string;
    _depotAId: string;
    _depotA?: Building;
    _depotBId: string;
    _depotB?: Building;
    _resource?: Resource;
    _state: "spawned" | "traversingPath" | "waiting" | "retrieving" | "transporting" | "movingToHomeLocation";
    _homeLocation?: IgePoint3d;
    _navigateToHomePath?: string[];
    _speed: number;
    constructor(baseId: string, depotAId: string, depotBId: string);
    timeToTarget(sourceX: number, sourceY: number, targetX: number, targetY: number): number;
    streamCreateConstructorArgs(): string[];
    setDepots(): void;
    setRoad(): void;
    retrieveResource(resource?: Resource): void;
    pickUpResource(resource?: Resource): void;
    transportResource(): void;
    dropResource(resource?: Resource): void;
    moveToHomeLocation(): void;
    gotBackHome(): void;
    processPath(): void;
    _updateOnServer(): void;
    update(ctx: IgeCanvasRenderingContext2d, tickDelta: number): void;
}
