import { GameEntityModuleStates } from "../types/GameEntityModuleDefinition";
export declare function roundNumber(number: number, digits: number): number;
export declare function calculateModifierRatio(states: GameEntityModuleStates, modifierPerSecond: number, min: number, max: number, tickDelta: number, stateId: string): {
    proposedModifierValue: number;
    ratio: number;
};
