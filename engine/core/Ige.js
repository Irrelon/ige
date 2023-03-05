import { IgeEngine } from "./IgeEngine.js";
import { igeConfig } from "./config.js";
import { IgeTextures } from "./IgeTextures.js";
import { IgeMetrics } from "./IgeMetrics.js";
const version = "2.0.0";
export class Ige {
    constructor() {
        this.metrics = new IgeMetrics();
        this.config = igeConfig;
        this.version = version;
        this.isServer = (typeof (module) !== 'undefined' && typeof (module.exports) !== 'undefined' && typeof window === 'undefined');
        this.isClient = !this.isServer;
    }
    init() {
        this.textures = new IgeTextures();
        this.engine = new IgeEngine();
    }
}
