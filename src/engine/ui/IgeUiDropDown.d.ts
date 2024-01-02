import { IgeUiElement } from "@/engine/core/IgeUiElement";
import type { IgeUiLabel } from "@/engine/ui/IgeUiLabel";
import type { IgeCanvasRenderingContext2d } from "@/types/IgeCanvasRenderingContext2d";

export interface IgeUiDropDownOption {
	text: string;
	value: string;
	selected?: boolean;
}
export declare class IgeUiDropDown extends IgeUiElement {
	classId: string;
	_toggleState: boolean;
	_options: IgeUiDropDownOption[];
	_label: IgeUiLabel;
	constructor();
	options(ops?: IgeUiDropDownOption[]): this;
	addOption(op?: IgeUiDropDownOption): this;
	removeAllOptions(): void;
	/**
	 * The blur method removes global UI focus from this UI element.
	 */
	blur(): any;
	selectIndex(index: number): void;
	value(val?: IgeUiDropDownOption): any;
	toggle(): void;
	tick(ctx: IgeCanvasRenderingContext2d): void;
}
