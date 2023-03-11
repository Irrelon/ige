export interface IgeAnimation {
	loop: number;
	currentDelta: number;
	currentLoop: number;
	startTime?: number;
	totalTime: number;
	frames: (number | string)[];
	frameTime: number;
	frameCount: number;
}