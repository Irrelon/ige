import type { IgeAudioSource } from "./IgeAudioSource.js"
import { IgeAssetRegister } from "../core/IgeAssetRegister.js";
export declare class IgeAudioController extends IgeAssetRegister<IgeAudioSource> {
    classId: string;
    _active: boolean;
    _disabled: boolean;
    _ctx?: AudioContext;
    _masterVolumeNode: GainNode;
    _audioBufferStore: Record<string, AudioBuffer>;
    constructor();
    /**
     * When first instantiated the audio context might
     * be in a suspended state because the browser doesn't
     * let us play audio until the user interacts with the
     * elements on the page. This function should be called
     * in an event listener triggered by a user interaction
     * such as a click handler etc.
     */
    interact(): boolean;
    /**
     * Gets / sets the master volume for sound output.
     * @param val
     * @returns {*}
     */
    masterVolume(val?: number): number | this | undefined;
    /**
     * Returns an audio context.
     * @returns {*}
     */
    getContext(): AudioContext;
    /**
     * Plays audio by its assigned id.
     * @param {string} id The id of the audio file to play.
     * @param {boolean} loop If true, will loop the audio until
     * it is explicitly stopped.
     */
    play(id: string, loop?: boolean): void;
    /**
     * Gets / sets the active flag to enable or disable audio support.
     * @param {boolean=} val True to enable audio support.
     * @returns {*}
     */
    active(val?: boolean): boolean | this;
    /**
     * Loads an audio file from the given url.
     * @param {string} url The url to load the audio file from.
     * file has loaded or on error.
     */
    _load(url: string): Promise<AudioBuffer>;
    _loaded(url: string, data: ArrayBuffer): Promise<AudioBuffer | undefined>;
    /**
     * Decodes audio data and calls back with an audio buffer.
     * @param {ArrayBuffer} data The audio data to decode.
     * @private
     */
    _decode: (data: ArrayBuffer) => Promise<AudioBuffer | undefined>;
}
