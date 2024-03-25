import { IgeAudioControl } from "./IgeAudioControl.js"
import { IgeEntity } from "../../core/IgeEntity.js";
import type { IgeAudioPlaybackOptions } from "../../../types/IgeAudioPlaybackOptions.js"
export interface IgeAudioEntityPanner extends PannerOptions {
}
export declare const defaultPannerSettings: IgeAudioEntityPanner;
export interface IgeAudioEntityProps extends IgeAudioPlaybackOptions {
    audioId?: string;
    playing?: boolean;
}
/**
 * Creates an audio entity that automatically handles
 * controlling panning / positioning of sound based on
 * where it is located on the screen in relation to
 * the listener / player. Also supports entity streaming
 * so an IgeAudioEntity can be instantiated server-side
 * and then be synced over the network to clients.
 *
 * If you only want to play audio and don't need to
 * position it in the simulation, an IgeAudioEntity is
 * overkill. You can use an IgeAudioControl instance instead.
 * The IgeAudioEntity uses an IgeAudioControl under the
 * hood anyway. This class is also designed for persistent
 * sound sources rather than incidental ones. If you are
 * looking to create incidental sound at a location you
 * can call the ige.audio.play() function instead.
 *
 * @see IgeAudioController.play()
 */
export declare class IgeAudioEntity extends IgeEntity {
    classId: string;
    _audioControl?: IgeAudioControl;
    _playing: boolean;
    _loop: boolean;
    _gain: number;
    _pannerSettings: PannerOptions;
    _relativeTo?: IgeEntity;
    _panner?: PannerNode;
    _audioSourceId?: string;
    constructor(props?: IgeAudioEntityProps);
    /**
     * Returns the data sent to each client when the entity
     * is created via the network stream.
     */
    streamCreateConstructorArgs(): [IgeAudioEntityProps];
    onStreamProperty(propName: string, propVal: any): this;
    relativeTo(val: IgeEntity): this;
    relativeTo(): IgeEntity | undefined;
    /**
     * Gets the playing boolean flag state.
     * @returns {boolean} True if playing, false if not.
     */
    playing(): boolean;
    /**
     * Gets / sets the id of the audio stream to use for
     * playback.
     * @param {string} [id] The audio id. Must match
     * a previously registered audio stream that was
     * registered via `ige.engine.audio.register()`.
     * The audio component must be active in the engine to
     * use this service via `ige.uses("audio");`.
     * @returns {*}
     */
    audioSourceId(): string | undefined;
    audioSourceId(id: string): this;
    gain(gain?: number): number | this;
    loop(loop?: boolean): boolean | this;
    /**
     * Starts playback of the audio.
     * @param {boolean} loop If true, loops the audio until
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
     * Gets / sets the IgeAudioControl instance used to control
     * playback of the audio stream.
     * @param {IgeAudioControl=} [audio]
     * @returns {*}
     */
    audioControl(): IgeAudioControl | undefined;
    audioControl(audio: IgeAudioControl): this;
    update(tickDelta: number): void;
    /**
     * Called when the entity is to be destroyed. Stops any
     * current audio stream playback.
     */
    destroy(): this;
}
