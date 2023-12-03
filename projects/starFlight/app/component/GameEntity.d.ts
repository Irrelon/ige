import { IgeEntityBox2d } from "../../../../engine/components/physics/box2d/IgeEntityBox2d";
import { EntityModuleDefinition } from "../../types/EntityModuleDefinition";
import { IgeCanvasRenderingContext2d } from "../../../../types/IgeCanvasRenderingContext2d";
import { IgeNetworkServerSideRequestHandler } from "../../../../types/IgeNetworkMessage";
import { Module_Generic } from "./module/Module_Generic";
import { EntityAbilityModuleDefinition } from "../../types/EntityAbilityModuleDefinition";
export interface EntityPublicGameData {
    clientId?: string;
    state: Record<string, any>;
    module: EntityModuleDefinition | EntityAbilityModuleDefinition;
    ability: Record<string, any>;
    acceptsActionObj: Record<string, any>;
    size?: number;
    type?: number;
    rotation?: number;
}
export interface EntityPrivateGameData {
    state?: Record<string, any>;
    module: Record<string, Module_Generic>;
    ability?: Record<string, any>;
    acceptsActionObj?: Record<string, any>;
}
export declare class GameEntity extends IgeEntityBox2d {
    classId: string;
    _publicGameData: EntityPublicGameData;
    _privateGameData: EntityPrivateGameData;
    _tickTime: number;
    _health: number;
    constructor(publicGameData?: EntityPublicGameData);
    streamCreateConstructorArgs(): EntityPublicGameData[];
    /**
     * Override the default IgeEntity class streamSectionData() method
     * so that we can check for custom sections and handle how we deal
     * with them.
     * @param {String} sectionId A string identifying the section to
     * handle data get / set for.
     * @param {String=} data If present, this is the data that has been sent
     * from the server to the client for this entity.
     * @return {*}
     */
    streamSectionData(sectionId: string, data: string): any;
    _setup(): void;
    /**
     * Gets / sets an ability id to module id mapping.
     * @param abilityId
     * @param moduleId
     * @returns {*}
     */
    ability(abilityId: string, moduleId?: string): any;
    /**
     * Gets / sets the module by slot number.
     * @param {Number} moduleId The slot number to get / set component for.
     * @param {Object=} moduleDefinition The component object to set to the slot.
     * Set to null to remove the existing component.
     * @returns {*}
     */
    module(moduleId: string, moduleDefinition?: EntityModuleDefinition): any;
    /**
     * Gets the private module data by slot number.
     * @param {Number} moduleId The slot number to get / set component for.
     * Set to null to remove the existing component.
     * @returns {*}
     */
    privateModule(moduleId?: string): Module_Generic | undefined;
    /**
     * Checks if this entity can accept the given action or sets the
     * `accept` value for an action.
     * @param {String} action
     * @param {Boolean=} val Optional, if supplied sets the action's
     * accepted flag rather than getting it.
     * @returns {Boolean|*}
     */
    acceptsAction(action?: string, val?: boolean): any;
    update(ctx: IgeCanvasRenderingContext2d, tickDelta: number): void;
    /**
     * Updates the modules for this entity based on the tick delta.
     * This does things like add to state values (e.g. energy + 1)
     * and also drains state values (e.g. fuel -5) etc.
     * @param {Number} tickDelta The number of milliseconds since
     * the last tick.
     * @private
     */
    _resolveModules(tickDelta: number): void;
    /**
     * Called by the client requesting ability usage. Activates an ability if
     * the ability is not already active or on cooldown.
     * @param {Object} data Arbitrary data that the ability usage might need
     * and is sent by the client.
     * @param {Function} callback The callback to send the result to.
     * @returns {*}
     * @private
     */
    _onAbilityUseRequest: IgeNetworkServerSideRequestHandler;
    /**
     * Sends a request to the server to use an ability.
     * @param {String} abilityId The ID of the ability to use.
     * @param {String=} targetId Optional. The ID of the entity
     * that is targeted by the ability (if any).
     */
    useAbility(abilityId: string, targetId?: string): void;
    applyDamage(val: number): this;
}