import { IgeComponent } from "@/engine/core/IgeComponent";
import type { IgeEntity } from "@/engine/core/IgeEntity";
import type { IgeViewport } from "@/engine/core/IgeViewport";
import { ige } from "@/engine/instance";
import { arrPull } from "@/engine/utils/arrays";
import { IgeBehaviourType, IgeEntityRenderMode, IgeMountMode } from "@/enums";
import type { IgeEntityBehaviourMethod } from "@/types/IgeEntityBehaviour";

/**
 * This component should be mounted to a parent entity such as an IgeScene2d but can
 * be mounted to any instance that extends IgeEntity.
 *
 * The children of the entity this component is added to are tracked and checked to
 * ensure they are still inside the visible area of any viewport. If not they are
 * unmounted until they come back into view and are then mounted again.
 */
export class IgeEntityManager extends IgeComponent<IgeEntity> {
	static componentTargetClass = "IgeEntity";
	classId = "IgeEntityManager";
	componentId = "entityManager";

	// Create queue arrays that will store entities waiting to
	// be mounted or unmounted
	_mountQueue: IgeEntity[] = [];
	_unMountQueue: IgeEntity[] = [];
	_maxMountsPerOp: number = 0;
	_maxUnMountsPerOp: number = 0;

	constructor (parent: IgeEntity, options?: any) {
		super(parent, options);

		// Create the _orphans array on the entity
		parent._orphans = [];

		// Set a method (behaviour) that will be called on every update
		parent.addBehaviour(IgeBehaviourType.preUpdate, "entityManager", this._updateBehaviour);
	}

	/**
	 * Called each update frame from the component parent and calls various private
	 * methods to ensure that entities that should be mounted are mounted and those
	 * that are to be unmounted are unmounted.
	 * @private
	 */
	_updateBehaviour: IgeEntityBehaviourMethod = () => {
		// Draw visible area rect
		//const rect = ige.engine._currentViewport?.viewArea();

		/*new IgeEntity()
			.id('visArea')
			.texture(this.gameTexture.simpleBox)
			.opacity(0.5)
			.mount(ige.$('objectScene'));*/

		/*ige.$('visArea')
			.translateTo(rect.x + (rect.width / 2), rect.y + (rect.height / 2), 0)
			.height(rect.height)
			.width(rect.width);*/

		this._updateOrphans();
		this._updateChildren();

		this._processMountQueue();
		this._processUnMountQueue();
	};

	/**
	 * Checks all the mounted entities of our component parent are still supposed
	 * to be in the scenegraph and if not, adds them to the un-mount queue. Also
	 * marks any entities that are non-managed but also off-screen as inView = false.
	 * @private
	 */
	_updateOrphans = () => {
		const arr = this._entity._children as IgeEntity[];
		const viewportArr = ige.engine._children as IgeViewport[];
		const vpCount = viewportArr.length;

		let arrCount = arr.length;

		while (arrCount--) {
			const item = arr[arrCount];

			if (item._managed) {
				if (item.aabb) {
					let itemAabb;

					if (
						item._renderMode === IgeEntityRenderMode.iso ||
						(item._parent && item._parent._mountMode === IgeMountMode.iso)
					) {
						itemAabb = item.bounds3dPolygon().aabb();
					} else {
						itemAabb = item.aabb();
					}

					let inVisibleArea = false;

					// Check the entity to see if its bounds are "inside" any
					// viewport's visible area
					for (let vpIndex = 0; vpIndex < vpCount; vpIndex++) {
						if (viewportArr[vpIndex].viewArea().intersects(itemAabb)) {
							inVisibleArea = true;
							break;
						}
					}

					if (!inVisibleArea) {
						// Check for managed mode 1 (static entities that can be unmounted)
						// or managed mode 2 (dynamic and should just be marked as inView = false)
						if (item._managed === 1) {
							// The entity is not inside the viewport visible area
							// and is managed mode 1 (static) so unmount it
							this._unMountQueue.push(item);
						} else if (item._managed === 2) {
							// The entity is dynamic so mark is as inView = false
							item._inView = false;
						}
					} else if (item._managed === 2) {
						// The entity is dynamic so mark is as inView = true
						item._inView = true;
					}
				} else {
					this._unMountQueue.push(item);
				}
			}
		}
	};

	/**
	 * Checks all the un-mounted entities of our component parent to see if they are
	 * now inside the visible area of a viewport and if so, queues them for re-mounting.
	 * @private
	 */
	_updateChildren () {
		const arr = this._entity._orphans as IgeEntity[];
		const viewportArr = ige.engine._children as IgeViewport[];
		const vpCount = viewportArr.length;

		let arrCount = arr.length;

		while (arrCount--) {
			const item = arr[arrCount];

			if (item._managed) {
				if (item.aabb) {
					let itemAabb;
					if (
						item._renderMode === IgeEntityRenderMode.iso ||
						(item._parent && item._parent._mountMode === IgeMountMode.iso)
					) {
						itemAabb = item.bounds3dPolygon().aabb();
					} else {
						itemAabb = item.aabb();
					}

					let inVisibleArea = false;

					// Check the entity to see if its bounds are "inside" any
					// viewport's visible area
					for (let vpIndex = 0; vpIndex < vpCount; vpIndex++) {
						if (viewportArr[vpIndex].viewArea().intersects(itemAabb)) {
							inVisibleArea = true;
							break;
						}
					}

					if (inVisibleArea) {
						// Check for managed mode 1 (static entities that can be mounted)
						// or managed mode 2 (dynamic and should just be marked as inView = true)
						if (item._managed === 1) {
							// The entity is inside the viewport visible area
							// and is managed mode 1 (static) so mount it
							this._mountQueue.push(item);
						} else if (item._managed === 2) {
							// The entity is dynamic so mark is as inView = true
							item._inView = true;
						}
					}
				} else {
					this._mountQueue.push(item);
				}
			}
		}
	}

	/**
	 * Loops any entities queued for mounting and mounts them.
	 * @private
	 */
	_processMountQueue = () => {
		const arr = this._mountQueue;
		let arrCount = arr.length;

		while (arrCount--) {
			const item = arr[arrCount];

			arrPull(this._entity._orphans as IgeEntity[], item);
			item.mount(this._entity);
		}

		this._mountQueue = [];
	};

	/**
	 * Loops any entities queued for un-mounting and un-mounts them.
	 * @private
	 */
	_processUnMountQueue = () => {
		const arr = this._unMountQueue;
		let arrCount = arr.length;

		while (arrCount--) {
			const item = arr[arrCount];
			item.unMount();

			(this._entity._orphans as IgeEntity[]).push(item);
		}

		this._unMountQueue = [];
	};
}
