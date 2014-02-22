var UiDialogs = IgeEventingClass.extend({
	classId: 'UiDialogs',
	
	init: function () {
		var self = this;
		self._dialogOrder = 200010;
		ige.requireStylesheet(igeRoot + 'components/editor/ui/dialogs/dialogs.css');
	},
	
	ready: function () {
		var self = this;
	},
	
	create: function (dialogData) {
		var self = this;
		self._dialogOrder += 2;
		
		dialogData.id = dialogData.id || ige.newIdHex();
		dialogData.title = dialogData.title || 'Dialog';
		
		// Create a dialog and show as loading
		ige.editor.renderTemplate(
			igeRoot + 'components/editor/ui/dialogs/templates/dialog.html',
			dialogData,
			function (err, dialogElem) {
				if (!err) {
					$('body').append(dialogElem);
					dialogElem
						.css({
							'zIndex': self._dialogOrder,
							'width': dialogData.width,
							'height': dialogData.height,
							'marginLeft': -(dialogData.width / 2),
							'marginTop': -(dialogData.height / 2),
							'opacity': 1
						});
					
					// Add a dialog underlay
					var underlay = $('<div class="editorElem toggleHide shown dialogUnderlay" data-for="' + dialogData.id + '"></div>')
						.css('zIndex', self._dialogOrder - 1)
						.appendTo('body');
					
					// If not modal, remove dialog when underlay clicked
					if (!dialogData.modal) {
						underlay.on('click', function () {
							if (dialogData.blur) {
								dialogData.blur($(this));
							} else {
								ige.editor.ui.dialogs.close(dialogData.id);
							}
						});
					} else {
						underlay.css('backgroundColor', 'rgba(0, 0, 0, 0.2)');
					}
					
					// If not modal, hook the close button
					if (!dialogData.modal) {
						dialogElem.find('.controls').find('.control.close').on('click', function () {
							if (dialogData.blur) {
								dialogData.blur($(this));
							} else {
								ige.editor.ui.dialogs.close(dialogData.id);
							}
						});
					}
					
					if (dialogData.contentTemplate) {
						ige.editor.renderTemplate(
							dialogData.contentTemplate,
							dialogData.contentData || {},
							function (err, contentElem) {
								if (!err) {
									/*dialogElem.animate({
										'opacity': 1.0
									}, 300);*/
									
									// Add the content
									dialogElem.find('.content')
										.html(contentElem);
									
									if (dialogData.callback) {
										dialogData.callback(false, dialogElem);
									}
									
									if (dialogData.ready) {
										dialogData.ready.apply(dialogElem, [err]);
									}
								} else {
									if (dialogData.callback) {
										dialogData.callback(err);
									}
									
									if (dialogData.ready) {
										dialogData.ready.apply(dialogElem, [err]);
									}
								}
							}
						);
					} else {
						if (dialogData.callback) {
							dialogData.callback(false, dialogElem);
						}
						
						if (dialogData.ready) {
							dialogData.ready.apply(dialogElem, [err]);
						}
					}
				}
			}
		);
	},
	
	addControl: function (dialogId, controlElem) {
		$('#' + dialogId).find('.controls').append(controlElem);
	},
	
	confirm: function (dialogOptions) {
		dialogOptions.id = dialogOptions.id || ige.newIdHex();
		if (dialogOptions.dialogClass) {
			dialogOptions.dialogClass += ' confirm';
		} else {
			dialogOptions.dialogClass = 'confirm';
		}
		
		dialogOptions.modal = true;
		dialogOptions.contentTemplate = dialogOptions.contentTemplate || igeRoot + 'components/editor/ui/dialogs/templates/confirm.html';
		dialogOptions.width = dialogOptions.width || 400;
		dialogOptions.height = dialogOptions.height || 200;
		dialogOptions.contentData = dialogOptions.contentData || {
			positiveTitle: 'OK',
			negativeTitle: 'Cancel'
		};
		
		dialogOptions.callback = function (err, dialogElem) {
			if (!err) {
				// Attach listeners to this confirmation dialog's buttons
				var buttons = dialogElem.find('.actionButtons');
				buttons.find('.negative').on('click', function () {
					if (dialogOptions.negative) {
						dialogOptions.negative.apply(dialogElem);
					}
					ige.editor.ui.dialogs.close(dialogOptions.id);
				});
				
				buttons.find('.positive').on('click', function () {
					if (dialogOptions.positive) {
						dialogOptions.positive.apply(dialogElem);
					}
					ige.editor.ui.dialogs.close(dialogOptions.id);
				});
				
				if (dialogOptions.ready) {
					dialogOptions.ready.apply(dialogElem, [err]);
				}
			}
		};
		
		this.create(dialogOptions);
	},
	
	input: function (dialogOptions) {
		dialogOptions.id = dialogOptions.id || ige.newIdHex();
		if (dialogOptions.dialogClass) {
			dialogOptions.dialogClass += ' input';
		} else {
			dialogOptions.dialogClass = 'input';
		}
		
		dialogOptions.modal = true;
		dialogOptions.contentTemplate = dialogOptions.contentTemplate || igeRoot + 'components/editor/ui/dialogs/templates/input.html';
		dialogOptions.width = dialogOptions.width || 400;
		dialogOptions.height = dialogOptions.height || 200;
		dialogOptions.contentData = dialogOptions.contentData || {
			msg: 'Please enter a value',
			positiveTitle: 'OK',
			negativeTitle: 'Cancel'
		};
		
		dialogOptions.callback = function (err, dialogElem) {
			if (!err) {
				// Attach listeners to this confirmation dialog's buttons
				var buttons = dialogElem.find('.actionButtons');
				buttons.find('.negative').on('click', function () {
					if (dialogOptions.negative) {
						dialogOptions.negative.apply(dialogElem);
					}
					ige.editor.ui.dialogs.close(dialogOptions.id);
				});
				
				buttons.find('.positive').on('click', function () {
					if (dialogOptions.positive) {
						dialogOptions.positive.apply(dialogElem);
					}
					ige.editor.ui.dialogs.close(dialogOptions.id);
				});
				
				if (dialogOptions.ready) {
					dialogOptions.ready.apply(dialogElem, [err]);
				}
			}
		};
		
		this.create(dialogOptions);
	},
	
	prompt: function (dialogOptions) {
		dialogOptions.id = dialogOptions.id || ige.newIdHex();
		if (dialogOptions.dialogClass) {
			dialogOptions.dialogClass += ' prompt';
		} else {
			dialogOptions.dialogClass = 'prompt';
		}
		
		dialogOptions.modal = true;
		dialogOptions.contentTemplate = dialogOptions.contentTemplate || igeRoot + 'components/editor/ui/dialogs/templates/prompt.html';
		dialogOptions.width = dialogOptions.width || 400;
		dialogOptions.height = dialogOptions.height || 200;
		dialogOptions.contentData = dialogOptions.contentData || {
			positiveTitle: 'OK'
		};
		
		dialogOptions.callback = function (err, dialogElem) {
			if (!err) {
				// Attach listeners to this confirmation dialog's buttons
				var buttons = dialogElem.find('.actionButtons');
				buttons.find('.positive').on('click', function () {
					if (dialogOptions.positive) {
						dialogOptions.positive.apply(dialogElem);
					}
					ige.editor.ui.dialogs.close(dialogOptions.id);
				});
				
				if (dialogOptions.ready) {
					dialogOptions.ready.apply(dialogElem, [err]);
				}
			}
		};
		
		this.create(dialogOptions);
	},
	
	close: function (id) {
		$('#' + id).remove();
		$('.dialogUnderlay[data-for="' + id + '"]').remove();
		
		this._dialogOrder -= 2;
	}
});

// Init
ige.editor.ui.dialogs = new UiDialogs();