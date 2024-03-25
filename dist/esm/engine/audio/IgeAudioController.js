import { IgeAssetRegister } from "../core/IgeAssetRegister.js"
import { isClient } from "../utils/clientServer.js"
export class IgeAudioController extends IgeAssetRegister {
    classId = "IgeAudioController";
    _active = false;
    _disabled = false;
    _ctx;
    _masterVolumeNode;
    _audioBufferStore = {};
    constructor() {
        super();
        this._active = false;
        this._disabled = false;
        this._ctx = this.getContext();
        if (!this._ctx) {
            this.log("No web audio API support, sound is disabled!");
            this._disabled = true;
        }
        if (this._ctx.state === "suspended") {
            this.log("Audio support is available but we cannot play sound without user interaction");
        }
        this._masterVolumeNode = this._ctx.createGain();
        this._masterVolumeNode.connect(this._ctx.destination);
        // Set listener orientation to match our 2d plane
        // The setOrientation() method is deprecated but still supported.
        // FireFox has (of writing) currently not provided any other way to set orientation,
        // so we must continue to use this method until that changes
        // TODO: Wait for Firefox to support accessor properties and then update this
        this._ctx.listener.setOrientation(Math.cos(0.1), 0, Math.sin(0.1), 0, 1, 0);
        this.log("Web audio API connected successfully");
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
     * Plays audio by its assigned id.
     * @param {string} id The id of the audio file to play.
     * @param {boolean} loop If true, will loop the audio until
     * it is explicitly stopped.
     */
    play(id, loop = false) {
        if (!isClient || !this._ctx) {
            return;
        }
        const audioSource = this.get(id);
        if (!audioSource || !audioSource.buffer) {
            this.log(`Audio file (${id}) could not play, no buffer exists in register for: ${id}`, "warning");
            return;
        }
        if (!this._masterVolumeNode)
            return;
        const bufferSource = this._ctx.createBufferSource();
        bufferSource.buffer = audioSource.buffer;
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
    async _load(url) {
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
    }
    async _loaded(url, data) {
        return this._decode(data)
            .then((buffer) => {
            return buffer;
        })
            .catch((err) => {
            throw new Error(`Failed to decode audio "${url}": ${err}`);
        });
    }
    /**
     * Decodes audio data and calls back with an audio buffer.
     * @param {ArrayBuffer} data The audio data to decode.
     * @private
     */
    _decode = async (data) => {
        if (!this._ctx)
            return;
        return this._ctx.decodeAudioData(data);
    };
}
