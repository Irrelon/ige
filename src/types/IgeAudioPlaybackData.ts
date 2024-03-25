import type { IgeEntity } from "@/engine/core/IgeEntity";
import type { IgePoint3d } from "@/engine/core/IgePoint3d";

export interface IgeAudioPlaybackData {
	audioId: string;
	loop: boolean;
	position?: IgePoint3d;
	relativeTo?: IgeEntity;
	pannerNode?: PannerNode;
	bufferNode: AudioBufferSourceNode;
}
