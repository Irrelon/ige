PropertiesPanel = IgeClass.extend({
	init: function (panelBar) {
		// Add the panel
		var panelContent = panelBar.append({
				text: 'Properties',
				expanded: true,
				content: '<div id="propertiesContent" style="padding: 5px;">No object selected, use the SceneGraph panel to select an object.</div>'
			}),
			self = this;

		// Listen to the scenegraph panel for selection events
		editor.panel('sceneGraph').on('selectedObject', function (obj) {
			self.selectObject(obj);
		});
	},

	selectObject: function (obj) {
		$('#propertiesContent').html('Loading...');
		$.ajax({
			url: "panels/Properties/" + obj.classId() + ".html",
			success: function (data) {
				$('#propertiesContent').html(data);
				$('.numberBox').kendoNumericTextBox();

				// Panel bars
				$(".objectControlPanel").kendoPanelBar({
					expandMode: "multiple"
				});
			},
			dataType: 'html'
		});
	}
});

editor.panel('properties', PropertiesPanel);