var UiAnimationEditor = IgeEventingClass.extend({
	classId: 'UiAnimationEditor',
	
	init: function () {
		var self = this;
		ige.requireStylesheet(igeRoot + 'components/editor/ui/animationEditor/animationEditor.css');
		
		self._cells = [];
		self._cellCount = 0;
		self._cellWidth = 0;
		self._cellHeight = 0;
	},
	
	ready: function () {
		var self = this;
		
		ige.editor.ui.menus.addMenuGroup('toolsMenu', 'textures');
		ige.editor.ui.menus.addMenuItem('toolsMenu', 'textures', {
			id: 'animationEditor',
			icon: 'none',
			text: 'Animation Editor...',
			action: "ige.editor.ui.animationEditor.show();"
		});
	},
	
	show: function (settings) {
		var self = this;
		
		if (settings) {
			self._textureImage = settings.textureImage;
			self._cellWidth = settings.cellWidth;
			self._cellHeight = settings.cellHeight;
		}
		
		ige.editor.ui.dialogs.create({
			id: 'animationEditorDialog',
			title: 'Animation Editor',
			contentTemplate: igeRoot + 'components/editor/ui/animationEditor/templates/animationEditor.html',
			blur: function () {
				ige.editor.ui.dialogs.confirm({
					title: 'Exit Animation Editor',
					width: 400,
					height: 150,
					contentData: {
						msg: 'Are you sure you want to exit the animation editor?',
						positiveTitle: 'OK',
						negativeTitle: 'Cancel'
					},
					
					ready: function () {
						
					},
					
					positive: function () {
						ige.editor.ui.dialogs.close('animationEditorDialog');
					}
				});
			},
			width: 1000,
			height: 600,
			contentData: {
				canvasWidth: 1000,
				canvasHeight: 100
			},
			callback: function (err, dialogElem) {
				if (!err) {
					// Add dialog controls
					/*ige.editor.ui.dialogs.addControl('animationEditorDialog', $('<div class="control download" title="Download as Image..."><span class="halflings-icon white download-alt"></span></div>'));
					ige.editor.ui.dialogs.addControl('animationEditorDialog', $('<div class="control clear" title="Clear"><span class="halflings-icon white file"></span></div>'));
					ige.editor.ui.dialogs.addControl('animationEditorDialog', $('<div class="control sep"></div>'));
					ige.editor.ui.dialogs.addControl('animationEditorDialog', $('<div class="control animate" title="Test Animation..."><span class="halflings-icon white film"></span></div>'));
					
					$('.control.download').on('click', function () { self.downloadImage(); });
					$('.control.clear').on('click', function () { self.clearImage(); });
					$('.control.animate').on('click', function () {
						// Show the animation dialog with the texture and settings already filled in
						
					});*/
					
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
		
		self._mainCanvas = $('#animationEditorDialog').find('.cellArea').find('canvas');
		self._ctx = self._mainCanvas[0].getContext('2d');
		
		// When moving over the canvas, highlight the cell
		self._mainCanvas.on('mousemove', function (e) {
			var oe = e.originalEvent,
				cell;
			
			if (self._cellWidth && self._cellHeight) {
				self._highlightCell = self.cellFromXY(oe);
			}
		});
		
		self._mainCanvas.on('mouseout', function (e) {
			delete self._highlightCell;
		});
		
		// If canvas is clicked, clear the cell
		self._mainCanvas.on('click', function (e) {
			var oe = e.originalEvent,
				cell = self.cellFromXY(oe);
			
			if (self._cells[cell.x] && self._cells[cell.x][cell.y]) {
				self._images.pull(self._cells[cell.x][cell.y]);
				delete self._cells[cell.x][cell.y];
			}
		});
	},
	
	setupCanvas: function () {
		var self = this;
		
		// Start a canvas loop to draw data in a tick-fashion
		setInterval(function () { self._renderCanvas(); }, 1000 / 60);
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
	
	_renderCanvas: function (noGrid) {
		var self = this,
			ctx = self._ctx,
			cell,
			cellWidth,
			cellHeight;
		
		// Clear the canvas
		ctx.clearRect(0, 0, self._mainCanvas[0].width, self._mainCanvas[0].height);
		
		// Loop the cells and draw them
		for (x in self._cells) {
			if (self._cells.hasOwnProperty(x)) {
				ctx.drawImage(self._cells[x], parseInt(x) * self._cellWidth, 0);
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
				for (var x = 0; x < self._mainCanvas[0].width; x += cellWidth) {
					ctx.beginPath();
					ctx.moveTo(x, 0);
					ctx.lineTo(x, self._mainCanvas[0].height);
					ctx.stroke();
				}
				
				for (var y = 0; y < self._mainCanvas[0].height; y += cellHeight) {
					ctx.beginPath();
					ctx.moveTo(0, y);
					ctx.lineTo(self._mainCanvas[0].width, y);
					ctx.stroke();
				}
			}
		}
	}
});

// Init
ige.editor.ui.animationEditor = new UiAnimationEditor();