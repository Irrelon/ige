import { IgeUiLabel } from "@/engine/ui/IgeUiLabel";
import { IgeUiEntity } from "@/engine/core/IgeUiEntity";
import { Tab } from "./Tab";
export declare class InfoWindow extends IgeUiEntity {
    classId: string;
    _tab?: Tab;
    _label?: IgeUiLabel;
    _windowGradient?: CanvasGradient;
    constructor(options: Record<string, any>);
    show(): this;
    windowGradient(color1: string, color2: string, color3: string): void;
}
