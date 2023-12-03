import { IgeEventingClass } from "../../../../engine/core/IgeEventingClass";
export interface InventoryItem {
    _id?: string;
    type: string;
    meta?: Record<string, any>;
}
export declare class Inventory extends IgeEventingClass {
    classId: string;
    _inventory: InventoryItem[];
    _onChange(): void;
    post(data: InventoryItem | InventoryItem[]): void;
    get(id: string): InventoryItem | InventoryItem[] | undefined;
    put(id: string, data: InventoryItem): boolean;
    delete(id: string): boolean;
    count(): number;
}
