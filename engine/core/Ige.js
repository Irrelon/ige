import { igeClassStore } from "../igeClassStore.js";
import { isClient, isServer } from "../clientServer.js";
import { igeConfig } from "./config.js";
import { IgeEngine } from "./IgeEngine.js";
import { IgeTextureStore } from "./IgeTextureStore.js";
import { IgeMetrics } from "./IgeMetrics.js";
import { IgeInputComponent } from "../../engine/components/IgeInputComponent.js";
import { IgeObjectRegister } from "./IgeObjectRegister.js";
import { IgeArrayRegister } from "./IgeArrayRegister.js";
import { IgePoint3d } from "./IgePoint3d.js";
import { IgeRouter } from "./IgeRouter.js";
import { IgeDependencies } from "../../engine/core/IgeDependencies.js";
import { IgeTweenController } from "../../engine/core/IgeTweenController.js";
import { IgeTimeController } from "../../engine/core/IgeTimeController.js";
import { IgeUiManagerController } from "../../engine/core/IgeUiManagerController.js";
import { IgeBox2dController } from "../../engine/components/physics/box2d/IgeBox2dController.js";
const version = "3.0.0";
export class Ige {
    constructor() {
        this.app = null;
        this.router = new IgeRouter();
        this.engine = new IgeEngine();
        this.box2d = new IgeBox2dController();
        this.textures = new IgeTextureStore();
        this.input = new IgeInputComponent();
        this.tween = new IgeTweenController();
        this.time = new IgeTimeController();
        this.ui = new IgeUiManagerController();
        this.register = new IgeObjectRegister();
        this.categoryRegister = new IgeArrayRegister("_category", "_categoryRegistered");
        this.groupRegister = new IgeArrayRegister("_group", "_groupRegistered");
        this.dependencies = new IgeDependencies();
        this.metrics = new IgeMetrics();
        this.config = igeConfig;
        this.version = version;
        this.classStore = igeClassStore;
        this._data = {};
        this._watch = [];
        this._drawBounds = false;
        this._pointerPos = new IgePoint3d(); // Could probably be just {x: number, y: number}
        // /**
        //  * Returns an array of all objects that have been assigned
        //  * the passed group name.
        //  * @param {String} groupName The name of the group to return
        //  * all objects for.
        //  */
        // $$$ (groupName: string) {
        // 	return this.groupRegister[groupName] || [];
        // }
        /**
         * Adds a new watch expression to the watch list which will be
         * displayed in the stats overlay during a call to _statsTick().
         * @param {*} evalStringOrObject The expression to evaluate and
         * display the result of in the stats overlay, or an object that
         * contains a "value" property.
         * @returns {number} The index of the new watch expression you
         * just added to the watch array.
         */
        this.watchStart = (evalStringOrObject) => {
            this._watch = this._watch || [];
            this._watch.push(evalStringOrObject);
            return this._watch.length - 1;
        };
        /**
         * Removes a watch expression by its array index.
         * @param {number} index The index of the watch expression to
         * remove from the watch array.
         */
        this.watchStop = (index) => {
            this._watch = this._watch || [];
            this._watch.splice(index, 1);
        };
        if (isClient) {
            this.dependencies.add("network", import("../network/client/IgeNetIoClientController.js").then(({ IgeNetIoClientController: Module }) => {
                this.network = new Module();
            }));
            this.dependencies.add("audio", import("../audio/IgeAudioController.js").then(({ IgeAudioController: Module }) => {
                this.audio = new Module();
            }));
        }
        if (isServer) {
            this.dependencies.add("network", import("../network/server/IgeNetIoServerController.js").then(({ IgeNetIoServerController: Module }) => {
                this.network = new Module();
            }));
        }
        this.dependencies.add("tween", this.tween.isReady());
        this.dependencies.add("input", this.input.isReady());
        this.dependencies.add("time", this.time.isReady());
        this.dependencies.add("ui", this.ui.isReady());
        this.dependencies.markAsSatisfied("engine");
        this.dependencies.markAsSatisfied("box2d");
    }
    isReady() {
        return new Promise((resolve) => {
            this.dependencies.waitFor(["network", "engine", "tween", "time", "ui"], resolve);
        });
    }
    /**
     * Returns an object from the engine's object register by
     * the object's id. If the item passed is not a string id
     * then the item is returned as is. If no item is passed
     * the engine itself is returned.
     * @param {string | Object} item The id of the item to return,
     * or if an object, returns the object as-is.
     */
    $(item) {
        if (typeof item === "string") {
            return this.register.get(item);
        }
        else if (typeof item === "object") {
            return item;
        }
        return undefined;
    }
    /**
     * Returns an array of all objects that have been assigned
     * the passed category name.
     * @param {String} categoryName The name of the category to return
     * all objects for.
     */
    $$(categoryName) {
        return this.categoryRegister.get(categoryName) || [];
    }
    drawBounds(val, recursive = false) {
        if (val === undefined) {
            return this._drawBounds;
        }
        this._drawBounds = val;
        // Loop all the way down the scenegraph and enable bounds for all
        this.engine.drawBounds(val, recursive);
        return this;
    }
    data(key, value) {
        if (value !== undefined) {
            this._data = this._data || {};
            this._data[key] = value;
            return this;
        }
        if (this._data) {
            return this._data[key];
        }
        return null;
    }
}
