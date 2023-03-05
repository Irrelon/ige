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
class IgeAudio extends IgeEventingClass {
    constructor(url) {
        super();
        this.classId = "IgeAudio";
        this._registered = false;
        if (!url) {
            return;
        }
        void this.load(url).then(this._loaded);
    }
    id(id) {
        if (id !== undefined) {
            // Check if this ID already exists in the object register
            if (ige._register[id]) {
                if (ige._register[id] === this) {
                    // We are already registered as this id
                    return this;
                }
                // Already an object with this ID!
                this.log(`Cannot set ID of object to "${id}" because that ID is already in use by another object!`, "error");
            }
            else {
                // Check if we already have an id assigned
                if (this._id && ige._register[this._id]) {
                    // Unregister the old ID before setting this new one
                    ige.unRegister(this);
                }
                this._id = id;
                // Now register this object with the object register
                ige.register(this);
                return this;
            }
        }
        if (!this._id) {
            // The item has no id so generate one automatically
            if (this._url) {
                // Generate an ID from the URL string of the audio file
                // this instance is using. Useful for always reproducing
                // the same ID for the same file :)
                this._id = ige.newIdFromString(this._url);
            }
            else {
                // We don't have a URL so generate a random ID
                this._id = ige.newIdHex();
            }
            ige.register(this);
        }
        return this._id;
    }
    /**
     * Loads an audio file from the given url.
     * @param {String} url The url to load the audio file from.
     * @param {Function=} callback Optional callback method to call when the audio
     * file has loaded or on error.
     */
    load(url) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                const request = new XMLHttpRequest();
                request.open("GET", url, true);
                request.responseType = "arraybuffer";
                // Decode asynchronously
                request.onload = () => {
                    this._data = request.response;
                    this._url = url;
                    resolve(request.response);
                };
                request.onerror = (err) => {
                    reject(err);
                };
                request.send();
            });
        });
    }
    _loaded(data) {
        return __awaiter(this, void 0, void 0, function* () {
            return ige.components.audio.decode(data)
                .then((buffer) => {
                this._buffer = buffer;
                ige.components.audio.log(`Audio file (${this._url}) loaded successfully`);
                this.emit("loaded");
            }).catch((err) => {
                throw new Error(`Failed to decode audio "${this._url}": ${err}`);
            });
        });
    }
    /**
     * Plays the audio.
     */
    play() {
        if (!this._buffer) {
            // Wait for the audio to load
            this.on("loaded", () => {
                this.play();
            });
            return;
        }
        const bufferSource = ige.components.audio._ctx.createBufferSource();
        bufferSource.buffer = this._buffer;
        bufferSource.connect(ige.components.audio._ctx.destination);
        bufferSource.start(0);
    }
}
export default IgeAudio;
