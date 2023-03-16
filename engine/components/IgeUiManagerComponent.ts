import { ige } from "../instance";
import IgeComponent from "../core/IgeComponent";
import {arrPull} from "../services/utils";
import IgeEntity from "../core/IgeEntity";
import IgeUiElement, { IgeUiStyleObject } from "../core/IgeUiElement";
import type IgeInputComponent from "./IgeInputComponent";

class IgeUiManagerComponent extends IgeComponent {
	static componentTargetClass = "Ige";
	classId = "IgeUiManagerComponent";
	componentId = "ui";

	_focus: IgeUiElement | null = null; // The element that currently has focus
	_caret: null = null; // The caret position within the focused element
	_register: IgeUiElement[] = [];
	_styles: Record<string, IgeUiStyleObject> = {};
	_elementsByStyle: Record<string, IgeUiElement[]> = {};
	
	constructor (entity: IgeEntity, options?: any) {
		super(entity, options);

		(ige.engine.components.input as IgeInputComponent).on("keyDown", (event) => {
			this._keyDown(event);
		});
	}

	/**
	 * Get / set a style by name.
	 * @param {String} name The unique name of the style.
	 * @param {Object=} data The style properties and values to assign to the
	 * style.
	 * @returns {*}
	 */
	style (name?: string, data?: IgeUiStyleObject) {
		if (name !== undefined) {
			if (data !== undefined) {
				// Set the data against the name, update any elements using the style
				this._styles[name] = data;
				return this;
			}

			// Get the data and return
			return this._styles[name];
		}

		return this;
	}

	/**
	 * Registers a UI element with the UI manager.
	 * @param elem
	 */
	registerElement (elem: IgeUiElement) {
		this._register.push(elem);
	}

	/**
	 * Un-registers a UI element with the UI manager.
	 * @param elem
	 */
	unRegisterElement (elem: IgeUiElement) {
		arrPull(this._register, elem);

		// Kill any styles defined for this element id
		delete this._styles["#" + elem._id];

		delete this._styles["#" + elem._id + ":active"];
		delete this._styles["#" + elem._id + ":focus"];
		delete this._styles["#" + elem._id + ":hover"];
	}

	/**
	 * Registers a UI element against a style for quick lookup.
	 * @param elem
	 */
	registerElementStyle (elem: IgeUiElement) {
		if (elem && elem._styleClass) {
			this._elementsByStyle[elem._styleClass] = this._elementsByStyle[elem._styleClass] || [];
			this._elementsByStyle[elem._styleClass].push(elem);
		}
	}

	/**
	 * Un-registers a UI element from a style.
	 * @param elem
	 */
	unRegisterElementStyle (elem: IgeUiElement) {
		if (elem && elem._styleClass) {
			this._elementsByStyle[elem._styleClass] = this._elementsByStyle[elem._styleClass] || [];
			this._elementsByStyle[elem._styleClass].push(elem);
		}
	}

	canFocus (elem: IgeUiElement) {
		return elem._allowFocus;
	}

	focus (elem: IgeUiElement) {
		if (elem !== undefined) {
			if (elem !== this._focus) {
				// The element is not our current focus so focus to it
				const previousFocus = this._focus;

				// Tell the current focused element that it is about to loose focus
				if (!previousFocus || !previousFocus.emit("blur", elem)) {
					if (previousFocus) {
						previousFocus._focused = false;
						previousFocus.blur();
					}

					// The blur was not cancelled
					if (!elem.emit("focus", previousFocus)) {
						// The focus was not cancelled
						this._focus = elem;
						elem._focused = true;

						return true;
					}
				}
			} else {
				// We are already focused
				return true;
			}
		}

		return false;
	}

	blur (elem: IgeUiElement) {
		//console.log('blur', elem._id, elem);
		if (elem !== undefined) {
			if (elem === this._focus) {
				// The element is currently focused
				// Tell the current focused element that it is about to loose focus
				if (!elem.emit("blur")) {
					// The blur was not cancelled
					this._focus = null;
					elem._focused = false;
					elem._updateStyle();

					return true;
				}
			}
		}

		return false;
	}

	_keyUp = (event: Event) => {
		// Direct the key event to the focused element
		if (this._focus) {
			this._focus.emit("keyUp", event);
			(ige.engine.components.input as IgeInputComponent).stopPropagation();
		}
	}

	_keyDown = (event: Event) => {
		// Direct the key event to the focused element
		if (this._focus) {
			this._focus.emit("keyDown", event);
			(ige.engine.components.input as IgeInputComponent).stopPropagation();
		}
	}
}

export default IgeUiManagerComponent;
