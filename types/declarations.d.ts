import IgeViewport from "../engine/core/IgeViewport";

export {}

declare global {
	interface Event {
		igeX: number;
		igeY: number;
		igePageX: number;
		igePageY: number;
		igeType: "mouse" | "key" | "touch";
		igeViewport: IgeViewport;
		button: number;
	}
}

export declare namespace Box2D {
	namespace Dynamics {
		b2World
	}
}