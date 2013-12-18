var UiTextureEditor = IgeEventingClass.extend({
	classId: 'UiTextureEditor',
	
	init: function () {
		var self = this;
		ige.requireStylesheet(igeRoot + 'components/editor/ui/menuButtons/menuButtons.css');
	},
	
	ready: function () {
		var self = this;
	},
	
	showSpriteSheetEditor: function () {
		ige.editor.ui.dialogs.create({
			id: 'textureEditorDialog',
			contentTemplate: igeRoot + 'components/editor/ui/textureEditor/templates/spriteSheetEditor.html'
		});
	}
});

// Init
ige.editor.ui.textureEditor = new UiTextureEditor();