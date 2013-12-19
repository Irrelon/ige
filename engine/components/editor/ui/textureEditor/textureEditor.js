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
				ige.editor.ui.dialogs.confirm({
					title: 'Exit Texture Editor',
					width: 400,
					height: 150,
					contentData: {
						msg: 'Are you sure you want to exit the texture editor?',
						positiveTitle: 'OK',
						negativeTitle: 'Cancel'
					},
					
					ready: function () {
						
					},
					
					positive: function () {
						ige.editor.ui.dialogs.close('textureEditorDialog');
					}
				});
			},
			width: 800,
			height: 600,
			contentData: {
				canvasWidth: 800,
				canvasHeight: 570
			},
			callback: function (err, dialogElem) {
				if (!err) {
					// Add dialog controls
					ige.editor.ui.dialogs.addControl('textureEditorDialog', $('<div class="control download" title="Download as Image..."><span class="halflings-icon white download-alt"></span></div>'));
					ige.editor.ui.dialogs.addControl('textureEditorDialog', $('<div class="control clear" title="Clear"><span class="halflings-icon white file"></span></div>'));
					
					$('.control.download').on('click', function () { self.downloadImage(); });
					$('.control.clear').on('click', function () { self.clearImage(); });
					
					self.setupListeners(dialogElem);
					self.setupCanvas();
				}
			}
		});
	},
	
	downloadImage: function () {
		var self = this;
		
		
		var form = $('#textureEditorDialog').find('form'),
			imageDataElem = form.find('#formImageData');
		
		// Render a frame without grid lines
		self._renderCanvas(true);
		
		// Download canvas image as png
		imageDataElem.val(self._canvas.toDataURL('image/png'));
		form[0].submit();
	},
	
	clearImage: function () {
		var self = this;
		
		ige.editor.ui.dialogs.confirm({
			title: 'Clear Texture',
			width: 400,
			height: 150,
			contentData: {
				msg: 'Are you sure you want to clear this texture?',
				positiveTitle: 'OK',
				negativeTitle: 'Cancel'
			},
			
			ready: function () {
				
			},
			
			positive: function () {
				// Clear all the cell data
				self._images = [];
				self._cells = [];
				self._cellCount = 0;
				self._cellWidth = 0;
				self._cellHeight = 0;
			}
		});
	},
	
	setupListeners: function (dndTarget) {
		var self = this,
			overFunc,
			dropFunc;
		
		self._canvas = $('#textureEditorDialog').find('canvas')[0];
		self._ctx = self._canvas.getContext('2d');
		
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
			
			if (dataTransfer.files && dataTransfer.files.length > 0) {
				reader = new FileReader();
				
				reader.onload = function (event) {
					var img = new Image();
					
					img.onload = function () {
						self._images.push(img);
						
						if (self._cellCount === 0) {
							// This is the first image dropped
							self._cells[0] = self._cells[0] || [];
							self._cells[0][0] = img;
							
							// Set the cell width and height from this image
							self._cellWidth = img.width;
							self._cellHeight = img.height;
							
							// Remove instructions
							$('#textureEditorDialog').find('.instructions').remove();
						} else {
							var cell = self.cellFromXY(e.originalEvent);
							self._cells[cell.x] = self._cells[cell.x] || [];
							self._cells[cell.x][cell.y] = img;
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
	
	cellFromXY: function (event) {
		return {
			x: Math.floor(event.offsetX / this._cellWidth),
			y: Math.floor(event.offsetY / this._cellHeight)
		};
	},
	
	setupCanvas: function () {
		var self = this;
		
		// Start a canvas loop to draw data in a tick-fashion
		setInterval(function () { self._renderCanvas(); }, 1000 / 60);
	},
	
	_renderCanvas: function (noGrid) {
		var self = this,
			ctx = self._ctx;
		
		// Clear the canvas
		ctx.clearRect(0, 0, self._canvas.width, self._canvas.height);
		
		// Loop the cells and draw them
		for (x in self._cells) {
			if (self._cells.hasOwnProperty(x)) {
				for (y in self._cells[x]) {
					if (self._cells[x].hasOwnProperty(y)) {
						ctx.drawImage(self._cells[x][y], parseInt(x) * self._cellWidth, parseInt(y) * self._cellHeight);
					}
				}
			}
		}
		
		if (!noGrid) {
			// Draw cell grid
			if (self._cellWidth > 0 && self._cellHeight > 0) {
				ctx.strokeStyle = '#4affff';
				for (var x = 0; x < self._canvas.width; x += self._cellWidth) {
					ctx.beginPath();
					ctx.moveTo(x, 0);
					ctx.lineTo(x, self._canvas.height);
					ctx.stroke();
				}
				
				for (var y = 0; y < self._canvas.height; y += self._cellHeight) {
					ctx.beginPath();
					ctx.moveTo(0, y);
					ctx.lineTo(self._canvas.width, y);
					ctx.stroke();
				}
			}
		}
	}
});

// Init
ige.editor.ui.textureEditor = new UiTextureEditor();