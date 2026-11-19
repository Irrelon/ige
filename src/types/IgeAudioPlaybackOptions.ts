import type { IgeEntity } from "@/engine/core/IgeEntity";

export interface IgeAudioPlaybackOptions {
	loop?: boolean;
	volume?: number;
	/** Playback rate: 1 normal, 2 twice as fast (and an octave up), 0.5 half speed. */
	rate?: number;
	pannerSettings?: PannerOptions;
	relativeTo?: IgeEntity | string;
	onEnded?: () => void;
	isPersistent?: boolean;
}
