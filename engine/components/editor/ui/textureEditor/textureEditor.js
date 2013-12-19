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
	
	setupListeners: function (dndTarget) {
		var self = this,
			overFunc,
			dropFunc;
		
		self._canvas = $('#textureEditorDialog').find('canvas');
		self._ctx = self._canvas[0].getContext('2d');
		
		// When moving over the canvas, highlight the cell
		self._canvas.on('mousemove', function (e) {
			var oe = e.originalEvent,
				cell;
			
			if (self._cellWidth && self._cellHeight) {
				self._highlightCell = self.cellFromXY(oe);
			}
		});
		
		self._canvas.on('mouseout', function (e) {
			delete self._highlightCell;
		});
		
		// If canvas is clicked, clear the cell
		self._canvas.on('click', function (e) {
			var oe = e.originalEvent,
				cell = self.cellFromXY(oe);
			
			if (self._cells[cell.x] && self._cells[cell.x][cell.y]) {
				self._images.pull(self._cells[cell.x][cell.y]);
				delete self._cells[cell.x][cell.y];
			}
		});
		
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
	
	setupCanvas: function () {
		var self = this;
		
		// Start a canvas loop to draw data in a tick-fashion
		setInterval(function () { self._renderCanvas(); }, 1000 / 60);
	},
	
	downloadImage: function () {
		var self = this,
			drawnArea,
			form = $('#textureEditorDialog').find('form'),
			imageDataElem = form.find('#formImageData');
		
		// Render a frame without grid lines
		self._renderCanvas(true);
		drawnArea = self.drawnArea();
		
		if (drawnArea.width > 0 && drawnArea.height > 0) {
			// Create a new temp canvas and render the drawn area to it
			var newCanvas = document.createElement('canvas'),
				ctx;
			
			newCanvas.width = drawnArea.width;
			newCanvas.height = drawnArea.height;
			
			// Draw the data to the temp canvas
			ctx = newCanvas.getContext('2d');
			ctx.drawImage(self._canvas[0], 0, 0);
			
			// Download canvas image as png
			imageDataElem.val(newCanvas.toDataURL('image/png'));
			form[0].submit();
		}
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
	
	cellFromXY: function (event) {
		if (this._cellWidth && this._cellHeight) {
			return {
				x: Math.floor(event.offsetX / this._cellWidth),
				y: Math.floor(event.offsetY / this._cellHeight)
			};
		} else {
			return {
				x: 0,
				y: 0
			}
		}
	},
	
	drawnArea: function () {
		var self = this,
			maxX = 0,
			maxY = 0;
		
		if (self._cellWidth > 0 && self._cellHeight > 0) {
			for (x in self._cells) {
				if (self._cells.hasOwnProperty(x)) {
					for (y in self._cells[x]) {
						if (self._cells[x].hasOwnProperty(y)) {
							if (x > maxX) {
								maxX = x;
							}
							
							if (y > maxY) {
								maxY = y;
							}
						}
					}
				}
			}
			
			return {
				width: self._cellWidth + (maxX * self._cellWidth),
				height: self._cellHeight + (maxY * self._cellHeight)
			}
		} else {
			return {
				width: 0,
				height: 0
			}
		}
	},
	
	_renderCanvas: function (noGrid) {
		var self = this,
			ctx = self._ctx,
			cell,
			cellWidth,
			cellHeight;
		
		// Clear the canvas
		ctx.clearRect(0, 0, self._canvas[0].width, self._canvas[0].height);
		
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
			cellWidth = self._cellWidth;
			cellHeight = self._cellHeight;
			
			// Draw highlighted cell
			cell = self._highlightCell;
			
			if (cell) {
				ctx.fillStyle = 'rgba(0, 0 , 0, 0.2)';
				ctx.fillRect(cell.x * cellWidth, cell.y * cellHeight, cellWidth, cellHeight);
			}
			
			// Draw cell grid
			if (cellWidth > 0 && cellHeight > 0) {
				ctx.strokeStyle = '#4affff';
				for (var x = 0; x < self._canvas[0].width; x += cellWidth) {
					ctx.beginPath();
					ctx.moveTo(x, 0);
					ctx.lineTo(x, self._canvas[0].height);
					ctx.stroke();
				}
				
				for (var y = 0; y < self._canvas[0].height; y += cellHeight) {
					ctx.beginPath();
					ctx.moveTo(0, y);
					ctx.lineTo(self._canvas[0].width, y);
					ctx.stroke();
				}
			}
		}
	}
});

// Init
ige.editor.ui.textureEditor = new UiTextureEditor();