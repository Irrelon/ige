CellSheetsPanel = IgeClass.extend({
	init: function (panelBar) {
		var self = this,
			container = $($("#tabStrip").data('kendoTabStrip').contentElement(3));

		// Load our content
		$.ajax({
			url: "panels/CellSheets/index.html",
			success: function (data) {
				// Add the panel
				var /*panelContent = assetsPanelBar.append({
					text: 'Cell Sheets',
					expanded: true,
					content: data
				}), */dropTarget;

				container.html($(data));

				// Create the panel bar
				$("#cellSheetPanelBar").kendoPanelBar({
					expandMode: "multiple"
				});

				// Add the drag-drop event listener
				dropTarget = $('#cellSheetPanel #dragTarget')[0];

				dropTarget.addEventListener('dragover', function (event) { self._handleDragOver(event); }, false);
				dropTarget.addEventListener('drop', function (event) { self._handleDrop(event); }, false);
			},
			dataType: 'html'
		});

	},

	_handleDragOver: function (event) {
		event.stopPropagation();
		event.preventDefault();
		event.dataTransfer.dropEffect = 'copy';
	},

	_handleDrop: function (event) {
		var files, i, file, reader, elem,
			self = this;

		event.stopPropagation(); // Stops some browsers from redirecting.
		event.preventDefault();

		// Get the file(s) details
		files = event.dataTransfer.files;
		for (i = 0; i < files.length; i++) {
			// Read the File object in this FileList.
			file = files[i];

			// Only process image files.
			if (file.type.match('image.*')) {
				reader = new FileReader();

				// Closure to capture the file information.
				reader.onload = (function(theFile, self) {
					return function(e) {
						// Render image so we can grab dimensions from it
						var img = $('<img src="' + e.target.result +'" />').appendTo($(document.body));
						img.load(function () {
							// Grab the dimensions
							var width = img.width(),
								height = img.height();

							img.remove();

							// Post the file data to the PHP image saving script
							$.post('panels/Textures/savePng.php', {
								imageName: theFile.name,
								imageData: e.target.result,
								imageWidth: width,
								imageHeight: height,
								projectPath: editor._projectPath
							}, function (data) {
								// Show the cell sheet editor window
								editor.window('cellSheetWindow', CellSheetWindow);

								// Set the sheet editor's image
								var img = new Image();
								img.onload = function () {
									this._loaded = true;
								};
								img.src = editor._projectPath + '/assets/textures/' + theFile.name;
								editor.window('cellSheetWindow')._cellImage = img;
								editor.window('cellSheetWindow')._cellImageUrl = editor._projectPath + '/assets/textures/' + theFile.name;
							});
						});
					};
				}(file, self));

				// Read in the image file as a data URL.
				reader.readAsDataURL(file);
			}
			break;
		}
	},

	textureTile: function (url, columns, rows, width, height) {
		var self = this,
			elem = $('<div class="smallThumb textureTile"></div>'),
			tex;

		// Add the background image
		elem.css('backgroundImage', 'url(' + url + ')');

		// Append the list item
		$('#cellSheetPanel #textureList .textureBlocks').append(elem);

		// Create the texture in the engine
		tex = new igeFrame.IgeCellSheet('../' + url, columns, rows);

		// Set the texture data
		elem.data('textureUrl', url);
		elem.data('textureObject', tex);
		elem.data('textureColumns', columns);
		elem.data('textureRows', rows);
		elem.data('textureWidth', width);
		elem.data('textureHeight', height);

		// Listen for click events
		elem.click(this._textureTileClicked);

		// Listen for drag events
		elem.kendoDraggable({
			hint: function() {
				return elem.clone();
			},
			dragstart: function (e) {
				$('#dropText').text('Drop Here');
				$('#mainDropTarget').show();
			},
			dragend: function (e) {
				$('#mainDropTarget').hide();

				// Create an entity from the texture and mount it to the main scene
				var ent = editor.create.IgeEntity();
				if (ent) {
					ent.texture(elem.data('textureObject'))
						.dimensionsFromCell();
				}
			}
		});
	},

	_textureTileClicked: function (event) {
		// Set all other texture tiles back to a dashed border
		$('#cellSheetPanel #textureList .textureTile').css('borderStyle', 'dashed');

		editor._currentTexture = $(this).data('textureObject');
		$(this).css('borderStyle', 'solid');

		// Generate the blocks that represent each cell of the cell sheet
		var container = $('#cellSheetPanel #textureCells .textureBlocks'),
			selectedTexture = $(this),
			url = selectedTexture.data('textureUrl'),
			columns = selectedTexture.data('textureColumns'),
			rows = selectedTexture.data('textureRows'),
			width = selectedTexture.data('textureWidth'),
			height = selectedTexture.data('textureHeight'),
			xi = width / columns,
			yi = height / rows,
			xScale = columns * 40,
			yScale = rows * 40,
			x, y, elem,
			clickHandler = function () {
				// Set all other texture cell tiles back to a dashed border
				$('#cellSheetPanel #textureCells .textureTile').css('borderStyle', 'dashed');

				editor._currentTextureCell = $(this).data('textureCellIndex');
				$(this).css('borderStyle', 'solid');
			};

		// Clear the existing items
		container.html('');

		for (y = 0; y < rows; y++) {
			for (x = 0; x < columns; x++) {
				elem = $('<div class="smallThumb textureTile"></div>');

				// Store the cell's index
				elem.data('textureCellIndex', x + (y * columns) + 1);

				// Add the background image
				elem.css('backgroundImage', 'url(' + url + ')');
				elem.css('backgroundPosition', (-x * 40) + 'px ' + (-y * 40) + 'px');
				elem.css('backgroundSize', (xScale) + 'px ' + (yScale) + 'px');

				// Listen for click events
				elem.click(clickHandler);

				// Append the list item
				$('#cellSheetPanel #textureCells .textureBlocks').append(elem);
			}
		}
	}
});

editor.panel('cellSheets', CellSheetsPanel);