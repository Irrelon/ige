import type { IgeAudioEntityPanner } from "../engine/components/audio/IgeAudioEntity.js"
import type { IgeEntity } from "../engine/core/IgeEntity.js"
export interface IgeAudioPlaybackOptions {
    loop?: boolean;
    gain?: number;
    pannerSettings?: IgeAudioEntityPanner;
    relativeTo?: IgeEntity | string;
}
