TexturesPanel = IgeClass.extend({
	init: function (panelBar) {
		var self = this,
			container = $($("#tabStrip").data('kendoTabStrip').contentElement(2));

		// Load our content
		$.ajax({
			url: "panels/Textures/index.html",
			success: function (data) {
				// Add the panel
				var /*panelContent = assetsPanelBar.append({
					text: 'Textures',
					expanded: true,
					content: data
				}), */dropTarget;

				container.html($(data));

				// Add the drag-drop event listener
				dropTarget = $('#texturePanel #dragTarget')[0];

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

			elem = $('<li><div class="loadingCircle"></div></li>');
			$('#texturePanel #loadingList').append(elem);

			// Only process image files.
			if (file.type.match('image.*')) {
				reader = new FileReader();

				// Closure to capture the file information.
				reader.onload = (function(theFile, theElem, self) {
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
								// Remove loading element
								theElem.remove();

								// Create texture selection tile
								self.textureTile(editor._projectPath + '/assets/textures/' + theFile.name);
							});
						});
					};
				}(file, elem, self));

				// Read in the image file as a data URL.
				reader.readAsDataURL(file);
			}
		}
	},

	textureTile: function (url) {
		var self = this,
			elem = $('<div class="smallThumb textureTile" style="background-image: url(' + url + ');"></div>'),
			tex;

		// Append the list item
		$('#texturePanel #textureList').append(elem);

		// Create the texture in the engine
		tex = new igeFrame.IgeTexture('../' + url);

		// Set the texture data
		elem.data('textureUrl', url);
		elem.data('textureObject', tex);

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

			}
		});
	},

	_textureTileClicked: function (event) {
		// Set all other texture tiles back to a dashed border
		$('#texturePanel #textureList .textureTile').css('borderStyle', 'dashed');

		editor._currentTexture = $(this).data('textureObject');
		$(this).css('borderStyle', 'solid');
	}
});

editor.panel('textures', TexturesPanel);