import { IgeEventingClass } from "../core/IgeEventingClass.js"
import { ige } from "../instance.js";
export class IgeAudioItem extends IgeEventingClass {
    classId = "IgeAudioItem";
    _url;
    _buffer;
    _bufferSource;
    _playWhenReady = false;
    _loaded = false;
    _loop = false;
    _playing = false;
    _audioId;
    _panner;
    constructor(audioId) {
        super();
        if (audioId) {
            this.audioId(audioId);
        }
    }
    playing(val) {
        if (val !== undefined) {
            this._playing = val;
            return this;
        }
        return this._playing;
    }
    audioId(audioId) {
        if (audioId === undefined) {
            return this._audioId;
        }
        if (!ige.audio)
            return this;
        this._audioId = audioId;
        this.buffer(ige.audio.register(audioId));
        return this;
    }
    url(url) {
        if (url === undefined) {
            return this._url;
        }
        this._url = url;
        if (!ige.audio)
            return this;
        ige.audio
            ._load(url)
            .then((buffer) => {
            this.buffer(buffer);
        })
            .catch((err) => {
            throw new Error(`Unable to load audio: ${err}`);
        });
        return this;
    }
    buffer(buffer) {
        if (buffer === undefined) {
            return this._buffer;
        }
        this._buffer = buffer;
        if (this._playWhenReady) {
            this.play(this._loop);
        }
        return this;
    }
    panner(val) {
        if (val === undefined) {
            return this._panner;
        }
        this._panner = val;
        if (this._bufferSource && ige.audio) {
            // Make sure we include the panner in the connections
            this._bufferSource.connect(this._panner);
            this._panner.connect(ige.audio._masterVolumeNode);
        }
        return this;
    }
    /**
     * Plays the audio.
     */
    play(loop = false) {
        if (!ige.audio)
            return;
        if (!this._buffer || !ige.audio._ctx) {
            this._playWhenReady = true;
            this._loop = loop;
            this._playing = true;
            return;
        }
        this._bufferSource = ige.audio._ctx.createBufferSource();
        this._bufferSource.buffer = this._buffer;
        if (this._panner) {
            // Connect through the panner
            this._bufferSource.connect(this._panner);
            this._panner.connect(ige.audio._masterVolumeNode);
        }
        else {
            // Connect directly to the destination
            this._bufferSource.connect(ige.audio._masterVolumeNode);
        }
        this._bufferSource.loop = loop;
        this._bufferSource.start(0);
        this._playing = true;
        this.log(`Audio file (${this._url}) playing...`);
    }
    /**
     * Stops the currently playing audio.
     */
    stop() {
        if (this._bufferSource) {
            this.log("Audio file (" + this._url + ") stopping...");
            this._bufferSource.stop();
        }
        else {
            this._playWhenReady = false;
        }
        this._playing = false;
    }
}
