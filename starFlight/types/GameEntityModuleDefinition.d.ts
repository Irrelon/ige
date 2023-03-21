export type GameEntityModuleUsageCost = Record<string, number>;
export type GameEntityModuleBaseCost = Record<string, number>;
export type GameEntityModuleInputOutput = Record<string, number | Record<string, number>>;
export interface GameEntityModuleStateItem {
    initial: number;
    min: number;
    max: number;
}
export type GameEntityModuleStates = Record<string, GameEntityModuleStateItem>;
export interface GameEntityModuleEffectAction {
    action: "create" | "destroy";
    classId: string;
    mount: string;
    data: Record<string, any>;
}
export interface GameEntityModuleEffectAudio {
    "action": "play" | "stop";
    "audioId": string;
    "for"?: "all" | "owner";
    "loop"?: boolean;
    "position"?: "ambient" | "target";
    "mount"?: string;
}
export interface GameEntityModuleAudio {
    onActive?: GameEntityModuleEffectAudio[];
    onInactive?: GameEntityModuleEffectAudio[];
    onComplete?: GameEntityModuleEffectAudio[];
}
export interface GameEntityModuleEffects {
    onActive?: GameEntityModuleEffectAction[];
    onInactive?: GameEntityModuleEffectAction[];
    onComplete?: GameEntityModuleEffectAction[];
}
export interface GameEntityModuleDefinition {
    _id: string;
    type: string;
    slotType: string[];
    slotSize: 1;
    classId: string;
    name: string;
    damageIndex?: number;
    input: GameEntityModuleInputOutput;
    output: GameEntityModuleInputOutput;
    state: GameEntityModuleStates;
    attachTo: string[];
    baseCost: GameEntityModuleBaseCost;
    enabled: boolean;
    active: boolean;
    effects?: GameEntityModuleEffects;
    audio?: GameEntityModuleAudio;
}
