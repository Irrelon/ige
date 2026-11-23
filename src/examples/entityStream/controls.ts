/**
 * Ship controls for the entity streaming examples. Keyboard: W/S pitch, A/D yaw, Q/E roll, Space
 * thrust. Pad (standard mapping): left stick pitch and yaw, LB/RB roll, RT thrust.
 */
import type { ShipInput } from "./shared";

const DEAD_ZONE = 0.15;

function stick (value: number): number {
	const size = Math.abs(value);
	if (size < DEAD_ZONE) return 0;
	return Math.sign(value) * Math.min(1, (size - DEAD_ZONE) / (1 - DEAD_ZONE));
}

function clampUnit (value: number): number {
	return Math.max(-1, Math.min(1, value));
}

/** The connected pads, in the order the browser lists them. */
export function connectedPads (): Gamepad[] {
	if (typeof navigator === "undefined" || !navigator.getGamepads) return [];
	return Array.from(navigator.getGamepads()).filter((pad): pad is Gamepad => !!pad && pad.connected);
}

/** A ship's input from the held keys and/or a pad. Pitch is positive nose down (W, stick forward). */
export function shipInput (pressed: Set<string> | undefined, pad?: Gamepad): ShipInput {
	const held = (code: string) => (pressed?.has(code) ? 1 : 0);
	let pitch = held("KeyW") - held("KeyS");
	let yaw = held("KeyD") - held("KeyA");
	let roll = held("KeyE") - held("KeyQ");
	let thrust = held("Space");
	if (pad) {
		pitch = clampUnit(pitch - stick(pad.axes[1] ?? 0));
		yaw = clampUnit(yaw + stick(pad.axes[0] ?? 0));
		roll = clampUnit(roll + (pad.buttons[5]?.pressed ? 1 : 0) - (pad.buttons[4]?.pressed ? 1 : 0));
		thrust = Math.max(thrust, pad.buttons[7]?.value ?? 0);
	}
	return { pitch, yaw, roll, thrust };
}

/** A gentle loop for a ship nobody is flying: a steady turn that rolls, climbs and dives a little. */
export function scriptedShipInput (seconds: number): ShipInput {
	return {
		pitch: 0.25 * Math.sin(seconds * 0.7),
		yaw: 0.3,
		roll: 0.4 * Math.sin(seconds * 0.5),
		thrust: 0.6
	};
}
