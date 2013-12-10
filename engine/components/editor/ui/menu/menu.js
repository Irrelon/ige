var UiMenu = IgeEventingClass.extend({
	classId: 'UiMenu',
	
	init: function () {
		var self = this;
		ige.requireStylesheet(igeRoot + 'components/editor/ui/menu/menu.css');
		
		this.definition = {
			'IgeEntity': [{
				'mode': [{
					sep: true,
					id: 'select',
					icon: 'hand-top',
					text: 'Select',
					action: "ige.editor.ui.toolbox.select('toolSelect');"
				}],
				'transform': [{
					sep: true,
					id: 'transform',
					icon: 'th',
					text: 'Transform',
					action: "ige.editor.ui.toolbox.select('toolTransform');"
				}, {
					id: 'translate',
					icon: 'move',
					text: 'Translate',
					action: "ige.editor.ui.toolbox.select('toolTranslate');"
				}, {
					id: 'rotate',
					icon: 'repeat',
					text: 'Rotate',
					action: "ige.editor.ui.toolbox.select('toolRotate');"
				}, {
					id: 'scale',
					icon: 'resize-full',
					text: 'Scale',
					action: "ige.editor.ui.toolbox.select('toolRotate');"
				}],
				'export': [{
					sep: true,
					id: 'export',
					icon: 'download-alt',
					text: 'Export...'
				}, {
					id: 'export-tree',
					icon: 'sort-by-attributes',
					text: 'Export Composite...'
				}],
				'action': [{
					sep: true,
					id: 'destroy',
					icon: 'certificate',
					text: 'Destroy',
					action: "ige.editor.destroySelected();"
				}]
			}]
		};
		
		ige.editor.on('mouseUp', function (event) {
			if (event.button === 0) {
				self.closeAll();
			}
			
			if (event.button === 2 && ige.editor._selectedObject) {
				var classArr = ige.editor._selectedObjectClassList,
					i;
					
				for (i = 0; i < classArr.length; i++) {
					
				}
				
				var body = $('body'),
					width = body.width(),
					height = body.height(),
					left = event.pageX,
					top = event.pageY;
				
				ige.editor.ui.menus.create({
					header: {
						icon: 'th-large',
						text: '[' + ige.editor._selectedObject.classId() + ']' + ' '  + ige.editor._selectedObject.id()
					},
					groups: self.definition.IgeEntity
				}, function (elem) {
					// Now position the menu
					var menuWidth = elem.width(),
						menuHeight = elem.height();
					
					if (left + menuWidth > width) {
						left = width - menuWidth - 10;
					}
					
					if (top + menuHeight > height) {
						top = height - menuHeight - 10;
					}
					
					elem.css('left', left)
						.css('top', top);
				});
			}
		});
	},
	
	create: function (menuData, callback) {
		var self = this;
		
		self.closeAll();
		
		ige.editor.renderTemplate(
			igeRoot + 'components/editor/ui/menu/templates/menu.html',
			menuData,
			function (err, html) {
				if (!err) {
					self._elem = html;
					$('body').append(html);
					
					html.attr('id', 'menu_' + (menuData.id || ige.newIdHex()));
					
					if (menuData.left !== undefined) {
						html.css('left', menuData.left);
					}
					
					if (menuData.top !== undefined) {
						html.css('top', menuData.top);
					}
					
					if (callback) { callback(html); }
				}
			}
		);
	},
	
	closeAll: function () {
		$('.menu').remove();
	},
	
	destroy: function (id) {
		$('#menu_' + id).remove();
	}
});

ige.editor.ui.menus = new UiMenu();