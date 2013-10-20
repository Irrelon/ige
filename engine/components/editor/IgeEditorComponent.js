/**
 * When added to a viewport, automatically adds entity rotate
 * capabilities to the selected entity in the scenegraph viewer.
 */
var IgeEditorComponent = IgeEventingClass.extend({
	classId: 'IgeEditorComponent',
	componentId: 'editor',

	/**
	 * @constructor
	 * @param {IgeObject} entity The object that the component is added to.
	 * @param {Object=} options The options object that was passed to the component during
	 * the call to addComponent.
	 */
	init: function (entity, options) {
		var self = this;
		
		this._entity = entity;
		this._options = options;
		
		// Add the editor panels component
		this.addComponent(IgeEditorPanelsComponent);
		
		// Load jQuery, the editor will use it for DOM manipulation simplicity
		ige.requireScript('//ajax.googleapis.com/ajax/libs/jquery/2.0.3/jquery.min.js');
		
		// Load jsRender for HTML template support
		ige.requireScript(igeRoot + 'components/editor/vendor/jsRender.js');
		
		// Listen for scenegraph tree selection updates
		ige.on('sgTreeSelectionChanged', function (objectId) {
			self._objectSelected(ige.$(objectId));
		});

		// Set the component to inactive to start with
		this._enabled = true;
	},

	/**
	 * Gets / sets the enabled flag. If set to true, 
	 * operations will be processed. If false, no operations will
	 * occur.
	 * @param {Boolean=} val
	 * @return {*}
	 */
	enabled: function (val) {
		var self = this;

		if (val !== undefined) {
			this._enabled = val;
			return this._entity;
		}

		return this._enabled;
	},
	
	_objectSelected: function (obj) {
		if (obj) {
			ige.editor.panels.showPanelByInstance(obj);
		}
	}
});
