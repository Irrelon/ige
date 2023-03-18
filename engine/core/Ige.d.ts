import { IgeConfig } from "./config";
import { IgeEngine } from "./IgeEngine";
import { IgeTextureStore } from "./IgeTextureStore";
import { IgeMetrics } from "./IgeMetrics";
import IgeInputComponent from "../components/IgeInputComponent";
import { IgeObjectRegister } from "./IgeObjectRegister";
import { IgeArrayRegister } from "./IgeArrayRegister";
import type { IgeCanRegisterByCategory } from "../../types/IgeCanRegisterByCategory";
import type IgeViewport from "./IgeViewport";
import IgePoint3d from "./IgePoint3d";
import { IgeAudioController } from "../components/audio/IgeAudioController";
import type { IgeNetIoClientComponent } from "../components/network/net.io/IgeNetIoClientComponent";
import type { IgeNetIoServerComponent } from "../components/network/net.io/IgeNetIoServerComponent";
import { IgeObjectWithValueProperty } from "../../types/IgeObjectWithValueProperty";
import { IgeObject } from "./IgeObject";
import { IgeRouter } from "./IgeRouter";
export declare class Ige {
    router: IgeRouter;
    engine: IgeEngine;
    textures: IgeTextureStore;
    metrics: IgeMetrics;
    input: IgeInputComponent;
    audio?: IgeAudioController;
    network?: IgeNetIoClientComponent | IgeNetIoServerComponent;
    register: IgeObjectRegister;
    categoryRegister: IgeArrayRegister<IgeCanRegisterByCategory>;
    groupRegister: IgeArrayRegister<IgeCanRegisterByCategory>;
    client: any;
    server: any;
    config: IgeConfig;
    version: string;
    classStore: Record<string, import("../../types/GenericClass").GenericClass>;
    _globalLogIndent: number;
    _watch: (string | IgeObjectWithValueProperty)[];
    _mouseOverVp?: IgeViewport;
    _mousePos: IgePoint3d;
    constructor();
    init(): void;
    /**
     * Returns an object from the engine's object register by
     * the object's id. If the item passed is not a string id
     * then the item is returned as is. If no item is passed
     * the engine itself is returned.
     * @param {String | Object} item The id of the item to return,
     * or if an object, returns the object as-is.
     */
    $<ObjectType = IgeObject>(item: string | ObjectType | undefined): (import("../../types/IgeCanRegisterById").IgeCanRegisterById & import("../../types/IgeCanBeDestroyed").IgeCanBeDestroyed) | (ObjectType & object) | (ObjectType & null) | undefined;
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
}
