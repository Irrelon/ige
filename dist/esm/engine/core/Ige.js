import { IgeInputComponent } from "../components/IgeInputComponent.js"
import { igeConfig } from "./config.js";
import { IgeArrayRegister } from "./IgeArrayRegister.js"
import { IgeDependencies } from "./IgeDependencies.js";
import { IgeMetrics } from "./IgeMetrics.js"
import { IgeObjectRegister } from "./IgeObjectRegister.js";
import { IgePoint3d } from "./IgePoint3d.js"
import { IgeRouter } from "./IgeRouter.js";
import { IgeTextureStore } from "./IgeTextureStore.js"
import { IgeTimeController } from "./IgeTimeController.js";
import { isClient, isServer, isWorker } from "../utils/clientServer.js"
import { igeClassStore } from "../utils/igeClassStore.js";
const version = "3.0.2";
export class Ige {
    app = null;
    // @ts-ignore
    audio;
    // @ts-ignore
    router = new IgeRouter();
    // @ts-ignore
    box2d;
    // @ts-ignore
    network;
    // @ts-ignore
    tween;
    // @ts-ignore
    ui;
    // @ts-ignore
    engine;
    textures = new IgeTextureStore();
    input = new IgeInputComponent();
    time = new IgeTimeController();
    register = new IgeObjectRegister();
    categoryRegister = new IgeArrayRegister("_category", "_categoryRegistered");
    groupRegister = new IgeArrayRegister("_group", "_groupRegistered");
    dependencies = new IgeDependencies();
    metrics = new IgeMetrics();
    client;
    server;
    config = igeConfig;
    version = version;
    classStore = igeClassStore;
    _data = {};
    _watch = [];
    _drawBounds = false;
    _uses = [];
    // TODO: Questionable properties, think about them and potentially move,
    //    were these added to support the editor component?
    _pointerOverVp;
    _pointerPos = new IgePoint3d(); // Could probably be just {x: number, y: number}
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
                this.dependencies.add("engine", import("./IgeEngine.js").then(({ IgeEngine: Module }) => {
                    this.engine = new Module();
                }));
                break;
            case "network":
                if (isClient) {
                    this.dependencies.add("network", import("../network/client/IgeNetIoClientController.js").then(({ IgeNetIoClientController: Module }) => {
                        this.network = new Module();
                    }));
                }
                if (isServer) {
                    this.dependencies.add("network", import("../network/server/IgeNetIoServerController.js").then(({ IgeNetIoServerController: Module }) => {
                        this.network = new Module();
                    }));
                }
                break;
            case "audio":
                if (isClient && !isWorker) {
                    this.dependencies.add("audio", import("../components/audio/IgeAudioController.js").then(({ IgeAudioController: Module }) => {
                        this.audio = new Module();
                        this.dependencies.add("audio", this.audio.isReady());
                    }));
                }
                else {
                    this.dependencies.markAsSatisfied("audio");
                }
                break;
            case "box2d":
                this.dependencies.add("box2d", import("../components/physics/box2d/IgeBox2dController.js").then(({ IgeBox2dController: Module }) => {
                    this.box2d = new Module();
                }));
                break;
            case "tweening":
                this.dependencies.add("tweening", import("./IgeTweenController.js").then(({ IgeTweenController: Module }) => {
                    this.tween = new Module();
                    this.dependencies.add("tween", this.tween.isReady());
                }));
                break;
            case "ui":
                this.dependencies.add("ui", import("./IgeUiManagerController.js").then(({ IgeUiManagerController: Module }) => {
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
    watchStart = (evalStringOrObject) => {
        this._watch = this._watch || [];
        this._watch.push(evalStringOrObject);
        return this._watch.length - 1;
    };
    /**
     * Removes a watch expression by its array index.
     * @param {number} index The index of the watch expression to
     * remove from the watch array.
     */
    watchStop = (index) => {
        this._watch = this._watch || [];
        this._watch.splice(index, 1);
    };
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
