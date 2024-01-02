import { IgeBaseClass } from "@/engine/core/IgeBaseClass";
import type { IgeCanInit } from "@/types/IgeCanInit";

export declare class Client extends IgeBaseClass implements IgeCanInit {
	classId: string;
	constructor();
	init(): Promise<void>;
}
