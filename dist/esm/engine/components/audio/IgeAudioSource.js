import { IgeAsset } from "../../core/IgeAsset.js"
import { ige } from "../../instance.js"
import { isServer } from "../../utils/clientServer.js"
import { IgeAudioSourceType } from "../../../enums/IgeAudioSourceType.js"
/**
 * Creates a new audio source.
 */
export class IgeAudioSource extends IgeAsset {
    classId = "IgeAudioSource";
    IgeAudioSource = true;
    buffer;
    script;
    _destroyed = false;
    _sourceType;
    _url;
    /**
     * Constructor for a new IgeAudioSource.
     * @param [id]
     * @param {string | IgeSmartAudioSource} [urlOrObject] A URL that points to the path of the
     * audio source.
     */
    constructor(id, urlOrObject) {
        super();
        this._loaded = false;
        if (isServer) {
            this.log(`Cannot create an audio source on the server. Audio sources are only client-side objects. Please alter your code so that you don't try to load an audio source on the server-side, using something like an if statement around your code such as "if (isClient) {...}".`, "error");
            return this;
        }
        if (id) {
            const alreadyExists = ige.audio.exists(id);
            if (alreadyExists) {
                return ige.audio.get(id);
            }
            this.id(id);
            ige.audio.add(id, this);
        }
        if (!urlOrObject)
            return;
        if (typeof urlOrObject === "string") {
            // Load the audio URL
            if (urlOrObject) {
                this.url(urlOrObject);
            }
        }
        else {
            // Assign the texture script object
            this.assignSmartAudioSource(urlOrObject);
        }
    }
    url(url) {
        if (url === undefined) {
            return this._url;
        }
        this._url = url;
        if (url.substr(url.length - 3, 3) === ".js") {
            // This is a script-based asset, load the script
            this._loadScript(url);
        }
        else {
            // This is an image-based asset, load the image
            this._loadAudio(url);
        }
        return this;
    }
    /**
     * Loads an audio source.
     * @param {string} url The audio url used to load the audio data.
     * @private
     */
    _loadAudio(url) {
        if (isServer) {
            // We don't load audio files on the server
            return false;
        }
        if (!ige.audio._audioBufferStore[url]) {
            ige.audio
                ._load(url)
                .then((buffer) => {
                this._sourceType = IgeAudioSourceType.audioBuffer;
                ige.audio._audioBufferStore[url] = this.buffer = buffer;
                // Log success
                this.log(`Audio source (${url}) loaded successfully`);
                this._assetLoaded();
            })
                .catch((err) => {
                throw new Error(`Unable to load audio: ${err}`);
            });
        }
        else {
            this._sourceType = IgeAudioSourceType.audioBuffer;
            // Grab the cached asset
            this.buffer = ige.audio._audioBufferStore[url];
            // Mark asset as loaded
            this._assetLoaded();
        }
    }
    /**
     * Loads an audio generator script into a script tag and sets an onload
     * event to capture when the script has finished loading.
     * @param {string} scriptUrl The script url used to load the script data.
     * @private
     */
    _loadScript = (scriptUrl) => {
        if (isServer) {
            return;
        }
        import(/*webpackIgnore: true*/ scriptUrl)
            .then(({ audio }) => {
            this.log(`Audio script "${scriptUrl}" loaded successfully`);
            // Store the function exported in the `image` variable
            // by the asset script
            this._sourceType = IgeAudioSourceType.smartAudio;
            this.script = audio;
            // Run the asset script init method
            if (typeof audio.init === "function") {
                audio.init.apply(audio, [this]);
            }
            // Mark asset as loaded
            this._assetLoaded();
        })
            .catch((err) => {
            this.log(`Module error ${err}`, "error");
        });
    };
    /**
     * Assigns a render script to the smart asset.
     * @param {string} scriptObj The script object.
     * @private
     */
    assignSmartAudioSource(scriptObj) {
        // // Check the object has a render method
        // if (typeof scriptObj.render !== "function") {
        // 	throw new Error("Cannot assign smart asset because it doesn't have a render() method!");
        // }
        //
        // // Store the script data
        // this._renderMode = IgeTextureRenderMode.smartTexture;
        // this.script = scriptObj;
        //
        // // Run the asset script init method
        // if (typeof scriptObj.init === "function") {
        // 	scriptObj.init.apply(scriptObj, [this]);
        // }
        //
        // this._loaded = true;
        // this.emit("loaded");
    }
    /**
     * Returns a string containing a code fragment that when
     * evaluated will reproduce this object.
     * @return {string}
     */
    stringify() {
        let str = "new " + this.classId + "('" + this._url + "')";
        // Every object has an ID, assign that first
        // We've commented this because ids for assets are actually generated
        // from their asset so will ALWAYS produce the same ID as long as the asset
        // is the same path.
        //str += ".id('" + this.id() + "')";
        // Now get all other properties
        str += this._stringify();
        return str;
    }
    _stringify() {
        return "";
    }
    /**
     * Destroys the item.
     */
    destroy() {
        delete this._eventListeners;
        // Remove the asset from the asset store
        const id = this.id();
        if (id) {
            ige.audio.remove(id);
        }
        delete this.buffer;
        delete this.script;
        this._destroyed = true;
        return this;
    }
}
