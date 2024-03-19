import { IgeArrayRegister, igeConfig, IgeDependencies, IgeEngine, IgeMetrics, IgeObjectRegister, IgePoint3d, IgeRouter, IgeTextureStore, IgeTimeController, IgeTweenController, IgeUiManagerController } from "../../export/exports.js"
import { igeClassStore, isClient, isServer, isWorker } from "../../export/exports.js"
import { IgeInputComponent } from "../../export/exports.js"
import { IgeBox2dController } from "../../export/exports.js"
const version = "3.0.1";
export class Ige {
    app = null;
    audio;
    router = new IgeRouter();
    engine = new IgeEngine();
    box2d = new IgeBox2dController();
    textures = new IgeTextureStore();
    input = new IgeInputComponent();
    tween = new IgeTweenController();
    time = new IgeTimeController();
    ui = new IgeUiManagerController();
    network;
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
    // Questionable properties, think about them and potentially move
    _pointerOverVp;
    _pointerPos = new IgePoint3d(); // Could probably be just {x: number, y: number}
    constructor() {
        if (isClient) {
            this.dependencies.add("network", import("../network/client/IgeNetIoClientController.js").then(({ IgeNetIoClientController: Module }) => {
                this.network = new Module();
            }));
            if (!isWorker) {
                this.dependencies.add("audio", import("../audio/IgeAudioController.js").then(({ IgeAudioController: Module }) => {
                    this.audio = new Module();
                }));
            }
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
