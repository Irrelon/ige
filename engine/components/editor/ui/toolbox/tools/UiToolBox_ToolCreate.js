"use strict";

appCore.module('UiToolBox_ToolCreate', function (igeBase, IgeEventingClass) {
	var UiToolBox_ToolCreate = IgeEventingClass.extend({
		classId: 'UiToolBox_ToolCreate',
		editorOptions: {
			hide: true
		},
		
		init: function () {
			this.menuDefinition = [{
				'group': []
			}];
			
			var sortArr = [], i;
			
			for (i in igeBase.igeClassStore) {
				if (igeBase.igeClassStore.hasOwnProperty(i)) {
					if (!igeBase.igeClassStore[i].prototype.editorOptions || !igeBase.igeClassStore[i].prototype.editorOptions.hide) {
						sortArr.push(i);
					}
				}
			}
			
			sortArr.sort();
			
			for (i = 0; i < sortArr.length; i++) {
				this.menuDefinition[0].group.push({
					id: sortArr[i],
					icon: 'none',
					text: sortArr[i],
					action: "ige.editor.createObject('" + sortArr[i] + "', true);"
				});
			}
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
						text: 'Create Object'
					},
					groups: self.menuDefinition,
					search: true
				}, function (elem) {
					// Now position the menu
					var menuHeight = elem.height();
					
					top -= menuHeight / 2;
					
					if (top + menuHeight > height) {
						top = height - menuHeight - 10;
					}
					
					if (top - menuHeight < 30) {
						top = 30;
					}
					
					elem.css('left', left)
						.css('top', top);
				});
			} else {
				ige.editor.ui.menus.closeAll();
			}
		}
	});
	
	return UiToolBox_ToolCreate;
});