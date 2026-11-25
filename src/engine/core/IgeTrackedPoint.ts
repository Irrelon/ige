import { IgePoint2d } from "@/engine/core/IgePoint2d";
import { IgePoint3d } from "@/engine/core/IgePoint3d";

/**
 * Something that can be told one of its transform inputs was written.
 */
export interface IgeTransformOwner {
	_tfDirty: boolean;
	/** Sets _tfDirty (and tells what's culled with it, see IgeObject._markTfDirty()). */
	_markTfDirty (): void;
}

/**
 * A 3d point that tells its owner (an IgeObject) when x, y or z are written
 * with a different value. Direct writes such as `entity._translate.x = 5`
 * are caught the same as translateTo(), so an object whose owner isn't
 * marked dirty is known to have unchanged transform inputs without
 * comparing them. Only the first write since the owner's last rebuild
 * calls it (_markTfDirty()); later ones find it dirty already.
 */
export class IgeTrackedPoint3d extends IgePoint3d {
	owner: IgeTransformOwner | null = null;
	declare _x: number;
	declare _y: number;
	declare _z: number;

	// @ts-expect-error the base class declares x, y and z as plain properties
	get x (): number { return this._x; }
	set x (v: number) {
		if (v !== this._x) {
			this._x = v;
			const o = this.owner;
			if (o && !o._tfDirty) o._markTfDirty();
		}
	}

	// @ts-expect-error the base class declares x, y and z as plain properties
	get y (): number { return this._y; }
	set y (v: number) {
		if (v !== this._y) {
			this._y = v;
			const o = this.owner;
			if (o && !o._tfDirty) o._markTfDirty();
		}
	}

	// @ts-expect-error the base class declares x, y and z as plain properties
	get z (): number { return this._z; }
	set z (v: number) {
		if (v !== this._z) {
			this._z = v;
			const o = this.owner;
			if (o && !o._tfDirty) o._markTfDirty();
		}
	}
}

/**
 * The 2d version of IgeTrackedPoint3d (used for bounds).
 */
export class IgeTrackedPoint2d extends IgePoint2d {
	owner: IgeTransformOwner | null = null;
	declare _x: number;
	declare _y: number;

	// @ts-expect-error the base class declares x, y and z as plain properties
	get x (): number { return this._x; }
	set x (v: number) {
		if (v !== this._x) {
			this._x = v;
			const o = this.owner;
			if (o && !o._tfDirty) o._markTfDirty();
		}
	}

	// @ts-expect-error the base class declares x, y and z as plain properties
	get y (): number { return this._y; }
	set y (v: number) {
		if (v !== this._y) {
			this._y = v;
			const o = this.owner;
			if (o && !o._tfDirty) o._markTfDirty();
		}
	}
}
