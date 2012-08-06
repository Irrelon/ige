PropertiesPanel = IgeClass.extend({
	init: function (panelBar) {
		// Add the panel
		var panelContent = panelBar.append({
			text: 'Properties',
			expanded: true,
			content: '<div style="padding: 10px;">No object selected, use the SceneGraph panel to select an object.</div>'
		});

		// Listen to the scenegraph panel for selection events

	},

	selectObject: function () {

	}
});

editor.panel('properties', PropertiesPanel);