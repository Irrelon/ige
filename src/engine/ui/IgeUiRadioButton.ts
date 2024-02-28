import { IgeUiButton } from "@/export/exports";
import { registerClass } from "@/export/exports";
import type { IgeObject } from "@/export/exports";

export class IgeUiRadioButton extends IgeUiButton {
	classId = "IgeUiRadioButton";
	_uiRadioGroup?: number;
	_uiOnSelect?: () => void;
	_uiOnDeSelect?: () => void;
	_uiSelected: boolean = false;
	_parent: IgeObject | null = null;

	radioGroup (val: number) {
		if (val !== undefined) {
			this._uiRadioGroup = val;
			return this;
		}

		return this._uiRadioGroup;
	}

	_deselectChildren (parent?: IgeObject | null) {
		if (!parent) return;

		// Loop the parent object's children, find any
		// radio buttons that belong to this radio group
		// and then deselect them
		const childrenArr = parent._children;
		let arrCount = childrenArr.length,
			item: IgeUiRadioButton;

		while (arrCount--) {
			item = childrenArr[arrCount] as IgeUiRadioButton;
			if (item === this) continue;
			if (item._uiRadioGroup !== this._uiRadioGroup) continue;
			// The item is part of the same radio group!
			if (!item._uiSelected) continue;
			// The item is selected so un-select it!
			item._uiSelected = false;

			// Fire the item's onDeSelect method
			if (!item._uiOnDeSelect) continue;
			item._uiOnDeSelect();
		}
	}

	select (val: () => void) {
		if (val !== undefined) {
			this._uiOnSelect = val;
			return this;
		}

		this._deselectChildren(this._parent);

		// Now set this item as selected
		this._uiSelected = true;

		// Fire this item's onSelect method
		if (this._uiOnSelect) {
			this._uiOnSelect();
		}

		return this;
	}

	deSelect (val?: () => void) {
		if (val !== undefined) {
			this._uiOnDeSelect = val;
			return this;
		}

		this._uiSelected = false;

		if (this._uiOnDeSelect) {
			this._uiOnDeSelect();
		}

		return this;
	}
}

registerClass(IgeUiRadioButton);
