var UiTextureEditor = IgeEventingClass.extend({
	classId: 'UiTextureEditor',
	
	init: function () {
		var self = this;
		ige.requireStylesheet(igeRoot + 'components/editor/ui/textureEditor/textureEditor.css');
		
		self.reset();
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
	
	reset: function () {
		var self = this;
		
		self._tempImages = [];
		self._imageLoaded = false;
		self._cellWidth = 0;
		self._cellHeight = 0;
		self._cellCols = 1;
		self._cellRows = 1;
		self._cells = [];
		
		self._backBuffer = document.createElement('canvas');
		self._backBufferCtx = self._backBuffer.getContext('2d');
		
		self._backBuffer.width = 1;
		self._backBuffer.height = 1;
	},
	
	show: function () {
		var self = this;
		self.reset();
		
		ige.editor.ui.dialogs.create({
			id: 'textureEditorDialog',
			icon: 'halflings-icon white picture',
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
					
					positive: function () {
						ige.editor.ui.dialogs.close('textureEditorDialog');
					}
				});
			},
			width: 800,
			height: 600,
			contentData: {
				canvasWidth: 800,
				canvasHeight: 568
			},
			ready: function (err) {
				if (!err) {
					// Add dialog controls
					ige.editor.ui.dialogs.addControl('textureEditorDialog', $('<div class="control sep"></div>'));
					ige.editor.ui.dialogs.addControl('textureEditorDialog', $('<div class="control download" title="Download as Image..."><span class="halflings-icon white download-alt"></span></div>'));
					ige.editor.ui.dialogs.addControl('textureEditorDialog', $('<div class="control split" title="Split Image Into Cells"><span class="halflings-icon white th"></span></div>'));
					ige.editor.ui.dialogs.addControl('textureEditorDialog', $('<div class="control clear" title="Clear"><span class="halflings-icon white file"></span></div>'));
					ige.editor.ui.dialogs.addControl('textureEditorDialog', $('<div class="control sep"></div>'));
					ige.editor.ui.dialogs.addControl('textureEditorDialog', $('<div class="control animate" title="Test as Animation..."><span class="halflings-icon white film"></span></div>'));
					ige.editor.ui.dialogs.addControl('textureEditorDialog', $('<div class="control sep"></div>'));
					ige.editor.ui.dialogs.addControl('textureEditorDialog', $('<div class="control help" title="Help..."><span class="halflings-icon white question-sign"></span></div>'));
					
					$('.control.download').on('click', function () { self.downloadImage(); });
					$('.control.split').on('click', function () { self.splitImage(); });
					$('.control.clear').on('click', function () { self.clearImage(); });
					$('.control.animate').on('click', function () { self.toAnimationEditor(); });
					$('.control.help').on('click', function () { self.help(); });
					
					self.setupListeners(this);
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
			
			self.clearCell(cell);
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
				i;
			
			event.preventDefault();
			event.stopPropagation();
			
			if (dataTransfer.files && dataTransfer.files.length > 0) {
				if (dataTransfer.files.length > 1) {
					for (i = 0; i < dataTransfer.files.length; i++) {
						self._loadTempImage(dataTransfer.files[i]);
					}
					
					// Show multi-file input dialog
					ige.editor.ui.dialogs.input({
						id: 'multiFileInput',
						title: 'Multi-File Import',
						contentTemplate: igeRoot + 'components/editor/ui/textureEditor/templates/multiFiles.html',
						contentData: {
							fileCount: dataTransfer.files.length,
							positiveTitle: 'OK',
							negativeTitle: 'Cancel'
						},
						negative: function () {
							self._tempImages = [];
						},
						positive: function () {
							// Remove instructions
							$('#textureEditorDialog').find('.instructions').remove();
							
							// Get the selected number of columns
							var columns = $('#multiFileInput').find('select').val(),
								noBreak = true,
								i = 0,
								x = 0, y;
							
							// Find the next cell in a column-limited area
							while (noBreak) {
								y = Math.floor(i / columns);
								
								if (!self._cells[x] || (self._cells[x] && !self._cells[x][y])) {
									noBreak = false;
								} else {
									i++;
									x++;
									
									if (x >= columns) {
										x = 0;
									}
								}
							}
							
							for (i = 0; i < self._tempImages.length; i++) {
								if (!self._imageLoaded) {
									self._cellWidth = self._tempImages[i].width;
									self._cellHeight = self._tempImages[i].height;
								}
								
								self.addImage({
									x: x,
									y: y
								}, self._tempImages[i]);
								
								self._imageLoaded = true;
								
								x++;
									
								if (x >= columns) {
									x = 0;
									y++;
								}
							}
							
							self._tempImages = [];
						}
					});
				} else {
					self._loadImage(e, dataTransfer.files[0]);
				}
			}
		};
		
		dndTarget.on('dragover', overFunc);
		dndTarget.on('drop', dropFunc);
	},
	
	_loadImage: function (e, file, callback) {
		var self = this,
			reader = new FileReader();
					
		reader.onload = function (event) {
			var img = new Image();
			
			img.onload = function () {
				if (!self._imageLoaded) {
					// Set the cell width and height from this image
					self._cellWidth = img.width;
					self._cellHeight = img.height;
					
					self.addImage({x: 0, y: 0}, img);
					
					// Remove instructions
					$('#textureEditorDialog').find('.instructions').remove();
				} else {
					// Add image to back-buffer in correct location
					self.addImage(self.cellFromXY(e.originalEvent), img);
				}
				
				self._imageLoaded = true;
				
				if (callback) {
					callback();
				}
			};
			
			img.src = event.target.result;
		};
		
		reader.readAsDataURL(file);
	},
	
	_loadTempImage: function (file, callback) {
		var self = this,
			reader = new FileReader();
					
		reader.onload = function (event) {
			var img = new Image();
			
			img.onload = function () {
				self._tempImages.push(img);
				
				if (callback) {
					callback();
				}
			};
			
			img.src = event.target.result;
		};
		
		reader.readAsDataURL(file);
	},
	
	setupCanvas: function () {
		var self = this;
		
		// Start a canvas loop to draw data in a tick-fashion
		setInterval(function () { self._renderCanvas(); }, 1000 / 60);
	},
	
	getFinalTexture: function () {
		var self = this,
			drawnArea;
		
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
			
			return newCanvas;
		}
	},
	
	downloadImage: function () {
		var self = this,
			drawnArea,
			form = $('#textureEditorDialog').find('form'),
			imageDataElem = form.find('#formImageData'),
			newCanvas;
		
		// Render a frame without grid lines
		self._renderCanvas(true);
		drawnArea = self.drawnArea();
		
		if (drawnArea.width > 0 && drawnArea.height > 0) {
			newCanvas = self.getFinalTexture();
			
			// Download canvas image as png
			imageDataElem.val(newCanvas.toDataURL('image/png'));
			form[0].submit();
		}
	},
	
	splitImage: function () {
		var self = this,
			cols = self._cellCols,
			rows = self._cellRows;
		
		// Show split image dialog to select rows and columns
		ige.editor.ui.dialogs.input({
			title: 'Split Image Into Cells',
			width: 400,
			height: 250,
			contentTemplate: igeRoot + 'components/editor/ui/textureEditor/templates/splitImage.html',
			contentData: {
				positiveTitle: 'OK',
				negativeTitle: 'Cancel',
				rows: rows,
				cols: cols
			},
			
			ready: function () {
				var colsElem = this.find('#cols'),
					rowsElem = this.find('#rows');
				
				colsElem.on('change', function () {
					var cols = colsElem.val();
					cols = cols || 1;
					self.cellCols(cols);
				});
				
				rowsElem.on('change', function () {
					var rows = rowsElem.val();
					rows = rows || 1;
					self.cellRows(rows);
				});
			},
			
			positive: function () {
				// Grab the new values from the dialog
				var cols = this.find('#cols').val(),
					rows = this.find('#rows').val();
				
				cols = cols || 1;
				rows = rows || 1;
				
				self.cellCols(cols);
				self.cellRows(rows);
			},
			
			negative: function () {
				// Reset the values of the cols and rows
				self.cellCols(cols);
				self.cellRows(rows);
			}
		});
	},
	
	cellCols: function (val) {
		if (val !== undefined) {
			if (this._backBuffer) {
				// Use the first image
				var img = this._backBuffer,
					imgWidth = img.width,
					imgHeight = img.height;
				
				// Calculate cell width from number of cols specified
				this._cellWidth = Math.floor(imgWidth / val);
				this._cellCols = val;
				
				// Recalculate occupied cells
				this._cells = [];
				this.occupyCells(0, 0, imgWidth, imgHeight);
			}
		}
		
		return this._cellCols;
	},
	
	cellRows: function (val) {
		if (val !== undefined) {
			if (this._backBuffer) {
				// Use the first image
				var img = this._backBuffer,
					imgWidth = img.width,
					imgHeight = img.height;
				
				// Calculate cell width from number of cols specified
				this._cellHeight = Math.floor(imgHeight / val);
				this._cellRows = val;
				
				// Recalculate occupied cells
				this._cells = [];
				this.occupyCells(0, 0, imgWidth, imgHeight);
			}
		}
		
		return this._cellRows;
	},
	
	resizeBackBuffer: function (newWidth, newHeight) {
		if (newWidth < 1) {
			newWidth = 1;
		}
		
		if (newHeight < 1) {
			newHeight = 1;
		}
		
		var newBackBuffer = document.createElement('canvas'),
			nbbCtx = newBackBuffer.getContext('2d');
		
		newBackBuffer.width = newWidth;
		newBackBuffer.height = newHeight;
		
		// Paint old back-buffer to new one
		nbbCtx.drawImage(this._backBuffer, 0, 0);
		
		// Assign new bb
		this._backBuffer = newBackBuffer;
		this._backBufferCtx = nbbCtx;
	},
	
	addImage: function (cell, img) {
		// Paint the whole image to the back-buffer from the cell x, y
		var self = this,
			x = cell.x * self._cellWidth,
			y = cell.y * self._cellHeight;
		
		if (x + img.width > self._backBuffer.width || y + img.height > self._backBuffer.height) {
			// Set back-buffer size
			var newWidth,
				newHeight;
			
			if (x + img.width > self._backBuffer.width) {
				newWidth = x + img.width;
			} else {
				newWidth = self._backBuffer.width;
			}
			
			if (y + img.height > self._backBuffer.height) {
				newHeight = y + img.height;
			} else {
				newHeight = self._backBuffer.height;
			}
			
			self.resizeBackBuffer(newWidth, newHeight);
		}
		
		// Clear the space the image will occupy
		self._backBufferCtx.clearRect(x, y, img.width, img.height);
		
		// Draw image
		self._backBufferCtx.drawImage(img, x, y);
		
		// Recalculate cell columns and rows
		self.recalcColsRows();
		
		// Occupy cells
		self.occupyCells(x, y, img.width, img.height);
	},
	
	recalcColsRows: function () {
		var self = this;
		self._cellCols = self._backBuffer.width / self._cellWidth;
		self._cellRows = self._backBuffer.height / self._cellHeight;
	},
	
	occupyCells: function (x, y, w, h) {
		var self = this,
			cellX = Math.floor(x / self._cellWidth),
			cellY = Math.floor(y / self._cellHeight),
			cellW = Math.floor(w / self._cellWidth),
			cellH = Math.floor(h / self._cellHeight),
			j, k;
		
		for (j = 0; j < cellW; j++) {
			for (k = 0; k < cellH; k++) {
				self._cells[j + cellX] = self._cells[j + cellX] || [];
				self._cells[j + cellX][k + cellY] = true;
			}
		}
	},
	
	clearCell: function (cell) {
		var self = this,
			j, k, maxX = 0, maxY = 0;
		
		// Clear a section of the back-buffer
		self._backBufferCtx.clearRect(cell.x * self._cellWidth, cell.y * self._cellHeight, self._cellWidth, self._cellHeight);
		
		if (self._cells[cell.x] && self._cells[cell.x][cell.y]) {
			self._cells[cell.x][cell.y] = false;
		}
		
		// Now reset the back-buffer size to match max cells
		for (j in self._cells) {
			if (self._cells.hasOwnProperty(j)) {
				for (k in self._cells[j]) {
					if (self._cells[j].hasOwnProperty(k) && self._cells[j][k]) {
						if (parseInt(j) + 1 > maxX) {
							maxX = parseInt(j) + 1;
						}
						
						if (parseInt(k) + 1 > maxY) {
							maxY = parseInt(k) + 1;
						}
					}
				}
			}
		}
		
		self.resizeBackBuffer(maxX * self._cellWidth, maxY * self._cellHeight);
		self.recalcColsRows();
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
			
			positive: function () {
				// Clear all the cell data
				self.reset();
			}
		});
	},
	
	toAnimationEditor: function () {
		var self = this;
		
		// Show the animation dialog with the texture and settings already filled in
		ige.editor.ui.animationEditor.show({
			textureImage: self.getFinalTexture(),
			cellWidth: self._cellWidth,
			cellHeight: self._cellHeight
		});
	},
	
	help: function () {
		var self = this;
		
		ige.editor.ui.dialogs.prompt({
			icon: 'halflings-icon white question-sign',
			title: 'Texture Editor Help',
			width: 400,
			height: 220,
			contentTemplate: igeRoot + 'components/editor/ui/textureEditor/templates/help.html',
			contentData: {
				positiveTitle: 'OK'
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
		return {width: this._backBuffer.width, height: this._backBuffer.height};
	},
	
	_renderCanvas: function (noGrid) {
		var self = this,
			ctx = self._ctx,
			cell,
			cellWidth,
			cellHeight,
			j, k;
		
		// Clear the canvas
		ctx.clearRect(0, 0, self._canvas[0].width, self._canvas[0].height);
		
		// Loop the cells and draw them
		ctx.drawImage(self._backBuffer, 0, 0);
		
		if (!noGrid) {
			cellWidth = self._cellWidth;
			cellHeight = self._cellHeight;
			
			// Draw occupied cells
			ctx.fillStyle = 'rgba(255, 0 , 0, 0.5)';
			for (j in self._cells) {
				if (self._cells.hasOwnProperty(j)) {
					for (k in self._cells[j]) {
						if (self._cells[j].hasOwnProperty(k) && self._cells[j][k]) {
							ctx.fillRect(j * cellWidth, k * cellHeight, cellWidth, cellHeight);
						}
					}
				}
			}
			
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