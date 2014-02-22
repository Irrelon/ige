var Client = IgeClass.extend({
	classId: 'Client',
	
	init: function () {
		var self = this;
		ige.addComponent(IgeEditorComponent);
		self.gameTexture = {};
		
		// Create the HTML canvas
		ige.createFrontBuffer(true);

		// Start the engine
		ige.start(function (success) {
			// Check if the engine started successfully
			if (success) {
				// Load the base scene data
				ige.addGraph('IgeBaseScene');
				
				// Show the editor
				//ige.editor.show();
			}
		});
	}
});

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = Client; }