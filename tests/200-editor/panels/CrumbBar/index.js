CrumbBarPanel = IgeClass.extend({
	init: function () {
		var self = this;

		// Load our menu
		$.ajax({
			url: "panels/CrumbBar/index.html",
			success: function (data) {
				$('#crumbBar').append(data);
				$("#crumbBar #menu").kendoMenu({
					select: function (e) {
						var objectId = $(e.item).data('id'),
							li = $("#scenegraph-treeview").data('kendoTreeView').search({id:objectId});

						if (li) {
							$("#scenegraph-treeview").data('kendoTreeView').select(li);
							editor.panel('sceneGraph').selectedObject(objectId);
						}
					}
				});

				var menu = $("#crumbBar #menu").data("kendoMenu");
				menu.getItem = function (itemIndex) {
					return menu.element.children("li").eq(itemIndex);
				};

				// Listen to the scenegraph panel for selection events
				editor.panel('sceneGraph').on('selectedObject', function (obj) {
					self.selectObject(obj);
				});
			},
			dataType: 'html'
		});
	},

	selectObject: function (obj) {
		var menu = $('#crumbBar #menu').data('kendoMenu'),
			currentItems = menu.element.children("li"),
			walkObj = obj, walkArr = [], item;

		// Create the crumb button for this selection by walking the parent chain up
		// the scenegraph and then adding the reverse chain
		walkArr.push(walkObj);
		while (walkObj.parent()) {
			walkObj = walkObj.parent();
			walkArr.push(walkObj);
		}

		menu.append([{
			text: 'SceneGraph'
		}]);

		walkCount = walkArr.length;
		while (walkCount--) {
			walkObj = walkArr[walkCount];
			menu.append([{
				text: walkObj.id() + ' (' + walkObj.classId() + ')'
			}]);
			item = menu.getItem((currentItems.length - 1) + walkArr.length - walkCount + 1);
			item.data('id', walkObj.id());
			item.data('parent', walkObj.parent());

			if (walkCount < walkArr.length - 1) {
				// Add child items to this parent item in the crumb menu

			}
		}

		// Remove all old crumb items
		currentItems.each(function (index, item) {
			menu.remove(item);
		});
	}
});

editor.panel('crumbBar', CrumbBarPanel);