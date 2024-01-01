import { IgeEventingClass } from "./IgeEventingClass";
import { IgeCanAsyncLoad } from "@/types/IgeCanAsyncLoad";
export declare class IgeAsset extends IgeEventingClass implements IgeCanAsyncLoad {
    _loaded: boolean;
    _assetId?: string;
    id(id?: string): string | undefined;
    /**
     * A promise that resolves to true when the asset has loaded.
     */
    whenLoaded(): Promise<boolean>;
    destroy(): this;
}
