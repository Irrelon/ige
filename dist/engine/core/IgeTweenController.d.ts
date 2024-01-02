import type { IgeTween } from "./IgeTween.js"
import { IgeEventingClass } from "./IgeEventingClass.js"
import type { IgeEntityBehaviourMethod } from "../../types/IgeEntityBehaviour.js";
import type { IgeIsReadyPromise } from "../../types/IgeIsReadyPromise.js"
/**
 * This component is already included in the IgeRoot (ige)
 * instance and is not designed for use in any other way!
 * It handles global tween processing on all tweening values.
 */
export declare class IgeTweenController extends IgeEventingClass implements IgeIsReadyPromise {
    static componentTargetClass: string;
    classId: string;
    componentId: string;
    _tweens: IgeTween[];
    _tweening: boolean;
    isReady(): Promise<void>;
    /**
     * Start tweening particular properties for the object.
     * @param {IgeTween} tween The tween to start.
     * @return {number} The index of the added tween or -1 on error.
     */
    start(tween: IgeTween): IgeTween;
    _setupStep(tween: IgeTween, newTime?: boolean): IgeTween;
    /**
     * Removes the specified tween from the active tween list.
     * @param {IgeTween} tween The tween to stop.
     */
    stop(tween: IgeTween): this;
    /**
     * Stop all tweening for the object.
     */
    stopAll(): this;
    /**
     * Enable tweening for the object.
     */
    enable(): this;
    /**
     * Disable tweening for the object.
     */
    disable(): this;
    /**
     * Process tweening for the object.
     */
    update: IgeEntityBehaviourMethod;
}
