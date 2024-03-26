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
const IgeInputComponent_1 = require("../components/IgeInputComponent.js");
const config_1 = require("./config.js");
const IgeArrayRegister_1 = require("./IgeArrayRegister.js");
const IgeDependencies_1 = require("./IgeDependencies.js");
const IgeMetrics_1 = require("./IgeMetrics.js");
const IgeObjectRegister_1 = require("./IgeObjectRegister.js");
const IgePoint3d_1 = require("./IgePoint3d.js");
const IgeRouter_1 = require("./IgeRouter.js");
const IgeTextureStore_1 = require("./IgeTextureStore.js");
const IgeTimeController_1 = require("./IgeTimeController.js");
const clientServer_1 = require("../utils/clientServer.js");
const igeClassStore_1 = require("../utils/igeClassStore.js");
const version = "3.0.2";
class Ige {
    constructor() {
        this.app = null;
        // @ts-ignore
        this.router = new IgeRouter_1.IgeRouter();
        this.textures = new IgeTextureStore_1.IgeTextureStore();
        this.input = new IgeInputComponent_1.IgeInputComponent();
        this.time = new IgeTimeController_1.IgeTimeController();
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
        this._uses = [];
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
    }
    init() {
        // Output our header
        console.log("-----------------------------------------");
        console.log(`Powered by Isogenic Engine`);
        console.log("(C)opyright " + new Date().getFullYear() + " Irrelon Software Limited");
        console.log("https://www.isogenicengine.com");
        console.log("-----------------------------------------");
        this.uses("engine");
        this.uses("input");
        this.uses("time");
    }
    uses(moduleName) {
        this._uses.push(moduleName);
        console.log("Using dependency:", moduleName);
        switch (moduleName) {
            case "input":
                this.dependencies.add("input", this.input.isReady());
                break;
            case "time":
                this.dependencies.add("time", this.time.isReady());
                break;
            case "engine":
                this.dependencies.add("engine", Promise.resolve().then(() => __importStar(require("./IgeEngine.js"))).then(({ IgeEngine: Module }) => {
                    this.engine = new Module();
                }));
                break;
            case "network":
                if (clientServer_1.isClient) {
                    this.dependencies.add("network", Promise.resolve().then(() => __importStar(require("../network/client/IgeNetIoClientController.js"))).then(({ IgeNetIoClientController: Module }) => {
                        this.network = new Module();
                    }));
                }
                if (clientServer_1.isServer) {
                    this.dependencies.add("network", Promise.resolve().then(() => __importStar(require("../network/server/IgeNetIoServerController.js"))).then(({ IgeNetIoServerController: Module }) => {
                        this.network = new Module();
                    }));
                }
                break;
            case "audio":
                if (clientServer_1.isClient && !clientServer_1.isWorker) {
                    this.dependencies.add("audio", Promise.resolve().then(() => __importStar(require("../components/audio/IgeAudioController.js"))).then(({ IgeAudioController: Module }) => {
                        this.audio = new Module();
                        this.dependencies.add("audio", this.audio.isReady());
                    }));
                }
                else {
                    this.dependencies.markAsSatisfied("audio");
                }
                break;
            case "box2d":
                this.dependencies.add("box2d", Promise.resolve().then(() => __importStar(require("../components/physics/box2d/IgeBox2dController.js"))).then(({ IgeBox2dController: Module }) => {
                    this.box2d = new Module();
                }));
                break;
            case "tweening":
                this.dependencies.add("tweening", Promise.resolve().then(() => __importStar(require("./IgeTweenController.js"))).then(({ IgeTweenController: Module }) => {
                    this.tween = new Module();
                    this.dependencies.add("tween", this.tween.isReady());
                }));
                break;
            case "ui":
                this.dependencies.add("ui", Promise.resolve().then(() => __importStar(require("./IgeUiManagerController.js"))).then(({ IgeUiManagerController: Module }) => {
                    this.ui = new Module();
                    this.dependencies.add("ui", this.ui.isReady());
                }));
                break;
            default:
                throw new Error(`Unknown optional module "${moduleName}", please remove your call to ige.uses("${moduleName}")`);
        }
    }
    isReady() {
        return new Promise((resolve) => {
            // ["network", "engine", "tween", "time", "ui"]
            console.log("Waiting for dependencies", this._uses);
            this.dependencies.waitFor(this._uses, resolve);
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
    drawBounds(val, recursive = true) {
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
