import IgeBaseClass from "../../engine/core/IgeBaseClass";
import { IgeCanInit } from "../../types/IgeCanInit";
export declare class Client extends IgeBaseClass implements IgeCanInit {
    classId: string;
    constructor();
    init(): Promise<void>;
}
