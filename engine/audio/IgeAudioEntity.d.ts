import { IgeAudioItem } from "@/engine/audio/IgeAudioItem";
import { IgeObject } from "@/engine/core/IgeObject";
import type { IgeCanvasRenderingContext2d } from "@/types/IgeCanvasRenderingContext2d";
export interface IgeAudioEntityPanner extends PannerOptions {
}
export interface IgeAudioEntityOptions {
    started: boolean;
    loop: boolean;
    gain: number;
    panner: IgeAudioEntityPanner;
    relativeTo?: IgeObject;
}
export declare class IgeAudioEntity extends IgeObject {
    classId: string;
    _audioInterface?: IgeAudioItem;
    _options: IgeAudioEntityOptions;
    _relativeTo?: IgeObject;
    _listener?: AudioListener;
    _panner?: PannerNode;
    _audioId?: string;
    constructor(audioId?: string, options?: IgeAudioEntityOptions);
    relativeTo(val: IgeObject): this;
    relativeTo(): IgeObject | undefined;
    /**
     * Gets the playing boolean flag state.
     * @returns {Boolean} True if playing, false if not.
     */
    playing(): boolean | IgeAudioItem | undefined;
    /**
     * Gets / sets the url the audio is playing from.
     * @param {String} url The url that serves the audio file.
     * @returns {IgeAudioEntity}
     */
    url(url: string): this;
    url(): string;
    /**
     * Gets / sets the id of the audio stream to use for
     * playback.
     * @param {String=} audioId The audio id. Must match
     * a previously registered audio stream that was
     * registered via IgeAudioComponent.register(). You can
     * access the audio component via ige.engine.audio
     * once you have added it as a component to use in the
     * engine.
     * @returns {*}
     */
    audioId(audioId?: string): string | this | undefined;
    /**
     * Starts playback of the audio.
     * @param {Boolean} loop If true, loops the audio until
     * explicitly stopped by calling stop() or the entity
     * being destroyed.
     * @returns {IgeAudioEntity}
     */
    play(loop?: boolean): this;
    /**
     * Stops playback of the audio.
     * @returns {IgeAudioEntity}
     */
    stop(): this;
    /**
     * Gets / sets the IgeAudioItem instance used to control
     * playback of the audio stream.
     * @param {IgeAudioItem=} audio
     * @returns {*}
     */
    audioInterface(audio: IgeAudioItem): this;
    audioInterface(): IgeAudioItem | undefined;
    /**
     * Returns the data sent to each client when the entity
     * is created via the network stream.
     * @returns {*}
     */
    streamCreateConstructorArgs(): (string | IgeAudioEntityOptions | undefined)[];
    update(ctx: IgeCanvasRenderingContext2d, tickDelta: number): void;
    /**
     * Called when the entity is to be destroyed. Stops any
     * current audio stream playback.
     */
    destroy(): this;
}
