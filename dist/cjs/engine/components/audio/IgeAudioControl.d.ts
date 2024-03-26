import type { IgeEntity } from "../../core/IgeEntity.js"
import { IgeEventingClass } from "../../core/IgeEventingClass.js"
import type { IgePoint3d } from "../../core/IgePoint3d.js"
import type { IgeCanId } from "../../../types/IgeCanId.js"
/**
 * Handles controlling an audio source. You can use an instance of
 * IgeAudioControl to start or stop playback of audio, but usually
 * you would do this directly via `ige.audio.play()` or by using
 * an `IgeAudioEntity` to allow streaming and further manipulation.
 */
export declare class IgeAudioControl extends IgeEventingClass implements IgeCanId {
    classId: string;
    _id: string;
    _gainNode: GainNode;
    _audioSourceBuffer?: AudioBuffer;
    _bufferNode: AudioBufferSourceNode | null;
    _shouldPlayWhenReady: boolean;
    _isPersistent: boolean;
    _loop: boolean;
    _isPlaying: boolean;
    _pannerNode?: PannerNode;
    _pannerSettings?: PannerOptions;
    _position?: IgePoint3d;
    _relativeTo?: string | IgeEntity;
    _audioSourceId?: string;
    _onEnded?: () => void;
    _resumePlaybackOffset: number;
    _startTime: number;
    constructor();
    abstract isPersistent(val?: boolean): boolean | this;
    abstract isPlaying(val?: boolean): boolean | this;
    abstract shouldPlayWhenReady(val?: boolean): boolean | this;
    abstract relativeTo(val?: IgeEntity | string): IgeEntity | string | this | undefined;
    abstract onEnded(val?: () => void): () => void | this | undefined;
    abstract pannerSettings(val?: PannerOptions): PannerOptions | this | undefined;
    abstract position(val?: IgePoint3d): IgePoint3d | this | undefined;
    volume(val?: number): number | this;
    /**
     * Gets or sets the audioSourceId for this item. If setting an audioSourceId,
     * you must first have created the audio source with the global audio
     * controller via `new IgeAudioSource(audioSourceId, url);`.
     * @param {string} [audioSourceId]
     */
    audioSourceId(): string;
    audioSourceId(audioSourceId: string): this;
    /**
     * Plays the audio.
     */
    play(playbackFromOffset?: number): void;
    loop(): boolean;
    loop(loop: boolean): this;
    /**
     * Similar to stop but will keep the current payback progress / location
     * and when play() is called, playback will resume from the current
     * location. If you pause() then stop() then play(), playback will start
     * from the beginning again. Calling stop() will reset the playback
     * location to the start of the audio track.
     */
    pause(): void;
    /**
     * Stops the currently playing audio.
     */
    stop(): void;
    /**
     * Called when the audio control is to be destroyed. Stops any
     * current audio stream playback.
     */
    destroy(): this;
}
