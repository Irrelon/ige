import { ige } from "../../instance.js";
import { arrPull } from "../../services/utils.js";
import IgeComponent from "../../core/IgeComponent.js";
import { IgeMountMode } from "../../../enums/IgeMountMode.js";
class IgeEntityManager extends IgeComponent {
    constructor(entity, options) {
        super(entity, options);
        this.classId = "IgeEntityManager";
        this.componentId = "entityManager";
        /**
         * Called each update frame from the component parent and calls various private
         * methods to ensure that entities that should be mounted are mounted and those
         * that are to be unmounted are unmounted.
         * @private
         */
        this._updateBehaviour = () => {
            var _a;
            // Draw visible area rect
            const rect = (_a = ige.engine._currentViewport) === null || _a === void 0 ? void 0 : _a.viewArea();
            /*new IgeEntity()
                .id('visArea')
                .texture(this.gameTexture.simpleBox)
                .opacity(0.5)
                .mount(ige.$('objectScene'));*/
            /*ige.$('visArea')
                .translateTo(rect.x + (rect.width / 2), rect.y + (rect.height / 2), 0)
                .height(rect.height)
                .width(rect.width);*/
            // Get our instance back
            const self = this.entityManager;
            self._updateOrphans();
            self._updateChildren();
            self._processMountQueue();
            self._processUnMountQueue();
        };
        /**
         * Checks all the mounted entities of our component parent are still supposed
         * to be in the scenegraph and if not, adds them to the un-mount queue. Also
         * marks any entities that are non-managed but also off-screen as inView = false.
         * @private
         */
        this._updateOrphans = () => {
            let arr = this._entity._children, arrCount = arr.length, viewportArr = ige._children, vpCount = viewportArr.length, item, itemAabb, vpIndex, inVisibleArea;
            while (arrCount--) {
                item = arr[arrCount];
                if (item._managed) {
                    if (item.aabb) {
                        if (item._renderMode === 1 || (item._parent && item._parent._mountMode === IgeMountMode.iso)) {
                            itemAabb = item.bounds3dPolygon().aabb();
                        }
                        else {
                            itemAabb = item.aabb();
                        }
                        inVisibleArea = false;
                        // Check the entity to see if its bounds are "inside" any
                        // viewport's visible area
                        for (vpIndex = 0; vpIndex < vpCount; vpIndex++) {
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
                            }
                            else if (item._managed === 2) {
                                // The entity is dynamic so mark is as inView = false
                                item._inView = false;
                            }
                        }
                        else if (item._managed === 2) {
                            // The entity is dynamic so mark is as inView = true
                            item._inView = true;
                        }
                    }
                    else {
                        this._unMountQueue.push(item);
                    }
                }
            }
        };
        /**
         * Loops any entities queued for mounting and mounts them.
         * @private
         */
        this._processMountQueue = () => {
            let arr = this._mountQueue, arrCount = arr.length, item;
            while (arrCount--) {
                item = arr[arrCount];
                arrPull(this._entity._orphans, item);
                item.mount(this._entity);
            }
            this._mountQueue = [];
        };
        /**
         * Loops any entities queued for un-mounting and un-mounts them.
         * @private
         */
        this._processUnMountQueue = () => {
            let arr = this._unMountQueue, arrCount = arr.length, item;
            while (arrCount--) {
                item = arr[arrCount];
                item.unMount();
                this._entity._orphans.push(item);
            }
            this._unMountQueue = [];
        };
        // Create queue arrays that will store entities waiting to
        // be mounted or unmounted
        this._mountQueue = [];
        this._unMountQueue = [];
        this._maxMountsPerOp = 0;
        this._maxUnMountsPerOp = 0;
        // Create the _orphans array on the entity
        entity._orphans = [];
        // Set a method (behaviour) that will be called on every update
        entity.addBehaviour("entManager", this._updateBehaviour, false);
    }
    /**
     * Checks all the un-mounted entities of our component parent to see if they are
     * now inside the visible area of a viewport and if so, queues them for re-mounting.
     * @private
     */
    _updateChildren() {
        let arr = this._entity._orphans, arrCount = arr.length, viewportArr = ige._children, vpCount = viewportArr.length, item, itemAabb, vpIndex, inVisibleArea;
        while (arrCount--) {
            item = arr[arrCount];
            if (item._managed) {
                if (item.aabb) {
                    if (item._renderMode === 1 || (item._parent && item._parent._mountMode === IgeMountMode.iso)) {
                        itemAabb = item.bounds3dPolygon().aabb();
                    }
                    else {
                        itemAabb = item.aabb();
                    }
                    inVisibleArea = false;
                    // Check the entity to see if its bounds are "inside" any
                    // viewport's visible area
                    for (vpIndex = 0; vpIndex < vpCount; vpIndex++) {
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
                        }
                        else if (item._managed === 2) {
                            // The entity is dynamic so mark is as inView = true
                            item._inView = true;
                        }
                    }
                }
                else {
                    this._mountQueue.push(item);
                }
            }
        }
    }
}
export default IgeEntityManager;
