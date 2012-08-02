$(document).ready(function() {
	// Splitters
	$("#vertical").kendoSplitter({
		orientation: "vertical",
		autoHeight: true,
		panes: [
			{ collapsible: false, resizable: false, size: '25px' },
			{ collapsible: false, autoHeight: true },
			{ collapsible: false, resizable: false, size: "25px" }
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
			// Get height of parent.parent element
			parentHeight = thisElement.parent().parent().height();

			// Loop the panes and add up the absolute specified heights
			paneIndex = 0;
			paneElements.each(function (elementIndex, item) {
				// Check that the element is not a split bar!
				if (!$(item).hasClass('k-splitbar')) {
					if (panes[paneIndex].size && !panes[paneIndex].autoHeight) {
						panesHeight += parseInt(panes[paneIndex].size);
					} else {
						splitHeightPanes.push(elementIndex)
					}

					paneIndex++;
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

	// Panel bars
	$("#panelbar").kendoPanelBar({
		expandMode: "single"
	});

	// Tree view
	/*data: [
		{ text: "Furniture", items: [
			{ text: "Tables & Chairs" },
			{ text: "Sofas" },
			{ text: "Occasional Furniture" }
		] },
		{ text: "Decor", items: [
			{ text: "Bed Linen" },
			{ text: "Curtains & Blinds" },
			{ text: "Carpets" }
		] }
	]*/
	setTimeout(function () {
		var sceneGraphData = new kendo.data.HierarchicalDataSource({
			data: [$('#igeFrame')[0].contentWindow.ige.getSceneGraphData()]
		});

		$("#scenegraph-treeview").kendoTreeView({
			dataSource: sceneGraphData
		});
	}, 1000);

	$(window).resize(function () {
		$("#vertical").data("kendoSplitter").autoResize();
	});

	$("#vertical").data("kendoSplitter").autoResize();
});