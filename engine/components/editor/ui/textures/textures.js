var UiTextures = IgeEventingClass.extend({
	classId: 'UiTextures',
	
	init: function () {
		var self = this;
		
		ige.requireStylesheet(igeRoot + 'components/editor/ui/textures/textures.css');
		
		// Add tab to tabs
		$('<div class="tab" data-content="texturesContent" title="Textures"><div class="icon"><span class="halflings-icon white picture"></span></div></div>')
			.insertAfter('#tabs .tab3');
		
		// Add content html
		$('<div id="texturesContent" class="tabContent"><div class="header"><div class="label">Textures</div></div><div id="texturePanel" class="igeEditorGroup"></div></div>')
			.appendTo('#tabContents');
	},
	
	ready: function () {
		
	}
});

// Init
ige.editor.ui.textures = new UiTextures();