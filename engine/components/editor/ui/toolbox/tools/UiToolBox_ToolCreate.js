var UiToolBox_ToolCreate = IgeEventingClass.extend({
	classId: 'UiToolBox_ToolCreate',
	
	init: function () {
		this.menuDefinition = [{
			'group': [{
				sep: true,
				id: 'select',
				icon: 'none',
				text: 'IgeEntity',
				action: "ige.editor.ui.toolbox.select('toolSelect');"
			}]
		}];
	},
	
	enabled: function (val) {
		if (val) {
			// Display menu
			var self = this,
				toolboxButton = $('#toolCreate'),
				position = toolboxButton.offset(),
				left = position.left + toolboxButton.width(),
				top = position.top,
				height = $('body').height();
			
			ige.editor.ui.menus.create({
				header: {
					icon: 'log_in',
					text: 'Create &amp; Mount Object'
				},
				groups: self.menuDefinition
			}, function (elem) {
				// Now position the menu
				var menuHeight = elem.height();
				
				top -= menuHeight / 2;
				
				if (top + menuHeight > height) {
					top = height - menuHeight - 10;
				}
				
				elem.css('left', left)
					.css('top', top);
			});
		} else {
			ige.editor.ui.menus.closeAll();
		}
	}
});