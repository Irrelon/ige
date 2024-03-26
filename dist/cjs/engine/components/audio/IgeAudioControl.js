"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeAudioControl = void 0;
const IgeEventingClass_1 = require("../../core/IgeEventingClass.js");
const instance_1 = require("../../instance.js");
const clientServer_1 = require("../../utils/clientServer.js");
const ids_1 = require("../../utils/ids.js");
const synthesize_1 = require("../../utils/synthesize.js");
/**
 * Handles controlling an audio source. You can use an instance of
 * IgeAudioControl to start or stop playback of audio, but usually
 * you would do this directly via `ige.audio.play()` or by using
 * an `IgeAudioEntity` to allow streaming and further manipulation.
 */
class IgeAudioControl extends IgeEventingClass_1.IgeEventingClass {
    constructor() {
        super();
        this.classId = "IgeAudioControl";
        this._bufferNode = null;
        this._shouldPlayWhenReady = false;
        this._isPersistent = false;
        this._loop = false;
        this._isPlaying = false;
        this._resumePlaybackOffset = 0;
        this._startTime = 0;
        this._id = (0, ids_1.newIdHex)();
        console.log("IgeAudioControl create", this._id);
        if (!instance_1.ige.audio) {
            if (clientServer_1.isServer) {
                throw new Error("Cannot instantiate an IgeAudioControl on the server!");
            }
            throw new Error(`The audio subsystem is not present, did you add the audio controller via ige.uses("audio")?`);
        }
        if (!instance_1.ige.audio._ctx) {
            throw new Error("Cannot instantiate an IgeAudioControl without an audio context!");
        }
        // We are going to create a node graph like this:
        // buffer -> this volume (gain) -> panner -> master volume (gain) -> speaker output
        this._pannerNode = new PannerNode(instance_1.ige.audio._ctx, this._pannerSettings);
        this._pannerNode.connect(instance_1.ige.audio.masterVolumeNode);
        this._gainNode = new GainNode(instance_1.ige.audio._ctx);
        this._gainNode.connect(this._pannerNode);
        this._bufferNode = new AudioBufferSourceNode(instance_1.ige.audio._ctx);
        this._bufferNode.connect(this._gainNode);
    }
    volume(val) {
        if (val === undefined) {
            return this._gainNode.gain.value;
        }
        this._gainNode.gain.value = val;
        return this;
    }
    audioSourceId(audioSourceId) {
        if (audioSourceId === undefined) {
            return this._audioSourceId;
        }
        this._audioSourceId = audioSourceId;
        if (!instance_1.ige.audio || clientServer_1.isServer)
            return this;
        const audioItem = instance_1.ige.audio.get(audioSourceId);
        if (!audioItem || !audioItem.buffer) {
            throw new Error(`The audio asset with id ${audioSourceId} does not exist. Add it with \`new IgeAudioSource(audioSourceId, url);\` first!`);
        }
        this._audioSourceBuffer = audioItem.buffer;
        if (this.shouldPlayWhenReady()) {
            this.play();
        }
        return this;
    }
    /**
     * Plays the audio.
     */
    play(playbackFromOffset) {
        if (!instance_1.ige.audio)
            return;
        if (!this._audioSourceBuffer || !instance_1.ige.audio._ctx) {
            this.shouldPlayWhenReady(true);
            return;
        }
        if (this.isPlaying())
            return;
        // Create our buffer source node
        this._bufferNode = new AudioBufferSourceNode(instance_1.ige.audio._ctx);
        this._bufferNode.connect(this._gainNode);
        this._bufferNode.buffer = this._audioSourceBuffer;
        this._bufferNode.loop = this._loop;
        if (playbackFromOffset) {
            // Start playback from the designated location
            this._bufferNode.start(0, playbackFromOffset);
            this._resumePlaybackOffset = instance_1.ige.audio._ctx.currentTime - playbackFromOffset;
        }
        else {
            // Start playback from our resume location
            this._bufferNode.start(0, this._resumePlaybackOffset);
            this._resumePlaybackOffset = instance_1.ige.audio._ctx.currentTime - this._resumePlaybackOffset;
            if (this._startTime) {
                this._startTime = this._startTime + (instance_1.ige.audio._ctx.currentTime - this._startTime);
            }
            else {
                this._startTime = instance_1.ige.audio._ctx.currentTime;
            }
        }
        // Set internal playing flag
        this.isPlaying(true);
        // Check if we need to do anything when playback ends
        if (this._onEnded) {
            this._bufferNode.onended = this._onEnded;
        }
        this.log(`Audio file (${this._audioSourceId}) playing...`);
    }
    loop(loop) {
        if (loop === undefined) {
            return this._loop;
        }
        this._loop = loop;
        if (this._bufferNode) {
            this._bufferNode.loop = loop;
        }
        return this;
    }
    /**
     * Similar to stop but will keep the current payback progress / location
     * and when play() is called, playback will resume from the current
     * location. If you pause() then stop() then play(), playback will start
     * from the beginning again. Calling stop() will reset the playback
     * location to the start of the audio track.
     */
    pause() {
        if (this._bufferNode) {
            this.log(`Audio file (${this._audioSourceId}) stopping...`);
            this._bufferNode.stop(0);
            this._bufferNode.disconnect();
            if (instance_1.ige.audio._ctx) {
                this._resumePlaybackOffset = instance_1.ige.audio._ctx.currentTime - this._resumePlaybackOffset;
            }
            this._bufferNode = null;
        }
        this.shouldPlayWhenReady(false);
        this.isPlaying(false);
    }
    /**
     * Stops the currently playing audio.
     */
    stop() {
        this.log(`Audio file (${this._audioSourceId}) stopping...`);
        if (this._bufferNode) {
            this._bufferNode.stop(0);
            this._bufferNode.disconnect();
            this._bufferNode = null;
        }
        this._resumePlaybackOffset = 0;
        this._startTime = 0;
        this.shouldPlayWhenReady(false);
        this.isPlaying(false);
    }
    /**
     * Called when the audio control is to be destroyed. Stops any
     * current audio stream playback.
     */
    destroy() {
        var _a, _b, _c;
        console.log("IgeAudioControl destroy", this._id);
        this.stop();
        (_a = this._pannerNode) === null || _a === void 0 ? void 0 : _a.disconnect();
        (_b = this._gainNode) === null || _b === void 0 ? void 0 : _b.disconnect();
        (_c = this._bufferNode) === null || _c === void 0 ? void 0 : _c.disconnect();
        instance_1.ige.audio.removeAudioControl(this._id);
        return this;
    }
}
exports.IgeAudioControl = IgeAudioControl;
(0, synthesize_1.synthesize)(IgeAudioControl, "isPersistent");
(0, synthesize_1.synthesize)(IgeAudioControl, "isPlaying");
(0, synthesize_1.synthesize)(IgeAudioControl, "shouldPlayWhenReady");
(0, synthesize_1.synthesize)(IgeAudioControl, "relativeTo");
(0, synthesize_1.synthesize)(IgeAudioControl, "onEnded");
(0, synthesize_1.synthesize)(IgeAudioControl, "pannerSettings");
(0, synthesize_1.synthesize)(IgeAudioControl, "position");
