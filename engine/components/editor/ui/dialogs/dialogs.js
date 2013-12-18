var UiDialogs = IgeEventingClass.extend({
	classId: 'UiDialogs',
	
	init: function () {
		var self = this;
		ige.requireStylesheet(igeRoot + 'components/editor/ui/dialogs/dialogs.css');
	},
	
	ready: function () {
		var self = this;
	},
	
	create: function (ops) {
		// Create a dialog and show as loading
		ige.editor.renderTemplate(
			igeRoot + 'components/editor/ui/dialogs/templates/dialog.html',
			ops.templateData,
			function (err, dialogElem) {
				if (!err) {
					$('body').append(dialogElem);
					
					ige.editor.renderTemplate(
						ops.contentTemplate,
						ops.templateData,
						function (err, contentElem) {
							if (!err) {
								dialogElem.find('.content')
									.append(contentElem);
							}
						}
					);
				}
			}
		);
	}
});

// Init
ige.editor.ui.dialogs = new UiDialogs();