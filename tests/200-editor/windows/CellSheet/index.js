CellSheetWindow = IgeClass.extend({
	init: function () {
		var self = this;
		this._columnCount = 1;
		this._rowCount = 1;

		// Load our window
		$.ajax({
			url: "windows/CellSheet/index.html",
			success: function (data) {
				$('#editorContent').append(data);
				$("#cellSheetWindow").kendoWindow({
					width: "800px",
					actions: ["Close"],
					title: "New Cell Sheet Editor",
					modal: true,
					resizable: false,
					close: function () {
						self.close();
					}
				});

				var onValueChange = function () {
					switch (this.element[0].id) {
						case 'columnCount':
							self._columnCount = parseFloat(this.element.val());
							break;

						case 'rowCount':
							self._rowCount = parseFloat(this.element.val());
							break;
					}
				};

				// Add number selectors
				$('#cellSheetWindow .numberBox').kendoNumericTextBox({
					spin: onValueChange,
					change: onValueChange,
					value: 1
				});

				// Add the drag-drop
				$("#cellSheetWindow").data('kendoWindow').center();

				// Setup the canvas renderer
				self._ctx = $("#cellSheetWindow #textureGrid")[0].getContext('2d');
				self._ctx.fillStyle = '#000000';
				self._ctx.strokeStyle = '#d200ff';

				self._renderInterval = setInterval(function () { self._tick(); }, 1000 / 60);
			},
			dataType: 'html'
		});
	},

	close: function () {
		clearInterval(this._renderInterval);
		$("#cellSheetWindow").data('kendoWindow').destroy();
	},

	createTexture: function () {
		// Ask the cell sheet panel to create the texture
		editor.panel('cellSheets').textureTile(this._cellImageUrl, this._columnCount, this._rowCount);

		// Remove the window
		this.close();
	},

	_tick: function () {
		if (this._cellImage._loaded) {
			var ctx = this._ctx,
				img = this._cellImage,
				x, y, columns = this._columnCount, rows = this._rowCount,
				xi = img.width / columns, yi = img.height / rows;

			ctx.fillRect(0, 0, 570, 350);
			ctx.drawImage(img, 0, 0);

			for (x = 0; x < columns; x++) {
				for (y = 0; y < rows; y++) {
					ctx.save();
					ctx.translate(x * xi, y * yi);
					ctx.strokeRect(0, 0, xi, yi);
					ctx.restore();
				}
			}
		}
	}
});