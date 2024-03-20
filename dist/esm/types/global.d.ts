import type { IgeViewport } from "../engine/core/IgeViewport.js"
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
