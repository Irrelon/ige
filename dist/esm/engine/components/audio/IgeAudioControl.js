import { IgeEventingClass } from "../../core/IgeEventingClass.js"
import { ige } from "../../instance.js"
import { isServer } from "../../utils/clientServer.js"
import { newIdHex } from "../../utils/ids.js"
import { synthesize } from "../../utils/synthesize.js"
/**
 * Handles controlling an audio source. You can use an instance of
 * IgeAudioControl to start or stop playback of audio, but usually
 * you would do this directly via `ige.audio.play()` or by using
 * an `IgeAudioEntity` to allow streaming and further manipulation.
 */
export class IgeAudioControl extends IgeEventingClass {
    classId = "IgeAudioControl";
    _id;
    _gainNode;
    _bufferNode;
    _playWhenReady = false;
    _isPersistent = false;
    _loop = false;
    _isPlaying = false;
    _pannerNode;
    _pannerSettings;
    _position;
    _relativeTo;
    _audioSourceId;
    _onEnded;
    constructor() {
        super();
        this._id = newIdHex();
        if (!ige.audio) {
            if (isServer) {
                throw new Error("Cannot instantiate an IgeAudioControl on the server!");
            }
            throw new Error(`The audio subsystem is not present, did you add the audio controller via ige.uses("audio")?`);
        }
        if (!ige.audio._ctx) {
            throw new Error("Cannot instantiate an IgeAudioControl without an audio context!");
        }
        // We are going to create a node graph like this:
        // buffer -> this volume (gain) -> panner -> master volume (gain) -> speaker output
        this._pannerNode = new PannerNode(ige.audio._ctx, this._pannerSettings);
        this._pannerNode.connect(ige.audio.masterVolumeNode);
        this._gainNode = new GainNode(ige.audio._ctx);
        this._gainNode.connect(this._pannerNode);
        this._bufferNode = new AudioBufferSourceNode(ige.audio._ctx);
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
        if (!ige.audio || isServer)
            return this;
        const audioItem = ige.audio.get(audioSourceId);
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
        if (!ige.audio)
            return;
        if (!this._bufferNode.buffer || !ige.audio._ctx) {
            this._playWhenReady = true;
            return;
        }
        if (this._pannerNode) {
            // Connect through the panner
            this._bufferNode.connect(this._pannerNode);
            this._pannerNode.connect(ige.audio.masterVolumeNode);
        }
        else {
            // Connect directly to the destination
            this._bufferNode.connect(ige.audio.masterVolumeNode);
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
        ige.audio.removePlaybackControl(this._id);
        return this;
    }
}
synthesize(IgeAudioControl, "isPersistent");
synthesize(IgeAudioControl, "isPlaying");
synthesize(IgeAudioControl, "playWhenReady");
synthesize(IgeAudioControl, "relativeTo");
synthesize(IgeAudioControl, "onEnded");
synthesize(IgeAudioControl, "pannerSettings");
synthesize(IgeAudioControl, "position");
