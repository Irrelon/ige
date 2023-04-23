import {IgeViewport} from "@/engine/core/IgeViewport";

export * from "@/engine/instance";

declare global {
	interface Event {
		igeX: number;
		igeY: number;
		igePageX: number;
		igePageY: number;
		igeType: "pointer" | "touch" | "keyboard" | "gamepad" | "wheel";
		igeViewport: IgeViewport;
	}

	interface TouchEvent {
		button: number;
	}
}
