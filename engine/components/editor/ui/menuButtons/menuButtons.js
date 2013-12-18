var UiMenuButtons = IgeEventingClass.extend({
	classId: 'UiMenuButtons',
	
	init: function () {
		var self = this;
		
		self._menus = {};
		
		ige.requireStylesheet(igeRoot + 'components/editor/ui/menuButtons/menuButtons.css');
	},
	
	ready: function () {
		var self = this;
		
		// Add a bunch of default menus
		/*self.add({
			id: 'fileMenu',
			text: 'Project',
			menu: {
				'group1': [{
					id: 'newProject',
					icon: 'none',
					text: 'New Project',
					action: "ige.editor.newProject();"
				}],
				'group2': [{
					sep: true,
					id: 'openProject',
					icon: 'none',
					text: 'Open Project...',
					action: "ige.editor.openProject();"
				}, {
					id: 'saveProject',
					icon: 'none',
					text: 'Save Project',
					action: "ige.editor.saveProject();"
				}, {
					id: 'saveProjectAs',
					icon: 'none',
					text: 'Save Project As...',
					action: "ige.editor.saveProjectAs();"
				}]
			}
		});*/
		
		self.add({
			id: 'toolsMenu',
			text: 'Tools',
			menu: {
				'group1': [{
					id: 'spriteSheetEditor',
					icon: 'none',
					text: 'Sprite Sheet Editor...',
					action: "ige.editor.ui.textureEditor.showSpriteSheetEditor();"
				}]
			}
		});
	},
	
	add: function (obj) {
		var self = this;
		
		self._menus[obj.id] = obj;
		
		ige.editor.renderTemplate(
			igeRoot + 'components/editor/ui/menuButtons/templates/menuButton.html',
			obj,
			function (err, htmlElem) {
				if (!err) {
					var lastMenu = $('.dropMenuContainer .menuButtons').last();
					
					if (!lastMenu.length) {
						htmlElem.appendTo('.dropMenuContainer');
					} else {
						htmlElem.insertAfter(lastMenu);
					}
					
					// Enable the button to toggle menu by id
					htmlElem
						.off('click')
						.on('click', function () {
							self.toggle(obj.id);
						})
				}
			}
		);
	},
	
	toggle: function (id) {
		var self = this,
			obj = self._menus[id],
			menuButton = $('.dropMenuContainer #' + id);
		
		// Check if the menu to toggle is already active
		if (menuButton.hasClass('active')) {
			// Deactivate the menu
			$('.dropMenuContainer .menuButton').removeClass('active');
			ige.editor.ui.menus.closeAll();
			
			if (self._editorTool) {
				ige.editor.ui.toolbox.select(self._editorTool);
				delete self._editorTool;
			}
		} else {
			// Store the current selected editor tool and then deactivate the tool
			self._editorTool = ige.editor.ui.toolbox._currentTool ? ige.editor.ui.toolbox._currentTool : self._editorTool;
			ige.editor.ui.toolbox.deselect();
			
			// Toggle all other menus off
			$('.dropMenuContainer .menuButton').removeClass('active');
			ige.editor.ui.menus.closeAll();
			
			// Activate the menu
			if (obj) {
				menuButton.addClass('active');
				
				// Display menu
				var position = menuButton.offset(),
					left = position.left,
					top = position.top,
					height = $('body').height();
				
				ige.editor.ui.menus.create({
					groups: obj.menu,
					search: false,
					blur: function () {
						self.toggle(id);
					}
				}, function (elem) {
					// Now position the menu
					var menuHeight = elem.height();
					
					top -= menuHeight / 2;
					
					if (top + menuHeight > height) {
						top = height - menuHeight - 10;
					}
					
					if (top - menuHeight < 25) {
						top = 25;
					}
					
					elem.css('left', left)
						.css('top', top);
				});
			}
		}
	}
});

// Init
ige.editor.ui.menuButtons = new UiMenuButtons();