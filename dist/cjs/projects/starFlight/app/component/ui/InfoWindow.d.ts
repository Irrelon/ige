import { Tab } from "./Tab";
import { IgeUiEntity } from "@/engine/core/IgeUiEntity";
import { IgeUiLabel } from "@/engine/ui/IgeUiLabel";

export declare class InfoWindow extends IgeUiEntity {
	classId: string;
	_tab?: Tab;
	_label?: IgeUiLabel;
	_windowGradient?: CanvasGradient;
	constructor(options: Record<string, any>);
	show(): this;
	windowGradient(color1: string, color2: string, color3: string): void;
}
