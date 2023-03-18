import { igeClassStore } from "../services/igeClassStore";
import { isClient, isServer } from "../services/clientServer";
import { igeConfig } from "./config";
import { IgeEngine } from "./IgeEngine";
import { IgeTextureStore } from "./IgeTextureStore";
import { IgeMetrics } from "./IgeMetrics";
import { IgeInputComponent } from "../components/IgeInputComponent";
import { IgeObjectRegister } from "./IgeObjectRegister";
import { IgeArrayRegister } from "./IgeArrayRegister";
import { IgePoint3d } from "./IgePoint3d";
import { IgeAudioController } from "../components/audio/IgeAudioController";
import { IgeRouter } from "./IgeRouter";
const version = "2.0.0";
export class Ige {
    constructor() {
        this.router = new IgeRouter();
        this.engine = new IgeEngine();
        this.textures = new IgeTextureStore();
        this.metrics = new IgeMetrics();
        this.input = new IgeInputComponent();
        this.register = new IgeObjectRegister();
        this.categoryRegister = new IgeArrayRegister("_category", "_categoryRegistered");
        this.groupRegister = new IgeArrayRegister("_category", "_categoryRegistered");
        this.config = igeConfig;
        this.version = version;
        this.classStore = igeClassStore;
        this._globalLogIndent = 0;
        this._watch = [];
        this._mousePos = new IgePoint3d(); // Could probably be just {x: number, y: number}
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
            import("../components/network/net.io/IgeNetIoClientComponent.js").then(({ IgeNetIoClientComponent: Module }) => {
                this.network = new Module();
            });
            this.audio = new IgeAudioController();
        }
        if (isServer) {
            import("../components/network/net.io/IgeNetIoServerComponent.js").then(({ IgeNetIoServerComponent: Module }) => {
                this.network = new Module();
            });
        }
    }
    init() {
        //this.textures = new IgeTextureStore();
        //this.engine = new IgeEngine();
    }
    /**
     * Returns an object from the engine's object register by
     * the object's id. If the item passed is not a string id
     * then the item is returned as is. If no item is passed
     * the engine itself is returned.
     * @param {String | Object} item The id of the item to return,
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
}
