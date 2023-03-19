import { IgeBaseClass } from "@/engine/core/IgeBaseClass";
export declare class Server extends IgeBaseClass {
    classId: string;
    constructor();
    init(): Promise<void>;
}
