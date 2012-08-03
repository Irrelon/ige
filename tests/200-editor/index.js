(function () {
	IgeEditor = IgeEventingClass.extend({
		init: function () {
			var self = this;
			this._prePanels = {};
			this._panels = {};

			// Listen for when the engine iframe has loaded
			$(document).ready(function () {
				$('#igeFrame').load(function () {
					// Get a reference to the engine in the iframe
					ige = $('#igeFrame')[0].contentWindow.ige;

					self.setupPage();

					self._ready = true;

					// Add any pre-added panels now that we're ready!
					self._processPrePanels();

					// Emit engine ready
					self.emit('engineReady');
				});
			});
		},

		setupPage: function () {
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
					{ collapsible: true, resizable: false, size: "250px" }
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
		},

		addPanel: function (id, panelClass) {
			if (!this._ready) {
				this._prePanels[id] = panelClass;
			} else {
				this.log('Creating panel "' + id + '"');
				this._panels[id](new panelClass(this._panelBar));
			}

			return this;
		},

		selectObject: function (id) {
			if (this._selectedItem && !this._selectedItem._scene) {
				this._selectedItem.drawBounds(false);
			}

			var item = ige.$(id);
			item.drawBounds(true);
			item.drawBoundsData(true);

			this._selectedItem = item;
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
		}
	});
}());

// Create the editor instance
editor = new IgeEditor();