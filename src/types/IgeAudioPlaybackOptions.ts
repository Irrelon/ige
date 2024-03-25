import type { IgeEntity } from "@/engine/core/IgeEntity";

export interface IgeAudioPlaybackOptions {
	loop?: boolean;
	volume?: number;
	pannerSettings?: PannerOptions;
	relativeTo?: IgeEntity | string;
	onEnded?: () => void;
	isPersistent?: boolean;
}
