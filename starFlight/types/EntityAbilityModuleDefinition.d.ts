import { EntityModuleAudio, EntityModuleBaseCost, EntityModuleDefinition, EntityModuleEffects, EntityModuleInputOutput, EntityModuleStates, EntityModuleUsageCost } from "./EntityModuleDefinition";
export interface EntityAbilityModuleDefinition extends EntityModuleDefinition {
    _id: string;
    type: string;
    slotType: string[];
    slotSize: 1;
    action: string;
    classId: string;
    name: string;
    abilityTitle: string;
    damageIndex?: number;
    usageCost: EntityModuleUsageCost;
    input: EntityModuleInputOutput;
    output: EntityModuleInputOutput;
    state: EntityModuleStates;
    range?: number;
    attachTo: string[];
    baseCost: EntityModuleBaseCost;
    requiresTarget?: boolean;
    enabled: boolean;
    active: boolean;
    activeDuration: number;
    cooldown: boolean;
    cooldownDuration: number;
    effects?: EntityModuleEffects;
    audio?: EntityModuleAudio;
}
