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
	},

	create: {
		IgeEntity: function() {
			var sgPanel = editor.panel('sceneGraph'),
				treeView = $("#scenegraph-treeview").data('kendoTreeView'),
				ent, treeItem;

			// Create object
			ent = new igeFrame.IgeEntity()
				.drawBounds(false)
				.drawBoundsData(false)
				.width(100)
				.height(100)
				.mount(sgPanel.selectedObject());

			// Update the scenegraph panel
			treeItem = treeView.append({
				text: ent.id() + ' (' + ent._classId + ')',
				parent: ent._parent,
				id: ent.id()
			}, treeView.select());

			// Select the new item
			treeView.select(treeItem);
			sgPanel.selectedObject(ent.id());
		}
	}
});

editor.panel('menuBar', MenuBarPanel);