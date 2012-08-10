SceneGraphPanel = IgeEventingClass.extend({
	init: function (panelBar) {
		// Add the panel
		var self = this,
			container = $($("#tabStrip").data('kendoTabStrip').contentElement(0));

		container.html($('<div id="scenegraph-treeview"></div>'));

		editor.on('engineReady', function () {
			self.sceneGraphData = new kendo.data.HierarchicalDataSource({
				data: [ige.getSceneGraphData()]
			});

			$("#scenegraph-treeview").kendoTreeView({
				loadOnDemand:false,
				dragAndDrop: true,
				drop: self._treeDrop,
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
						this._selectedObject.drawMouse(false);
						this._selectedObject.drawGrid(0);
						break;

					default:
						this._selectedObject.drawBounds(false);
						break;
				}

			}

			// Assign the new selected object
			this._selectedObject = ige.$(id);

			// Enable create menu by default - almost all objects should
			// have it enabled, only viewports and engine don't
			var menu = $("#menu").data("kendoMenu");
			menu.enable(menu.getItem(2), true);
			$(menu.getItem(2)).attr('title', '');

			// Handle new selected object
			switch (this._selectedObject.classId()) {
				case 'IgeEngine':
					// Disable create menu
					menu.enable(menu.getItem(2), false);
					// TODO: Language
					$(menu.getItem(2)).attr('title', 'Please select a parent object from the SceneGraph before attempting to create something!');
					break;

				case 'IgeViewport':
					// Disable create menu
					menu.enable(menu.getItem(2), false);
					$(menu.getItem(2)).attr('title', 'Please select a parent object from the SceneGraph before attempting to create something!');
					break;

				case 'IgeScene2d':
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
	},

	/**
	 * Handle drop events from a tree item to another tree item
	 * which will basically un-mount the dropped item from it's current
	 * parent and mount it to the target item, assuming the target
	 * item is actually a valid mount parent.
	 * @param event
	 * @private
	 */
	_treeDrop: function (event) {

	}
});

editor.panel('sceneGraph', SceneGraphPanel);