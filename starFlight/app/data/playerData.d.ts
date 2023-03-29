export interface PlayerDataInventory {
    type: string;
    meta: Record<string, any>;
}
export interface PlayerDataModule {
    _id: string;
    moduleId: string;
    abilityId?: string | number;
}
export interface PlayerData {
    inventory: PlayerDataInventory[];
    modules: PlayerDataModule[];
}
export declare const playerData: PlayerData;
