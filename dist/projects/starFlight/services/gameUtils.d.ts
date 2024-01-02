import type { PlayerDataModule } from "../app/data/playerData.js"
import type { EntityAbilityModuleDefinition } from "../types/EntityAbilityModuleDefinition.js"
import type { EntityModuleDefinition } from "../types/EntityModuleDefinition.js"
/**
 * Extends the target with data from the newData object.
 * If overwrite is false, only data that is undefined in
 * the target is set from data in the newData object.
 * @param target
 * @param newData
 * @param overwrite
 */
export declare const extend: (target: any, newData: any, overwrite?: boolean) => void;
/**
 * Gets a module's default data by its ID.
 * @param {String} moduleId The ID of the module to get.
 * @returns {*}
 */
export declare const getModuleById: (moduleId: string) => EntityModuleDefinition | EntityAbilityModuleDefinition | undefined;
/**
 * Generates a modules object with properties that contain
 * each module based on the moduleId.
 * @param {Array} moduleArr
 * @returns {Array}
 */
export declare const generateModuleObject: (moduleArr: PlayerDataModule[]) => Record<string, any>;
