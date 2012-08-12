PropertiesPanel = IgeClass.extend({
	init: function (panelBar) {
		// Add the panel
		var self = this,
			container = $($("#tabStrip").data('kendoTabStrip').contentElement(2));

		container.html($('<div id="propertiesContent" style="padding: 5px;">No object selected, use the SceneGraph panel to select an object.</div>'));

		// Listen to the scenegraph panel for selection events
		editor.panel('sceneGraph').on('selectedObject', function (obj) {
			self.selectObject(obj);
		});
	},

	selectObject: function (obj) {
		if (obj.classId() !== 'IgeEngine') {
			$('#propertiesContent').html('Loading...');
			$.ajax({
				url: "panels/Properties/index.html",
				success: function (data) {
					var treeView = $("#scenegraph-treeview").data('kendoTreeView'),
						onValueChange;

					$('#propertiesContent').html('');

					onValueChange = function () {
						switch (this.element[0].id) {
							case 'layer':
								obj.layer(parseFloat(this.element.val()));
								break;
							case 'depth':
								obj.depth(parseFloat(this.element.val()));
								break;
						}
					};

					$('#propertiesContent').append(data);
					$('#propertiesContent .numberBox').kendoNumericTextBox({
						spin: onValueChange,
						change: onValueChange
					});

					// Panel bars
					/*$("#propertiesContent .objectControlPanel").kendoPanelBar({
						expandMode: "multiple"
					});*/

					// Object ID apply button
					$('#propertiesContent #objectIdApply').click(function () {
						// Update the object with the new id
						obj.id($('#propertiesContent #objectId').val());

						// Update the scenegraph tree to reflect the change
						$('.k-in', treeView.select()).html(obj.id() + ' (' + obj._classId + ')');
						treeView.dataItem(treeView.select()).set('id', obj.id());

						// Rebuild the crumb bar
						editor.panel('crumbBar').rebuild();
					});

					// Positioning mode drop-down
					$("#propertiesContent #positioning").kendoDropDownList({
						dataSource: [
							{value: 0, text:'2d'},
							{value: 1, text:'Isometric'}
						],
						dataTextField: 'text',
						dataValueField: 'value',
						index: obj.isometric() === true ? 1 : 0,
						change: function () {
							obj.isometric(this.value() === 1 ? true : false);
						}
					});

					// Child depth-sort drop-down
					$("#propertiesContent #childDepthSort").kendoDropDownList({
						dataSource: [
							{value: 0, text:'2d'},
							{value: 1, text:'Isometric'}
						],
						dataTextField: 'text',
						dataValueField: 'value',
						index: obj.isometricMounts() === true ? 1 : 0,
						change: function () {
							obj.isometricMounts(this.value() === 1 ? true : false);
						}
					});

					// Set the correct initial data
					$('#propertiesContent #objectId').val(obj.id());
					$('#propertiesContent #layer').data("kendoNumericTextBox").value(obj.layer());
					$('#propertiesContent #depth').data("kendoNumericTextBox").value(obj.depth());
				},
				dataType: 'html'
			});
		} else {
			$('#propertiesContent').html('The selected object has no editable properties.');
		}
	}
});

editor.panel('properties', PropertiesPanel);