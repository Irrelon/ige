var UiMenu = IgeEventingClass.extend({
	classId: 'UiMenu',
	
	init: function () {
		var self = this;
		ige.requireStylesheet(igeRoot + 'components/editor/ui/menu/menu.css');
		
		this.definition = {
			'IgeEntity': [{
				'mode': [{
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
					
					if (menuData.search) {
						// Assign callback to clear button if search enabled
						html.find('.searchClear').click(function() {
							html.find('.searchInput').val('');
							html.find('ul.items li').show();
						});
						
						// Perform search when text entered in search box
						html.find('.searchInput').keyup(function () {
							var list = html.find('ul.items'),
								items = list.find('li'),
								searchTerm = $(this).val();
							
							if (searchTerm) {
								// Loop the list items and check if the text matches the search
								items.each(function (index, elem) {
									elem = $(elem);
									
									if (elem.attr('data-val').toLowerCase().indexOf(searchTerm.toLowerCase()) > -1) {
										elem.show();
									} else {
										elem.hide();
									}
								});
							} else {
								html.find('ul.items li').show();
							}
						});
						
						// Set the search box with focus
						html.find('.searchInput').focus();
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