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
    _audioSourceBuffer;
    _bufferNode = null;
    _shouldPlayWhenReady = false;
    _isPersistent = false;
    _loop = false;
    _isPlaying = false;
    _pannerNode;
    _pannerSettings;
    _position;
    _relativeTo;
    _audioSourceId;
    _onEnded;
    _resumePlaybackOffset = 0;
    _startTime = 0;
    constructor() {
        super();
        this._id = newIdHex();
        console.log("IgeAudioControl create", this._id);
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
        if (!ige.audio)
            return;
        if (!this._audioSourceBuffer || !ige.audio._ctx) {
            this.shouldPlayWhenReady(true);
            return;
        }
        if (this.isPlaying())
            return;
        // Create our buffer source node
        this._bufferNode = new AudioBufferSourceNode(ige.audio._ctx);
        this._bufferNode.connect(this._gainNode);
        this._bufferNode.buffer = this._audioSourceBuffer;
        this._bufferNode.loop = this._loop;
        if (playbackFromOffset) {
            // Start playback from the designated location
            this._bufferNode.start(0, playbackFromOffset);
            this._resumePlaybackOffset = ige.audio._ctx.currentTime - playbackFromOffset;
        }
        else {
            // Start playback from our resume location
            this._bufferNode.start(0, this._resumePlaybackOffset);
            this._resumePlaybackOffset = ige.audio._ctx.currentTime - this._resumePlaybackOffset;
            if (this._startTime) {
                this._startTime = this._startTime + (ige.audio._ctx.currentTime - this._startTime);
            }
            else {
                this._startTime = ige.audio._ctx.currentTime;
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
            if (ige.audio._ctx) {
                this._resumePlaybackOffset = ige.audio._ctx.currentTime - this._resumePlaybackOffset;
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
        console.log("IgeAudioControl destroy", this._id);
        this.stop();
        this._pannerNode?.disconnect();
        this._gainNode?.disconnect();
        this._bufferNode?.disconnect();
        ige.audio.removeAudioControl(this._id);
        return this;
    }
}
synthesize(IgeAudioControl, "isPersistent");
synthesize(IgeAudioControl, "isPlaying");
synthesize(IgeAudioControl, "shouldPlayWhenReady");
synthesize(IgeAudioControl, "relativeTo");
synthesize(IgeAudioControl, "onEnded");
synthesize(IgeAudioControl, "pannerSettings");
synthesize(IgeAudioControl, "position");
