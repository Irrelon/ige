"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeAudioEntity = void 0;
const instance_1 = require("@/engine/instance");
const clientServer_1 = require("@/engine/clientServer");
const IgeAudioItem_1 = require("@/engine/audio/IgeAudioItem");
const IgeEntity_1 = require("@/engine/core/IgeEntity");
const igeClassStore_1 = require("@/engine/igeClassStore");
// Set default data for any audio panner node
const defaultPanner = {
    panningModel: "HRTF",
    distanceModel: "inverse",
    refDistance: 100,
    rolloffFactor: 1,
    maxDistance: 10000,
    coneOuterAngle: 360,
    coneInnerAngle: 360,
    coneOuterGain: 0
};
class IgeAudioEntity extends IgeEntity_1.IgeEntity {
    constructor(audioId, options = {
        started: false,
        loop: false,
        gain: 1,
        panner: defaultPanner
    }) {
        super();
        this.classId = "IgeAudioEntity";
        this._options = {
            started: false,
            loop: false,
            gain: 1,
            panner: defaultPanner
        };
        this._audioId = audioId;
        this._audioInterface = new IgeAudioItem_1.IgeAudioItem(audioId);
        this._options = options;
        if (this._options.relativeTo) {
            this.relativeTo(this._options.relativeTo);
        }
        if (this._options.started) {
            // We take this out of process so that there is time
            // to handle other calls that may modify the audio
            // before playback starts
            setTimeout(() => {
                if (!this._audioInterface)
                    return;
                this._audioInterface.play(this._options.loop);
            }, 1);
        }
    }
    relativeTo(val) {
        var _a;
        if (val !== undefined) {
            const audioInterface = this.audioInterface();
            if (!audioInterface)
                return;
            if (!instance_1.ige.audio || !instance_1.ige.audio._ctx)
                return;
            this._relativeTo = val;
            this._listener = instance_1.ige.audio._ctx.listener;
            // Check if we have a panner node yet or not
            if (!audioInterface.panner()) {
                // Create a panner node for the audio output
                this._panner = new PannerNode(instance_1.ige.audio._ctx, this._options.panner);
                (_a = this.audioInterface()) === null || _a === void 0 ? void 0 : _a.panner(this._panner);
            }
            return this;
        }
        return this._relativeTo;
    }
    /**
     * Gets the playing boolean flag state.
     * @returns {boolean} True if playing, false if not.
     */
    playing() {
        var _a;
        return (_a = this.audioInterface()) === null || _a === void 0 ? void 0 : _a.playing();
    }
    url(url) {
        var _a, _b;
        if (url !== undefined) {
            (_a = this.audioInterface()) === null || _a === void 0 ? void 0 : _a.url(url);
            return this;
        }
        return (_b = this.audioInterface()) === null || _b === void 0 ? void 0 : _b.url();
    }
    /**
     * Gets / sets the id of the audio stream to use for
     * playback.
     * @param {string=} audioId The audio id. Must match
     * a previously registered audio stream that was
     * registered via IgeAudioComponent.register(). You can
     * access the audio component via ige.engine.audio
     * once you have added it as a component to use in the
     * engine.
     * @returns {*}
     */
    audioId(audioId) {
        var _a, _b;
        if (audioId !== undefined) {
            (_a = this.audioInterface()) === null || _a === void 0 ? void 0 : _a.audioId(audioId);
            return this;
        }
        return (_b = this.audioInterface()) === null || _b === void 0 ? void 0 : _b.audioId();
    }
    /**
     * Starts playback of the audio.
     * @param {boolean} loop If true, loops the audio until
     * explicitly stopped by calling stop() or the entity
     * being destroyed.
     * @returns {IgeAudioEntity}
     */
    play(loop = false) {
        var _a;
        (_a = this.audioInterface()) === null || _a === void 0 ? void 0 : _a.play(loop);
        return this;
    }
    /**
     * Stops playback of the audio.
     * @returns {IgeAudioEntity}
     */
    stop() {
        var _a;
        (_a = this.audioInterface()) === null || _a === void 0 ? void 0 : _a.stop();
        return this;
    }
    audioInterface(audio) {
        if (audio !== undefined) {
            this._audioInterface = audio;
            return this;
        }
        return this._audioInterface;
    }
    /**
     * Returns the data sent to each client when the entity
     * is created via the network stream.
     * @returns {*}
     */
    streamCreateConstructorArgs() {
        return [this._audioId, this._options];
    }
    update(ctx, tickDelta) {
        if (this._relativeTo && this._panner) {
            const audioWorldPos = this.worldPosition();
            const relativeToWorldPos = this._relativeTo.worldPosition();
            // Update the audio origin position
            if (this._panner) {
                this._panner.positionX.value = audioWorldPos.x;
                this._panner.positionY.value = -audioWorldPos.y;
                this._panner.positionZ.value = audioWorldPos.z;
            }
            // Update the listener
            if (this._listener) {
                this._listener.positionX.value = relativeToWorldPos.x;
                this._listener.positionY.value = -relativeToWorldPos.y;
                this._listener.positionZ.value = relativeToWorldPos.z;
            }
        }
        super.update(ctx, tickDelta);
    }
    /**
     * Called when the entity is to be destroyed. Stops any
     * current audio stream playback.
     */
    destroy() {
        var _a;
        if (clientServer_1.isClient) {
            (_a = this.audioInterface()) === null || _a === void 0 ? void 0 : _a.stop();
        }
        super.destroy();
        return this;
    }
}
exports.IgeAudioEntity = IgeAudioEntity;
(0, igeClassStore_1.registerClass)(IgeAudioEntity);
