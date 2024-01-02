import { IgeEntity } from "@/engine/core/IgeEntity";
import { JumpGateDefinition } from "../../types/JumpGateDefinition";

export declare class JumpGate extends IgeEntity {
	classId: string;
	_publicGameData: Record<string, any>;
	constructor(publicGameData: JumpGateDefinition["public"]);
	streamCreateConstructorArgs(): Record<string, any>[];
}
