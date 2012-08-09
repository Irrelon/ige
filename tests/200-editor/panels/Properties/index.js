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
			url: "panels/Properties/properties.html",
			success: function (data) {
				var treeView = $("#scenegraph-treeview").data('kendoTreeView');

				$('#propertiesContent').html('');

				var onValueChange = function () {
					switch (this.element[0].id) {
						case 'translateX':
							obj._translate.x = parseFloat(this.element.val());
							break;
						case 'translateY':
							obj._translate.y = parseFloat(this.element.val());
							break;
						case 'translateZ':
							obj._translate.z = parseFloat(this.element.val());
							break;

						case 'rotateX':
							obj._rotate.x = parseFloat(this.element.val());
							break;
						case 'rotateY':
							obj._rotate.y = parseFloat(this.element.val());
							break;
						case 'rotateZ':
							obj._rotate.z = parseFloat(this.element.val()) * Math.PI / 180;
							break;

						case 'scaleX':
							obj._scale.x = parseFloat(this.element.val());
							break;
						case 'scaleY':
							obj._scale.y = parseFloat(this.element.val());
							break;
						case 'scaleZ':
							obj._scale.z = parseFloat(this.element.val());
							break;

						case 'originX':
							obj._origin.x = parseFloat(this.element.val());
							break;
						case 'originY':
							obj._origin.y = parseFloat(this.element.val());
							break;
						case 'originZ':
							obj._origin.z = parseFloat(this.element.val());
							break;
					}
				};


				$('#propertiesContent').append(data);
				$('.numberBox').kendoNumericTextBox({
					spin: onValueChange,
					change: onValueChange
				});

				// Panel bars
				$(".objectControlPanel").kendoPanelBar({
					expandMode: "multiple"
				});

				// Object ID apply button
				$('#objectIdApply').click(function () {
					obj.id($('#objectId').val());
					$('.k-in', treeView.select()).html(obj.id() + ' (' + obj._classId + ')');
					treeView.dataItem(treeView.select()).set('id', obj.id());
				});

				// Set the correct initial data
				$('#propertiesContent #objectId').val(obj.id());

				$('#propertiesContent #translateX').data("kendoNumericTextBox").value(obj._translate.x);
				$('#propertiesContent #translateY').data("kendoNumericTextBox").value(obj._translate.y);
				$('#propertiesContent #translateZ').data("kendoNumericTextBox").value(obj._translate.z);

				$('#propertiesContent #rotateX').data("kendoNumericTextBox").value(obj._rotate.x);
				$('#propertiesContent #rotateY').data("kendoNumericTextBox").value(obj._rotate.y);
				$('#propertiesContent #rotateZ').data("kendoNumericTextBox").value(obj._rotate.z * 180 / Math.PI);

				$('#propertiesContent #scaleX').data("kendoNumericTextBox").value(obj._scale.x);
				$('#propertiesContent #scaleY').data("kendoNumericTextBox").value(obj._scale.y);
				$('#propertiesContent #scaleZ').data("kendoNumericTextBox").value(obj._scale.z);

				$('#propertiesContent #originX').data("kendoNumericTextBox").value(obj._origin.x);
				$('#propertiesContent #originY').data("kendoNumericTextBox").value(obj._origin.y);
				$('#propertiesContent #originZ').data("kendoNumericTextBox").value(obj._origin.z);
			},
			dataType: 'html'
		});
	}
});

editor.panel('properties', PropertiesPanel);