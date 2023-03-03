import IgeEventingClass from "../../core/IgeEventingClass.js";
class IgeAudio extends IgeEventingClass {
    constructor(ige, url) {
        super(ige);
        this.classId = "IgeAudio";
        if (!url) {
            return;
        }
        this.load(url);
    }
    /**
     * Gets / sets the current object id. If no id is currently assigned and no
     * id is passed to the method, it will automatically generate and assign a
     * new id as a 16 character hexadecimal value typed as a string.
     * @param {String=} id The id to set to.
     * @return {*} Returns this when setting the value or the current value if none is specified.
     */
    id(id) {
        if (id !== undefined) {
            // Check if this ID already exists in the object register
            if (this._ige._register[id]) {
                if (this._ige._register[id] === this) {
                    // We are already registered as this id
                    return this;
                }
                // Already an object with this ID!
                this.log("Cannot set ID of object to \"" + id + "\" because that ID is already in use by another object!", "error");
            }
            else {
                // Check if we already have an id assigned
                if (this._id && this._ige._register[this._id]) {
                    // Unregister the old ID before setting this new one
                    this._ige.unRegister(this);
                }
                this._id = id;
                // Now register this object with the object register
                this._ige.register(this);
                return this;
            }
        }
        if (!this._id) {
            // The item has no id so generate one automatically
            if (this._url) {
                // Generate an ID from the URL string of the audio file
                // this instance is using. Useful for always reproducing
                // the same ID for the same file :)
                this._id = this._ige.newIdFromString(this._url);
            }
            else {
                // We don't have a URL so generate a random ID
                this._id = this._ige.newIdHex();
            }
            this._ige.register(this);
        }
        return this._id;
    }
    /**
     * Loads an audio file from the given url.
     * @param {String} url The url to load the audio file from.
     * @param {Function=} callback Optional callback method to call when the audio
     * file has loaded or on error.
     */
    load(url, callback) {
        const request = new XMLHttpRequest();
        request.open("GET", url, true);
        request.responseType = "arraybuffer";
        // Decode asynchronously
        request.onload = () => {
            this._data = request.response;
            this._url = url;
            this._loaded(callback);
        };
        request.onerror = (err) => {
            callback.apply(this, [err]);
        };
        request.send();
    }
    _loaded(callback) {
        this._ige.root.audio.decode(this._data, (err, buffer) => {
            if (!err) {
                this._buffer = buffer;
                this._ige.root.audio.log("Audio file (" + this._url + ") loaded successfully");
                if (callback) {
                    callback.apply(this, [false]);
                }
                this.emit("loaded");
            }
            else {
                this.log("Failed to decode audio data from: " + this._url, "warning");
                if (callback) {
                    callback.apply(this, [err]);
                }
            }
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
        }
        const bufferSource = this._ige.root.audio._ctx.createBufferSource();
        bufferSource.buffer = this._buffer;
        bufferSource.connect(this._ige.root.audio._ctx.destination);
        bufferSource.start(0);
    }
}
export default IgeAudio;
