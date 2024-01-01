"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeAudioController = void 0;
const clientServer_1 = require("../clientServer.js");
const IgeEventingClass_1 = require("../core/IgeEventingClass.js");
class IgeAudioController extends IgeEventingClass_1.IgeEventingClass {
    constructor() {
        super();
        this.classId = "IgeAudioController";
        this._active = false;
        this._disabled = false;
        this._register = {};
        /**
         * Decodes audio data and calls back with an audio buffer.
         * @param {ArrayBuffer} data The audio data to decode.
         * @private
         */
        this._decode = (data) => __awaiter(this, void 0, void 0, function* () {
            if (!this._ctx)
                return;
            return this._ctx.decodeAudioData(data);
        });
        this._active = false;
        this._disabled = false;
        this._register = {};
        this._ctx = this.getContext();
        if (!this._ctx) {
            this.log("No web audio API support, sound is disabled!");
            this._disabled = true;
        }
        this._masterVolumeNode = this._ctx.createGain();
        this._masterVolumeNode.connect(this._ctx.destination);
        // Set listener orientation to match our 2d plane
        this._ctx.listener.setOrientation(Math.cos(0.10), 0, Math.sin(0.10), 0, 1, 0);
        this.log("Web audio API connected successfully");
    }
    /**
     * Gets / sets the master volume for sound output.
     * @param val
     * @returns {*}
     */
    masterVolume(val) {
        if (!this._masterVolumeNode)
            return;
        if (val !== undefined) {
            this._masterVolumeNode.gain.value = val;
            return this;
        }
        return this._masterVolumeNode.gain.value;
    }
    /**
     * Returns an audio context.
     * @returns {*}
     */
    getContext() {
        return new window.AudioContext();
    }
    register(id, url) {
        if (!id) {
            return this._register;
        }
        if (!url) {
            return this._register[id];
        }
        // Assign new audio to register
        this._load(url).then((buffer) => {
            this._register[id] = buffer;
        });
        return this;
    }
    /**
     * Plays audio by its assigned id.
     * @param {string} id The id of the audio file to play.
     * @param {boolean} loop If true, will loop the audio until
     * it is explicitly stopped.
     */
    play(id, loop = false) {
        if (!clientServer_1.isClient || !this._ctx) {
            return;
        }
        const buffer = this.register(id);
        if (!buffer) {
            this.log(`Audio file (${id}) could not play, no buffer exists in register for: ${id}`, "warning");
            return;
        }
        if (!this._masterVolumeNode)
            return;
        const bufferSource = this._ctx.createBufferSource();
        bufferSource.buffer = this.register(id);
        bufferSource.connect(this._masterVolumeNode);
        bufferSource.loop = loop;
        bufferSource.start(0);
        this.log(`Audio file (${id}) playing...`);
    }
    /**
     * Gets / sets the active flag to enable or disable audio support.
     * @param {boolean=} val True to enable audio support.
     * @returns {*}
     */
    active(val) {
        if (val !== undefined && !this._disabled) {
            this._active = val;
            return this;
        }
        return this._active;
    }
    /**
     * Loads an audio file from the given url.
     * @param {string} url The url to load the audio file from.
     * file has loaded or on error.
     */
    _load(url) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                const request = new XMLHttpRequest();
                request.open("GET", url, true);
                request.responseType = "arraybuffer";
                // Decode asynchronously
                request.onload = () => {
                    this._loaded(url, request.response).then((buffer) => {
                        if (!buffer) {
                            return reject(new Error("Could not create audio buffer"));
                        }
                        resolve(buffer);
                    }).catch((err) => {
                        reject(err);
                    });
                };
                request.onerror = (err) => {
                    reject(err);
                };
                request.send();
            });
        });
    }
    _loaded(url, data) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._decode(data)
                .then((buffer) => {
                this.log(`Audio file (${url}) loaded successfully`);
                return buffer;
            }).catch((err) => {
                throw new Error(`Failed to decode audio "${url}": ${err}`);
            });
        });
    }
}
exports.IgeAudioController = IgeAudioController;
