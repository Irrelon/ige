import { IgeViewport } from "@/engine/core/IgeViewport";

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
