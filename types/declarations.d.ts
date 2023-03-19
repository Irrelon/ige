import { IgeViewport } from "@/engine/core/IgeViewport";

export {}

declare global {
	interface Event {
		igeX: number;
		igeY: number;
		igePageX: number;
		igePageY: number;
		igeType: "pointer" | "touch" | "keyboard" | "gamepad" | "wheel";
		igeViewport: IgeViewport;
		button: number;
	}
}
