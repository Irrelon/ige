import { IgeCanvasRenderingContext2d } from "@/types/IgeCanvasRenderingContext2d";
import { Building } from "./base/Building";
import { WorkerUnit } from "./WorkerUnit";
export declare class Transporter extends WorkerUnit {
    classId: string;
    _depotAId: string;
    _depotA: Building;
    _depotBId: string;
    _depotB: Building;
    constructor(depotAId: string, depotBId: string);
    update(ctx: IgeCanvasRenderingContext2d, tickDelta: number): void;
    streamCreateConstructorArgs(): string[];
}
