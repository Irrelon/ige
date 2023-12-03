import { IgeSceneGraph } from "../../../../engine/core/IgeSceneGraph";
import { EntityModuleDefinition } from "../../types/EntityModuleDefinition";
import { EntityAbilityModuleDefinition } from "../../types/EntityAbilityModuleDefinition";
import { GameEntity } from "../component/GameEntity";
export interface ClientPublicGameData {
    modules: Record<string, EntityModuleDefinition | EntityAbilityModuleDefinition>;
}
export declare class SpaceClientScene extends IgeSceneGraph {
    classId: string;
    publicGameData: ClientPublicGameData;
    constructor();
    addGraph(): Promise<void>;
    removeGraph(): void;
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
    _trackPlayerEntity(ent: GameEntity): void;
}
