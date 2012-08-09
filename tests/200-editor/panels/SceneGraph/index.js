SceneGraphPanel = IgeEventingClass.extend({
	init: function (panelBar) {
		// Add the panel
		var panelContent = panelBar.append({
			text: 'SceneGraph',
			expanded: true,
			content: '<div id="scenegraph-treeview"></div>',
			id: 'sceneGraphPanelItem'
		}), self = this;

		editor.on('engineReady', function () {
			self.sceneGraphData = new kendo.data.HierarchicalDataSource({
				data: [ige.getSceneGraphData()]
			});

			$("#scenegraph-treeview").kendoTreeView({
				loadOnDemand:false,
				dataSource: self.sceneGraphData,
				select: function (e) {
					self.selectedObject(this.dataItem(e.node).id);
				}
			});

			$("#scenegraph-treeview").data('kendoTreeView').expand(".k-item");
		});
	},

	updateSceneGraph: function () {
		this.sceneGraphData.data([ige.getSceneGraphData()]);
		$("#scenegraph-treeview").data('kendoTreeView').expand(".k-item");
	},

	selectedObject: function (id) {
		if (id !== undefined) {
			if (this._selectedObject && !this._selectedObject._scene) {
				this._selectedObject.drawBounds(false);
			}

			var item = ige.$(id);
			item.drawBounds(true);
			item.drawBoundsData(true);

			this._selectedObject = item;
			this.emit('selectedObject', item);
			return this;
		}

		return this._selectedObject;
	}
});

editor.panel('sceneGraph', SceneGraphPanel);