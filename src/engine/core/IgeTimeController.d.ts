import { IgeInterval } from "./IgeInterval";
import { IgeEntityBehaviourMethod } from "@/types/IgeEntityBehaviour";
import { IgeIsReadyPromise } from "@/types/IgeIsReadyPromise";
import { IgeEventingClass } from "@/engine/core/IgeEventingClass";
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
