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
const IgeAudioEntity_1 = require("./IgeAudioEntity.js");
const IgeAssetRegister_1 = require("../../core/IgeAssetRegister.js");
const instance_1 = require("../../instance.js");
const arrays_1 = require("../../utils/arrays.js");
const clientServer_1 = require("../../utils/clientServer.js");
const enums_1 = require("../../../enums/index.js");
class IgeAudioController extends IgeAssetRegister_1.IgeAssetRegister {
    constructor() {
        super();
        this.classId = "IgeAudioController";
        this._active = false;
        this._disabled = false;
        this._audioBufferStore = {};
        this._playbackArr = [];
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
        this._ctx = this.getContext();
        if (!this._ctx) {
            this.log("No web audio API support, audio is disabled!");
            this._disabled = true;
        }
        if (this._ctx.state === "suspended") {
            this.log("Audio support is available, waiting for user interaction to be allowed to play audio");
        }
        this._masterVolumeNode = this._ctx.createGain();
        this._masterVolumeNode.connect(this._ctx.destination);
        // Set listener orientation to match our 2d plane
        // The setOrientation() method is deprecated but still supported.
        // FireFox has (of writing) currently not provided any other way to set orientation,
        // so we must continue to use this method until that changes
        // TODO: Wait for Firefox to support accessor properties and then update this
        this.setListenerOrientation(Math.cos(0.1), 0, Math.sin(0.1), 0, 1, 0);
        // Register the engine behaviour that will get called at the end of any updates
        // so we can check for entities we need to track and alter the panning of any
        // active audio to pan relative to the entity in question
        instance_1.ige.engine.addBehaviour(enums_1.IgeBehaviourType.postUpdate, "audioPanning", this._onPostUpdate);
        this.log("Web audio API connected successfully");
    }
    setListenerOrientation(x, y, z, xUp, yUp, zUp) {
        if (!this._ctx) {
            this.log("Cannot set listener orientation, the audio context is not initialised", "warning");
            return;
        }
        this._ctx.listener.setOrientation(x, y, z, xUp, yUp, zUp);
    }
    /**
     * When first instantiated the audio context might
     * be in a suspended state because the browser doesn't
     * let us play audio until the user interacts with the
     * elements on the page. This function should be called
     * in an event listener triggered by a user interaction
     * such as a click handler etc.
     */
    interact() {
        if (!this._ctx)
            return false;
        if (this._ctx.state !== "suspended")
            return true;
        void this._ctx.resume().then((...args) => {
            console.log("Audio resume", args);
        });
        return true;
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
    /**
     * Plays audio by its assigned id and returns a promise.
     * If the audio context is unavailable, or we are on the server,
     * the promise resolves immediately with a `false` value.
     *
     * Once playback has ended the promise will resolve with `true`.
     * @param {string} id The id of the audio file to play.
     * @param {IgeAudioPlaybackOptions} [options={}]
     */
    play(id, options = {}) {
        return new Promise((resolve) => {
            if (!clientServer_1.isClient || !this._ctx) {
                resolve(false);
                return;
            }
            const relativeTo = options.relativeTo;
            const gain = typeof options.gain !== "undefined" ? options.gain : 1;
            const loop = typeof options.loop !== "undefined" ? options.loop : false;
            const pannerSettings = typeof options.pannerSettings !== "undefined" ? options.pannerSettings : IgeAudioEntity_1.defaultPannerSettings;
            const audioSource = this.get(id);
            if (!audioSource || !audioSource.buffer) {
                this.log(`Audio file (${id}) could not play, no buffer exists in register for: ${id}`, "warning");
                return;
            }
            if (!this._masterVolumeNode)
                return;
            let pannerNode;
            const bufferNode = this._ctx.createBufferSource();
            if (relativeTo) {
                // Create a panner node for the audio output
                pannerNode = new PannerNode(this._ctx, pannerSettings);
                bufferNode.connect(pannerNode);
                pannerNode.connect(instance_1.ige.audio._masterVolumeNode);
            }
            else {
                bufferNode.connect(this._masterVolumeNode);
            }
            bufferNode.buffer = audioSource.buffer;
            bufferNode.loop = options.loop;
            bufferNode.start(0);
            bufferNode.onended = () => {
                resolve(true);
                (0, arrays_1.arrPullConditional)(this._playbackArr, (item) => item.bufferNode === bufferNode);
            };
            this._playbackArr.push({
                audioId: id,
                bufferNode,
                pannerNode,
                loop
            });
            this.log(`Audio file (${id}) playing...`);
        });
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
            this.log(`Request to load audio file (${url})...`);
            return new Promise((resolve, reject) => {
                const request = new XMLHttpRequest();
                request.open("GET", url, true);
                request.responseType = "arraybuffer";
                // Decode asynchronously
                request.onload = () => {
                    this._loaded(url, request.response)
                        .then((buffer) => {
                        if (!buffer) {
                            return reject(new Error("Could not create audio buffer"));
                        }
                        resolve(buffer);
                    })
                        .catch((err) => {
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
                return buffer;
            })
                .catch((err) => {
                throw new Error(`Failed to decode audio "${url}": ${err}`);
            });
        });
    }
    /**
     * Called after all engine update() scenegraph calls and loops the currently
     * playing audio to ensure that the panning of that audio matches the position
     * of the entity it should emit audio relative to.
     */
    _onPostUpdate() {
        this._playbackArr.forEach((audioPlayback) => {
            if (!audioPlayback.relativeTo || !audioPlayback.position || !audioPlayback.pannerNode)
                return;
            const audioWorldPos = audioPlayback.position;
            const relativeToWorldPos = audioPlayback.relativeTo.worldPosition();
            const pannerNode = audioPlayback.pannerNode;
            // Update the audio origin position
            pannerNode.positionX.value = audioWorldPos.x - relativeToWorldPos.x;
            pannerNode.positionY.value = -audioWorldPos.y - -relativeToWorldPos.y;
            pannerNode.positionZ.value = audioWorldPos.z - relativeToWorldPos.z;
        });
    }
}
exports.IgeAudioController = IgeAudioController;
