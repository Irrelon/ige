import { IgeComponent } from "../../core/IgeComponent";
import type { IgeEntity } from "../../core/IgeEntity";
import type { IgeEventListenerObject, IgeMultiEventListenerObject } from "../../mixins/IgeEventingMixin";

/**
 * When added to a viewport, automatically adds entity rotate
 * capabilities to the selected entity in the scenegraph viewer.
 */
declare class IgeEditorComponent extends IgeComponent {
	classId: string;
	componentId: string;
	ui: Record<string, any>;
	objectDefault: Record<string, Record<string, any>>;
	_showStats: number;
	_templateCache: Record<string, any>;
	_cacheTemplates: boolean;
	_interceptMouse: boolean;
	_activateKeyHandle?: IgeEventListenerObject | IgeMultiEventListenerObject;
	_pointerUpHandle?: IgeEventListenerObject | IgeMultiEventListenerObject;
	_pointerDownHandle?: IgeEventListenerObject | IgeMultiEventListenerObject;
	_pointerMoveHandle?: IgeEventListenerObject | IgeMultiEventListenerObject;
	_contextMenuHandle?: IgeEventListenerObject | IgeMultiEventListenerObject;
	_enabled: boolean;
	_show: boolean;
	/**
	 * @constructor
	 * @param entity The object that the component is added to.
	 * @param options The options object that was passed to the component during
	 * the call to addComponent.
	 */
	constructor(entity: IgeEntity, options?: any);
	interceptMouse: (val: boolean) => void;
	/**
	 * Gets / sets the enabled flag. If set to true,
	 * operations will be processed. If false, no operations will
	 * occur.
	 * @param {boolean=} val
	 * @return {*}
	 */
	enabled: (val?: boolean) => any;
	toggle: () => void;
	show: () => void;
	hide: () => void;
	toggleStats: () => void;
	showStats: () => void;
	hideStats: () => void;
	loadHtml: (url: string, callback: (content: string) => void) => void;
	template: (url: any, callback: any) => void;
	renderTemplate: (url: any, data: any, callback: any) => void;
	selectObject: (id: any) => void;
	_objectSelected: (obj: any) => void;
	destroySelected: () => void;
	createObject: (classId: any, select: any) => void;
	/**
	 * Updates the stats HTML overlay with the latest data.
	 * @private
	 */
	_statsTick: () => void;
	addToSgTree: (item: any) => void;
	toggleShowEditor: () => void;
	sgTreeUpdate: () => void;
}
export default IgeEditorComponent;
