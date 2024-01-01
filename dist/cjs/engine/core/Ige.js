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
const igeClassStore_1 = require("../igeClassStore");
const clientServer_1 = require("../clientServer");
const config_1 = require("./config");
const IgeEngine_1 = require("./IgeEngine");
const IgeTextureStore_1 = require("./IgeTextureStore");
const IgeMetrics_1 = require("./IgeMetrics");
const IgeInputComponent_1 = require("@/engine/components/IgeInputComponent");
const IgeObjectRegister_1 = require("./IgeObjectRegister");
const IgeArrayRegister_1 = require("./IgeArrayRegister");
const IgePoint3d_1 = require("./IgePoint3d");
const IgeRouter_1 = require("./IgeRouter");
const IgeDependencies_1 = require("@/engine/core/IgeDependencies");
const IgeTweenController_1 = require("@/engine/core/IgeTweenController");
const IgeTimeController_1 = require("@/engine/core/IgeTimeController");
const IgeUiManagerController_1 = require("@/engine/core/IgeUiManagerController");
const IgeBox2dController_1 = require("@/engine/components/physics/box2d/IgeBox2dController");
const version = "3.0.0";
class Ige {
    constructor() {
        this.app = null;
        this.router = new IgeRouter_1.IgeRouter();
        this.engine = new IgeEngine_1.IgeEngine();
        this.box2d = new IgeBox2dController_1.IgeBox2dController();
        this.textures = new IgeTextureStore_1.IgeTextureStore();
        this.input = new IgeInputComponent_1.IgeInputComponent();
        this.tween = new IgeTweenController_1.IgeTweenController();
        this.time = new IgeTimeController_1.IgeTimeController();
        this.ui = new IgeUiManagerController_1.IgeUiManagerController();
        this.register = new IgeObjectRegister_1.IgeObjectRegister();
        this.categoryRegister = new IgeArrayRegister_1.IgeArrayRegister("_category", "_categoryRegistered");
        this.groupRegister = new IgeArrayRegister_1.IgeArrayRegister("_group", "_groupRegistered");
        this.dependencies = new IgeDependencies_1.IgeDependencies();
        this.metrics = new IgeMetrics_1.IgeMetrics();
        this.config = config_1.igeConfig;
        this.version = version;
        this.classStore = igeClassStore_1.igeClassStore;
        this._data = {};
        this._watch = [];
        this._drawBounds = false;
        this._pointerPos = new IgePoint3d_1.IgePoint3d(); // Could probably be just {x: number, y: number}
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
        if (clientServer_1.isClient) {
            this.dependencies.add("network", Promise.resolve().then(() => __importStar(require("../network/client/IgeNetIoClientController.js"))).then(({ IgeNetIoClientController: Module }) => {
                this.network = new Module();
            }));
            if (!clientServer_1.isWorker) {
                this.dependencies.add("audio", Promise.resolve().then(() => __importStar(require("../audio/IgeAudioController.js"))).then(({ IgeAudioController: Module }) => {
                    this.audio = new Module();
                }));
            }
        }
        if (clientServer_1.isServer) {
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
exports.Ige = Ige;
