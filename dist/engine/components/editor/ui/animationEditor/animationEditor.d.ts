import { IgeEventingClass } from "../../../../core/IgeEventingClass.js"
export declare class UiAnimationEditor extends IgeEventingClass {
    classId: string;
    init(): void;
    reset(): void;
    ready(): void;
    show(settings: any): void;
    setupListeners(dialogElem: any): void;
    indexFromCell(cell: any): any;
    cellFromIndex(index: any): {
        x: number;
        y: number;
    };
    setupCanvas(): void;
    cellFromXY(event: any): {
        x: number;
        y: number;
    };
    _renderCanvas(noGrid: any): void;
    destroy(): void;
}
