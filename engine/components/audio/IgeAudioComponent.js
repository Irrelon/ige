var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import IgeComponent from "../../core/IgeComponent.js";
import IgeAudio from "./IgeAudio.js";
import { ige } from "../../instance.js";
/**
 * Manages audio mixing and output.
 */
class IgeAudioComponent extends IgeComponent {
    constructor(entity, options) {
        super(entity, options);
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
         * Loads an audio file from the given url and assigns it the id specified.
         * @param {String} url The url to load the audio from.
         * @param {String=} id The id to assign the audio.
         */
        this.load = (url, id) => {
            const audio = new IgeAudio(url);
            if (id) {
                audio.id(id);
            }
        };
        /**
         * Decodes audio data and calls back with an audio buffer.
         * @param {ArrayBuffer} data The audio data to decode.
         */
        this.decode = (data) => __awaiter(this, void 0, void 0, function* () {
            return this._ctx.decodeAudioData(data);
        });
        this.play = (id) => {
            const audio = ige.$(id);
            if (!audio || !audio.play) {
                throw new Error(`Trying to play audio with id "${id}" but object with this id is not an IgeAudio instance, or does not implement the .play() method!`);
            }
            audio.play();
        };
        this._active = false;
        this._disabled = false;
        this._ctx = this.getAudioContext();
        if (!this._ctx) {
            this.log("No web audio API support, cannot play sounds!", "warning");
            this._disabled = true;
            return;
        }
        this.log("Web audio API connected successfully");
    }
    /**
     * Returns an audio context.
     * @returns {*}
     */
    getAudioContext() {
        return new window.AudioContext();
    }
}
export default IgeAudioComponent;
