export interface IgeTextureAnimation {
	loop: number;
	currentDelta: number;
	currentLoop: number;
	startTime?: number;
	totalTime: number;
	frames: (number | string | null)[];
	frameTime: number;
	frameCount: number;
}
