export type EntityModuleUsageCost = Record<string, number>;
export type EntityModuleBaseCost = Record<string, number>;
export type EntityModuleInputOutput = Record<string, number | Record<string, number>>;
export interface EntityModuleStateItem {
    initial: number;
    min?: number;
    max?: number;
    val?: number;
}
export type EntityModuleStates = Record<string, EntityModuleStateItem>;
export interface EntityModuleEffectAction {
    action: "create" | "destroy";
    classId: string;
    mount: string;
    data: Record<string, any>;
}
export interface EntityModuleEffectAudio {
    action: "play" | "stop";
    audioId: string;
    for?: "all" | "owner";
    loop?: boolean;
    position?: "ambient" | "target";
    mount?: string;
}
export interface EntityModuleAudio {
    onActive?: EntityModuleEffectAudio[];
    onInactive?: EntityModuleEffectAudio[];
    onComplete?: EntityModuleEffectAudio[];
}
export interface EntityModuleEffects {
    onActive?: EntityModuleEffectAction[];
    onInactive?: EntityModuleEffectAction[];
    onComplete?: EntityModuleEffectAction[];
}
export interface EntityModuleDefinition {
    _id: string;
    type: string;
    slotType: string[];
    slotSize: 1;
    classId: string;
    name: string;
    damageIndex?: number;
    input: EntityModuleInputOutput;
    output: EntityModuleInputOutput;
    state: EntityModuleStates;
    attachTo: string[];
    baseCost: EntityModuleBaseCost;
    enabled: boolean;
    active: boolean;
    effects?: EntityModuleEffects;
    audio?: EntityModuleAudio;
    requiresTarget?: boolean;
}
