SceneGraphPanel = IgeClass.extend({
	init: function (panelBar) {
		// Add the panel
		var panelContent = panelBar.append({
			text: 'SceneGraph',
			expanded: true,
			content: '<div id="scenegraph-treeview"></div>',
			id: 'sceneGraphPanelItem'
		});

		editor.on('engineReady', function () {
			sceneGraphData = new kendo.data.HierarchicalDataSource({
				data: [ige.getSceneGraphData()]
			});

			$("#scenegraph-treeview").kendoTreeView({
				dataSource: sceneGraphData,
				select: function (e) {
					editor.selectObject(this.dataItem(e.node).id);
				}
			});
		});
	}
});

editor.addPanel('sceneGraph', SceneGraphPanel);