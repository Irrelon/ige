import { IgeEngine } from "./IgeEngine.js";
import { igeConfig } from "./config.js";
import { IgeTextures } from "./IgeTextures.js";
import { IgeMetrics } from "./IgeMetrics.js";
import IgeInputComponent from "../components/IgeInputComponent.js";
import { IgeObjectRegister } from "./IgeObjectRegister.js";
import { IgeArrayRegister } from "./IgeArrayRegister.js";
import IgePoint3d from "./IgePoint3d.js";
import { IgeAudioController } from "../components/IgeAudioController.js";
import { isClient, isServer } from "../services/clientServer.js";
const version = "2.0.0";
export class Ige {
    constructor() {
        this.engine = new IgeEngine();
        this.textures = new IgeTextures();
        this.metrics = new IgeMetrics();
        this.input = new IgeInputComponent();
        this.audio = new IgeAudioController();
        this.register = new IgeObjectRegister();
        this.categoryRegister = new IgeArrayRegister("_category", "_categoryRegistered");
        this.groupRegister = new IgeArrayRegister("_category", "_categoryRegistered");
        this.config = igeConfig;
        this.version = version;
        this._mousePos = new IgePoint3d(); // Could probably be just {x: number, y: number}
        if (isClient) {
            import("../components/network/net.io/IgeNetIoClientComponent.js").then(({ IgeNetIoClientComponent: Module }) => {
                this.network = new Module();
            });
        }
        if (isServer) {
            import("../components/network/net.io/IgeNetIoServerComponent.js").then(({ IgeNetIoServerComponent: Module }) => {
                this.network = new Module();
            });
        }
    }
    init() {
        this.engine.createRoot();
        //this.textures = new IgeTextures();
        //this.engine = new IgeEngine();
    }
    /**
     * Returns an object from the engine's object register by
     * the object's id. If the item passed is not a string id
     * then the item is returned as is. If no item is passed
     * the engine itself is returned.
     * @param {String || Object} item The id of the item to return,
     * or if an object, returns the object as-is.
     */
    $(item) {
        if (typeof item === "string") {
            return this.register.get(item);
        }
        else if (typeof item === "object") {
            return item;
        }
        return this;
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
