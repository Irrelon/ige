"use strict";

appCore.module('UiToolBox', function ($ige, IgeEventingClass, UiToolBox_ToolCreate, UiToolBox_ToolSelect, UiToolBox_ToolPan, UiToolBox_ToolTranslate) {
	var UiToolBox = IgeEventingClass.extend({
		classId: 'UiToolBox',
		
		init: function () {
			var self = this;
			
			this.tools = {};
			self.tools.UiToolBox_ToolCreate = UiToolBox_ToolCreate();
			self.tools.UiToolBox_ToolSelect = UiToolBox_ToolSelect();
			self.tools.UiToolBox_ToolPan = UiToolBox_ToolPan();
			self.tools.UiToolBox_ToolTranslate = UiToolBox_ToolTranslate();
			
			self.select('toolSelect');
			
			// Load the toolbox html into the editor DOM
			$ige.engine.editor.loadHtml(igeRoot + 'components/editor/ui/toolbox/toolbox.html', function (html) {
				var toolbox = $(html);
				
				// Attach logic handlers to tools
				toolbox.find('[data-tool]').click(function () {
					var elem = $(this);
					
					if (!elem.hasClass('disabled')) {
						// Add selected to this tool
						self.select(elem.attr('id'));
					}
				});
				
				// Attach logic handlers to actions
				toolbox.find('[data-action]').click(function () {
					var elem = $(this);
					
					// Perform action
					self.action(elem.attr('data-action'));
				});
				
				// Add the html
				$('#leftBar').append(toolbox);
				
				// Setup tool toggle buttons
				$('.toolToggleGroup').click(function () {
					// Un-select all others in the group
					var elem = $(this),
						group = elem.attr('data-group');
					
					$('[data-group="' + group + '"]').removeClass('selected');
					elem.addClass('selected');
				});
			});
		},
		
		action: function (actionId) {
			switch (actionId) {
				case 'play':
					$ige.engine.pause(false);
					break;
				
				case 'pause':
					$ige.engine.pause(true);
					break;
			}
		},
		
		select: function (id) {
			var self = this,
				elem = $('#' + id),
				toolClassId = elem.attr('data-tool');
			
			// Clear existing tool selection
			self.deselect(self._currentTool);
			
			if (!elem.hasClass('selected')) {
				elem.addClass('selected');
				this._currentTool = id;
			}
			
			// Handle tool init logic
			if (toolClassId) {
				if (!this.tools[toolClassId]) {
					if ($ige.engine.classDefined(toolClassId)) {
						this.tools[toolClassId] = this._currentToolInstance = $ige.engine.newClassInstance(toolClassId);
						this._currentToolInstance.enabled(true);
					} else {
						this.log('No class for tool or class not defined: ' + toolClassId, 'warning');
					}
				} else {
					this._currentToolInstance = this.tools[toolClassId];
					this._currentToolInstance.enabled(true);
				}
			}
		},
		
		deselect: function (id) {
			if (this._currentToolInstance) {
				this._currentToolInstance.enabled(false);
				delete this._currentToolInstance;
			}
			
			if (id) {
				$('#' + id).removeClass('selected');
			} else {
				$('.tool.toolSelect.selected').removeClass('selected');
			}
			
			this._currentTool = null;
		}
	});
	
	// Init
	$ige.engine.editor.ui.toolbox = new UiToolBox();
	
	return UiToolBox;
});