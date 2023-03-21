export declare function roundNumber(number: number, digits: number): number;
export declare function calculateModifierRatio(states: any, modifierPerSecond: number, min: number, max: number, tickDelta: number, stateId: string): {
    proposedModifierValue: number;
    ratio: number;
};
