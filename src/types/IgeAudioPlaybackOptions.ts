import type { IgeAudioEntityPanner } from "@/engine/components/audio/IgeAudioEntity";
import type { IgeEntity } from "@/engine/core/IgeEntity";

export interface IgeAudioPlaybackOptions {
	loop?: boolean;
	gain?: number;
	pannerSettings?: IgeAudioEntityPanner;
	relativeTo?: IgeEntity | string;
}
