ToolBarPanel = IgeClass.extend({
	init: function () {
		var self = this;

		// Load our menu
		$.ajax({
			url: "panels/ToolBar/index.html",
			success: function (data) {
				$('#leftBar').append(data);

				// Activate the click events
				$('.tool').click(function () {
					self.toolClicked(this);
				});
			},
			dataType: 'html'
		});

		this._fullScreen = false;

		// Register with the toolbar object
		editor.toolBar = this;
	},

	toolClicked: function (tool) {
		console.log(tool.id);
		switch (tool.id) {
			case 'toolFullScreen':
				this.toggleFullScreen();
				$("#vertical").data("kendoSplitter").autoResize();
				break;
		}
	},

	toggleFullScreen: function () {
		if (!this._fullScreen) {
			$("#vertical").data("kendoSplitter").collapse('#menuBar');
			$("#vertical").data("kendoSplitter").collapse('#leftBar');
			$("#vertical").data("kendoSplitter").collapse('#rightBar');
			$("#vertical").data("kendoSplitter").collapse('#statusBar');
			this._fullScreen = true;
		} else {
			$("#vertical").data("kendoSplitter").expand('#menuBar');
			$("#vertical").data("kendoSplitter").expand('#leftBar');
			$("#vertical").data("kendoSplitter").expand('#rightBar');
			$("#vertical").data("kendoSplitter").expand('#statusBar');
			this._fullScreen = false;
		}
	}
});

editor.addPanel('toolBar', ToolBarPanel);