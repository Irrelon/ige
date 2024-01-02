import { IgeComponent } from "../../core/IgeComponent.js"
import type { IgeEntity } from "../../core/IgeEntity.js"
import type { IgeEntityBehaviourMethod } from "../../../types/IgeEntityBehaviour.js"
/**
 * This component should be mounted to a parent entity such as an IgeScene2d but can
 * be mounted to any instance that extends IgeEntity.
 *
 * The children of the entity this component is added to are tracked and checked to
 * ensure they are still inside the visible area of any viewport. If not they are
 * unmounted until they come back into view and are then mounted again.
 */
export declare class IgeEntityManager extends IgeComponent {
    classId: string;
    componentId: string;
    _mountQueue: IgeEntity[];
    _unMountQueue: IgeEntity[];
    _maxMountsPerOp: number;
    _maxUnMountsPerOp: number;
    constructor(entity: IgeEntity, options?: any);
    /**
     * Called each update frame from the component parent and calls various private
     * methods to ensure that entities that should be mounted are mounted and those
     * that are to be unmounted are unmounted.
     * @private
     */
    _updateBehaviour: IgeEntityBehaviourMethod;
    /**
     * Checks all the mounted entities of our component parent are still supposed
     * to be in the scenegraph and if not, adds them to the un-mount queue. Also
     * marks any entities that are non-managed but also off-screen as inView = false.
     * @private
     */
    _updateOrphans: () => void;
    /**
     * Checks all the un-mounted entities of our component parent to see if they are
     * now inside the visible area of a viewport and if so, queues them for re-mounting.
     * @private
     */
    _updateChildren(): void;
    /**
     * Loops any entities queued for mounting and mounts them.
     * @private
     */
    _processMountQueue: () => void;
    /**
     * Loops any entities queued for un-mounting and un-mounts them.
     * @private
     */
    _processUnMountQueue: () => void;
}
