import type { IgeCamera } from "@/engine/core/IgeCamera";
import { IgePoint3d } from "@/engine/core/IgePoint3d";

export interface CameraBounds {
	minX: number;
	maxX: number;
	minZ: number;
	maxZ: number;
}

/**
 * Strategy-game camera orbiting a point on the ground.
 *
 * Distance controls zoom; the pitch steepens as you zoom out (close up you
 * see toward the horizon, zoomed out you look down at the map like a board).
 * The player can tilt a little either side of that (`tilt`), which is kept
 * as an offset so it carries over as they zoom.
 * Movement is smoothed toward target values; grab-panning writes both the
 * current and target values so the ground stays pinned under the cursor.
 */
export class StrategyCamera {
	x = 0;
	z = 0;
	yaw = 0;
	distance = 1400;
	/** The player's tilt, added to the zoom's pitch (radians; positive looks more steeply down). */
	tilt = 0;

	targetX = 0;
	targetZ = 0;
	targetYaw = 0;
	targetDistance = 1400;
	targetTilt = 0;

	minDistance = 260;
	maxDistance = 12000;
	minPitch = (42 * Math.PI) / 180;
	maxPitch = (72 * Math.PI) / 180;
	/** How far the player may tilt either way from the zoom's pitch. */
	maxTilt = (25 * Math.PI) / 180;
	bounds?: CameraBounds;

	/** Ground height the camera orbits around. */
	groundY = 6;

	/** Current camera pitch (radians above the horizon): the zoom's pitch plus the player's tilt. */
	get pitch (): number {
		const t = Math.log(this.distance / this.minDistance) / Math.log(this.maxDistance / this.minDistance);
		const zoomed = this.minPitch + (this.maxPitch - this.minPitch) * Math.min(1, Math.max(0, t));
		return Math.min((85 * Math.PI) / 180, Math.max((20 * Math.PI) / 180, zoomed + this.tilt));
	}

	/** Screen-up direction on the ground plane for the current yaw. */
	get forward (): { x: number; z: number } {
		return { x: -Math.sin(this.yaw), z: -Math.cos(this.yaw) };
	}

	/** Screen-right direction on the ground plane for the current yaw. */
	get right (): { x: number; z: number } {
		return { x: Math.cos(this.yaw), z: -Math.sin(this.yaw) };
	}

	jumpTo (x: number, z: number, distance?: number): void {
		this.x = this.targetX = x;
		this.z = this.targetZ = z;
		if (distance !== undefined) this.distance = this.targetDistance = this._clampDistance(distance);
		this._clampTarget();
		this.x = this.targetX;
		this.z = this.targetZ;
	}

	/** Smoothly glide to a point. */
	glideTo (x: number, z: number): void {
		this.targetX = x;
		this.targetZ = z;
		this._clampTarget();
	}

	/** Pan by a screen-relative amount (fraction of the current distance). */
	panScreen (rightAmount: number, upAmount: number): void {
		const f = this.forward;
		const r = this.right;
		const scale = this.distance;
		this.targetX += (r.x * rightAmount + f.x * upAmount) * scale;
		this.targetZ += (r.z * rightAmount + f.z * upAmount) * scale;
		this._clampTarget();
	}

	/** Move instantly by a world offset (grab-panning). */
	shift (dx: number, dz: number): void {
		this.targetX += dx;
		this.targetZ += dz;
		this._clampTarget();
		this.x = this.targetX;
		this.z = this.targetZ;
	}

	/**
	 * Zoom by a factor, keeping the ground point (anchorX, anchorZ) roughly
	 * under the cursor.
	 */
	zoom (factor: number, anchorX?: number, anchorZ?: number): void {
		const before = this.targetDistance;
		this.targetDistance = this._clampDistance(this.targetDistance * factor);
		const applied = this.targetDistance / before;
		if (anchorX !== undefined && anchorZ !== undefined) {
			this.targetX = anchorX + (this.targetX - anchorX) * applied;
			this.targetZ = anchorZ + (this.targetZ - anchorZ) * applied;
			this._clampTarget();
		}
	}

	rotate (radians: number): void {
		this.targetYaw += radians;
	}

	/** Tilt the view (positive looks more steeply down), within `maxTilt` of the zoom's pitch. */
	pitchBy (radians: number): void {
		this.targetTilt = Math.min(this.maxTilt, Math.max(-this.maxTilt, this.targetTilt + radians));
	}

	/** Advance smoothing and write the result into an engine camera. */
	update (dt: number, camera: IgeCamera): void {
		const k = 1 - Math.exp(-dt * 10);
		this.x += (this.targetX - this.x) * k;
		this.z += (this.targetZ - this.z) * k;
		this.yaw += (this.targetYaw - this.yaw) * k;
		this.tilt += (this.targetTilt - this.tilt) * k;
		// Zoom eases in log space so it feels the same at every distance
		const logD = Math.log(this.distance);
		this.distance = Math.exp(logD + (Math.log(this.targetDistance) - logD) * k);
		this.apply(camera);
	}

	apply (camera: IgeCamera): void {
		const pitch = this.pitch;
		const horizontal = Math.cos(pitch) * this.distance;
		camera._translate.x = this.x + Math.sin(this.yaw) * horizontal;
		camera._translate.y = this.groundY + Math.sin(pitch) * this.distance;
		camera._translate.z = this.z + Math.cos(this.yaw) * horizontal;

		if (!camera._lookAt) camera._lookAt = new IgePoint3d(this.x, this.groundY, this.z);
		camera._lookAt.x = this.x;
		camera._lookAt.y = this.groundY;
		camera._lookAt.z = this.z;

		// Keep depth precision proportional to the zoom level
		camera.near(Math.max(4, this.distance * 0.05));
		camera.far(this.distance * 5 + 4000);
	}

	protected _clampDistance (d: number): number {
		return Math.min(this.maxDistance, Math.max(this.minDistance, d));
	}

	protected _clampTarget (): void {
		const b = this.bounds;
		if (!b) return;
		this.targetX = Math.min(b.maxX, Math.max(b.minX, this.targetX));
		this.targetZ = Math.min(b.maxZ, Math.max(b.minZ, this.targetZ));
	}
}
