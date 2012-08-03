MenuBarPanel = IgeClass.extend({
	init: function () {
		// Load our menu
		$.ajax({
			url: "panels/MenuBar/index.html",
			success: function (data) {
				$('#menuBar').append(data);
				$("#menu").kendoMenu();
			},
			dataType: 'html'
		});
	}
});

editor.addPanel('menuBar', MenuBarPanel);