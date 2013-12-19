var UiTextureEditor = IgeEventingClass.extend({
	classId: 'UiTextureEditor',
	
	init: function () {
		var self = this;
		ige.requireStylesheet(igeRoot + 'components/editor/ui/textureEditor/textureEditor.css');
		
		self._images = [];
		self._cells = [];
		self._cellCount = 0;
		self._cellWidth = 0;
		self._cellHeight = 0;
		self._cellX = 0;
		self._cellY = 0;
	},
	
	ready: function () {
		var self = this;
		
		ige.editor.ui.menus.addMenuGroup('toolsMenu', 'textures');
		ige.editor.ui.menus.addMenuItem('toolsMenu', 'textures', {
			id: 'textureEditor',
			icon: 'none',
			text: 'Texture Editor...',
			action: "ige.editor.ui.textureEditor.show();"
		});
	},
	
	show: function () {
		var self = this;
		
		ige.editor.ui.dialogs.create({
			id: 'textureEditorDialog',
			title: 'Texture Editor',
			contentTemplate: igeRoot + 'components/editor/ui/textureEditor/templates/textureEditor.html',
			blur: function () {
				ige.editor.ui.dialogs.close('textureEditorDialog');
			},
			width: 800,
			height: 600,
			contentData: {
				canvasWidth: 800,
				canvasHeight: 570
			},
			callback: function (err, dialogElem) {
				if (!err) {
					self.setupListeners(dialogElem);
					self.setupCanvas();
				}
			}
		});
	},
	
	setupListeners: function (dndTarget) {
		var self = this,
			overFunc,
			dropFunc;
		
		// Setup live event listener for underlay drag and drop events
		overFunc = function (e) {
			var event = e.originalEvent;
			event.preventDefault();
			
			event.dataTransfer.dropEffect = 'add';
			return false;
		};
		
		dropFunc = function (e) {
			var event = e.originalEvent,
				dataTransfer = event.dataTransfer,
				reader;
			
			event.preventDefault();
			event.stopPropagation();
			debugger;
			
			if (dataTransfer.files && dataTransfer.files.length > 0) {
				reader = new FileReader();
				
				reader.onload = function (event) {
					var img = new Image(),
						canvas = $('#textureEditorDialog').find('canvas')[0],
						ctx = canvas.getContext('2d');
					
					img.onload = function () {
						self._images.push(img);
						
						if (self._cellCount === 0) {
							// This is the first image dropped
							self._cells[0] = self._cells[0] || [];
							self._cells[0][0] = img;
							
							// Set the cell width and height from this image
							self._cellWidth = img.width;
							self._cellHeight = img.height;
						} else {
							//self.cellFromXY(event);
						}
						
						self._cellCount++;
					};
					
					img.src = event.target.result;
				};
				
				reader.readAsDataURL(dataTransfer.files[0]);
			}
		};
		
		dndTarget.on('dragover', overFunc);
		dndTarget.on('drop', dropFunc);
	},
	
	setupCanvas: function () {
		// Start a canvas loop to draw data in a tick-fashion
		setInterval(function () {
			
			//ctx.drawImage(img, self._cellX, self._cellY);
		}, 1000 / 60);
	}
});

// Init
ige.editor.ui.textureEditor = new UiTextureEditor();