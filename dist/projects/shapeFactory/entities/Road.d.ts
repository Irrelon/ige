import type { Building } from "./base/Building.js"
import { Line } from "./base/Line.js"
export declare class Road extends Line {
    classId: string;
    _fromId: string;
    _from?: Building;
    _toId: string;
    _to?: Building;
    constructor(fromId: string, toId: string);
    setLocation(): void;
    streamCreateConstructorArgs(): string[];
}
