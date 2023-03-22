import { EntityModuleDefinition, EntityModuleStates } from "../../../types/EntityModuleDefinition";

export const abilityCanBeActive = (module: EntityModuleDefinition, states: EntityModuleStates) => {
	return !module.cooldown() && (states.energy.val + module._definition.usageCost.energy) > 0;
};
