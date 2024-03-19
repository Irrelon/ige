"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Ige = void 0;
const exports_1 = require("../../export/exports.js");
const exports_2 = require("../../export/exports.js");
const exports_3 = require("../../export/exports.js");
const exports_4 = require("../../export/exports.js");
const version = "3.0.1";
class Ige {
    constructor() {
        this.app = null;
        this.router = new exports_1.IgeRouter();
        this.engine = new exports_1.IgeEngine();
        this.box2d = new exports_4.IgeBox2dController();
        this.textures = new exports_1.IgeTextureStore();
        this.input = new exports_3.IgeInputComponent();
        this.tween = new exports_1.IgeTweenController();
        this.time = new exports_1.IgeTimeController();
        this.ui = new exports_1.IgeUiManagerController();
        this.register = new exports_1.IgeObjectRegister();
        this.categoryRegister = new exports_1.IgeArrayRegister("_category", "_categoryRegistered");
        this.groupRegister = new exports_1.IgeArrayRegister("_group", "_groupRegistered");
        this.dependencies = new exports_1.IgeDependencies();
        this.metrics = new exports_1.IgeMetrics();
        this.config = exports_1.igeConfig;
        this.version = version;
        this.classStore = exports_2.igeClassStore;
        this._data = {};
        this._watch = [];
        this._drawBounds = false;
        this._pointerPos = new exports_1.IgePoint3d(); // Could probably be just {x: number, y: number}
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
        if (exports_2.isClient) {
            this.dependencies.add("network", Promise.resolve().then(() => __importStar(require("../network/client/IgeNetIoClientController.js"))).then(({ IgeNetIoClientController: Module }) => {
                this.network = new Module();
            }));
            if (!exports_2.isWorker) {
                this.dependencies.add("audio", Promise.resolve().then(() => __importStar(require("../audio/IgeAudioController.js"))).then(({ IgeAudioController: Module }) => {
                    this.audio = new Module();
                }));
            }
        }
        if (exports_2.isServer) {
            this.dependencies.add("network", Promise.resolve().then(() => __importStar(require("../network/server/IgeNetIoServerController.js"))).then(({ IgeNetIoServerController: Module }) => {
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
     * the engine itself is returned. The object is returned
     * by reference so mutations will affect any other references
     * to the object. There is no mutation-safe version of this.
     * @param {string | Object} item The id of the item to return,
     * or if an object, returns the object as-is.
     */
    $(item) {
        if (typeof item === "string") {
            return this.register.get(item);
        }
        return item;
    }
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
    $$(categoryName, immutable = false) {
        if (immutable)
            return (this.categoryRegister.getImmutable(categoryName) || []);
        return (this.categoryRegister.get(categoryName) || []);
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
exports.Ige = Ige;
