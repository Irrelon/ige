import { type IgeAnyFunction, arrPull } from "@/export/exports";
import { IgeEventingClass } from "@/export/exports";
import type { IgeInputComponent, IgeUiElement, IgeUiStyleObject } from "@/export/exports";
import { ige } from "@/export/exports";
import { IgeEventReturnFlag } from "@/export/exports";
import type { IgeIsReadyPromise } from "@/export/exports";
import type { IgeClassRecord } from "@/types/IgeClassRecord";

export class IgeUiManagerController extends IgeEventingClass implements IgeIsReadyPromise {
	static componentTargetClass = "IgeEngine";
	componentId = "ui";
	classId = "IgeUiManagerController";

	_focus: IgeUiElement | null = null; // The element that currently has focus
	_caret: null = null; // The caret position within the focused element
	_register: IgeUiElement[] = [];
	_styles: Record<string, IgeUiStyleObject> = {};
	_elementsByStyle: Record<string, IgeUiElement[]> = {};

	isReady () {
		return new Promise<void>((resolve) => {
			setTimeout(() => {
				this._addEventListeners(resolve);
			}, 1);
		});
	}

	_addEventListeners = (callback?: IgeAnyFunction) => {
		// Remove any previous listeners
		this._removeEventListeners();

		ige.dependencies.waitFor(["input"], () => {
			(ige.input as IgeInputComponent).on("keyDown", this._keyDown);

			callback?.();
		});
	};

	_removeEventListeners = (callback?: IgeAnyFunction) => {
		ige.dependencies.waitFor(["input"], () => {
			(ige.input as IgeInputComponent).off("keyDown", this._keyDown);

			callback?.();
		});
	};

	/**
	 * Get / set a style by name. This is the main way to define styles using
	 * the engine's style system. A style name can be any string that maps to
	 * a method name on the target entity that the style will be applied to.
	 *
	 * The style() function supports a similar naming convention to CSS so to
	 * create a style for an entity that has a specific id you would start the
	 * style name with a hash # character. To create a style class that can be
	 * shared and applied to multiple entities at the same time, the name starts
	 * with a period . character. You can also define styles for a specific
	 * entity constructor e.g. IgeUiTextbox.
	 *
	 * Finally, all style types support the addition of modifier states to a
	 * style that respond to the internal state of the entity it's applied to.
	 * You denote modifier state names by providing the style name, then a
	 * colon : character, then the modifier name. Supported modifiers are
	 * defined in the type IgeUiStyleModifier. Styles are always applied in
	 * the order of least specific to most specific, so constructor styles
	 * first, then style classes and finally id-based styles.
	 *
	 * @example Create an id-based style
	 * 		> Styles with a # are auto-applied to IgeUiElement() instances
	 * 		> where the id matches the name after the #
	 * 		// Create the style targeting the id
	 * 		ige.ui.style("#myEntityId", {color: "blue"});
	 *
	 * 		// Create the entity with the id - the style is auto-applied
	 * 		new IgeUiElement().id("myEntityId");
	 *
	 * @example Create a style class that can be shared
	 * 		> Styles starting with a . are considered "style classes"
	 * 		> and can be applied to multiple ui entities
	 * 		// Create a style class
	 * 		ige.ui.style(".blueText", {color: "blue"});
	 *
	 * 		// Create an entity and assign the style class
	 * 		new IgeUiElement().styleClass("blueText");
	 *
	 * @example Create a style targeting a constructor
	 * 		> Styles that don't start with a # or . are considered
	 * 		> constructor selectors
	 * 		// Create a style that targets a constructor
	 * 		ige.ui.style("IgeUiTextbox", {color: "purple"});
	 *
	 * 		// Create an entity with the IgeUiTextbox constructor
	 * 		// the style for this constructor is automatically applied
	 * 		new IgeUiTextbox();
	 *
	 * @example Create a modifier style
	 * 		> Style names that have a colon : in their name are
	 * 		> considered to be modifier styles
	 * 		ige.ui.style("IgeUiTextbox:focus", {
	 * 			borderColor: "red",
	 * 			borderWidth: 1
	 * 		});
	 *
	 * @param {string} name The unique name of the style.
	 * @param {Object=} data The style properties and values to assign to the
	 * style.
	 * @returns {*}
	 */
	style<StyleClassType> (name: string, data: IgeClassRecord<Partial<StyleClassType>>): this;
	style<StyleClassType> (name: string | undefined): IgeClassRecord<Partial<StyleClassType>> | undefined;
	style<StyleClassType> (): this;
	style<StyleClassType> (name?: string, data?: IgeClassRecord<Partial<StyleClassType>>) {
		if (name !== undefined) {
			if (data !== undefined) {
				// Set the data against the name, update any elements using the style
				this._styles[name] = data;
				return this;
			}

			// Get the data and return
			return this._styles[name];
		}

		return;
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

	/**
	 * Tells the currently focussed element to blur. Can still
	 * be cancelled by an event listener that returns a cancel signal.
	 */
	blurCurrent () {
		if (!this._focus) return;
		this._focus.blur();
	}

	/**
	 * Attempts to place focus on the passed element. If focus is successful
	 * or the element is already focussed, returns true, otherwise returns
	 * false.
	 * @param elem
	 */
	focus (elem: IgeUiElement) {
		//console.log("Global focus call", elem, new Error().stack);
		if (elem !== undefined) {
			if (elem !== this._focus) {
				//console.log("Global focus being set to", elem, new Error().stack);
				// The element is not our current focus so focus to it
				const previousFocus = this._focus;

				// Tell the current focused element that it is about to lose focus
				if (!previousFocus || previousFocus.emit("blur", elem) !== IgeEventReturnFlag.cancel) {
					if (previousFocus) {
						previousFocus._focused = false;
						previousFocus.blur();
					}

					// The blur was not cancelled
					if (elem.emit("focus", previousFocus) !== IgeEventReturnFlag.cancel) {
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
				// Tell the current focused element that it is about to lose focus
				if (elem.emit("blur") !== IgeEventReturnFlag.cancel) {
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
			(ige.input as IgeInputComponent).stopPropagation();
		}
	};

	_keyDown = (event: Event) => {
		// Direct the key event to the focused element
		if (this._focus) {
			this._focus.emit("keyDown", event);
			(ige.input as IgeInputComponent).stopPropagation();
		}
	};
}
