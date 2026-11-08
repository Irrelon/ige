import { IgeEventingClass } from "./IgeEventingClass.js"
import type { IgeCanAsyncLoad } from "../../types/IgeCanAsyncLoad.js";
/** What whenSettled() resolves with: the asset, and the error if it failed to load. */
export interface IgeAssetSettled<AssetType> {
    asset: AssetType;
    error?: Error;
}
export declare class IgeAsset extends IgeEventingClass implements IgeCanAsyncLoad {
    _loaded: boolean;
    /** Set when loading failed (see whenSettled()). */
    _loadError?: Error;
    _assetId?: string;
    id(id?: string): string | undefined;
    /**
     * A promise that resolves to true when the asset has loaded.
     */
    whenLoaded(): Promise<this>;
    /**
     * A promise that resolves when the asset has either loaded or failed
     * to load, with the error in the second case. Unlike whenLoaded() it
     * never waits forever on a missing file.
     */
    whenSettled(): Promise<IgeAssetSettled<this>>;
    /** Record a failed load and emit "error". */
    _assetFailed(error: Error): void;
    _assetLoaded(): void;
    destroy(): this;
}
