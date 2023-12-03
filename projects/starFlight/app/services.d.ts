import { EntityModuleStates } from "../types/EntityModuleDefinition";
export declare function roundNumber(number: number, digits: number): number;
export declare function calculateModifierRatio(states: EntityModuleStates, modifierPerSecond: number, min: number, max: number, tickDelta: number, stateId: string): {
    proposedModifierValue: number;
    ratio: number;
};
