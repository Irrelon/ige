import type { IgeInterval } from "../../export/exports.js"
import { IgeEventingClass } from "../../export/exports.js"
import type { IgeEntityBehaviourMethod } from "../../export/exports.js"
import type { IgeIsReadyPromise } from "../../export/exports.js"
export declare class IgeTimeController extends IgeEventingClass implements IgeIsReadyPromise {
    static componentTargetClass: string;
    classId: string;
    componentId: string;
    _updating: boolean;
    _timers: IgeInterval[];
    _additions: IgeInterval[];
    _removals: IgeInterval[];
    isReady(): Promise<void>;
    addTimer: (timer: IgeInterval) => this;
    removeTimer: (timer: IgeInterval) => this;
    _update: IgeEntityBehaviourMethod;
    _processAdditions: () => this;
    _processRemovals: () => this;
}
