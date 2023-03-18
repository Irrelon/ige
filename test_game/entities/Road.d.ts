import { Line } from "./base/Line";
import { Building } from "./base/Building";
export declare class Road extends Line {
    classId: string;
    _fromId: string;
    _from?: Building;
    _toId: string;
    _to?: Building;
    constructor(fromId: string, toId: string);
    streamCreateConstructorArgs(): string[];
}
