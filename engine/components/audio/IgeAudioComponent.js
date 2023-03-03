import IgeEventingClass from "../../core/IgeEventingClass.js";
/**
 * Manages audio mixing and output.
 */
class IgeAudioComponent extends IgeEventingClass {
    constructor(ige, entity, options) {
        super(ige);
        this.classId = "IgeAudioComponent";
        this.componentId = "audio";
        /**
         * Gets / sets the active flag to enable or disable audio support.
         * @param {Boolean=} val True to enable audio support.
         * @returns {*}
         */
        this.active = (val) => {
            if (val !== undefined && !this._disabled) {
                this._active = val;
                return this;
            }
            return this._active;
        };
        /**
         * Returns an audio context.
         * @returns {*}
         */
        this.getContext = () => {
            var ctxProto = window.AudioContext || window.webkitAudioContext;
            if (ctxProto) {
                return new ctxProto();
            }
            else {
                return undefined;
            }
        };
        /**
         * Loads an audio file from the given url and assigns it the id specified.
         * @param {String} url The url to load the audio from.
         * @param {String=} id The id to assign the audio.
         */
        this.load = (url, id) => {
            var audio = new IgeAudio(url);
            if (id) {
                audio.id(id);
            }
        };
        /**
         * Decodes audio data and calls back with an audio buffer.
         * @param {ArrayBuffer} data The audio data to decode.
         * @param {Function} callback The callback to pass the buffer to.
         */
        this.decode = (data, callback) => {
            this._ctx.decodeAudioData(data, (buffer) => {
                callback(false, buffer);
            }, (err) => {
                callback(err);
            });
        };
        this.play = (id) => {
            var audio = this._ige.$(id);
            if (audio) {
                if (audio.prototype.play) {
                    audio.play();
                }
                else {
                    this.log("Trying to play audio with id \"\" but object with this id is not an IgeAudio instance, or does not implement the .play() method!", "warnign");
                }
            }
        };
        this._active = false;
        this._disabled = false;
        this._ctx = this.getContext();
        if (!this._ctx) {
            this.log("No web audio API support, cannot play sounds!", "warning");
            this._disabled = true;
            return;
        }
        this.log("Web audio API connected successfully");
    }
}
export default IgeAudioComponent;
