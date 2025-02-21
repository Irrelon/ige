import type { IgeSmartAudioSource } from "./IgeSmartAudioSource.js"
import { IgeAsset } from "../../core/IgeAsset.js";
import { IgeAudioSourceType } from "../../../enums/IgeAudioSourceType.js"
/**
 * Creates a new audio source.
 */
export declare class IgeAudioSource extends IgeAsset {
    classId: string;
    IgeAudioSource: boolean;
    buffer?: AudioBuffer;
    script?: IgeSmartAudioSource;
    _destroyed: boolean;
    _sourceType?: IgeAudioSourceType;
    _url?: string;
    /**
     * Constructor for a new IgeAudioSource.
     * @param [id]
     * @param {string | IgeSmartAudioSource} [urlOrObject] A URL that points to the path of the
     * audio source.
     */
    constructor(id?: string, urlOrObject?: string | IgeSmartAudioSource);
    /**
     * Gets / sets the source file for this asset.
     * @param {string=} [url] The url used to load the file for this asset.
     * @return {*}
     */
    url(): string | undefined;
    url(url: string): this;
    /**
     * Loads an audio source.
     * @param {string} url The audio url used to load the audio data.
     * @private
     */
    _loadAudio(url: string): false | undefined;
    /**
     * Loads an audio generator script into a script tag and sets an onload
     * event to capture when the script has finished loading.
     * @param {string} scriptUrl The script url used to load the script data.
     * @private
     */
    _loadScript: (scriptUrl: string) => void;
    /**
     * Assigns a render script to the smart asset.
     * @param {string} scriptObj The script object.
     * @private
     */
    assignSmartAudioSource(scriptObj: IgeSmartAudioSource): void;
    /**
     * Returns a string containing a code fragment that when
     * evaluated will reproduce this object.
     * @return {string}
     */
    stringify(): string;
    _stringify(): string;
    /**
     * Destroys the item.
     */
    destroy(): this;
}
