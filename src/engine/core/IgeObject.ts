import { ige } from "@/engine/instance";
import { markSceneChanged } from "@/engine/utils/sceneChange";
import { IgeBounds } from "@/engine/core/IgeBounds";
import { IgeDummyCanvas } from "@/engine/core/IgeDummyCanvas";
import { IgeEventingClass } from "@/engine/core/IgeEventingClass";
import { IgeMatrix2d } from "@/engine/core/IgeMatrix2d";
import { IgeMatrix4 } from "@/engine/core/IgeMatrix4";
import { IgePoint2d } from "@/engine/core/IgePoint2d";
import { IgePoint3d } from "@/engine/core/IgePoint3d";
import { IgeTrackedPoint2d, IgeTrackedPoint3d } from "@/engine/core/IgeTrackedPoint";
import { type IgeSubtreeCull, igeSubtreeCullRoots } from "@/engine/core/IgeSubtreeCull";
import { IgePoly2d } from "@/engine/core/IgePoly2d";
import { newIdHex } from "@/engine/utils/ids";
import { toIso } from "@/engine/utils/maths";
import { synthesize } from "@/engine/utils/synthesize";
import { IgeQuadGeometry } from "@/engine/geometry/IgeQuadGeometry";
import { isClient } from "@/engine/utils/clientServer";
import {
	IgeBehaviourType,
	IgeIsometricDepthSortMode,
	IgeMountMode
} from "@/enums";
import type { IgeComponent } from "@/engine/core/IgeComponent";
import type { IgeTexture } from "@/engine/core/IgeTexture";
import type { IgeTileMap2d } from "@/engine/core/IgeTileMap2d";
import type { IgeViewport } from "@/engine/core/IgeViewport";
import type { IgeBehaviourStore } from "@/types/IgeBehaviourStore";
import type { IgeCanAcceptComponents } from "@/types/IgeCanAcceptComponents";
import type { IgeCanRegisterByCategory } from "@/types/IgeCanRegisterByCategory";
import type { IgeCanRegisterById } from "@/types/IgeCanRegisterById";
import type { IgeCanvasRenderingContext2d } from "@/types/IgeCanvasRenderingContext2d";
import type { IgeChildSortFunction } from "@/types/IgeChildSortFunction";
import type { IgeDepthSortObject } from "@/types/IgeDepthSortObject";
import type { IgeEntityBehaviourMethod } from "@/types/IgeEntityBehaviour";
import type { IgeGenericClass } from "@/types/IgeGenericClass";
import type { IgeGeometryData3d } from "@/types/IgeGeometryData3d";
import type { IgeInputEventHandler } from "@/types/IgeInputEventHandler";
import type { IgeMaterialData } from "@/types/IgeMaterialData";
import type { IgeMeshData3d } from "@/types/IgeMeshData3d";
import type { IgeGltfModel } from "@/engine/webgl/IgeGltfLoader";
import type { IgeSkeleton, IgeSkeletonData } from "@/types/IgeSkeletonData";
import type { IgeModelLod, IgeModelPart } from "@/engine/webgl/IgeModelParts";
import type { IgeAnimationClipData } from "@/types/IgeAnimationClipData";
import type { IgePoint } from "@/types/IgePoint";
import type { IgeSmartTexture } from "@/types/IgeSmartTexture";
import type { IgeTriggerPolygonFunctionName } from "@/types/IgeTriggerPolygonFunctionName";
import type { IgeUiSettings } from "@/engine/webgl/IgeUiLayout";

export class IgeObject extends IgeEventingClass implements IgeCanRegisterById, IgeCanRegisterByCategory, IgeCanAcceptComponents {
	classId = "IgeObject";
	_id?: string;
	_idRegistered: boolean = false;
	_categoryRegistered: boolean = false;
	_category: string = "";
	_drawBounds: boolean = false;
	_drawBoundsData: boolean = false;
	_drawMouse: boolean = false;
	_drawMouseData: boolean = false;
	_ignoreCamera: boolean = false;
	_parent: IgeObject | null = null;
	_children: IgeObject[] = [];
	_transformChanged: boolean = false;
	/**
	 * Incremented whenever this object's world matrix changes. Children
	 * compare it against the value they last saw to know whether their own
	 * world matrix needs rebuilding.
	 */
	_transformVersion: number = 0;
	/**
	 * Renderer frame id in which this object was last drawn in any viewport
	 * or shadow pass (-1 = never). Set by IgeWebGlRenderer; used to skip
	 * work such as skeletal animation sampling for off-screen objects.
	 */
	_lastRenderedFrame: number = -1;
	/** Renderer bookkeeping for cached static shadows (see IgeWebGlRenderer.shadowCaching()). */
	_renderUid: number = 0;
	_shadowSeenVersion: number = -1;
	_shadowSeenPose: number = -1;
	_shadowStableSince: number = 0;
	/** Casts a shadow that is never cached (see IgeWebGlRenderer.shadowCaching()). */
	_shadowDynamic: boolean = false;
	/** Set on an entity culled with everything under it (IgeEntity.cullSubtree()): its box and what changed under it. */
	_subtreeCull?: IgeSubtreeCull;
	/** Marks this object as noted by a culled-as-one entity above it (see IgeSubtreeCull.note()). */
	_subtreeStamp: number = 0;
	_tileWidth: number = 1;
	_tileHeight: number = 1;
	_tileDepth: number = 1;
	_orphans?: IgeObject[];
	_newBorn = true;
	_alive = true;
	_mountMode: IgeMountMode = IgeMountMode.flat;
	_layer = 0;
	_depth = 0;
	_depthSortMode = IgeIsometricDepthSortMode.bounds3d;
	_inView = true;
	_managed = 1;
	_triggerPolygonFunctionName: IgeTriggerPolygonFunctionName = "aabb";
	_compositeCache: boolean = false;
	_compositeParent: boolean = false;
	_anchor: IgePoint2d;
	_renderPos: { x: number; y: number };
	_computedOpacity: number;
	_opacity: number;
	_cell: number = 1;
	_deathTime?: number;
	_bornTime: number = 0;
	_translate: IgePoint3d;
	_oldTranslate: IgePoint3d;
	_rotate: IgePoint3d;
	_scale: IgePoint3d;
	_origin: IgePoint3d;
	_b2d!: IgeTrackedPoint2d;
	_b3d!: IgeTrackedPoint3d;
	/**
	 * True when something that feeds this object's transform (translate,
	 * rotate, scale, origin, bounds) may have been written since the last
	 * rebuild. The tracked points set it on every changing write, even a
	 * direct one like `_translate.x = 5`. While it is false (and the parent
	 * hasn't changed) updateTransform() needs no value comparison at all.
	 * Set it yourself after changing a matrix or anything else in a way the
	 * tracked points can't see.
	 */
	_tfDirty: boolean = true;
	/** True for objects that rebuild or alter their own matrices every frame (viewports, cameras). */
	_tfNoFast: boolean = false;
	/** _tfDirty was set through _markTfDirty() since the last rebuild (so the change has been passed on). */
	_tfNoted: boolean = false;
	_oldBounds2d: IgePoint2d;
	_oldBounds3d: IgePoint3d;

	/** 2d bounds. Assigning a point stores a tracked copy of it. */
	get _bounds2d (): IgePoint2d { return this._b2d; }
	set _bounds2d (v: IgePoint2d) {
		const t = new IgeTrackedPoint2d(v.x, v.y);
		t.owner = this;
		this._b2d = t;
		this._markTfDirty();
	}

	/** 3d bounds. Assigning a point stores a tracked copy of it. */
	get _bounds3d (): IgePoint3d { return this._b3d; }
	set _bounds3d (v: IgePoint3d) {
		const t = new IgeTrackedPoint3d(v.x, v.y, v.z);
		t.owner = this;
		this._b3d = t;
		this._markTfDirty();
	}

	/**
	 * Something that feeds this object's transform was written (the tracked points call this on the first write since
	 * the last rebuild): sets _tfDirty, and tells any entity above it that's culled with everything under it
	 * (IgeEntity.cullSubtree()) that it moved.
	 */
	_markTfDirty (): void {
		this._tfDirty = true;
		this._tfNoted = true;
		if (igeSubtreeCullRoots.count) this._subtreeChanged();
	}

	/**
	 * Tells the entities above this one that are culled with everything under them (IgeEntity.cullSubtree()) that it
	 * changed (moved relative to them, was mounted or shown, got a new mesh), so their box grows round it before it's
	 * next used. `self`: this one's own box too, when it's culled that way (a change to what it draws itself; it moving
	 * doesn't change its own box, which is in its own space). Costs nothing while no entity is culled that way.
	 */
	_subtreeChanged (self: boolean = false): void {
		if (!igeSubtreeCullRoots.count) return;
		for (let o: IgeObject | null = self ? this : this._parent; o; o = o._parent) {
			const cull = o._subtreeCull;
			if (cull) cull.note(this);
		}
	}
	_highlight: boolean;
	_pointerEventsActive: boolean;
	_pointerStateDown: boolean = false;
	_pointerStateOver: boolean = false;
	_pointerAlwaysInside: boolean = false;
	_pointerOut?: IgeInputEventHandler<PointerEvent | TouchEvent>;
	_pointerOver?: IgeInputEventHandler<PointerEvent | TouchEvent>;
	_pointerMove?: IgeInputEventHandler<PointerEvent | TouchEvent>;
	_pointerWheel?: IgeInputEventHandler<WheelEvent>;
	_pointerUp?: IgeInputEventHandler<PointerEvent | TouchEvent>;
	_pointerDown?: IgeInputEventHandler<PointerEvent | TouchEvent>;
	_velocity: IgePoint3d;
	_localMatrix: IgeMatrix2d;
	_worldMatrix: IgeMatrix2d;
	_oldWorldMatrix: IgeMatrix2d;
	_localMatrix4?: IgeMatrix4; // 4x4 matrix for 3D rendering (WebGL)
	_worldMatrix4?: IgeMatrix4; // 4x4 world matrix for 3D rendering (WebGL)
	_oldWorldMatrix4?: IgeMatrix4; // Previous 4x4 world matrix for change detection
	_adjustmentMatrix?: IgeMatrix2d;
	_hidden: boolean;
	_noShadowCast: boolean = false; // When true, entity is excluded from shadow map rendering
	/**
	 * When true (WebGL), the entity only casts shadows: it's left out of the
	 * views themselves. For a merged copy of many separate pieces (walls that
	 * fade one at a time, say) that casts their shadows in one draw while the
	 * pieces themselves are drawn without shadows.
	 */
	_shadowOnly: boolean = false;
	_cache: boolean = false;
	_cacheCtx?: IgeCanvasRenderingContext2d | null;
	_cacheCanvas?: OffscreenCanvas | IgeDummyCanvas;
	/** Canvas pixels per entity unit the cache was last drawn at. */
	_cachePixelRatio: number = 1;
	_cacheDirty: boolean = false;
	_cacheSmoothing: boolean = false;
	_aabbDirty: boolean = false;
	_aabb: IgeBounds = new IgeBounds();
	_compositeAabbCache?: IgeBounds;
	_noAabb?: boolean;
	_hasParent?: Record<string, boolean>;
	_texture?: IgeTexture;
	_indestructible: boolean = false;
	_shouldRender?: boolean = true;
	_smartBackground?: IgeSmartTexture;
	_behaviours?: IgeBehaviourStore;
	_birthMount?: string;
	_frameAlternatorCurrent: boolean = false;
	_backgroundPattern?: IgeTexture;
	_backgroundPatternRepeat: string | null = null;
	_backgroundPatternTrackCamera?: boolean;
	_backgroundPatternIsoTile?: boolean;
	_backgroundPatternFill?: CanvasPattern | null;
	_bounds3dPolygonDirty: boolean = false;
	_localBounds3dPolygon?: IgePoly2d;
	_bounds3dPolygon?: IgePoly2d;
	_localAabb?: IgeBounds;
	_geometryData: IgeGeometryData3d | null = IgeQuadGeometry; // Default to a basic quad (square)
	_materialData: IgeMaterialData | null = null;
	_meshData: IgeMeshData3d | null = null;
	_model?: IgeGltfModel;
	_skeleton?: IgeSkeleton; // Runtime skeleton instance for skeletal animation
	_skeletonData?: IgeSkeletonData; // Static skeleton data reference
	/**
	 * How a textured 2D sprite faces the camera in the WebGL renderer:
	 * 0 = not billboarded (uses its own rotation), 1 = always faces the
	 * camera (default), 2 = rotates around the world Y axis only.
	 */
	_billboardMode: number = 1;
	/**
	 * Drawn in the WebGL renderer's UI layer (IgeEntity.uiLayer()): after
	 * everything else, with no depth test. Its descendants are UI too.
	 */
	_ui?: IgeUiSettings;
	/** Render parts from a model assigned with IgeEntity.model() (shared, read-only). */
	_modelParts?: IgeModelPart[];
	/** Which of _modelParts are drawn (undefined: all), see IgeEntity.modelParts(). */
	_modelPartsShown?: boolean[];
	/** Silhouette colour drawn where this object is hidden behind something (see IgeEntity.occludedColor()). */
	_occludedColor?: { r: number; g: number; b: number; a: number } | null;
	/**
	 * The WebGL renderer cross-fades this entity (and everything under it) in or out with a dither while it swaps
	 * levels of detail (IgeHlod sets it): 0 to 1 fading in (the share of pixels drawn), -1 to 0 fading out (minus the
	 * share already gone), 0 or unset drawn as usual. The two sides of a swap use the same dither, so together they
	 * cover every pixel once.
	 */
	_lodFade?: number;
	/** An outline round this object's silhouette, its children's included (see IgeEntity.outline()). */
	_outline?: { r: number; g: number; b: number; a: number; width: number } | null;
	/** Per-part world matrices maintained by the WebGL renderer. */
	_modelPartMatrices?: Float32Array[];
	/** Lower-detail versions of _modelParts, see IgeEntity.lod(). */
	_modelLod?: IgeModelLod;
	_animationClips?: Map<string, IgeAnimationClipData>; // Available animation clips
	_deathCallBack?: (...args: any[]) => void; // TODO: Rename this to _deathCallback (lower case B)
	components: Record<string, IgeComponent<IgeObject>> = {};

	constructor () {
		super();

		this._anchor = new IgePoint2d(0, 0);
		this._renderPos = { x: 0, y: 0 };

		this._computedOpacity = 1;
		this._opacity = 1;
		this._cell = 1;

		this._deathTime = undefined;

		this._translate = this._trackedPoint(0, 0, 0);
		this._oldTranslate = new IgePoint3d(0, 0, 0);
		this._rotate = this._trackedPoint(0, 0, 0);
		this._scale = this._trackedPoint(1, 1, 1);
		this._origin = this._trackedPoint(0.5, 0.5, 0.5);

		this._bounds2d = new IgePoint2d(40, 40);
		this._bounds3d = new IgePoint3d(0, 0, 0);

		this._oldBounds2d = new IgePoint2d(40, 40);
		this._oldBounds3d = new IgePoint3d(0, 0, 0);

		this._highlight = false;
		this._pointerEventsActive = false;

		this._velocity = new IgePoint3d(0, 0, 0);

		this._localMatrix = new IgeMatrix2d();
		this._worldMatrix = new IgeMatrix2d();
		this._oldWorldMatrix = new IgeMatrix2d();

		this._inView = true;
		this._hidden = false;
	}

	_sortChildren: IgeChildSortFunction = (compareFn) => {
		return this._children.sort(compareFn);
	};

	/**
	 * Gets / sets the current object id. If no id is currently assigned and no
	 * id is passed to the method, it will automatically generate and assign a
	 * new id as a 16 character hexadecimal value typed as a string.
	 * @param {string=} id
	 * @example #Get the id of an entity
	 *     var entity = new IgeEntity();
	 *     console.log(entity.id());
	 * @example #Set the id of an entity
	 *     var entity = new IgeEntity();
	 *     entity.id('myNewId');
	 * @example #Set the id of an entity via chaining
	 *     var entity = new IgeEntity()
	 *         .id('myNewId');
	 * @return {*} Returns this when setting the value or the current value if none is specified.
	 */
	id (id: string): this;
	id (): string;
	id (id?: string): this | string {
		if (id !== undefined) {
			// Check if we're changing the id
			if (id === this._id) {
				// The same ID we already have is being applied,
				// ignore the request and return
				return this;
			}

			// Check if this ID already exists in the object register
			if (!ige.register.get(id)) {
				// Check if we already have an id assigned
				if (this._id && ige.register.get(this._id)) {
					// Unregister the old ID before setting this new one
					ige.register.remove(this);
				}

				this._id = id;

				// Now register this object with the object register
				ige.register.add(this);

				return this;
			}

			// Already an object with this ID!
			if (ige.register.get(id) !== this) {
				this.log(
					`Cannot set ID of object to "${id}" because that ID is already in use by another object!`,
					"error"
				);
			}
		}

		if (!this._id) {
			// The item has no id so generate one automatically
			this._id = newIdHex();
			ige.register.add(this);
		}

		return this._id;
	}

	/**
	 * Gets / sets the arbitrary category name that the object belongs to.
	 * @param {string=} val
	 * @example #Get the category of an entity
	 *     var entity = new IgeEntity();
	 *     console.log(entity.category());
	 * @example #Set the category of an entity
	 *     var entity = new IgeEntity();
	 *     entity.category('myNewCategory');
	 * @example #Set the category of an entity via chaining
	 *     var entity = new IgeEntity()
	 *         .category('myNewCategory');
	 * @example #Get all the entities belonging to a category
	 *     var entityArray = ige.$$('categoryName');
	 * @example #Remove the category of an entity
	 *     // Set category to some name
	 *     var entity = new IgeEntity()
	 *         .category('myCategory');
	 *
	 *     // Will output "myCategory"
	 *     console.log(entity.category());
	 *
	 *     // Now remove the category
	 *     entity.category('');
	 *
	 *     // Will return ""
	 *     console.log(entity.category());
	 * @return {*}
	 */
	category (val: string): this;
	category (): string;
	category (val?: string) {
		if (val === undefined) {
			return this._category;
		}

		// Check if we already have a category
		if (this._category) {
			// Check if the category being assigned is different from
			// the current one
			if (this._category !== val) {
				// The category is different so remove this object
				// from the current category association
				ige.categoryRegister.remove(this);
			}
		}

		this._category = val;

		// Check the category is not a blank string
		if (val) {
			// Now register this object with the category it has been assigned
			ige.categoryRegister.add(this);
		}
		return this;
	}

	/**
	 * Gets / sets the boolean flag determining if this object should have
	 * its bounds drawn when the bounds for all objects are being drawn.
	 * In order for bounds to be drawn the viewport the object is being drawn
	 * to must also have draw bounds enabled.
	 * @example #Enable draw bounds
	 *     var entity = new IgeEntity();
	 *     entity.drawBounds(true);
	 * @example #Disable draw bounds
	 *     var entity = new IgeEntity();
	 *     entity.drawBounds(false);
	 * @example #Get the current flag value
	 *     console.log(entity.drawBounds());
	 */
	drawBounds (): boolean;
	drawBounds (val: boolean, recursive?: boolean): this;
	drawBounds (val?: boolean, recursive: boolean = true) {
		if (val === undefined) {
			return this._drawBounds;
		}

		this._drawBounds = val;

		if (recursive) {
			this.children().forEach((child) => child.drawBounds(val, recursive));
		}

		return this;
	}

	/**
	 * Gets / sets the boolean flag determining if this object should have
	 * its bounds data drawn when the bounds for all objects are being drawn.
	 * Bounds data includes the object ID and its current depth etc.
	 * @example #Enable draw bounds data
	 *     var entity = new IgeEntity();
	 *     entity.drawBoundsData(true);
	 * @example #Disable draw bounds data
	 *     var entity = new IgeEntity();
	 *     entity.drawBoundsData(false);
	 * @example #Get the current flag value
	 *     console.log(entity.drawBoundsData());
	 * @return {*}
	 */
	drawBoundsData (): boolean;
	drawBoundsData (val: boolean): this;
	drawBoundsData (val?: boolean) {
		if (val !== undefined) {
			this._drawBoundsData = val;
			return this;
		}

		return this._drawBoundsData;
	}

	/**
	 * Gets / sets the boolean flag determining if this object should have
	 * its mouse position drawn, usually for debug purposes.
	 * @example #Enable draw mouse position data
	 *     var entity = new IgeEntity();
	 *     entity.drawMouse(true);
	 * @example #Disable draw mouse position data
	 *     var entity = new IgeEntity();
	 *     entity.drawMouse(false);
	 * @example #Get the current flag value
	 *     console.log(entity.drawMouse());
	 * @return {*}
	 */
	drawMouse (): boolean;
	drawMouse (val: boolean): this;
	drawMouse (val?: boolean) {
		if (val !== undefined) {
			this._drawMouse = val;
			return this;
		}

		return this._drawMouse;
	}

	/**
	 * Gets / sets the boolean flag determining if this object should have
	 * its extra mouse data drawn for debug purposes. For instance, on tile maps
	 * (IgeTileMap2d) instances, when enabled you will see the tile x and y
	 * co-ordinates currently being hovered over by the mouse.
	 * @example #Enable draw mouse data
	 *     var entity = new IgeEntity();
	 *     entity.drawMouseData(true);
	 * @example #Disable draw mouse data
	 *     var entity = new IgeEntity();
	 *     entity.drawMouseData(false);
	 * @example #Get the current flag value
	 *     console.log(entity.drawMouseData());
	 * @return {boolean | this}
	 */
	drawMouseData (val: boolean): this;
	drawMouseData (): boolean;
	drawMouseData (val?: boolean): boolean | this {
		if (val !== undefined) {
			this._drawMouseData = val;
			return this;
		}

		return this._drawMouseData;
	}

	/**
	 * Returns the absolute world position of the entity as an
	 * IgePoint3d.
	 * @example #Get the world position of the entity
	 *     var wordPos = entity.worldPosition();
	 * @return {IgePoint3d} The absolute world position of the
	 * entity.
	 */
	worldPosition (): IgePoint3d {
		return new IgePoint3d(this._worldMatrix.matrix[2], this._worldMatrix.matrix[5], 0);
	}

	/**
	 * Returns the absolute world rotation z of the entity as a
	 * value in radians.
	 * @example #Get the world rotation of the entity's z axis
	 *     var wordRot = entity.worldRotationZ();
	 * @return {number} The absolute world rotation z of the
	 * entity.
	 */
	worldRotationZ (): number {
		return this._worldMatrix.rotationRadians();
	}

	/**
	 * Converts an array of points from local space to this entity's
	 * world space using its world transform matrix. This will alter
	 * the points passed in the array directly.
	 * @param {IgePoint[]} points The array of IgePoint's to convert.
	 * @param {IgeViewport | null} viewport
	 * @param {boolean} inverse
	 */
	localToWorld (points: IgePoint[], viewport?: IgeViewport | null, inverse: boolean = false): void {
		// TODO: Commented as this was doing literally nothing
		//   we need to allow passing a viewport to calculate the
		//   return values correctly
		//viewport = viewport || ige.engine._currentViewport;

		if (this._adjustmentMatrix) {
			// Apply the optional adjustment matrix
			this._worldMatrix.multiply(this._adjustmentMatrix);
			// The world matrix no longer matches its inputs: rebuild it next update
			this._markTfDirty();
		}

		if (!inverse) {
			this._worldMatrix.transform(points, this);
		} else {
			this._localMatrix.transform(points, this);
			//this._worldMatrix.getInverse().transform(points, this);
		}

		if (this._ignoreCamera) {
			// TODO: It looks like the ignoreCamera functionality needs further
			//  investigation to make sure it works as expected
			//viewport.camera._worldMatrix.transform(points, this);
		}
	}

	/**
	 * Converts a point from local space to this entity's world space
	 * using its world transform matrix. This will alter the passed
	 * point's data directly.
	 * @param {IgePoint3d} point The IgePoint3d to convert.
	 * @param {IgeViewport | null} viewport
	 */
	localToWorldPoint (point: IgePoint3d, viewport?: IgeViewport | null): void {
		// TODO: We commented this because it doesn't even get used... is this a mistake?
		//viewport = viewport || ige.engine._currentViewport;
		this._worldMatrix.transform([point], this);
	}

	/**
	 * Returns the screen position of the entity as an IgePoint3d where x is the
	 * horizontal center of the entity and y is the vertical center of the entity,
	 * useful for positioning HTML elements at the screen location of an IGE entity.
	 * This method assumes that the top-left of the main canvas element is at 0, 0.
	 * If not you can adjust the values yourself to allow for offset.
	 * @example #Get the screen position of the entity
	 *     var screenPos = entity.screenPosition();
	 * @return {IgePoint3d} The screen position of the entity.
	 */
	screenPosition (): IgePoint3d {
		if (!ige.engine._currentCamera) {
			throw new Error("Cannot get screen position of entity, ige instance has no camera!");
		}

		return new IgePoint3d(
			Math.floor(
				(this._worldMatrix.matrix[2] - ige.engine._currentCamera._translate.x) *
				ige.engine._currentCamera._scale.x +
				ige.engine._bounds2d.x2
			),
			Math.floor(
				(this._worldMatrix.matrix[5] - ige.engine._currentCamera._translate.y) *
				ige.engine._currentCamera._scale.y +
				ige.engine._bounds2d.y2
			),
			0
		);
	}

	/**
	 * Gets the polygon that encompasses the 3d bounds of the entity in local space.
	 * @param {boolean=false} recalculate If true, will force a recalculation
	 * of the polygon instead of using an existing cached value.
	 */
	localBounds3dPolygon (recalculate = false): IgePoly2d {
		if (this._bounds3dPolygonDirty || !this._localBounds3dPolygon || recalculate) {
			const geom = this._bounds3d,
				poly = new IgePoly2d(),
				// Bottom face
				bf2 = toIso(+geom.x2, -geom.y2, -geom.z2),
				bf3 = toIso(+geom.x2, +geom.y2, -geom.z2),
				bf4 = toIso(-geom.x2, +geom.y2, -geom.z2),
				// Top face
				tf1 = toIso(-geom.x2, -geom.y2, geom.z2),
				tf2 = toIso(+geom.x2, -geom.y2, geom.z2),
				tf4 = toIso(-geom.x2, +geom.y2, geom.z2);

			poly.addPoint(tf1.x, tf1.y)
				.addPoint(tf2.x, tf2.y)
				.addPoint(bf2.x, bf2.y)
				.addPoint(bf3.x, bf3.y)
				.addPoint(bf4.x, bf4.y)
				.addPoint(tf4.x, tf4.y)
				.addPoint(tf1.x, tf1.y);

			this._localBounds3dPolygon = poly;
			this._bounds3dPolygonDirty = false;
		}

		return this._localBounds3dPolygon;
	}

	/**
	 * Gets the polygon that encompasses the 3d bounds of the entity in world space.
	 * @param {boolean=false} recalculate If true, will force a recalculation
	 * of the polygon instead of using an existing cached value.
	 */
	bounds3dPolygon (recalculate = false): IgePoly2d {
		if (this._bounds3dPolygonDirty || !this._bounds3dPolygon || recalculate) {
			const poly = this.localBounds3dPolygon(recalculate).clone();

			// Convert local co-ordinates to world based on entities world matrix
			this.localToWorld(poly._poly);

			this._bounds3dPolygon = poly;
		}

		return this._bounds3dPolygon;
	}

	_trackedPoint (x: number, y: number, z: number): IgePoint3d {
		const p = new IgeTrackedPoint3d(x, y, z);
		p.owner = this;
		return p;
	}

	statStart (funcName: string, statType: string): number {
		if (!ige.config.debug._timing) return 0;
		return ige.stats.start(this.classId, this.id(), funcName, statType);
	}

	statEnd (funcName: string, statType: string): number {
		if (!ige.config.debug._timing) return 0;
		return ige.stats.end(this.classId, this.id(), funcName, statType);
	}

	statCutOff () {
		if (!ige.config.debug._timing) return;
		return ige.stats.cutOff();
	}

	update (tickDelta: number) {
		// Check that we are alive before processing further
		if (!this._alive) {
			return;
		}

		if (this._newBorn) {
			this._newBorn = false;
		}

		const arr = this._children;

		if (!arr) {
			return;
		}

		let arrCount = arr.length;

		// Depth sort all child objects
		// if (arrCount && !ige.engine._headless) {
		if (arrCount) {
			this.statStart("update", "depthSortChildren");
			this.depthSortChildren();
			this.statEnd("update", "depthSortChildren");
		}

		// Loop our children and call their update methods
		if (!ige.config.debug._timing) {
			while (arrCount--) {
				arr[arrCount].update(tickDelta);
			}

			return;
		}

		this.statStart("update", "");
		while (arrCount--) {
			arr[arrCount].update(tickDelta);
		}
		this.statEnd("update", "");

		return;
	}

	tick (ctx: IgeCanvasRenderingContext2d) {
		// Check that we are alive before processing further
		if (!this._alive) {
			return;
		}

		const arr = this._children;

		if (!arr) {
			return;
		}

		let arrCount = arr.length;

		this.statStart("tick", "");
		while (arrCount--) {
			if (!arr[arrCount]) {
				this.log(`Object _children is undefined for index ${arrCount} and _id: ${this._id}`, "error");
				continue;
			}

			if (!arr[arrCount]._newBorn) {
				ctx.save();
				arr[arrCount].tick(ctx);
				ctx.restore();
			}
		}
		this.statEnd("tick", "");
	}

	updateTransform () {
	}

	aabb (recalculate = true, inverse = false): IgeBounds {
		return this._aabb;
	}

	/**
	 * Calls each behaviour method for the object.
	 */
	_processBehaviours (type: IgeBehaviourType, ...args: any[]) {
		if (!this._behaviours || !this._behaviours[type]) return;
		const arr = this._behaviours[type];

		let arrCount = arr.length;
		while (arrCount--) {
			arr[arrCount].method(this, ...args);
		}
	}

	/**
	 * Returns the object's parent object (the object that
	 * it is mounted to).
	 * the parent chain until a parent with the matching id is
	 * found. If none is found, returns undefined.
	 * @example #Get the object parent
	 *     // Create a couple of entities and give them ids
	 *     var entity1 = new IgeEntity().id('entity1'),
	 *         entity2 = new IgeEntity().id('entity2');
	 *
	 *     // Mount entity2 to entity1
	 *     entity2.mount(entity1);
	 *
	 *     // Get the parent of entity2 (which is entity1)
	 *     var parent = entity2.parent();
	 *
	 *     // Log the parent's id (will output "entity1")
	 *     console.log(parent.id());
	 * @return {*}
	 */
	parent (): IgeObject | IgeTileMap2d | null | undefined;
	parent (id: string): IgeObject | null;
	parent (id?: string): IgeObject | IgeTileMap2d | null {
		if (!id) {
			return this._parent;
		}

		if (this._parent) {
			if (this._parent.id() === id) {
				return this._parent;
			} else {
				return this._parent.parent(id);
			}
		}

		return null;
	}

	/**
	 * Returns the object's children as an array of objects.
	 * @example #Get the child objects array
	 *     // Create a couple of entities and give them ids
	 *     var entity1 = new IgeEntity().id('entity1'),
	 *         entity2 = new IgeEntity().id('entity2');
	 *
	 *     // Mount entity2 to entity1
	 *     entity2.mount(entity1);
	 *
	 *     // Get the children array entity1
	 *     var childArray = entity1.children();
	 *
	 *     // Log the child array contents (will contain entity2)
	 *     console.log(childArray);
	 * @return {Array} The array of child objects.
	 */
	children () {
		return this._children;
	}

	/**
	 * Mounts this object to the passed object in the scenegraph.
	 * @param {IgeEntity} obj
	 * @example #Mount an entity to another entity
	 *     // Create a couple of entities and give them ids
	 *     var entity1 = new IgeEntity().id('entity1'),
	 *         entity2 = new IgeEntity().id('entity2');
	 *
	 *     // Mount entity2 to entity1
	 *     entity2.mount(entity1);
	 * @return {*} Returns this on success or false on failure.
	 */
	mount (obj: IgeObject): this {
		if (!obj) {
			throw new Error("Must provide an object to mount to!");
		}

		if (obj === this) {
			this.log("Cannot mount an object to itself!", "error");
			return this;
		}

		if (!obj._children) {
			// The object has no _children array!
			throw new Error(
				"Cannot mount object because it has no _children array! If you are mounting to a custom class, ensure that you have extended from IgeObject."
			);
		}

		// Check that the engine will allow us to register this object
		this.id(); // Generates a new id if none is currently set, and registers it on the object register!

		if (this._parent) {
			if (this._parent === obj) {
				// We are already mounted to the parent!
				return this;
			}

			// We are already mounted to a different parent
			this.unMount();
		}

		// Set our parent to the object we are mounting to
		this._parent = obj;

		// Check if we need to set the "ignore camera" flag
		if (!this._ignoreCamera && this._parent._ignoreCamera) {
			this._ignoreCamera = this._parent._ignoreCamera;

			/*if (this.ignoreCameraComposite) {
				this.ignoreCameraComposite(this._parent._ignoreCamera);
			}*/
		}

		if (this._bornTime === 0) {
			this._bornTime = ige.engine._currentTime;
		}

		obj._children.push(this);
		this._parent._childMounted(this);
		// A new part of whatever is culled as one above it
		this._subtreeChanged();

		obj.updateTransform();
		obj.aabb(true);

		/**
		 * Updated from:
		 * if (obj._compositeCache) {
		 * 	  this._compositeParent = true;
		 * } else {
		 * 	  this._compositeParent = false;
		 * }
		 */
		this._compositeParent = obj._compositeCache;

		this._mounted(this._parent);

		/**
		 * Fires when the object has been mounted to a parent.
		 * @event IgeObject#mounted
		 * @param {IgeObject} The parent the object was mounted to.
		 */
		this.emit("mounted", this._parent);

		return this;
	}

	/**
	 * Unmounts this object from its parent object in the scenegraph.
	 * @example #Unmount an entity from another entity
	 *     // Create a couple of entities and give them ids
	 *     var entity1 = new IgeEntity().id('entity1'),
	 *         entity2 = new IgeEntity().id('entity2');
	 *
	 *     // Mount entity2 to entity1
	 *     entity2.mount(entity1);
	 *
	 *     // Now unmount entity2 from entity1
	 *     entity2.unMount();
	 * @return {*} Returns this on success or false on failure.
	 */
	unMount () {
		if (!this._parent) {
			return this;
		}
		markSceneChanged();

		const childArr = this._parent._children,
			index = childArr.indexOf(this),
			oldParent = this._parent;

		if (index <= -1) {
			// Cannot find this in the parent._children array
			return this;
		}

		// Found this in the parent._children array so remove it
		childArr.splice(index, 1);

		this._parent._childUnMounted(this);
		this._parent = null;

		this._unMounted(oldParent);

		return this;
	}

	/**
	 * Determines if the object has a parent up the scenegraph whose
	 * id matches the one passed. Will traverse each parent object
	 * checking if the id matches. This information will be cached when
	 * first called and can be refreshed by setting the "fresh" parameter
	 * to true.
	 * @param {string} parentId The id of the parent to check for.
	 * @param {Boolean=} fresh If true will force a full check instead of
	 * using the cached value from an earlier check.
	 */
	hasParent (parentId: string, fresh = false): boolean {
		let bool = false;

		// Check for a cached value
		if (!fresh && this._hasParent && this._hasParent[parentId] !== undefined) {
			return this._hasParent[parentId];
		}

		if (this._parent) {
			if (this._parent.id() === parentId) {
				bool = true;
			} else {
				bool = this._parent.hasParent(parentId, fresh);
			}
		}

		this._hasParent = this._hasParent || {};
		this._hasParent[parentId] = bool;

		return bool;
	}

	/**
	 * Override the _childMounted method and apply entity-based flags.
	 * @param {IgeEntity} child
	 * @private
	 */
	_childMounted (child: IgeObject) {
		this._resizeEvent();

		// Check if we are compositeCached and update the cache
		if (this.compositeCache()) {
			this.cacheDirty(true);
		}
	}

	/**
	 * Determines if the object is alive or not. The alive
	 * value is automatically set to false when the object's
	 * destroy() method is called. Useful for checking if
	 * an object that you are holding a reference to has been
	 * destroyed.
	 * @param {Boolean=} val The value to set the alive flag
	 * to.
	 * @example #Get the alive flag value
	 *     var entity = new IgeEntity();
	 *     console.log(entity.alive());
	 * @example #Set the alive flag value
	 *     var entity = new IgeEntity();
	 *     entity.alive(true);
	 * @return {*}
	 */
	alive (val: boolean): this;
	alive (): boolean;
	alive (val?: boolean) {
		if (val !== undefined) {
			this._alive = val;
			return this;
		}

		return this._alive;
	}

	/**
	 * Gets / sets the indestructible flag. If set to true, the object will
	 * not be destroyed even if a call to destroy() method is made.
	 * @example #Set an entity to indestructible
	 *     var entity = new IgeEntity()
	 *         .indestructible(true);
	 * @example #Set an entity to destructible
	 *     var entity = new IgeEntity()
	 *         .indestructible(false);
	 * @example #Get an entity's indestructible flag value
	 *     var entity = new IgeEntity()
	 *     console.log(entity.indestructible());
	 * @return {*} Returns this when setting the value or the current value if none is specified.
	 */
	indestructible (): boolean;
	indestructible (val: boolean): this;
	indestructible (val?: boolean): boolean | this {
		if (val !== undefined) {
			this._indestructible = val;
			return this;
		}

		return this._indestructible;
	}

	/**
	 * Gets / sets the current entity layer. This affects how the entity is depth-sorted
	 * against other entities of the same parent. Please note that entities are first sorted
	 * by their layer and then by their depth, and only entities of the same layer will be
	 * sorted against each other by their depth values.
	 * @example #Set an entity's layer to 22
	 *     var entity = new IgeEntity()
	 *         .layer(22);
	 * @example #Get an entity's layer value
	 *     var entity = new IgeEntity()
	 *     console.log(entity.layer());
	 * @example #How layers and depths are handled together
	 *     var entity1 = new IgeEntity(),
	 *         entity2 = new IgeEntity(),
	 *         entity3 = new IgeEntity();
	 *
	 *     // Set entity1 to at layer zero and depth 100
	 *     entity1.layer(0)
	 *         .depth(100);
	 *
	 *     // Set entity2 and 3 to be at layer 1
	 *     entity2.layer(1);
	 *     entity3.layer(1);
	 *
	 *     // Set entity3 to have a higher depth than entity2
	 *     entity2.depth(0);
	 *     entity3.depth(1);
	 *
	 *     // The engine sorts first based on layer from lowest to highest
	 *     // and then within each layer, by depth from lowest to highest.
	 *     // This means that entity1 will be drawn before entity 2 and 3
	 *     // because even though its depth is higher, it is not on the same
	 *     // layer as entity 2 and 3.
	 *
	 *     // Based on the layers and depths we have assigned, here
	 *     // is how the engine will sort the draw order of the entities
	 *     // entity1
	 *     // entity2
	 *     // entity3
	 * @return {*} Returns this when setting the value or the current value if none is specified.
	 */
	layer (): number;
	layer (val: number): this;
	layer (val?: number): number | this {
		if (val !== undefined) {
			this._layer = val;
			return this;
		}

		return this._layer;
	}

	/**
	 * Gets / sets the current render depth of the object (higher depths
	 * are drawn over lower depths). Please note that entities are first sorted
	 * by their layer and then by their depth, and only entities of the same layer will be
	 * sorted against each other by their depth values.
	 * @example #Set an entity's depth to 1
	 *     var entity = new IgeEntity()
	 *         .depth(1);
	 * @example #Get an entity's depth value
	 *     var entity = new IgeEntity()
	 *     console.log(entity.depth());
	 * @example #How layers and depths are handled together
	 *     var entity1 = new IgeEntity(),
	 *         entity2 = new IgeEntity(),
	 *         entity3 = new IgeEntity();
	 *
	 *     // Set entity1 to at layer zero and depth 100
	 *     entity1.layer(0)
	 *         .depth(100);
	 *
	 *     // Set entity2 and 3 to be at layer 1
	 *     entity2.layer(1);
	 *     entity3.layer(1);
	 *
	 *     // Set entity3 to have a higher depth than entity2
	 *     entity2.depth(0);
	 *     entity3.depth(1);
	 *
	 *     // The engine sorts first based on layer from lowest to highest
	 *     // and then within each layer, by depth from lowest to highest.
	 *     // This means that entity1 will be drawn before entity 2 and 3
	 *     // because even though its depth is higher, it is not on the same
	 *     // layer as entity 2 and 3.
	 *
	 *     // Based on the layers and depths we have assigned, here
	 *     // is how the engine will sort the draw order of the entities
	 *     // entity1
	 *     // entity2
	 *     // entity3
	 * @return {*} Returns this when setting the value or the current value if none is specified.
	 */
	depth (): number;
	depth (val: number): this;
	depth (val?: number): number | this {
		if (val === undefined) {
			return this._depth;
		}

		this._depth = val;
		return this;
	}

	/**
	 * Loops through all child objects of this object and destroys them
	 * by calling each child's destroy() method then clears the object's
	 * internal _children array.
	 */
	destroyChildren () {
		const arr = this._children;

		if (arr) {
			let arrCount = arr.length;

			while (arrCount--) {
				arr[arrCount].destroy();
			}
		}

		this._children = [];

		return this;
	}

	/**
	 * Gets / sets if objects mounted to this object should be positioned
	 * and depth-sorted in an isometric fashion or a 2d fashion.
	 * @example #Set children to be positioned and depth sorted in 2d
	 *     var entity = new IgeEntity()
	 *         .isometricMounts(false);
	 * @example #Set children to be positioned and depth sorted in isometric
	 *     var entity = new IgeEntity()
	 *         .isometricMounts(true);
	 * @return {*}
	 */
	isometricMounts (): boolean;
	isometricMounts (val: boolean): this;
	isometricMounts (val?: boolean) {
		if (val !== undefined) {
			this._mountMode = val ? IgeMountMode.iso : IgeMountMode.flat;
			return this;
		}

		return this._mountMode === IgeMountMode.iso;
	}

	/**
	 * Gets / sets the depth sort mode that is used when
	 * depth sorting this object's children against each other. This
	 * mode only applies if this object's mount mode is isometric,
	 * as set by calling isometricMounts(true). If the mount mode is
	 * 2d, the depth sorter will use a very fast 2d depth sort that
	 * does not use 3d bounds at all.
	 * this object's children, given as an integer value.
	 * @example #Turn off all depth sorting for this object's children
	 *     entity.depthSortMode(-1);
	 * @example #Use 3d bounds when sorting this object's children
	 *     entity.depthSortMode(0);
	 * @example #Use 3d bounds optimised for mostly cube-shaped bounds when sorting this object's children
	 *     entity.depthSortMode(1);
	 * @example #Use 3d bounds optimised for all cube-shaped bounds when sorting this object's children
	 *     entity.depthSortMode(2);
	 * @return {*}
	 */
	depthSortMode (): IgeIsometricDepthSortMode;
	depthSortMode (val: IgeIsometricDepthSortMode): this;
	depthSortMode (val?: IgeIsometricDepthSortMode) {
		if (val !== undefined) {
			this._depthSortMode = val;
			return this;
		}

		return this._depthSortMode;
	}

	/**
	 * Sorts the _children array by the layer and then depth of each object.
	 */
	depthSortChildren () {
		if (this._depthSortMode === IgeIsometricDepthSortMode.none) {
			return;
		}

		const arr = this._children;

		if (!arr || !arr.length) {
			return;
		}

		// Now sort the entities by depth
		this._sortChildren((a, b) => {
			const layerIndex = b._layer - a._layer;

			if (layerIndex === 0) {
				// On same layer so sort by depth
				return b._depth - a._depth;
			} else {
				// Not on same layer so sort by layer
				return layerIndex;
			}
		});

		return;
	}

	_depthSortVisit (u: number, sortObj: IgeDepthSortObject) {
		const arr = sortObj.adj[u];
		const arrCount = arr.length;

		sortObj.c[u] = 1;

		for (let i = 0; i < arrCount; ++i) {
			const v = arr[i];

			if (sortObj.c[v] === 0) {
				sortObj.p[v] = u;
				this._depthSortVisit(v, sortObj);
			}
		}

		sortObj.c[u] = 2;
		sortObj.order[sortObj.order_ind] = u;
		--sortObj.order_ind;
	}

	/**
	 * Handles screen resize events. Calls the _resizeEvent method of
	 * every child object mounted to this object.
	 * @param event
	 * @private
	 */
	_resizeEvent (event?: Event) {
		const arr = this._children;

		if (!arr) {
			return;
		}

		let arrCount = arr.length;

		while (arrCount--) {
			arr[arrCount]._resizeEvent(event);
		}
	}

	/**
	 * Called when a child object is un-mounted from this object.
	 * @param obj
	 * @private
	 */
	_childUnMounted (obj: IgeObject) {
	}

	/**
	 * Called when this object is mounted to an object.
	 * @param obj
	 * @private
	 */
	_mounted (obj: IgeObject) {
	}

	/**
	 * Called when this object is un-mounted from its parent.
	 * @param obj
	 * @private
	 */
	_unMounted (obj: IgeObject) {
	}

	isMounted () {
		return Boolean(this._parent);
	}

	/**
	 * Gets or sets the function used to sort children for example in depth sorting. This allows us to optionally use
	 * a stable sort (for browsers where the native implementation is not stable) or something more specific such as
	 * insertion sort for a speedup when we know data is going to be already mostly sorted.
	 * @param {Function=} val Sorting function - must operate on this._children and sort the array in place.
	 * @example #Set the child sorting algorithm
	 *     var entity = new IgeEntity();
	 *     entity.childSortingAlgorithm(function (compareFn) { this._children.sort(compareFn); });
	 * @return {*}
	 */
	childSortingAlgorithm (val: IgeChildSortFunction): this;
	childSortingAlgorithm (): IgeChildSortFunction;
	childSortingAlgorithm (val?: IgeChildSortFunction) {
		if (val !== undefined) {
			this._sortChildren = val;
			return this;
		}

		return this._sortChildren;
	}

	/**
	 * Transforms a point by the entity's parent world matrix and
	 * its own local matrix transforming the point to this entity's
	 * world space.
	 * @param {IgePoint3d} point The point to transform.
	 * @example #Transform a point by the entity's world matrix values
	 *     var point = new IgePoint3d(0, 0, 0);
	 *     entity._transformPoint(point);
	 *
	 *     console.log(point);
	 * @return {IgePoint3d} The transformed point.
	 */
	_transformPoint (point: IgePoint3d) {
		if (this._parent) {
			const tempMat = new IgeMatrix2d();
			// Copy the parent world matrix
			tempMat.copy(this._parent._worldMatrix);
			// Apply any local transforms
			tempMat.multiply(this._localMatrix);
			// Now transform the point
			tempMat.getInverse().transformCoord(point, this);
		} else {
			this._localMatrix.transformCoord(point, this);
		}

		return point;
	}

	/**
	 * Adds a behaviour to the object's active behaviour list.
	 * @param type
	 * @param {string} id
	 * @param {Function} behaviour
	 * during the tick() method instead of the update() method.
	 * @example #Add a behaviour with the id "myBehaviour"
	 *     var entity = new IgeEntity();
	 *     entity.addBehaviour(IgeBehaviourType.preUpdate, 'myBehaviour', function () {
	 *         // Code here will execute during each engine update for
	 *         // this entity. I can access the entity via the "this"
	 *         // keyword such as:
	 *         this._somePropertyOfTheEntity = 'moo';
	 *     });
	 *
	 *     // Now since each update we are setting _somePropertyOfTheEntity
	 *     // to equal "moo" we can console log the property and get
	 *     // the value as "moo"
	 *     console.log(entity._somePropertyOfTheEntity);
	 * @return {*} Returns this on success or false on failure.
	 */
	addBehaviour<ParentType extends IgeObject = IgeObject> (
		type: IgeBehaviourType,
		id: string,
		behaviour: IgeEntityBehaviourMethod<ParentType>
	): this {
		this._behaviours = this._behaviours || {};
		this._behaviours[type] = this._behaviours[type] || [];
		this._behaviours[type].push({
			id,
			method: behaviour
		});
		// The renderer runs preTick behaviours as it walks the scene: something culled as one above can't skip it now
		if (type === IgeBehaviourType.preTick) this._subtreeChanged();

		return this;
	}

	/**
	 * Removes a behaviour to the object's active behaviour list by its id.
	 * @param type
	 * @param {string} id
	 * @example #Remove a behaviour with the id "myBehaviour"
	 *     var entity = new IgeEntity();
	 *     entity.addBehaviour(IgeBehaviourType.preUpdate, 'myBehaviour', function () {
	 *         // Code here will execute during each engine update for
	 *         // this entity. I can access the entity via the "this"
	 *         // keyword such as:
	 *         this._somePropertyOfTheEntity = 'moo';
	 *     });
	 *
	 *     // Now remove the "myBehaviour" behaviour
	 *     entity.removeBehaviour(IgeBehaviourType.preUpdate, 'myBehaviour');
	 * @return {*} Returns this on success or false on failure.
	 */
	removeBehaviour (type: IgeBehaviourType, id: string) {
		if (!this._behaviours) return;
		const arr = this._behaviours[type];

		// Find the behaviour
		if (arr) {
			let arrCount = arr.length;

			while (arrCount--) {
				if (arr[arrCount].id === id) {
					// Remove the item from the array
					arr.splice(arrCount, 1);
					return this;
				}
			}
		}
	}

	/**
	 * Checks if the object has the specified behaviour already added to it.
	 * @param type
	 * @param {string} id
	 * from the tick method rather than the update method.
	 * @example #Check for a behaviour with the id "myBehaviour"
	 *     var entity = new IgeEntity();
	 *     entity.addBehaviour(IgeBehaviourType.preUpdate, 'myBehaviour', function () {
	 *         // Code here will execute during each engine update for
	 *         // this entity. I can access the entity via the "this"
	 *         // keyword such as:
	 *         this._somePropertyOfTheEntity = 'moo';
	 *     });
	 *
	 *     // Now check for the "myBehaviour" behaviour
	 *     console.log(entity.hasBehaviour(IgeBehaviourType.preUpdate, 'myBehaviour')); // Will log "true"
	 * @return {*} Returns this on success or false on failure.
	 */
	hasBehaviour (type: IgeBehaviourType, id: string) {
		if (!this._behaviours || !id) return false;

		const arr = this._behaviours[type];

		// Find the behaviour
		if (!arr) {
			return false;
		}

		let arrCount = arr.length;

		while (arrCount--) {
			if (arr[arrCount].id === id) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Gets / sets the cache flag that determines if the entity's
	 * texture rendering output should be stored on an off-screen
	 * canvas instead of calling the texture.render() method each
	 * tick. Useful for expensive texture calls such as rendering
	 * fonts etc. If enabled, this will automatically disable advanced
	 * composite caching on this entity with a call to
	 * compositeCache(false).
	 * @param {Boolean=} val True to enable caching, false to
	 * disable caching.
	 * @param {Boolean} propagateToChildren If true, calls cache()
	 * on each child and all their children with the same `val`.
	 * @example #Enable entity caching
	 *     entity.cache(true);
	 * @example #Disable entity caching
	 *     entity.cache(false);
	 * @example #Get caching flag value
	 *     var val = entity.cache();
	 * @return {*}
	 */
	cache (val: boolean, propagateToChildren?: boolean): this;
	cache (): boolean;
	cache (val?: boolean, propagateToChildren = false) {
		if (val === undefined) {
			return this._cache;
		}

		this._cache = val;

		if (propagateToChildren) {
			this._children.forEach((child) => {
				if (!("cache" in child)) return;
				child.cache(val, true);
			});
		}

		if (!val) {
			// Remove the off-screen canvas
			delete this._cacheCanvas;
			return this;
		}

		// Create the off-screen canvas
		if (isClient) {
			// Use a real canvas
			const canvasObj = ige.engine.createCanvas({ smoothing: this._cacheSmoothing, pixelRatioScaling: true });
			this._cacheCanvas = canvasObj.canvas;
			this._cacheCtx = canvasObj.ctx;
		} else {
			// Use dummy objects for canvas and context
			this._cacheCanvas = new IgeDummyCanvas();
			this._cacheCtx = this._cacheCanvas.getContext("2d");
		}

		this._cacheDirty = true;

		// Switch off composite caching
		if (this.compositeCache()) {
			this.compositeCache(false);
		}

		return this;
	}

	/**
	 * Gets / sets composite caching. Composite caching draws this entity
	 * and all of its children (and their children etc.) to a single
	 * off-screen canvas so that the entity does not need to be redrawn with
	 * all its children every tick. For composite entities where little
	 * change occurs this will massively increase rendering performance.
	 * If enabled, this will automatically disable simple caching on this
	 * entity with a call to cache(false).
	 * @param {Boolean=} val
	 * @param propagateToChildren
	 * @example #Enable entity composite caching
	 *     entity.compositeCache(true);
	 * @example #Disable entity composite caching
	 *     entity.compositeCache(false);
	 * @example #Get composite caching flag value
	 *     var val = entity.cache();
	 * @return {*}
	 */
	compositeCache (val: boolean, propagateToChildren?: boolean): this;
	compositeCache (): boolean;
	compositeCache (val?: boolean, propagateToChildren = false) {
		if (!isClient) {
			return this;
		}

		if (val === undefined) {
			return this._compositeCache;
		}

		if (val) {
			// Switch off normal caching
			this.cache(false);

			// Create the off-screen canvas
			const canvasObj = ige.engine.createCanvas({ smoothing: this._cacheSmoothing, pixelRatioScaling: true });
			this._cacheCanvas = canvasObj.canvas;
			this._cacheCtx = canvasObj.ctx;

			this._cacheDirty = true;
		}

		// Loop children and set _compositeParent to the correct value
		this._children.forEach((child) => {
			child._compositeParent = val;

			if (propagateToChildren && "compositeCache" in child) {
				child.compositeCache(val, propagateToChildren);
			}
		});

		this._compositeCache = val;
		return this;
	}

	/**
	 * Gets / sets the cache dirty flag. If set to true this will
	 * instruct the entity to re-draw its cached image from the
	 * assigned texture. Once that occurs the flag will automatically
	 * be set back to false. This works in either standard cache mode
	 * or composite cache mode.
	 * @param {Boolean=} val True to force a cache update.
	 * @example #Get cache dirty flag value
	 *     var val = entity.cacheDirty();
	 * @example #Set cache dirty flag value
	 *     entity.cacheDirty(true);
	 * @return {*}
	 */
	cacheDirty (val: boolean): this;
	cacheDirty (): boolean;
	cacheDirty (val?: boolean) {
		if (val === undefined) {
			return this._cacheDirty;
		}

		this._cacheDirty = val;
		// A smart texture or cached canvas will redraw (render-on-demand)
		if (val && !this._hidden) markSceneChanged();

		// Check if the entity is a child of a composite or composite
		// entity chain and propagate the dirty cache up the chain
		if (val && this._compositeParent && this._parent && "cacheDirty" in this._parent) {
			this._parent.cacheDirty(val);

			if (!this._cache && !this._compositeCache) {
				// Set clean immediately as no caching is enabled on this child
				this._cacheDirty = false;
			}
		}

		return this;
	}

	/**
	 * Registers ourselves to the ige.classStore.
	 */
	registerNetworkClass () {
		ige.classStore[this.constructor.name] = this.constructor as IgeGenericClass;
	}

	/**
	 * Translates the entity to the passed values.
	 * @param x The x co-ordinate.
	 * @param y The y co-ordinate.
	 * @param z The z co-ordinate.
	 * @example #Translate the entity to 10, 0, 0
	 *     entity.translateTo(10, 0, 0);
	 * @return {this}
	 */
	translateTo (x?: number, y?: number, z?: number): this {
		if (x !== undefined) {
			this._translate.x = x;
		}
		if (y !== undefined) {
			this._translate.y = y;
		}
		if (z !== undefined) {
			this._translate.z = z;
		}

		return this;
	}

	/**
	 * Translates the entity by adding the passed values to
	 * the current translation values.
	 * @param {number} x The x co-ordinate.
	 * @param {number} y The y co-ordinate.
	 * @param {number} z The z co-ordinate.
	 * @example #Translate the entity by 10 along the x axis
	 *     entity.translateBy(10, 0, 0);
	 * @return {this}
	 */
	translateBy (x: number, y: number, z: number): this {
		if (x === undefined || y === undefined || z === undefined) {
			this.log("translateBy() called with a missing or undefined x, y or z parameter!", "error");
			return this;
		}

		this._translate.x += x;
		this._translate.y += y;
		this._translate.z += z;

		return this;
	}

	/**
	 * Scale the entity to the passed values.
	 * @param {number} x The x co-ordinate.
	 * @param {number} y The y co-ordinate.
	 * @param {number} z The z co-ordinate.
	 * @example #Set the entity scale to 1 on all axes
	 *     entity.scaleTo(1, 1, 1);
	 * @return {*}
	 */
	scaleTo (x: number, y: number, z: number): this {
		if (x === undefined || y === undefined || z === undefined) {
			this.log("scaleTo() called with a missing or undefined x, y or z parameter!", "error");
			return this;
		}

		this._scale.x = x;
		this._scale.y = y;
		this._scale.z = z;

		return this; // Used to include this._entity
	}

	/**
	 * Scales the entity by adding the passed values to
	 * the current scale values.
	 * @param {number} x The x co-ordinate.
	 * @param {number} y The y co-ordinate.
	 * @param {number} z The z co-ordinate.
	 * @example #Scale the entity by 2 on the x-axis
	 *     entity.scaleBy(2, 0, 0);
	 * @return {*}
	 */
	scaleBy (x: number, y: number, z: number): this {
		if (x === undefined || y === undefined || z === undefined) {
			this.log("scaleBy() called with a missing or undefined x, y or z parameter!", "error");
			return this;
		}

		this._scale.x += x;
		this._scale.y += y;
		this._scale.z += z;

		return this;
	}

	/**
	 * Rotates the entity by adding the passed values to
	 * the current rotation values.
	 * @param {number} x The x co-ordinate.
	 * @param {number} y The y co-ordinate.
	 * @param {number} z The z co-ordinate.
	 * @example #Rotate the entity by 10 degrees about the z axis
	 *     entity.rotateBy(0, 0, degreesToRadians(10));
	 * @return {*}
	 */
	rotateBy (x: number, y: number, z: number): this {
		if (x === undefined || y === undefined || z === undefined) {
			this.log("rotateBy() called with a missing or undefined x, y or z parameter!", "error");
			return this;
		}

		this._rotate.x += x;
		this._rotate.y += y;
		this._rotate.z += z;

		return this; // Used to include this._entity
	}

	/**
	 * Rotates the entity to the passed values.
	 * @param {number} x The x co-ordinate.
	 * @param {number} y The y co-ordinate.
	 * @param {number} z The z co-ordinate.
	 * @example #Rotate the entity to 10 degrees about the z axis
	 *     entity.rotateTo(0, 0, degreesToRadians(10));
	 * @return {*}
	 */
	rotateTo (x: number, y: number, z: number): this {
		if (x === undefined || y === undefined || z === undefined) {
			this.log("rotateTo() called with a missing or undefined x, y or z parameter!", "error");
			return this;
		}

		this._rotate.x = x;
		this._rotate.y = y;
		this._rotate.z = z;

		return this;
	}

	originTo (x: number, y: number, z: number) {
		if (x === undefined || y === undefined || z === undefined) {
			this.log("originTo() called with a missing or undefined x, y or z parameter!", "error");
			return this;
		}

		this._origin.x = x;
		this._origin.y = y;
		this._origin.z = z;

		return this;
	}

	/**
	 * Removes all references to any behaviour methods that were added to
	 * this object.
	 */
	destroyBehaviours () {
		this._behaviours = {};
	}

	/**
	 * Destroys the object by removing it from the scenegraph,
	 * calling destroy() on any child objects and removing
	 * any active event listeners for the object. Once an object
	 * has been destroyed it's `_alive` flag is also set to
	 * false.
	 * @example #Destroy the object
	 *     obj.destroy();
	 */
	destroy () {
		// Set a flag in case a reference to this object
		// has been held somewhere, shows that the object
		// should no longer be interacted with
		this._alive = false;

		if (this._subtreeCull) {
			this._subtreeCull = undefined;
			igeSubtreeCullRoots.count--;
		}

		// Remove ourselves from any parent
		this.unMount();

		// Remove any children
		if (this._children) {
			this.destroyChildren();
		}

		// Remove any behaviours
		this.destroyBehaviours();

		// Remove the object from the lookup system
		ige.register.remove(this);
		ige.categoryRegister.remove(this);
		ige.groupRegister.remove(this);

		/**
		 * Fires when the object has been destroyed.
		 * @event IgeObject#destroyed
		 * @param {IgeObject} The object that has been destroyed.
		 */
		this.emit("destroyed", this);

		// Remove the event listeners array in case any
		// object references still exist there
		this._eventListeners = {};

		return this;
	}

	/**
	 * Calculates the axis-aligned bounding box for this entity, including
	 * all child entity bounding boxes and returns the final composite
	 * bounds.
	 * @example #Get the composite AABB
	 *     var entity = new IgeEntity(),
	 *         aabb = entity.compositeAabb();
	 * @return {IgeBounds}
	 */
	compositeAabb (inverse = false): IgeBounds {
		const arr = this._children;
		const rect = this.aabb(true, inverse).clone();

		// Now loop all children and get the aabb for each of
		// them add those bounds to the current rect
		if (arr) {
			let arrCount = arr.length;

			while (arrCount--) {
				rect.thisCombineRect(arr[arrCount].compositeAabb(inverse));
			}
		}

		return rect;
	}

	/**
	 * Returns a string containing a code fragment that when
	 * evaluated will reproduce this object.
	 * @return {string}
	 */
	stringify (options: Record<keyof IgeObject | string, boolean> = {}): string {
		// TODO: Use the advanced serialiser system from ForerunnerDB
		let str = `new ${this.constructor.name}()`;

		// Every object has an ID, assign that first
		if (options.id) {
			str += `.id('${this.id()}')`;
		}

		// Now check if there is a parent and mount that
		const parent = this.parent();
		if (options.mount && parent) {
			str += `.mount($ige.engine.$('${parent.id()}'))`;
		}

		// Now get all other properties
		str += this._stringify(options);
		return str;
	}

	/**
	 * Returns a string containing a code fragment that when
	 * evaluated will reproduce this object's properties via
	 * chained commands. This method will only check for
	 * properties that are directly related to this class.
	 * Other properties are handled by their own class method.
	 * @return {string}
	 */
	_stringify (options: Record<keyof IgeObject | string, boolean> = {}): string {
		let str = "";

		// Loop properties and add property assignment code to string
		for (const key in this) {
			if (this.hasOwnProperty(key) && this[key] !== undefined) {
				switch (key) {
					case "_category":
						str += ".category(" + this.category() + ")";
						break;
					case "_drawBounds":
						str += ".drawBounds(" + this.drawBounds() + ")";
						break;
					case "_drawBoundsData":
						str += ".drawBoundsData(" + this.drawBoundsData() + ")";
						break;
					case "_drawMouse":
						str += ".drawMouse(" + this.drawMouse() + ")";
						break;
					case "_isometricMounts":
						str += ".isometricMounts(" + this.isometricMounts() + ")";
						break;
					case "_indestructible":
						str += ".indestructible(" + this.indestructible() + ")";
						break;
					case "_layer":
						str += ".layer(" + this.layer() + ")";
						break;
					case "_depth":
						str += ".depth(" + this.depth() + ")";
						break;
				}
			}
		}

		return str;
	}

	addComponent (id: string, Component: typeof IgeComponent<IgeObject>, options?: any) {
		const instance = new Component(this, options);
		instance._entity = this;
		this.components[id] = instance;

		return this;
	}

	removeComponent (id: string) {
		const instance = this.components[id];
		if (!instance) return this;

		if (instance && instance.destroy) {
			instance.destroy();
		}

		delete this.components[id];

		return this;
	}
}

export interface IgeObject {
	geometryData (): IgeGeometryData3d | null;

	geometryData (val: IgeGeometryData3d): this;

	geometryData (val?: IgeGeometryData3d): this | IgeGeometryData3d | null;

	materialData (): IgeMaterialData | null;

	materialData (val: IgeMaterialData): this;

	materialData (val?: IgeMaterialData): this | IgeMaterialData | null;

	meshData (): IgeMeshData3d | null;

	meshData (val: IgeMeshData3d): this;

	meshData (val?: IgeMeshData3d): this | IgeMeshData3d | null;
}

synthesize(IgeObject, "geometryData");
synthesize(IgeObject, "materialData");
synthesize(IgeObject, "meshData");
