import { IgeComponent } from "../core/IgeComponent";
import { IgeEntity } from "../core/IgeEntity";
import { IgeInterval } from "../core/IgeInterval";
import { IgeEntityBehaviourMethod } from "../../types/IgeEntityBehaviour";
import type { IgeEngine } from "../core/IgeEngine";
export declare class IgeTimeComponent extends IgeComponent<IgeEngine> {
    classId: string;
    componentId: string;
    _updating: boolean;
    _timers: IgeInterval[];
    _additions: IgeInterval[];
    _removals: IgeInterval[];
    constructor(entity: IgeEntity, options?: any);
    addTimer: (timer: IgeInterval) => this;
    removeTimer: (timer: IgeInterval) => this;
    _update: IgeEntityBehaviourMethod;
    _processAdditions: () => this;
    _processRemovals: () => this;
}
