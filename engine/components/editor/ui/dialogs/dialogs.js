var UiDialogs = IgeEventingClass.extend({
	classId: 'UiDialogs',
	
	init: function () {
		var self = this;
		ige.requireStylesheet(igeRoot + 'components/editor/ui/dialogs/dialogs.css');
	},
	
	ready: function () {
		var self = this;
	},
	
	create: function (dialogData) {
		// Create a dialog and show as loading
		ige.editor.renderTemplate(
			igeRoot + 'components/editor/ui/dialogs/templates/dialog.html',
			{
				id: dialogData.id,
				title: dialogData.title,
				modal: dialogData.modal
			},
			function (err, dialogElem) {
				if (!err) {
					$('body').append(dialogElem);
					
					if (dialogData.blur) {
						// Add a dialog underlay
						$('<div class="dialogUnderlay" data-for="' + dialogData.id + '"></div>')
							.on('click', function () {
								dialogData.blur($(this));
							})
							.appendTo('body');
					}
					
					ige.editor.renderTemplate(
						dialogData.contentTemplate,
						dialogData.contentData,
						function (err, contentElem) {
							if (!err) {
								// Size the dialog
								dialogElem
									.animate({
										'width': dialogData.width,
										'height': dialogData.height,
										'marginLeft': -(dialogData.width / 2),
										'marginTop': -(dialogData.height / 2)
									}, 300);
								
								// Add the content
								dialogElem.find('.content')
									.html(contentElem);
							}
						}
					);
				}
			}
		);
	},
	
	close: function (id) {
		$('#' + id).remove();
		$('.dialogUnderlay[data-for="' + id + '"]').remove();
	}
});

// Init
ige.editor.ui.dialogs = new UiDialogs();