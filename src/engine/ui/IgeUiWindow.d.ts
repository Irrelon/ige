import type { IgePoint3d } from "@/engine/core/IgePoint3d";
import type { IgeUiButton } from "@/engine/ui/IgeUiButton";
import type { IgeUiLabel } from "@/engine/ui/IgeUiLabel";
import { IgeUiElement } from "../core/IgeUiElement";

export declare class IgeUiWindow extends IgeUiElement {
	classId: string;
	_draggable: boolean;
	_dragging: boolean;
	_topNav: IgeUiElement;
	_label: IgeUiLabel;
	_closeButton: IgeUiButton;
	_opStartMouse?: IgePoint3d;
	_opStartTranslate: Record<string, number>;
	constructor();
	_dragStart(): true | undefined;
	_dragMove(): true | undefined;
	_dragEnd(): true | undefined;
	draggable(val: boolean): void;
	blur(): boolean;
	title(val: string): this;
	title(): string;
	titleColor(val: string): this;
	titleColor(): string;
	titleFont(val: string): this;
	titleFont(): string;
}
