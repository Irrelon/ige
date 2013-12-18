var UiMenu = IgeEventingClass.extend({
	classId: 'UiMenu',
	
	init: function () {
		var self = this;
		ige.requireStylesheet(igeRoot + 'components/editor/ui/menu/menu.css');
	},
	
	create: function (menuData, callback) {
		var self = this;
		
		self.closeAll();
		
		ige.editor.renderTemplate(
			igeRoot + 'components/editor/ui/menu/templates/menu.html',
			menuData,
			function (err, htmlElem) {
				if (!err) {
					self._elem = htmlElem;
					$('body').append(htmlElem);
					
					htmlElem.attr('id', 'menu_' + (menuData.id || ige.newIdHex()));
					
					if (menuData.left !== undefined) {
						htmlElem.css('left', menuData.left);
					}
					
					if (menuData.top !== undefined) {
						htmlElem.css('top', menuData.top);
					}
					
					if (menuData.search) {
						// Assign callback to clear button if search enabled
						htmlElem.find('.searchClear').click(function() {
							htmlElem.find('.searchInput').val('');
							htmlElem.find('ul.items li').show();
						});
						
						// Perform search when text entered in search box
						htmlElem.find('.searchInput').keyup(function () {
							var list = htmlElem.find('ul.items'),
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
								htmlElem.find('ul.items li').show();
							}
						});
						
						// Set the search box with focus
						htmlElem.find('.searchInput').focus();
					}
					
					if (callback) { callback(htmlElem); }
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