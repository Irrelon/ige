TransformPanel = IgeClass.extend({
	init: function (panelBar) {
		// Add the panel
		var self = this,
			container = $($("#tabStrip").data('kendoTabStrip').contentElement(2));

		container.html($('<div id="transformContent" style="padding: 5px;">No object selected, use the SceneGraph panel to select an object.</div>'));

		// Listen to the scenegraph panel for selection events
		editor.panel('sceneGraph').on('selectedObject', function (obj) {
			self.selectObject(obj);
		});
	},

	selectObject: function (obj) {
		if (obj._translate && obj.classId() !== 'IgeEngine') {
			$('#transformContent').html('Loading...');
			$.ajax({
				url: "panels/Transform/index.html",
				success: function (data) {
					var treeView = $("#scenegraph-treeview").data('kendoTreeView'),
						onValueChange;

					$('#transformContent').html('');

					onValueChange = function () {
						var width, height, ratio, newVal = parseFloat(this.element.val());

						switch (this.element[0].id) {
							case 'width':
								if (!newVal) { $('#lockAspect')[0].checked = false; }
								if ($('#lockAspect')[0].checked) {
									// Get the current width
									width = obj.geometry.x;

									// Get the height
									height = obj.geometry.y;

									if (width && height) {
										ratio = height / width;

										obj.height(newVal * ratio);
										$('#transformContent #height').data("kendoNumericTextBox").value(obj.geometry.y);
									}
								}

								obj.width(newVal);
								break;
							case 'height':
								if (!newVal) { $('#lockAspect')[0].checked = false; }
								if ($('#lockAspect')[0].checked) {
									// Get the current width
									width = obj.geometry.x;

									// Get the height
									height = obj.geometry.y;

									if (width && height) {
										ratio = height / width;

										obj.width(newVal / ratio);
										$('#transformContent #width').data("kendoNumericTextBox").value(obj.geometry.x);
									}
								}

								obj.height(newVal);
								break;

							case 'opacity':
								obj.opacity(newVal);
								break;

							case 'translateX':
								obj._translate.x = newVal;
								break;
							case 'translateY':
								obj._translate.y = newVal;
								break;
							case 'translateZ':
								obj._translate.z = newVal;
								break;

							case 'rotateX':
								obj._rotate.x = newVal;
								break;
							case 'rotateY':
								obj._rotate.y = newVal;
								break;
							case 'rotateZ':
								obj._rotate.z = newVal * Math.PI / 180;
								break;

							case 'scaleX':
								obj._scale.x = newVal;
								break;
							case 'scaleY':
								obj._scale.y = newVal;
								break;
							case 'scaleZ':
								obj._scale.z = newVal;
								break;

							case 'originX':
								obj._origin.x = newVal;
								break;
							case 'originY':
								obj._origin.y = newVal;
								break;
							case 'originZ':
								obj._origin.z = newVal;
								break;

							case 'size3dX':
								obj.geometry.x = newVal;
								break;
							case 'size3dY':
								obj.geometry.y = newVal;
								break;
							case 'size3dZ':
								obj.geometry.z = newVal;
								break;
						}
					};

					$('#transformContent').append(data);
					$('#transformContent .numberBox').kendoNumericTextBox({
						spin: onValueChange,
						change: onValueChange
					});

					// Panel bars
					$("#transformContent .objectControlPanel").kendoPanelBar({
						expandMode: "multiple"
					});

					// Expand all the panels
					$("#transformContent .objectControlPanel").data("kendoPanelBar").expand($(".k-item"));

					// Set the correct initial data
					$('#transformContent #width').data("kendoNumericTextBox").value(obj.geometry.x);
					$('#transformContent #height').data("kendoNumericTextBox").value(obj.geometry.y);
					$('#transformContent #opacity').data("kendoNumericTextBox").value(obj.opacity());

					$('#transformContent #translateX').data("kendoNumericTextBox").value(obj._translate.x);
					$('#transformContent #translateY').data("kendoNumericTextBox").value(obj._translate.y);
					$('#transformContent #translateZ').data("kendoNumericTextBox").value(obj._translate.z);

					$('#transformContent #rotateX').data("kendoNumericTextBox").value(obj._rotate.x);
					$('#transformContent #rotateY').data("kendoNumericTextBox").value(obj._rotate.y);
					$('#transformContent #rotateZ').data("kendoNumericTextBox").value(obj._rotate.z * 180 / Math.PI);

					$('#transformContent #scaleX').data("kendoNumericTextBox").value(obj._scale.x);
					$('#transformContent #scaleY').data("kendoNumericTextBox").value(obj._scale.y);
					$('#transformContent #scaleZ').data("kendoNumericTextBox").value(obj._scale.z);

					$('#transformContent #originX').data("kendoNumericTextBox").value(obj._origin.x);
					$('#transformContent #originY').data("kendoNumericTextBox").value(obj._origin.y);
					$('#transformContent #originZ').data("kendoNumericTextBox").value(obj._origin.z);

					$('#transformContent #size3dX').data("kendoNumericTextBox").value(obj.geometry.x);
					$('#transformContent #size3dY').data("kendoNumericTextBox").value(obj.geometry.y);
					$('#transformContent #size3dZ').data("kendoNumericTextBox").value(obj.geometry.z);
				},
				dataType: 'html'
			});
		} else {
			// The selected object cannot transform
			$('#transformContent').html('The selected object has no transform capabilities.');
		}
	}
});

editor.panel('transform', TransformPanel);