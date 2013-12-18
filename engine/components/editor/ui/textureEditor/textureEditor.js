var UiTextureEditor = IgeEventingClass.extend({
	classId: 'UiTextureEditor',
	
	init: function () {
		var self = this;
		ige.requireStylesheet(igeRoot + 'components/editor/ui/textureEditor/textureEditor.css');
	},
	
	ready: function () {
		var self = this;
	},
	
	showSpriteSheetEditor: function () {
		ige.editor.ui.dialogs.create({
			id: 'spriteSheetEditorDialog',
			title: 'Sprite Sheet Editor',
			contentTemplate: igeRoot + 'components/editor/ui/textureEditor/templates/spriteSheetEditor.html',
			blur: function () {
				ige.editor.ui.dialogs.close('spriteSheetEditorDialog');
			},
			width: 800,
			height: 400
		});
	}
});

// Init
ige.editor.ui.textureEditor = new UiTextureEditor();