import { IgeEntity } from "@/engine/core/IgeEntity";
import { IgeEventingClass } from "@/engine/core/IgeEventingClass";
export declare class SpaceClient extends IgeEventingClass {
    constructor();
    /**
     * Called when the client receives a message from the server that it has
     * created an entity for our player, sending us the entity id so we can
     * keep track of our own player entity.
     * @param {String} entityId The id of our player entity.
     * @private
     */
    _onPlayerEntity(entityId: string): void;
    /**
     * Sets up camera tracking for our player entity.
     * @param {IgeEntity} ent Our player entity to track.
     * @private
     */
    _trackPlayerEntity(ent: IgeEntity): void;
}
