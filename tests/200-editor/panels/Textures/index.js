TexturesPanel = IgeClass.extend({
	init: function (panelBar) {
		// Load our content
		$.ajax({
			url: "panels/Textures/index.html",
			success: function (data) {
				// Add the panel
				var panelContent = panelBar.append({
					text: 'Textures',
					expanded: true,
					content: data
				});

				// Add the drag-drop event listener
				$('#texturePanel #dragTarget')[0].addEventListener('drop', function (event) { self._handleDrop(event); }, false);
			},
			dataType: 'html'
		});

	},

	_handleDrop: function (event) {
		var files, i, file, reader;

		event.stopPropagation(); // Stops some browsers from redirecting.
		event.preventDefault();

		// Get the file details
		files = event.dataTransfer.files;
		for (i = 0; i < files.length; i++) {
			// Read the File objects in this FileList.
			file = files[i];
			console.log(file);

			// Only process image files.
			if (f.type.match('image.*')) {
				reader = new FileReader();

				// Closure to capture the file information.
				reader.onload = (function(theFile) {
					return function(e) {
						// Render thumbnail.
						var span = document.createElement('span');
						span.innerHTML = ['<img class="thumb" src="', e.target.result,
							'" title="', escape(theFile.name), '"/>'].join('');
						document.getElementById('list').insertBefore(span, null);
					};
				}(file));

				// Read in the image file as a data URL.
				reader.readAsDataURL(file);
			}
		}

		// Create the new texture
		tex = new igeFrame.IgeTexture(url);
	}
});

editor.panel('textures', TexturesPanel);