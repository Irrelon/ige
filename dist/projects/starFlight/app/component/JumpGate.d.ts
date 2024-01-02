import { IgeEntity } from "../../../../engine/core/IgeEntity.js"
import type { JumpGateDefinition } from "../../types/JumpGateDefinition.js"
export declare class JumpGate extends IgeEntity {
    classId: string;
    _publicGameData: Record<string, any>;
    constructor(publicGameData: JumpGateDefinition["public"]);
    streamCreateConstructorArgs(): Record<string, any>[];
}