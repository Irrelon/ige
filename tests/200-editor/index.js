(function () {
	IgeEditor = IgeEventingClass.extend({
		init: function () {
			var self = this;

			this._projectPath = 'projects/default';
			this._prePanels = {};
			this._panels = {};
			this._windows = {};

			// Listen for when the engine iframe has loaded
			$(document).ready(function () {
				$('#igeFrame').load(function () { self._engineLoaded(); });
			});
		},

		setupPage: function () {
			window.addEventListener("dragover",function(e){
				e = e || event;
				e.preventDefault();
			},false);

			window.addEventListener("drop",function(e){
				e = e || event;
				e.preventDefault();
			},false);

			// Splitters
			$("#vertical").kendoSplitter({
				orientation: "vertical",
				autoHeight: true,
				panes: [
					{ collapsible: true, resizable: false, size: '28px' },
					{ collapsible: false, autoHeight: true },
					{ collapsible: true, resizable: false, size: "25px" }
				]
			});

			$("#horizontal").kendoSplitter({
				orientation: "horizontal",
				panes: [
					{ collapsible: true, resizable: false, size: "64px" },
					{ collapsible: false },
					{ collapsible: true, resizable: false, size: "350px" }
				]
			});

			$("#vertical").data("kendoSplitter").autoResize = function () {
				var thisElement = $(this.element),
					options = this.options,
					paneElements = thisElement.children(),
					panes = this.options.panes,
					parentHeight,
					panesHeight = 0,
					remainingHeight = 0,
					heightPerPane = 0,
					splitHeightPanes = [],
					paneIndex, i;

				if (options.autoHeight) {
					// Get height of parent.parent element // should detect k-content and skip only if that
					parentHeight = thisElement.parent().parent().height();

					// Loop the panes and add up the absolute specified heights
					paneIndex = 0;
					paneElements.each(function (elementIndex, item) {
						// Check that the element is not a split bar!
						if (!$(item).hasClass('k-splitbar')) {
							if (panes[paneIndex].size && !panes[paneIndex].autoHeight) {
								panesHeight += parseInt($(item).height(), 10);
							} else {
								splitHeightPanes.push(elementIndex);
							}

							paneIndex++;
						} else {
							panesHeight += parseInt($(item).height() + 2, 10);
						}
					});

					// Split the remaining height among the non-absolute sized panes
					remainingHeight = parentHeight - panesHeight;
					heightPerPane = Math.floor(remainingHeight / splitHeightPanes.length);

					for (i = 0; i < splitHeightPanes.length; i++) {
						this.size('#' + paneElements[splitHeightPanes[i]].id, heightPerPane + 'px');
					}

					// Trigger splitter resize
					this.trigger("resize");
				}
			};

			$("#vertical").data("kendoSplitter").bind("collapse", function () {
				setTimeout(function () {
					$("#vertical").data("kendoSplitter").autoResize();
				}, 10);
			});

			$("#vertical").data("kendoSplitter").bind("expand", function () {
				setTimeout(function () {
					$("#vertical").data("kendoSplitter").autoResize();
				}, 10);
			});

			$(window).resize(function () {
				$("#vertical").data("kendoSplitter").autoResize();
			});

			$("#vertical").data("kendoSplitter").autoResize();

			// Setup right-hand tabs
			$("#tabStrip").kendoTabStrip({
				animation:	{
					open: {
						effects: "fadeIn",
						duration: 100
					}
				}
			});

			// Setup panels
			container = $($("#tabStrip").data('kendoTabStrip').contentElement(1));
			$('<ul id="assetsPanelBar"></ul>').appendTo(container);

			// Panel bars
			$("#assetsPanelBar").kendoPanelBar({
				expandMode: "multiple"
			});

			// Setup the main drop target
			$('#mainDropTarget').kendoDropTarget({
				dragenter: function (e) {
					$('#dropText').text('Drop to Create Entity');
				},
				dragleave: function (e) {
					$('#dropText').text('Drop Here');
				},
				drop: function (e) {
					//console.log('drop');
				}
			});
		},

		panel: function (id, classDefinition) {
			if (id !== undefined) {
				if (classDefinition !== undefined) {
					if (!this._ready) {
						this._prePanels[id] = classDefinition;
					} else {
						this.log('Creating panel "' + id + '"');
						this._panels[id](new classDefinition(this._panelBar));
					}
				} else {
					return this._panels[id];
				}
			}

			return this;
		},

		window: function (id, classDefinition) {
			if (id !== undefined) {
				if (classDefinition !== undefined) {
					this._windows[id] = new classDefinition();
				} else {
					return this._windows[id];
				}
			}

			return this;
		},

		create: {
			IgeEntity: function() {
				var sgPanel = editor.panel('sceneGraph'),
					treeView = $("#scenegraph-treeview").data('kendoTreeView'),
					ent, treeItem;

				if (sgPanel.selectedObject()) {
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

					return ent;
				}
			},

			IgeTextureMap: function(isometricMounts) {
				var sgPanel = editor.panel('sceneGraph'),
					treeView = $("#scenegraph-treeview").data('kendoTreeView'),
					ent, treeItem;

				if (sgPanel.selectedObject()) {
					// Create object
					ent = new igeFrame.IgeTextureMap()
						.isometricMounts(isometricMounts)
						.tileWidth(40)
						.tileHeight(40)
						.highlightOccupied(false)
						.drawMouse(false)
						.drawBounds(false)
						.drawBoundsData(false)
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

					return ent;
				}
			},

			Character: function (type) {
				var sgPanel = editor.panel('sceneGraph'),
					treeView = $("#scenegraph-treeview").data('kendoTreeView'),
					ent, treeItem;

				if (sgPanel.selectedObject()) {
					// Create object
					ent = new igeFrame.Character()
						.addComponent(igeFrame.PlayerComponent)
						.setType(type)
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

					return ent;
				}
			}
		},

		_processPrePanels: function () {
			var i;

			for (i in this._prePanels) {
				if (this._prePanels.hasOwnProperty(i)) {
					this.log('Creating panel "' + i + '"');
					this._panels[i] = new this._prePanels[i](this._panelBar);
					delete this._prePanels[i];
				}
			}
		},

		_engineLoaded: function () {
			var self = this;

			// Get a reference to the engine in the iframe
			igeFrame = $('#igeFrame')[0].contentWindow;
			ige = igeFrame.ige;

			this.setupPage();

			this._ready = true;

			// Add any pre-added panels now that we're ready!
			this._processPrePanels();

			// Listen for engine mouse events
			ige.input.on('mouseUp', function (event) { self._engineMouseUp(event); });
			ige.input.on('mouseDown', function (event) { self._engineMouseDown(event); });
			ige.input.on('mouseMove', function (event) { self._engineMouseMove(event); });

			// Emit engine ready
			this.emit('engineReady');
		},

		_engineMouseUp: function (event) {
			this.emit('igeMouseUp', event);
		},

		_engineMouseDown: function (event) {
			this.emit('igeMouseDown', event);
		},

		_engineMouseMove: function (event) {
			this.emit('igeMouseMove', event);
		}
	});
}());

// Create the editor instance
editor = new IgeEditor();