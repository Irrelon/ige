import type { IgeAsset } from "../../export/exports.js"
import { IgeEventingClass } from "../../export/exports.js"
export declare class IgeAssetRegister<AssetType extends IgeAsset> extends IgeEventingClass {
    _assetById: Record<string, AssetType>;
    _assetsLoading: number;
    _assetsTotal: number;
    exists(id: string): boolean;
    get(id: string): AssetType;
    add(id: string, item: AssetType): void;
    remove(id: string): void;
    addGroup(group: Record<string, AssetType>): void;
    removeGroup(group: Record<string, AssetType>): void;
    removeList(list: AssetType[]): void;
    whenLoaded(): Promise<boolean[]>;
}
