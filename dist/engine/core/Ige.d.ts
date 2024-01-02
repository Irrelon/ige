import { IgeArrayRegister } from "./IgeArrayRegister.js"
import { IgeEngine } from "./IgeEngine.js"
import { IgeMetrics } from "./IgeMetrics.js"
import { IgeObjectRegister } from "./IgeObjectRegister.js"
import { IgePoint3d } from "./IgePoint3d.js"
import { IgeRouter } from "./IgeRouter.js"
import { IgeTextureStore } from "./IgeTextureStore.js"
import type { IgeViewport } from "./IgeViewport.js"
import type { IgeAudioController } "../audio/index.js";
import { IgeDependencies } from "./IgeDependencies.js";
import { IgeTimeController } from "./IgeTimeController.js"
import { IgeTweenController } from "./IgeTweenController.js";
import { IgeUiManagerController } from "./IgeUiManagerController.js"
import type { IgeNetIoClientController } from "../network/client/IgeNetIoClientController.js";
import type { IgeNetIoServerController } from "../network/server/IgeNetIoServerController.js"
import type { IgeConfig } from "./config";
import { IgeInputComponent } from "../components/IgeInputComponent.js"
import { IgeBox2dController } from "../components/physics/box2d/IgeBox2dController.js";
import type { IgeCanBeDestroyed } from "../../types/IgeCanBeDestroyed.js"
import type { IgeCanRegisterByCategory } from "../../types/IgeCanRegisterByCategory.js"
import type { IgeCanRegisterById } from "../../types/IgeCanRegisterById.js"
import type { IgeIsReadyPromise } from "../../types/IgeIsReadyPromise.js"
import type { IgeObjectWithValueProperty } from "../../types/IgeObjectWithValueProperty.js"
export declare class Ige implements IgeIsReadyPromise {
    app: any;
    audio?: IgeAudioController;
    router: IgeRouter;
    engine: IgeEngine;
    box2d: IgeBox2dController;
    textures: IgeTextureStore;
    input: IgeInputComponent;
    tween: IgeTweenController;
    time: IgeTimeController;
    ui: IgeUiManagerController;
    network?: IgeNetIoClientController | IgeNetIoServerController;
    register: IgeObjectRegister;
    categoryRegister: IgeArrayRegister<IgeCanRegisterByCategory>;
    groupRegister: IgeArrayRegister<IgeCanRegisterByCategory>;
    dependencies: IgeDependencies;
    metrics: IgeMetrics;
    client: any;
    server: any;
    config: IgeConfig;
    version: string;
    classStore: Record<string, import("../../types/GenericClass").GenericClass>;
    _data: Record<string, any>;
    _watch: (string | IgeObjectWithValueProperty)[];
    _drawBounds: boolean;
    _pointerOverVp?: IgeViewport;
    _pointerPos: IgePoint3d;
    constructor();
    isReady(): Promise<void>;
    /**
     * Returns an object from the engine's object register by
     * the object's id. If the item passed is not a string id
     * then the item is returned as is. If no item is passed
     * the engine itself is returned.
     * @param {string | Object} item The id of the item to return,
     * or if an object, returns the object as-is.
     */
    $<ObjectType extends IgeCanRegisterById & IgeCanBeDestroyed>(item: string | ObjectType | undefined): ObjectType | undefined;
    /**
     * Returns an array of all objects that have been assigned
     * the passed category name.
     * @param {String} categoryName The name of the category to return
     * all objects for.
     */
    $$(categoryName: string): IgeCanRegisterByCategory[];
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
    drawBounds(val?: boolean, recursive?: boolean): boolean | this;
    data(key: string, value: any): this;
    data(key: string): any;
}