import { GameEntityModuleDefinition, GameEntityModuleStates } from "../../../types/GameEntityModuleDefinition";

export const abilityCanBeActive = (module: GameEntityModuleDefinition, states: GameEntityModuleStates) => {
	return !module.cooldown() && (states.energy.val + module._definition.usageCost.energy) > 0;
};
