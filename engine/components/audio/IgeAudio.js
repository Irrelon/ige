var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { ige } from "../../instance.js";
import IgeEventingClass from "../../core/IgeEventingClass.js";
import { audioController } from "../../services/audioController.js";
import { newIdHex } from "../../services/utils.js";
class IgeAudio extends IgeEventingClass {
    constructor(url) {
        super();
        this.classId = "IgeAudio";
        this._idRegistered = false;
        this._playWhenReady = false;
        this._loaded = false;
        this._loop = false;
        if (!url) {
            return;
        }
        this.url(url).then(() => {
            this._loaded = true;
        });
    }
    id(id) {
        if (id !== undefined) {
            // Check if this ID already exists in the object register
            if (ige.register.get(id)) {
                if (ige.register.get(id) === this) {
                    // We are already registered as this id
                    return this;
                }
                // Already an object with this ID!
                this.log(`Cannot set ID of object to "${id}" because that ID is already in use by another object!`, "error");
            }
            else {
                // Check if we already have an id assigned
                if (this._id && ige.register.get(this._id)) {
                    // Unregister the old ID before setting this new one
                    ige.register.remove(this);
                }
                this._id = id;
                // Now register this object with the object register
                ige.register.add(this);
                return this;
            }
        }
        if (!this._id) {
            // The item has no id so generate one automatically
            if (this._url) {
                // Generate an ID from the URL string of the audio file
                // this instance is using. Useful for always reproducing
                // the same ID for the same file :)
                this._id = ige.engine.newIdFromString(this._url);
            }
            else {
                // We don't have a URL so generate a random ID
                this._id = newIdHex();
            }
            ige.register.add(this);
        }
        return this._id;
    }
    url(url) {
        return __awaiter(this, void 0, void 0, function* () {
            return audioController._load(url).then((buffer) => {
                this.buffer(buffer);
            });
        });
    }
    /**
     * Gets / sets the current audio buffer.
     * @param buffer
     * @returns {*}
     */
    buffer(buffer) {
        if (buffer !== undefined) {
            this._buffer = buffer;
            if (this._playWhenReady) {
                this.play(this._loop);
            }
            return this;
        }
        return this._buffer;
    }
    panner(val) {
        if (val === undefined) {
            return this._panner;
        }
        this._panner = val;
        if (this._bufferSource) {
            // Make sure we include the panner in the connections
            this._bufferSource.connect(this._panner);
            this._panner.connect($ige.engine.audio._masterVolumeNode);
        }
        return this;
    }
    /**
     * Plays the audio.
     */
    play() {
        if (this._buffer) {
            this._bufferSource = audioController._ctx.createBufferSource();
            this._bufferSource.buffer = this._buffer;
            if (this._panner) {
                // Connect through the panner
                this._bufferSource.connect(this._panner);
                this._panner.connect(audioController._masterVolumeNode);
            }
            else {
                // Connect directly to the destination
                this._bufferSource.connect(audioController._masterVolumeNode);
            }
            this._bufferSource.loop = loop;
            this._bufferSource.start(0);
            this.log("Audio file (" + this._url + ") playing...");
        }
        else {
            this._playWhenReady = true;
            this._loop = loop;
        }
        this._playing = true;
    }
}
export default IgeAudio;
