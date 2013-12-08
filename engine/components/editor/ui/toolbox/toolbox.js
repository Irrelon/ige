var UiToolBox = IgeClass.extend({
	classId: 'UiToolBox',
	
	init: function () {
		var self = this;
		
		// Load the toolbox html into the editor DOM
		ige.editor.loadHtml(igeRoot + 'components/editor/ui/toolbox/toolbox.html', function (html) {
			var toolbox = $(html);
			
			// Attach logic handlers to icons
			toolbox.find('.tool').click(function () {
				var elem = $(this);
				
				// Clear existing tool selection
				self.deselect(self._currentTool);
				
				// Add selected to this tool
				self.select(elem.attr('id'));
			});
			
			// Add the html
			$('#leftBar').append(toolbox);
			
			// Select the default tool
			self.select('toolSelect');
		});
	},
	
	select: function (id) {
		var elem = $('#' + id); 
		if (!elem.hasClass('selected')) {
			elem.addClass('selected');
			this._currentTool = id;
		}
	},
	
	deselect: function (id) {
		$('#' + id).removeClass('selected');
		this._currentTool = null;
	}
});

// Init
ige.editor.ui.toolbox = new UiToolBox();