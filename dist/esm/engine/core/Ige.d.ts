import type { IgeAudioController } from "../components/audio/IgeAudioController.js"
import { IgeInputComponent } from "../components/IgeInputComponent.js";
import type { IgeBox2dController } from "../components/physics/box2d/IgeBox2dController.js"
import { IgeArrayRegister } from "./IgeArrayRegister.js";
import { IgeDependencies } from "./IgeDependencies.js"
import type { IgeEngine } from "./IgeEngine.js";
import { IgeMetrics } from "./IgeMetrics.js"
import { IgeObjectRegister } from "./IgeObjectRegister.js";
import { IgePoint3d } from "./IgePoint3d.js"
import { IgeRouter } from "./IgeRouter.js";
import { IgeTextureStore } from "./IgeTextureStore.js"
import { IgeTimeController } from "./IgeTimeController.js";
import type { IgeTweenController } from "./IgeTweenController.js"
import type { IgeUiManagerController } from "./IgeUiManagerController.js";
import type { IgeViewport } from "./IgeViewport.js"
import type { IgeNetIoClientController } from "../network/client/IgeNetIoClientController.js";
import type { IgeNetIoServerController } from "../network/server/IgeNetIoServerController.js"
import type { IgeCanRegisterAndCanDestroy } from "../../types/IgeCanRegisterAndCanDestroy.js";
import type { IgeCanRegisterByCategory } from "../../types/IgeCanRegisterByCategory.js"
import type { IgeConfig } from "../../types/IgeConfig.js"
import type { IgeIsReadyPromise } from "../../types/IgeIsReadyPromise.js"
import type { IgeObjectWithValueProperty } from "../../types/IgeObjectWithValueProperty.js"
export declare class Ige implements IgeIsReadyPromise {
    app: any;
    audio: IgeAudioController;
    router: IgeRouter;
    box2d: IgeBox2dController;
    network: IgeNetIoClientController | IgeNetIoServerController;
    tween: IgeTweenController;
    ui: IgeUiManagerController;
    engine: IgeEngine;
    textures: IgeTextureStore;
    input: IgeInputComponent;
    time: IgeTimeController;
    register: IgeObjectRegister;
    categoryRegister: IgeArrayRegister<IgeCanRegisterByCategory>;
    groupRegister: IgeArrayRegister<IgeCanRegisterByCategory>;
    dependencies: IgeDependencies;
    metrics: IgeMetrics;
    client: any;
    server: any;
    config: IgeConfig;
    version: string;
    classStore: Record<string, import("../../index.js").IgeGenericClass>;
    _data: Record<string, any>;
    _watch: (string | IgeObjectWithValueProperty)[];
    _drawBounds: boolean;
    _uses: string[];
    _pointerOverVp?: IgeViewport;
    _pointerPos: IgePoint3d;
    init(): void;
    uses(moduleName: string): void;
    isReady(): Promise<void>;
    /**
     * Returns an object from the engine's object register by
     * the object's id. If the item passed is not a string id
     * then the item is returned as is. If no item is passed
     * the engine itself is returned. The object is returned
     * by reference so mutations will affect any other references
     * to the object. There is no mutation-safe version of this.
     * @param {string | Object} item The id of the item to return,
     * or if an object, returns the object as-is.
     */
    $<ObjectType extends IgeCanRegisterAndCanDestroy | undefined>(item: string | IgeCanRegisterAndCanDestroy | undefined): ObjectType;
    /**
     * Returns an array of all objects that have been assigned
     * the passed category name. By default, the returned array
     * is by reference, so you only need to get this array once,
     * and it will receive updates when other objects are added
     * to a category. Use the `immutable` flag to control this.
     * @param {String} categoryName The name of the category to return
     * all objects for.
     * @param {boolean} [immutable=false] If true, returns a mutation-safe
     * array where mutations to the array will not affect the underlying
     * reference.
     */
    $$<ReturnType extends IgeCanRegisterByCategory | undefined = IgeCanRegisterByCategory>(categoryName: string, immutable?: boolean): ReturnType[];
    /**
     * Adds a new watch expression to the watch list which will be
     * displayed in the stats overlay during a call to _statsTick().
     * @param {*} evalStringOrObject The expression to evaluate and
     * display the result of in the stats overlay, or an object that
     * contains a "value" property.
     * @returns {number} The index of the new watch expression you
     * just added to the watch array.
     */
    watchStart: (evalStringOrObject: string | IgeObjectWithValueProperty) => number;
    /**
     * Removes a watch expression by its array index.
     * @param {number} index The index of the watch expression to
     * remove from the watch array.
     */
    watchStop: (index: number) => void;
    /**
     * Gets / sets the boolean flag determining if this object should have
     * its bounds drawn when the bounds for all objects are being drawn.
     * In order for bounds to be drawn the viewport the object is being drawn
     * to must also have draw bounds enabled.
     * @example #Enable draw bounds
     *     var entity = new IgeEntity();
     *     entity.drawBounds(true);
     * @example #Disable draw bounds
     *     var entity = new IgeEntity();
     *     entity.drawBounds(false);
     * @example #Get the current flag value
     *     console.log(entity.drawBounds());
     */
    drawBounds(val?: boolean, recursive?: boolean): boolean | this;
    data<ValueType = any>(key: string, value: ValueType): this;
    data<ValueType = any>(key: string): ValueType;
}
