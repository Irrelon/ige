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
			// Handle existing selected object
			if (this._selectedObject) {
				switch (this._selectedObject.classId()) {
					case 'IgeViewport':
					case 'IgeScene2d':
						// Do nothing
						break;

					case 'IgeTileMap2d':
					case 'IgeTextureMap':
						this._selectedObject.drawGrid(0);
						break;

					default:
						this._selectedObject.drawBounds(false);
						break;
				}

			}

			// Assign the new selected object
			this._selectedObject = ige.$(id);

			// Handle new selected object
			switch (this._selectedObject.classId()) {
				case 'IgeViewport':
				case 'IgeScene2d':
					// Do nothing
					break;

				case 'IgeTileMap2d':
				case 'IgeTextureMap':
					this._selectedObject.drawGrid(40);
					break;

				default:
					this._selectedObject.drawBounds(true);
					this._selectedObject.drawBoundsData(true);
					break;
			}

			this.emit('selectedObject', this._selectedObject);
			return this;
		}

		return this._selectedObject;
	}
});

editor.panel('sceneGraph', SceneGraphPanel);