TextureWindow = IgeClass.extend({
	init: function () {
		var self = this;

		// Load our window
		$.ajax({
			url: "windows/Texture/index.html",
			success: function (data) {
				$('#editorContent').append(data);
				$("#textureWindow").kendoWindow({
					width: "500px",
					actions: ["Close"],
					title: "New Texture",
					modal: true,
					close: function () {
						self.close();
					}
				});

				$("#textureWindow").data('kendoWindow').center();
			},
			dataType: 'html'
		});
	},

	close: function () {
		$("#textureWindow").data('kendoWindow').destroy();
	},

	createTexture: function () {
		// Read the form data we need
		var url = $("#textureWindow #textureUrl").val(),
			tex;

		if (url) {
			// Create the new texture
			tex = new igeFrame.IgeTexture(url);

			// Remove the new texture window
			this.close();
		}
	}
});