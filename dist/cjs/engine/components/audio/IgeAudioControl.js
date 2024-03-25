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
        this._playWhenReady = false;
        this._isPersistent = false;
        this._loop = false;
        this._isPlaying = false;
        this._id = (0, ids_1.newIdHex)();
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
        this._bufferNode.buffer = audioItem.buffer;
        if (this._playWhenReady) {
            this.play();
        }
        return this;
    }
    /**
     * Plays the audio.
     */
    play() {
        if (!instance_1.ige.audio)
            return;
        if (!this._bufferNode.buffer || !instance_1.ige.audio._ctx) {
            this._playWhenReady = true;
            return;
        }
        if (this._pannerNode) {
            // Connect through the panner
            this._bufferNode.connect(this._pannerNode);
            this._pannerNode.connect(instance_1.ige.audio.masterVolumeNode);
        }
        else {
            // Connect directly to the destination
            this._bufferNode.connect(instance_1.ige.audio.masterVolumeNode);
        }
        this._bufferNode.loop = this.loop();
        this._bufferNode.start(0);
        this._isPlaying = true;
        this.log(`Audio file (${this._audioSourceId}) playing...`);
    }
    loop(loop) {
        if (loop === undefined) {
            return this._loop;
        }
        this._loop = loop;
        this._bufferNode.loop = loop;
        return this;
    }
    /**
     * Stops the currently playing audio.
     */
    stop() {
        if (this._bufferNode) {
            this.log(`Audio file (${this._audioSourceId}) stopping...`);
            this._bufferNode.stop(0);
        }
        this._playWhenReady = false;
        this._isPlaying = false;
    }
    /**
     * Called when the audio control is to be destroyed. Stops any
     * current audio stream playback.
     */
    destroy() {
        this.stop();
        instance_1.ige.audio.removePlaybackControl(this._id);
        return this;
    }
}
exports.IgeAudioControl = IgeAudioControl;
(0, synthesize_1.synthesize)(IgeAudioControl, "isPersistent");
(0, synthesize_1.synthesize)(IgeAudioControl, "isPlaying");
(0, synthesize_1.synthesize)(IgeAudioControl, "playWhenReady");
(0, synthesize_1.synthesize)(IgeAudioControl, "relativeTo");
(0, synthesize_1.synthesize)(IgeAudioControl, "onEnded");
(0, synthesize_1.synthesize)(IgeAudioControl, "pannerSettings");
(0, synthesize_1.synthesize)(IgeAudioControl, "position");
