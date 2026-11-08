import { IgeBaseClass } from "../../engine/core/IgeBaseClass.js"
import type { IgeCanInit } from "../../types/IgeCanInit.js"
export declare class Client extends IgeBaseClass implements IgeCanInit {
    classId: string;
    constructor();
    init(): Promise<void>;
}
