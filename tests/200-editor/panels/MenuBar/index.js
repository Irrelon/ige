MenuBarPanel = IgeClass.extend({
	init: function () {
		// Load our menu
		$.ajax({
			url: "panels/MenuBar/index.html",
			success: function (data) {
				$('#menuBar').append(data);
				$("#menu").kendoMenu();
				var menu = $("#menu").data("kendoMenu");
				menu.getItem = function (itemIndex) {
					return menu.element.children("li").eq(itemIndex);
				};

				// Disable the create menu by default
				menu.enable(menu.getItem(2), false);
				// TODO: Language
				$(menu.getItem(2)).attr('title', 'Please select a parent object from the SceneGraph before attempting to create something!');
			},
			dataType: 'html'
		});
	}
});

editor.panel('menuBar', MenuBarPanel);