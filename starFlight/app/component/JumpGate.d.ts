import { IgeEntity } from "@/engine/core/IgeEntity";
export declare class JumpGate extends IgeEntity {
    classId: string;
    _publicGameData: Record<string, any>;
    constructor(publicGameData?: Record<string, any>);
    streamCreateData(): Record<string, any>;
}
