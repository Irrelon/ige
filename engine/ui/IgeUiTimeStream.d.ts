import { IgeUiElement } from "@/engine/core/IgeUiElement";
export declare class IgeUiTimeStream extends IgeUiElement {
    classId: string;
    monitor(entity: any): void;
    tick(ctx: any): void;
}