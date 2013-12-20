var UiAnimationEditor = IgeEventingClass.extend({
	classId: 'UiAnimationEditor',
	
	init: function () {
		var self = this;
		ige.requireStylesheet(igeRoot + 'components/editor/ui/animationEditor/animationEditor.css');
		self.reset();
	},
	
	reset: function () {
		var self = this;
		self._frames = [];
		self._cellCount = 0;
		self._cellWidth = 0;
		self._cellHeight = 0;
		
		self._lastTick = new Date().getTime();
		self._tickDelta = 0;
		
		self._animationEntity = new IgeEntity()
			.addComponent(IgeAnimationComponent);
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
		self.reset();
		
		if (settings) {
			self._textureImage = settings.textureImage;
			self._cellWidth = settings.cellWidth;
			self._cellHeight = settings.cellHeight;
		}
		
		ige.editor.ui.dialogs.create({
			id: 'animationEditorDialog',
			icon: 'halflings-icon white film',
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
					positive: function () {
						self.destroy();
						ige.editor.ui.dialogs.close('animationEditorDialog');
					}
				});
			},
			width: 1000,
			height: 600,
			contentData: {
				outputCanvasWidth: 500,
				outputCanvasHeight: 404,
				framesCanvasWidth: 2000,
				framesCanvasHeight: 100,
				cellsCanvasWidth: self._textureImage !== undefined ? self._textureImage.width : 500,
				cellsCanvasHeight: self._textureImage !== undefined ? self._textureImage.height : 404
			},
			callback: function (err, dialogElem) {
				if (!err) {
					self.setupListeners(dialogElem);
					self.setupCanvas();
				}
			}
		});
	},
	
	setupListeners: function (dialogElem) {
		var self = this;
		
		self._outputCanvas = dialogElem.find('.viewArea').find('canvas');
		self._outputCtx = self._outputCanvas[0].getContext('2d');
		
		self._framesCanvas = dialogElem.find('.framesArea').find('canvas');
		self._framesCtx = self._framesCanvas[0].getContext('2d');
		
		self._cellsCanvas = dialogElem.find('.cellArea').find('canvas');
		self._cellsCtx = self._cellsCanvas[0].getContext('2d');
		
		// When moving over the canvas, highlight the cell
		self._framesCanvas.on('mousemove', function (e) {
			var oe = e.originalEvent,
				cell;
			
			if (self._cellWidth && self._cellHeight) {
				cell = self.cellFromXY(oe);
				
				if (cell.y === 0) {
					self._framesHighlightCell = cell;
				} else {
					delete self._framesHighlightCell;
				}
			}
		});
		
		self._framesCanvas.on('mouseout', function (e) {
			delete self._framesHighlightCell;
		});
		
		// If canvas is clicked, clear the cell
		self._framesCanvas.on('click', function (e) {
			var oe = e.originalEvent,
				cell = self.cellFromXY(oe);
			
			if (self._frames[cell.x]) {
				self._frames.splice(cell.x, 1);
				self._animationEntity.animation.removeFrame('editorAnim', cell.x);
			}
		});
		
		// When moving over the canvas, highlight the cell
		self._cellsCanvas.on('mousemove', function (e) {
			var oe = e.originalEvent,
				cell;
			
			if (self._cellWidth && self._cellHeight) {
				self._cellsHighlightCell = self.cellFromXY(oe);
			}
		});
		
		self._cellsCanvas.on('mouseout', function (e) {
			delete self._cellsHighlightCell;
		});
		
		// If canvas is clicked, add the cell to the animation frames
		self._cellsCanvas.on('click', function (e) {
			var oe = e.originalEvent,
				cell = self.cellFromXY(oe),
				frameIndex;
			
			// Add the cell index to the animation frames
			// Loop the available cells and draw them
			self._frames.push(cell);
			
			// Get the frame index from cell position
			frameIndex = self.indexFromCell(cell);
			
			// Change the defined animation
			if (self._animationEntity.animation.defined('editorAnim')) {
				self._animationEntity
					.animation.addFrame('editorAnim', frameIndex);
			} else {
				self._animationEntity
					.animation.define('editorAnim', [frameIndex], 5, -1, false)
					.animation.start('editorAnim');
			}
		});
	},
	
	indexFromCell: function (cell) {
		var self = this;
		return (cell.y * (self._textureImage.width / self._cellWidth)) + cell.x + 1; 
	},
	
	cellFromIndex: function (index) {
		index = index - 1;
		var self = this,
			cellsPerRow = (self._textureImage.width / self._cellWidth),
			y = Math.floor(index / cellsPerRow),
			x = index - (y * cellsPerRow);
		
		return {x: x, y: y};
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
			framesCtx = self._framesCtx,
			cellsCtx = self._cellsCtx,
			outputCtx = self._outputCtx,
			cell,
			cellWidth,
			cellHeight,
			x, y, i,
			cellIndex;
		
		self._currentTime = new Date().getTime();
		self._tickDelta = self._currentTime - self._lastTick;
		self._lastTick = self._currentTime;
		
		// Clear the canvas
		framesCtx.clearRect(0, 0, self._framesCanvas[0].width, self._framesCanvas[0].height);
		cellsCtx.clearRect(0, 0, self._cellsCanvas[0].width, self._cellsCanvas[0].height);
		outputCtx.clearRect(0, 0, self._outputCanvas[0].width, self._outputCanvas[0].height);
		
		// Loop the frames and draw them
		for (i = 0; i < self._frames.length; i++) {
			cell = self._frames[i];
			
			framesCtx.drawImage(
				self._textureImage,
				cell.x * self._cellWidth,
				cell.y * self._cellHeight,
				self._cellWidth,
				self._cellHeight,
				i * self._cellWidth,
				0,
				self._cellWidth,
				self._cellHeight
			);
		}
		
		// Loop the available cells and draw them
		if (self._textureImage) {
			for (y = 0; y < self._textureImage.height; y += self._cellHeight) {
				for (x = 0; x < self._textureImage.width; x += self._cellWidth) {
					cellsCtx.drawImage(
						self._textureImage,
						parseInt(x) * self._cellWidth,
						parseInt(y) * self._cellHeight
					);
				}
			}
		}
		
		// Render the animation frame on the output canvas
		if (self._animationEntity && self._animationEntity.animation.defined('editorAnim')) {
			self._animationEntity.animation._update.apply(self._animationEntity, [null, self._tickDelta]);
			cellIndex = self._animationEntity.cell();
			
			cell = self.cellFromIndex(cellIndex);
			
			outputCtx.save();
			outputCtx.translate(
				Math.floor((self._outputCanvas[0].width / 2) - (self._cellWidth / 2)),
				Math.floor((self._outputCanvas[0].height / 2) - (self._cellHeight / 2))
			);
			outputCtx.drawImage(
				self._textureImage,
				cell.x * self._cellWidth,
				cell.y * self._cellHeight,
				self._cellWidth,
				self._cellHeight,
				0,
				0,
				self._cellWidth,
				self._cellHeight
			);
			outputCtx.restore();
		}
		
		if (!noGrid) {
			cellWidth = self._cellWidth;
			cellHeight = self._cellHeight;
			
			// Draw highlighted cell
			cell = self._framesHighlightCell;
			
			if (cell) {
				framesCtx.fillStyle = 'rgba(0, 0 , 0, 0.2)';
				framesCtx.fillRect(cell.x * cellWidth, cell.y * cellHeight, cellWidth, cellHeight);
			}
			
			// Draw cell grid
			if (cellWidth > 0 && cellHeight > 0) {
				framesCtx.strokeStyle = '#4affff';
				for (x = 0; x < self._framesCanvas[0].width; x += cellWidth) {
					framesCtx.beginPath();
					framesCtx.moveTo(x, 0);
					framesCtx.lineTo(x, cellHeight);
					framesCtx.stroke();
				}
				
				for (y = 0; y < cellHeight * 2; y += cellHeight) {
					framesCtx.beginPath();
					framesCtx.moveTo(0, y);
					framesCtx.lineTo(self._framesCanvas[0].width, y);
					framesCtx.stroke();
				}
			}
			
			// Draw highlighted cell
			cell = self._cellsHighlightCell;
			
			if (cell) {
				cellsCtx.fillStyle = 'rgba(0, 0 , 0, 0.2)';
				cellsCtx.fillRect(cell.x * cellWidth, cell.y * cellHeight, cellWidth, cellHeight);
			}
			
			// Draw cell grid
			if (cellWidth > 0 && cellHeight > 0 && self._textureImage) {
				cellsCtx.strokeStyle = '#4affff';
				for (x = 0; x <= self._textureImage.width; x += cellWidth) {
					cellsCtx.beginPath();
					cellsCtx.moveTo(x, 0);
					cellsCtx.lineTo(x, self._textureImage.height);
					cellsCtx.stroke();
				}
				
				for (y = 0; y <= self._textureImage.height; y += cellHeight) {
					cellsCtx.beginPath();
					cellsCtx.moveTo(0, y);
					cellsCtx.lineTo(self._textureImage.width, y);
					cellsCtx.stroke();
				}
			}
		}
	},
	
	destroy: function () {
		var self = this;
		
		self._animationEntity.animation.stop();
		self._animationEntity.animation.remove('editorAnim');
		self._animationEntity.destroy();
		
		delete self._animationEntity;
	}
});

// Init
ige.editor.ui.animationEditor = new UiAnimationEditor();