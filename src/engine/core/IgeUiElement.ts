import { IgeUiEntity } from "@/export/exports";
import type { IgeUiManagerController } from "@/export/exports";
import { registerClass } from "@/export/exports";
import { ige } from "@/export/exports";
import type { IgeInputComponent } from "@/export/exports";
import type { IgeUiStyleModifier } from "@/export/exports";
import type { IgeUiStyleObject } from "@/export/exports";

/**
 * Creates a new UI element. UI elements use more resources and CPU
 * than standard IgeEntity instances but provide a rich set of extra
 * positioning and styling methods as well as reacting to styles
 * defined using the IgeUiManagerController.
 *
 * IgeUiElement instances are similar to DOM elements. They receive
 * their own pointer events as standard and also stop propagation
 * of those events to lower depth entities and as such, should only
 * be used if you intend to create user-interface elements. If you
 * don't intend to create an element, use IgeUiEntity instead as
 * those will use fewer resources and will not block pointer events
 * from propagating to lower depth entities by default.
 */
export class IgeUiElement extends IgeUiEntity {
	classId = "IgeUiElement";

	_focused: boolean = false;
	_allowHover: boolean = true;
	_allowFocus: boolean = true;
	_allowActive: boolean = true;
	_styleClass?: string;
	_style?: IgeUiStyleObject;
	_value?: any;

	constructor () {
		super();

		if (!(ige.ui as IgeUiManagerController))
			throw new Error(
				"Engine UI component has not been added to the engine, please add the component IgeUiManagerController to the engine"
			);
		(ige.ui as IgeUiManagerController).registerElement(this);

		this.on("pointerOver", () => {
			if (this._allowHover) {
				this._updateStyle();
				(ige.input as IgeInputComponent).stopPropagation();
			} else {
				this._pointerStateOver = false;
			}
		});

		this.on("pointerOut", () => {
			if (this._allowHover) {
				this._updateStyle();
				(ige.input as IgeInputComponent).stopPropagation();
			} else {
				this._pointerStateOver = false;
			}
		});

		this.on("pointerDown", () => {
			if (this._allowActive) {
				this._updateStyle();
				(ige.input as IgeInputComponent).stopPropagation();
			} else {
				this._pointerStateDown = false;
			}
		});

		this.on("pointerUp", () => {
			if (this._allowFocus) {
				// Try to focus the entity
				if (!this.focus()) {
					this._updateStyle();
				} else {
					(ige.input as IgeInputComponent).stopPropagation();
				}
			} else if (this._allowActive) {
				this._updateStyle();
			}
		});

		// Enable mouse events on this entity by default
		this.pointerEventsActive(true);
	}

	allowHover (val: boolean): this;
	allowHover (): boolean;
	allowHover (val?: boolean) {
		if (val !== undefined) {
			this._allowHover = val;
			return this;
		}

		return this._allowHover;
	}

	allowFocus (val: boolean): this;
	allowFocus (): boolean;
	allowFocus (val?: boolean) {
		if (val !== undefined) {
			this._allowFocus = val;
			return this;
		}

		return this._allowFocus;
	}

	allowActive (val: boolean): this;
	allowActive (): boolean;
	allowActive (val?: boolean) {
		if (val !== undefined) {
			this._allowActive = val;
			return this;
		}

		return this._allowActive;
	}

	/**
	 * Gets / sets the applied style by name.
	 * @param {string=} name The style name to apply.
	 * @returns {*}
	 */
	styleClass (name?: string): this;
	styleClass (): string;
	styleClass (name?: string) {
		if (name === undefined) {
			return this._styleClass;
		}

		// Add a period to the class name
		name = "." + name;

		// Check for existing assigned style
		if (this._styleClass && this._styleClass !== name) {
			// Unregister this element from the style
			(ige.ui as IgeUiManagerController).unRegisterElementStyle(this);
		}

		// Assign the new style
		this._styleClass = name;

		// Register the element for this style
		(ige.ui as IgeUiManagerController).registerElementStyle(this);

		// Update the element style
		this._updateStyle();

		return this;
	}

	/**
	 * Gets / sets a style for this individual element.
	 * @param {string=} property The property to get / set.
	 * @param {*=} value The value to set for the property.
	 * @return {*}
	 */
	style (property: string, value: any): this;
	style (property: string): any;
	style (property: string, value?: any) {
		const ui = ige.ui as IgeUiManagerController;
		const allStyles: Record<string, any> = {};

		const elementStyles = ui.style(this.classId) || {}; // Get styles by element type (e.g. "IgeUiButton")
		const classStyles = ui.style(this._styleClass) || {}; // Get styles by class name (e.g. ".helpButton")
		const idStyles = ui.style("#" + this._id) || {}; // Get styles by element id (e.g. "#myHelpButton")

		for (const i in elementStyles) {
			if (elementStyles.hasOwnProperty(i)) {
				allStyles[i] = elementStyles[i];
			}
		}

		for (const i in classStyles) {
			if (classStyles.hasOwnProperty(i)) {
				allStyles[i] = classStyles[i];
			}
		}

		for (const i in idStyles) {
			if (idStyles.hasOwnProperty(i)) {
				allStyles[i] = idStyles[i];
			}
		}

		if (property !== undefined) {
			if (value !== undefined) {
				// Assign property value to our idStyles object and
				// assign it back to the style management component
				idStyles[property] = value;
				ui.style("#" + this._id, idStyles);
				return this;
			}

			return allStyles[property];
		}

		return allStyles;
	}

	/**
	 * Uses the entity's classId, styleClass and id to apply any styles
	 * defined that match those values. Styles are applied in the order:
	 * classId -> styleClass -> id so a style targeting the entity's id
	 * would override any of the same style parameters defined in a style
	 * class or classId.
	 */
	_updateStyle () {
		// Apply styles in order of class, class:focus, class:hover, class:active,
		// id, id:focus, id:hover, id:active
		this._processStyle(this.classId);
		this._processStyle(this._styleClass);
		this._processStyle("#" + this._id);

		if (this._focused) {
			this._processStyle(this.classId, "focus");
			this._processStyle(this._styleClass, "focus");
			this._processStyle("#" + this._id, "focus");
		}

		if (this._pointerStateOver) {
			this._processStyle(this.classId, "hover");
			this._processStyle(this._styleClass, "hover");
			this._processStyle("#" + this._id, "hover");
		}

		if (this._pointerStateDown) {
			this._processStyle(this.classId, "active");
			this._processStyle(this._styleClass, "active");
			this._processStyle("#" + this._id, "active");
		}
	}

	/**
	 * Process a given style + state and apply it to the element.
	 * This means method provides a way for the style system to apply styles
	 * based on both the style name and the current state of the element.
	 * The style system supports common modifier states similar to CSS.
	 * For instance, you can define a style in the ui system via:
	 *
	 * 		ige.ui.style(".myStyleClass", {paddingLeft: 10});
	 *
	 * You can then define a modifier to that style:
	 *
	 * 		ige.ui.style(".myStyleClass:focus", {paddingLeft: 20});
	 *
	 * When you assign the style class to an IgeUiElement, the focus state of
	 * that element will affect the style being applied:
	 *
	 * 		new IgeUiTextbox().styleClass("myStyleClass");
	 *
	 * When un-focussed, the textbox will have left-padding of 10. When the
	 * user clicks into the textbox and it gains focus, the left-padding will
	 * update to 20. When it loses focus the left-padding will reset to 10.
	 *
	 * @see IgeUiManagerController.style()
	 * @param {string} styleName - The name of the style to process.
	 * @param {IgeUiStyleModifier} [state] - The state of the style.
	 *
	 * @return {void}
	 */
	_processStyle (styleName?: string, state?: IgeUiStyleModifier): undefined {
		if (!styleName) {
			return;
		}

		if (state) {
			styleName += ":" + state;
		}

		const styleData = (ige.ui as IgeUiManagerController).style(styleName);

		if (styleData) {
			//this.log('Applying styles with selector "' + styleName + '"');
			this.applyStyle(styleData);
		}
	}

	/**
	 * Apply styles from a style data object. Usually you don't want to
	 * call this method directly but rather assign a style by name using
	 * the style() method, however it is not illegal practise to apply
	 * here if you wish, if you have not defined a style by name and simply
	 * wish to apply style data directly.
	 *
	 * Style property names must correspond to method names in the element
	 * class that the style is being applied to. You can see the default
	 * ui style methods available in the ./engine/ui/IgeUi* files.
	 *
	 * In the example below showing padding, you can see how the data assigned
	 * is passed to the "padding()" method as arguments, which is the same
	 * as calling "padding(10, 10, 10, 10);".
	 *
	 * @example #Apply a background color
	 *     var elem = new IgeUiElement()
	 *         .applyStyle({
	 *             'backgroundColor': '#ffffff' // Set background color to white
	 *         });
	 *
	 *     Internally, this call is equivalent to `elem.backgroundColor("#ffffff");`
	 *
	 * @example #Apply padding with multiple arguments
	 *     var elem = new IgeUiElement()
	 *         .applyStyle({
	 *             'padding': [10, 10, 10, 10] // Set padding using multiple values
	 *         });
	 *
	 *     Internally, this call is equivalent to `elem.padding(10, 10, 10, 10);`
	 *
	 * @param {Object} styleData The style object to apply. This object should
	 * contain key/value pairs where the key matches a method name and the value
	 * is the argument or array of arguments to pass it. Arrays of arguments are
	 * spread using the `...args` spread operator e.g. `someFunc(...args);`
	 */
	applyStyle (styleData: IgeUiStyleObject): this;
	applyStyle (): IgeUiStyleObject;
	applyStyle (styleData?: IgeUiStyleObject) {
		if (styleData === undefined) {
			return this;
		}

		// Loop the style data and apply styles as required
		for (const functionName in styleData) {
			// Check that the style method exists
			// @ts-ignore
			if (typeof this[functionName] === "function") {
				// The method exists, call it with the arguments
				let args: any[];

				if (styleData[functionName] instanceof Array) {
					args = styleData[functionName];
				} else {
					args = [styleData[functionName]];
				}

				// @ts-ignore
				this[functionName](...args);
			}
		}

		return this;
	}

	/**
	 * Sets global UI focus to this element.
	 */
	focus () {
		if ((ige.ui as IgeUiManagerController).focus(this)) {
			// Re-apply styles since the change
			this._updateStyle();
			return true;
		}

		return false;
	}

	/**
	 * The blur method removes global UI focus from this UI element.
	 */
	blur () {
		if ((ige.ui as IgeUiManagerController).blur(this)) {
			// Re-apply styles since the change
			this._updateStyle();
			return true;
		}

		return false;
	}

	focused () {
		return this._focused;
	}

	value (val?: any) {
		if (val !== undefined) {
			this._value = val;
			return this;
		}

		return this._value;
	}

	_mounted () {
		this._updateStyle();
	}

	/**
	 * Destructor
	 */
	destroy () {
		(ige.ui as IgeUiManagerController).unRegisterElement(this);
		return super.destroy();
	}
}

registerClass(IgeUiElement);
