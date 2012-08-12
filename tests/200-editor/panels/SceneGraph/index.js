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
				dragstart: self._treeDragStart,
				drop: self._treeDrop,
				dataSource: self.sceneGraphData,
				select: function (e) {
					self.selectedObject(this.dataItem(e.node).id);
				}
			});

			// Extend tree view with some proper selection methods (dur kendo.. this is so obvious)
			$("#scenegraph-treeview").data('kendoTreeView').search = function (json, source) {
				if (json !== undefined) {
					var data = source || this.dataSource,
						child, item, i, k, match, allMatched;

					// If the data has the properties we need
					if (data && data._data) {
						child = data._data;

						// If the array has items
						if (child.length) {
							// Loop the array items
							for (i = 0; i < child.length; i++) {
								item = child[i];

								// Check each json property against the current item's properties
								// and if they all match, grab the tree item based on it's UID
								allMatched = true;
								for (k in json) {
									if (json.hasOwnProperty(k)) {
										if (item[k] !== json[k]) {
											// The item doesn't have all the properties
											// that the json object does
											allMatched = false;
											break;
										}
									}
								}

								if (allMatched) {
									// We've found a match, grab the tree item from the UID and return it
									return this.findByUid(item.uid);
								} else {
									// We didn't find what we were looking for so search the children
									if (item.children) {
										match = this.search(json, item.children);
										if (match) {
											return match;
										}
									}
								}
							}
						}
					}
				}
			};

			$("#scenegraph-treeview").data('kendoTreeView').expand(".k-item");
		});
	},

	updateSceneGraph: function () {
		this.sceneGraphData.data([ige.getSceneGraphData()]);
		$("#scenegraph-treeview").data('kendoTreeView').expand(".k-item");
	},

	addItem: function (obj) {
		var treeView = $("#scenegraph-treeview").data('kendoTreeView'),
			treeItem = treeView.append({
				text: obj.id() + ' (' + obj._classId + ')',
				parent: obj._parent,
				id: obj.id()
			}, treeView.select());

		treeItem.data('id', obj.id());
		treeItem.data('parent', obj.parent());
		return treeItem;
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

	_treeDragStart: function (event) {
		var sourceObject = ige.$(this.dataItem(event.sourceNode).id);

		switch (sourceObject.classId()) {
			case 'IgeEngine':
			case 'IgeViewport':
				event.preventDefault();
				break;
		}
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
		var sourceObject = ige.$(this.dataItem(event.sourceNode).id),
			targetObject = ige.$(this.dataItem(event.destinationNode).id);

		if (sourceObject === targetObject) { return; }

		switch (targetObject.classId()) {
			case 'IgeEngine':
			case 'IgeViewport':
				// Deny the drop
				event.setValid(false);
				break;

			default:
				// Check if the target is the same as the current parent
				if (targetObject === sourceObject.parent()) {
					// Cancel the drop
					event.setValid(false);
				} else {
					// Unmount the object
					sourceObject.unMount();

					// Mount the object to it's new parent
					sourceObject.mount(targetObject);
				}
				break;
		}

		// Now re-select the source object
		//$("#scenegraph-treeview").data('kendoTreeView').select(event.sourceNode.id);
		editor.panel('sceneGraph').selectedObject(sourceObject.id());
	}
});

editor.panel('sceneGraph', SceneGraphPanel);