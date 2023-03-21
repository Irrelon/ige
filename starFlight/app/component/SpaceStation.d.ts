import { IgeEntityBox2d } from "@/engine/components/physics/box2d/IgeEntityBox2d";
export declare class SpaceStation extends IgeEntityBox2d {
    classId: string;
    _publicGameData: Record<string, any>;
    constructor(publicGameData?: Record<string, any>);
    streamCreateData(): Record<string, any>;
}
