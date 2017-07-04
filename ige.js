(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
"use strict";

var appCore = _dereq_('irrelon-appcore');

appCore.module('IgeCuboidSmartTexture', function () {
	var IgeCuboidSmartTexture = {
		render: function (ctx, entity) {
			var poly = entity.localIsoBoundsPoly();
			
			ctx.strokeStyle = '#a200ff';
			
			poly.render(ctx);
		}
	};
	
	return IgeCuboidSmartTexture;
});
},{"irrelon-appcore":67}],2:[function(_dereq_,module,exports){
"use strict";

var appCore = _dereq_('irrelon-appcore');

appCore.module('IgeFontSmartTexture', function () {
	/**
	 * Provides native canvas font rendering supporting multi-line
	 * text and alignment options.
	 */
	var IgeFontSmartTexture = {
		measureTextWidth: function (text, entity) {
			if (entity._nativeFont) {
				var lineArr = [],
					lineIndex,
					measuredWidth,
					maxWidth = 0,
					canvas = document.createElement('canvas'),
					ctx = canvas.getContext('2d');
				
				// Handle multi-line text
				if (text.indexOf('\n') > -1) {
					// Split each line into an array item
					lineArr = text.split('\n');
				} else {
					// Store the text as a single line
					lineArr.push(text);
				}
				
				ctx.font = entity._nativeFont;
				ctx.textBaseline = 'middle';
				
				if (entity._nativeStroke) {
					ctx.lineWidth = entity._nativeStroke;
					
					if (entity._nativeStrokeColor) {
						ctx.strokeStyle = entity._nativeStrokeColor;
					} else {
						ctx.strokeStyle = entity._colorOverlay;
					}
				}
				
				for (lineIndex = 0; lineIndex < lineArr.length; lineIndex++) {
					// Measure text
					measuredWidth = ctx.measureText(lineArr[lineIndex]).width;
					
					if (measuredWidth > maxWidth) {
						maxWidth = measuredWidth;
					}
				}
				
				return maxWidth;
			}
			
			return -1;
		},
		
		render: function (ctx, entity) {
			if (entity._nativeFont && entity._renderText) {
				var text = entity._renderText,
					lineArr = [],
					textSize,
					renderStartY,
					renderY,
					lineHeight,
					i;
				
				ctx.font = entity._nativeFont;
				ctx.textBaseline = 'middle';
				
				if (entity._colorOverlay) {
					ctx.fillStyle = entity._colorOverlay;
				}
				
				// Text alignment
				if (entity._textAlignX === 0) {
					ctx.textAlign = 'left';
					ctx.translate(-entity._bounds2d.x2, 0);
				}
				
				if (entity._textAlignX === 1) {
					ctx.textAlign = 'center';
					//ctx.translate(-entity._bounds2d.x2, 0);
				}
				
				if (entity._textAlignX === 2) {
					ctx.textAlign = 'right';
					ctx.translate(entity._bounds2d.x2, 0);
				}
				
				if (entity._nativeStroke) {
					ctx.lineWidth = entity._nativeStroke;
					
					if (entity._nativeStrokeColor) {
						ctx.strokeStyle = entity._nativeStrokeColor;
					} else {
						ctx.strokeStyle = entity._colorOverlay;
					}
				}
				
				// Handle multi-line text
				if (text.indexOf('\n') > -1) {
					// Split each line into an array item
					lineArr = text.split('\n');
				} else {
					// Store the text as a single line
					lineArr.push(text);
				}
				
				lineHeight = Math.floor(entity._bounds2d.y / lineArr.length);
				renderStartY = -((lineHeight + (entity._textLineSpacing)) / 2) * (lineArr.length - 1);
				
				for (i = 0; i < lineArr.length; i++) {
					renderY = renderStartY + (lineHeight * i) + (entity._textLineSpacing * (i));
					
					// Measure text
					textSize = ctx.measureText(lineArr[i]);
					
					// Check if we should stroke the text too
					if (entity._nativeStroke) {
						ctx.strokeText(lineArr[i], 0, renderY);
					}
					
					// Draw text
					ctx.fillText(lineArr[i], 0, renderY);
				}
			}
		}
	};
	
	return IgeFontSmartTexture;
});
},{"irrelon-appcore":67}],3:[function(_dereq_,module,exports){
"use strict";

var appCore = _dereq_('irrelon-appcore');

appCore.module('IgeTileMap2dSmartTexture', function (IgePoint2d) {
	var IgeTileMap2dSmartTexture = {
		render: function (ctx, entity) {
			var tileWidth = entity._tileWidth,
				tileHeight = entity._tileHeight,
				bounds2d = entity.bounds2d(),
				gridSize = entity._gridSize,
				x = 0, y = 0;
			
			/*ctx.save();
			 var triggerPoly = entity.tileMapHitPolygon();
			 
			 ctx.strokeStyle = '#00ff00';
			 ctx.fillStyle = '#ff99f4';
			 
			 if (entity._processTriggerHitTests()) {
			 ctx.fillStyle = '#ff26e8';
			 }
			 
			 if (entity._mountMode === 0) {
			 ctx.translate(bounds2d.x2, bounds2d.y2);
			 }
			 
			 if (entity._mountMode === 1) {
			 ctx.translate(-entity._translate.x, -entity._translate.y);
			 triggerPoly.render(ctx, true);
			 }
			 
			 //
			 ctx.restore();*/
			
			if (entity._drawGrid) {
				ctx.strokeStyle = entity._gridColor;
				var gridMaxX = x + tileWidth * gridSize.x,
					gridMaxY = y + tileHeight * gridSize.y,
					index,
					gStart,
					gEnd;
				
				x = 0;
				y = 0;
				
				for (index = 0; index <= gridSize.y; index++) {
					gStart = new IgePoint2d(x, y + (tileHeight * index));
					gEnd = new IgePoint2d(gridMaxX, y + (tileHeight * index));
					
					if (entity._mountMode === 1) {
						// Iso grid
						gStart = gStart.toIso();
						gEnd = gEnd.toIso();
					}
					
					ctx.beginPath();
					ctx.moveTo(gStart.x, gStart.y);
					ctx.lineTo(gEnd.x, gEnd.y);
					ctx.stroke();
				}
				
				for (index = 0; index <= gridSize.x; index++) {
					gStart = new IgePoint2d(x + (tileWidth * index), y);
					gEnd = new IgePoint2d(x + (tileWidth * index), gridMaxY);
					
					if (entity._mountMode === 1) {
						// Iso grid
						gStart = gStart.toIso();
						gEnd = gEnd.toIso();
					}
					
					ctx.beginPath();
					ctx.moveTo(gStart.x, gStart.y);
					ctx.lineTo(gEnd.x, gEnd.y);
					ctx.stroke();
				}
			}
			
			if (entity._highlightOccupied) {
				ctx.fillStyle = '#ff0000';
				for (y in entity.map._mapData) {
					if (entity.map._mapData[y]) {
						for (x in entity.map._mapData[y]) {
							if (entity.map._mapData[y][x]) {
								// Tile is occupied
								tilePoint = new IgePoint2d(tileWidth * x, tileHeight * y);
								
								// TODO: Abstract out the tile drawing method so that it can be overridden for other projections etc
								if (entity._mountMode === 0) {
									// 2d
									ctx.fillRect(
										tilePoint.x,
										tilePoint.y,
										tileWidth,
										tileHeight
									);
								}
								
								if (entity._mountMode === 1) {
									// iso
									tilePoint.thisToIso();
									
									ctx.beginPath();
									ctx.moveTo(tilePoint.x, tilePoint.y);
									ctx.lineTo(tilePoint.x + tileWidth, tilePoint.y + tileHeight / 2);
									ctx.lineTo(tilePoint.x, tilePoint.y + tileHeight);
									ctx.lineTo(tilePoint.x - tileWidth, tilePoint.y + tileHeight / 2);
									ctx.lineTo(tilePoint.x, tilePoint.y);
									ctx.fill();
								}
							}
						}
					}
				}
			}
			
			if (entity._highlightTileRect) {
				ctx.fillStyle = '#e4ff00';
				for (y = entity._highlightTileRect.y; y < entity._highlightTileRect.y + entity._highlightTileRect.height; y++) {
					for (x = entity._highlightTileRect.x; x < entity._highlightTileRect.x + entity._highlightTileRect.width; x++) {
						// Tile is occupied
						tilePoint = new IgePoint2d(tileWidth * x, tileHeight * y);
						
						// TODO: Abstract out the tile drawing method so that it can be overridden for other projections etc
						if (entity._mountMode === 0) {
							// 2d
							ctx.fillRect(
								tilePoint.x,
								tilePoint.y,
								tileWidth,
								tileHeight
							);
						}
						
						if (entity._mountMode === 1) {
							// iso
							tilePoint.thisToIso();
							
							ctx.beginPath();
							ctx.moveTo(tilePoint.x, tilePoint.y - tileHeight / 2);
							ctx.lineTo(tilePoint.x + tileWidth, tilePoint.y);
							ctx.lineTo(tilePoint.x, tilePoint.y + tileHeight / 2);
							ctx.lineTo(tilePoint.x - tileWidth, tilePoint.y);
							ctx.lineTo(tilePoint.x, tilePoint.y - tileHeight / 2);
							ctx.fill();
						}
					}
				}
			}
			
			if (entity._drawMouse) {
				// Get mouse position
				var mousePos = entity.mousePos(),
					mouseTile = entity.mouseToTile(),
					tilePoint,
					text,
					textMeasurement;
				
				if (mouseTile.x >= 0 && mouseTile.y >= 0 && mouseTile.x < gridSize.x && mouseTile.y < gridSize.y) {
					// Paint the tile the mouse is currently intersecting
					ctx.fillStyle = entity._hoverColor || '#6000ff';
					if (entity._mountMode === 0) {
						// 2d
						ctx.fillRect(
							(mouseTile.x * tileWidth),
							(mouseTile.y * tileHeight),
							tileWidth,
							tileHeight
						);
					}
					
					if (entity._mountMode === 1) {
						// iso
						tilePoint = mouseTile
							.clone()
							.thisMultiply(tileWidth, tileHeight, 0)
							.thisToIso();
						
						tilePoint.y += tileHeight / 2;
						
						ctx.beginPath();
						ctx.moveTo(tilePoint.x, tilePoint.y - tileHeight / 2);
						ctx.lineTo(tilePoint.x + tileWidth, tilePoint.y);
						ctx.lineTo(tilePoint.x, tilePoint.y + tileHeight / 2);
						ctx.lineTo(tilePoint.x - tileWidth, tilePoint.y);
						ctx.lineTo(tilePoint.x, tilePoint.y - tileHeight / 2);
						ctx.fill();
					}
					
					if (entity._drawMouseData) {
						text = 'Tile X: ' + mouseTile.x + ' Y: ' + mouseTile.y;
						textMeasurement = ctx.measureText(text);
						ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
						ctx.fillRect(Math.floor(mousePos.x - textMeasurement.width / 2 - 5), Math.floor(mousePos.y - 40), Math.floor(textMeasurement.width + 10), 14);
						ctx.fillStyle = '#ffffff';
						ctx.fillText(text, Math.floor(mousePos.x - textMeasurement.width / 2), Math.floor(mousePos.y - 30));
					}
				}
			}
		}
	};
	
	return IgeTileMap2dSmartTexture;
});
},{"irrelon-appcore":67}],4:[function(_dereq_,module,exports){
"use strict";

var appCore = _dereq_('irrelon-appcore');

appCore.module('IgeAnimationComponent', function (IgeEventingClass) {
	/**
	 * The animation component class. Handles defining and controlling
	 * frame-based animations based on cells from a texture.
	 * @event started - The animation starts.
	 * @event stopped - The animation ends or is stopped.
	 * @event loopComplete - The animation has completed a full cycle (shown all frames).
	 * @event complete - The animation has completed all assigned loop cycles.
	 */
	var IgeAnimationComponent = IgeEventingClass.extend({
		classId: 'IgeAnimationComponent',
		componentId: 'animation',
		
		/**
		 * @constructor
		 * @param {Object} entity The parent object that this component is being added to.
		 * @param {Object=} options An optional object that is passed to the component when it is being initialised.
		 */
		init: function (entity, options) {
			this._entity = entity;
			this._anims = {};
			
			// Add the animation behaviour to the entity
			entity.addBehaviour('tween', this._update);
		},
		
		/**
		 * Defines an animation specifying the frames to use, the
		 * frames per second to animate at and if the animation
		 * should loop and if so, how many times.
		 * @param {String} id The unique animation id.
		 * @param {Array} frames An array of cell numbers to animate through.
		 * @param {Number} fps The speed of the animation (frames per second).
		 * @param {Number} loop The number of times to loop the animation, or -1 to loop forever. Defaults to -1.
		 * @param {Boolean} convertIdsToIndex If true will convert cell ids to cell indexes to speed
		 * up animation processing. This is true by default but should be disabled if you intend to
		 * change the assigned texture of the entity that this animation is applied to after you have
		 * defined the animation since the frame indexes will likely map to incorrect cells on a
		 * different texture.
		 * @example #Define an animation
		 *     // Create an entity, add the animation component and define
		 *     // an animation using frames 1, 2, 3 and 4, with an FPS of
		 *     // 25 and looping forever (-1)
		 *     var entity = new IgeEntity()
		 *         .addComponent(IgeAnimationComponent)
		 *         .animation.define('anim1', [1, 2, 3, 4], 25, -1);
		 * @return {*}
		 */
		define: function (id, frames, fps, loop, convertIdsToIndex) {
			if (frames && frames.length) {
				var i, frame;
				this._anims.length = this._anims.length || 0;
				
				if (convertIdsToIndex === undefined) {
					convertIdsToIndex = true; // Default the flag to true if undefined
				}
				
				if (convertIdsToIndex) {
					// Check each frame for string values
					for (i = 0; i < frames.length; i++) {
						frame = frames[i];
						
						if (typeof(frame) === 'string') {
							if (this._entity._texture) {
								// The frame has a cell id so convert to an index
								frame = this._entity._texture.cellIdToIndex(frame);
								frames[i] = frame;
							} else {
								this.log('You can increase the performance of id-based cell animations by specifying the animation.define AFTER you have assigned your sprite sheet to the entity on entity with ID: ' + this._entity.id(), 'warning');
								break;
							}
						}
					}
				}
				
				// Store the animation
				var frameTime = ((1000 / fps)|0);
				this._anims[id] = {
					frames: frames,
					frameTime: frameTime,
					loop: loop !== undefined ? loop : -1, // Default to infinite loop (-1)
					frameCount: frames.length,
					totalTime: frames.length * frameTime,
					currentDelta: 0,
					currentLoop: 0
				};
				
				this._anims.length++;
			} else {
				this.log('Cannot define an animation without a frame array!', 'error');
			}
			return this._entity;
		},
		
		addFrame: function (id, frameId) {
			if (this._anims[id]) {
				var anim = this._anims[id];
				
				if (typeof(frameId) === 'string') {
					frameId = this._entity._texture.cellIdToIndex(frameId);
				}
				
				anim.frames.push(frameId);
				anim.frameCount++;
				anim.totalTime = anim.frames.length * anim.frameTime;
			}
		},
		
		removeFrame: function (id, frameIndex) {
			if (this._anims[id]) {
				var anim = this._anims[id];
				
				anim.frames.splice(frameIndex, 1);
				anim.frameCount--;
				anim.totalTime = anim.frames.length * anim.frameTime;
			}
		},
		
		/**
		 * Creates an array of frames starting at the "from" and ending at the "to"
		 * parameters. Useful for creating linear frame lists instead of having to
		 * specifiy each frame in between the from and to frame numbers.
		 * @param {Integer} from The frame to start at.
		 * @param {Integer} to The frame to end at.
		 * @returns {Array} The frame array.
		 */
		generateFrameArray: function (from, to) {
			var arr = [];
			
			while (from < to) {
				arr.push(from);
				from++;
			}
			
			return arr;
		},
		
		/**
		 * Removes a previously defined animation from the entity.
		 * @param {String} id The id of the animation to remove.
		 * @returns {*}
		 */
		remove: function (id) {
			delete this._anims[id];
			this._anims.length--;
			
			return this._entity;
		},
		
		/**
		 * Returns true if the specified animation has been defined.
		 * @param {String} id The id of the animation to check for.
		 * @returns {Boolean} True if the animation has been defined.
		 */
		defined: function (id) {
			return Boolean(this._anims[id]);
		},
		
		/**
		 * Sets the specified animation's FPS.
		 * @param {String} id The ID of the animation to alter the FPS for.
		 * @param {Number=} fps The number of frames per second the animation
		 * should play at.
		 * @example #Set the specified animation's FPS
		 *     // Create an entity, add the animation component and define
		 *     // an animation with an FPS of 25
		 *     var entity = new IgeEntity()
		 *         .addComponent(IgeAnimationComponent)
		 *         .animation.define('anim1', [1, 2, 3, 4], 25, -1);
		 *
		 *     // Change the FPS to 12
		 *     entity.animation.setFps('anim1', 12);
		 * @return {*}
		 */
		setFps: function (id, fps) {
			if (this._anims) {
				var anim = this._anims[id];
				
				if (anim) {
					anim.frameTime = ((1000 / fps)|0);
					anim.totalTime = anim.frameCount * anim.frameTime;
				}
			}
			
			return this._entity;
		},
		
		/**
		 * Sets all the animations assigned to an entity to the specified FPS.
		 * @param {Number=} fps The number of frames per second the animations
		 * should play at.
		 * @example #Set all entity animations to specified FPS
		 *     // Create an entity, add the animation component and define
		 *     // a couple of animations with an FPS of 25
		 *     var entity = new IgeEntity()
		 *         .addComponent(IgeAnimationComponent)
		 *         .animation.define('anim1', [1, 2, 3, 4], 25, -1);
		 *         .animation.define('anim2', [5, 6, 7, 8], 25, -1);
		 *
		 *     // Change the FPS of all animations to 12
		 *     entity.animation.setAllFps(12);
		 * @return {*}
		 */
		setAllFps: function (fps) {
			var id;
			
			if (this._anims) {
				for (id in this._anims) {
					if (this._anims.hasOwnProperty(id)) {
						this.setFps(id, fps);
					}
				}
			}
			
			return this._entity;
		},
		
		/**
		 * Checks the current animation state, either started
		 * or stopped.
		 * @return {Boolean} True if an animation is currently playing
		 * or false if not.
		 */
		playing: function () {
			return this._playing;
		},
		
		/**
		 * Starts an animation from the beginning frame.
		 * @param {String} animId The id of the animation to start.
		 * @param {Object=} options An object with some option properties.
		 * @example #Start an animation
		 *     // Create an entity, add the animation component, define
		 *     // an animation and then start it
		 *     var entity = new IgeEntity()
		 *         .addComponent(IgeAnimationComponent)
		 *         .animation.define('anim1', [1, 2, 3, 4], 25, -1);
		 *
		 *     entity.animation.start('anim1');
		 *
		 * @example #Start an animation with callbacks for animation events
		 *     // Create an entity, add the animation component, define
		 *     // an animation and then start it
		 *     var entity = new IgeEntity()
		 *         .addComponent(IgeAnimationComponent)
		 *         .animation.define('anim1', [1, 2, 3, 4], 25, -1);
		 *
		 *     // In each animation callback...
		 *     // this = the entity's animation component instance
		 *     // anim = the animation component's _anim object
		 *     // this._entity = the entity the animation is attached to
		 *
		 *     entity.animation.start('anim1', {
	 *     		onLoop: function (anim) {
	 *     			console.log('Animation looped', this, anim);	
	 *     		},
	 *     		onStopped: function (anim) {
	 *     			console.log('Animation stopped', this, anim);	
	 *     		},
	 *     		onComplete: function (anim) {
	 *     			console.log('Animation completed', this, anim);	
	 *     		}
	 *     });
		 *
		 * @example #Start an animation with callbacks for animation events via event listeners
		 *     // Create an entity, add the animation component, define
		 *     // an animation and then start it
		 *     var entity = new IgeEntity()
		 *         .addComponent(IgeAnimationComponent)
		 *         .animation.define('anim1', [1, 2, 3, 4], 25, -1);
		 *
		 *     // In each animation callback...
		 *     // this = the entity's animation component instance
		 *     // anim = the animation component's _anim object
		 *     // this._entity = the entity the animation is attached to
		 *
		 *     entity.animation.on('started', function (anim) {
	 *     		console.log('Animation started', this, anim);	
	 *     });
		 *
		 *     entity.animation.on('loopComplete', function (anim) {
	 *     		console.log('Animation looped', this, anim);	
	 *     });
		 *
		 *     entity.animation.on('stopped', function (anim) {
	 *     		console.log('Animation stopped', this, anim);	
	 *     });
		 *
		 *     entity.animation.on('complete', function (anim) {
	 *     		console.log('Animation complete', this, anim);	
	 *     });
		 *
		 *     entity.animation.start('anim1');
		 * @return {*}
		 */
		start: function (animId, options) {
			if (this._anims) {
				var anim = this._anims[animId];
				
				if (anim) {
					anim.currentDelta = 0;
					anim.currentLoop = 0;
					anim.startTime = ige._currentTime;
					
					this._anim = anim;
					this._animId = animId;
					
					// Check for any callbacks in the options object
					if (options !== undefined) {
						this._completeCallback = options.onComplete;
						this._loopCallback = options.onLoop;
						this._stoppedCallback = options.onStopped;
					}
					
					this._playing = true;
					
					this.emit('started', anim);
				} else {
					this.log('Cannot set animation to "' + animId + '" because the animation does not exist!', 'warning');
				}
			} else {
				this.log('Cannot set animation to "' + animId + '" because no animations have been defined with defineAnim(...);', 'warning');
			}
			
			return this._entity;
		},
		
		/**
		 * Starts an animation only if the passed animation is not already
		 * started.
		 * @param {String} animId The id of the animation to start.
		 * @param {Object=} options An object with some option properties.
		 * @example #Select an animation
		 *     // Create an entity, add the animation component, define
		 *     // an animation and then select it
		 *     var entity = new IgeEntity()
		 *         .addComponent(IgeAnimationComponent)
		 *         .animation.define('anim1', [1, 2, 3, 4], 25, -1);
		 *
		 *     entity.animation.select('anim1');
		 *
		 *     // Selecting the same animation twice will NOT reset the
		 *     // animation because it is already playing. This is how
		 *     // select() differs from start()
		 *     entity.animation.select('anim1');
		 * @return {*}
		 */
		select: function (animId, options) {
			if (this._animId !== animId) {
				this.start(animId, options);
			}
			
			return this._entity;
		},
		
		/**
		 * Stops the current animation.
		 * @example #Stop the current animation
		 *     entity.animation.stop();
		 * @return {*}
		 */
		stop: function () {
			if (this._stoppedCallback) {
				this._stoppedCallback.call(this, this._anim);
			}
			
			this.emit('stopped', this._anim);
			
			this._playing = false;
			
			delete this._anim;
			delete this._animId;
			
			delete this._completeCallback;
			delete this._loopCallback;
			delete this._stoppedCallback;
			
			return this._entity;
		},
		
		/**
		 * Handles the animation processing each update.
		 * @param {CanvasRenderingContext2D} ctx The rendering context to use when doing draw operations.
		 * @param {Number} tickDelta The current ige._tickDelta passed down the scenegraph.
		 */
		_update: function (ctx, tickDelta) {
			var self = this.animation;
			
			// Just in case someone forgets to pass it in their update call!
			tickDelta = tickDelta || ige._tickDelta;
			
			if (self._anim) {
				var anim = self._anim,
					multiple,
					cell,
					frame;
				
				// Advance the internal animation timer
				anim.currentDelta += tickDelta;
				
				// Check if the animation timer is greater than the total animation time
				if (anim.currentDelta > anim.totalTime) {
					// Check if we have a single loop animation
					if (!anim.loop) {
						if (self._completeCallback) {
							self._completeCallback.call(self, anim);
						}
						self.emit('complete', anim);
						self.stop();
					} else {
						// Check if we have an infinite loop
						if (anim.loop === -1) {
							// Loop back round to the beginning
							multiple = anim.currentDelta / anim.totalTime;
							if (Math.abs(multiple) > 1) {
								anim.currentDelta -= ((multiple|0) * anim.totalTime); // Bitwise floor
							}
							
							if (self._loopCallback) {
								self._loopCallback.call(self, anim);
							}
							self.emit('loopComplete', anim);
						} else {
							anim.currentLoop++;
							if (anim.loop > 0 && anim.currentLoop <= anim.loop) {
								// Loop back round to the beginning
								multiple = anim.currentDelta / anim.totalTime;
								if (Math.abs(multiple) > 1) {
									anim.currentDelta -= ((multiple|0) * anim.totalTime); // Bitwise floor
								}
								
								if (self._loopCallback) {
									self._loopCallback.call(self, anim);
								}
								self.emit('loopComplete', anim);
							} else {
								// The animation has ended
								if (self._completeCallback) {
									self._completeCallback.call(self, anim);
								}
								self.emit('complete', anim);
								self.stop();
							}
						}
					}
				}
				
				frame = ((anim.currentDelta / anim.frameTime)|0);
				
				if (frame >= anim.frameCount) {
					frame = anim.frameCount - 1;
				}
				
				cell = anim.frames[frame];
				
				// Set the current frame
				if (typeof(cell) === 'string') {
					self._entity.cellById(cell);
				} else {
					self._entity.cell(cell);
				}
			}
		}
	});
	
	return IgeAnimationComponent;
});
},{"irrelon-appcore":67}],5:[function(_dereq_,module,exports){
"use strict";

var appCore = _dereq_('irrelon-appcore');

appCore.module('IgeEntityManagerComponent', function (IgeClass, IgePoint3d, IgeRect) {
	var IgeEntityManagerComponent = IgeClass.extend({
		classId: 'IgeEntityManagerComponent',
		componentId: 'entityManager',
		
		/**
		 * @constructor
		 * @param {Object} entity The parent object that this component is being added to.
		 * @param {Object=} options An optional object that is passed to the component when it is being initialised.
		 */
		init: function (entity, options) {
			this._entity = entity;
			this._options = options;
			
			// Check we are being added to a tile map
			if (!this._entity.pointToTile) {
				this.log('Warning, IgeEntityManagerComponent is only meant to be added to a tile map!', 'warning');
			}
			
			this._maps = [];
			this._overwatchMode = 0;
			this._removeMode = 0;
			this._createArr = [];
			this._removeArr = [];
			
			entity.addBehaviour('entityManager', this._behaviour);
		},
		
		/**
		 * Adds a map that will be used to read data and convert
		 * to entities as the visible map area is moved.
		 * @param {IgeTileMap2d=} map
		 * @return {*}
		 */
		addMap: function (map) {
			if (map !== undefined) {
				this._maps.push(map);
			}
			
			return this._entity;
		},
		
		/**
		 * Gets / sets the boolean flag determining if the entity
		 * manager is enabled or not.
		 * @param {Boolean=} val
		 * @return {*}
		 */
		active: function (val) {
			if (val !== undefined) {
				this._active = val;
				return this._entity;
			}
			
			return this._active;
		},
		
		/**
		 * Gets / sets the number of entities the entity manager can
		 * create per tick. If the number of entities that need to be
		 * created is greater than this number they will be queued
		 * and processed on the next tick.
		 * @param val
		 * @return {*}
		 */
		maxCreatePerTick: function (val) {
			if (val !== undefined) {
				this._maxCreatePerTick = val;
				return this._entity;
			}
			
			return this._maxCreatePerTick;
		},
		
		/**
		 * Gets / sets the number of entities the entity manager can
		 * remove per tick. If the number of entities that need to be
		 * removed is greater than this number they will be queued
		 * and processed on the next tick.
		 * @param val
		 * @return {*}
		 */
		maxRemovePerTick: function (val) {
			if (val !== undefined) {
				this._maxRemovePerTick = val;
				return this._entity;
			}
			
			return this._maxRemovePerTick;
		},
		
		/**
		 * Gets / sets the overwatch mode for the entity manager. This
		 * is the mode that the manager will use when monitoring the
		 * entities under it's control to determine if any should be
		 * removed or not.
		 * @param {Number=} val Overwatch mode, defaults to 0.
		 * @return {*}
		 */
		overwatchMode: function (val) {
			if (val !== undefined) {
				this._overwatchMode = val;
				return this._entity;
			}
			
			return this._overwatchMode;
		},
		
		/**
		 * Adds a callback method that is called before an entity is
		 * created and asks the callback to return true if the entity
		 * should be allowed to be created, or false if not.
		 * @param {Function=} val The callback method.
		 * @return {*}
		 */
		createCheck: function (val) {
			if (val !== undefined) {
				this._createCheck = val;
				return this._entity;
			}
			
			return this._createCheck;
		},
		
		/**
		 * Adds a callback method that is called to allow you to execute
		 * the required code to create the desired entity from the map
		 * data you are being passed.
		 * @param {Function=} val The callback method.
		 * @return {*}
		 */
		createEntityFromMapData: function (val) {
			if (val !== undefined) {
				this._createEntityFromMapData = val;
				return this._entity;
			}
			
			return this._createEntityFromMapData;
		},
		
		/**
		 * Adds a callback method that is called before an entity is removed
		 * and if the callback returns true then the entity will be removed
		 * or if false, will not.
		 * @param {Function=} val The callback method.
		 * @return {*}
		 */
		removeCheck: function (val) {
			if (val !== undefined) {
				this._removeCheck = val;
				return this._entity;
			}
			
			return this._removeCheck;
		},
		
		/**
		 * Get / sets the entity that will be used to determine the
		 * center point of the area to manage. This allows the
		 * area to become dynamic based on this entity's position.
		 * @param entity
		 * @return {*}
		 */
		trackTranslate: function (entity) {
			if (entity !== undefined) {
				this._trackTranslateTarget = entity;
				return this;
			}
			
			return this._trackTranslateTarget;
		},
		
		/**
		 * Stops tracking the current tracking target's translation.
		 */
		unTrackTranslate: function () {
			delete this._trackTranslateTarget;
		},
		
		/**
		 * Gets / sets the center position of the management area.
		 * @param {Number=} x
		 * @param {Number=} y
		 * @return {*}
		 */
		areaCenter: function (x, y) {
			if (x !== undefined && y !== undefined) {
				// Adjust the passed x, y to account for this
				// texture map's translation
				var ent = this._entity,
					offset;
				
				if (ent._mode === 0) {
					// 2d mode
					offset = ent._translate;
				}
				
				if (ent._mode === 1) {
					// Iso mode
					offset = ent._translate.toIso();
				}
				
				x -= offset.x;
				y -= offset.y;
				
				this._areaCenter = new IgePoint3d(x, y, 0);
				return this._entity;
			}
			
			return this._areaCenter;
		},
		
		/**
		 * Gets / sets the area rectangle of the management area where
		 * entities outside this area are considered for removal and map
		 * data that falls inside this area is considered for entity
		 * creation.
		 * @param {Number=} x
		 * @param {Number=} y
		 * @param {Number=} width
		 * @param {Number=} height
		 * @return {*}
		 */
		areaRect: function (x, y, width, height) {
			if (x !== undefined && y !== undefined && width !== undefined && height !== undefined) {
				this._areaRect = new IgeRect(x, y, width, height);
				return this._entity;
			}
			
			return this._areaRect;
		},
		
		areaRectAutoSize: function (val, options) {
			if (val !== undefined) {
				this._areaRectAutoSize = val;
				this._areaRectAutoSizeOptions = options;
				return this._entity;
			}
			
			return this._areaRectAutoSize;
		},
		
		/**
		 * Returns the current management area.
		 * @return {IgeRect}
		 */
		currentArea: function () {
			var entTranslate;
			
			// Check if we are tracking an entity that is used to
			// set the center point of the area
			if (this._trackTranslateTarget) {
				// Calculate which tile our character is currently "over"
				if (this._trackTranslateTarget.isometric() === true) {
					entTranslate = this._trackTranslateTarget._translate.toIso();
				} else {
					entTranslate = this._trackTranslateTarget._translate;
				}
				
				this.areaCenter(entTranslate.x, entTranslate.y);
			}
			
			var areaRect = this._areaRect,
				areaCenter = this._areaCenter;
			
			if (areaRect && areaCenter) {
				return new IgeRect(Math.floor(areaRect.x + areaCenter.x), Math.floor(areaRect.y + areaCenter.y), Math.floor(areaRect.width), Math.floor(areaRect.height));
			} else {
				return new IgeRect(0, 0, 0, 0);
			}
		},
		
		/**
		 * Gets / sets the mode that entities will be removed with.
		 * If set to 0 (default) the entities will be removed via a
		 * call to their destroy() method. If set to 1, entities will
		 * be unmounted via a call to unMount(). This means that their
		 * associated box2d bodies will not be removed from the
		 * simulation if in mode 1.
		 * @param val
		 * @return {*}
		 */
		removeMode: function (val) {
			if (val !== undefined) {
				this._removeMode = val;
				return this._entity;
			}
			
			return this._removeMode;
		},
		
		/**
		 * The behaviour method executed each tick.
		 * @param ctx
		 * @private
		 */
		_behaviour: function (ctx) {
			var self = this.entityManager,
				currentArea,
				currentAreaTiles,
				arr = this._children,
				arrCount = arr.length,
				item,
				maps = self._maps,
				map,
				mapIndex,
				mapData,
				currentTile,
				renderX, renderY,
				renderWidth, renderHeight,
				x, y,
				tileData,
				renderSize,
				ratio;
			
			if ((!self._areaRect || ige._resized) && self._areaRectAutoSize) {
				self._resizeEvent();
			}
			
			currentArea = self.currentArea();
			
			if (self._areaCenter && self._areaRect && !currentArea.compare(self._lastArea)) {
				////////////////////////////////////
				// ENTITY REMOVAL CHECKS          //
				////////////////////////////////////
				
				/*// Check if the area metrics have changed
				 if (this._overwatchMode === 0 && (!currentArea.compare(self._lastArea))) {
				 // Overwatch mode is zero so only scan for entities to remove
				 // if the area metrics have changed.
				 }
				 
				 if (self._overwatchMode === 1) {
				 // Actively scan every tick for entities to remove
				 while (arrCount--) {
				 item = arr[arrCount];
				 
				 // Check if the item has an aabb method
				 if (item.aabb) {
				 // Check the entity to see if its bounds are "inside" the
				 // manager's visible area
				 if (!currentArea.intersects(item.aabb())) {
				 // The item is outside the manager's area so
				 // ask the removeCheck callback if we should
				 // remove the entity
				 if (!self._removeCheck || self._removeCheck(item)) {
				 // Queue the entity for removal
				 self._removeArr.push(item);
				 }
				 }
				 }
				 }
				 }*/
				
				currentTile = this.pointToTile(self._areaCenter);
				renderX = currentTile.x;
				renderY = currentTile.y;
				renderWidth = Math.ceil(currentArea.width / this._tileWidth);
				renderHeight = Math.ceil(currentArea.height / this._tileHeight);
				
				currentArea.x -= (this._tileWidth);
				currentArea.y -= (this._tileHeight / 2);
				currentArea.width += (this._tileWidth * 2);
				currentArea.height += (this._tileHeight);
				
				// Check if we are rendering in 2d or isometric mode
				if (this._mountMode === 0) {
					// 2d
					currentAreaTiles = new IgeRect(
						renderX - Math.floor(renderWidth / 2) - 1,
						renderY - Math.floor(renderHeight / 2) - 1,
						renderX + Math.floor(renderWidth / 2) + 1 - (renderX - Math.floor(renderWidth / 2) - 1),
						renderY + Math.floor(renderHeight / 2) + 1 - (renderY - Math.floor(renderHeight / 2) - 1)
					);
				}
				
				if (this._mountMode === 1) {
					// Isometric
					renderSize = Math.abs(renderWidth) > Math.abs(renderHeight) ? renderWidth : renderHeight;
					ratio = 0.6;
					currentAreaTiles = new IgeRect(
						renderX - Math.floor(renderSize * ratio),
						renderY - Math.floor(renderSize * ratio),
						renderX + Math.floor(renderSize * ratio) + 1 - (renderX - Math.floor(renderSize * ratio)),
						renderY + Math.floor(renderSize * ratio) + 1 - (renderY - Math.floor(renderSize * ratio))
					);
				}
				
				// Generate the bounds rectangle
				if (this._drawBounds) {
					ctx.strokeStyle = '#ff0000';
					ctx.strokeRect(currentArea.x, currentArea.y, currentArea.width, currentArea.height);
					
					this._highlightTileRect = currentAreaTiles;
				}
				
				////////////////////////////////////
				// ENTITY REMOVAL CHECKS          //
				////////////////////////////////////
				//this._highlightTileRect = currentAreaTiles;
				
				map = this.map;
				while (arrCount--) {
					item = arr[arrCount];
					
					if (!self._removeCheck || self._removeCheck(item)) {
						if (!currentAreaTiles.intersects(item._occupiedRect)) {
							// The item is outside the manager's area so
							// ask the removeCheck callback if we should
							// remove the entity
							
							// Queue the entity for removal
							self._removeArr.push(item);
						}
					}
				}
				
				////////////////////////////////////
				// ENTITY CREATION CHECKS         //
				////////////////////////////////////
				for (mapIndex in maps) {
					if (maps.hasOwnProperty(mapIndex)) {
						map = maps[mapIndex];
						mapData = map.map._mapData;
						// TODO: This can be optimised further by only checking the area that has changed
						
						for (y = currentAreaTiles.y; y < currentAreaTiles.y + currentAreaTiles.height; y++) {
							if (mapData[y]) {
								for (x = currentAreaTiles.x; x < currentAreaTiles.x + currentAreaTiles.width; x++) {
									// Grab the tile data to paint
									tileData = mapData[y][x];
									
									if (tileData) {
										if (!self._createCheck || self._createCheck(map, x, y, tileData)) {
											// Queue the entity for creation
											self._createArr.push([map, x, y, tileData]);
										}
									}
								}
							}
						}
					}
				}
				
				self._lastArea = currentArea;
				
				// Process the entity queues
				self.processQueues();
			}
		},
		
		processQueues: function () {
			var createArr = this._createArr,
				createCount = createArr.length,
				createLimit = this._maxCreatePerTick !== undefined ? this._maxCreatePerTick : 0,
				createEntityFunc = this._createEntityFromMapData,
				removeArr = this._removeArr,
				removeCount = removeArr.length,
				removeLimit = this._maxRemovePerTick !== undefined ? this._maxRemovePerTick : 0,
				i;
			
			if (createLimit && createCount > createLimit) { createCount = createLimit; }
			if (removeLimit && removeCount > removeLimit) { removeCount = removeLimit; }
			
			// Process remove queue
			for (i = 0; i < removeCount; i++) {
				if (this._removeMode === 0) {
					// Pop the first item off the array and destroy it
					removeArr.shift().destroy();
				}
			}
			
			// Process creation
			for (i = 0; i < createCount; i++) {
				// Pop the first item off the array and pass it as arguments
				// to the entity creation method assigned to this manager
				createEntityFunc.apply(this, createArr.shift());
			}
		},
		
		/**
		 * Handles screen resize events.
		 * @param event
		 * @private
		 */
		_resizeEvent: function (event) {
			// Set width / height of scene to match parent
			if (this._areaRectAutoSize) {
				var geom = this._entity._parent._bounds2d,
					additionX = 0, additionY = 0;
				
				if (this._areaRectAutoSizeOptions) {
					if (this._areaRectAutoSizeOptions.bufferMultiple) {
						additionX = (geom.x * this._areaRectAutoSizeOptions.bufferMultiple.x) - geom.x;
						additionY = (geom.y * this._areaRectAutoSizeOptions.bufferMultiple.y) - geom.y;
					}
					
					if (this._areaRectAutoSizeOptions.bufferPixels) {
						additionX = this._areaRectAutoSizeOptions.bufferPixels.x;
						additionY = this._areaRectAutoSizeOptions.bufferPixels.y;
					}
				}
				
				this.areaRect(-Math.floor((geom.x + additionX) / 2), -Math.floor((geom.y + additionY) / 2), geom.x + additionX, geom.y + additionY);
				
				// Check if caching is enabled
				if (this._caching > 0) {
					this._resizeCacheCanvas();
				}
			}
		}
	});
	
	return IgeEntityManagerComponent;
});
},{"irrelon-appcore":67}],6:[function(_dereq_,module,exports){
"use strict";

var appCore = _dereq_('irrelon-appcore');

appCore.module('IgeGamePadComponent', function (IgeEventingClass) {
	var IgeGamePadComponent = IgeEventingClass.extend({
		classId: 'IgeGamePadComponent',
		componentId: 'gamePad',
		
		init: function (entity, options) {
			var self = this;
			
			this._entity = entity;
			this._options = options;
			this.gamepadAvailable = null;
			
			// A number of typical buttons recognized by Gamepad API and mapped to
			// standard controls. Any extraneous buttons will have larger indexes.
			this.TYPICAL_BUTTON_COUNT = 16;
			
			// A number of typical axes recognized by Gamepad API and mapped to
			// standard controls. Any extraneous buttons will have larger indexes.
			this.TYPICAL_AXIS_COUNT = 4;
			
			// Whether we’re requestAnimationFrameing like it’s 1999.
			this.ticking = false;
			
			// The canonical list of attached gamepads, without “holes” (always
			// starting at [0]) and unified between Firefox and Chrome.
			this.gamepads = [];
			
			// Remembers the connected gamepads at the last check; used in Chrome
			// to figure out when gamepads get connected or disconnected, since no
			// events are fired.
			this.prevRawGamepadTypes = [];
			
			// Previous timestamps for gamepad state; used in Chrome to not bother with
			// analyzing the polled data if nothing changed (timestamp is the same
			// as last time).
			this.prevTimestamps = [];
			
			if (ige.isClient) {
				// As of writing, it seems impossible to detect Gamepad API support
				// in Firefox, hence we need to hardcode it in the third clause.
				// (The preceding two clauses are for Chrome.)
				this.gamepadAvailable = !!navigator.webkitGetGamepads ||
					!!navigator.webkitGamepads ||
					(navigator.userAgent.indexOf('Firefox/') != -1);
				
				if (!this.gamepadAvailable) {
					// It doesn't seem Gamepad API is available – show a message telling
					// the visitor about it.
					this.emit('notSupported');
				} else {
					// Firefox supports the connect/disconnect event, so we attach event
					// handlers to those.
					window.addEventListener('MozGamepadConnected', function () { self.onGamepadConnect.apply(self, arguments); }, false);
					window.addEventListener('MozGamepadDisconnected', function () { self.onGamepadDisconnect.apply(self, arguments); }, false);
					
					// Since Chrome only supports polling, we initiate polling loop straight
					// away. For Firefox, we will only do it if we get a connect event.
					if (!!navigator.webkitGamepads || !!navigator.webkitGetGamepads) {
						this.startPolling();
					}
				}
				
				entity.addBehaviour('gamePadComponent', this._behaviour);
			}
		},
		
		onGamepadConnect: function(event) {
			// Add the new gamepad on the list of gamepads to look after.
			this.gamepads.push(event.gamepad);
			
			// Start the polling loop to monitor button changes.
			this.startPolling();
			
			// Ask the tester to update the screen to show more gamepads.
			this.emit('change');
		},
		
		/**
		 * React to the gamepad being disconnected.
		 */
		onGamepadDisconnect: function(event) {
			// Remove the gamepad from the list of gamepads to monitor.
			for (var i in this.gamepads) {
				if (this.gamepads[i].index == event.gamepad.index) {
					this.gamepads.splice(i, 1);
					break;
				}
			}
			
			// If no gamepads are left, stop the polling loop.
			if (this.gamepads.length == 0) {
				this.stopPolling();
			}
			
			// Ask the tester to update the screen to remove the gamepad.
			this.emit('change');
		},
		
		/**
		 * Starts a polling loop to check for gamepad state.
		 */
		startPolling: function() {
			this.ticking = true;
		},
		
		/**
		 * Stops a polling loop by setting a flag which will prevent the next
		 * requestAnimationFrame() from being scheduled.
		 */
		stopPolling: function() {
			this.ticking = false;
		},
		
		/**
		 * A function called with each requestAnimationFrame(). Polls the gamepad
		 * status and schedules another poll.
		 */
		_behaviour: function() {
			this.gamePad.pollStatus();
		},
		
		/**
		 * Checks for the gamepad status. Monitors the necessary data and notices
		 * the differences from previous state (buttons for Chrome/Firefox,
		 * new connects/disconnects for Chrome). If differences are noticed, asks
		 * to update the display accordingly. Should run as close to 60 frames per
		 * second as possible.
		 */
		pollStatus: function() {
			// Poll to see if gamepads are connected or disconnected. Necessary
			// only on Chrome.
			this.pollGamepads();
			
			for (var i in this.gamepads) {
				var gamepad = this.gamepads[i];
				
				// Don’t do anything if the current timestamp is the same as previous
				// one, which means that the state of the gamepad hasn’t changed.
				// This is only supported by Chrome right now, so the first check
				// makes sure we’re not doing anything if the timestamps are empty
				// or undefined.
				if (gamepad.timestamp && (gamepad.timestamp == this.prevTimestamps[i])) {
					continue;
				}
				this.prevTimestamps[i] = gamepad.timestamp;
			}
		},
		
		// This function is called only on Chrome, which does not yet support
		// connection/disconnection events, but requires you to monitor
		// an array for changes.
		pollGamepads: function() {
			// Get the array of gamepads – the first method (getGamepads)
			// is the most modern one and is supported by Firefox 28+ and
			// Chrome 35+. The second one (webkitGetGamepads) is a deprecated method
			// used by older Chrome builds.
			var rawGamepads =
				(navigator.getGamepads && navigator.getGamepads()) ||
				(navigator.webkitGetGamepads && navigator.webkitGetGamepads());
			
			if (rawGamepads) {
				// We don’t want to use rawGamepads coming straight from the browser,
				// since it can have “holes” (e.g. if you plug two gamepads, and then
				// unplug the first one, the remaining one will be at index [1]).
				this.gamepads = [];
				
				// We only refresh the display when we detect some gamepads are new
				// or removed; we do it by comparing raw gamepad table entries to
				// “undefined.”
				var gamepadsChanged = false;
				
				for (var i = 0; i < rawGamepads.length; i++) {
					if (typeof rawGamepads[i] != this.prevRawGamepadTypes[i]) {
						gamepadsChanged = true;
						this.prevRawGamepadTypes[i] = typeof rawGamepads[i];
					}
					
					if (rawGamepads[i]) {
						this.gamepads.push(rawGamepads[i]);
					}
				}
				
				// Ask the tester to refresh the visual representations of gamepads
				// on the screen.
				if (gamepadsChanged) {
					this.emit('change');
				}
			}
		}
	});
	
	return IgeGamePadComponent;
});
},{"irrelon-appcore":67}],7:[function(_dereq_,module,exports){
"use strict";

var appCore = _dereq_('irrelon-appcore');

appCore.module('IgeInputComponent', function (IgeEventingClass, IgePoint3d) {
	var IgeInputComponent = IgeEventingClass.extend({
		classId: 'IgeInputComponent',
		componentId: 'input',
		
		init: function () {
			// Setup the input objects to hold the current input state
			this._eventQueue = [];
			this._eventControl = {
				_cancelled: false,
				stopPropagation: function () {
					this._cancelled = true;
				}
			};
			
			this.tick();
			
			this.mouse = {
				// Virtual codes
				dblClick: -302,
				down: -301,
				up: -300,
				move: -259,
				wheel: -258,
				wheelUp: -257,
				wheelDown: -256,
				x: -255,
				y: -254,
				button1: -253,
				button2: -252,
				button3: -251
			};
			
			this.pad1 = {
				// Virtual codes
				button1: -250,
				button2: -249,
				button3: -248,
				button4: -247,
				button5: -246,
				button6: -245,
				button7: -244,
				button8: -243,
				button9: -242,
				button10: -241,
				button11: -240,
				button12: -239,
				button13: -238,
				button14: -237,
				button15: -236,
				button16: -235,
				button17: -234,
				button18: -233,
				button19: -232,
				button20: -231,
				stick1: -230,
				stick2: -229,
				stick1Up: -228,
				stick1Down: -227,
				stick1Left: -226,
				stick1Right: -225,
				stick2Up: -224,
				stick2Down: -223,
				stick2Left: -222,
				stick2Right: -221
			};
			
			this.pad2 = {
				// Virtual codes
				button1: -220,
				button2: -219,
				button3: -218,
				button4: -217,
				button5: -216,
				button6: -215,
				button7: -214,
				button8: -213,
				button9: -212,
				button10: -211,
				button11: -210,
				button12: -209,
				button13: -208,
				button14: -207,
				button15: -206,
				button16: -205,
				button17: -204,
				button18: -203,
				button19: -202,
				button20: -201,
				stick1: -200,
				stick2: -199,
				stick1Up: -198,
				stick1Down: -197,
				stick1Left: -196,
				stick1Right: -195,
				stick2Up: -194,
				stick2Down: -193,
				stick2Left: -192,
				stick2Right: -191
			};
			
			// Keycodes from http://www.asciitable.com/
			// and general console.log efforts :)
			this.key = {
				// Virtual codes
				'shift': -3,
				'ctrl': -2,
				'alt': -1,
				// Read codes
				'backspace': 8,
				'tab': 9,
				'enter': 13,
				'escape': 27,
				'space': 32,
				'pageUp': 33,
				'pageDown': 34,
				'end': 35,
				'home': 36,
				'left': 37,
				'up': 38,
				'right': 39,
				'down': 40,
				'insert': 45,
				'del': 46,
				'0': 48,
				'1': 49,
				'2': 50,
				'3': 51,
				'4': 52,
				'5': 53,
				'6': 54,
				'7': 55,
				'8': 56,
				'9': 57,
				'a': 65,
				'b': 66,
				'c': 67,
				'd': 68,
				'e': 69,
				'f': 70,
				'g': 71,
				'h': 72,
				'i': 73,
				'j': 74,
				'k': 75,
				'l': 76,
				'm': 77,
				'n': 78,
				'o': 79,
				'p': 80,
				'q': 81,
				'r': 82,
				's': 83,
				't': 84,
				'u': 85,
				'v': 86,
				'w': 87,
				'x': 88,
				'y': 89,
				'z': 90
			};
			
			this._controlMap = [];
			this._state = [];
			
			// Set default values for the mouse position
			this._state[this.mouse.x] = 0;
			this._state[this.mouse.y] = 0;
		},
		
		debug: function (val) {
			if (val !== undefined) {
				this._debug = val;
				return this;
			}
			
			return this._debug;
		},
		
		/**
		 * Sets up the event listeners on the main window and front
		 * buffer DOM objects.
		 * @private
		 */
		setupListeners: function (canvas) {
			this.log('Setting up input event listeners...');
			
			this._canvas = canvas;
			
			// Setup the event listeners
			var self = this;
			
			// Define event functions and keep references for later removal
			this._evRef = {
				'mousedown': function (event) { event.igeType = 'mouse'; self._rationalise(event); self._mouseDown(event); },
				'mouseup': function (event) { event.igeType = 'mouse'; self._rationalise(event); self._mouseUp(event); },
				'mousemove': function (event) { event.igeType = 'mouse'; self._rationalise(event); self._mouseMove(event); },
				'mousewheel': function (event) { event.igeType = 'mouse'; self._rationalise(event); self._mouseWheel(event); },
				
				'touchmove': function (event) { event.igeType = 'touch'; self._rationalise(event, true); self._mouseMove(event); },
				'touchstart': function (event) { event.igeType = 'touch'; self._rationalise(event, true); self._mouseDown(event); },
				'touchend': function (event) { event.igeType = 'touch'; self._rationalise(event, true); self._mouseUp(event); },
				
				'contextmenu': function (event) { event.preventDefault(); event.igeType = 'mouse'; self._rationalise(event); self._contextMenu(event); },
				
				'keydown': function (event) { event.igeType = 'key'; self._rationalise(event); self._keyDown(event); },
				'keyup': function (event) { event.igeType = 'key'; self._rationalise(event); self._keyUp(event); }
			};
			
			// Listen for mouse events
			canvas.addEventListener('mousedown', this._evRef.mousedown, false);
			canvas.addEventListener('mouseup', this._evRef.mouseup, false);
			canvas.addEventListener('mousemove', this._evRef.mousemove, false);
			canvas.addEventListener('mousewheel', this._evRef.mousewheel, false);
			
			// Touch events
			canvas.addEventListener('touchmove', this._evRef.touchmove, false);
			canvas.addEventListener('touchstart', this._evRef.touchstart, false);
			canvas.addEventListener('touchend', this._evRef.touchend, false);
			
			// Kill the context menu on right-click, urgh!
			canvas.addEventListener('contextmenu', this._evRef.contextmenu, false);
			
			// Listen for keyboard events
			window.addEventListener('keydown', this._evRef.keydown, false);
			window.addEventListener('keyup', this._evRef.keyup, false);
		},
		
		destroyListeners: function () {
			this.log('Removing input event listeners...');
			
			// Remove the event listeners
			var canvas = this._canvas;
			
			// Listen for mouse events
			canvas.removeEventListener('mousedown', this._evRef.mousedown, false);
			canvas.removeEventListener('mouseup', this._evRef.mouseup, false);
			canvas.removeEventListener('mousemove', this._evRef.mousemove, false);
			canvas.removeEventListener('mousewheel', this._evRef.mousewheel, false);
			
			// Touch events
			canvas.removeEventListener('touchmove', this._evRef.touchmove, false);
			canvas.removeEventListener('touchstart', this._evRef.touchstart, false);
			canvas.removeEventListener('touchend', this._evRef.touchend, false);
			
			// Kill the context menu on right-click, urgh!
			canvas.removeEventListener('contextmenu', this._evRef.contextmenu, false);
			
			// Listen for keyboard events
			window.removeEventListener('keydown', this._evRef.keydown, false);
			window.removeEventListener('keyup', this._evRef.keyup, false);
		},
		
		/**
		 * Fires an input event that didn't occur on the main canvas, as if it had
		 * occurred on the main canvas, allowing you to pass through events like
		 * mousedown and mouseup that occurred elsewhere on the DOM but might be
		 * useful for the engine to be aware of, such as if you are dragging an entity
		 * and then the mouse goes off-canvas and the button is released.
		 * @param {String} eventName The lowercase name of the event to fire e.g. mousedown.
		 * @param {Object} eventObj The event object that was passed by the DOM.
		 */
		fireManualEvent: function (eventName, eventObj) {
			if (eventName && eventObj) {
				if (this._evRef[eventName]) {
					this._evRef[eventName](eventObj);
				} else {
					this.log('Cannot fire manual event "' + eventName + '" because no listener exists in the engine for this event type!', 'warning');
				}
			} else {
				this.log('Cannot fire manual event because both eventName and eventObj params are required.', 'warning');
			}
		},
		
		/**
		 * Sets igeX and igeY properties in the event object that
		 * can be relied on to provide the x, y co-ordinates of the
		 * mouse event including the canvas offset.
		 * @param {Event} event The event object.
		 * @param {Boolean} touch If the event was a touch event or
		 * not.
		 * @private
		 */
		_rationalise: function (event, touch) {
			// Check if we want to prevent default behaviour
			if (event.igeType === 'key') {
				if (event.keyCode === 8) { // Backspace
					// Check if the event occurred on the body
					var elem = event.srcElement || event.target;
					
					if (elem.tagName.toLowerCase() === 'body') {
						// The event occurred on our body element so prevent
						// default behaviour. This allows other elements on
						// the page to retain focus such as text boxes etc
						// and allows them to behave normally.
						event.preventDefault();
					}
				}
			}
			
			if (event.igeType === 'touch') {
				event.preventDefault();
			}
			
			if (touch) {
				event.button = 0; // Emulate left mouse button
				
				// Handle touch changed
				if (event.changedTouches && event.changedTouches.length) {
					event.igePageX = event.changedTouches[0].pageX;
					event.igePageY = event.changedTouches[0].pageY;
				}
			} else {
				event.igePageX = event.pageX;
				event.igePageY = event.pageY;
			}
			
			event.igeX = (event.igePageX - ige._canvasPosition().left);
			event.igeY = (event.igePageY - ige._canvasPosition().top);
			
			this.emit('inputEvent', event);
		},
		
		
		/**
		 * Emits the "mouseDown" event.
		 * @param event
		 * @private
		 */
		_mouseDown: function (event) {
			if (this._debug) {
				console.log('Mouse Down', event);
			}
			// Update the mouse position within the viewports
			this._updateMouseData(event);
			
			var mx = event.igeX - ige._bounds2d.x2,
				my = event.igeY - ige._bounds2d.y2,
				self = this;
			
			if (event.button === 0) {
				this._state[this.mouse.button1] = true;
			}
			
			if (event.button === 1) {
				this._state[this.mouse.button2] = true;
			}
			
			if (event.button === 2) {
				this._state[this.mouse.button3] = true;
			}
			
			this.mouseDown = event;
			
			if (!self.emit('preMouseDown', [event, mx, my, event.button + 1])) {
				this.queueEvent(this, function () {
					self.emit('mouseDown', [event, mx, my, event.button + 1]);
				});
			}
		},
		
		/**
		 * Emits the "mouseUp" event.
		 * @param event
		 * @private
		 */
		_mouseUp: function (event) {
			if (this._debug) {
				console.log('Mouse Up', event);
			}
			// Update the mouse position within the viewports
			this._updateMouseData(event);
			
			var mx = event.igeX - ige._bounds2d.x2,
				my = event.igeY - ige._bounds2d.y2,
				self = this;
			
			if (event.button === 0) {
				this._state[this.mouse.button1] = false;
			}
			
			if (event.button === 1) {
				this._state[this.mouse.button2] = false;
			}
			
			if (event.button === 2) {
				this._state[this.mouse.button3] = false;
			}
			
			this.mouseUp = event;
			
			if (!self.emit('preMouseUp', [event, mx, my, event.button + 1])) {
				this.queueEvent(this, function () {
					self.emit('mouseUp', [event, mx, my, event.button + 1]);
				});
			}
		},
		
		_contextMenu: function (event) {
			if (this._debug) {
				console.log('Context Menu', event);
			}
			// Update the mouse position within the viewports
			this._updateMouseData(event);
			
			var mx = event.igeX - ige._bounds2d.x2,
				my = event.igeY - ige._bounds2d.y2,
				self = this;
			
			if (event.button === 0) {
				this._state[this.mouse.button1] = false;
			}
			
			if (event.button === 1) {
				this._state[this.mouse.button2] = false;
			}
			
			if (event.button === 2) {
				this._state[this.mouse.button3] = false;
			}
			
			this.contextMenu = event;
			
			if (!self.emit('preContextMenu', [event, mx, my, event.button + 1])) {
				this.queueEvent(this, function () {
					self.emit('contextMenu', [event, mx, my, event.button + 1]);
				});
			}
		},
		
		/**
		 * Emits the "mouseMove" event.
		 * @param event
		 * @private
		 */
		_mouseMove: function (event) {
			// Update the mouse position within the viewports
			ige._mouseOverVp = this._updateMouseData(event);
			
			var mx = event.igeX - ige._bounds2d.x2,
				my = event.igeY - ige._bounds2d.y2,
				self = this;
			
			this._state[this.mouse.x] = mx;
			this._state[this.mouse.y] = my;
			
			this.mouseMove = event;
			
			if (!self.emit('preMouseMove', [event, mx, my, event.button + 1])) {
				this.queueEvent(this, function () {
					self.emit('mouseMove', [event, mx, my, event.button + 1]);
				});
			}
		},
		
		/**
		 * Emits the "mouseWheel" event.
		 * @param event
		 * @private
		 */
		_mouseWheel: function (event) {
			// Update the mouse position within the viewports
			this._updateMouseData(event);
			
			var mx = event.igeX - ige._bounds2d.x2,
				my = event.igeY - ige._bounds2d.y2,
				self = this;
			
			this._state[this.mouse.wheel] = event.wheelDelta;
			
			if (event.wheelDelta > 0) {
				this._state[this.mouse.wheelUp] = true;
			} else {
				this._state[this.mouse.wheelDown] = true;
			}
			
			this.mouseWheel = event;
			
			if (!self.emit('preMouseWheel', [event, mx, my, event.button + 1])) {
				this.queueEvent(this, function () {
					self.emit('mouseWheel', [event, mx, my, event.button + 1]);
				});
			}
		},
		
		/**
		 * Emits the "keyDown" event.
		 * @param event
		 * @private
		 */
		_keyDown: function (event) {
			var self = this;
			
			this._state[event.keyCode] = true;
			
			if (this._debug) {
				console.log('Key Down', event);
			}
			
			if (!self.emit('preKeyDown', [event, event.keyCode])) {
				this.queueEvent(this, function () {
					self.emit('keyDown', [event, event.keyCode]);
				});
			}
		},
		
		/**
		 * Emits the "keyUp" event.
		 * @param event
		 * @private
		 */
		_keyUp: function (event) {
			var self = this;
			
			this._state[event.keyCode] = false;
			
			if (this._debug) {
				console.log('Key Up', event);
			}
			
			if (!self.emit('preKeyUp', [event, event.keyCode])) {
				this.queueEvent(this, function () {
					self.emit('keyUp', [event, event.keyCode]);
				});
			}
		},
		
		/**
		 * Loops the mounted viewports and updates their respective mouse
		 * co-ordinates so that mouse events can work out where on a viewport
		 * they occurred.
		 *
		 * @param event
		 * @return {*}
		 * @private
		 */
		_updateMouseData: function (event) {
			// Loop the viewports and check if the mouse is inside
			var arr = ige._children,
				arrCount = arr.length,
				vp, vpUpdated,
				mx = (event.igeX - ige._bounds2d.x2) - ige._translate.x,
				my = (event.igeY - ige._bounds2d.y2) - ige._translate.y;
			
			ige._mousePos.x = mx;
			ige._mousePos.y = my;
			
			while (arrCount--) {
				vp = arr[arr.length - (arrCount + 1)];
				// Check if the mouse is inside this viewport's bounds
				// TODO: Update this code to take into account viewport rotation and camera rotation
				if (mx > vp._translate.x - vp._bounds2d.x / 2 && mx < vp._translate.x + vp._bounds2d.x / 2) {
					if (my > vp._translate.y - vp._bounds2d.y / 2 && my < vp._translate.y + vp._bounds2d.y / 2) {
						// Mouse is inside this viewport
						vp._mousePos = new IgePoint3d(
							Math.floor((mx - vp._translate.x) / vp.camera._scale.x + vp.camera._translate.x),
							Math.floor((my - vp._translate.y) / vp.camera._scale.y + vp.camera._translate.y),
							0
						);
						
						vpUpdated = vp;
						
						// Record the viewport that this event occurred on in the
						// event object
						event.igeViewport = vp;
						break;
					}
				}
			}
			
			return vpUpdated;
		},
		
		/**
		 * Defines an action that will be emitted when the specified event type
		 * occurs.
		 * @param actionName
		 * @param eventCode
		 */
		mapAction: function (actionName, eventCode) {
			this._controlMap[actionName] = eventCode;
		},
		
		/**
		 * Returns the passed action's input state value.
		 * @param actionName
		 */
		actionVal: function (actionName) {
			return this._state[this._controlMap[actionName]];
		},
		
		/**
		 * Returns true if the passed action's input is pressed or it's state
		 * is not zero.
		 * @param actionName
		 */
		actionState: function (actionName) {
			var val = this._state[this._controlMap[actionName]];
			return !!val; // "Not not" to convert to boolean true/false
		},
		
		/**
		 * Returns an input's current value.
		 * @param actionName
		 * @return {*}
		 */
		val: function (inputId) {
			return this._state[inputId];
		},
		
		/**
		 * Returns an input's current state as a boolean.
		 * @param stateId
		 * @return {Boolean}
		 */
		state: function (inputId) {
			return !!this._state[inputId];
		},
		
		/**
		 * Stops further event propagation for this tick.
		 * @return {*}
		 */
		stopPropagation: function () {
			this._eventControl._cancelled = true;
			return this;
		},
		
		/**
		 * Adds an event method to the eventQueue array. The array is
		 * processed during each tick after the scenegraph has been
		 * rendered.
		 * @param context
		 * @param ev
		 */
		queueEvent: function (context, ev, data) {
			if (ev !== undefined) {
				this._eventQueue.push([context, ev, data]);
			}
			
			return this;
		},
		
		/**
		 * Called by the engine after ALL other tick methods have processed.
		 * Call originates in IgeEngine.js. Allows us to reset any flags etc.
		 */
		tick: function () {
			// If we have an event queue, process it
			var arr = this._eventQueue,
				arrCount = arr.length,
				evc = this._eventControl;
			
			while (arrCount--) {
				arr[arrCount][1].apply(arr[arrCount][0], [evc, arr[arrCount][2]]);
				if (evc._cancelled) {
					// The last event queue method stopped propagation so cancel all further
					// event processing (the last event took control of the input)
					break;
				}
			}
			
			// Reset all the flags and variables for the next tick
			this._eventQueue = [];
			this._eventControl._cancelled = false;
			this.dblClick = false; // TODO: Add double-click event handling
			this.mouseMove = false;
			this.mouseDown = false;
			this.mouseUp = false;
			this.mouseWheel = false;
		},
		
		/**
		 * Emit an event by name. Overrides the IgeEventingClass emit method and
		 * checks for propagation stopped by calling ige.input.stopPropagation().
		 * @param {Object} eventName The name of the event to emit.
		 * @param {Object || Array} args The arguments to send to any listening methods.
		 * If you are sending multiple arguments, use an array containing each argument.
		 * @return {Number}
		 */
		emit: function (eventName, args) {
			if (this._eventListeners) {
				// Check if the event has any listeners
				if (this._eventListeners[eventName]) {
					
					// Fire the listeners for this event
					var eventCount = this._eventListeners[eventName].length,
						eventCount2 = this._eventListeners[eventName].length - 1,
						evc = this._eventControl,
						finalArgs, i, cancelFlag, eventIndex, tempEvt, retVal;
					
					// If there are some events, ensure that the args is ready to be used
					if (eventCount) {
						finalArgs = [];
						if (typeof(args) === 'object' && args !== null && args[0] !== null) {
							for (i in args) {
								if (args.hasOwnProperty(i)) {
									finalArgs[i] = args[i];
								}
							}
						} else {
							finalArgs = [args];
						}
						
						// Loop and emit!
						cancelFlag = false;
						
						this._eventListeners._processing = true;
						while (eventCount--) {
							if (evc._cancelled) {
								// The stopPropagation() method was called, cancel all other event calls
								break;
							}
							eventIndex = eventCount2 - eventCount;
							tempEvt = this._eventListeners[eventName][eventIndex];
							
							// If the sendEventName flag is set, overwrite the arguments with the event name
							if (tempEvt.sendEventName) { finalArgs = [eventName]; }
							
							// Call the callback
							retVal = tempEvt.call.apply(tempEvt.context || this, finalArgs);
							
							// If the retVal === true then store the cancel flag and return to the emitting method
							if (retVal === true || evc._cancelled === true) {
								// The receiver method asked us to send a cancel request back to the emitter
								cancelFlag = true;
							}
							
							// Check if we should now cancel the event
							if (tempEvt.oneShot) {
								// The event has a oneShot flag so since we have fired the event,
								// lets cancel the listener now
								this.off(eventName, tempEvt);
							}
						}
						this._eventListeners._processing = false;
						
						// Now process any event removal
						this._processRemovals();
						
						if (cancelFlag) {
							return 1;
						}
						
					}
					
				}
			}
		}
	});
	
	return IgeInputComponent;
});
},{"irrelon-appcore":67}],8:[function(_dereq_,module,exports){
"use strict";

var appCore = _dereq_('irrelon-appcore');

appCore.module('IgeMousePanComponent', function (IgeEventingClass) {
	/**
	 * When added to a viewport, automatically adds mouse panning
	 * capabilities to the viewport's camera.
	 */
	var IgeMousePanComponent = IgeEventingClass.extend({
		classId: 'IgeMousePanComponent',
		componentId: 'mousePan',
		
		/**
		 * @constructor
		 * @param {IgeObject} entity The object that the component is added to.
		 * @param {Object=} options The options object that was passed to the component during
		 * the call to addComponent.
		 */
		init: function (entity, options) {
			this._entity = entity;
			this._options = options;
			
			// Set the pan component to inactive to start with
			this._enabled = false;
			this._startThreshold = 5; // The number of pixels the mouse should move to activate a pan
		},
		
		/**
		 * Gets / sets the number of pixels after a mouse down that the mouse
		 * must move in order to activate a pan operation. Defaults to 5.
		 * @param val
		 * @return {*}
		 */
		startThreshold: function (val) {
			if (val !== undefined) {
				this._startThreshold = val;
				return this._entity;
			}
			
			return this._startThreshold;
		},
		
		/**
		 * Gets / sets the rectangle that the pan operation will be limited
		 * to using an IgeRect instance.
		 * @param {IgeRect=} rect
		 * @return {*}
		 */
		limit: function (rect) {
			if (rect !== undefined) {
				this._limit = rect;
				return this._entity;
			}
			
			return this._limit;
		},
		
		/**
		 * Gets / sets the enabled flag. If set to true, pan
		 * operations will be processed. If false, no panning will
		 * occur.
		 * @param {Boolean=} val
		 * @return {*}
		 */
		enabled: function (val) {
			var self = this;
			
			if (val !== undefined) {
				this._enabled = val;
				
				// Reset pan values.
				// This prevents problems if mouse pan is disabled mid-pan.
				this._panPreStart = false;
				this._panStarted  = false;
				
				if (this._enabled) {
					// Listen for the mouse events we need to operate a mouse pan
					this._entity.mouseDown(function (event) { self._mouseDown(event); });
					this._entity.mouseMove(function (event) { self._mouseMove(event); });
					this._entity.mouseUp(function (event) { self._mouseUp(event); });
				} else {
					// Remove the pan start data
					delete this._panStartMouse;
					delete this._panStartCamera;
				}
				
				return this._entity;
			}
			
			return this._enabled;
		},
		
		/**
		 * Handles the mouseDown event. Records the starting position of the
		 * camera pan and the current camera translation.
		 * @param event
		 * @private
		 */
		_mouseDown: function (event) {
			if (!this._panStarted && this._enabled && event.igeViewport.id() === this._entity.id()) {
				// Record the mouse down position - pan pre-start
				var curMousePos = ige._mousePos;
				this._panStartMouse = curMousePos.clone();
				
				this._panStartCamera = {
					x: this._entity.camera._translate.x,
					y: this._entity.camera._translate.y
				};
				
				this._panPreStart = true;
				this._panStarted = false;
			}
		},
		
		/**
		 * Handles the mouse move event. Translates the camera as the mouse
		 * moves across the screen.
		 * @param event
		 * @private
		 */
		_mouseMove: function (event) {
			if (this._enabled) {
				// Pan the camera if the mouse is down
				if (this._panStartMouse) {
					var curMousePos = ige._mousePos,
						panCords = {
							x: this._panStartMouse.x - curMousePos.x,
							y: this._panStartMouse.y - curMousePos.y
						}, distX = Math.abs(panCords.x), distY = Math.abs(panCords.y),
						panFinalX = (panCords.x / this._entity.camera._scale.x) + this._panStartCamera.x,
						panFinalY = (panCords.y / this._entity.camera._scale.y) + this._panStartCamera.y;
					
					// Check if we have a limiter on the rectangle area
					// that we should allow panning inside.
					if (this._limit) {
						// Check the pan co-ordinates against
						// the limiter rectangle
						if (panFinalX < this._limit.x) {
							panFinalX = this._limit.x;
						}
						
						if (panFinalX > this._limit.x + this._limit.width) {
							panFinalX = this._limit.x + this._limit.width;
						}
						
						if (panFinalY < this._limit.y) {
							panFinalY = this._limit.y;
						}
						
						if (panFinalY > this._limit.y + this._limit.height) {
							panFinalY = this._limit.y + this._limit.height;
						}
					}
					
					if (this._panPreStart) {
						// Check if we've reached the start threshold
						if (distX > this._startThreshold || distY > this._startThreshold) {
							this._entity.camera.translateTo(
								panFinalX,
								panFinalY,
								0
							);
							this.emit('panStart');
							this._panPreStart = false;
							this._panStarted = true;
							
							this.emit('panMove');
						}
					} else {
						// Pan has already started
						this._entity.camera.translateTo(
							panFinalX,
							panFinalY,
							0
						);
						
						this.emit('panMove');
					}
				}
			}
		},
		
		/**
		 * Handles the mouse up event. Finishes the camera translate and
		 * removes the starting pan data.
		 * @param event
		 * @private
		 */
		_mouseUp: function (event) {
			if (this._enabled) {
				// End the pan
				if (this._panStarted) {
					if (this._panStartMouse) {
						var curMousePos = ige._mousePos,
							panCords = {
								x: this._panStartMouse.x - curMousePos.x,
								y: this._panStartMouse.y - curMousePos.y
							},
							panFinalX = (panCords.x / this._entity.camera._scale.x) + this._panStartCamera.x,
							panFinalY = (panCords.y / this._entity.camera._scale.y) + this._panStartCamera.y;
						
						// Check if we have a limiter on the rectangle area
						// that we should allow panning inside.
						if (this._limit) {
							// Check the pan co-ordinates against
							// the limiter rectangle
							if (panFinalX < this._limit.x) {
								panFinalX = this._limit.x;
							}
							
							if (panFinalX > this._limit.x + this._limit.width) {
								panFinalX = this._limit.x + this._limit.width;
							}
							
							if (panFinalY < this._limit.y) {
								panFinalY = this._limit.y;
							}
							
							if (panFinalY > this._limit.y + this._limit.height) {
								panFinalY = this._limit.y + this._limit.height;
							}
						}
						
						this._entity.camera.translateTo(
							panFinalX,
							panFinalY,
							0
						);
						
						// Remove the pan start data to end the pan operation
						delete this._panStartMouse;
						delete this._panStartCamera;
						
						this.emit('panEnd');
						this._panStarted = false;
					}
				} else {
					delete this._panStartMouse;
					delete this._panStartCamera;
					this._panStarted = false;
				}
			}
		}
	});
	
	return IgeMousePanComponent;
});
},{"irrelon-appcore":67}],9:[function(_dereq_,module,exports){
"use strict";

var appCore = _dereq_('irrelon-appcore');

appCore.module('IgeMouseZoomComponent', function (IgeEventingClass) {
	/**
	 * When added to a viewport, automatically adds mouse zooming
	 * capabilities to the viewport's camera.
	 */
	var IgeMouseZoomComponent = IgeEventingClass.extend({
		classId: 'IgeMouseZoomComponent',
		componentId: 'mouseZoom',
		
		/**
		 * @constructor
		 * @param {IgeObject} entity The object that the component is added to.
		 * @param {Object=} options The options object that was passed to the component during
		 * the call to addComponent.
		 */
		init: function (entity, options) {
			this._entity = entity;
			this._options = options;
			
			// Set the zoom component to inactive to start with
			this._enabled = false;
		},
		
		/**
		 * Sets / gets the enabled flag. If set to true, zoom
		 * operations will be processed. If false, no zooming will
		 * occur.
		 * @param {Boolean=} val
		 * @return {*}
		 */
		enabled: function (val) {
			var self = this;
			
			if (val !== undefined) {
				this._enabled = val;
				
				if (this._enabled) {
					// Listen for the mouse events we need to operate a mouse pan
					this._entity.mouseDown(function (event) { self._mouseDown(event); });
					this._entity.mouseMove(function (event) { self._mouseMove(event); });
					this._entity.mouseUp(function (event) { self._mouseUp(event); });
				} else {
					// Remove the zoom start data
					delete this._zoomStartMouse;
					delete this._zoomStartCamera;
				}
				
				return this._entity;
			}
			
			return this._enabled;
		},
		
		/**
		 * Handles the mouseDown event. Records the starting position of the
		 * camera zoom and the current camera translation.
		 * @param event
		 * @private
		 */
		_mouseDown: function (event) {
			if (this._enabled && event.igeViewport.id() === this._entity.id()) {
				// Record the mouse down position - zoom starting
				var curMousePos = ige._mousePos;
				this._zoomStartMouse = {
					x: curMousePos.x,
					y: curMousePos.y
				};
				
				this._zoomStartCamera = {
					x: this._entity.camera._scale.x,
					y: this._entity.camera._scale.y
				};
			}
		},
		
		/**
		 * Handles the mouse move event. Scales the camera as the mouse
		 * moves across the screen.
		 * @param event
		 * @private
		 */
		_mouseMove: function (event) {
			if (this._enabled) {
				// Zoom the camera if the mouse is down
				if (this._zoomStartMouse) {
					var curMousePos = ige._mousePos,
						zoomCords = {
							x: -(this._zoomStartMouse.x - curMousePos.x) / 100,
							y: -(this._zoomStartMouse.y - curMousePos.y) / 100
						};
					
					this._entity.camera.scaleTo(
						zoomCords.x + this._zoomStartCamera.x > 0.02 ? zoomCords.x + this._zoomStartCamera.x : 0.02,
						zoomCords.x + this._zoomStartCamera.x > 0.02 ? zoomCords.x + this._zoomStartCamera.x : 0.02,
						0
					);
				}
			}
		},
		
		/**
		 * Handles the mouse up event. Finishes the camera scale and
		 * removes the starting zoom data.
		 * @param event
		 * @private
		 */
		_mouseUp: function (event) {
			if (this._enabled) {
				// End the zoom
				if (this._zoomStartMouse) {
					var curMousePos = ige._mousePos,
						zoomCords = {
							x: -(this._zoomStartMouse.x - curMousePos.x) / 100,
							y: -(this._zoomStartMouse.y - curMousePos.y) / 100
						};
					
					this._entity.camera.scaleTo(
						zoomCords.x + this._zoomStartCamera.x > 0.02 ? zoomCords.x + this._zoomStartCamera.x : 0.02,
						zoomCords.x + this._zoomStartCamera.x > 0.02 ? zoomCords.x + this._zoomStartCamera.x : 0.02,
						0
					);
					
					// Remove the zoom start data to end the zoom operation
					delete this._zoomStartMouse;
					delete this._zoomStartCamera;
				}
			}
		}
	});
	
	return IgeMouseZoomComponent;
});
},{"irrelon-appcore":67}],10:[function(_dereq_,module,exports){
"use strict";

var appCore = _dereq_('irrelon-appcore');

appCore.module('IgePathComponent', function (IgeEventingClass, IgePoint3d) {
	/**
	 * Handles entity path traversal.
	 */
	var IgePathComponent = IgeEventingClass.extend({
		classId: 'IgePathComponent',
		componentId: 'path',
		
		init: function (entity, options) {
			this._entity = entity;
			this._points = [];
			this._speed = 1 / 1000;
			
			this._previousPointFrom = 0;
			this._currentPointFrom = 0;
			this._previousPointTo = 0;
			this._currentPointTo = 0;
			
			// Add the path behaviour to the entity
			entity.addBehaviour('path', this._updateBehaviour, false);
		},
		
		/**
		 * Gets / sets the tile map that will be used when calculating paths.
		 * @param {IgeTileMap2d} val The tileMap to use for path calculations.
		 * @returns {*}
		 */
		tileMap: function (val) {
			if (val !== undefined) {
				this._tileMap = val;
				return this;
			}
			
			return this._tileMap;
		},
		
		/**
		 * Gets / sets the path finder class instance used to generate paths.
		 * @param {IgePathFinder} val The pathfinder class instance to use to generate paths.
		 * @returns {*}
		 */
		finder: function (val) {
			if (val !== undefined) {
				this._finder = val;
				return this;
			}
			
			return this._finder;
		},
		
		/**
		 * Gets / sets the dynamic mode enabled flag. If dynamic mode is enabled
		 * then at the end of every path point (reaching a tile along the path)
		 * the path finder will evaluate the path by looking ahead and seeing if
		 * the path has changed (the tiles along the path have now been marked as
		 * cannot path on). If any tile along the path up to the look-ahead value
		 * has been blocked, the path will auto re-calculate to avoid the new block.
		 *
		 * For dynamic mode to work you need to supply a path-finder instance by
		 * calling .finder(), a tile checker method by calling .tileChecker() and
		 * the number of look-ahead steps by calling .lookAheadSteps(). See the
		 * doc for those methods for usage and required arguments.
		 * @param {Boolean} enable If set to true, enables dynamic mode.
		 * @returns {*}
		 */
		dynamic: function (enable) {
			if (enable !== undefined) {
				this._dynamic = enable;
				return this;
			}
			
			return this._dynamic;
		},
		
		/**
		 * Gets / sets the tile checker method used when calculating paths.
		 * @param {Function=} val The method to call when checking if a tile is valid
		 * to traverse when calculating paths.
		 * @returns {*}
		 */
		tileChecker: function (val) {
			if (val !== undefined) {
				var self = this;
				
				this._tileChecker = function () { return val.apply(self._entity, arguments); };
				return this;
			}
			
			return this._tileChecker;
		},
		
		lookAheadSteps: function (val) {
			if (val !== undefined) {
				this._lookAheadSteps = val;
				return this;
			}
			
			return this._lookAheadSteps;
		},
		
		/**
		 * Gets / sets the flag determining if a path can use N, S, E and W movement.
		 * @param {Boolean=} val Set to true to allow, false to disallow.
		 * @returns {*}
		 */
		allowSquare: function (val) {
			if (val !== undefined) {
				this._allowSquare = val;
				return this;
			}
			
			return this._allowSquare;
		},
		
		/**
		 * Gets / sets the flag determining if a path can use NW, SW, NE and SE movement.
		 * @param {Boolean=} val Set to true to allow, false to disallow.
		 * @returns {*}
		 */
		allowDiagonal: function (val) {
			if (val !== undefined) {
				this._allowDiagonal = val;
				return this;
			}
			
			return this._allowDiagonal;
		},
		
		/**
		 * Clears any existing path points and sets the path the entity will traverse
		 * from start to finish.
		 * @param {Number} fromX The x tile to path from.
		 * @param {Number} fromY The y tile to path from.
		 * @param {Number} fromZ The z tile to path from.
		 * @param {Number} toX The x tile to path to.
		 * @param {Number} toY The y tile to path to.
		 * @param {Number} toZ The z tile to path to.
		 * @param {Boolean=} findNearest If the destination is unreachable, when set to
		 * true this option will allow the pathfinder to return the closest path to the
		 * destination tile.
		 * @returns {*}
		 */
		set: function (fromX, fromY, fromZ, toX, toY, toZ, findNearest) {
			// Clear existing path
			this.clear();
			
			// Create a new path
			var path = this._finder.generate(
				this._tileMap,
				new IgePoint3d(fromX, fromY, fromZ),
				new IgePoint3d(toX, toY, toZ),
				this._tileChecker,
				this._allowSquare,
				this._allowDiagonal,
				findNearest
			);
			
			this.addPoints(path);
			
			return this;
		},
		
		add: function (x, y, z, findNearest) {
			// Get the endPoint of the current path
			var endPoint = this.getEndPoint(),
				shift = true;
			
			if (!endPoint) {
				// There is no existing path, detect current tile position
				endPoint = this._entity._parent.pointToTile(this._entity._translate);
				shift = false;
			}
			
			// Create a new path
			var path = this._finder.generate(
				this._tileMap,
				endPoint,
				new IgePoint3d(x, y, z),
				this._tileChecker,
				this._allowSquare,
				this._allowDiagonal,
				findNearest
			);
			
			if (shift) {
				// Remove the first tile, it's the last one on the list already
				path.shift();
			}
			
			this.addPoints(path);
			
			return this;
		},
		
		/**
		 * Adds a path array containing path points (IgePoint3d instances) to the points queue.
		 * @param {Array} path An array of path points.
		 * @return {*}
		 */
		addPoints: function (path) {
			if (path !== undefined) {
				// Check the path array has items in it!
				if (path.length) {
					this._points = this._points.concat(path);
					this._calculatePathData();
				} else {
					this.log('Cannot add an empty path to the path queue!', 'warning');
				}
			}
			
			return this;
		},
		
		/**
		 * Gets the path node point that the entity is travelling from.
		 * @return {IgePoint3d} A new point representing the travelled from node.
		 */
		getFromPoint: function () {
			return this._points[this._currentPointFrom];
		},
		
		/**
		 * Gets the path node point that the entity is travelling to.
		 * @return {IgePoint3d} A new point representing the travelling to node.
		 */
		getToPoint: function () {
			return this._points[this._currentPointTo];
		},
		
		/**
		 * Gets the current direction.
		 * @example #Get the direction of movement along the current path
		 *     // Create an entity and add the path component
		 *     var entity = new IgeEntity()
		 *         .addComponent(IgePathComponent);
		 *
		 *     // Create a path and add it to the entity
		 *     // ...
		 *     // Now get the current direction
		 *     var direction = entity.path.currentDirection();
		 * @return {String} A string such as N, S, E, W, NW, NE, SW, SE.
		 * If there is currently no direction then the return value is a blank string.
		 */
		getDirection: function () {
			if (!this._finished) {
				var cell = this.getToPoint(),
					dir = '';
				
				if (cell) {
					dir = cell.direction;
					
					if (this._entity._mode === 1) {
						// Convert direction for isometric
						switch (dir) {
							case 'E':
								dir = 'SE';
								break;
							
							case 'S':
								dir = 'SW';
								break;
							
							case 'W':
								dir = 'NW';
								break;
							
							case 'N':
								dir = 'NE';
								break;
							
							case 'NE':
								dir = 'E';
								break;
							
							case 'SW':
								dir = 'W';
								break;
							
							case 'NW':
								dir = 'N';
								break;
							
							case 'SE':
								dir = 'S';
								break;
						}
					}
				}
			} else {
				dir = '';
			}
			
			return dir;
		},
		
		/**
		 * Gets / sets the time towards the end of the path when the path
		 * component will emit a "almostComplete" event.
		 * @param {Number=} ms The time in milliseconds to emit the event
		 * on before the end of the path.
		 * @return {*}
		 */
		warnTime: function (ms) {
			if (ms !== undefined) {
				this._warnTime = ms;
				return this;
			}
			
			return this._warnTime;
		},
		
		/**
		 * Gets / sets the flag determining if the entity moving along
		 * the path will stop automatically at the end of the path.
		 * @param {Boolean=} val If true, will stop at the end of the path.
		 * @return {*}
		 */
		autoStop: function (val) {
			if (val !== undefined) {
				this._autoStop = val;
				return this;
			}
			
			return this._autoStop;
		},
		
		/**
		 * Gets / sets the speed at which the entity will traverse the path in pixels
		 * per second (world space).
		 * @param {Number=} val
		 * @return {*}
		 */
		speed: function (val) {
			if (val !== undefined) {
				this._speed = val / 1000;
				
				if (this._active) {
					this.stop();
					this.start(this._startTime);
				}
				return this;
			}
			
			return this._speed;
		},
		
		/**
		 * Starts path traversal.
		 * @param {Number=} startTime The time to start path traversal. Defaults
		 * to new Date().getTime() if no
		 * value is presented.
		 * @return {*}
		 */
		start: function (startTime) {
			if (!this._active) {
				this._active = true;
				this._finished = false;
				this._startTime = startTime || ige._currentTime;
				
				this._calculatePathData();
				this.emit('started', this._entity);
			} else {
				this._finished = false;
			}
			
			return this;
		},
		
		/**
		 * Returns the last point of the last path in the path queue.
		 * @return {IgePoint3d}
		 */
		getEndPoint: function () {
			return this._points[this._points.length - 1];
		},
		
		/**
		 * Pauses path traversal but does not clear the path queue or any path data.
		 * @return {*}
		 */
		pause: function () {
			this._active = false;
			this._paused = true;
			this._pauseTime = ige._currentTime;
			
			this.emit('paused', this._entity);
			return this;
		},
		
		/**
		 * Clears all path queue and path data.
		 * @return {*}
		 */
		clear: function () {
			if (this._active) {
				this.stop();
			}
			
			this._previousPointFrom = 0;
			this._currentPointFrom = 0;
			this._previousPointTo = 0;
			this._currentPointTo = 0;
			this._points = [];
			
			this.emit('cleared', this._entity);
			return this;
		},
		
		/**
		 * Stops path traversal but does not clear the path
		 * queue or any path data.
		 * @return {*}
		 */
		stop: function () {
			//this.log('Setting pathing as inactive...');
			this._active = false;
			this._finished = true;
			this.emit('stopped', this._entity);
			
			return this;
		},
		
		/**
		 * Gets / sets the flag determining if the path component
		 * should draw the current path of the entity to the canvas
		 * on each tick. Useful for debugging paths.
		 * @param {Boolean=} val If true, will draw the path.
		 * @return {*}
		 */
		drawPath: function (val) {
			if (val !== undefined) {
				this._drawPath = val;
				
				if (val) {
					this._entity.addBehaviour('path', this._tickBehaviour, true);
				} else {
					this._entity.removeBehaviour('path', true);
				}
				
				return this;
			}
			
			return this._drawPath;
		},
		
		/**
		 * Gets / sets the flag that determines if the path that
		 * is drawn gets some added glow effects or not. Pure eye
		 * candy, completely pointless otherwise.
		 * @param {Boolean=} val If true will add glow effects to the path.
		 * @return {*}
		 */
		drawPathGlow: function (val) {
			if (val !== undefined) {
				this._drawPathGlow = val;
				return this;
			}
			
			return this._drawPathGlow;
		},
		
		/**
		 * Gets / sets the flag that determines if the path that
		 * is drawn gets some added labels or not.
		 * @param {Boolean=} val If true will draw labels on each path point.
		 * @return {*}
		 */
		drawPathText: function (val) {
			if (val !== undefined) {
				this._drawPathText = val;
				return this;
			}
			
			return this._drawPathText;
		},
		
		multiplyPoint: function (point) {
			return point.multiply(
				this._entity._parent._tileWidth,
				this._entity._parent._tileHeight,
				1
			);
		},
		
		dividePoint: function (point) {
			return point.divide(
				this._entity._parent._tileWidth,
				this._entity._parent._tileHeight,
				1
			);
		},
		
		transformPoint: function (point) {
			return new IgePoint3d(
				point.x + this._entity._parent._tileWidth / 2,
				point.y + this._entity._parent._tileHeight / 2,
				point.z
			);
		},
		
		unTransformPoint: function (point) {
			return new IgePoint3d(
				point.x - this._entity._parent._tileWidth / 2,
				point.y - this._entity._parent._tileHeight / 2,
				point.z
			);
		},
		
		/**
		 * The behaviour method executed each tick.
		 * @param {CanvasRenderingContext2d} ctx The canvas that is currently being
		 * rendered to.
		 * @private
		 */
		_updateBehaviour: function (ctx) {
			var path = this.path,
				currentTime = ige._currentTime,
				progressTime = currentTime - path._startTime;
			
			// Check if we should be processing paths
			if (path._active && path._totalDistance !== 0 && currentTime >= path._startTime && (progressTime <= path._totalTime || !path._finished)) {
				var distanceTravelled = (path._speed) * progressTime,
					totalDistance = 0,
					pointArr = path._points,
					pointCount = pointArr.length,
					pointIndex,
					pointFrom,
					pointTo,
					newPoint,
					dynamicResult;
				
				// Loop points along the path and determine which points we are traversing between
				for (pointIndex = 0; pointIndex < pointCount; pointIndex++) {
					totalDistance += pointArr[pointIndex]._distanceToNext;
					
					if (totalDistance > distanceTravelled) {
						// Found points we are traversing
						path._finished = false;
						path._currentPointFrom = pointIndex;
						path._currentPointTo = pointIndex + 1;
						pointFrom = pointArr[pointIndex];
						pointTo = pointArr[pointIndex + 1];
						break;
					}
				}
				
				// Check if we have points to traverse between
				if (pointFrom && pointTo) {
					if (path._currentPointFrom !== path._previousPointFrom) {
						// Emit point complete
						path.emit('pointComplete', [this, pointArr[path._previousPointFrom].x, pointArr[path._previousPointFrom].y, pointArr[path._currentPointFrom].x, pointArr[path._currentPointFrom].y]);
					}
					
					// Check if we are in dynamic mode and if so, ensure our path is still valid
					if (path._dynamic) {
						dynamicResult = path._processDynamic(pointFrom, pointTo, pointArr[pointCount - 1]);
						if (dynamicResult === true) {
							// Re-assign the points to the new ones that the dynamic path
							// spliced into our points array
							pointFrom = pointArr[path._currentPointFrom];
							pointTo = pointArr[path._currentPointTo];
							
							path.emit('pathRecalculated', [this, pointArr[path._previousPointFrom].x, pointArr[path._previousPointFrom].y, pointArr[path._currentPointFrom].x, pointArr[path._currentPointFrom].y]);
						}
						
						if (dynamicResult === -1) {
							// Failed to find a new dynamic path
							path._finished = true;
						}
					}
					
					// Calculate position along vector between the two points
					newPoint = path._positionAlongVector(
						pointFrom,
						pointTo,
						path._speed,
						pointFrom._deltaTimeToNext - (pointFrom._absoluteTimeToNext - progressTime)
					);
					
					newPoint = path.multiplyPoint(newPoint);
					newPoint = path.transformPoint(newPoint);
					
					// Translate the entity to the new path point
					this.translateToPoint(newPoint);
					
					path._previousPointFrom = path._currentPointFrom;
					path._previousPointTo = path._currentPointTo;
				} else {
					pointTo = pointArr[pointCount - 1];
					
					newPoint = path.multiplyPoint(pointTo);
					newPoint = path.transformPoint(newPoint);
					
					path._previousPointFrom = pointCount - 1;
					path._previousPointTo = pointCount - 1;
					path._currentPointFrom = pointCount - 1;
					path._currentPointTo = pointCount - 1;
					
					this.translateToPoint(newPoint);
					
					path._finished = true;
					path.emit('pathComplete', [this, pointArr[path._previousPointFrom].x, pointArr[path._previousPointFrom].y]);
				}
			} else if(path._active && path._totalDistance == 0 && !path._finished) {
				path._finished = true;
			}
		},
		
		_processDynamic: function (pointFrom, pointTo, destinationPoint) {
			var self = this,
				tileMapData,
				tileCheckData,
				newPathPoints;
			
			// We are in dynamic mode, check steps ahead to see if they
			// have been blocked or not
			tileMapData = self._tileMap.map._mapData;
			tileCheckData = tileMapData[pointTo.y] && tileMapData[pointTo.y][pointTo.x] ? tileMapData[pointTo.y][pointTo.x] : null;
			
			if (!self._tileChecker(tileCheckData, pointTo.x, pointTo.y, null, null, null, true)) {
				// The new destination tile is blocked, recalculate path
				newPathPoints = self._finder.generate(
					self._tileMap,
					new IgePoint3d(pointFrom.x, pointFrom.y, pointFrom.z),
					new IgePoint3d(destinationPoint.x, destinationPoint.y, destinationPoint.z),
					self._tileChecker,
					self._allowSquare,
					self._allowDiagonal,
					false
				);
				
				if (newPathPoints.length) {
					self.replacePoints(self._currentPointFrom, self._points.length - self._currentPointFrom, newPathPoints);
					return true;
				} else {
					// Cannot generate valid path, delete this path
					self.emit('dynamicFail', [this, new IgePoint3d(pointFrom.x, pointFrom.y, pointFrom.z), new IgePoint3d(destinationPoint.x, destinationPoint.y, destinationPoint.z)]);
					self.clear();
					
					return -1;
				}
			}
			
			return false;
		},
		
		_calculatePathData: function () {
			var totalDistance = 0,
				startPoint,
				pointFrom,
				pointTo,
				i;
			
			
			if(this._currentPointFrom === 0) {
				// always set the first point to be the current position
				startPoint = this._entity._translate.clone();
				startPoint = this.unTransformPoint(startPoint);
				startPoint = this.dividePoint(startPoint);
				this._points[0] = startPoint;
			}
			
			// Calculate total distance to travel
			for (i = 1; i < this._points.length; i++) {
				pointFrom = this._points[i - 1];
				pointTo = this._points[i];
				pointFrom._distanceToNext = Math.distance(pointFrom.x, pointFrom.y, pointTo.x, pointTo.y);
				
				totalDistance += Math.abs(pointFrom._distanceToNext);
				
				pointFrom._deltaTimeToNext = pointFrom._distanceToNext / this._speed;
				pointFrom._absoluteTimeToNext = totalDistance / this._speed;
			}
			
			this._totalDistance = totalDistance;
			this._totalTime = totalDistance / this._speed;
			
			return this;
		},
		
		/**
		 * Replaces a number of points in the current queue with the new points passed.
		 * @param {Number} fromIndex The from index.
		 * @param {Number} replaceLength The number of points to replace.
		 * @param {Array} newPoints The array of new points to insert.
		 */
		replacePoints: function (fromIndex, replaceLength, newPoints) {
			var args = [fromIndex, replaceLength].concat(newPoints);
			this._points.splice.apply(this._points, args);
			this._calculatePathData();
		},
		
		_tickBehaviour: function (ctx) {
			if (ige.isClient) {
				var self = this.path,
					entity = this,
					currentPath = self._points,
					oldTracePathPoint,
					tracePathPoint,
					pathPointIndex,
					tempPathText;
				
				if (currentPath.length) {
					if (currentPath && self._drawPath) {
						// Draw the current path
						ctx.save();
						
						oldTracePathPoint = undefined;
						
						for (pathPointIndex = 0; pathPointIndex < currentPath.length; pathPointIndex++) {
							ctx.strokeStyle = '#0096ff';
							ctx.fillStyle = '#0096ff';
							
							tracePathPoint = new IgePoint3d(
								currentPath[pathPointIndex].x,
								currentPath[pathPointIndex].y,
								currentPath[pathPointIndex].z
							);
							
							tracePathPoint = self.multiplyPoint(tracePathPoint);
							tracePathPoint = self.transformPoint(tracePathPoint);
							
							if (entity._parent._mountMode === 1) {
								tracePathPoint = tracePathPoint.toIso();
							}
							
							if (!oldTracePathPoint) {
								// The starting point of the path
								ctx.beginPath();
								ctx.arc(tracePathPoint.x, tracePathPoint.y, 5, 0, Math.PI*2, true);
								ctx.closePath();
								ctx.fill();
							} else {
								// Not the starting point
								if (self._drawPathGlow) {
									ctx.globalAlpha = 0.1;
									for (var k = 3; k >= 0 ; k--) {
										ctx.lineWidth = (k + 1) * 4 - 3.5;
										ctx.beginPath();
										ctx.moveTo(oldTracePathPoint.x, oldTracePathPoint.y);
										ctx.lineTo(tracePathPoint.x, tracePathPoint.y);
										
										if (pathPointIndex < self._currentPointTo) {
											ctx.strokeStyle = '#666666';
											ctx.fillStyle = '#333333';
										}
										if (k === 0) {
											ctx.globalAlpha = 1;
										}
										
										ctx.stroke();
									}
								} else {
									ctx.beginPath();
									ctx.moveTo(oldTracePathPoint.x, oldTracePathPoint.y);
									ctx.lineTo(tracePathPoint.x, tracePathPoint.y);
									
									if (pathPointIndex < self._currentPointTo) {
										ctx.strokeStyle = '#666666';
										ctx.fillStyle = '#333333';
									}
									
									ctx.stroke();
								}
								
								if (pathPointIndex === self._currentPointTo) {
									ctx.save();
									ctx.fillStyle = '#24b9ea';
									ctx.fillRect(tracePathPoint.x - 5, tracePathPoint.y - 5, 10, 10);
									
									if (self._drawPathText) {
										ctx.fillStyle = '#eade24';
										
										if (self._drawPathGlow) {
											// Apply shadow to the text
											ctx.shadowOffsetX = 1;
											ctx.shadowOffsetY = 2;
											ctx.shadowBlur    = 4;
											ctx.shadowColor   = 'rgba(0, 0, 0, 1)';
										}
										
										tempPathText = 'Entity: ' + entity.id();
										ctx.fillText(tempPathText, tracePathPoint.x - Math.floor(ctx.measureText(tempPathText).width / 2), tracePathPoint.y + 16);
										
										tempPathText = 'Point (' + currentPath[pathPointIndex].x + ', ' + currentPath[pathPointIndex].y + ')';
										ctx.fillText(tempPathText, tracePathPoint.x - Math.floor(ctx.measureText(tempPathText).width / 2), tracePathPoint.y + 28);
										
										tempPathText = 'Abs (' + Math.floor(entity._translate.x) + ', ' + Math.floor(entity._translate.y) + ')';
										ctx.fillText(tempPathText, tracePathPoint.x - Math.floor(ctx.measureText(tempPathText).width / 2), tracePathPoint.y + 40);
									}
									
									ctx.restore();
								} else {
									ctx.fillRect(tracePathPoint.x - 2.5, tracePathPoint.y - 2.5, 5, 5);
								}
							}
							
							oldTracePathPoint = tracePathPoint;
						}
						
						ctx.restore();
					}
				}
			}
		},
		
		getPreviousPoint: function (val) {
			return this._points[this._currentPointFrom - val];
		},
		
		getNextPoint: function (val) {
			return this._points[this._currentPointTo + val];
		},
		
		/**
		 * Calculates the position of the entity along a vector based on the speed
		 * of the entity and the delta time.
		 * @param {IgePoint3d} p1 Vector start point
		 * @param {IgePoint3d} p2 Vector end point
		 * @param {Number} speed Speed along the vector
		 * @param {Number} deltaTime The time between the last update and now.
		 * @return {IgePoint3d}
		 * @private
		 */
		_positionAlongVector: function (p1, p2, speed, deltaTime) {
			var newPoint,
				p1X = p1.x,
				p1Y = p1.y,
				p2X = p2.x,
				p2Y = p2.y,
				deltaX = (p2X - p1X),
				deltaY = (p2Y - p1Y),
				magnitude = Math.sqrt(deltaX * deltaX + deltaY * deltaY),
				normalisedX = deltaX / magnitude,
				normalisedY = deltaY / magnitude;
			
			if (deltaX !== 0 || deltaY !== 0) {
				newPoint = new IgePoint3d(
					p1X + (normalisedX * (speed * deltaTime)),
					p1Y + (normalisedY * (speed * deltaTime)),
					0
				);
			} else {
				newPoint = new IgePoint3d(0, 0, 0);
			}
			
			return newPoint;
		}
	});
	
	return IgePathComponent;
});
},{"irrelon-appcore":67}],11:[function(_dereq_,module,exports){
"use strict";

var appCore = _dereq_('irrelon-appcore');

appCore.module('IgeTiledComponent', function (IgeClass, IgeCellSheet, IgeTileMap2d, IgeTextureMap) {
	/**
	 * Loads slightly modified Tiled-format json map data into the Isogenic Engine.
	 */
	var IgeTiledComponent = IgeClass.extend({
		classId: 'IgeTiledComponent',
		componentId: 'tiled',
		
		/**
		 * @constructor
		 * @param entity
		 * @param options
		 */
		init: function (entity, options) {
			this._entity = entity;
			this._options = options;
		},
		
		/**
		 * Loads a .js Tiled json-format file and converts to IGE format,
		 * then calls the callback with the newly created scene and the
		 * various layers as IgeTextureMap instances.
		 * @param url
		 * @param callback
		 */
		loadJson: function (url, callback) {
			var self = this,
				scriptElem;
			
			if (typeof(url) === 'string') {
				if (ige.isClient) {
					scriptElem = document.createElement('script');
					scriptElem.src = url;
					scriptElem.onload = function () {
						self.log('Tiled data loaded, processing...');
						self._processData(tiled, callback);
					};
					document.getElementsByTagName('head')[0].appendChild(scriptElem);
				} else {
					this.log('URL-based Tiled data is only available client-side. If you want to load Tiled map data on the server please include the map file in your ServerConfig.js file and then specify the map\'s data object instead of the URL.', 'error');
				}
			} else {
				self._processData(url, callback);
			}
		},
		
		_processData: function (data, callback) {
			var mapClass = ige.isServer === true ? IgeTileMap2d : IgeTextureMap,
				mapWidth = data.width,
				mapHeight = data.height,
				layerArray = data.layers,
				layerCount = layerArray.length,
				layer,
				layerType,
				layerData,
				layerDataCount,
				maps = [],
				layersById = {},
				tileSetArray = data.tilesets,
				tileSetCount = tileSetArray.length,
				tileSetItem,
				tileSetsTotal = tileSetCount,
				tileSetsLoaded = 0,
				textureCellLookup = [],
				currentTexture,
				currentCell,
				onLoadFunc,
				image,
				textures = [],
				allTexturesLoadedFunc,
				i, k, x, y, z,
				ent;
			
			// Define the function to call when all textures have finished loading
			allTexturesLoadedFunc = function () {
				// Create a map for each layer
				for (i = 0; i < layerCount; i++) {
					layer = layerArray[i];
					layerType = layer.type;
					
					// Check if the layer is a tile layer or an object layer
					if (layerType === 'tilelayer') {
						layerData = layer.data;
						
						maps[i] = new mapClass()
							.id(layer.name)
							.tileWidth(data.tilewidth)
							.tileHeight(data.tilewidth)
							.depth(i);
						
						maps[i].type = layerType;
						
						// Check if the layer should be isometric mounts enabled
						if (data.orientation === 'isometric') {
							maps[i].isometricMounts(true);
						}
						
						layersById[layer.name] = maps[i];
						tileSetCount = tileSetArray.length;
						
						if (ige.isClient) {
							for (k = 0; k < tileSetCount; k++) {
								maps[i].addTexture(textures[k]);
							}
						}
						
						// Loop through the layer data and paint the tiles
						layerDataCount = layerData.length;
						
						for (y = 0; y < mapHeight; y++) {
							for (x = 0; x < mapWidth; x++) {
								z = x + (y * mapWidth);
								
								if (layerData[z] > 0 && layerData[z] !== 2147483712) {
									if (ige.isClient) {
										// Paint the tile
										currentTexture = textureCellLookup[layerData[z]];
										if (currentTexture) {
											currentCell = layerData[z] - (currentTexture._tiledStartingId - 1);
											maps[i].paintTile(x, y, maps[i]._textureList.indexOf(currentTexture), currentCell);
										}
									} else {
										// Server-side we don't paint tiles on a texture map
										// we just mark the map data so that it can be used
										// to do things like path-finding and auto-creating
										// static physics objects.
										maps[i].occupyTile(x, y, 1, 1, layerData[z]);
									}
								}
							}
						}
					}
					
					if (layerType === 'objectgroup') {
						maps[i] = layer;
						layersById[layer.name] = maps[i];
					}
				}
				
				callback(maps, layersById);
			};
			
			if (ige.isClient) {
				onLoadFunc = function (textures, tileSetCount, tileSetItem) {
					return function () {
						var i, cc,
							cs = new IgeCellSheet(tileSetItem.image, this.width / tileSetItem.tilewidth, this.height / tileSetItem.tileheight)
								.id(tileSetItem.name)
								.on('loaded', function () {
									cc = this.cellCount();
									
									this._tiledStartingId = tileSetItem.firstgid;
									// Fill the lookup array
									for (i = 0; i < cc; i++) {
										textureCellLookup[this._tiledStartingId + i] = this;
									}
									
									textures.push(this);
									
									tileSetsLoaded++;
									
									if (tileSetsLoaded === tileSetsTotal) {
										// All textures loaded, fire processing function
										allTexturesLoadedFunc();
									}
								});
					};
				};
				
				// Load the tile sets as textures
				while (tileSetCount--) {
					// Load the image into memory first so we can read the total width and height
					image = new Image();
					
					tileSetItem = tileSetArray[tileSetCount];
					image.onload = onLoadFunc(textures, tileSetCount, tileSetItem);
					image.src = tileSetItem.image;
				}
			} else {
				// We're on the server so no textures are actually loaded
				allTexturesLoadedFunc();
			}
		}
	});
	
	return IgeTiledComponent;
});
},{"irrelon-appcore":67}],12:[function(_dereq_,module,exports){
"use strict";

var appCore = _dereq_('irrelon-appcore');

appCore.module('IgeTimeComponent', function (IgeEventingClass) {
	var IgeTimeComponent = IgeEventingClass.extend({
		classId: 'IgeTimeComponent',
		componentId: 'time',
		
		/**
		 * @constructor
		 * @param {Object} entity The parent object that this component is being added to.
		 * @param {Object=} options An optional object that is passed to the component when it is being initialised.
		 */
		init: function (entity, options) {
			this._entity = entity;
			this._timers = [];
			this._additions = [];
			this._removals = [];
			
			// Add the animation behaviour to the entity
			entity.addBehaviour('time', this._update);
		},
		
		addTimer: function (timer) {
			if (timer) {
				if (!this._updating) {
					this._timers.push(timer);
				} else {
					this._additions.push(timer);
				}
			}
			
			return this;
		},
		
		removeTimer: function (timer) {
			if (timer) {
				if (!this._updating) {
					this._timers.pull(timer);
				} else {
					this._removals.push(timer);
				}
			}
			
			return this;
		},
		
		_update: function () {
			// Get the ige tick delta and tell our timers / intervals that an update has occurred
			var self = ige.time,
				delta = ige._tickDelta,
				arr = self._timers,
				arrCount = arr.length;
			
			while (arrCount--) {
				arr[arrCount]
					.addTime(delta)
					.update();
			}
			
			// Process removing any timers that were scheduled for removal
			self._processRemovals();
			
			// Now process any additions to the timers that were scheduled to be added
			self._processAdditions();
			
			return self;
		},
		
		_processAdditions: function () {
			var arr = this._additions,
				arrCount = arr.length;
			
			if (arrCount) {
				while (arrCount--) {
					this._timers.push(arr[arrCount]);
				}
				
				this._additions = [];
			}
			
			return this;
		},
		
		_processRemovals: function () {
			var arr = this._removals,
				arrCount = arr.length;
			
			if (arrCount) {
				while (arrCount--) {
					this._timers.pull(arr[arrCount]);
				}
				
				this._removals = [];
			}
			
			return this;
		}
	});
	
	return IgeTimeComponent;
});
},{"irrelon-appcore":67}],13:[function(_dereq_,module,exports){
"use strict";

var appCore = _dereq_('irrelon-appcore');

appCore.module('IgeTweenComponent', function (IgeClass) {
	/**
	 * This component is already included in the IgeEngine (ige)
	 * instance and is not designed for use in any other way!
	 * It handles global tween processing on all tweening values.
	 */
	var IgeTweenComponent = IgeClass.extend({
		classId: 'IgeTweenComponent',
		componentId: 'tween',
		
		init: function (entity, options) {
			this._entity = entity;
			this._transform = entity.transform;
			
			// Setup the array that will hold our active tweens
			this._tweens = [];
			
			// Add the tween behaviour to the entity
			entity.addBehaviour('tween', this.update);
		},
		
		/**
		 * Start tweening particular properties for the object.
		 * @param {IgeTween} tween The tween to start.
		 * @return {Number} The index of the added tween or -1 on error.
		 */
		start: function (tween) {
			if (tween._startTime > ige._currentTime) {
				// The tween is scheduled for later
				// Push the tween into the IgeTweenComponent's _tweens array
				this._tweens.push(tween);
			} else {
				// The tween should start immediately
				tween._currentStep = 0;
				
				// Setup the tween's step
				if (this._setupStep(tween, false)) {
					// Push the tween into the IgeTweenComponent's _tweens array
					this._tweens.push(tween);
				}
			}
			
			// Enable tweening on the IgeTweenComponent
			this.enable();
			
			// Return the tween
			return tween;
		},
		
		_setupStep: function (tween, newTime) {
			var targetObj = tween._targetObj,
				step = tween._steps[tween._currentStep],
				propertyNameAndValue, // = tween._propertyObj
				durationMs,
				endTime,
				easing,
				propertyIndex,
				targetData = [];
			
			if (step) {
				propertyNameAndValue = step.props;
			}
			
			if (targetObj) {
				// Check / fill some option defaults
				if (tween._currentStep === 0 && !newTime) {
					// Because we are on step zero we can check for a start time
					if (tween._startTime === undefined) {
						tween._startTime = ige._currentTime;
					}
				} else {
					// We're not on step zero anymore so the new step start time
					// is NOW!
					tween._startTime = ige._currentTime;
				}
				
				durationMs = step.durationMs ? step.durationMs : tween._durationMs;
				tween._selectedEasing = step.easing ? step.easing : tween._easing;
				
				// Calculate the end time
				tween._endTime = tween._startTime + durationMs;
				
				for (propertyIndex in propertyNameAndValue) {
					if (propertyNameAndValue.hasOwnProperty(propertyIndex)) {
						targetData.push({
							targetObj: targetObj,
							propName: propertyIndex,
							deltaVal: propertyNameAndValue[propertyIndex] - (step.isDelta ? 0 : targetObj[propertyIndex]), // The diff between end and start values
							oldDelta: 0 // Var to save the old delta in order to get the actual difference data.
						});
					}
				}
				
				tween._targetData = targetData;
				tween._destTime = tween._endTime - tween._startTime;
				
				return tween; // Return the tween
			} else {
				this.log('Cannot start tweening properties of the specified object "' + obj + '" because it does not exist!', 'error');
			}
		},
		
		/**
		 * Removes the specified tween from the active tween list.
		 * @param {IgeTween} tween The tween to stop.
		 */
		stop: function (tween) {
			// Store the new tween details in the item
			this._tweens.pull(tween);
			
			if (!this._tweens.length) {
				// Disable tweening on this item as there are
				// no more tweens to process
				this.disable();
			}
			
			return this;
		},
		
		/**
		 * Stop all tweening for the object.
		 */
		stopAll: function () {
			// Disable tweening
			this.disable();
			
			// Remove all tween details
			delete this._tweens;
			this._tweens = [];
			
			return this;
		},
		
		/**
		 * Enable tweening for the object.
		 */
		enable: function () {
			// Check if the item is currently tweening
			if (!this._tweening) {
				// Set the item to tweening
				this._tweening = true;
			}
			
			return this;
		},
		
		/**
		 * Disable tweening for the object.
		 */
		disable: function () {
			// Check if the item is currently tweening
			if (this._tweening) {
				// Set the item to not tweening
				this._tweening = false;
			}
			
			return this;
		},
		
		/**
		 * Process tweening for the object.
		 */
		update: function (ctx) {
			var thisTween = this.tween;
			if (thisTween._tweens && thisTween._tweens.length) {
				var currentTime = ige._tickStart,
					tweens = thisTween._tweens,
					tweenCount = tweens.length,
					tween,
					deltaTime,
					destTime,
					easing,
					item,
					targetProp,
					targetPropVal,
					targets,
					targetIndex,
					stepIndex,
					stopped,
					currentDelta;
				
				// Loop the item's tweens
				while (tweenCount--) {
					tween = tweens[tweenCount];
					stopped = false;
					
					// Check if we should be starting this tween yet
					if (tween._started || currentTime >= tween._startTime) {
						if (!tween._started) {
							// Check if the tween's step is -1 indicating no step
							// data has been set up yet
							if (tween._currentStep === -1) {
								// Setup the tween step now
								tween._currentStep = 0;
								thisTween._setupStep(tween, false);
							}
							
							// Check if we have a beforeTween callback to fire
							if (typeof(tween._beforeTween) === 'function') {
								// Fire the beforeTween callback
								tween._beforeTween(tween);
								
								// Delete the callback so we don't store it any longer
								delete tween._beforeTween;
							}
							
							// Check if we have a beforeStep callback to fire
							if (typeof(tween._beforeStep) === 'function') {
								// Fire the beforeStep callback
								if (tween._stepDirection) {
									stepIndex = tween._steps.length - (tween._currentStep + 1);
								} else {
									stepIndex = tween._currentStep;
								}
								tween._beforeStep(tween, stepIndex);
							}
							
							tween._started = true;
						}
						
						deltaTime = currentTime - tween._startTime; // Delta from start time to current time
						destTime = tween._destTime;
						easing = tween._selectedEasing;
						
						// Check if the tween has reached it's destination based upon
						// the current time
						if (deltaTime >= destTime) {
							// The tween time indicates the tween has ended so set to
							// the ending value
							targets = tween._targetData;
							
							for (targetIndex in targets) {
								if (targets.hasOwnProperty(targetIndex)) {
									item = targets[targetIndex];
									targetProp = item.targetObj;
									targetPropVal = targetProp[item.propName];
									
									// Check if the destination time is not zero
									// because otherwise the easing method will provide
									// a divide by zero error resulting in a NaN value
									if (destTime !== 0) {
										// Add the delta amount to destination
										currentDelta = thisTween.easing[easing](
											destTime,
											item.deltaVal,
											destTime
										);
									} else {
										currentDelta = item.deltaVal;
									}
									
									targetPropVal += currentDelta - item.oldDelta;
									
									// Round the value to correct floating point operation imprecision
									var roundingPrecision = Math.pow(10, 15-(targetPropVal.toFixed(0).toString().length));
									targetProp[item.propName] = Math.round(targetPropVal * roundingPrecision)/roundingPrecision;
								}
							}
							
							// Check if we have a afterStep callback to fire
							if (typeof(tween._afterStep) === 'function') {
								// Fire the afterStep
								if (tween._stepDirection) {
									stepIndex = tween._steps.length - (tween._currentStep + 1);
								} else {
									stepIndex = tween._currentStep;
								}
								tween._afterStep(tween, stepIndex);
							}
							
							if (tween._steps.length === tween._currentStep + 1) {
								// The tween has ended, is the tween repeat mode enabled?
								if (tween._repeatMode) {
									// We have a repeat mode, lets check for a count
									if (tween._repeatCount !== -1) {
										// Check if the repeat count has reached the
										// number of repeats we wanted
										tween._repeatedCount++;
										if (tween._repeatCount === tween._repeatedCount) {
											// The tween has ended
											stopped = true;
										}
									}
									
									if (!stopped) {
										// Work out what mode we're running on
										if (tween._repeatMode === 1) {
											tween._currentStep = 0;
										}
										
										if (tween._repeatMode === 2) {
											// We are on "reverse loop" mode so now
											// reverse the tween's steps and then
											// start from step zero
											tween._stepDirection = !tween._stepDirection;
											tween._steps.reverse();
											
											tween._currentStep = 1;
										}
										
										// Check if we have a stepsComplete callback to fire
										if (typeof(tween._stepsComplete) === 'function') {
											// Fire the stepsComplete callback
											tween._stepsComplete(tween, tween._currentStep);
										}
										
										// Check if we have a beforeStep callback to fire
										if (typeof(tween._beforeStep) === 'function') {
											// Fire the beforeStep callback
											if (tween._stepDirection) {
												stepIndex = tween._steps.length - (tween._currentStep + 1);
											} else {
												stepIndex = tween._currentStep;
											}
											tween._beforeStep(tween, stepIndex);
										}
										
										thisTween._setupStep(tween, true);
									}
								} else {
									stopped = true;
								}
								
								if (stopped) {
									// Now stop tweening this tween
									tween.stop();
									
									// If there is a callback, call it
									if (typeof(tween._afterTween) === 'function') {
										// Fire the afterTween callback
										tween._afterTween(tween);
										
										// Delete the callback so we don't store it any longer
										delete tween._afterTween;
									}
								}
							} else {
								// Start the next step
								tween._currentStep++;
								
								// Check if we have a beforeStep callback to fire
								if (typeof(tween._beforeStep) === 'function') {
									// Fire the beforeStep callback
									if (tween._stepDirection) {
										stepIndex = tween._steps.length - (tween._currentStep + 1);
									} else {
										stepIndex = tween._currentStep;
									}
									tween._beforeStep(tween, stepIndex);
								}
								
								thisTween._setupStep(tween, true);
							}
							
							if (typeof(tween._afterChange) === 'function') {
								tween._afterChange(tween, stepIndex);
							}
						} else {
							// The tween is still active, process the tween by passing it's details
							// to the selected easing method
							targets = tween._targetData;
							
							for (targetIndex in targets) {
								if (targets.hasOwnProperty(targetIndex)) {
									item = targets[targetIndex];
									var currentDelta = thisTween.easing[easing](
										deltaTime,
										item.deltaVal,
										destTime
									);
									item.targetObj[item.propName] += currentDelta - item.oldDelta;
									item.oldDelta = currentDelta;
								}
							}
							
							if (typeof(tween._afterChange) === 'function') {
								tween._afterChange(tween, stepIndex);
							}
						}
					}
				}
			}
		},
		
		/** tweenEasing - Contains all the tween easing functions. {
		category:"property",
		type:"object",
	} **/
		easing: {
			// Easing equations converted from AS to JS from original source at
			// http://robertpenner.com/easing/
			none: function(t, c, d) {
				return c*t/d;
			},
			inQuad: function(t, c, d) {
				return c*(t/=d)*t;
			},
			outQuad: function(t, c, d) {
				return -c *(t/=d)*(t-2);
			},
			inOutQuad: function(t, c, d) {
				if((t/=d/2) < 1) { return c/2*t*t; }
				return -c/2 *((--t)*(t-2) - 1);
			},
			inCubic: function(t, c, d) {
				return c*(t/=d)*t*t;
			},
			outCubic: function(t, c, d) {
				return c*((t=t/d-1)*t*t + 1);
			},
			inOutCubic: function(t, c, d) {
				if((t/=d/2) < 1) { return c/2*t*t*t; }
				return c/2*((t-=2)*t*t + 2);
			},
			outInCubic: function(t, c, d) {
				if(t < d/2) { return this.outCubic(t*2, c/2, d); }
				return this.inCubic((t*2)-d, c/2, c/2, d);
			},
			inQuart: function(t, c, d) {
				return c*(t/=d)*t*t*t;
			},
			outQuart: function(t, c, d) {
				return -c *((t=t/d-1)*t*t*t - 1);
			},
			inOutQuart: function(t, c, d) {
				if((t/=d/2) < 1) { return c/2*t*t*t*t; }
				return -c/2 *((t-=2)*t*t*t - 2);
			},
			outInQuart: function(t, c, d) {
				if(t < d/2) { return this.outQuart(t*2, c/2, d); }
				return this.inQuart((t*2)-d, c/2, c/2, d);
			},
			inQuint: function(t, c, d) {
				return c*(t/=d)*t*t*t*t;
			},
			outQuint: function(t, c, d) {
				return c*((t=t/d-1)*t*t*t*t + 1);
			},
			inOutQuint: function(t, c, d) {
				if((t/=d/2) < 1) { return c/2*t*t*t*t*t; }
				return c/2*((t-=2)*t*t*t*t + 2);
			},
			outInQuint: function(t, c, d) {
				if(t < d/2) { return this.outQuint(t*2, c/2, d); }
				return this.inQuint((t*2)-d, c/2, c/2, d);
			},
			inSine: function(t, c, d) {
				return -c * Math.cos(t/d *(Math.PI/2)) + c;
			},
			outSine: function(t, c, d) {
				return c * Math.sin(t/d *(Math.PI/2));
			},
			inOutSine: function(t, c, d) {
				return -c/2 *(Math.cos(Math.PI*t/d) - 1);
			},
			outInSine: function(t, c, d) {
				if(t < d/2) { return this.outSine(t*2, c/2, d); }
				return this.inSine((t*2)-d, c/2, c/2, d);
			},
			inExpo: function(t, c, d) {
				return(t === 0) ? 0 : c * Math.pow(2, 10 *(t/d - 1)) - c * 0.001;
			},
			outExpo: function(t, c, d) {
				return(t === d) ? c : c * 1.001 *(-Math.pow(2, -10 * t/d) + 1);
			},
			inOutExpo: function(t, c, d) {
				if(t === 0) { return 0; }
				if(t === d) { return c; }
				if((t/=d/2) < 1) { return c/2 * Math.pow(2, 10 *(t - 1)) - c * 0.0005; }
				return c/2 * 1.0005 *(-Math.pow(2, -10 * --t) + 2);
			},
			outInExpo: function(t, c, d) {
				if(t < d/2) { return this.outExpo(t*2, c/2, d); }
				return this.inExpo((t*2)-d, c/2, c/2, d);
			},
			inCirc: function(t, c, d) {
				return -c *(Math.sqrt(1 -(t/=d)*t) - 1);
			},
			outCirc: function(t, c, d) {
				return c * Math.sqrt(1 -(t=t/d-1)*t);
			},
			inOutCirc: function(t, c, d) {
				if((t/=d/2) < 1) { return -c/2 *(Math.sqrt(1 - t*t) - 1); }
				return c/2 *(Math.sqrt(1 -(t-=2)*t) + 1);
			},
			outInCirc: function(t, c, d) {
				if(t < d/2) { return this.outCirc(t*2, c/2, d); }
				return this.inCirc((t*2)-d, c/2, c/2, d);
			},
			inElastic: function(t, c, d, a, p) {
				var s;
				if(t===0) {return 0;}
				if((t/=d)===1) { return c; }
				if(!p) { p=d*0.3; }
				if(!a || a < Math.abs(c)) { a=c; s=p/4; } else { s = p/(2*Math.PI) * Math.asin(c/a); }
				return -(a*Math.pow(2,10*(t-=1)) * Math.sin((t*d-s)*(2*Math.PI)/p ));
			},
			outElastic: function(t, c, d, a, p) {
				var s;
				if(t===0) { return 0; }
				if((t/=d)===1) { return c; }
				if(!p) { p=d*0.3; }
				if(!a || a < Math.abs(c)) { a=c; s=p/4; } else { s = p/(2*Math.PI) * Math.asin(c/a); }
				return(a*Math.pow(2,-10*t) * Math.sin((t*d-s)*(2*Math.PI)/p ) + c);
			},
			inOutElastic: function(t, c, d, a, p) {
				var s;
				if(t===0) { return 0; }
				if((t/=d/2)===2) { return c; }
				if(!p) { p=d*(0.3*1.5); }
				if(!a || a < Math.abs(c)) { a=c; s=p/4; } else { s = p/(2*Math.PI) * Math.asin(c/a); }
				if(t < 1) { return -0.5*(a*Math.pow(2,10*(t-=1)) * Math.sin((t*d-s)*(2*Math.PI)/p)); }
				return a*Math.pow(2,-10*(t-=1)) * Math.sin((t*d-s)*(2*Math.PI)/p )*0.5 + c;
			},
			outInElastic: function(t, c, d, a, p) {
				if(t < d/2) { return this.outElastic(t*2, c/2, d, a, p); }
				return this.inElastic((t*2)-d, c/2, c/2, d, a, p);
			},
			inBack: function(t, c, d, s) {
				if(s === undefined) { s = 1.70158; }
				return c*(t/=d)*t*((s+1)*t - s);
			},
			outBack: function(t, c, d, s) {
				if(s === undefined) { s = 1.70158; }
				return c*((t=t/d-1)*t*((s+1)*t + s) + 1);
			},
			inOutBack: function(t, c, d, s) {
				if(s === undefined) { s = 1.70158; }
				if((t/=d/2) < 1) { return c/2*(t*t*(((s*=(1.525))+1)*t - s)); }
				return c/2*((t-=2)*t*(((s*=(1.525))+1)*t + s) + 2);
			},
			outInBack: function(t, c, d, s) {
				if(t < d/2) { return this.outBack(t*2, c/2, d, s); }
				return this.inBack((t*2)-d, c/2, c/2, d, s);
			},
			inBounce: function(t, c, d) {
				return c - this.outBounce(d-t, 0, c, d);
			},
			outBounce: function(t, c, d) {
				if((t/=d) <(1/2.75)) {
					return c*(7.5625*t*t);
				} else if(t <(2/2.75)) {
					return c*(7.5625*(t-=(1.5/2.75))*t + 0.75);
				} else if(t <(2.5/2.75)) {
					return c*(7.5625*(t-=(2.25/2.75))*t + 0.9375);
				} else {
					return c*(7.5625*(t-=(2.625/2.75))*t + 0.984375);
				}
			},
			inOutBounce: function(t, c, d) {
				if(t < d/2) {
					return this.inBounce(t*2, 0, c, d) * 0.5;
				} else {
					return this.outBounce(t*2-d, 0, c, d) * 0.5 + c*0.5;
				}
			},
			outInBounce: function(t, c, d) {
				if(t < d/2) { return this.outBounce(t*2, c/2, d); }
				return this.inBounce((t*2)-d, c/2, c/2, d);
			}
		}
	});
	
	return IgeTweenComponent;
});
},{"irrelon-appcore":67}],14:[function(_dereq_,module,exports){
"use strict";

var appCore = _dereq_('irrelon-appcore');

appCore.module('IgeUiManagerComponent', function (IgeClass) {
	var IgeUiManagerComponent = IgeClass.extend({
		classId: 'IgeUiManagerComponent',
		componentId: 'ui',
		
		init: function (entity, options) {
			var self = this;
			
			this._entity = entity;
			this._options = options;
			
			this._focus = null; // The element that currently has focus
			this._caret = null; // The caret position within the focused element
			this._register = [];
			this._styles = {};
			this._elementsByStyle = {};
			
			ige.input.on('keyDown', function (event) { self._keyDown(event); });
		},
		
		/**
		 * Get / set a style by name.
		 * @param {String} name The unique name of the style.
		 * @param {Object=} data The style properties and values to assign to the
		 * style.
		 * @returns {*}
		 */
		style: function (name, data) {
			if (name !== undefined) {
				if (data !== undefined) {
					// Set the data against the name, update any elements using the style
					this._styles[name] = data;
					return this;
				}
				
				// Get the data and return
				return this._styles[name];
			}
			
			return this;
		},
		
		/**
		 * Registers a UI element with the UI manager.
		 * @param elem
		 */
		registerElement: function (elem) {
			this._register.push(elem);
		},
		
		/**
		 * Un-registers a UI element with the UI manager.
		 * @param elem
		 */
		unRegisterElement: function (elem) {
			this._register.pull(elem);
			
			// Kill any styles defined for this element id
			delete this._styles['#' + elem._id];
			
			delete this._styles['#' + elem._id + ':active'];
			delete this._styles['#' + elem._id + ':focus'];
			delete this._styles['#' + elem._id + ':hover'];
		},
		
		/**
		 * Registers a UI element against a style for quick lookup.
		 * @param elem
		 */
		registerElementStyle: function (elem) {
			if (elem && elem._styleClass) {
				this._elementsByStyle[elem._styleClass] = this._elementsByStyle[elem._styleClass] || [];
				this._elementsByStyle[elem._styleClass].push(elem);
			}
		},
		
		/**
		 * Un-registers a UI element from a style.
		 * @param elem
		 */
		unRegisterElementStyle: function (elem) {
			if (elem && elem._styleClass) {
				this._elementsByStyle[elem._styleClass] = this._elementsByStyle[elem._styleClass] || [];
				this._elementsByStyle[elem._styleClass].push(elem);
			}
		},
		
		canFocus: function (elem) {
			return elem._allowFocus;
		},
		
		focus: function (elem) {
			if (elem !== undefined) {
				if (elem !== this._focus) {
					// The element is not our current focus so focus to it
					var previousFocus = this._focus;
					
					// Tell the current focused element that it is about to loose focus
					if (!previousFocus || !previousFocus.emit('blur', elem)) {
						if (previousFocus) {
							previousFocus._focused = false;
							previousFocus.blur();
						}
						
						// The blur was not cancelled
						if (!elem.emit('focus', previousFocus)) {
							// The focus was not cancelled
							this._focus = elem;
							elem._focused = true;
							
							return true;
						}
					}
				} else {
					// We are already focused
					return true;
				}
			}
			
			return false;
		},
		
		blur: function (elem) {
			//console.log('blur', elem._id, elem);
			if (elem !== undefined) {
				if (elem === this._focus) {
					// The element is currently focused
					// Tell the current focused element that it is about to loose focus
					if (!elem.emit('blur')) {
						// The blur was not cancelled
						this._focus = null;
						elem._focused = false;
						elem._updateStyle();
						
						return true;
					}
				}
			}
			
			return false;
		},
		
		_keyUp: function (event) {
			// Direct the key event to the focused element
			if (this._focus) {
				this._focus.emit('keyUp', event);
				ige.input.stopPropagation();
			}
		},
		
		_keyDown: function (event) {
			// Direct the key event to the focused element
			if (this._focus) {
				this._focus.emit('keyDown', event);
				ige.input.stopPropagation();
			}
		}
	});
	
	return IgeUiManagerComponent;
});
},{"irrelon-appcore":67}],15:[function(_dereq_,module,exports){
"use strict";

var appCore = _dereq_('irrelon-appcore');

appCore.module('IgeVelocityComponent', function (IgeClass, IgePoint3d) {
	// TODO: Doc this class!
	var IgeVelocityComponent = IgeClass.extend({
		classId: 'IgeVelocityComponent',
		componentId: 'velocity',
		
		init: function (entity, options) {
			this._entity = entity;
			
			this._velocity = new IgePoint3d(0, 0, 0);
			this._friction = new IgePoint3d(1, 1, 1);
			
			// Add the velocity behaviour to the entity
			entity.addBehaviour('velocity', this._behaviour);
		},
		
		/**
		 * The behaviour method executed each tick.
		 * @param ctx
		 * @private
		 */
		_behaviour: function (ctx) {
			this.velocity.tick(ctx);
		},
		
		byAngleAndPower: function (radians, power, relative) {
			var vel = this._velocity,
				x = Math.cos(radians) * power,
				y = Math.sin(radians) * power,
				z = 0;
			
			if (!relative) {
				vel.x = x;
				vel.y = y;
				vel.z = z;
			} else {
				vel.x += x;
				vel.y += y;
				vel.z += z;
			}
			
			return this._entity;
		},
		
		xyz: function (x, y, z, relative) {
			var vel = this._velocity;
			
			if (!relative) {
				vel.x = x;
				vel.y = y;
				vel.z = z;
			} else {
				vel.x += x;
				vel.y += y;
				vel.z += z;
			}
			
			return this._entity;
		},
		
		x: function (x, relative) {
			var vel = this._velocity;
			
			if (!relative) {
				vel.x = x;
			} else {
				vel.x += x;
			}
			
			return this._entity;
		},
		
		y: function (y, relative) {
			var vel = this._velocity;
			
			if (!relative) {
				vel.y = y;
			} else {
				vel.y += y;
			}
			
			return this._entity;
		},
		
		z: function (z, relative) {
			var vel = this._velocity;
			
			if (!relative) {
				vel.z = y;
			} else {
				vel.z += z;
			}
			
			return this._entity;
		},
		
		vector3: function (vector, relative) {
			if (typeof(vector.scale) !== 'number') {
				vector.scale = 1; // Default to 1
			}
			
			var vel = this._velocity,
				x = vector.x,
				y = vector.y,
				z = vector.z;
			
			if (!relative) {
				vel.x = x;
				vel.y = y;
				vel.z = z;
			} else {
				vel.x += x;
				vel.y += y;
				vel.z += z;
			}
			
			return this._entity;
		},
		
		friction: function (val) {
			var finalFriction = 1 - val;
			
			if (finalFriction < 0) {
				finalFriction = 0;
			}
			
			this._friction = new IgePoint3d(finalFriction, finalFriction, finalFriction);
			
			return this._entity;
		},
		
		linearForce: function (degrees, power) {
			power /= 1000;
			var radians = (degrees * Math.PI / 180),
				x = Math.cos(radians) * power,
				y = Math.sin(radians) * power,
				z = x * y;
			this._linearForce = new IgePoint3d(x, y, z);
			
			return this._entity;
		},
		
		linearForceXYZ: function (x, y, z) {
			this._linearForce = new IgePoint3d(x, y, z);
			return this._entity;
		},
		
		linearForceVector3: function (vector, power, relative) {
			var force = this._linearForce = this._linearForce || new IgePoint3d(0, 0, 0),
				x = vector.x / 1000,
				y = vector.y / 1000,
				z = vector.z / 1000;
			
			if (!relative) {
				force.x = x || 0;
				force.y = y || 0;
				force.z = z || 0;
			} else {
				force.x += x || 0;
				force.y += y || 0;
				force.z += z || 0;
			}
			
			return this._entity;
		},
		
		_applyLinearForce: function (delta) {
			if (this._linearForce) {
				var vel = this._velocity;
				
				vel.x += (this._linearForce.x * delta);
				vel.y += (this._linearForce.y * delta);
				vel.z += (this._linearForce.z * delta);
			}
		},
		
		_applyFriction: function () {
			var vel = this._velocity,
				fric = this._friction;
			
			vel.x *= fric.x;
			vel.y *= fric.y;
			vel.z *= fric.z;
		},
		
		tick: function (ctx) {
			var delta = ige._tickDelta,
				vel = this._velocity,
				x, y, z;
			
			if (delta) {
				this._applyLinearForce(delta);
				//this._applyFriction();
				
				x = vel.x * delta;
				y = vel.y * delta;
				z = vel.z * delta;
				
				if (x || y || z) {
					this._entity.translateBy(x, y, z);
				}
			}
		}
	});
	
	return IgeVelocityComponent;
});
},{"irrelon-appcore":67}],16:[function(_dereq_,module,exports){
"use strict";

var appCore = _dereq_('irrelon-appcore');

appCore.module('IgeAudio', function (IgeEventingClass) {
	var IgeAudio = IgeEventingClass.extend({
		classId: 'IgeAudio',
		
		init: function (url) {
			if (url) {
				this.load(url);
			}
		},
		
		/**
		 * Gets / sets the current object id. If no id is currently assigned and no
		 * id is passed to the method, it will automatically generate and assign a
		 * new id as a 16 character hexadecimal value typed as a string.
		 * @param {String=} id The id to set to.
		 * @return {*} Returns this when setting the value or the current value if none is specified.
		 */
		id: function (id) {
			if (id !== undefined) {
				// Check if this ID already exists in the object register
				if (ige._register[id]) {
					if (ige._register[id] === this) {
						// We are already registered as this id
						return this;
					}
					
					// Already an object with this ID!
					this.log('Cannot set ID of object to "' + id + '" because that ID is already in use by another object!', 'error');
				} else {
					// Check if we already have an id assigned
					if (this._id && ige._register[this._id]) {
						// Unregister the old ID before setting this new one
						ige.unRegister(this);
					}
					
					this._id = id;
					
					// Now register this object with the object register
					ige.register(this);
					
					return this;
				}
			}
			
			if (!this._id) {
				// The item has no id so generate one automatically
				if (this._url) {
					// Generate an ID from the URL string of the audio file
					// this instance is using. Useful for always reproducing
					// the same ID for the same file :)
					this._id = ige.newIdFromString(this._url);
				} else {
					// We don't have a URL so generate a random ID
					this._id = ige.newIdHex();
				}
				ige.register(this);
			}
			
			return this._id;
		},
		
		/**
		 * Loads an audio file from the given url.
		 * @param {String} url The url to load the audio file from.
		 * @param {Function=} callback Optional callback method to call when the audio
		 * file has loaded or on error.
		 */
		load: function (url, callback) {
			var self = this,
				request = new XMLHttpRequest();
			
			request.open('GET', url, true);
			request.responseType = 'arraybuffer';
			
			// Decode asynchronously
			request.onload = function() {
				self._data = request.response;
				self._url = url;
				self._loaded(callback);
			};
			
			request.onerror = function (err) {
				callback.apply(self, [err]);
			};
			
			request.send();
		},
		
		_loaded: function (callback) {
			var self = this;
			
			ige.audio.decode(self._data, function(err, buffer) {
				if (!err) {
					self._buffer = buffer;
					ige.audio.log('Audio file (' + self._url + ') loaded successfully');
					
					if (callback) { callback.apply(self, [false]); }
				} else {
					self.log('Failed to decode audio data from: ' + self._url, 'warning');
					if (callback) { callback.apply(self, [err]); }
				}
			});
		},
		
		/**
		 * Plays the audio.
		 */
		play: function () {
			var self = this,
				bufferSource;
			
			if (self._buffer) {
				bufferSource = ige.audio._ctx.createBufferSource();
				bufferSource.buffer = self._buffer;
				bufferSource.connect(ige.audio._ctx.destination);
				bufferSource.start(0);
			}
		}
	});
	
	return IgeAudio;
});
},{"irrelon-appcore":67}],17:[function(_dereq_,module,exports){
"use strict";

var appCore = _dereq_('irrelon-appcore');

appCore.module('IgeAudioComponent', function (IgeEventingClass, IgeAudio) {
	/**
	 * Manages audio mixing and output.
	 */
	var IgeAudioComponent = IgeEventingClass.extend({
		classId: 'IgeAudioComponent',
		componentId: 'audio',
		
		init: function (entity, options) {
			this._active = false;
			this._disabled = false;
			this._ctx = this.getContext();
			
			if (!this._ctx) {
				this.log('No web audio API support, cannot play sounds!', 'warning');
				this._disabled = true;
				return;
			}
			
			this.log('Web audio API connected successfully');
		},
		
		/**
		 * Gets / sets the active flag to enable or disable audio support.
		 * @param {Boolean=} val True to enable audio support.
		 * @returns {*}
		 */
		active: function (val) {
			if (val !== undefined && !this._disabled) {
				this._active = val;
				return this;
			}
			
			return this._active;
		},
		
		/**
		 * Returns an audio context.
		 * @returns {*}
		 */
		getContext: function () {
			var ctxProto = window.AudioContext || window.webkitAudioContext;
			
			if (ctxProto) {
				return new ctxProto();
			} else {
				return undefined;
			}
		},
		
		/**
		 * Loads an audio file from the given url and assigns it the id specified.
		 * @param {String} url The url to load the audio from.
		 * @param {String=} id The id to assign the audio.
		 */
		load: function (url, id) {
			var audio = new IgeAudio(url);
			
			if (id) {
				audio.id(id);
			}
		},
		
		/**
		 * Decodes audio data and calls back with an audio buffer.
		 * @param {ArrayBuffer} data The audio data to decode.
		 * @param {Function} callback The callback to pass the buffer to.
		 */
		decode: function (data, callback) {
			this._ctx.decodeAudioData(data, function (buffer) {
				callback(false, buffer);
			}, function (err) {
				callback(err);
			});
		},
		
		/**
		 * Plays audio by its assigned id.
		 * @param {String} id The id of the audio file to play.
		 */
		play: function (id) {
			var audio = ige.$(id);
			if (audio) {
				if (audio.prototype.play) {
					audio.play();
				} else {
					this.log('Trying to play audio with id "" but object with this id is not an IgeAudio instance, or does not implement the .play() method!', 'warnign');
				}
			}
		}
	});
	
	return IgeAudioComponent;
});
},{"irrelon-appcore":67}],18:[function(_dereq_,module,exports){
"use strict";

var appCore = _dereq_('irrelon-appcore');

appCore.module('IgeCocoonJsComponent', function (IgeEventingClass) {
	var IgeCocoonJsComponent = IgeEventingClass.extend({
		classId: 'IgeCocoonJsComponent',
		componentId: 'cocoonJs',
		
		init: function () {
			this.detected = typeof(ext) !== 'undefined' && typeof(ext.IDTK_APP) !== 'undefined';
			
			if (this.detected) {
				this.log('CocoonJS support enabled!');
			}
		},
		
		// TODO: Finish keyboard implementation
		showInputDialog: function(title, message, initialValue, type, cancelText, okText) {
			if (this.detected) {
				title = title || '';
				message = message || '';
				initialValue = initialValue || '';
				type = type || 'text';
				cancelText = cancelText || 'Cancel';
				okText = okText || 'OK';
				
				ext.IDTK_APP.makeCall(
					'showTextDialog',
					title,
					message,
					initialValue,
					type,
					cancelText,
					okText
				);
			} else {
				this.log('Cannot open CocoonJS input dialog! CocoonJS is not detected!', 'error');
			}
		},
		
		/**
		 * Asks the API to load the url and show the web view.
		 * @param url
		 */
		showWebView: function (url) {
			if (this.detected) {
				// Forward a JS call to the webview IDTK API
				ext.IDTK_APP.makeCall("forward", "ext.IDTK_APP.makeCall('loadPath', '" + url + "')");
				ext.IDTK_APP.makeCall("forward", "ext.IDTK_APP.makeCall('show');");
			}
		},
		
		/**
		 * Asks the API to hide the web view.
		 */
		hideWebView: function () {
			if (this.detected) {
				// Forward a JS call to the webview IDTK API
				ext.IDTK_APP.makeCall("forward", "ext.IDTK_APP.makeCall('hide');");
			}
		}
	});
	
	return IgeCocoonJsComponent;
});
},{"irrelon-appcore":67}],19:[function(_dereq_,module,exports){
"use strict";

var appCore = _dereq_('irrelon-appcore');

appCore.module('IgeEditorComponent', function (IgeEventingClass, IgeEditorTranslateComponent, IgeEditorRotateComponent) {
	/**
	 * The IGE interactive editor component. Allows modification of a simulation
	 * in realtime via a GUI.
	 */
	var IgeEditorComponent = IgeEventingClass.extend({
		classId: 'IgeEditorComponent',
		componentId: 'editor',
		
		/**
		 * @constructor
		 * @param {IgeObject} entity The object that the component is added to.
		 * @param {Object=} options The options object that was passed to the
		 * component during the call to addComponent.
		 */
		init: function (entity, options) {
			var self = this;
			
			this._entity = entity;
			this._options = options;
			this._showStats = 0;
			
			this._templateCache = {};
			this._cacheTemplates = true;
			
			this.ui = {};
			
			this._interceptMouse = false;
			
			// Hook the input component's keyUp and check for the = symbol... if there, toggle editor
			this._activateKeyHandle = ige.input.on('keyUp', function (event) {
				if (event.keyIdentifier === "U+00BB") {
					// = key pressed, toggle the editor
					self.toggle();
					
					// Return true to stop this event from being emitted by the engine to the scenegraph
					return true;
				}
			});
			
			// Hook the input component's keyUp and check for the - symbol... if there, toggle stats
			this._activateKeyHandle = ige.input.on('keyUp', function (event) {
				if (event.keyIdentifier === "U+00BD") {
					// Toggle the stats
					self.toggleStats();
					
					// Return true to stop this event from being emitted by the engine to the scenegraph
					return true;
				}
			});
			
			// Hook the engine's input system and take over mouse interaction
			this._mouseUpHandle = ige.input.on('preMouseUp', function (event) {
				if (self._enabled && self._interceptMouse) {
					self.emit('mouseUp', event);
					
					// Return true to stop this event from being emitted by the engine to the scenegraph
					return true;
				}
			});
			
			this._mouseDownHandle = ige.input.on('preMouseDown', function (event) {
				if (self._enabled && self._interceptMouse) {
					self.emit('mouseDown', event);
					
					// Return true to stop this event from being emitted by the engine to the scenegraph
					return true;
				}
			});
			
			this._mouseMoveHandle = ige.input.on('preMouseMove', function (event) {
				if (self._enabled && self._interceptMouse) {
					self.emit('mouseMove', event);
					
					// Return true to stop this event from being emitted by the engine to the scenegraph
					return true;
				}
			});
			
			this._contextMenuHandle = ige.input.on('preContextMenu', function (event) {
				if (self._enabled && self._interceptMouse) {
					self.emit('contextMenu', event);
					
					// Return true to stop this event from being emitted by the engine to the scenegraph
					return true;
				}
			});
			
			// Load jsRender for HTML template support
			ige.requireScript(igeRoot + 'components/editor/vendor/jsRender.js');
			
			// Load jQuery, the editor will use it for DOM manipulation simplicity
			ige.requireScript(igeRoot + 'components/editor/vendor/jquery.2.0.3.min.js');
			
			ige.on('allRequireScriptsLoaded', function () {
				// Stop drag-drop of files over the page from doing a redirect and leaving the page
				$(function () {
					$('body')
						.on('dragover', function (e) {
							e.preventDefault();
						})
						.on('drop', function (e) {
							e.preventDefault();
						});
				});
				
				// Load editor html into the DOM
				self.loadHtml(igeRoot + 'components/editor/root.html', function (html) {
					// Add the html
					$('body').append($(html));
					
					ige.requireScript(igeRoot + 'components/editor/vendor/jsrender-helpers.js');
					
					// Object mutation observer polyfill
					ige.requireScript(igeRoot + 'components/editor/vendor/observe.js');
					
					// Load plugin styles
					ige.requireStylesheet(igeRoot + 'components/editor/vendor/glyphicons/css/halflings.css');
					ige.requireStylesheet(igeRoot + 'components/editor/vendor/glyphicons/css/glyphicons.css');
					ige.requireStylesheet(igeRoot + 'components/editor/vendor/treeview_simple/css/style.css');
					
					// Load the editor stylesheet
					ige.requireStylesheet(igeRoot + 'components/editor/css/editor.css');
					
					// Listen for scenegraph tree selection updates
					ige.on('sgTreeSelectionChanged', function (objectId) {
						self._objectSelected(ige.$(objectId));
					});
					
					// Wait for all required files to finish loading
					ige.on('allRequireScriptsLoaded', function () {
						// Load UI scripts
						ige.sync(ige.requireScript, igeRoot + 'components/editor/ui/dialogs/dialogs.js');
						ige.sync(ige.requireScript, igeRoot + 'components/editor/ui/scenegraph/scenegraph.js');
						ige.sync(ige.requireScript, igeRoot + 'components/editor/ui/menu/menu.js');
						ige.sync(ige.requireScript, igeRoot + 'components/editor/ui/toolbox/toolbox.js');
						ige.sync(ige.requireScript, igeRoot + 'components/editor/ui/panels/panels.js');
						ige.sync(ige.requireScript, igeRoot + 'components/editor/ui/textures/textures.js');
						ige.sync(ige.requireScript, igeRoot + 'components/editor/ui/textureEditor/textureEditor.js');
						ige.sync(ige.requireScript, igeRoot + 'components/editor/ui/animationEditor/animationEditor.js');
						
						// Load jquery plugins
						ige.sync(ige.requireScript, igeRoot + 'components/editor/vendor/autoback.jquery.js');
						ige.sync(ige.requireScript, igeRoot + 'components/editor/vendor/tree/tree.jquery.js');
						ige.sync(ige.requireScript, igeRoot + 'components/editor/vendor/tabs/tabs.jquery.js');
						ige.sync(ige.requireScript, igeRoot + 'components/editor/vendor/treeview_simple/treeview_simple.jquery.js');
						
						ige.on('syncComplete', function () {
							// Observe changes to the engine to update our display
							setInterval(function () {
								// Update the stats counters
								$('#editorFps').html(ige._fps + ' fps');
								$('#editorDps').html(ige._dps + ' dps');
								$('#editorDpf').html(ige._dpf + ' dpf');
								$('#editorUd').html(ige._updateTime + ' ud/ms');
								$('#editorRd').html(ige._renderTime + ' rd/ms');
								$('#editorTd').html(ige._tickTime + ' td/ms');
							}, 1000);
							
							// Add auto-backing
							$('.backed').autoback();
							
							// Call finished on all ui instances
							for (var i in self.ui) {
								if (self.ui.hasOwnProperty(i)) {
									if (self.ui[i].ready) {
										self.ui[i].ready();
									}
								}
							}
							
							// Enable tabs
							$('.tabGroup').tabs();
							
							// Enable the stats toggle button
							$('#statsToggle').on('click', function () {
								ige.editor.toggleStats();
							});
							
							// Enable the editor toggle button
							$('#editorToggle').on('click', function () {
								ige.editor.toggle();
							});
						}, null, true);
					}, null, true);
				});
			}, null, true);
			
			// Set the component to inactive to start with
			this._enabled = false;
			this._show = false;
			
			// Set object create defaults
			this.objectDefault = {
				'IgeTextureMap': {
					drawGrid: 100
				}
			};
			
			this.log('Init complete');
		},
		
		interceptMouse: function (val) {
			this._interceptMouse = val;
		},
		
		/**
		 * Gets / sets the enabled flag. If set to true,
		 * operations will be processed. If false, no operations will
		 * occur.
		 * @param {Boolean=} val
		 * @return {*}
		 */
		enabled: function (val) {
			var self = this;
			
			if (val !== undefined) {
				this._enabled = val;
				return this._entity;
			}
			
			return this._enabled;
		},
		
		toggle: function () {
			var elem = $('#editorToggle');
			
			if (elem.hasClass('active')) {
				ige.editor.hide();
			} else {
				ige.editor.show();
			}
		},
		
		show: function () {
			this.enabled(true);
			this._show = true;
			
			$('#editorToggle')
				.html('Editor On')
				.removeClass('active')
				.addClass('active');
			
			$('.editorElem.toggleHide').addClass('shown');
		},
		
		hide: function () {
			this.enabled(false);
			this._show = false;
			
			$('#editorToggle')
				.html('Editor Off')
				.removeClass('active');
			
			$('.editorElem.toggleHide').removeClass('shown');
		},
		
		toggleStats: function () {
			var elem = $('#statsToggle');
			
			if (elem.hasClass('active')) {
				ige.editor.hideStats();
			} else {
				ige.editor.showStats();
			}
		},
		
		showStats: function () {
			$('#statsToggle')
				.html('Stats On')
				.removeClass('active')
				.addClass('active');
			
			$('.counter').show();
		},
		
		hideStats: function () {
			$('#statsToggle')
				.html('Stats Off')
				.removeClass('active');
			
			$('.counter').hide();
		},
		
		loadHtml: function (url, callback) {
			$.ajax({
				url: url,
				success: callback,
				dataType: 'html'
			});
		},
		
		template: function (url, callback) {
			var self = this;
			
			if (!this._cacheTemplates || !this._templateCache[url]) {
				this.log('Loading template data from: ' + url);
				$.ajax(url, {
					async: true,
					dataType: 'text',
					complete: function (xhr, status) {
						if (status === 'success') {
							// Convert the text into a jsRender template object
							var template = jsviews.templates(xhr.responseText);
							
							if (self._cacheTemplates) {
								self._templateCache[url] = template;
							}
							
							if (callback) { callback(false, template); }
						} else {
							if (callback) { callback(true, status); }
						}
					}
				});
			} else {
				if (callback) { callback(false, this._templateCache[url]); }
			}
		},
		
		renderTemplate: function (url, data, callback) {
			this.template(url, function (err, template) {
				if (!err) {
					callback(err, $($.parseHTML(template.render(data))));
				} else {
					callback(err);
				}
			});
		},
		
		selectObject: function (id) {
			if (id !== undefined) {
				if (id) {
					this._selectedObject = ige.$(id);
					this._objectSelected(this._selectedObject);
				} else {
					delete this._selectedObject;
				}
			}
		},
		
		_objectSelected: function (obj) {
			if (obj) {
				ige.editor.ui.panels.showPanelByInstance(obj);
				this._selectedObjectClassList = ige.getClassDerivedList(obj);
				
				// Update active-for selectors
				$('[data-active-for]')
					.removeClass('disabled')
					.addClass('disabled');
				
				var classArr = this._selectedObjectClassList,
					i;
				
				for (i = 0; i < classArr.length; i++) {
					$('[data-active-for~="' + classArr[i] + '"]')
						.removeClass('disabled');
				}
				
				this.emit('selectedObject', obj.id());
			}
		},
		
		destroySelected: function () {
			if (this._selectedObject) {
				this._selectedObject.destroy();
				this.selectObject(null);
			}
		},
		
		createObject: function (classId, select) {
			if (this._selectedObject) {
				var newObj = ige.newClassInstance(classId);
				newObj.mount(this._selectedObject);
				this.ui.scenegraph.updateSceneGraph();
				
				if (select) {
					this.selectObject(newObj.id());
					this.ui.toolbox.select('toolSelect');
				}
				
				// Set some object defaults if there are any
				if (this.objectDefault[classId]) {
					for (var i in this.objectDefault[classId]) {
						if (this.objectDefault[classId].hasOwnProperty(i)) {
							if (this.objectDefault[classId][i] instanceof Array) {
								newObj[i].apply(newObj, this.objectDefault[classId][i]);
							} else {
								newObj[i].call(newObj, this.objectDefault[classId][i]);
							}
						}
					}
				}
			}
		},
		
		/**
		 * Updates the stats HTML overlay with the latest data.
		 * @private
		 */
		_statsTick: function () {
			var self = ige.editor,
				i,
				watchCount,
				watchItem,
				itemName,
				res,
				html = '';
			
			// Check if the stats output is enabled
			if (self._showStats && !self._statsPauseUpdate) {
				switch (self._showStats) {
					case 1:
						/*if (self._watch && self._watch.length) {
						 watchCount = self._watch.length;
						 
						 for (i = 0; i < watchCount; i++) {
						 watchItem = self._watch[i];
						 
						 if (typeof(watchItem) === 'string') {
						 itemName = watchItem;
						 try {
						 eval('res = ' + watchItem);
						 } catch (err) {
						 res = '<span style="color:#ff0000;">' + err + '</span>';
						 }
						 } else {
						 itemName = watchItem.name;
						 res = watchItem.value;
						 }
						 html += i + ' (<a href="javascript:ige.watchStop(' + i + '); ige._statsPauseUpdate = false;" style="color:#cccccc;" onmouseover="ige._statsPauseUpdate = true;" onmouseout="ige._statsPauseUpdate = false;">Remove</a>): <span style="color:#7aff80">' + itemName + '</span>: <span style="color:#00c6ff">' + res + '</span><br />';
						 }
						 html += '<br />';
						 }*/
						/*html += '<div class="sgButton" title="Show / Hide SceneGraph Tree" onmouseup="ige.toggleShowEditor();">Scene</div> <span class="met" title="Frames Per Second">' + self._fps + ' fps</span> <span class="met" title="Draws Per Second">' + self._dps + ' dps</span> <span class="met" title="Draws Per Frame">' + self._dpf + ' dpt</span> <span class="met" title="Update Delta (How Long the Last Update Took)">' + self._updateTime + ' ms\/ud</span> <span class="met" title="Render Delta (How Long the Last Render Took)">' + self._renderTime + ' ms\/rd</span> <span class="met" title="Tick Delta (How Long the Last Tick Took)">' + self._tickTime + ' ms\/pt</span>';
						 
						 if (self.network) {
						 // Add the network latency too
						 html += ' <span class="met" title="Network Latency (Time From Server to This Client)">' + self.network._latency + ' ms\/net</span>';
						 }
						 
						 self._statsDiv.innerHTML = html;*/
						
						
						break;
				}
			}
		},
		
		addToSgTree: function (item) {
			var elem = document.createElement('li'),
				arr,
				arrCount,
				i,
				mouseUp,
				dblClick,
				timingString;
			
			mouseUp = function (event) {
				event.stopPropagation();
				
				var elems = document.getElementsByClassName('sgItem selected');
				for (i = 0; i < elems.length; i++) {
					elems[i].className = 'sgItem';
				}
				
				this.className += ' selected';
				ige._sgTreeSelected = this.id;
				
				ige._currentViewport.drawBounds(true);
				if (this.id !== 'ige') {
					ige._currentViewport.drawBoundsLimitId(this.id);
				} else {
					ige._currentViewport.drawBoundsLimitId('');
				}
				
				ige.emit('sgTreeSelectionChanged', ige._sgTreeSelected);
			};
			
			dblClick = function (event) {
				event.stopPropagation();
			};
			
			//elem.addEventListener('mouseover', mouseOver, false);
			//elem.addEventListener('mouseout', mouseOut, false);
			elem.addEventListener('mouseup', mouseUp, false);
			elem.addEventListener('dblclick', dblClick, false);
			
			elem.id = item.id;
			elem.innerHTML = item.text;
			elem.className = 'sgItem';
			
			if (ige._sgTreeSelected === item.id) {
				elem.className += ' selected';
			}
			
			if (igeConfig.debug._timing) {
				if (ige._timeSpentInTick[item.id]) {
					timingString = '<span>' + ige._timeSpentInTick[item.id] + 'ms</span>';
					/*if (ige._timeSpentLastTick[item.id]) {
					 if (typeof(ige._timeSpentLastTick[item.id].ms) === 'number') {
					 timingString += ' | LastTick: ' + ige._timeSpentLastTick[item.id].ms;
					 }
					 }*/
					
					elem.innerHTML += ' ' + timingString;
				}
			}
			
			document.getElementById(item.parentId + '_items').appendChild(elem);
			
			if (item.items) {
				// Create a ul inside the li
				elem = document.createElement('ul');
				elem.id = item.id + '_items';
				document.getElementById(item.id).appendChild(elem);
				
				arr = item.items;
				arrCount = arr.length;
				
				for (i = 0; i < arrCount; i++) {
					ige.addToSgTree(arr[i]);
				}
			}
		},
		
		toggleShowEditor: function () {
			this._showSgTree = !this._showSgTree;
			
			if (this._showSgTree) {
				// Create the scenegraph tree
				var self = this,
					elem1 = document.createElement('div'),
					elem2,
					canvasBoundingRect;
				
				canvasBoundingRect = ige._canvasPosition();
				
				elem1.id = 'igeSgTree';
				elem1.style.top = (parseInt(canvasBoundingRect.top) + 5) + 'px';
				elem1.style.left = (parseInt(canvasBoundingRect.left) + 5) + 'px';
				elem1.style.height = (ige._bounds2d.y - 30) + 'px';
				elem1.style.overflow = 'auto';
				elem1.addEventListener('mousemove', function (event) {
					event.stopPropagation();
				});
				elem1.addEventListener('mouseup', function (event) {
					event.stopPropagation();
				});
				elem1.addEventListener('mousedown', function (event) {
					event.stopPropagation();
				});
				
				elem2 = document.createElement('ul');
				elem2.id = 'sceneGraph_items';
				elem1.appendChild(elem2);
				
				document.body.appendChild(elem1);
				
				// Create the IGE console
				var consoleHolderElem = document.createElement('div'),
					consoleElem = document.createElement('input'),
					classChainElem = document.createElement('div'),
					dociFrame = document.createElement('iframe');
				
				consoleHolderElem.id = 'igeSgConsoleHolder';
				consoleHolderElem.innerHTML = '<div><b>Console</b>: Double-Click a SceneGraph Object to Script it Here</div>';
				
				consoleElem.type = 'text';
				consoleElem.id = 'igeSgConsole';
				
				classChainElem.id = 'igeSgItemClassChain';
				
				dociFrame.id = 'igeSgDocPage';
				dociFrame.name = 'igeSgDocPage';
				
				consoleHolderElem.appendChild(consoleElem);
				consoleHolderElem.appendChild(classChainElem);
				consoleHolderElem.appendChild(dociFrame);
				
				document.body.appendChild(consoleHolderElem);
				
				this.sgTreeUpdate();
				
				// Now add a refresh button to the scene button
				var button = document.createElement('input');
				button.type = 'button';
				button.id = 'igeSgRefreshTree'
				button.style.position = 'absolute';
				button.style.top = '0px';
				button.style.right = '0px'
				button.value = 'Refresh';
				
				button.addEventListener('click', function () {
					self.sgTreeUpdate();
				}, false);
				
				document.getElementById('igeSgTree').appendChild(button);
				
				// Add basic editor controls
				var editorRoot = document.createElement('div'),
					editorModeTranslate = document.createElement('input'),
					editorModeRotate = document.createElement('input'),
					editorModeScale = document.createElement('input'),
					editorStatus = document.createElement('span');
				
				editorRoot.id = 'igeSgEditorRoot';
				editorStatus.id = 'igeSgEditorStatus';
				
				editorModeTranslate.type = 'button';
				editorModeTranslate.id = 'igeSgEditorTranslate';
				editorModeTranslate.value = 'Translate';
				editorModeTranslate.addEventListener('click', function () {
					// Disable other modes
					ige.editorRotate.enabled(false);
					
					if (ige.editorTranslate.enabled()) {
						ige.editorTranslate.enabled(false);
						self.log('Editor: Translate mode disabled');
					} else {
						ige.editorTranslate.enabled(true);
						self.log('Editor: Translate mode enabled');
					}
				});
				
				editorModeRotate.type = 'button';
				editorModeRotate.id = 'igeSgEditorRotate';
				editorModeRotate.value = 'Rotate';
				editorModeRotate.addEventListener('click', function () {
					// Disable other modes
					ige.editorTranslate.enabled(false);
					
					if (ige.editorRotate.enabled()) {
						ige.editorRotate.enabled(false);
						self.log('Editor: Rotate mode disabled');
					} else {
						ige.editorRotate.enabled(true);
						self.log('Editor: Rotate mode enabled');
					}
				});
				
				editorModeScale.type = 'button';
				editorModeScale.id = 'igeSgEditorScale';
				editorModeScale.value = 'Scale';
				
				editorRoot.appendChild(editorModeTranslate);
				editorRoot.appendChild(editorModeRotate);
				editorRoot.appendChild(editorModeScale);
				editorRoot.appendChild(editorStatus);
				
				document.body.appendChild(editorRoot);
				
				// Add the translate component to the ige instance
				ige.addComponent(IgeEditorTranslateComponent);
				ige.addComponent(IgeEditorRotateComponent);
				
				// Schedule tree updates every second
				ige._sgTreeUpdateInterval = setInterval(function () { self.sgTreeUpdate(); }, 1000);
			} else {
				// Kill interval
				clearInterval(ige._sgTreeUpdateInterval);
				
				var child = document.getElementById('igeSgTree');
				child.parentNode.removeChild(child);
				
				child = document.getElementById('igeSgConsoleHolder');
				child.parentNode.removeChild(child);
				
				child = document.getElementById('igeSgEditorRoot');
				child.parentNode.removeChild(child);
				
				ige.removeComponent('editorTranslate');
				ige.removeComponent('editorRotate');
			}
		},
		
		sgTreeUpdate: function () {
			// Update the scenegraph tree
			document.getElementById('sceneGraph_items').innerHTML = '';
			
			// Get the scenegraph data
			this.addToSgTree(this.getSceneGraphData(this, true));
		},
	});
	
	return IgeEditorComponent;
});
},{"irrelon-appcore":67}],20:[function(_dereq_,module,exports){
"use strict";

var appCore = _dereq_('irrelon-appcore');

appCore.module('IgeEditorRotateComponent', function (IgeEventingClass) {
	/**
	 * When added to a viewport, automatically adds entity rotate
	 * capabilities to the selected entity in the scenegraph viewer.
	 */
	var IgeEditorRotateComponent = IgeEventingClass.extend({
		classId: 'IgeEditorRotateComponent',
		componentId: 'editorRotate',
		
		/**
		 * @constructor
		 * @param {IgeObject} entity The object that the component is added to.
		 * @param {Object=} options The options object that was passed to the component during
		 * the call to addComponent.
		 */
		init: function (entity, options) {
			this._entity = entity;
			this._options = options;
			
			// Set the rotate component to inactive to start with
			this._enabled = false;
			this._startThreshold = 1; // The number of pixels the mouse should move to activate
		},
		
		/**
		 * Gets / sets the number of pixels after a mouse down that the mouse
		 * must move in order to activate the operation. Defaults to 1.
		 * @param val
		 * @return {*}
		 */
		startThreshold: function (val) {
			if (val !== undefined) {
				this._startThreshold = val;
				return this._entity;
			}
			
			return this._startThreshold;
		},
		
		/**
		 * Gets / sets the rectangle that the operation will be limited
		 * to using an IgeRect instance.
		 * @param {IgeRect=} rect
		 * @return {*}
		 */
		limit: function (rect) {
			if (rect !== undefined) {
				this._limit = rect;
				return this._entity;
			}
			
			return this._limit;
		},
		
		/**
		 * Gets / sets the enabled flag. If set to true,
		 * operations will be processed. If false, no operations will
		 * occur.
		 * @param {Boolean=} val
		 * @return {*}
		 */
		enabled: function (val) {
			var self = this;
			
			if (val !== undefined) {
				this._enabled = val;
				
				// Reset rotate values.
				// This prevents problems if the component is disabled mid-operation.
				this._opPreStart = false;
				this._opStarted  = false;
				
				if (this._enabled) {
					if (ige._sgTreeSelected && ige._sgTreeSelected !== 'ige') {
						this._targetEntity = ige.$(ige._sgTreeSelected);
						
						if (this._targetEntity.classId() == 'IgeViewport') {
							// Disable translation mode
							this.log('Editor: Mouse rotate disabled');
							this.enabled(false);
						} else {
							// Listen for the mouse events we need to operate
							ige.input.on('mouseDown', function (event) { self._mouseDown(event); });
							ige.input.on('mouseMove', function (event) { self._mouseMove(event); });
							ige.input.on('mouseUp', function (event) { self._mouseUp(event); });
							this.log('Editor: Mouse rotate enabled');
						}
					}
				} else {
					// Remove the operation start data
					delete this._opStartMouse;
					delete this._opStartRotate;
				}
				
				return this._entity;
			}
			
			return this._enabled;
		},
		
		/**
		 * Handles the mouseDown event. Records the starting position of the
		 * operation and the current operation translation.
		 * @param event
		 * @private
		 */
		_mouseDown: function (event) {
			if (!this._opStarted && this._enabled && this._targetEntity) {
				// Record the mouse down position - pre-start
				var curMousePos = ige._mousePos;
				this._opStartMouse = curMousePos.clone();
				
				this._opStartRotate = {
					x: Math.degrees(this._targetEntity._rotate.z)
				};
				
				this._opPreStart = true;
				this._opStarted = false;
				
				document.getElementById('igeSgEditorStatus').innerHTML = 'Degrees: ' + Math.degrees(this._targetEntity._rotate.z);
			}
		},
		
		/**
		 * Handles the mouse move event. Rotates the entity as the mouse
		 * moves across the screen.
		 * @param event
		 * @private
		 */
		_mouseMove: function (event) {
			if (this._enabled && this._targetEntity) {
				// Rotate the camera if the mouse is down
				if (this._opStartMouse) {
					var curMousePos = ige._mousePos,
						rotateCords = {
							x: this._opStartMouse.x - curMousePos.x
						},
						distX = rotateCords.x - this._opStartRotate.x;
					
					if (this._opPreStart) {
						// Check if we've reached the start threshold
						if (Math.abs(distX) > this._startThreshold) {
							this._targetEntity.rotateTo(
								this._targetEntity._rotate.x,
								this._targetEntity._rotate.y,
								Math.radians(-distX)
							);
							this.emit('rotateStart');
							this._opPreStart = false;
							this._opStarted = true;
							
							this.emit('rotateMove');
						}
					} else {
						// Rotate has already started
						this._targetEntity.rotateTo(
							this._targetEntity._rotate.x,
							this._targetEntity._rotate.y,
							Math.radians(-distX)
						);
						
						this.emit('rotateMove');
					}
					
					document.getElementById('igeSgEditorStatus').innerHTML = 'Degrees: ' + Math.degrees(this._targetEntity._rotate.z);
				}
			}
		},
		
		/**
		 * Handles the mouse up event. Finishes the entity rotate and
		 * removes the starting operation data.
		 * @param event
		 * @private
		 */
		_mouseUp: function (event) {
			if (this._enabled && this._targetEntity) {
				// End the rotate
				if (this._opStarted) {
					if (this._opStartMouse) {
						var curMousePos = ige._mousePos,
							rotateCords = {
								x: this._opStartMouse.x - curMousePos.x
							},
							distX = rotateCords.x - this._opStartRotate.x;
						
						this._targetEntity.rotateTo(
							this._targetEntity._rotate.x,
							this._targetEntity._rotate.y,
							Math.radians(-distX)
						);
						
						document.getElementById('igeSgEditorStatus').innerHTML = 'Degrees: ' + Math.degrees(this._targetEntity._rotate.z);
						
						// Remove the rotate start data to end the rotate operation
						delete this._opStartMouse;
						delete this._opStartRotate;
						
						this.emit('rotateEnd');
						this._opStarted = false;
					}
				} else {
					delete this._opStartMouse;
					delete this._opStartRotate;
					this._opStarted = false;
				}
			}
		}
	});
	
	return IgeEditorRotateComponent;
});
},{"irrelon-appcore":67}],21:[function(_dereq_,module,exports){
"use strict";

var appCore = _dereq_('irrelon-appcore');

appCore.module('IgeEditorTranslateComponent', function (IgeEventingClass) {
	/**
	 * When added to a viewport, automatically adds entity translate
	 * capabilities to the selected entity in the scenegraph viewer.
	 */
	var IgeEditorTranslateComponent = IgeEventingClass.extend({
		classId: 'IgeEditorTranslateComponent',
		componentId: 'editorTranslate',
		
		/**
		 * @constructor
		 * @param {IgeObject} entity The object that the component is added to.
		 * @param {Object=} options The options object that was passed to the component during
		 * the call to addComponent.
		 */
		init: function (entity, options) {
			this._entity = entity;
			this._options = options;
			
			// Set the pan component to inactive to start with
			this._enabled = false;
			this._startThreshold = 1; // The number of pixels the mouse should move to activate
		},
		
		/**
		 * Gets / sets the number of pixels after a mouse down that the mouse
		 * must move in order to activate the operation. Defaults to 1.
		 * @param val
		 * @return {*}
		 */
		startThreshold: function (val) {
			if (val !== undefined) {
				this._startThreshold = val;
				return this._entity;
			}
			
			return this._startThreshold;
		},
		
		/**
		 * Gets / sets the rectangle that the operation will be limited
		 * to using an IgeRect instance.
		 * @param {IgeRect=} rect
		 * @return {*}
		 */
		limit: function (rect) {
			if (rect !== undefined) {
				this._limit = rect;
				return this._entity;
			}
			
			return this._limit;
		},
		
		/**
		 * Gets / sets the enabled flag. If set to true,
		 * operations will be processed. If false, no operations will
		 * occur.
		 * @param {Boolean=} val
		 * @return {*}
		 */
		enabled: function (val) {
			var self = this;
			
			if (val !== undefined) {
				this._enabled = val;
				
				// Reset pan values.
				// This prevents problems if the component is disabled mid-operation.
				this._opPreStart = false;
				this._opStarted  = false;
				
				if (this._enabled) {
					if (ige._sgTreeSelected) {
						this._targetEntity = ige.$(ige._sgTreeSelected);
						
						if (this._targetEntity.classId() == 'IgeViewport') {
							// Disable translation mode
							this.log('Editor: Mouse translate disabled');
							this.enabled(false);
						} else {
							// Listen for the mouse events we need to operate
							ige.input.on('mouseDown', function (event) { self._mouseDown(event); });
							ige.input.on('mouseMove', function (event) { self._mouseMove(event); });
							ige.input.on('mouseUp', function (event) { self._mouseUp(event); });
							this.log('Editor: Mouse translate enabled');
						}
					}
				} else {
					// Remove the operation start data
					delete this._opStartMouse;
					delete this._opStartTranslate;
				}
				
				return this._entity;
			}
			
			return this._enabled;
		},
		
		/**
		 * Handles the mouseDown event. Records the starting position of the
		 * operation and the current operation translation.
		 * @param event
		 * @private
		 */
		_mouseDown: function (event) {
			if (!this._opStarted && this._enabled && this._targetEntity) {
				// Record the mouse down position - pre-start
				var curMousePos = ige._mousePos;
				this._opStartMouse = curMousePos.clone();
				
				this._opStartTranslate = {
					x: this._targetEntity._translate.x,
					y: this._targetEntity._translate.y
				};
				
				this._opPreStart = true;
				this._opStarted = false;
				
				document.getElementById('igeSgEditorStatus').innerHTML = 'X: ' + this._targetEntity._translate.x + ' Y:' + this._targetEntity._translate.y;
			}
		},
		
		/**
		 * Handles the mouse move event. Translates the entity as the mouse
		 * moves across the screen.
		 * @param event
		 * @private
		 */
		_mouseMove: function (event) {
			if (this._enabled && this._targetEntity) {
				// Pan the camera if the mouse is down
				if (this._opStartMouse) {
					var curMousePos = ige._mousePos,
						panCords = {
							x: this._opStartMouse.x - curMousePos.x,
							y: this._opStartMouse.y - curMousePos.y
						}, distX = Math.abs(panCords.x), distY = Math.abs(panCords.y),
						panFinalX = this._opStartTranslate.x - (panCords.x / ige._currentViewport.camera._scale.x),
						panFinalY = this._opStartTranslate.y - (panCords.y / ige._currentViewport.camera._scale.y);
					
					// Check if we have a limiter on the rectangle area
					// that we should allow panning inside.
					if (this._limit) {
						// Check the pan co-ordinates against
						// the limiter rectangle
						if (panFinalX < this._limit.x) {
							panFinalX = this._limit.x;
						}
						
						if (panFinalX > this._limit.x + this._limit.width) {
							panFinalX = this._limit.x + this._limit.width;
						}
						
						if (panFinalY < this._limit.y) {
							panFinalY = this._limit.y;
						}
						
						if (panFinalY > this._limit.y + this._limit.height) {
							panFinalY = this._limit.y + this._limit.height;
						}
					}
					
					if (this._opPreStart) {
						// Check if we've reached the start threshold
						if (distX > this._startThreshold || distY > this._startThreshold) {
							this._targetEntity.translateTo(
								panFinalX,
								panFinalY,
								0
							);
							this.emit('panStart');
							this._opPreStart = false;
							this._opStarted = true;
							
							this.emit('panMove');
						}
					} else {
						// Pan has already started
						this._targetEntity.translateTo(
							panFinalX,
							panFinalY,
							0
						);
						
						this.emit('panMove');
					}
					
					document.getElementById('igeSgEditorStatus').innerHTML = 'X: ' + panFinalX + ' Y:' + panFinalY;
				}
			}
		},
		
		/**
		 * Handles the mouse up event. Finishes the entity translate and
		 * removes the starting operation data.
		 * @param event
		 * @private
		 */
		_mouseUp: function (event) {
			if (this._enabled && this._targetEntity) {
				// End the pan
				if (this._opStarted) {
					if (this._opStartMouse) {
						var curMousePos = ige._mousePos,
							panCords = {
								x: this._opStartMouse.x - curMousePos.x,
								y: this._opStartMouse.y - curMousePos.y
							},
							panFinalX = this._opStartTranslate.x - (panCords.x / ige._currentViewport.camera._scale.x),
							panFinalY = this._opStartTranslate.y - (panCords.y / ige._currentViewport.camera._scale.y);
						
						// Check if we have a limiter on the rectangle area
						// that we should allow panning inside.
						if (this._limit) {
							// Check the pan co-ordinates against
							// the limiter rectangle
							if (panFinalX < this._limit.x) {
								panFinalX = this._limit.x;
							}
							
							if (panFinalX > this._limit.x + this._limit.width) {
								panFinalX = this._limit.x + this._limit.width;
							}
							
							if (panFinalY < this._limit.y) {
								panFinalY = this._limit.y;
							}
							
							if (panFinalY > this._limit.y + this._limit.height) {
								panFinalY = this._limit.y + this._limit.height;
							}
						}
						
						this._targetEntity.translateTo(
							panFinalX,
							panFinalY,
							0
						);
						
						document.getElementById('igeSgEditorStatus').innerHTML = 'X: ' + panFinalX + ' Y:' + panFinalY;
						
						// Remove the pan start data to end the pan operation
						delete this._opStartMouse;
						delete this._opStartTranslate;
						
						this.emit('panEnd');
						this._opStarted = false;
					}
				} else {
					delete this._opStartMouse;
					delete this._opStartTranslate;
					this._opStarted = false;
				}
			}
		}
	});
	
	return IgeEditorTranslateComponent;
});

},{"irrelon-appcore":67}],22:[function(_dereq_,module,exports){
var appCore = _dereq_('irrelon-appcore');

appCore.module('IgeArray', function (IgeEntity) {
	var IgeArray = function () {};
	IgeArray.prototype = [];

	// Empower the IgeArray with all the method calls of the an IgeEntity
	for (var methodName in IgeEntity.prototype) {
		if (IgeEntity.prototype.hasOwnProperty(methodName)) {
			if (methodName !== 'init') {
				IgeArray.prototype[methodName] = function (methodName) {
					return function () {
						var c = this.length;
						for (var i = 0; i < c; i++) {
							this[i][methodName].apply(this[i], arguments);
						}
					}
				}(methodName);
			}
		}
	}
	
	return IgeArray;
});
},{"irrelon-appcore":67}],23:[function(_dereq_,module,exports){
"use strict";

var appCore = _dereq_('irrelon-appcore');

appCore.module('igeBase', function () {
	var IgeBase = function () {
		// When setting a new version please use this format:
		// v{MAJOR}.{MINOR}.{SUB}@{YYYY-MM-DD}.{REVISION}
		//
		// For example, to tag version 1.1.2 on 25th April 2013
		// as the third revision of the day:
		// v1.1.2@2013-04-25.003
		this.igeVersion = 'v1.6.0@2015-04-29.001';
		
		// Define the global storage object for classes
		this.igeClassStore = {};
		
		// Define a config object
		this.igeConfig = {
			debug: {
				_enabled: true,
				_node: typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined',
				_level: ['log', 'warning', 'error'],
				_stacks: true,
				_throwErrors: true,
				_timing: true,
				enabled: function (val) {
					if (val !== undefined) {
						this._enabled = val;
						
						if (!val) {
							this._timing = false;
							
							// Check if the engine exists
							if (ige) {
								// Turn off stats display in the engine
								ige.showStats(0);
							}
						}
						
						return this;
					}
					
					return this._enabled;
				}
			}
		};
		
		if (this.igeConfig.debug._node) {
			this.igeConfig.debug._util = _dereq_('util');
		}
	};
	
	appCore.depends(function (IgeTween) {
		/**
		 * Make property non-enumerable.
		 */
		Object.defineProperty(Object.prototype, 'tween', {
			enumerable: false,
			writable: true,
			configurable: true
		});
		
		/**
		 * Augments all objects with the tween() method. Creates a new IgeTween
		 * with the passed parameters that will act upon the object's properties.
		 * The returned tween will not start tweening until a call to start() is
		 * made.
		 * @param {Object} props
		 * @param {Number} durationMs
		 * @param {Object=} options
		 * @return {IgeTween}
		 */
		Object.prototype.tween = function (props, durationMs, options) {
			var newTween = new IgeTween()
				.targetObj(this)
				.properties(props)
				.duration(durationMs);
			
			if (options) {
				if (options.beforeTween) {
					newTween.beforeTween(options.beforeTween);
				}
				if (options.afterTween) {
					newTween.afterTween(options.afterTween);
				}
				if (options.easing) {
					newTween.easing(options.easing);
				}
				if (options.startTime) {
					newTween.startTime(options.startTime);
				}
			}
			
			return newTween;
		};
	});
	
	/**
	 * Make property non-enumerable.
	 */
	Object.defineProperty(Object.prototype, 'theSameAs', {
		enumerable: false,
		writable: true,
		configurable: true
	});
	
	/**
	 * Augments all objects with the theSameAs() method. Checks if the
	 * property values of this object are equal to the property values
	 * of the passed object. If they are the same then this method will
	 * return true. Objects must not contain circular references!
	 * @param {Object} obj The object to compare this one to.
	 * @return {Boolean}
	 */
	Object.prototype.theSameAs = function (obj) {
		return JSON.stringify(this) === JSON.stringify(obj);
	};
	
	/**
	 * Make property non-enumerable.
	 */
	Object.defineProperty(Array.prototype, 'clone', {
		enumerable: false,
		writable: true,
		configurable: true
	});
	
	/**
	 * Clones the array and returns a new non-referenced
	 * array.
	 * @return {*}
	 */
	Array.prototype.clone = function () {
		var i, newArray = [];
		for (i in this) {
			if (this.hasOwnProperty(i)) {
				if (this[i] instanceof Array) {
					newArray[i] = this[i].clone();
				} else {
					newArray[i] = this[i];
				}
			}
		}
		
		return newArray;
	};
	
	/**
	 * Make property non-enumerable.
	 */
	Object.defineProperty(Array.prototype, 'pull', {
		enumerable: false,
		writable: true,
		configurable: true
	});
	
	/**
	 * Removes the passed item from an array, the opposite of push().
	 * @param item
	 * @return {*}
	 */
	Array.prototype.pull = function (item) {
		var index = this.indexOf(item);
		if (index > -1) {
			this.splice(index, 1);
			return index;
		} else {
			return -1;
		}
	};
	
	/**
	 * Make property non-enumerable.
	 */
	Object.defineProperty(Array.prototype, 'pushUnique', {
		enumerable: false,
		writable: true,
		configurable: true
	});
	
	/**
	 * Adds an item to an array, only if it does not already exist in the array.
	 * @param item
	 * @return {Boolean} True if the item was added, false if it already exists.
	 */
	Array.prototype.pushUnique = function (item) {
		var index = this.indexOf(item);
		if (index === -1) {
			this.push(item);
			return true;
		}
		
		return false;
	};
	
	/**
	 * Make property non-enumerable.
	 */
	Object.defineProperty(Array.prototype, 'each', {
		enumerable: false,
		writable: true,
		configurable: true
	});
	
	/**
	 * Iterates through an array's items and calls the callback method
	 * passing each item one by one.
	 * @param {Function} callback
	 */
	Array.prototype.each = function (callback) {
		var len = this.length,
			i;
		
		for (i = 0; i < len; i++) {
			callback(this[i]);
		}
	};
	
	/**
	 * Make property non-enumerable.
	 */
	Object.defineProperty(Array.prototype, 'eachReverse', {
		enumerable: false,
		writable: true,
		configurable: true
	});
	
	/**
	 * Iterates through an array's items and calls the callback method
	 * passing each item one by one in reverse order.
	 * @param {Function} callback
	 */
	Array.prototype.eachReverse = function (callback) {
		var arrCount = this.length,
			i;
		
		for (i = arrCount - 1; i >= 0; i--) {
			callback(this[i]);
		}
	};
	
	/**
	 * Make property non-enumerable.
	 */
	Object.defineProperty(Array.prototype, 'destroyAll', {
		enumerable: false,
		writable: true,
		configurable: true
	});
	
	/**
	 * Iterates through an array's items and calls each item's
	 * destroy() method if it exists. Useful for destroying an
	 * array of IgeEntity instances.
	 */
	Array.prototype.destroyAll = function () {
		var arrCount = this.length,
			i;
		
		for (i = arrCount - 1; i >= 0; i--) {
			if (typeof(this[i].destroy) === 'function') {
				this[i].destroy();
			}
		}
	};
	
	/**
	 * Make property non-enumerable.
	 */
	Object.defineProperty(Array.prototype, 'eachIsolated', {
		enumerable: false,
		writable: true,
		configurable: true
	});
	
	/**
	 * Iterates through an array's items and calls the callback method
	 * passing each item one by one. Altering the array's structure
	 * during the callback method will not affect the iteration of the
	 * items.
	 *
	 * @param {Function} callback
	 */
	Array.prototype.eachIsolated = function (callback) {
		var arr = [],
			arrCount = arr.length,
			i;
		
		// Create a copy of the array
		for (i = 0; i < arrCount; i++) {
			arr[i] = this[i];
		}
		
		// Now iterate the array, passing the copied
		// array value at the index(i). Any changes to
		// "this" will not affect the index(i) values.
		for (i = 0; i < arrCount; i++) {
			callback(arr[i]);
		}
	};
	
	/**
	 * Make property non-enumerable.
	 */
	Object.defineProperty(Math, 'PI180', {
		enumerable: false,
		writable: true,
		configurable: true
	});
	
	/**
	 * Stores a pre-calculated PI / 180 value.
	 * @type {Number}
	 */
	Math.PI180 = Math.PI / 180;
	
	/**
	 * Make property non-enumerable.
	 */
	Object.defineProperty(Math, 'PI180R', {
		enumerable: false,
		writable: true,
		configurable: true
	});
	
	/**
	 * Stores a pre-calculated 180 / PI value.
	 * @type {Number}
	 */
	Math.PI180R = 180 / Math.PI;
	
	/**
	 * Make property non-enumerable.
	 */
	Object.defineProperty(Math, 'toIso', {
		enumerable: false,
		writable: true,
		configurable: true
	});
	
	Math.toIso = function (x, y, z) {
		var sx = x - y,
			sy = (-z) * 1.2247 + (x + y) * 0.5;
		
		return {x: sx, y: sy};
	};
	
	/**
	 * Make property non-enumerable.
	 */
	Object.defineProperty(Math, 'radians', {
		enumerable: false,
		writable: true,
		configurable: true
	});
	
	/**
	 * Converts degrees to radians.
	 * @param {Number} degrees
	 * @return {Number} radians
	 */
	Math.radians = function (degrees) {
		return degrees * Math.PI180;
	};
	
	/**
	 * Make property non-enumerable.
	 */
	Object.defineProperty(Math, 'degrees', {
		enumerable: false,
		writable: true,
		configurable: true
	});
	
	/**
	 * Converts radians to degrees.
	 * @param {Number} radians
	 * @return {Number} degrees
	 */
	Math.degrees = function (radians) {
		return radians * Math.PI180R;
	};
	
	/**
	 * Make property non-enumerable.
	 */
	Object.defineProperty(Math, 'distance', {
		enumerable: false,
		writable: true,
		configurable: true
	});
	
	/**
	 * Calculates the distance from the first point to the second point.
	 * @param x1
	 * @param y1
	 * @param x2
	 * @param y2
	 * @return {Number}
	 */
	Math.distance = function (x1, y1, x2, y2) {
		return Math.sqrt(((x1 - x2) * (x1 - x2)) + ((y1 - y2) * (y1 - y2)));
	};
	
	if (typeof(CanvasRenderingContext2D) !== 'undefined') {
		// Extend the canvas context to add some helper methods
		/**
		 * Make property non-enumerable.
		 */
		Object.defineProperty(CanvasRenderingContext2D.prototype, 'circle', {
			enumerable: false,
			writable: true,
			configurable: true
		});
		
		Object.defineProperty(CanvasRenderingContext2D.prototype, 'strokeCircle', {
			enumerable: false,
			writable: true,
			configurable: true
		});
		
		Object.defineProperty(CanvasRenderingContext2D.prototype, 'fillCircle', {
			enumerable: false,
			writable: true,
			configurable: true
		});
		
		CanvasRenderingContext2D.prototype.circle = function (x, y, radius) {
			this.arc(x, y, radius, 0, 2 * Math.PI, false);
		};
		
		CanvasRenderingContext2D.prototype.strokeCircle = function (x, y, radius) {
			this.save();
			this.beginPath();
			this.arc(x, y, radius, 0, 2 * Math.PI, false);
			this.stroke();
			this.restore();
		};
		
		CanvasRenderingContext2D.prototype.fillCircle = function (x, y, radius) {
			this.save();
			this.beginPath();
			this.arc(x, y, radius, 0, 2 * Math.PI, false);
			this.fill();
			this.restore();
		};
	}
	
	if (typeof(ImageData) !== 'undefined') {
		/**
		 * Make property non-enumerable.
		 */
		Object.defineProperty(ImageData.prototype, 'pixelAt', {
			enumerable: false,
			writable: true,
			configurable: true
		});
		
		/**
		 * Augments the canvas context getImageData() object "ImageData" with the
		 * pixelAt() method. Gets the pixel color data for the given pixel at the
		 * x, y co-ordinates specified.
		 * @param {Number} x The x co-ordinate of the pixel.
		 * @param {Number} y The y co-ordinate of the pixel.
		 * @return {Object} An object containing the pixel color data in properties
		 * {r, g, b, a}.
		 */
		ImageData.prototype.pixelAt = function (x, y) {
			var data = this.data,
				pixelStart = (y * this.width * 4) + (x * 4);
			
			return {
				r: data[pixelStart],
				g: data[pixelStart + 1],
				b: data[pixelStart + 2],
				a: data[pixelStart + 3]
			};
		};
		
		/**
		 * Make property non-enumerable.
		 */
		Object.defineProperty(ImageData.prototype, 'isTransparent', {
			enumerable: false,
			writable: true,
			configurable: true
		});
		
		/**
		 * Augments the canvas context getImageData() object "ImageData" with the
		 * isTransparent() method. Determines if the pixel at the passed x, y is
		 * fully transparent or not.
		 * @param {Number} x The x co-ordinate of the pixel.
		 * @param {Number} y The y co-ordinate of the pixel.
		 * @return {Boolean} True if fully transparent, false if not.
		 */
		ImageData.prototype.isTransparent = function (x, y) {
			var data = this.data,
				pixelStart = (y * this.width * 4) + (x * 4);
			
			return data[pixelStart + 3] === 0;
		};
		
		/**
		 * Make property non-enumerable.
		 */
		Object.defineProperty(ImageData.prototype, 'makeTransparent', {
			enumerable: false,
			writable: true,
			configurable: true
		});
		
		/**
		 * Augments the canvas context getImageData() object "ImageData" with the
		 * makeTransparent() method. Makes the pixel at the passed x, y fully
		 * transparent.
		 * @param {Number} x The x co-ordinate of the pixel.
		 * @param {Number} y The y co-ordinate of the pixel.
		 */
		ImageData.prototype.makeTransparent = function (x, y) {
			var data = this.data,
				pixelStart = (y * this.width * 4) + (x * 4);
			
			data[pixelStart + 3] = 0;
		};
	}
	
	/**
	 * Turn off the right-click default behaviour in the browser for the passed element.
	 * @param obj
	 */
	var disableContextMenu = function (obj) {
		if (obj !== null) {
			//this.log('Disabling context menus for ' + obj, 'info');
			obj.oncontextmenu = function () {
				return false;
			};
		}
	};
	
	/**
	 * Adds the indexOf method to all array objects if it does not already exist which
	 * would you believe can still happen even in 2012!
	 */
	if (!Array.prototype.indexOf) {
		/**
		 * Make property non-enumerable.
		 */
		Object.defineProperty(Array.prototype, 'indexOf', {
			enumerable: false,
			writable: true,
			configurable: true
		});
		
		/**
		 * Get the index of the passed item.
		 * @param {*} obj The item to find the index for.
		 * @return {Number} The index of the passed item or -1 if not found.
		 */
		Array.prototype.indexOf = function (obj) {
			var i, l = this.length;
			for (i = 0; i < l; i++) {
				if (this[i] === obj) {
					return i;
				}
			}
			return -1;
		};
	}
	
	if (typeof(window) !== 'undefined') {
		/**
		 * A cross-browser/platform requestAnimationFrame method.
		 */
		/*window.requestAnimFrame = (function(){
		 return function(callback, element){
		 setTimeout(function () { callback(new Date().getTime()); }, 1000 / 60);
		 };
		 }());*/
		
		window.requestAnimFrame = (function () {
			return window.requestAnimationFrame ||
				window.webkitRequestAnimationFrame ||
				window.mozRequestAnimationFrame ||
				window.oRequestAnimationFrame ||
				window.msRequestAnimationFrame ||
				function (callback, element) {
					setTimeout(function () {
						callback(new Date().getTime());
					}, 1000 / 60);
				};
		}());
	} else {
		/**
		 * A cross-browser/platform requestAnimationFrame method.
		 */
		window.requestAnimFrame = (function () {
			return function (callback, element) {
				setTimeout(function () {
					callback(new Date().getTime());
				}, 1000 / 60);
			};
		}());
	}
	
	// Check console method existence
	if (typeof(console) === 'object') {
		if (typeof(console.log) === 'function') {
			if (typeof(console.info) === 'undefined') {
				// We have console.log but not console.info so add it as a replica of console.log
				console.info = console.log;
			}
			
			if (typeof(console.warn) === 'undefined') {
				// We have console.log but not console.warn so add it as a replica of console.log
				console.warn = console.log;
			}
		}
	} else {
		// Create dummy console
		console = {
			log: function () {
			},
			warn: function () {
			},
			info: function () {
			},
			error: function () {
			}
		};
	}
	
	return new IgeBase();
});
},{"irrelon-appcore":67,"util":71}],24:[function(_dereq_,module,exports){
"use strict";

var appCore = _dereq_('irrelon-appcore');

appCore.module('IgeBaseScene', function (IgeSceneGraph, IgeScene2d, IgeViewport) {
	/**
	 * When loaded into memory using ige.addGraph('IgeBaseScene') will create
	 * the scene "baseScene" and the viewport "vp1" that are used in almost all
	 * examples and can be used as the base for your scenegraph as well.
	 */
	var IgeBaseScene = IgeSceneGraph.extend({
		classId: 'IgeBaseScene',
		
		init: function () {
		},
		
		/**
		 * Called when loading the graph data via ige.addGraph().
		 * @param options
		 */
		addGraph: function (options) {
			// Clear existing graph data
			if (ige.$('baseScene')) {
				this.destroyGraph();
			}
			
			// Create the scene
			var baseScene = new IgeScene2d()
				.id('baseScene');
			
			// Create the main viewport to look at "baseScene"
			new IgeViewport()
				.id('vp1')
				.autoSize(true)
				.scene(baseScene)
				.drawBounds(false)
				.mount(ige);
		},
		
		/**
		 * The method called when the graph items are to be removed from the
		 * active graph.
		 */
		removeGraph: function () {
			// Destroy the viewport
			ige.$('vp1').destroy();
			
			// Destroy the baseScene
			ige.$('baseScene').destroy();
		}
	});
	
	return IgeBaseScene;
});
},{"irrelon-appcore":67}],25:[function(_dereq_,module,exports){
"use strict";

var appCore = _dereq_('irrelon-appcore');

appCore.module('IgeCamera', function (IgeEntity) {
	/**
	 * Creates a new camera that will be attached to a viewport.
	 */
	var IgeCamera = IgeEntity.extend({
		classId: 'IgeCamera',
		
		init: function (entity) {
			IgeEntity.prototype.init.call(this);
			
			this._trackRotateTarget = undefined;
			this._trackTranslateTarget = undefined;
			this._trackRotateSmoothing = undefined;
			this._trackTranslateSmoothing = undefined;
			
			// Store the viewport this camera is attached to
			this._entity = entity;
		},
		
		/**
		 * Gets / sets the rectangle that the camera translate
		 * will be limited to using an IgeRect instance.
		 * @param {IgeRect=} rect
		 * @return {*}
		 */
		limit: function (rect) {
			// TODO: Write the usage of this limit data, currently does nothing
			if (rect !== undefined) {
				this._limit = rect;
				return this._entity;
			}
			
			return this._limit;
		},
		
		/**
		 * Pan (tween) the camera to the new specified point in
		 * the specified time.
		 * @param {IgePoint3d} point The point describing the co-ordinates to pan to.
		 * @param {Number} durationMs The number of milliseconds to span the pan operation over.
		 * @param {String=} easing Optional easing method name.
		 */
		panTo: function (point, durationMs, easing) {
			if (point !== undefined) {
				this._translate.tween()
					.properties({
						x: point.x,
						y: point.y,
						z: point.z
					})
					.duration(durationMs)
					.easing(easing)
					.start();
			}
			
			return this._entity;
		},
		
		/**
		 * Pan (tween) the camera by the new specified point in
		 * the specified time.
		 * @param {IgePoint3d} point The point describing the co-ordinates to pan by.
		 * @param {Number} durationMs The number of milliseconds to span the pan operation over.
		 * @param {String=} easing Optional easing method name.
		 */
		panBy: function (point, durationMs, easing) {
			if (point !== undefined) {
				this._translate.tween()
					.properties({
						x: point.x + this._translate.x,
						y: point.y + this._translate.y,
						z: point.z + this._translate.z
					})
					.duration(durationMs)
					.easing(easing)
					.start();
			}
			
			return this._entity;
		},
		
		/**
		 * Tells the camera to track the movement of the specified
		 * target entity. The camera will center on the entity.
		 * @param {IgeEntity} entity
		 * @param {Number=} smoothing Determines how quickly the camera
		 * will track the target, the higher the number, the slower the
		 * tracking will be.
		 * @param {Boolean=} rounding Sets if the smoothing system is
		 * allowed to use floating point values or not. If enabled then
		 * it will not use floating point values.
		 * @return {*}
		 */
		trackTranslate: function (entity, smoothing, rounding) {
			if (entity !== undefined) {
				this.log('Camera on viewport ' + this._entity.id() + ' is now tracking translation target ' + entity.id());
				if (rounding !== undefined) {
					this._trackTranslateRounding = rounding;
				}
				
				if (smoothing !== undefined) {
					this._trackTranslateSmoothing = smoothing >= 1 ? smoothing : 0;
				}
				
				this._trackTranslateTarget = entity;
				return this._entity;
			}
			
			return this._trackTranslateTarget;
		},
		
		/**
		 * Gets / sets the translate tracking smoothing value.
		 * @param {Number=} val
		 * @return {*}
		 */
		trackTranslateSmoothing: function (val) {
			if (val !== undefined) {
				this._trackTranslateSmoothing = val;
				return this;
			}
			
			return this._trackTranslateSmoothing;
		},
		
		/**
		 * Gets / sets the translate tracking smoothing rounding
		 * either enabled or disabled. When enabled the translate
		 * smoothing value will be rounded so that floating point
		 * values are not used which can help when smoothing on a
		 * scene that has texture smoothing disabled so sub-pixel
		 * rendering doesn't work and objects appear to "snap"
		 * into position as the smoothing interpolates.
		 * @param {Boolean=} val
		 * @return {*}
		 */
		trackTranslateRounding: function (val) {
			if (val !== undefined) {
				this._trackTranslateRounding = val;
				return this;
			}
			
			return this._trackTranslateRounding;
		},
		
		/**
		 * Stops tracking the current tracking target's translation.
		 */
		unTrackTranslate: function () {
			delete this._trackTranslateTarget;
		},
		
		/**
		 * Tells the camera to track the rotation of the specified
		 * target entity.
		 * @param {IgeEntity} entity
		 * @param {Number=} smoothing Determines how quickly the camera
		 * will track the target, the higher the number, the slower the
		 * tracking will be.
		 * @return {*}
		 */
		trackRotate: function (entity, smoothing) {
			if (entity !== undefined) {
				this.log('Camera on viewport ' + this._entity.id() + ' is now tracking rotation of target ' + entity.id());
				this._trackRotateSmoothing = smoothing >= 1 ? smoothing : 0;
				this._trackRotateTarget = entity;
				return this._entity;
			}
			
			return this._trackRotateTarget;
		},
		
		/**
		 * Gets / sets the rotate tracking smoothing value.
		 * @param {Number=} val
		 * @return {*}
		 */
		trackRotateSmoothing: function (val) {
			if (val !== undefined) {
				this._trackRotateSmoothing = val;
				return this;
			}
			
			return this._trackRotateSmoothing;
		},
		
		/**
		 * Stops tracking the current tracking target.
		 */
		unTrackRotate: function () {
			delete this._trackRotateTarget;
		},
		
		/**
		 * Translates the camera to the center of the specified entity so
		 * that the camera is "looking at" the entity.
		 * @param {IgeEntity} entity The entity to look at.
		 * @param {Number=} durationMs If specified, will cause the
		 * camera to tween to the location of the entity rather than
		 * snapping to it instantly.
		 * @param {String=} easing The easing method name to use if
		 * tweening by duration.
		 * @return {*}
		 */
		lookAt: function (entity, durationMs, easing) {
			if (entity !== undefined) {
				entity.updateTransform();
				
				if (!durationMs) {
					// Copy the target's world matrix translate data
					this._translate.x = Math.floor(entity._worldMatrix.matrix[2]);
					this._translate.y = Math.floor(entity._worldMatrix.matrix[5]);
				} else {
					this._translate.tween()
						.properties({
							x: Math.floor(entity._worldMatrix.matrix[2]),
							y: Math.floor(entity._worldMatrix.matrix[5]),
							z: 0
						})
						.duration(durationMs)
						.easing(easing)
						.start();
				}
				
				this.updateTransform();
			}
			
			return this;
		},
		
		update: function (ctx) {
			// Process any behaviours assigned to the camera
			this._processUpdateBehaviours(ctx);
			
			// Check if we are tracking the translate value of a target
			if (this._trackTranslateTarget) {
				var targetEntity = this._trackTranslateTarget,
					targetMatrix = targetEntity._worldMatrix.matrix,
					targetX = targetMatrix[2],
					targetY = targetMatrix[5],
					sourceX, sourceY, distX, distY, destinationX, destinationY;
				
				if (!this._trackTranslateSmoothing) {
					// Copy the target's world matrix translate data
					this.lookAt(this._trackTranslateTarget);
				} else {
					// Ease between the current and target values
					sourceX = this._translate.x;
					sourceY = this._translate.y;
					
					distX = Math.round(targetX - sourceX);
					distY = Math.round(targetY - sourceY);
					
					if (this._trackTranslateRounding) {
						destinationX = this._translate.x + Math.round(distX / this._trackTranslateSmoothing);
						destinationY = this._translate.y + Math.round(distY / this._trackTranslateSmoothing);
					} else {
						destinationX = this._translate.x + distX / this._trackTranslateSmoothing;
						destinationY = this._translate.y + distY / this._trackTranslateSmoothing;
					}
					
					// Check camera Limits
					if (this._limit) {
						
						if (destinationX < this._limit.x) {
							destinationX = this._limit.x;
						}
						if (destinationX > this._limit.x + this._limit.width) {
							destinationX = this._limit.x + this._limit.width;
						}
						if (destinationY < this._limit.y) {
							destinationY = this._limit.y;
						}
						if (destinationY > this._limit.y + this._limit.height) {
							destinationY = this._limit.y + this._limit.height;
						}
						
					}
					
					this._translate.x = destinationX;
					this._translate.y = destinationY;
					
				}
			}
			
			// Check if we are tracking the rotation values of a target
			if (this._trackRotateTarget) {
				var targetParentRZ = this._trackRotateTarget._parent !== undefined ? this._trackRotateTarget._parent._rotate.z : 0,
					targetZ = -(targetParentRZ + this._trackRotateTarget._rotate.z),
					sourceZ, distZ;
				
				if (!this._trackRotateSmoothing) {
					// Copy the target's rotate data
					this._rotate.z = targetZ;
				} else {
					// Interpolate between the current and target values
					sourceZ = this._rotate.z;
					distZ = targetZ - sourceZ;
					
					this._rotate.z += distZ / this._trackRotateSmoothing;
				}
			}
			
			this.updateTransform();
		},
		
		/**
		 * Process operations during the engine tick.
		 * @param {CanvasRenderingContext2D} ctx
		 */
		tick: function (ctx) {
			// Process any behaviours assigned to the camera
			this._processTickBehaviours(ctx);
			
			// Updated local transform matrix and then transform the context
			this._localMatrix.transformRenderingContext(ctx);
		},
		
		/**
		 * Checks the current transform values against the previous ones. If
		 * any value is different, the appropriate method is called which will
		 * update the transformation matrix accordingly. This version of the
		 * method is specifically designed for cameras!
		 */
		updateTransform: function () {
			this._localMatrix.identity();
			
			// On cameras we do the rotation and scaling FIRST
			this._localMatrix.multiply(this._localMatrix._newRotate(this._rotate.z));
			this._localMatrix.multiply(this._localMatrix._newScale(this._scale.x, this._scale.y));
			
			// 2d translation - cameras are never in iso mode!
			this._localMatrix.multiply(this._localMatrix._newTranslate(-this._translate.x, -this._translate.y));
			
			if (this._parent) {
				this._worldMatrix.copy(this._parent._worldMatrix);
				this._worldMatrix.multiply(this._localMatrix);
			} else {
				this._worldMatrix.copy(this._localMatrix);
			}
		},
		
		/**
		 * Returns a string containing a code fragment that when
		 * evaluated will reproduce this object's properties via
		 * chained commands. This method will only check for
		 * properties that are directly related to this class.
		 * Other properties are handled by their own class method.
		 * @private
		 * @return {String}
		 */
		_stringify: function () {
			// Get the properties for all the super-classes
			var str = IgeEntity.prototype._stringify.call(this), i;
			
			// Loop properties and add property assignment code to string
			for (i in this) {
				if (this.hasOwnProperty(i) && this[i] !== undefined) {
					switch (i) {
						case '_trackTranslateTarget':
							str += ".trackTranslate(ige.$('" + this._trackTranslateTarget.id() + "'), " + this.trackTranslateSmoothing() + ")";
							break;
						case '_trackRotateTarget':
							str += ".trackRotate(ige.$('" + this._trackRotateTarget.id() + "'), " + this.trackRotateSmoothing() + ")";
							break;
					}
				}
			}
			
			return str;
		}
	});
	
	return IgeCamera;
});
},{"irrelon-appcore":67}],26:[function(_dereq_,module,exports){
"use strict";

var appCore = _dereq_('irrelon-appcore');

appCore.module('IgeCellSheet', function (IgeTexture) {
	/**
	 * Creates a new cell sheet. Cell sheets are textures that are
	 * automatically split up into individual cells based on a cell
	 * width and height.
	 */
	var IgeCellSheet = IgeTexture.extend({
		classId: 'IgeCellSheet',
		IgeSpriteSheet: true,
		
		init: function (url, horizontalCells, verticalCells) {
			var self = this;
			
			self.horizontalCells(horizontalCells || 1);
			self.verticalCells(verticalCells || 1);
			
			IgeTexture.prototype.init.call(this, url);
		},
		
		_textureLoaded: function () {
			if (this.image) {
				// Store the cell sheet image
				this._sheetImage = this.image;
				this._applyCells();
			} else {
				// Unable to create cells from non-image texture
				// TODO: Low-priority - Support cell sheets from smart-textures
				this.log('Cannot create cell-sheet because texture has not loaded an image!', 'error');
			}
			
			IgeTexture.prototype._textureLoaded.call(this);
		},
		
		/**
		 * Returns the total number of cells in the cell sheet.
		 * @return {Number}
		 */
		cellCount: function () {
			return this.horizontalCells() * this.verticalCells();
		},
		
		/**
		 * Gets / sets the number of horizontal cells in the cell sheet.
		 * @param {Number=} val The integer count of the number of horizontal cells in the cell sheet.
		 */
		horizontalCells: function (val) {
			if (val !== undefined) {
				this._cellColumns = val;
				return this;
			}
			
			return this._cellColumns;
		},
		
		/**
		 * Gets / sets the number of vertical cells in the cell sheet.
		 * @param {Number=} val The integer count of the number of vertical cells in the cell sheet.
		 */
		verticalCells: function (val) {
			if (val !== undefined) {
				this._cellRows = val;
				return this;
			}
			
			return this._cellRows;
		},
		
		/**
		 * Sets the x, y, width and height of each sheet cell and stores
		 * that information in the this._cells array.
		 * @private
		 */
		_applyCells: function () {
			var imgWidth, imgHeight,
				rows, columns,
				cellWidth, cellHeight,
				cellIndex,
				xPos, yPos;
			
			// Do we have an image to use?
			if (this.image) {
				// Check we have the correct data for a uniform cell layout
				if (this._cellRows && this._cellColumns) {
					imgWidth = this._sizeX;
					imgHeight = this._sizeY;
					rows = this._cellRows;
					columns = this._cellColumns;
					
					// Store the width and height of a single cell
					cellWidth = this._cellWidth = imgWidth / columns;
					cellHeight = this._cellHeight = imgHeight / rows;
					
					// Check if the cell width and height are non-floating-point
					if (cellWidth !== parseInt(cellWidth, 10)) {
						this.log('Cell width is a floating-point number! (Image Width ' + imgWidth + ' / Number of Columns ' + columns + ' = ' + cellWidth + ') in file: ' + this._url, 'warning');
					}
					
					if (cellHeight !== parseInt(cellHeight, 10)) {
						this.log('Cell height is a floating-point number! (Image Height ' + imgHeight + ' / Number of Rows ' + rows + ' = ' + cellHeight + ')  in file: ' + this._url, 'warning');
					}
					
					// Check if we need to calculate individual cell data
					if (rows > 1 || columns > 1) {
						for (cellIndex = 1; cellIndex <= (rows * columns); cellIndex++) {
							yPos = (Math.ceil(cellIndex / columns) - 1);
							xPos = ((cellIndex - (columns * yPos)) - 1);
							
							// Store the xy in the sheet frames variable
							this._cells[cellIndex] = [(xPos * cellWidth), (yPos * cellHeight), cellWidth, cellHeight];
						}
					} else {
						// The cell data shows only one cell so just store the whole image data
						this._cells[1] = [0, 0, this._sizeX, this._sizeY];
					}
				}
			}
		},
		
		/**
		 * Returns a string containing a code fragment that when
		 * evaluated will reproduce this object.
		 * @return {String}
		 */
		stringify: function () {
			var str = "new " + this.classId() + "('" + this.url() + "', " + this.horizontalCells() + ", " + this.verticalCells() + ")";
			
			// Every object has an ID, assign that first
			// IDs are automatically generated from texture urls
			//str += ".id('" + this.id() + "');";
			
			return str;
		}
	});
	
	return IgeCellSheet;
});
},{"irrelon-appcore":67}],27:[function(_dereq_,module,exports){
var appCore = _dereq_('irrelon-appcore');

appCore.module('IgeClass', function (igeBase) {
	/**
	 * The base class system.
	 */
	var IgeClass = (function () {
		var initializing = false,
			fnTest = /xyz/.test(function () {xyz;}) ? /\b_super\b/ : /.*/,
			
			// The base Class implementation (does nothing)
			IgeClass = function () {},
			
			/**
			 * Provides logging capabilities to all IgeClass instances.
			 * @param {String} text The text to log.
			 * @param {String} type The type of log to output, can be 'log',
			 * 'info', 'warning' or 'error'.
			 * @param {Object=} obj An optional object that will be output
			 * before the log text is output.
			 * @example #Log a message
			 *     var entity = new IgeEntity();
			 *
			 *     // Will output:
			 *     //     IGE *log* [IgeEntity] : hello
			 *     entity.log('Hello');
			 * @example #Log an info message with an optional parameter
			 *     var entity = new IgeEntity(),
			 *         param = 'moo';
			 *
			 *     // Will output:
			 *     //    moo
			 *     //    IGE *log* [IgeEntity] : hello
			 *     entity.log('Hello', 'info', param);
			 * @example #Log a warning message (which will cause a stack trace to be shown)
			 *     var entity = new IgeEntity();
			 *
			 *     // Will output (stack trace is just an example here, real one will be more useful):
			 *     //    Stack: {anonymous}()@<anonymous>:2:8
			 *     //    ---- Object.InjectedScript._evaluateOn (<anonymous>:444:39)
			 *     //    ---- Object.InjectedScript._evaluateAndWrap (<anonymous>:403:52)
			 *     //    ---- Object.InjectedScript.evaluate (<anonymous>:339:21)
			 *     //    IGE *warning* [IgeEntity] : A test warning
			 *     entity.log('A test warning', 'warning');
			 * @example #Log an error message (which will cause an exception to be raised and a stack trace to be shown)
			 *     var entity = new IgeEntity();
			 *
			 *     // Will output (stack trace is just an example here, real one will be more useful):
			 *     //    Stack: {anonymous}()@<anonymous>:2:8
			 *     //    ---- Object.InjectedScript._evaluateOn (<anonymous>:444:39)
			 *     //    ---- Object.InjectedScript._evaluateAndWrap (<anonymous>:403:52)
			 *     //    ---- Object.InjectedScript.evaluate (<anonymous>:339:21)
			 *     //    IGE *error* [IgeEntity] : An error message
			 *     entity.log('An error message', 'error');
			 */
			log = function (text, type, obj) {
				if (igeBase.igeConfig.debug._enabled) {
					var indent = '',
						stack,
						thisId;
					
					if (typeof(this._id) !== 'undefined') {
						thisId = ':' + this._id;
					} else {
						thisId = '';
					}
					
					type = type || 'log';
					
					if (obj !== undefined) {
						console.warn(obj);
					}
					
					if (type === 'warning' || type === 'error') {
						if (igeBase.igeConfig.debug._stacks) {
							if (igeBase.igeConfig.debug._node) {
								if (console.trace) {
									console.trace();
								} else {
									stack = new Error().stack;
									//console.log(color.magenta('Stack:'), color.red(stack));
									console.log('Stack:', stack);
								}
							} else {
								if (typeof(printStackTrace) === 'function') {
									console.log('Stack:', printStackTrace().join('\n ---- '));
								}
							}
						}
					}
					
					if (type === 'error') {
						if (typeof(ige) !== 'undefined') {
							console.log(indent + 'IGE *' + type + '* [' + (this._classId || this.prototype._classId) + thisId + '] : ' + 'Error encountered, stopping engine to prevent console spamming...');
							ige.stop();
						}
						
						if (igeBase.igeConfig.debug._throwErrors) {
							throw(indent + 'IGE *' + type + '* [' + (this._classId || this.prototype._classId) + thisId + '] : ' + text);
						} else {
							console.log(indent + 'IGE *' + type + '* [' + (this._classId || this.prototype._classId) + thisId + '] : ' + text);
						}
					} else {
						console.log(indent + 'IGE *' + type + '* [' + (this._classId || this.prototype._classId) + thisId + '] : ' + text);
					}
				}
				
				return this;
			},
			
			/**
			 * Returns the class id. Primarily used to help identify
			 * what class an instance was instantiated with and is also
			 * output during the ige.scenegraph() method's console logging
			 * to show what class an object belongs to.
			 * @example #Get the class id of an object
			 *     var entity = new IgeEntity();
			 *
			 *     // Will output "IgeEntity"
			 *     console.log(entity.classId());
			 */
			classId = function () {
				return this._classId;
			},
			
			/**
			 * Creates a new instance of the component argument passing
			 * the options argument to the component as it is initialised.
			 * The new component instance is then added to "this" via
			 * a property name that is defined in the component class as
			 * "componentId".
			 * @param {IgeClass} component The class definition of the component.
			 * @param {Object=} options An options parameter to pass to the component
			 * on init.
			 * @example #Add the velocity component to an entity
			 *     var entity = new IgeEntity();
			 *     entity.addComponent(IgeVelocityComponent);
			 *
			 *     // Now that the component is added, we can access
			 *     // the component via it's namespace. Call the
			 *     // "byAngleAndPower" method of the velocity component:
			 *     entity.velocity.byAngleAndPower(Math.radians(20), 0.1);
			 */
			addComponent = function (component, options) {
				var newComponent = new component(this, options);
				this[newComponent.componentId] = newComponent;
				
				// Add the component reference to the class component array
				this._components = this._components || [];
				this._components.push(newComponent);
				
				return this;
			},
			
			/**
			 * Removes a component by it's id.
			 * @param {String} componentId The id of the component to remove.
			 * @example #Remove a component by it's id (namespace)
			 *     var entity = new IgeEntity();
			 *
			 *     // Let's add the velocity component
			 *     entity.addComponent(IgeVelocityComponent);
			 *
			 *     // Now that the component is added, let's remove
			 *     // it via it's id ("velocity")
			 *     entity.removeComponent('velocity');
			 */
			removeComponent = function (componentId) {
				// If the component has a destroy method, call it
				if (this[componentId] && this[componentId].destroy) {
					this[componentId].destroy();
				}
				
				// Remove the component from the class component array
				if (this._components) {
					this._components.pull(this[componentId]);
				}
				
				// Remove the component namespace from the class object
				delete this[componentId];
				return this;
			},
			
			/**
			 * Copies all properties and methods from the classObj object
			 * to "this". If the overwrite flag is not set or set to false,
			 * only properties and methods that don't already exists in
			 * "this" will be copied. If overwrite is true, they will be
			 * copied regardless.
			 * @param {Function} classObj
			 * @param {Boolean} overwrite
			 * @example #Implement all the methods of an object into another object
			 *     // Create a couple of test entities with ids
			 *     var entity1 = new IgeEntity().id('entity1'),
			 *         entity2 = new IgeEntity().id('entity2');
			 *
			 *     // Let's define an object with a couple of methods
			 *     var obj = {
			 *         newMethod1: function () {
			 *             console.log('method1 called on object: ' + this.id());
			 *         },
			 *
			 *         newMethod2: function () {
			 *             console.log('method2 called on object: ' + this.id());
			 *         }
			 *     };
			 *
			 *     // Now let's implement the methods on our entities
			 *     entity1.implement(obj);
			 *     entity2.implement(obj);
			 *
			 *     // The entities now have the newMethod1 and newMethod2
			 *     // methods as part of their instance so we can call them:
			 *     entity1.newMethod1();
			 *
			 *     // The output to the console is:
			 *     //    method1 called on object: entity1
			 *
			 *     // Now let's call newMethod2 on entity2:
			 *     entity2.newMethod2();
			 *
			 *     // The output to the console is:
			 *     //    method2 called on object: entity2
			 *
			 *     // As you can see, this is a great way to add extra modular
			 *     // functionality to objects / entities at runtime.
			 */
			implement = function (classObj, overwrite) {
				var i, obj = classObj.prototype || classObj;
				
				// Copy the class object's properties to (this)
				for (i in obj) {
					// Only copy the property if this doesn't already have it
					if (obj.hasOwnProperty(i) && (overwrite || this[i] === undefined)) {
						this[i] = obj[i];
					}
				}
				return this;
			},
			
			/**
			 * Gets / sets a key / value pair in the object's data object. Useful for
			 * storing arbitrary game data in the object.
			 * @param {String} key The key under which the data resides.
			 * @param {*=} value The data to set under the specified key.
			 * @example #Set some arbitrary data key value pair
			 *     var entity = new IgeEntity();
			 *     entity.data('playerScore', 100);
			 *     entity.data('playerName', 'iRock');
			 * @example #Get the value of a data key
			 *     console.log(entity.data('playerScore'));
			 *     console.log(entity.data('playerName'));
			 * @return {*}
			 */
			data = function (key, value) {
				if (key !== undefined) {
					if (value !== undefined) {
						this._data = this._data || {};
						this._data[key] = value;
						
						return this;
					}
					
					if (this._data) {
						return this._data[key];
					} else {
						return null;
					}
				}
			};
		
		/**
		 * Create a new IgeClass that inherits from this class
		 * @name extend
		 * @example #Creating a new class by extending an existing one
		 *     var NewClass = IgeClass.extend({
		 *         // Init is your constructor
		 *         init: function () {
		 *             console.log('I\'m alive!');
		 *         }
		 *     });
		 *
		 * Further reading: [Extending Classes](http://www.isogenicengine.com/documentation/isogenic-game-engine/versions/1-1-0/manual/engine-fundamentals/classes/extending-classes/)
		 * @return {Function}
		 */
		IgeClass.extend = function () {
			var name,
				prototype,
				// Set prop to the last argument passed
				prop = arguments[arguments.length - 1],
				extensionArray = arguments[0],
				extensionItem,
				extensionOverwrite,
				extensionIndex,
				propertyIndex,
				propertyObject;
			
			// Check that the class has been assigned a classId and bug out if not
			if (!prop.classId) {
				console.log(prop);
				throw('Cannot create a new class without giving the class a classId property!');
			}
			
			// Check that the classId is not already in use
			if (igeBase.igeClassStore[prop.classId]) {
				// This classId has already been used, bug out
				throw('Cannot create class with classId "' + prop.classId + '" because a class with that ID has already been created!');
			}
			
			// Instantiate a base class (but only create the instance,
			// don't run the init constructor)
			initializing = true;
			prototype = new this();
			initializing = false;
			
			// Copy the properties over onto the new prototype
			for (name in prop) {
				if (prop.hasOwnProperty(name)) {
					// Copy the property
					prototype[name] = prop[name];
				}
			}
			
			// Now implement any other extensions
			if (arguments.length > 1) {
				if (extensionArray && extensionArray.length) {
					for (extensionIndex = 0; extensionIndex < extensionArray.length; extensionIndex++) {
						extensionItem = extensionArray[extensionIndex];
						propertyObject = extensionItem.extension.prototype || extensionItem.extension;
						extensionOverwrite = extensionItem.overwrite;
						
						// Copy the class object's properties to (this)
						for (propertyIndex in propertyObject) {
							// Only copy the property if this doesn't already have it or
							// the extension is set to overwrite any existing properties
							if (propertyObject.hasOwnProperty(propertyIndex) && (extensionOverwrite || prototype[propertyIndex] === undefined)) {
								prototype[propertyIndex] = propertyObject[propertyIndex];
							}
						}
					}
				}
			}
			
			//prototype._superClass = this.prototype;
			//console.log(prop.classId, 'extends', this.prototype._classId);
			
			// The dummy class constructor
			function IgeClass() {
				if (!initializing && this.init) {
					// Call the class init method
					this.init.apply(this, arguments);
				}
			}
			
			// Populate our constructed prototype object
			IgeClass.prototype = prototype;
			
			// Enforce the constructor to be what we expect
			IgeClass.prototype.constructor = IgeClass;
			
			// And make this class extensible
			IgeClass.extend = arguments.callee; // jshint:ignore line
			
			// Add log capability
			IgeClass.prototype.log = log;
			
			// Add data capability
			IgeClass.prototype.data = data;
			
			// Add class name capability
			IgeClass.prototype.classId = classId; // This is a method that returns _classId
			IgeClass.prototype._classId = prop.classId || 'IgeClass';
			
			// Add the addComponent method
			IgeClass.prototype.addComponent = addComponent;
			
			// Add the removeComponent method
			IgeClass.prototype.removeComponent = removeComponent;
			
			// Add the implement method
			IgeClass.prototype.implement = implement;
			
			// Add editor settings
			IgeClass.prototype.__igeEditor = prop.editorOptions;
			
			// Register the class with the class store
			igeBase.igeClassStore[prop.classId] = IgeClass;
			
			return IgeClass;
		};
		
		/**
		 * Test method
		 * @param prop
		 * @return {Function}
		 */
		IgeClass.vanilla = function (prop) {
			var IgeClass = prop.init || function () {},
				prototype = new this(),
				name;
			
			// Copy the properties over onto the new prototype
			for (name in prop) {
				if (prop.hasOwnProperty(name) && name !== 'init') {
					// Copy the property
					prototype[name] = prop[name];
				}
			}
			
			// Populate our constructed prototype object
			IgeClass.prototype = prototype;
			
			// Enforce the constructor to be what we expect
			IgeClass.prototype.constructor = IgeClass;
			
			// And make this class extensible
			IgeClass.extend = this.extend;
			
			// Add log capability
			IgeClass.prototype.log = log;
			
			// Add data capability
			IgeClass.prototype.data = data;
			
			// Add class name capability
			IgeClass.prototype.classId = classId; // This is a method that returns _classId
			IgeClass.prototype._classId = prop.classId || 'IgeClass';
			
			// Add the addComponent method
			IgeClass.prototype.addComponent = addComponent;
			
			// Add the removeComponent method
			IgeClass.prototype.removeComponent = removeComponent;
			
			// Add the implement method
			IgeClass.prototype.implement = implement;
			
			// Register the class with the class store
			igeBase.igeClassStore[prop.classId] = IgeClass;
			
			return IgeClass;
		};
		
		IgeClass.prototype._classId = 'IgeClass';
		
		return IgeClass;
	}());
	
	return IgeClass;
});
},{"irrelon-appcore":67}],28:[function(_dereq_,module,exports){
"use strict";

var appCore = _dereq_('irrelon-appcore');

appCore.module('IgeCollisionMap2d', function (IgeEntity, IgeMap2d) {
	var IgeCollisionMap2d = IgeEntity.extend({
		classId: 'IgeCollisionMap2d',
		
		init: function (tileWidth, tileHeight) {
			IgeEntity.prototype.init.call(this);
			var self = this;
			
			this.map = new IgeMap2d();
		},
		
		mapData: function (val) {
			if (val !== undefined) {
				this.map.mapData(val);
				return this;
			}
			
			return this.map.mapData();
		}
	});
	
	return IgeCollisionMap2d;
});
},{"irrelon-appcore":67}],29:[function(_dereq_,module,exports){
"use strict";

var appCore = _dereq_('irrelon-appcore');

appCore.module('IgeDummyCanvas', function (IgeDummyContext) {
	var nullMethod = function () {},
		IgeDummyCanvas = function () {
			this.dummy = true;
			this.width = 0;
			this.height = 0;
		};
	
	IgeDummyCanvas.prototype.getContext = function () {
		return IgeDummyContext;
	};
	
	return IgeDummyCanvas;
});
},{"irrelon-appcore":67}],30:[function(_dereq_,module,exports){
"use strict";

var appCore = _dereq_('irrelon-appcore');

appCore.module('IgeDummyContext', function () {
	var nullMethod = function () {},
		IgeDummyContext = {
			dummy: true,
			save: nullMethod,
			restore: nullMethod,
			translate: nullMethod,
			rotate: nullMethod,
			scale: nullMethod,
			drawImage: nullMethod,
			fillRect: nullMethod,
			strokeRect: nullMethod,
			stroke: nullMethod,
			fill: nullMethod,
			rect: nullMethod,
			moveTo: nullMethod,
			lineTo: nullMethod,
			arc: nullMethod,
			clearRect: nullMethod,
			beginPath: nullMethod,
			clip: nullMethod,
			transform: nullMethod,
			setTransform: nullMethod,
			fillText: nullMethod
		};
	
	return IgeDummyContext;
});
},{"irrelon-appcore":67}],31:[function(_dereq_,module,exports){
"use strict";

var appCore = _dereq_('irrelon-appcore');

appCore.module('IgeEngine', function (
	igeBase,
	IgeEntity,
	IgeCocoonJsComponent,
	IgeInputComponent,
	IgeTweenComponent,
	IgeTimeComponent,
	IgeUiManagerComponent,
	IgePoint3d,
	IgeDummyContext,
	IgeArray) {
		/**
		 * The base engine class definition.
		 */
		var IgeEngine = IgeEntity.extend({
			classId: 'IgeEngine',
			
			init: function () {
				// Deal with some debug settings first
				if (igeBase.igeConfig.debug) {
					if (!igeBase.igeConfig.debug._enabled) {
						// Debug is not enabled so ensure that
						// timing debugs are disabled
						igeBase.igeConfig.debug._timing = false;
					}
				}
				
				this._alwaysInView = true;
				
				this._id = 'ige';
				this.basePath = '';
				
				// Determine the environment we are executing in
				this.isServer = (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined' && typeof window === 'undefined');
				this.isClient = !this.isServer;
				
				if (this.isClient) {
					window.ige = this;
				}
				
				// Output our header
				console.log('------------------------------------------------------------------------------');
				console.log('* Powered by the Isogenic Game Engine ' + igeBase.igeVersion + '                  *');
				console.log('* (C)opyright ' + new Date().getFullYear() + ' Irrelon Software Limited                                  *');
				console.log('* http://www.isogenicengine.com                                              *');
				console.log('------------------------------------------------------------------------------');
				
				IgeEntity.prototype.init.call(this);
				
				// Check if we are running client-side
				if (this.isClient) {
					// Enable cocoonJS support because we are running client-side
					this.addComponent(IgeCocoonJsComponent);
				}
				
				// Create storage
				this._textureStore = [];
				
				// Set the initial id as the current time in milliseconds. This ensures that under successive
				// restarts of the engine, new ids will still always be created compared to earlier runs -
				// which is important when storing persistent data with ids etc
				this._idCounter = new Date().getTime();
				
				// Setup components
				this.addComponent(IgeInputComponent);
				this.addComponent(IgeTweenComponent);
				this.addComponent(IgeTimeComponent);
				
				if (this.isClient) {
					// Enable UI element (virtual DOM) support
					this.addComponent(IgeUiManagerComponent);
				}
				
				// Set some defaults
				this._renderModes = [
					'2d',
					'three'
				];
				
				this._requireScriptTotal = 0;
				this._requireScriptLoading = 0;
				this._loadingPreText = undefined; // The text to put in front of the loading percent on the loading progress screen
				this._enableUpdates = true;
				this._enableRenders = true;
				this._showSgTree = false;
				this._debugEvents = {}; // Holds debug event booleans for named events
				this._renderContext = '2d'; // The rendering context, default is 2d
				this._renderMode = this._renderModes[this._renderContext]; // Integer representation of the render context
				this._tickTime = 'NA'; // The time the tick took to process
				this._updateTime = 'NA'; // The time the tick update section took to process
				this._renderTime = 'NA'; // The time the tick render section took to process
				this._tickDelta = 0; // The time between the last tick and the current one
				this._fpsRate = 60; // Sets the frames per second to execute engine tick's at
				this._state = 0; // Currently stopped
				this._textureImageStore = {};
				this._texturesLoading = 0; // Holds a count of currently loading textures
				this._texturesTotal = 0; // Holds total number of textures loading / loaded
				this._dependencyQueue = []; // Holds an array of functions that must all return true for the engine to start
				this._drawCount = 0; // Holds the number of draws since the last frame (calls to drawImage)
				this._dps = 0; // Number of draws that occurred last tick
				this._dpf = 0;
				this._frames = 0; // Number of frames looped through since last second tick
				this._fps = 0; // Number of frames per second
				this._clientNetDiff = 0; // The difference between the server and client comms (only non-zero on clients)
				this._frameAlternator = false; // Is set to the boolean not of itself each frame
				this._viewportDepth = false;
				this._mousePos = new IgePoint3d(0, 0, 0);
				this._currentViewport = null; // Set in IgeViewport.js tick(), holds the current rendering viewport
				this._currentCamera = null; // Set in IgeViewport.js tick(), holds the current rendering viewport's camera
				this._currentTime = 0; // The current engine time
				this._globalSmoothing = false; // Determines the default smoothing setting for new textures
				this._register = {
					'ige': this
				}; // Holds a reference to every item in the scenegraph by it's ID
				this._categoryRegister = {}; // Holds reference to every item with a category
				this._groupRegister = {}; // Holds reference to every item with a group
				this._postTick = []; // An array of methods that are called upon tick completion
				this._timeSpentInUpdate = {}; // An object holding time-spent-in-update (total time spent in this object's update method)
				this._timeSpentLastUpdate = {}; // An object holding time-spent-last-update (time spent in this object's update method last tick)
				this._timeSpentInTick = {}; // An object holding time-spent-in-tick (total time spent in this object's tick method)
				this._timeSpentLastTick = {}; // An object holding time-spent-last-tick (time spent in this object's tick method last tick)
				this._timeScale = 1; // The default time scaling factor to speed up or slow down engine time
				this._globalScale = new IgePoint3d(1, 1, 1);
				this._graphInstances = []; // Holds an array of instances of graph classes
				this._spawnQueue = []; // Holds an array of entities that are yet to be born
				
				// Set the context to a dummy context to start
				// with in case we are in "headless" mode and
				// a replacement context never gets assigned
				this._ctx = IgeDummyContext;
				this._headless = true;
				
				this.dependencyTimeout(30000); // Wait 30 seconds to load all dependencies then timeout
				
				// Add the textures loaded dependency
				this._dependencyQueue.push(this.texturesLoaded);
				//this._dependencyQueue.push(this.canvasReady);
				
				// Start a timer to record every second of execution
				this._secondTimer = setInterval(this._secondTick, 1000);
			},
			
			/**
			 * Returns an object from the engine's object register by
			 * the object's id. If the item passed is not a string id
			 * then the item is returned as is. If no item is passed
			 * the engine itself is returned.
			 * @param {String || Object} item The id of the item to return,
			 * or if an object, returns the object as-is.
			 */
			$: function (item) {
				if (typeof(item) === 'string') {
					return this._register[item];
				} else if (typeof(item) === 'object') {
					return item;
				}
				
				return this;
			},
			
			/**
			 * Returns an array of all objects that have been assigned
			 * the passed category name.
			 * @param {String} categoryName The name of the category to return
			 * all objects for.
			 */
			$$: function (categoryName) {
				return this._categoryRegister[categoryName] || new IgeArray();
			},
			
			/**
			 * Returns an array of all objects that have been assigned
			 * the passed group name.
			 * @param {String} groupName The name of the group to return
			 * all objects for.
			 */
			$$$: function (groupName) {
				return this._groupRegister[groupName] || new IgeArray();
			},
			
			/**
			 * Register an object with the engine object register. The
			 * register allows you to access an object by it's id with
			 * a call to ige.$(objectId).
			 * @param {Object} obj The object to register.
			 * @return {*}
			 */
			register: function (obj) {
				if (obj !== undefined) {
					if (!this._register[obj.id()]) {
						this._register[obj.id()] = obj;
						obj._registered = true;
						
						return this;
					} else {
						obj._registered = false;
						
						this.log('Cannot add object id "' + obj.id() + '" to scenegraph because there is already another object in the graph with the same ID!', 'error');
						return false;
					}
				}
				
				return this._register;
			},
			
			/**
			 * Un-register an object with the engine object register. The
			 * object will no longer be accessible via ige.$().
			 * @param {Object} obj The object to un-register.
			 * @return {*}
			 */
			unRegister: function (obj) {
				if (obj !== undefined) {
					// Check if the object is registered in the ID lookup
					if (this._register[obj.id()]) {
						delete this._register[obj.id()];
						obj._registered = false;
					}
				}
				
				return this;
			},
			
			/**
			 * Register an object with the engine category register. The
			 * register allows you to access an object by it's category with
			 * a call to ige.$$(categoryName).
			 * @param {Object} obj The object to register.
			 * @return {*}
			 */
			categoryRegister: function (obj) {
				if (obj !== undefined) {
					this._categoryRegister[obj._category] = this._categoryRegister[obj._category] || new IgeArray();
					this._categoryRegister[obj._category].push(obj);
					obj._categoryRegistered = true;
				}
				
				return this._register;
			},
			
			/**
			 * Un-register an object with the engine category register. The
			 * object will no longer be accessible via ige.$$().
			 * @param {Object} obj The object to un-register.
			 * @return {*}
			 */
			categoryUnRegister: function (obj) {
				if (obj !== undefined) {
					if (this._categoryRegister[obj._category]) {
						this._categoryRegister[obj._category].pull(obj);
						obj._categoryRegistered = false;
					}
				}
				
				return this;
			},
			
			/**
			 * Register an object with the engine group register. The
			 * register allows you to access an object by it's groups with
			 * a call to ige.$$$(groupName).
			 * @param {Object} obj The object to register.
			 * @param {String} groupName The name of the group to register
			 * the object in.
			 * @return {*}
			 */
			groupRegister: function (obj, groupName) {
				if (obj !== undefined) {
					this._groupRegister[groupName] = this._groupRegister[groupName] || new IgeArray();
					this._groupRegister[groupName].push(obj);
					obj._groupRegistered = true;
				}
				
				return this._register;
			},
			
			/**
			 * Un-register an object with the engine group register. The
			 * object will no longer be accessible via ige.$$$().
			 * @param {Object} obj The object to un-register.
			 * @param {String} groupName The name of the group to un-register
			 * the object from.
			 * @return {*}
			 */
			groupUnRegister: function (obj, groupName) {
				if (obj !== undefined) {
					if (groupName !== undefined) {
						if (this._groupRegister[groupName]) {
							this._groupRegister[groupName].pull(obj);
							
							if (!obj.groupCount()) {
								obj._groupRegister = false;
							}
						}
					} else {
						// Call the removeAllGroups() method which will loop
						// all the groups that the object belongs to and
						// automatically un-register them
						obj.removeAllGroups();
					}
				}
				
				return this;
			},
			
			sync: function (method, attrArr) {
				if (typeof(attrArr) === 'string') {
					attrArr = [attrArr];
				}
				
				this._syncArr = this._syncArr || [];
				this._syncArr.push({method: method, attrArr: attrArr});
				
				if (this._syncArr.length === 1) {
					// Start sync waterfall
					this._syncIndex = 0;
					this._processSync();
				}
			},
			
			_processSync: function () {
				var syncEntry;
				
				if (ige._syncIndex < ige._syncArr.length) {
					syncEntry = ige._syncArr[ige._syncIndex];
					
					// Add the callback to the last attribute
					syncEntry.attrArr.push(function () {
						ige._syncIndex++;
						setTimeout(ige._processSync, 1);
					});
					
					// Call the method
					syncEntry.method.apply(ige, syncEntry.attrArr);
				} else {
					// Reached end of sync cycle
					delete ige._syncArr;
					delete ige._syncIndex;
					
					ige.emit('syncComplete');
				}
			},
			
			/**
			 * Load a js script file into memory via a path or url.
			 * @param {String} url The file's path or url.
			 * @param {Function=} callback Optional callback when script loads.
			 */
			requireScript: function (url, callback) {
				if (url !== undefined) {
					var self = this;
					
					// Add to the load counter
					self._requireScriptTotal++;
					self._requireScriptLoading++;
					
					// Create the script element
					var elem = document.createElement('script');
					elem.addEventListener('load', function () {
						self._requireScriptLoaded(this);
						
						if (callback) {
							setTimeout(function () { callback(); }, 100);
						}
					});
					
					// For compatibility with CocoonJS
					document.body.appendChild(elem);
					
					// Set the source to load the url
					elem.src = url;
					
					this.log('Loading script from: ' + url);
					this.emit('requireScriptLoading', url);
				}
			},
			
			/**
			 * Called when a js script has been loaded via the requireScript
			 * method.
			 * @param {Element} elem The script element added to the DOM.
			 * @private
			 */
			_requireScriptLoaded: function (elem) {
				this._requireScriptLoading--;
				
				this.emit('requireScriptLoaded', elem.src);
				
				if (this._requireScriptLoading === 0) {
					// All scripts have loaded, fire the engine event
					this.emit('allRequireScriptsLoaded');
				}
			},
			
			/**
			 * Load a css style file into memory via a path or url.
			 * @param {String} url The file's path or url.
			 */
			requireStylesheet: function (url) {
				if (url !== undefined) {
					var self = this;
					
					// Load the engine stylesheet
					var css = document.createElement('link');
					css.rel = 'stylesheet';
					css.type = 'text/css';
					css.media = 'all';
					css.href = url;
					
					document.getElementsByTagName('head')[0].appendChild(css);
					
					this.log('Load css stylesheet from: ' + url);
				}
			},
			
			/**
			 * Adds a scenegraph class into memory.
			 * @param {String} className The name of the scenegraph class.
			 * @param {Object=} options Optional object to pass to the scenegraph class graph() method.
			 * @returns {*}
			 */
			addGraph: function (className, options) {
				if (className !== undefined) {
					var classObj = this.getClass(className),
						classInstance;
					
					if (classObj) {
						this.log('Loading SceneGraph data class: ' + className);
						classInstance = this.newClassInstance(className);
						
						// Make sure the graph class implements the required methods "addGraph" and "removeGraph"
						if (typeof(classInstance.addGraph) === 'function' && typeof(classInstance.removeGraph) === 'function') {
							// Call the class's graph() method passing the options in
							classInstance.addGraph(options);
							
							// Add the graph instance to the holding array
							this._graphInstances[className] = classInstance;
						} else {
							this.log('Could not load graph for class name "' + className + '" because the class does not implement both the require methods "addGraph()" and "removeGraph()".', 'error');
						}
					} else {
						this.log('Cannot load graph for class name "' + className + '" because the class could not be found. Have you included it in your server/clientConfig.js file?', 'error');
					}
				}
				
				return this;
			},
			
			/**
			 * Removes a scenegraph class into memory.
			 * @param {String} className The name of the scenegraph class.
			 * @param {Object=} options Optional object to pass to the scenegraph class graph() method.
			 * @returns {*}
			 */
			removeGraph: function (className, options) {
				if (className !== undefined) {
					var classInstance = this._graphInstances[className];
					
					if (classInstance) {
						this.log('Removing SceneGraph data class: ' + className);
						
						// Call the class's graph() method passing the options in
						classInstance.removeGraph(options);
						
						// Now remove the graph instance from the graph instance array
						delete this._graphInstances[className];
					} else {
						this.log('Cannot remove graph for class name "' + className + '" because the class instance could not be found. Did you add it via ige.addGraph() ?', 'error');
					}
				}
				
				return this;
			},
			
			/**
			 * Allows the update() methods of the entire scenegraph to
			 * be temporarily enabled or disabled. Useful for debugging.
			 * @param {Boolean=} val If false, will disable all update() calls.
			 * @returns {*}
			 */
			enableUpdates: function (val) {
				if (val !== undefined) {
					this._enableUpdates = val;
					return this;
				}
				
				return this._enableUpdates;
			},
			
			/**
			 * Allows the tick() methods of the entire scenegraph to
			 * be temporarily enabled or disabled. Useful for debugging.
			 * @param {Boolean=} val If false, will disable all tick() calls.
			 * @returns {*}
			 */
			enableRenders: function (val) {
				if (val !== undefined) {
					this._enableRenders = val;
					return this;
				}
				
				return this._enableRenders;
			},
			
			/**
			 * Enables or disables the engine's debug mode. Enabled by default.
			 * @param {Boolean=} val If true, will enable debug mode.
			 * @returns {*}
			 */
			debugEnabled: function (val) {
				if (val !== undefined) {
					if (igeBase.igeConfig.debug) {
						igeBase.igeConfig.debug._enabled = val;
					}
					return this;
				}
				
				return igeBase.igeConfig.debug._enabled;
			},
			
			/**
			 * Enables or disables the engine's debug timing system. The
			 * timing system will time all update and rendering code down
			 * the scenegraph and is useful for tracking long-running code
			 * but comes with a small performance penalty when enabled.
			 * Enabled by default.
			 * @param {Boolean=} val If true, will enable debug timing mode.
			 * @returns {*}
			 */
			debugTiming: function (val) {
				if (val !== undefined) {
					if (igeBase.igeConfig.debug) {
						igeBase.igeConfig.debug._timing = val;
					}
					return this;
				}
				
				return igeBase.igeConfig.debug._timing;
			},
			
			debug: function (eventName) {
				if (this._debugEvents[eventName] === true || this._debugEvents[eventName] === ige._frames) {
					debugger;
				}
			},
			
			debugEventOn: function (eventName) {
				this._debugEvents[eventName] = true;
			},
			
			debugEventOff: function (eventName) {
				this._debugEvents[eventName] = false;
			},
			
			triggerDebugEventFrame: function (eventName) {
				this._debugEvents[eventName] = ige._frames;
			},
			
			/**
			 * Sets the opacity of every object on the scenegraph to
			 * zero *except* the one specified by the given id argument.
			 * @param {String} id The id of the object not to hide.
			 */
			hideAllExcept: function (id) {
				var i,
					arr = this._register;
				
				for (i in arr) {
					if (i !== id) {
						arr[i].opacity(0);
					}
				}
			},
			
			/**
			 * Calls the show() method for every object on the scenegraph.
			 */
			showAll: function () {
				var i,
					arr = this._register;
				
				for (i in arr) {
					arr[i].show();
				}
			},
			
			/**
			 * Sets the frame rate at which new engine steps are fired.
			 * Setting this rate will override the default requestAnimFrame()
			 * method as defined in IgeBase.js and on the client-side, will
			 * stop usage of any available requestAnimationFrame() method
			 * and will use a setTimeout()-based version instead.
			 * @param {Number} fpsRate
			 */
			setFps: function (fpsRate) {
				if (fpsRate !== undefined) {
					// Override the default requestAnimFrame handler and set
					// our own method up so that we can control the frame rate
					if (this.isServer) {
						// Server-side implementation
						requestAnimFrame = function(callback, element){
							setTimeout(function () { callback(new Date().getTime()); }, 1000 / fpsRate);
						};
					} else {
						// Client-side implementation
						window.requestAnimFrame = function(callback, element){
							setTimeout(function () { callback(new Date().getTime()); }, 1000 / fpsRate);
						};
					}
				}
			},
			
			showStats: function () {
				this.log('showStats has been removed from the ige in favour of the new editor component, please remove this call from your code.');
			},
			
			/**
			 * Defines a class in the engine's class repository.
			 * @param {String} id The unique class ID or name.
			 * @param {Object} obj The class definition.
			 */
			defineClass: function (id, obj) {
				igeBase.igeClassStore[id] = obj;
			},
			
			/**
			 * Retrieves a class by it's ID that was defined with
			 * a call to defineClass().
			 * @param {String} id The ID of the class to retrieve.
			 * @return {Object} The class definition.
			 */
			getClass: function (id) {
				return igeBase.igeClassStore[id];
			},
			
			/**
			 * Returns true if the class specified has been defined.
			 * @param {String} id The ID of the class to check for.
			 * @returns {*}
			 */
			classDefined: function (id) {
				return Boolean(igeBase.igeClassStore[id]);
			},
			
			/**
			 * Generates a new instance of a class defined with a call
			 * to the defineClass() method. Passes the options
			 * parameter to the new class during it's constructor call.
			 * @param id
			 * @param options
			 * @return {*}
			 */
			newClassInstance: function (id, options) {
				return new igeBase.igeClassStore[id](options);
			},
			
			/**
			 * Checks if all engine start dependencies have been satisfied.
			 * @return {Boolean}
			 */
			dependencyCheck: function () {
				var arr = this._dependencyQueue,
					arrCount = arr.length;
				
				while (arrCount--) {
					if (!this._dependencyQueue[arrCount]()) {
						return false;
					}
				}
				
				return true;
			},
			
			/**
			 * Gets / sets the flag that determines if viewports should be sorted by depth
			 * like regular entities, before they are processed for rendering each frame.
			 * Depth-sorting viewports increases processing requirements so if you do not
			 * need to stack viewports in a particular order, keep this flag false.
			 * @param {Boolean} val
			 * @return {Boolean}
			 */
			viewportDepth: function (val) {
				if (val !== undefined) {
					this._viewportDepth = val;
					return this;
				}
				
				return this._viewportDepth;
			},
			
			/**
			 * Sets the number of milliseconds before the engine gives up waiting for dependencies
			 * to be satisfied and cancels the startup procedure.
			 * @param val
			 */
			dependencyTimeout: function (val) {
				this._dependencyCheckTimeout = val;
			},
			
			/**
			 * Updates the loading screen DOM elements to show the update progress.
			 */
			updateProgress: function () {
				// Check for a loading progress bar DOM element
				if (typeof(document) !== 'undefined' && document.getElementById) {
					var elem = document.getElementById('loadingProgressBar'),
						textElem = document.getElementById('loadingText');
					
					if (elem) {
						// Calculate the width from progress
						var totalWidth = parseInt(elem.parentNode.offsetWidth),
							currentWidth = Math.floor((totalWidth / this._texturesTotal) * (this._texturesTotal - this._texturesLoading));
						
						// Set the current bar width
						elem.style.width = currentWidth + 'px';
						
						if (textElem) {
							if (this._loadingPreText === undefined) {
								// Fill the text to use
								this._loadingPreText = textElem.innerHTML;
							}
							textElem.innerHTML = this._loadingPreText + ' ' + Math.floor((100 / this._texturesTotal) * (this._texturesTotal - this._texturesLoading)) + '%';
						}
					}
				}
			},
			
			/**
			 * Adds one to the number of textures currently loading.
			 */
			textureLoadStart: function (url, textureObj) {
				this._texturesLoading++;
				this._texturesTotal++;
				
				this.updateProgress();
				
				this.emit('textureLoadStart', textureObj);
			},
			
			/**
			 * Subtracts one from the number of textures currently loading and if no more need
			 * to load, it will also call the _allTexturesLoaded() method.
			 */
			textureLoadEnd: function (url, textureObj) {
				var self = this;
				
				if (!textureObj._destroyed) {
					// Add the texture to the _textureStore array
					this._textureStore.push(textureObj);
				}
				
				// Decrement the overall loading number
				this._texturesLoading--;
				
				this.updateProgress();
				
				this.emit('textureLoadEnd', textureObj);
				
				// If we've finished...
				if (this._texturesLoading === 0) {
					// All textures have finished loading
					this.updateProgress();
					
					setTimeout(function () {
						self._allTexturesLoaded();
					}, 100);
				}
			},
			
			/**
			 * Returns a texture from the texture store by it's url.
			 * @param {String} url
			 * @return {IgeTexture}
			 */
			textureFromUrl: function (url) {
				var arr = this._textureStore,
					arrCount = arr.length,
					item;
				
				while (arrCount--) {
					item = arr[arrCount];
					if (item._url === url) {
						return item;
					}
				}
			},
			
			/**
			 * Checks if all textures have finished loading and returns true if so.
			 * @return {Boolean}
			 */
			texturesLoaded: function () {
				return ige._texturesLoading === 0;
			},
			
			/**
			 * Emits the "texturesLoaded" event.
			 * @private
			 */
			_allTexturesLoaded: function () {
				if (!this._loggedATL) {
					this._loggedATL = true;
					this.log('All textures have loaded');
				}
				
				// Fire off an event about this
				this.emit('texturesLoaded');
			},
			
			/**
			 * Gets / sets the default smoothing value for all new
			 * IgeTexture class instances. If set to true, all newly
			 * created textures will have smoothing enabled by default.
			 * @param val
			 * @return {*}
			 */
			globalSmoothing: function (val) {
				if (val !== undefined) {
					this._globalSmoothing = val;
					return this;
				}
				
				return this._globalSmoothing;
			},
			
			/**
			 * Checks to ensure that a canvas has been assigned to the engine or that the
			 * engine is in server mode.
			 * @return {Boolean}
			 */
			canvasReady: function () {
				return (ige._canvas !== undefined || ige.isServer);
			},
			
			/**
			 * Generates a new unique ID
			 * @return {String}
			 */
			newId: function () {
				this._idCounter++;
				return String(this._idCounter + (Math.random() * Math.pow(10, 17) + Math.random() * Math.pow(10, 17) + Math.random() * Math.pow(10, 17) + Math.random() * Math.pow(10, 17)));
			},
			
			/**
			 * Generates a new 16-character hexadecimal unique ID
			 * @return {String}
			 */
			newIdHex: function () {
				this._idCounter++;
				return (this._idCounter + (Math.random() * Math.pow(10, 17) + Math.random() * Math.pow(10, 17) + Math.random() * Math.pow(10, 17) + Math.random() * Math.pow(10, 17))).toString(16);
			},
			
			/**
			 * Generates a new 16-character hexadecimal ID based on
			 * the passed string. Will always generate the same ID
			 * for the same string.
			 * @param {String} str A string to generate the ID from.
			 * @return {String}
			 */
			newIdFromString: function (str) {
				if (str !== undefined) {
					var id,
						val = 0,
						count = str.length,
						i;
					
					for (i = 0; i < count; i++) {
						val += str.charCodeAt(i) * Math.pow(10, 17);
					}
					
					id = (val).toString(16);
					
					// Check if the ID is already in use
					while (ige.$(id)) {
						val += Math.pow(10, 17);
						id = (val).toString(16);
					}
					
					return id;
				}
			},
			
			/**
			 * Starts the engine.
			 * @param callback
			 */
			start: function (callback) {
				if (!ige._state) {
					// Check if we are able to start based upon any registered dependencies
					if (ige.dependencyCheck()) {
						// Start the engine
						ige.log('Starting engine...');
						ige._state = 1;
						
						// Check if we have a DOM, that there is an igeLoading element
						// and if so, remove it from the DOM now
						if (this.isClient) {
							if (document.getElementsByClassName && document.getElementsByClassName('igeLoading')) {
								var arr = document.getElementsByClassName('igeLoading'),
									arrCount = arr.length;
								
								while (arrCount--) {
									arr[arrCount].parentNode.removeChild(arr[arrCount]);
								}
							}
						}
						
						requestAnimFrame(ige.engineStep);
						
						ige.log('Engine started');
						
						// Fire the callback method if there was one
						if (typeof(callback) === 'function') {
							callback(true);
						}
					} else {
						// Get the current timestamp
						var curTime = new Date().getTime();
						
						// Record when we first started checking for dependencies
						if (!ige._dependencyCheckStart) {
							ige._dependencyCheckStart = curTime;
						}
						
						// Check if we have timed out
						if (curTime - ige._dependencyCheckStart > this._dependencyCheckTimeout) {
							this.log('Engine start failed because the dependency check timed out after ' + (this._dependencyCheckTimeout / 1000) + ' seconds', 'error');
							if (typeof(callback) === 'function') {
								callback(false);
							}
						} else {
							// Start a timer to keep checking dependencies
							setTimeout(function () { ige.start(callback); }, 200);
						}
					}
				}
			},
			
			/**
			 * Stops the engine.
			 * @return {Boolean}
			 */
			stop: function () {
				// If we are running, stop the engine
				if (this._state) {
					this.log('Stopping engine...');
					this._state = 0;
					
					return true;
				} else {
					return false;
				}
			},
			
			/**
			 * Gets / sets the _autoSize property. If set to true, the engine will listen
			 * for any change in screen size and resize the front-buffer (canvas) element
			 * to match the new screen size.
			 * @param val
			 * @return {Boolean}
			 */
			autoSize: function (val) {
				if (val !== undefined) {
					this._autoSize = val;
					return this;
				}
				
				return this._autoSize;
			},
			
			pixelRatioScaling: function (val) {
				if (val !== undefined) {
					this._pixelRatioScaling = val;
					return this;
				}
				
				return this._pixelRatioScaling;
			},
			
			/**
			 * Gets / sets the rendering context that will be used when getting the
			 * context from canvas elements.
			 * @param {String=} contextId The context such as '2d'. Defaults to '2d'.
			 * @return {*}
			 */
			renderContext: function (contextId) {
				if (contextId !== undefined) {
					this._renderContext = contextId;
					this._renderMode = this._renderModes[contextId];
					
					this.log('Rendering mode set to: ' + contextId);
					
					return this;
				}
				
				return this._renderContext;
			},
			
			/**
			 * Creates a front-buffer or "drawing surface" for the renderer.
			 *
			 * @param {Boolean} autoSize Determines if the canvas will auto-resize
			 * when the browser window changes dimensions. If true the canvas will
			 * automatically fill the window when it is resized.
			 *
			 * @param {Boolean=} dontScale If set to true, IGE will ignore device
			 * pixel ratios when setting the width and height of the canvas and will
			 * therefore not take into account "retina", high-definition displays or
			 * those whose pixel ratio is different from 1 to 1.
			 */
			createFrontBuffer: function (autoSize, dontScale) {
				var self = this;
				if (this.isClient) {
					if (!this._canvas) {
						this._createdFrontBuffer = true;
						this._pixelRatioScaling = !dontScale;
						
						this._frontBufferSetup(autoSize, dontScale);
					}
				}
			},
			
			_frontBufferSetup: function (autoSize, dontScale) {
				// Create a new canvas element to use as the
				// rendering front-buffer
				var tempCanvas = document.createElement('canvas');
				
				// Set the canvas element id
				tempCanvas.id = 'igeFrontBuffer';
				
				this.canvas(tempCanvas, autoSize);
				document.body.appendChild(tempCanvas);
			},
			
			/**
			 * Sets the canvas element that will be used as the front-buffer.
			 * @param elem The canvas element.
			 * @param autoSize If set to true, the engine will automatically size
			 * the canvas to the width and height of the window upon window resize.
			 */
			canvas: function (elem, autoSize) {
				if (elem !== undefined) {
					if (!this._canvas) {
						// Setup front-buffer canvas element
						this._canvas = elem;
						this._ctx = this._canvas.getContext(this._renderContext);
						
						// Handle pixel ratio settings
						if (this._pixelRatioScaling) {
							// Support high-definition devices and "retina" (stupid marketing name)
							// displays by adjusting for device and back store pixels ratios
							this._devicePixelRatio = window.devicePixelRatio || 1;
							this._backingStoreRatio = this._ctx.webkitBackingStorePixelRatio ||
								this._ctx.mozBackingStorePixelRatio ||
								this._ctx.msBackingStorePixelRatio ||
								this._ctx.oBackingStorePixelRatio ||
								this._ctx.backingStorePixelRatio || 1;
							
							this._deviceFinalDrawRatio = this._devicePixelRatio / this._backingStoreRatio;
						} else {
							// No auto-scaling
							this._devicePixelRatio = 1;
							this._backingStoreRatio = 1;
							this._deviceFinalDrawRatio = 1;
						}
						
						if (autoSize) {
							this._autoSize = autoSize;
						}
						
						// Add some event listeners even if autosize is off
						window.addEventListener('resize', this._resizeEvent);
						
						// Fire the resize event for the first time
						// which sets up initial canvas dimensions
						this._resizeEvent();
						this._ctx = this._canvas.getContext(this._renderContext);
						this._headless = false;
						
						// Ask the input component to setup any listeners it has
						this.input.setupListeners(this._canvas);
					}
				}
				
				return this._canvas;
			},
			
			/**
			 * Clears the entire canvas.
			 */
			clearCanvas: function () {
				if (this._ctx) {
					// Clear the whole canvas
					this._ctx.clearRect(
						0,
						0,
						this._canvas.width,
						this._canvas.height
					);
				}
			},
			
			/**
			 * Removes the engine's canvas from the DOM.
			 */
			removeCanvas: function () {
				// Stop listening for input events
				if (this.input) {
					this.input.destroyListeners();
				}
				
				// Remove event listener
				window.removeEventListener('resize', this._resizeEvent);
				
				if (this._createdFrontBuffer) {
					// Remove the canvas from the DOM
					document.body.removeChild(this._canvas);
				}
				
				// Clear internal references
				delete this._canvas;
				delete this._ctx;
				this._ctx = IgeDummyContext;
				this._headless = true;
			},
			
			/**
			 * Opens a new window to the specified url. When running in a
			 * native wrapper, will load the url in place of any existing
			 * page being displayed in the native web view.
			 * @param url
			 */
			openUrl: function (url) {
				if (url !== undefined) {
					
					if (ige.cocoonJs && ige.cocoonJs.detected) {
						// Open URL via CocoonJS webview
						ige.cocoonJs.openUrl(url);
					} else {
						// Open via standard JS open window
						window.open(url);
					}
				}
			},
			
			/**
			 * Loads the specified URL as an HTML overlay on top of the
			 * front buffer in an iFrame. If running in a native wrapper,
			 * will load the url in place of any existing page being
			 * displayed in the native web view.
			 *
			 * When the overlay is in use, no mouse or touch events will
			 * be fired on the front buffer. Once you are finished with the
			 * overlay, call hideOverlay() to re-enable interaction with
			 * the front buffer.
			 * @param {String=} url
			 */
			showWebView: function (url) {
				if (ige.cocoonJs && ige.cocoonJs.detected) {
					// Open URL via CocoonJS webview
					ige.cocoonJs.showWebView(url);
				} else {
					// Load the iFrame url
					var overlay = document.getElementById('igeOverlay');
					
					if (!overlay) {
						// No overlay was found, create one
						overlay = document.createElement('iframe');
						
						// Setup overlay styles
						overlay.id = 'igeOverlay';
						overlay.style.position = 'absolute';
						overlay.style.border = 'none';
						overlay.style.left = '0px';
						overlay.style.top = '0px';
						overlay.style.width = '100%';
						overlay.style.height = '100%';
						
						// Append overlay to body
						document.body.appendChild(overlay);
					}
					
					// If we have a url, set it now
					if (url !== undefined) {
						overlay.src = url;
					}
					
					// Show the overlay
					overlay.style.display = 'block';
				}
				
				return this;
			},
			
			/**
			 * Hides the web view overlay.
			 * @return {*}
			 */
			hideWebView: function () {
				if (ige.cocoonJs && ige.cocoonJs.detected) {
					// Hide the cocoonJS webview
					ige.cocoonJs.hideWebView();
				} else {
					var overlay = document.getElementById('igeOverlay');
					if (overlay) {
						overlay.style.display = 'none';
					}
				}
				
				return this;
			},
			
			/**
			 * Evaluates javascript sent from another frame.
			 * @param js
			 */
			layerCall: function (js) {
				if (js !== undefined) {
					eval(js);
				}
			},
			
			/**
			 * Returns the mouse position relative to the main front buffer. Mouse
			 * position is set by the ige.input component (IgeInputComponent)
			 * @return {IgePoint3d}
			 */
			mousePos: function () {
				return this._mousePos.clone();
			},
			
			/**
			 * Walks the scenegraph and returns an array of all entities that the mouse
			 * is currently over, ordered by their draw order from drawn last (above other
			 * entities) to first (underneath other entities).
			 */
			mouseOverList: function (obj, entArr) {
				var arr,
					arrCount,
					mp,
					mouseTriggerPoly,
					first = false;
				
				if (!obj) {
					obj = ige;
					entArr = [];
					first = true;
				}
				
				if (obj === ige) {
					// Loop viewports
					arr = obj._children;
					
					if (arr) {
						arrCount = arr.length;
						
						// Loop our children
						while (arrCount--) {
							if (arr[arrCount]._scene) {
								if (arr[arrCount]._scene._shouldRender) {
									this.mouseOverList(arr[arrCount]._scene, entArr);
								}
							}
						}
					}
				} else {
					// Check if the mouse is over this entity
					mp = this.mousePosWorld();
					
					if (mp && obj.aabb) {
						// Trigger mode is against the AABB
						mouseTriggerPoly = obj.aabb(); //this.localAabb();
						
						// Check if the current mouse position is inside this aabb
						if (mouseTriggerPoly.xyInside(mp.x, mp.y)) {
							entArr.push(obj);
						}
					}
					
					// Check if the entity has children
					arr = obj._children;
					
					if (arr) {
						arrCount = arr.length;
						
						// Loop our children
						while (arrCount--) {
							this.mouseOverList(arr[arrCount], entArr);
						}
					}
				}
				
				if (first) {
					entArr.reverse();
				}
				
				return entArr;
			},
			
			/**
			 * Handles the screen resize event.
			 * @param event
			 * @private
			 */
			_resizeEvent: function (event) {
				var canvasBoundingRect;
				
				if (ige._autoSize) {
					var newWidth = window.innerWidth,
						newHeight = window.innerHeight,
						arr = ige._children,
						arrCount = arr.length;
					
					// Only update canvas dimensions if it exists
					if (ige._canvas) {
						// Check if we can get the position of the canvas
						canvasBoundingRect = ige._canvasPosition();
						
						// Adjust the newWidth and newHeight by the canvas offset
						newWidth -= parseInt(canvasBoundingRect.left);
						newHeight -= parseInt(canvasBoundingRect.top);
						
						// Make sure we can divide the new width and height by 2...
						// otherwise minus 1 so we get an even number so that we
						// negate the blur effect of sub-pixel rendering
						if (newWidth % 2) { newWidth--; }
						if (newHeight % 2) { newHeight--; }
						
						ige._canvas.width = newWidth * ige._deviceFinalDrawRatio;
						ige._canvas.height = newHeight * ige._deviceFinalDrawRatio;
						
						if (ige._deviceFinalDrawRatio !== 1) {
							ige._canvas.style.width = newWidth + 'px';
							ige._canvas.style.height = newHeight + 'px';
							
							// Scale the canvas context to account for the change
							ige._ctx.scale(ige._deviceFinalDrawRatio, ige._deviceFinalDrawRatio);
						}
					}
					
					ige._bounds2d = new IgePoint3d(newWidth, newHeight, 0);
					
					// Loop any mounted children and check if
					// they should also get resized
					while (arrCount--) {
						arr[arrCount]._resizeEvent(event);
					}
				} else {
					if (ige._canvas) {
						ige._bounds2d = new IgePoint3d(ige._canvas.width, ige._canvas.height, 0);
					}
				}
				
				if (ige._showSgTree) {
					var sgTreeElem = document.getElementById('igeSgTree');
					
					canvasBoundingRect = ige._canvasPosition();
					
					sgTreeElem.style.top = (parseInt(canvasBoundingRect.top) + 5) + 'px';
					sgTreeElem.style.left = (parseInt(canvasBoundingRect.left) + 5) + 'px';
					sgTreeElem.style.height = (ige._bounds2d.y - 30) + 'px';
				}
				
				ige._resized = true;
			},
			
			/**
			 * Gets the bounding rectangle for the HTML canvas element being
			 * used as the front buffer for the engine. Uses DOM methods.
			 * @returns {ClientRect}
			 * @private
			 */
			_canvasPosition: function () {
				try {
					return ige._canvas.getBoundingClientRect();
				} catch (e) {
					return {
						top: ige._canvas.offsetTop,
						left: ige._canvas.offsetLeft
					};
				}
			},
			
			/**
			 * Toggles full-screen output of the main ige canvas. Only works
			 * if called from within a user-generated HTML event listener.
			 */
			toggleFullScreen: function () {
				var elem = this._canvas;
				
				if (elem.requestFullscreen) {
					elem.requestFullscreen();
				} else if (elem.mozRequestFullScreen) {
					elem.mozRequestFullScreen();
				} else if (elem.webkitRequestFullscreen) {
					elem.webkitRequestFullscreen();
				}
			},
			
			/**
			 * Adds a new watch expression to the watch list which will be
			 * displayed in the stats overlay during a call to _statsTick().
			 * @param {*} evalStringOrObject The expression to evaluate and
			 * display the result of in the stats overlay, or an object that
			 * contains a "value" property.
			 * @returns {Integer} The index of the new watch expression you
			 * just added to the watch array.
			 */
			watchStart: function (evalStringOrObject) {
				this._watch = this._watch || [];
				this._watch.push(evalStringOrObject);
				
				return this._watch.length - 1;
			},
			
			/**
			 * Removes a watch expression by it's array index.
			 * @param {Number} index The index of the watch expression to
			 * remove from the watch array.
			 */
			watchStop: function (index) {
				this._watch = this._watch || [];
				this._watch.splice(index, 1);
			},
			
			/**
			 * Sets a trace up on the setter of the passed object's
			 * specified property. When the property is set by any
			 * code the debugger line is activated and code execution
			 * will be paused allowing you to step through code or
			 * examine the call stack to see where the property set
			 * originated.
			 * @param {Object} obj The object whose property you want
			 * to trace.
			 * @param {String} propName The name of the property you
			 * want to put the trace on.
			 * @param {Number} sampleCount The number of times you
			 * want the trace to break with the debugger line before
			 * automatically switching off the trace.
			 * @param {Function=} callbackEvaluator Optional callback
			 * that if returns true, will fire debugger. Method is passed
			 * the setter value as first argument.
			 */
			traceSet: function (obj, propName, sampleCount, callbackEvaluator) {
				obj.___igeTraceCurrentVal = obj.___igeTraceCurrentVal || {};
				obj.___igeTraceCurrentVal[propName] = obj[propName];
				obj.___igeTraceMax = sampleCount || 1;
				obj.___igeTraceCount = 0;
				
				Object.defineProperty(obj, propName, {
					get: function () {
						return obj.___igeTraceCurrentVal[propName];
					},
					set: function (val) {
						if (callbackEvaluator){
							if (callbackEvaluator(val)) {
								debugger;
							}
						} else {
							debugger;
						}
						
						obj.___igeTraceCurrentVal[propName] = val;
						obj.___igeTraceCount++;
						
						if (obj.___igeTraceCount === obj.___igeTraceMax) {
							// Maximum amount of trace samples reached, turn off
							// the trace system
							ige.traceSetOff(obj, propName);
						}
					}
				});
			},
			
			/**
			 * Turns off a trace that was created by calling traceSet.
			 * @param {Object} object The object whose property you want
			 * to disable a trace against.
			 * @param {String} propName The name of the property you
			 * want to disable the trace for.
			 */
			traceSetOff: function (object, propName) {
				Object.defineProperty(object, propName, {set: function (val) { this.___igeTraceCurrentVal[propName] = val; }});
			},
			
			/**
			 * Finds the first Ige* based class that the passed object
			 * has been derived from.
			 * @param obj
			 * @return {*}
			 */
			findBaseClass: function (obj) {
				if (obj && obj._classId) {
					if (obj._classId.substr(0, 3) === 'Ige') {
						return obj._classId;
					} else {
						if (obj.__proto__._classId) {
							return this.findBaseClass(obj.__proto__);
						} else {
							return '';
						}
					}
				} else {
					return '';
				}
			},
			
			/**
			 * Returns an array of all classes the passed object derives from
			 * in order from current to base.
			 * @param obj
			 * @param arr
			 * @return {*}
			 */
			getClassDerivedList: function (obj, arr) {
				if (!arr) {
					arr = [];
				} else {
					if (obj._classId) {
						arr.push(obj._classId);
					}
				}
				
				if (obj.__proto__._classId) {
					this.getClassDerivedList(obj.__proto__, arr);
				}
				
				return arr;
			},
			
			spawnQueue: function (ent) {
				if (ent !== undefined) {
					this._spawnQueue.push(ent);
					return this;
				}
				
				return this._spawnQueue;
			},
			
			/**
			 * Is called every second and does things like calculate the current FPS.
			 * @private
			 */
			_secondTick: function () {
				var self = ige;
				
				// Store frames per second
				self._fps = self._frames;
				
				// Store draws per second
				self._dps = self._dpf * self._fps;
				
				// Zero out counters
				self._frames = 0;
				self._drawCount = 0;
			},
			
			/**
			 * Gets / sets the current time scalar value. The engine's internal
			 * time is multiplied by this value and it's default is 1. You can set it to
			 * 0.5 to slow down time by half or 1.5 to speed up time by half. Negative
			 * values will reverse time but not all engine systems handle this well
			 * at the moment.
			 * @param {Number=} val The time scale value.
			 * @returns {*}
			 */
			timeScale: function (val) {
				if (val !== undefined) {
					this._timeScale = val;
					return this;
				}
				
				return this._timeScale;
			},
			
			/**
			 * Increments the engine's interal time by the passed number of milliseconds.
			 * @param {Number} val The number of milliseconds to increment time by.
			 * @param {Number=} lastVal The last internal time value, used to calculate
			 * delta internally in the method.
			 * @returns {Number}
			 */
			incrementTime: function (val, lastVal) {
				if (!this._pause) {
					if (!lastVal) { lastVal = val; }
					this._currentTime += ((val - lastVal) * this._timeScale);
				}
				return this._currentTime;
			},
			
			/**
			 * Get the current time from the engine.
			 * @return {Number} The current time.
			 */
			currentTime: function () {
				return this._currentTime;
			},
			
			/**
			 * Gets / sets the pause flag. If set to true then the engine's
			 * internal time will no longer increment and will instead stay static.
			 * @param val
			 * @returns {*}
			 */
			pause: function (val) {
				if (val !== undefined) {
					this._pause = val;
					return this;
				}
				
				return this._pause;
			},
			
			/**
			 * Gets / sets the option to determine if the engine should
			 * schedule it's own ticks or if you want to manually advance
			 * the engine by calling tick when you wish to.
			 * @param {Boolean=} val
			 * @return {*}
			 */
			useManualTicks: function (val) {
				if (val !== undefined) {
					this._useManualTicks = val;
					return this;
				}
				
				return this._useManualTicks;
			},
			
			/**
			 * Schedules a manual tick.
			 */
			manualTick: function () {
				if (this._manualFrameAlternator !== this._frameAlternator) {
					this._manualFrameAlternator = this._frameAlternator;
					requestAnimFrame(this.engineStep);
				}
			},
			
			/**
			 * Gets / sets the option to determine if the engine should
			 * render on every tick or wait for a manualRender() call.
			 * @param {Boolean=} val True to enable manual rendering, false
			 * to disable.
			 * @return {*}
			 */
			useManualRender: function (val) {
				if (val !== undefined) {
					this._useManualRender = val;
					return this;
				}
				
				return this._useManualRender;
			},
			
			/**
			 * Manually render a frame on demand. This is used in conjunction
			 * with the ige.useManualRender(true) call which will cause the
			 * engine to only render new graphics frames from the scenegraph
			 * once this method is called. You must call this method every time
			 * you wish to update the graphical output on screen.
			 *
			 * Calling this method multiple times during a single engine tick
			 * will NOT make it draw more than one frame, therefore it is safe
			 * to call multiple times if required by different sections of game
			 * logic without incurring extra rendering cost.
			 */
			manualRender: function () {
				this._manualRender = true;
			},
			
			/**
			 * Called each frame to traverse and render the scenegraph.
			 */
			engineStep: function (timeStamp, ctx) {
				/* TODO:
				 Make the scenegraph process simplified. Walk the scenegraph once and grab the order in a flat array
				 then process updates and ticks. This will also allow a layered rendering system that can render the
				 first x number of entities then stop, allowing a step through of the renderer in realtime.
				 */
				var st,
					et,
					updateStart,
					renderStart,
					self = ige,
					ptArr = self._postTick,
					ptCount = ptArr.length,
					ptIndex,
					unbornQueue,
					unbornCount,
					unbornIndex,
					unbornEntity;
				
				// Scale the timestamp according to the current
				// engine's time scaling factor
				self.incrementTime(timeStamp, self._timeScaleLastTimestamp);
				
				self._timeScaleLastTimestamp = timeStamp;
				timeStamp = Math.floor(self._currentTime);
				
				if (igeBase.igeConfig.debug._timing) {
					st = new Date().getTime();
				}
				
				if (self._state) {
					// Check if we were passed a context to work with
					if (ctx === undefined) {
						ctx = self._ctx;
					}
					
					// Alternate the boolean frame alternator flag
					self._frameAlternator = !self._frameAlternator;
					
					// If the engine is not in manual tick mode...
					if (!ige._useManualTicks) {
						// Schedule a new frame
						requestAnimFrame(self.engineStep);
					} else {
						self._manualFrameAlternator = !self._frameAlternator;
					}
					
					// Get the current time in milliseconds
					self._tickStart = timeStamp;
					
					// Adjust the tickStart value by the difference between
					// the server and the client clocks (this is only applied
					// when running as the client - the server always has a
					// clientNetDiff of zero)
					self._tickStart -= self._clientNetDiff;
					
					if (!self.lastTick) {
						// This is the first time we've run so set some
						// default values and set the delta to zero
						self.lastTick = 0;
						self._tickDelta = 0;
					} else {
						// Calculate the frame delta
						self._tickDelta = self._tickStart - self.lastTick;
					}
					
					// Check for unborn entities that should be born now
					unbornQueue = ige._spawnQueue;
					unbornCount = unbornQueue.length;
					for (unbornIndex = unbornCount - 1; unbornIndex >= 0; unbornIndex--) {
						unbornEntity = unbornQueue[unbornIndex];
						
						if (ige._currentTime >= unbornEntity._bornTime) {
							// Now birth this entity
							unbornEntity.mount(ige.$(unbornEntity._birthMount));
							unbornQueue.splice(unbornIndex, 1);
						}
					}
					
					// Update the scenegraph
					if (self._enableUpdates) {
						if (igeBase.igeConfig.debug._timing) {
							updateStart = new Date().getTime();
							self.updateSceneGraph(ctx);
							ige._updateTime = new Date().getTime() - updateStart;
						} else {
							self.updateSceneGraph(ctx);
						}
					}
					
					// Render the scenegraph
					if (self._enableRenders) {
						if (!self._useManualRender) {
							if (igeBase.igeConfig.debug._timing) {
								renderStart = new Date().getTime();
								self.renderSceneGraph(ctx);
								ige._renderTime = new Date().getTime() - renderStart;
							} else {
								self.renderSceneGraph(ctx);
							}
						} else {
							if (self._manualRender) {
								if (igeBase.igeConfig.debug._timing) {
									renderStart = new Date().getTime();
									self.renderSceneGraph(ctx);
									ige._renderTime = new Date().getTime() - renderStart;
								} else {
									self.renderSceneGraph(ctx);
								}
								self._manualRender = false;
							}
						}
					}
					
					// Call post-tick methods
					for (ptIndex = 0; ptIndex < ptCount; ptIndex++) {
						ptArr[ptIndex]();
					}
					
					// Record the lastTick value so we can
					// calculate delta on the next tick
					self.lastTick = self._tickStart;
					self._frames++;
					self._dpf = self._drawCount;
					self._drawCount = 0;
					
					// Call the input system tick to reset any flags etc
					self.input.tick();
				}
				
				self._resized = false;
				
				if (igeBase.igeConfig.debug._timing) {
					et = new Date().getTime();
					ige._tickTime = et - st;
				}
			},
			
			updateSceneGraph: function (ctx) {
				var arr = this._children,
					arrCount, us, ud,
					tickDelta = ige._tickDelta;
				
				// Process any behaviours assigned to the engine
				this._processUpdateBehaviours(ctx, tickDelta);
				
				if (arr) {
					arrCount = arr.length;
					
					// Loop our viewports and call their update methods
					if (igeBase.igeConfig.debug._timing) {
						while (arrCount--) {
							us = new Date().getTime();
							arr[arrCount].update(ctx, tickDelta);
							ud = new Date().getTime() - us;
							
							if (arr[arrCount]) {
								if (!ige._timeSpentInUpdate[arr[arrCount].id()]) {
									ige._timeSpentInUpdate[arr[arrCount].id()] = 0;
								}
								
								if (!ige._timeSpentLastUpdate[arr[arrCount].id()]) {
									ige._timeSpentLastUpdate[arr[arrCount].id()] = {};
								}
								
								ige._timeSpentInUpdate[arr[arrCount].id()] += ud;
								ige._timeSpentLastUpdate[arr[arrCount].id()].ms = ud;
							}
						}
					} else {
						while (arrCount--) {
							arr[arrCount].update(ctx, tickDelta);
						}
					}
				}
			},
			
			renderSceneGraph: function (ctx) {
				var ts, td;
				
				// Process any behaviours assigned to the engine
				this._processTickBehaviours(ctx);
				
				// Depth-sort the viewports
				if (this._viewportDepth) {
					if (igeBase.igeConfig.debug._timing) {
						ts = new Date().getTime();
						this.depthSortChildren();
						td = new Date().getTime() - ts;
						
						if (!ige._timeSpentLastTick[this.id()]) {
							ige._timeSpentLastTick[this.id()] = {};
						}
						
						ige._timeSpentLastTick[this.id()].depthSortChildren = td;
					} else {
						this.depthSortChildren();
					}
				}
				
				ctx.save();
				ctx.translate(this._bounds2d.x2, this._bounds2d.y2);
				//ctx.scale(this._globalScale.x, this._globalScale.y);
				
				// Process the current engine tick for all child objects
				var arr = this._children,
					arrCount;
				
				if (arr) {
					arrCount = arr.length;
					
					// Loop our viewports and call their tick methods
					if (igeBase.igeConfig.debug._timing) {
						while (arrCount--) {
							ctx.save();
							ts = new Date().getTime();
							arr[arrCount].tick(ctx);
							td = new Date().getTime() - ts;
							if (arr[arrCount]) {
								if (!ige._timeSpentInTick[arr[arrCount].id()]) {
									ige._timeSpentInTick[arr[arrCount].id()] = 0;
								}
								
								if (!ige._timeSpentLastTick[arr[arrCount].id()]) {
									ige._timeSpentLastTick[arr[arrCount].id()] = {};
								}
								
								ige._timeSpentInTick[arr[arrCount].id()] += td;
								ige._timeSpentLastTick[arr[arrCount].id()].ms = td;
							}
							ctx.restore();
						}
					} else {
						while (arrCount--) {
							ctx.save();
							arr[arrCount].tick(ctx);
							ctx.restore();
						}
					}
				}
				
				ctx.restore();
			},
			
			fps: function () {
				return this._fps;
			},
			
			dpf: function () {
				return this._dpf;
			},
			
			dps: function () {
				return this._dps;
			},
			
			analyseTiming: function () {
				if (igeBase.igeConfig.debug._timing) {
					
				} else {
					this.log('Cannot analyse timing because the igeBase.igeConfig.debug._timing flag is not enabled so no timing data has been recorded!', 'warning');
				}
			},
			
			saveSceneGraph: function (item) {
				var arr, arrCount, i;
				
				if (!item) {
					item = this.getSceneGraphData();
				}
				
				if (item.obj.stringify) {
					item.str = item.obj.stringify();
				} else {
					console.log('Class ' + item.classId + ' has no stringify() method! For object: ' + item.id, item.obj);
				}
				arr = item.items;
				
				if (arr) {
					arrCount = arr.length;
					
					for (i = 0; i < arrCount; i++) {
						this.saveSceneGraph(arr[i]);
					}
				}
				
				return item;
			},
			
			/**
			 * Walks the scene graph and outputs a console map of the graph.
			 */
			sceneGraph: function (obj, currentDepth, lastDepth) {
				var depthSpace = '',
					di,
					timingString,
					arr,
					arrCount;
				
				if (currentDepth === undefined) { currentDepth = 0; }
				
				if (!obj) {
					// Set the obj to the main ige instance
					obj = ige;
				}
				
				for (di = 0; di < currentDepth; di++) {
					depthSpace += '----';
				}
				
				if (igeBase.igeConfig.debug._timing) {
					timingString = '';
					
					timingString += 'T: ' + ige._timeSpentInTick[obj.id()];
					if (ige._timeSpentLastTick[obj.id()]) {
						if (typeof(ige._timeSpentLastTick[obj.id()].ms) === 'number') {
							timingString += ' | LastTick: ' + ige._timeSpentLastTick[obj.id()].ms;
						}
						
						if (typeof(ige._timeSpentLastTick[obj.id()].depthSortChildren) === 'number') {
							timingString += ' | ChildDepthSort: ' + ige._timeSpentLastTick[obj.id()].depthSortChildren;
						}
					}
					
					console.log(depthSpace + obj.id() + ' (' + obj._classId + ') : ' + obj._inView + ' Timing(' + timingString + ')');
				} else {
					console.log(depthSpace + obj.id() + ' (' + obj._classId + ') : ' + obj._inView);
				}
				
				currentDepth++;
				
				if (obj === ige) {
					// Loop the viewports
					arr = obj._children;
					
					if (arr) {
						arrCount = arr.length;
						
						// Loop our children
						while (arrCount--) {
							if (arr[arrCount]._scene) {
								if (arr[arrCount]._scene._shouldRender) {
									if (igeBase.igeConfig.debug._timing) {
										timingString = '';
										
										timingString += 'T: ' + ige._timeSpentInTick[arr[arrCount].id()];
										if (ige._timeSpentLastTick[arr[arrCount].id()]) {
											if (typeof(ige._timeSpentLastTick[arr[arrCount].id()].ms) === 'number') {
												timingString += ' | LastTick: ' + ige._timeSpentLastTick[arr[arrCount].id()].ms;
											}
											
											if (typeof(ige._timeSpentLastTick[arr[arrCount].id()].depthSortChildren) === 'number') {
												timingString += ' | ChildDepthSort: ' + ige._timeSpentLastTick[arr[arrCount].id()].depthSortChildren;
											}
										}
										
										console.log(depthSpace + '----' + arr[arrCount].id() + ' (' + arr[arrCount]._classId + ') : ' + arr[arrCount]._inView + ' Timing(' + timingString + ')');
									} else {
										console.log(depthSpace + '----' + arr[arrCount].id() + ' (' + arr[arrCount]._classId + ') : ' + arr[arrCount]._inView);
									}
									this.sceneGraph(arr[arrCount]._scene, currentDepth + 1);
								}
							}
						}
					}
				} else {
					arr = obj._children;
					
					if (arr) {
						arrCount = arr.length;
						
						// Loop our children
						while (arrCount--) {
							this.sceneGraph(arr[arrCount], currentDepth);
						}
					}
				}
			},
			
			/**
			 * Walks the scenegraph and returns a data object of the graph.
			 */
			getSceneGraphData: function (obj, noRef) {
				var item, items = [], tempItem, tempItem2, tempCam,
					arr, arrCount;
				
				if (!obj) {
					// Set the obj to the main ige instance
					obj = ige;
				}
				
				item = {
					text: '[' + obj._classId + '] ' + obj.id(),
					id: obj.id(),
					classId: obj.classId()
				};
				
				if (!noRef) {
					item.parent = obj._parent;
					item.obj = obj;
				} else {
					if (obj._parent) {
						item.parentId = obj._parent.id();
					} else {
						item.parentId = 'sceneGraph';
					}
				}
				
				if (obj === ige) {
					// Loop the viewports
					arr = obj._children;
					
					if (arr) {
						arrCount = arr.length;
						
						// Loop our children
						while (arrCount--) {
							tempItem = {
								text: '[' + arr[arrCount]._classId + '] ' + arr[arrCount].id(),
								id: arr[arrCount].id(),
								classId: arr[arrCount].classId()
							};
							
							if (!noRef) {
								tempItem.parent = arr[arrCount]._parent;
								tempItem.obj = arr[arrCount];
							} else {
								if (arr[arrCount]._parent) {
									tempItem.parentId = arr[arrCount]._parent.id();
								}
							}
							
							if (arr[arrCount].camera) {
								// Add the viewport camera as an object on the scenegraph
								tempCam = {
									text: '[IgeCamera] ' + arr[arrCount].id(),
									id: arr[arrCount].camera.id(),
									classId: arr[arrCount].camera.classId()
								};
								
								if (!noRef) {
									tempCam.parent = arr[arrCount];
									tempCam.obj = arr[arrCount].camera;
								} else {
									tempCam.parentId = arr[arrCount].id();
								}
								
								if (arr[arrCount]._scene) {
									tempItem2 = this.getSceneGraphData(arr[arrCount]._scene, noRef);
									tempItem.items = [tempCam, tempItem2];
								}
							} else {
								if (arr[arrCount]._scene) {
									tempItem2 = this.getSceneGraphData(arr[arrCount]._scene, noRef);
									tempItem.items = [tempItem2];
								}
							}
							
							items.push(tempItem);
						}
					}
				} else {
					arr = obj._children;
					
					if (arr) {
						arrCount = arr.length;
						
						// Loop our children
						while (arrCount--) {
							tempItem = this.getSceneGraphData(arr[arrCount], noRef);
							items.push(tempItem);
						}
					}
				}
				
				if (items.length > 0) {
					item.items = items;
				}
				
				return item;
			},
			
			_childMounted: function (child) {
				if (child.IgeViewport) {
					// The first mounted viewport gets set as the current
					// one before any rendering is done
					if (!ige._currentViewport) {
						ige._currentViewport = child;
						ige._currentCamera = child.camera;
					}
				}
				
				IgeEntity.prototype._childMounted.call(this, child);
			},
			
			destroy: function () {
				// Stop the engine and kill any timers
				this.stop();
				
				// Remove the front buffer (canvas) if we created it
				if (this.isClient) {
					this.removeCanvas();
				}
				
				// Call class destroy() super method
				IgeEntity.prototype.destroy.call(this);
				
				this.log('Engine destroy complete.');
			}
		});
		
		return IgeEngine;
	});
},{"irrelon-appcore":67}],32:[function(_dereq_,module,exports){
"use strict";

var appCore = _dereq_('irrelon-appcore');

appCore.module('IgeEntity', function (IgeObject, IgePoint2d, IgePoint3d, IgeMatrix2d, IgeDummyCanvas, IgePoly2d, IgeRect) {
	/**
	 * Creates an entity and handles the entity's life cycle and
	 * all related entity actions / methods.
	 */
	var IgeEntity = IgeObject.extend({
		classId: 'IgeEntity',
		
		init: function () {
			IgeObject.prototype.init.call(this);
			
			// Register the IgeEntity special properties handler for
			// serialise and de-serialise support
			this._specialProp.push('_texture');
			this._specialProp.push('_eventListeners');
			this._specialProp.push('_aabb');
			
			this._anchor = new IgePoint2d(0, 0);
			this._renderPos = {x: 0, y: 0};
			
			this._computedOpacity = 1;
			this._opacity = 1;
			this._cell = 1;
			
			this._deathTime = undefined;
			this._bornTime = typeof ige !== 'undefined' ? ige._currentTime : 0;
			
			this._translate = new IgePoint3d(0, 0, 0);
			this._oldTranslate = new IgePoint3d(0, 0, 0);
			this._rotate = new IgePoint3d(0, 0, 0);
			this._scale = new IgePoint3d(1, 1, 1);
			this._origin = new IgePoint3d(0.5, 0.5, 0.5);
			
			this._bounds2d = new IgePoint2d(40, 40);
			this._bounds3d = new IgePoint3d(0, 0, 0);
			
			this._oldBounds2d = new IgePoint2d(40, 40);
			this._oldBounds3d = new IgePoint3d(0, 0, 0);
			
			this._highlight = false;
			this._mouseEventsActive = false;
			
			this._velocity = new IgePoint3d(0, 0, 0);
			
			this._localMatrix = new IgeMatrix2d();
			this._worldMatrix = new IgeMatrix2d();
			this._oldWorldMatrix = new IgeMatrix2d();
			
			this._inView = true;
			this._hidden = false;
			
			//this._mouseEventTrigger = 0;
			
			/* CEXCLUDE */
			if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') {
				// Set the stream floating point precision to 2 as default
				this.streamFloatPrecision(2);
			}
			/* CEXCLUDE */
			
			// Set the default stream sections as just the transform data
			this.streamSections(['transform']);
		},
		
		/**
		 * Sets the entity as visible and able to be interacted with.
		 * @example #Show a hidden entity
		 *     entity.show();
		 * @return {*} The object this method was called from to allow
		 * method chaining.
		 */
		show: function () {
			this._hidden = false;
			return this;
		},
		
		/**
		 * Sets the entity as hidden and cannot be interacted with.
		 * @example #Hide a visible entity
		 *     entity.hide();
		 * @return {*} The object this method was called from to allow
		 * method chaining.
		 */
		hide: function () {
			this._hidden = true;
			return this;
		},
		
		/**
		 * Checks if the entity is visible.
		 * @returns {boolean} True if the entity is visible.
		 */
		isVisible: function () {
			return this._hidden === false;
		},
		
		/**
		 * Checks if the entity is hidden.
		 * @returns {boolean} True if the entity is hidden.
		 */
		isHidden: function () {
			return this._hidden === true;
		},
		
		/**
		 * Gets / sets the cache flag that determines if the entity's
		 * texture rendering output should be stored on an off-screen
		 * canvas instead of calling the texture.render() method each
		 * tick. Useful for expensive texture calls such as rendering
		 * fonts etc. If enabled, this will automatically disable advanced
		 * composite caching on this entity with a call to
		 * compositeCache(false).
		 * @param {Boolean=} val True to enable caching, false to
		 * disable caching.
		 * @example #Enable entity caching
		 *     entity.cache(true);
		 * @example #Disable entity caching
		 *     entity.cache(false);
		 * @example #Get caching flag value
		 *     var val = entity.cache();
		 * @return {*}
		 */
		cache: function (val) {
			if (val !== undefined) {
				this._cache = val;
				
				if (val) {
					// Create the off-screen canvas
					if (ige.isClient) {
						// Use a real canvas
						this._cacheCanvas = document.createElement('canvas');
					} else {
						// Use dummy objects for canvas and context
						this._cacheCanvas = new IgeDummyCanvas();
					}
					
					this._cacheCtx = this._cacheCanvas.getContext('2d');
					this._cacheDirty = true;
					
					// Set smoothing mode
					var smoothing = this._cacheSmoothing !== undefined ? this._cacheSmoothing : ige._globalSmoothing;
					if (!smoothing) {
						this._cacheCtx.imageSmoothingEnabled = false;
						this._cacheCtx.webkitImageSmoothingEnabled = false;
						this._cacheCtx.mozImageSmoothingEnabled = false;
					} else {
						this._cacheCtx.imageSmoothingEnabled = true;
						this._cacheCtx.webkitImageSmoothingEnabled = true;
						this._cacheCtx.mozImageSmoothingEnabled = true;
					}
					
					// Switch off composite caching
					if (this.compositeCache()) {
						this.compositeCache(false);
					}
				} else {
					// Remove the off-screen canvas
					delete this._cacheCanvas;
				}
				
				return this;
			}
			
			return this._cache;
		},
		
		/**
		 * When using the caching system, this boolean determines if the
		 * cache canvas should have image smoothing enabled or not. If
		 * not set, the ige global smoothing setting will be used instead.
		 * @param {Boolean=} val True to enable smoothing, false to disable.
		 * @returns {*}
		 */
		cacheSmoothing: function (val) {
			if (val !== undefined) {
				this._cacheSmoothing = val;
				return this;
			}
			
			return this._cacheSmoothing;
		},
		
		/**
		 * Gets / sets composite caching. Composite caching draws this entity
		 * and all of it's children (and their children etc) to a single off
		 * screen canvas so that the entity does not need to be redrawn with
		 * all it's children every tick. For composite entities where little
		 * change occurs this will massively increase rendering performance.
		 * If enabled, this will automatically disable simple caching on this
		 * entity with a call to cache(false).
		 * @param {Boolean=} val
		 * @example #Enable entity composite caching
		 *     entity.compositeCache(true);
		 * @example #Disable entity composite caching
		 *     entity.compositeCache(false);
		 * @example #Get composite caching flag value
		 *     var val = entity.cache();
		 * @return {*}
		 */
		compositeCache: function (val) {
			if (ige.isClient) {
				if (val !== undefined) {
					if (val) {
						// Switch off normal caching
						this.cache(false);
						
						// Create the off-screen canvas
						this._cacheCanvas = document.createElement('canvas');
						this._cacheCtx = this._cacheCanvas.getContext('2d');
						this._cacheDirty = true;
						
						// Set smoothing mode
						var smoothing = this._cacheSmoothing !== undefined ? this._cacheSmoothing : ige._globalSmoothing;
						if (!smoothing) {
							this._cacheCtx.imageSmoothingEnabled = false;
							this._cacheCtx.webkitImageSmoothingEnabled = false;
							this._cacheCtx.mozImageSmoothingEnabled = false;
						} else {
							this._cacheCtx.imageSmoothingEnabled = true;
							this._cacheCtx.webkitImageSmoothingEnabled = true;
							this._cacheCtx.mozImageSmoothingEnabled = true;
						}
					}
					
					// Loop children and set _compositeParent to the correct value
					this._children.each(function () {
						if (val) {
							this._compositeParent = true;
						} else {
							delete this._compositeParent;
						}
					});
					
					this._compositeCache = val;
					return this;
				}
				
				return this._compositeCache;
			} else {
				return this;
			}
		},
		
		/**
		 * Gets / sets the cache dirty flag. If set to true this will
		 * instruct the entity to re-draw it's cached image from the
		 * assigned texture. Once that occurs the flag will automatically
		 * be set back to false. This works in either standard cache mode
		 * or composite cache mode.
		 * @param {Boolean=} val True to force a cache update.
		 * @example #Get cache dirty flag value
		 *     var val = entity.cacheDirty();
		 * @example #Set cache dirty flag value
		 *     entity.cacheDirty(true);
		 * @return {*}
		 */
		cacheDirty: function (val) {
			if (val !== undefined) {
				this._cacheDirty = val;
				
				// Check if the entity is a child of a composite or composite
				// entity chain and propagate the dirty cache up the chain
				if (val && this._compositeParent && this._parent) {
					this._parent.cacheDirty(val);
					
					if (!this._cache && !this._compositeCache) {
						// Set clean immediately as no caching is enabled on this child
						this._cacheDirty = false;
					}
				}
				
				return this;
			}
			
			return this._cacheDirty;
		},
		
		/**
		 * Gets the position of the mouse relative to this entity's
		 * center point.
		 * @param {IgeViewport=} viewport The viewport to use as the
		 * base from which the mouse position is determined. If no
		 * viewport is specified then the current viewport the engine
		 * is rendering to is used instead.
		 * @example #Get the mouse position relative to the entity
		 *     // The returned value is an object with properties x, y, z
		 *     var mousePos = entity.mousePos();
		 * @return {IgePoint3d} The mouse point relative to the entity
		 * center.
		 */
		mousePos: function (viewport) {
			viewport = viewport || ige._currentViewport;
			if (viewport) {
				var mp = viewport._mousePos.clone(),
					cam;
				
				if (this._ignoreCamera) {
					/*cam = ige._currentCamera;
					 mp.thisMultiply(1 / cam._scale.x, 1 / cam._scale.y, 1 / cam._scale.z);
					 //mp.thisRotate(-cam._rotate.z);
					 mp.thisAddPoint(cam._translate);*/
				}
				
				mp.x += viewport._translate.x;
				mp.y += viewport._translate.y;
				this._transformPoint(mp);
				return mp;
			} else {
				return new IgePoint3d(0, 0, 0);
			}
		},
		
		/**
		 * Gets the position of the mouse relative to this entity not
		 * taking into account viewport translation.
		 * @param {IgeViewport=} viewport The viewport to use as the
		 * base from which the mouse position is determined. If no
		 * viewport is specified then the current viewport the engine
		 * is rendering to is used instead.
		 * @example #Get absolute mouse position
		 *     var mousePosAbs = entity.mousePosAbsolute();
		 * @return {IgePoint3d} The mouse point relative to the entity
		 * center.
		 */
		mousePosAbsolute: function (viewport) {
			viewport = viewport || ige._currentViewport;
			if (viewport) {
				var mp = viewport._mousePos.clone();
				this._transformPoint(mp);
				return mp;
			}
			
			return new IgePoint3d(0, 0, 0);
		},
		
		/**
		 * Gets the position of the mouse in world co-ordinates.
		 * @param {IgeViewport=} viewport The viewport to use as the
		 * base from which the mouse position is determined. If no
		 * viewport is specified then the current viewport the engine
		 * is rendering to is used instead.
		 * @example #Get mouse position in world co-ordinates
		 *     var mousePosWorld = entity.mousePosWorld();
		 * @return {IgePoint3d} The mouse point relative to the world
		 * center.
		 */
		mousePosWorld: function (viewport) {
			viewport = viewport || ige._currentViewport;
			var mp = this.mousePos(viewport);
			this.localToWorldPoint(mp, viewport);
			
			if (this._ignoreCamera) {
				//viewport.camera._worldMatrix.getInverse().transform([mp]);
			}
			
			return mp;
		},
		
		/**
		 * Rotates the entity to point at the target point around the z axis.
		 * @param {IgePoint3d} point The point in world co-ordinates to
		 * point the entity at.
		 * @example #Point the entity at another entity
		 *     entity.rotateToPoint(otherEntity.worldPosition());
		 * @example #Point the entity at mouse
		 *     entity.rotateToPoint(ige._currentViewport.mousePos());
		 * @example #Point the entity at an arbitrary point x, y
		 *     entity.rotateToPoint(new IgePoint3d(x, y, 0));
		 * @return {*}
		 */
		rotateToPoint: function (point) {
			var worldPos = this.worldPosition();
			this.rotateTo(
				this._rotate.x,
				this._rotate.y,
				(Math.atan2(worldPos.y - point.y, worldPos.x - point.x) - this._parent._rotate.z) + Math.radians(270)
			);
			
			return this;
		},
		
		/**
		 * Gets / sets the texture to use as the background
		 * pattern for this entity.
		 * @param {IgeTexture} texture The texture to use as
		 * the background.
		 * @param {String=} repeat The type of repeat mode either: "repeat",
		 * "repeat-x", "repeat-y" or "none".
		 * @param {Boolean=} trackCamera If set to true, will track the camera
		 * translation and "move" the background with the camera.
		 * @param {Boolean=} isoTile If true the tiles of the background will
		 * be treated as isometric and will therefore be drawn so that they are
		 * layered seamlessly in isometric view.
		 * @example #Set a background pattern for this entity with 2d tiling
		 *     var texture = new IgeTexture('path/to/my/texture.png');
		 *     entity.backgroundPattern(texture, 'repeat', true, false);
		 * @example #Set a background pattern for this entity with isometric tiling
		 *     var texture = new IgeTexture('path/to/my/texture.png');
		 *     entity.backgroundPattern(texture, 'repeat', true, true);
		 * @return {*}
		 */
		backgroundPattern: function (texture, repeat, trackCamera, isoTile) {
			if (texture !== undefined) {
				this._backgroundPattern = texture;
				this._backgroundPatternRepeat = repeat || 'repeat';
				this._backgroundPatternTrackCamera = trackCamera;
				this._backgroundPatternIsoTile = isoTile;
				this._backgroundPatternFill = null;
				return this;
			}
			
			return this._backgroundPattern;
		},
		
		/**
		 * Set the object's width to the number of tile width's specified.
		 * @param {Number} val Number of tiles.
		 * @param {Boolean=} lockAspect If true, sets the height according
		 * to the texture aspect ratio and the new width.
		 * @example #Set the width of the entity based on the tile width of the map the entity is mounted to
		 *     // Set the entity width to the size of 1 tile with
		 *     // lock aspect enabled which will automatically size
		 *     // the height as well so as to maintain the aspect
		 *     // ratio of the entity
		 *     entity.widthByTile(1, true);
		 * @return {*} The object this method was called from to allow
		 * method chaining.
		 */
		widthByTile: function (val, lockAspect) {
			if (this._parent && this._parent._tileWidth !== undefined && this._parent._tileHeight !== undefined) {
				var tileSize = this._mode === 0 ? this._parent._tileWidth : this._parent._tileWidth * 2,
					ratio;
				
				this.width(val * tileSize);
				
				if (lockAspect) {
					if (this._texture) {
						// Calculate the height based on the new width
						ratio = this._texture._sizeX / this._bounds2d.x;
						this.height(this._texture._sizeY / ratio);
					} else {
						this.log('Cannot set height based on texture aspect ratio and new width because no texture is currently assigned to the entity!', 'error');
					}
				}
			} else {
				this.log('Cannot set width by tile because the entity is not currently mounted to a tile map or the tile map has no tileWidth or tileHeight values.', 'warning');
			}
			
			return this;
		},
		
		/**
		 * Set the object's height to the number of tile height's specified.
		 * @param {Number} val Number of tiles.
		 * @param {Boolean=} lockAspect If true, sets the width according
		 * to the texture aspect ratio and the new height.
		 * @example #Set the height of the entity based on the tile height of the map the entity is mounted to
		 *     // Set the entity height to the size of 1 tile with
		 *     // lock aspect enabled which will automatically size
		 *     // the width as well so as to maintain the aspect
		 *     // ratio of the entity
		 *     entity.heightByTile(1, true);
		 * @return {*} The object this method was called from to allow
		 * method chaining.
		 */
		heightByTile: function (val, lockAspect) {
			if (this._parent && this._parent._tileWidth !== undefined && this._parent._tileHeight !== undefined) {
				var tileSize = this._mode === 0 ? this._parent._tileHeight : this._parent._tileHeight * 2,
					ratio;
				
				this.height(val * tileSize);
				
				if (lockAspect) {
					if (this._texture) {
						// Calculate the width based on the new height
						ratio = this._texture._sizeY / this._bounds2d.y;
						this.width(this._texture._sizeX / ratio);
					} else {
						this.log('Cannot set width based on texture aspect ratio and new height because no texture is currently assigned to the entity!', 'error');
					}
				}
			} else {
				this.log('Cannot set height by tile because the entity is not currently mounted to a tile map or the tile map has no tileWidth or tileHeight values.', 'warning');
			}
			
			return this;
		},
		
		/**
		 * Adds the object to the tile map at the passed tile co-ordinates. If
		 * no tile co-ordinates are passed, will use the current tile position
		 * and the tileWidth() and tileHeight() values.
		 * @param {Number=} x X co-ordinate of the tile to occupy.
		 * @param {Number=} y Y co-ordinate of the tile to occupy.
		 * @param {Number=} width Number of tiles along the x-axis to occupy.
		 * @param {Number=} height Number of tiles along the y-axis to occupy.
		 */
		occupyTile: function (x, y, width, height) {
			// Check that the entity is mounted to a tile map
			if (this._parent && this._parent.IgeTileMap2d) {
				if (x !== undefined && y !== undefined) {
					this._parent.occupyTile(x, y, width, height, this);
				} else {
					// Occupy tiles based upon tile point and tile width/height
					var trPoint = new IgePoint3d(this._translate.x - (((this._tileWidth / 2) - 0.5) * this._parent._tileWidth), this._translate.y - (((this._tileHeight / 2) - 0.5) * this._parent._tileHeight), 0),
						tilePoint = this._parent.pointToTile(trPoint);
					
					if (this._parent._mountMode === 1) {
						tilePoint.thisToIso();
					}
					
					this._parent.occupyTile(tilePoint.x, tilePoint.y, this._tileWidth, this._tileHeight, this);
				}
			}
			return this;
		},
		
		/**
		 * Removes the object from the tile map at the passed tile co-ordinates.
		 * If no tile co-ordinates are passed, will use the current tile position
		 * and the tileWidth() and tileHeight() values.
		 * @param {Number=} x X co-ordinate of the tile to un-occupy.
		 * @param {Number=} y Y co-ordinate of the tile to un-occupy.
		 * @param {Number=} width Number of tiles along the x-axis to un-occupy.
		 * @param {Number=} height Number of tiles along the y-axis to un-occupy.
		 * @private
		 */
		unOccupyTile: function (x, y, width, height) {
			// Check that the entity is mounted to a tile map
			if (this._parent && this._parent.IgeTileMap2d) {
				if (x !== undefined && y !== undefined) {
					this._parent.unOccupyTile(x, y, width, height);
				} else {
					// Un-occupy tiles based upon tile point and tile width/height
					var trPoint = new IgePoint3d(this._translate.x - (((this._tileWidth / 2) - 0.5) * this._parent._tileWidth), this._translate.y - (((this._tileHeight / 2) - 0.5) * this._parent._tileHeight), 0),
						tilePoint = this._parent.pointToTile(trPoint);
					
					if (this._parent._mountMode === 1) {
						tilePoint.thisToIso();
					}
					
					this._parent.unOccupyTile(tilePoint.x, tilePoint.y, this._tileWidth, this._tileHeight);
				}
			}
			return this;
		},
		
		/**
		 * Returns an array of tile co-ordinates that the object is currently
		 * over, calculated using the current world co-ordinates of the object
		 * as well as it's 3d geometry.
		 * @private
		 * @return {Array} The array of tile co-ordinates as IgePoint3d instances.
		 */
		overTiles: function () {
			// Check that the entity is mounted to a tile map
			if (this._parent && this._parent.IgeTileMap2d) {
				var x,
					y,
					tileWidth = this._tileWidth || 1,
					tileHeight = this._tileHeight || 1,
					tile = this._parent.pointToTile(this._translate),
					tileArr = [];
				
				for (x = 0; x < tileWidth; x++) {
					for (y = 0; y < tileHeight; y++) {
						tileArr.push(new IgePoint3d(tile.x + x, tile.y + y, 0));
					}
				}
				
				return tileArr;
			}
		},
		
		/**
		 * Gets / sets the anchor position that this entity's texture
		 * will be adjusted by.
		 * @param {Number=} x The x anchor value.
		 * @param {Number=} y The y anchor value.
		 * @return {*} "this" when arguments are passed to allow method
		 * chaining or the current value if no arguments are specified.
		 */
		anchor: function (x, y) {
			if (x !== undefined && y !== undefined) {
				this._anchor = new IgePoint2d(x, y);
				return this;
			}
			
			return this._anchor;
		},
		
		/**
		 * Gets / sets the geometry x value.
		 * @param {Number=} px The new x value in pixels.
		 * @example #Set the width of the entity
		 *     entity.width(40);
		 * @return {*} "this" when arguments are passed to allow method
		 * chaining or the current value if no arguments are specified.
		 */
		width: function (px, lockAspect) {
			if (px !== undefined) {
				if (lockAspect) {
					// Calculate the height from the change in width
					var ratio = px / this._bounds2d.x;
					this.height(this._bounds2d.y * ratio);
				}
				
				this._bounds2d.x = px;
				this._bounds2d.x2 = (px / 2);
				return this;
			}
			
			return this._bounds2d.x;
		},
		
		/**
		 * Gets / sets the geometry y value.
		 * @param {Number=} px The new y value in pixels.
		 * @example #Set the height of the entity
		 *     entity.height(40);
		 * @return {*} "this" when arguments are passed to allow method
		 * chaining or the current value if no arguments are specified.
		 */
		height: function (px, lockAspect) {
			if (px !== undefined) {
				if (lockAspect) {
					// Calculate the width from the change in height
					var ratio = px / this._bounds2d.y;
					this.width(this._bounds2d.x * ratio);
				}
				
				this._bounds2d.y = px;
				this._bounds2d.y2 = (px / 2);
				return this;
			}
			
			return this._bounds2d.y;
		},
		
		/**
		 * Gets / sets the 2d geometry of the entity. The x and y values are
		 * relative to the center of the entity. This geometry is used when
		 * rendering textures for the entity and positioning in world space as
		 * well as UI positioning calculations. It holds no bearing on isometric
		 * positioning.
		 * @param {Number=} x The new x value in pixels.
		 * @param {Number=} y The new y value in pixels.
		 * @example #Set the dimensions of the entity (width and height)
		 *     entity.bounds2d(40, 40);
		 * @return {*} "this" when arguments are passed to allow method
		 * chaining or the current value if no arguments are specified.
		 */
		bounds2d: function (x, y) {
			if (x !== undefined && y !== undefined) {
				this._bounds2d = new IgePoint2d(x, y, 0);
				return this;
			}
			
			if (x !== undefined && y === undefined) {
				// x is considered an IgePoint2d instance
				this._bounds2d = new IgePoint2d(x.x, x.y);
			}
			
			return this._bounds2d;
		},
		
		/**
		 * Gets / sets the 3d geometry of the entity. The x and y values are
		 * relative to the center of the entity and the z value is wholly
		 * positive from the "floor". Used to define a 3d bounding cuboid for
		 * the entity used in isometric depth sorting and hit testing.
		 * @param {Number=} x The new x value in pixels.
		 * @param {Number=} y The new y value in pixels.
		 * @param {Number=} z The new z value in pixels.
		 * @example #Set the dimensions of the entity (width, height and length)
		 *     entity.bounds3d(40, 40, 20);
		 * @return {*} "this" when arguments are passed to allow method
		 * chaining or the current value if no arguments are specified.
		 */
		bounds3d: function (x, y, z) {
			if (x !== undefined && y !== undefined && z !== undefined) {
				this._bounds3d = new IgePoint3d(x, y, z);
				return this;
			}
			
			return this._bounds3d;
		},
		
		/**
		 * @deprecated Use bounds3d instead
		 * @param x
		 * @param y
		 * @param z
		 */
		size3d: function (x, y, z) {
			this.log('size3d has been renamed to bounds3d but is exactly the same so please search/replace your code to update calls.', 'warning');
		},
		
		/**
		 * Gets / sets the life span of the object in milliseconds. The life
		 * span is how long the object will exist for before being automatically
		 * destroyed.
		 * @param {Number=} milliseconds The number of milliseconds the entity
		 * will live for from the current time.
		 * @param {Function=} deathCallback Optional callback method to call when
		 * the entity is destroyed from end of lifespan.
		 * @example #Set the lifespan of the entity to 2 seconds after which it will automatically be destroyed
		 *     entity.lifeSpan(2000);
		 * @return {*} "this" when arguments are passed to allow method
		 * chaining or the current value if no arguments are specified.
		 */
		lifeSpan: function (milliseconds, deathCallback) {
			if (milliseconds !== undefined) {
				this.deathTime(ige._currentTime + milliseconds, deathCallback);
				return this;
			}
			
			return this.deathTime() - ige._currentTime;
		},
		
		/**
		 * Gets / sets the timestamp in milliseconds that denotes the time
		 * that the entity will be destroyed. The object checks it's own death
		 * time during each tick and if the current time is greater than the
		 * death time, the object will be destroyed.
		 * @param {Number=} val The death time timestamp. This is a time relative
		 * to the engine's start time of zero rather than the current time that
		 * would be retrieved from new Date().getTime(). It is usually easier
		 * to call lifeSpan() rather than setting the deathTime directly.
		 * @param {Function=} deathCallback Optional callback method to call when
		 * the entity is destroyed from end of lifespan.
		 * @example #Set the death time of the entity to 60 seconds after engine start
		 *     entity.deathTime(60000);
		 * @return {*} "this" when arguments are passed to allow method
		 * chaining or the current value if no arguments are specified.
		 */
		deathTime: function (val, deathCallback) {
			if (val !== undefined) {
				this._deathTime = val;
				
				if (deathCallback !== undefined) {
					this._deathCallBack = deathCallback;
				}
				return this;
			}
			
			return this._deathTime;
		},
		
		/**
		 * Gets / sets the entity opacity from 0.0 to 1.0.
		 * @param {Number=} val The opacity value.
		 * @example #Set the entity to half-visible
		 *     entity.opacity(0.5);
		 * @example #Set the entity to fully-visible
		 *     entity.opacity(1.0);
		 * @return {*} "this" when arguments are passed to allow method
		 * chaining or the current value if no arguments are specified.
		 */
		opacity: function (val) {
			if (val !== undefined) {
				this._opacity = val;
				return this;
			}
			
			return this._opacity;
		},
		
		/**
		 * Gets / sets the noAabb flag that determines if the entity's axis
		 * aligned bounding box should be calculated every tick or not. If
		 * you don't need the AABB data (for instance if you don't need to
		 * detect mouse events on this entity or you DO want the AABB to be
		 * updated but want to control it manually by calling aabb(true)
		 * yourself as needed).
		 * @param {Boolean=} val If set to true will turn off AABB calculation.
		 * @returns {*}
		 */
		noAabb: function (val) {
			if (val !== undefined) {
				this._noAabb = val;
				return this;
			}
			
			return this._noAabb;
		},
		
		/**
		 * Gets / sets the texture to use when rendering the entity.
		 * @param {IgeTexture=} texture The texture object.
		 * @example #Set the entity texture (image)
		 *     var texture = new IgeTexture('path/to/some/texture.png');
		 *     entity.texture(texture);
		 * @return {*} "this" when arguments are passed to allow method
		 * chaining or the current value if no arguments are specified.
		 */
		texture: function (texture) {
			if (texture !== undefined) {
				this._texture = texture;
				return this;
			}
			
			return this._texture;
		},
		
		/**
		 * Gets / sets the current texture cell used when rendering the game
		 * object's texture. If the texture is not cell-based, this value is
		 * ignored.
		 * @param {Number=} val The cell index.
		 * @example #Set the entity texture as a 4x4 cell sheet and then set the cell to use
		 *     var texture = new IgeCellSheet('path/to/some/cellSheet.png', 4, 4);
		 *     entity.texture(texture)
		 *         .cell(3);
		 * @return {*} "this" when arguments are passed to allow method
		 * chaining or the current value if no arguments are specified.
		 */
		cell: function (val) {
			if (val > 0 || val === null) {
				this._cell = val;
				return this;
			}
			
			return this._cell;
		},
		
		/**
		 * Gets / sets the current texture cell used when rendering the game
		 * object's texture. If the texture is not cell-based, this value is
		 * ignored. This differs from cell() in that it accepts a string id
		 * as the cell
		 * @param {Number=} val The cell id.
		 * @example #Set the entity texture as a sprite sheet with cell ids and then set the cell to use
		 *     var texture = new IgeSpriteSheet('path/to/some/cellSheet.png', [
		 *         [0, 0, 40, 40, 'robotHead'],
		 *         [40, 0, 40, 40, 'humanHead'],
		 *     ]);
		 *
		 *     // Assign the texture, set the cell to use and then
		 *     // set the entity to the size of the cell automatically!
		 *     entity.texture(texture)
		 *         .cellById('robotHead')
		 *         .dimensionsFromCell();
		 * @return {*} "this" when arguments are passed to allow method
		 * chaining or the current value if no arguments are specified.
		 */
		cellById: function (val) {
			if (val !== undefined) {
				if (this._texture) {
					// Find the cell index this id corresponds to
					var i,
						tex = this._texture,
						cells = tex._cells;
					
					for (i = 1; i < cells.length; i++) {
						if (cells[i][4] === val) {
							// Found the cell id so assign this cell index
							this.cell(i);
							return this;
						}
					}
					
					// We were unable to find the cell index from the cell
					// id so produce an error
					this.log('Could not find the cell id "' + val + '" in the assigned entity texture ' + tex.id() + ', please check your sprite sheet (texture) cell definition to ensure the cell id "' + val + '" has been assigned to a cell!', 'error');
				} else {
					this.log('Cannot assign cell index from cell ID until an IgeSpriteSheet has been set as the texture for this entity. Please set the texture before calling cellById().', 'error');
				}
			}
			
			return this._cell;
		},
		
		/**
		 * Sets the geometry of the entity to match the width and height
		 * of the assigned texture.
		 * @param {Number=} percent The percentage size to resize to.
		 * @example #Set the entity dimensions based on the assigned texture
		 *     var texture = new IgeTexture('path/to/some/texture.png');
		 *
		 *     // Assign the texture, and then set the entity to the
		 *     // size of the texture automatically!
		 *     entity.texture(texture)
		 *         .dimensionsFromTexture();
		 * @return {*} The object this method was called from to allow
		 * method chaining.
		 */
		dimensionsFromTexture: function (percent) {
			if (this._texture) {
				if (percent === undefined) {
					this.width(this._texture._sizeX);
					this.height(this._texture._sizeY);
				} else {
					this.width(Math.floor(this._texture._sizeX / 100 * percent));
					this.height(Math.floor(this._texture._sizeY / 100 * percent));
				}
				
				// Recalculate localAabb
				this.localAabb(true);
			}
			
			return this;
		},
		
		/**
		 * Sets the geometry of the entity to match the width and height
		 * of the assigned texture cell. If the texture is not cell-based
		 * the entire texture width / height will be used.
		 * @param {Number=} percent The percentage size to resize to.
		 * @example #Set the entity dimensions based on the assigned texture and cell
		 *     var texture = new IgeSpriteSheet('path/to/some/cellSheet.png', [
		 *         [0, 0, 40, 40, 'robotHead'],
		 *         [40, 0, 40, 40, 'humanHead'],
		 *     ]);
		 *
		 *     // Assign the texture, set the cell to use and then
		 *     // set the entity to the size of the cell automatically!
		 *     entity.texture(texture)
		 *         .cellById('robotHead')
		 *         .dimensionsFromCell();
		 * @return {*} The object this method was called from to allow
		 * method chaining
		 */
		dimensionsFromCell: function (percent) {
			if (this._texture) {
				if (this._texture._cells && this._texture._cells.length) {
					if (percent === undefined) {
						this.width(this._texture._cells[this._cell][2]);
						this.height(this._texture._cells[this._cell][3]);
					} else {
						this.width(Math.floor(this._texture._cells[this._cell][2] / 100 * percent));
						this.height(Math.floor(this._texture._cells[this._cell][3] / 100 * percent));
					}
					
					// Recalculate localAabb
					this.localAabb(true);
				}
			}
			
			return this;
		},
		
		/**
		 * Gets / sets the highlight mode. True is on false is off.
		 * @param {Boolean} val The highlight mode true or false.
		 * @example #Set the entity to render highlighted
		 *     entity.highlight(true);
		 * @example #Get the current highlight state
		 *     var isHighlighted = entity.highlight();
		 * @return {*} "this" when arguments are passed to allow method
		 * chaining or the current value if no arguments are specified.
		 */
		highlight: function (val) {
			if (val !== undefined) {
				this._highlight = val;
				return this;
			}
			
			return this._highlight;
		},
		
		/**
		 * Returns the absolute world position of the entity as an
		 * IgePoint3d.
		 * @example #Get the world position of the entity
		 *     var wordPos = entity.worldPosition();
		 * @return {IgePoint3d} The absolute world position of the
		 * entity.
		 */
		worldPosition: function () {
			return new IgePoint3d(this._worldMatrix.matrix[2], this._worldMatrix.matrix[5], 0);
		},
		
		/**
		 * Returns the absolute world rotation z of the entity as a
		 * value in radians.
		 * @example #Get the world rotation of the entity's z axis
		 *     var wordRot = entity.worldRotationZ();
		 * @return {Number} The absolute world rotation z of the
		 * entity.
		 */
		worldRotationZ: function () {
			return this._worldMatrix.rotationRadians();
		},
		
		/**
		 * Converts an array of points from local space to this entity's
		 * world space using it's world transform matrix. This will alter
		 * the points passed in the array directly.
		 * @param {Array} points The array of IgePoints to convert.
		 */
		localToWorld: function (points, viewport, inverse) {
			viewport = viewport || ige._currentViewport;
			
			if (this._adjustmentMatrix) {
				// Apply the optional adjustment matrix
				this._worldMatrix.multiply(this._adjustmentMatrix);
			}
			
			if (!inverse) {
				this._worldMatrix.transform(points, this);
			} else {
				this._localMatrix.transform(points, this);
				//this._worldMatrix.getInverse().transform(points, this);
			}
			
			if (this._ignoreCamera) {
				//viewport.camera._worldMatrix.transform(points, this);
			}
		},
		
		/**
		 * Converts a point from local space to this entity's world space
		 * using it's world transform matrix. This will alter the point's
		 * data directly.
		 * @param {IgePoint3d} point The IgePoint3d to convert.
		 */
		localToWorldPoint: function (point, viewport) {
			viewport = viewport || ige._currentViewport;
			this._worldMatrix.transform([point], this);
		},
		
		/**
		 * Returns the screen position of the entity as an IgePoint3d where x is the
		 * "left" and y is the "top", useful for positioning HTML elements at the
		 * screen location of an IGE entity. This method assumes that the top-left
		 * of the main canvas element is at 0, 0. If not you can adjust the values
		 * yourself to allow for offset.
		 * @example #Get the screen position of the entity
		 *     var screenPos = entity.screenPosition();
		 * @return {IgePoint3d} The screen position of the entity.
		 */
		screenPosition: function () {
			return new IgePoint3d(
				Math.floor(((this._worldMatrix.matrix[2] - ige._currentCamera._translate.x) * ige._currentCamera._scale.x) + ige._bounds2d.x2),
				Math.floor(((this._worldMatrix.matrix[5] - ige._currentCamera._translate.y) * ige._currentCamera._scale.y) + ige._bounds2d.y2),
				0
			);
		},
		
		/**
		 * @deprecated Use bounds3dPolygon instead
		 */
		localIsoBoundsPoly: function () {},
		
		localBounds3dPolygon: function (recalculate) {
			if (this._bounds3dPolygonDirty || !this._localBounds3dPolygon || recalculate) {
				var geom = this._bounds3d,
					poly = new IgePoly2d(),
					// Bottom face
					bf2 = Math.toIso(+(geom.x2), -(geom.y2),  -(geom.z2)),
					bf3 = Math.toIso(+(geom.x2), +(geom.y2),  -(geom.z2)),
					bf4 = Math.toIso(-(geom.x2), +(geom.y2),  -(geom.z2)),
					// Top face
					tf1 = Math.toIso(-(geom.x2), -(geom.y2),  (geom.z2)),
					tf2 = Math.toIso(+(geom.x2), -(geom.y2),  (geom.z2)),
					tf4 = Math.toIso(-(geom.x2), +(geom.y2),  (geom.z2));
				
				poly.addPoint(tf1.x, tf1.y)
					.addPoint(tf2.x, tf2.y)
					.addPoint(bf2.x, bf2.y)
					.addPoint(bf3.x, bf3.y)
					.addPoint(bf4.x, bf4.y)
					.addPoint(tf4.x, tf4.y)
					.addPoint(tf1.x, tf1.y);
				
				this._localBounds3dPolygon = poly;
				this._bounds3dPolygonDirty = false;
			}
			
			return this._localBounds3dPolygon;
		},
		
		/**
		 * @deprecated Use bounds3dPolygon instead
		 */
		isoBoundsPoly: function () {},
		
		bounds3dPolygon: function (recalculate) {
			if (this._bounds3dPolygonDirty || !this._bounds3dPolygon || recalculate) {
				var poly = this.localBounds3dPolygon(recalculate).clone();
				
				// Convert local co-ordinates to world based on entities world matrix
				this.localToWorld(poly._poly);
				
				this._bounds3dPolygon = poly;
			}
			
			return this._bounds3dPolygon;
		},
		
		/**
		 * @deprecated Use mouseInBounds3d instead
		 */
		mouseInIsoBounds: function () {},
		
		mouseInBounds3d: function (recalculate) {
			var poly = this.localBounds3dPolygon(recalculate),
				mp = this.mousePos();
			
			return poly.pointInside(mp);
		},
		
		/**
		 * Calculates and returns the current axis-aligned bounding box in
		 * world co-ordinates.
		 * @param {Boolean=} recalculate If true this will force the
		 * recalculation of the AABB instead of returning a cached
		 * value.
		 * @example #Get the entity axis-aligned bounding box dimensions
		 *     var aabb = entity.aabb();
		 *
		 *     console.log(aabb.x);
		 *     console.log(aabb.y);
		 *     console.log(aabb.width);
		 *     console.log(aabb.height);
		 * @example #Get the entity axis-aligned bounding box dimensions forcing the engine to update the values first
		 *     var aabb = entity.aabb(true); // Call with true to force update
		 *
		 *     console.log(aabb.x);
		 *     console.log(aabb.y);
		 *     console.log(aabb.width);
		 *     console.log(aabb.height);
		 * @return {IgeRect} The axis-aligned bounding box in world co-ordinates.
		 */
		aabb: function (recalculate, inverse) {
			if (this._aabbDirty || !this._aabb || recalculate) { //  && this.newFrame()
				var poly = new IgePoly2d(),
					minX, minY,
					maxX, maxY,
					box,
					anc = this._anchor,
					ancX = anc.x,
					ancY = anc.y,
					geom,
					geomX2,
					geomY2,
					x, y;
				
				geom = this._bounds2d;
				geomX2 = geom.x2;
				geomY2 = geom.y2;
				
				x = geomX2;
				y = geomY2;
				
				poly.addPoint(-x + ancX, -y + ancY);
				poly.addPoint(x + ancX, -y + ancY);
				poly.addPoint(x + ancX, y + ancY);
				poly.addPoint(-x + ancX, y + ancY);
				
				this._renderPos = {x: -x + ancX, y: -y + ancY};
				
				// Convert the poly's points from local space to world space
				this.localToWorld(poly._poly, null, inverse);
				
				// Get the extents of the newly transformed poly
				minX = Math.min(
					poly._poly[0].x,
					poly._poly[1].x,
					poly._poly[2].x,
					poly._poly[3].x
				);
				
				minY = Math.min(
					poly._poly[0].y,
					poly._poly[1].y,
					poly._poly[2].y,
					poly._poly[3].y
				);
				
				maxX = Math.max(
					poly._poly[0].x,
					poly._poly[1].x,
					poly._poly[2].x,
					poly._poly[3].x
				);
				
				maxY = Math.max(
					poly._poly[0].y,
					poly._poly[1].y,
					poly._poly[2].y,
					poly._poly[3].y
				);
				
				box = new IgeRect(minX, minY, maxX - minX, maxY - minY);
				
				this._aabb = box;
				this._aabbDirty = false;
			}
			
			return this._aabb;
		},
		
		/**
		 * Calculates and returns the local axis-aligned bounding box
		 * for the entity. This is the AABB relative to the entity's
		 * center point.
		 * @param {Boolean=} recalculate If true this will force the
		 * recalculation of the local AABB instead of returning a cached
		 * value.
		 * @example #Get the entity local axis-aligned bounding box dimensions
		 *     var aabb = entity.localAabb();
		 *
		 *     console.log(aabb.x);
		 *     console.log(aabb.y);
		 *     console.log(aabb.width);
		 *     console.log(aabb.height);
		 * @example #Get the entity local axis-aligned bounding box dimensions forcing the engine to update the values first
		 *     var aabb = entity.localAabb(true); // Call with true to force update
		 *
		 *     console.log(aabb.x);
		 *     console.log(aabb.y);
		 *     console.log(aabb.width);
		 *     console.log(aabb.height);
		 * @return {IgeRect} The local AABB.
		 */
		localAabb: function (recalculate) {
			if (!this._localAabb || recalculate) {
				var aabb = this.aabb();
				this._localAabb = new IgeRect(-Math.floor(aabb.width / 2), -Math.floor(aabb.height / 2), Math.floor(aabb.width), Math.floor(aabb.height));
			}
			
			return this._localAabb;
		},
		
		/**
		 * Calculates the axis-aligned bounding box for this entity, including
		 * all child entity bounding boxes and returns the final composite
		 * bounds.
		 * @example #Get the composite AABB
		 *     var entity = new IgeEntity(),
		 *         aabb = entity.compositeAabb();
		 * @return {IgeRect}
		 */
		compositeAabb: function (inverse) {
			var arr = this._children,
				arrCount,
				rect;
			
			if (inverse) {
				rect = this.aabb(true, inverse).clone();
			} else {
				rect = this.aabb().clone();
			}
			
			// Now loop all children and get the aabb for each of them
			// them add those bounds to the current rect
			if (arr) {
				arrCount = arr.length;
				
				while (arrCount--) {
					rect.thisCombineRect(arr[arrCount].compositeAabb(inverse));
				}
			}
			
			return rect;
		},
		
		/**
		 * Gets / sets the composite stream flag. If set to true, any objects
		 * mounted to this one will have their streamMode() set to the same
		 * value as this entity and will also have their compositeStream flag
		 * set to true. This allows you to easily automatically stream any
		 * objects mounted to a root object and stream them all.
		 * @param val
		 * @returns {*}
		 */
		compositeStream: function (val) {
			if (val !== undefined) {
				this._compositeStream = val;
				return this;
			}
			
			return this._compositeStream;
		},
		
		/**
		 * Override the _childMounted method and apply entity-based flags.
		 * @param {IgeEntity} child
		 * @private
		 */
		_childMounted: function (child) {
			// Check if we need to set the compositeStream and streamMode
			if (this.compositeStream()) {
				child.compositeStream(true);
				child.streamMode(this.streamMode());
				child.streamControl(this.streamControl());
			}
			
			IgeObject.prototype._childMounted.call(this, child);
			
			// Check if we are compositeCached and update the cache
			if (this.compositeCache()) {
				this.cacheDirty(true);
			}
		},
		
		/**
		 * Takes two values and returns them as an array where index [0]
		 * is the y argument and index[1] is the x argument. This method
		 * is used specifically in the 3d bounds intersection process to
		 * determine entity depth sorting.
		 * @param {Number} x The first value.
		 * @param {Number} y The second value.
		 * @return {Array} The swapped arguments.
		 * @private
		 */
		_swapVars: function (x, y) {
			return [y, x];
		},
		
		_internalsOverlap: function (x0, x1, y0, y1) {
			var tempSwap;
			
			if (x0 > x1) {
				tempSwap = this._swapVars(x0, x1);
				x0 = tempSwap[0];
				x1 = tempSwap[1];
			}
			
			if (y0 > y1) {
				tempSwap = this._swapVars(y0, y1);
				y0 = tempSwap[0];
				y1 = tempSwap[1];
			}
			
			if (x0 > y0) {
				tempSwap = this._swapVars(x0, y0);
				x0 = tempSwap[0];
				y0 = tempSwap[1];
				
				tempSwap = this._swapVars(x1, y1);
				x1 = tempSwap[0];
				y1 = tempSwap[1];
			}
			
			return y0 < x1;
		},
		
		_projectionOverlap: function (otherObject) {
			var thisG3d = this._bounds3d,
				thisMin = {
					x: this._translate.x - thisG3d.x / 2,
					y: this._translate.y - thisG3d.y / 2,
					z: this._translate.z - thisG3d.z
				},
				thisMax = {
					x: this._translate.x + thisG3d.x / 2,
					y: this._translate.y + thisG3d.y / 2,
					z: this._translate.z + thisG3d.z
				},
				otherG3d = otherObject._bounds3d,
				otherMin = {
					x: otherObject._translate.x - otherG3d.x / 2,
					y: otherObject._translate.y - otherG3d.y / 2,
					z: otherObject._translate.z - otherG3d.z
				},
				otherMax = {
					x: otherObject._translate.x + otherG3d.x / 2,
					y: otherObject._translate.y + otherG3d.y / 2,
					z: otherObject._translate.z + otherG3d.z
				};
			
			return this._internalsOverlap(
					thisMin.x - thisMax.y,
					thisMax.x - thisMin.y,
					otherMin.x - otherMax.y,
					otherMax.x - otherMin.y
				) && this._internalsOverlap(
					thisMin.x - thisMax.z,
					thisMax.x - thisMin.z,
					otherMin.x - otherMax.z,
					otherMax.x - otherMin.z
				) && this._internalsOverlap(
					thisMin.z - thisMax.y,
					thisMax.z - thisMin.y,
					otherMin.z - otherMax.y,
					otherMax.z - otherMin.y
				);
		},
		
		/**
		 * Compares the current entity's 3d bounds to the passed entity and
		 * determines if the current entity is "behind" the passed one. If an
		 * entity is behind another, it is drawn first during the scenegraph
		 * render phase.
		 * @param {IgeEntity} otherObject The other entity to check this
		 * entity's 3d bounds against.
		 * @example #Determine if this entity is "behind" another entity based on the current depth-sort
		 *     var behind = entity.isBehind(otherEntity);
		 * @return {Boolean} If true this entity is "behind" the passed entity
		 * or false if not.
		 */
		isBehind: function (otherObject) {
			var thisG3d = this._bounds3d,
				otherG3d = otherObject._bounds3d,
				thisTranslate = this._translate.clone(),
				otherTranslate = otherObject._translate.clone();
			
			// thisTranslate.thisToIso();
			// otherTranslate.thisToIso();
			
			if(this._origin.x !== 0.5 || this._origin.y !== 0.5) {
				thisTranslate.x += this._bounds2d.x * (0.5 - this._origin.x)
				thisTranslate.y += this._bounds2d.y * (0.5 - this._origin.y)
			}
			if(otherObject._origin.x !== 0.5 || otherObject._origin.y !== 0.5) {
				otherTranslate.x += otherObject._bounds2d.x * (0.5 - otherObject._origin.x)
				otherTranslate.y += otherObject._bounds2d.y * (0.5 - otherObject._origin.y)
			}
			
			var
				thisX = thisTranslate.x,
				thisY = thisTranslate.y,
				otherX = otherTranslate.x,
				otherY = otherTranslate.y,
				thisMin = new IgePoint3d(
					thisX - thisG3d.x / 2,
					thisY - thisG3d.y / 2,
					this._translate.z
				),
				thisMax = new IgePoint3d(
					thisX + thisG3d.x / 2,
					thisY + thisG3d.y / 2,
					this._translate.z + thisG3d.z
				),
				otherMin = new IgePoint3d(
					otherX - otherG3d.x / 2,
					otherY - otherG3d.y / 2,
					otherObject._translate.z
				),
				otherMax = new IgePoint3d(
					otherX + otherG3d.x / 2,
					otherY + otherG3d.y / 2,
					otherObject._translate.z + otherG3d.z
				);
			
			if (thisMax.x <= otherMin.x) {
				return false;
			}
			
			if (otherMax.x <= thisMin.x) {
				return true;
			}
			
			if (thisMax.y <= otherMin.y) {
				return false;
			}
			
			if (otherMax.y <= thisMin.y) {
				return true;
			}
			
			if (thisMax.z <= otherMin.z) {
				return false;
			}
			
			if (otherMax.z <= thisMin.z) {
				return true;
			}
			
			return (thisX + thisY + this._translate.z) > (otherX + otherY + otherObject._translate.z);
		},
		
		/**
		 * Get / set the flag determining if this entity will respond
		 * to mouse interaction or not. When you set a mouse* event e.g.
		 * mouseUp, mouseOver etc this flag will automatically be reset
		 * to true.
		 * @param {Boolean=} val The flag value true or false.
		 * @example #Set entity to ignore mouse events
		 *     entity.mouseEventsActive(false);
		 * @example #Set entity to receive mouse events
		 *     entity.mouseEventsActive(true);
		 * @example #Get current flag value
		 *     var val = entity.mouseEventsActive();
		 * @return {*} "this" when arguments are passed to allow method
		 * chaining or the current value if no arguments are specified.
		 */
		mouseEventsActive: function (val) {
			if (val !== undefined) {
				this._mouseEventsActive = val;
				return this;
			}
			
			return this._mouseEventsActive;
		},
		
		/**
		 * Sets the _ignoreCamera internal flag to the value passed for this
		 * and all child entities down the scenegraph.
		 * @param val
		 */
		ignoreCameraComposite: function (val) {
			var i,
				arr = this._children,
				arrCount = arr.length;
			
			this._ignoreCamera = val;
			
			for (i = 0; i < arrCount; i++) {
				if (arr[i].ignoreCameraComposite) {
					arr[i].ignoreCameraComposite(val);
				}
			}
		},
		
		/**
		 * Determines if the frame alternator value for this entity
		 * matches the engine's frame alternator value. The entity's
		 * frame alternator value will be set to match the engine's
		 * after each call to the entity.tick() method so the return
		 * value of this method can be used to determine if the tick()
		 * method has already been run for this entity.
		 *
		 * This is useful if you have multiple viewports which will
		 * cause the entity tick() method to fire once for each viewport
		 * but you only want to execute update code such as movement etc
		 * on the first time the tick() method is called.
		 *
		 * @example #Determine if the entity has already had it's tick method called
		 *     var tickAlreadyCalled = entity.newFrame();
		 * @return {Boolean} If false, the entity's tick method has
		 * not yet been processed for this tick.
		 */
		newFrame: function () {
			return ige._frameAlternator !== this._frameAlternatorCurrent;
		},
		
		/**
		 * Sets the canvas context transform properties to match the the game
		 * object's current transform values.
		 * @param {CanvasRenderingContext2D} ctx The canvas context to apply
		 * the transformation matrix to.
		 * @example #Transform a canvas context to the entity's local matrix values
		 *     var canvas = document.createElement('canvas');
		 *     canvas.width = 800;
		 *     canvas.height = 600;
		 *
		 *     var ctx = canvas.getContext('2d');
		 *     entity._transformContext(ctx);
		 * @private
		 */
		_transformContext: function (ctx, inverse) {
			if (this._parent) {
				ctx.globalAlpha = this._computedOpacity = this._parent._computedOpacity * this._opacity;
			} else {
				ctx.globalAlpha = this._computedOpacity = this._opacity;
			}
			
			if (!inverse) {
				this._localMatrix.transformRenderingContext(ctx);
			} else {
				this._localMatrix.getInverse().transformRenderingContext(ctx);
			}
		},
		
		mouseAlwaysInside: function (val) {
			if (val !== undefined) {
				this._mouseAlwaysInside = val;
				return this;
			}
			
			return this._mouseAlwaysInside;
		},
		
		/**
		 * Processes the updates required each render frame. Any code in the update()
		 * method will be called ONCE for each render frame BEFORE the tick() method.
		 * This differs from the tick() method in that the tick method can be called
		 * multiple times during a render frame depending on how many viewports your
		 * simulation is being rendered to, whereas the update() method is only called
		 * once. It is therefore the perfect place to put code that will control your
		 * entity's motion, AI etc.
		 * @param {CanvasRenderingContext2D} ctx The canvas context to render to.
		 */
		update: function (ctx, tickDelta) {
			// Check if the entity should still exist
			if (this._deathTime !== undefined && this._deathTime <= ige._tickStart) {
				// Check if the deathCallBack was set
				if (this._deathCallBack) {
					this._deathCallBack.apply(this);
					delete this._deathCallback;
				}
				
				// The entity should be removed because it has died
				this.destroy();
			} else {
				// Check that the entity has been born
				if (this._bornTime === undefined || ige._currentTime >= this._bornTime) {
					// Remove the stream data cache
					delete this._streamDataCache;
					
					// Process any behaviours assigned to the entity
					this._processUpdateBehaviours(ctx, tickDelta);
					
					// Process velocity
					if (this._velocity.x || this._velocity.y) {
						this._translate.x += (this._velocity.x / 16) * tickDelta;
						this._translate.y += (this._velocity.y / 16) * tickDelta;
					}
					
					if (this._timeStream.length) {
						// Process any interpolation
						this._processInterpolate(ige._tickStart - ige.network.stream._renderLatency);
					}
					
					// Check for changes to the transform values
					// directly without calling the transform methods
					this.updateTransform();
					
					if (!this._noAabb && this._aabbDirty) {
						// Update the aabb
						this.aabb();
					}
					
					this._oldTranslate = this._translate.clone();
					
					// Update this object's current frame alternator value
					// which allows us to determine if we are still on the
					// same frame
					this._frameAlternatorCurrent = ige._frameAlternator;
				} else {
					// The entity is not yet born, unmount it and add to the spawn queue
					this._birthMount = this._parent.id();
					this.unMount();
					
					ige.spawnQueue(this);
				}
			}
			
			// Process super class
			IgeObject.prototype.update.call(this, ctx, tickDelta);
		},
		
		/**
		 * Processes the actions required each render frame.
		 * @param {CanvasRenderingContext2D} ctx The canvas context to render to.
		 * @param {Boolean} dontTransform If set to true, the tick method will
		 * not transform the context based on the entity's matrices. This is useful
		 * if you have extended the class and want to process down the inheritance
		 * chain but have already transformed the entity in a previous overloaded
		 * method.
		 */
		tick: function (ctx, dontTransform) {
			if (!this._hidden && this._inView && (!this._parent || (this._parent._inView)) && !this._streamJustCreated) {
				// Process any behaviours assigned to the entity
				this._processTickBehaviours(ctx);
				
				// Process any mouse events we need to do
				if (this._mouseEventsActive) {
					if (this._processTriggerHitTests()) {
						// Point is inside the trigger bounds
						ige.input.queueEvent(this, this._mouseInTrigger, null);
					} else {
						if (ige.input.mouseMove) {
							// There is a mouse move event but we are not inside the entity
							// so fire a mouse out event (_handleMouseOut will check if the
							// mouse WAS inside before firing an out event).
							this._handleMouseOut(ige.input.mouseMove);
						}
					}
				}
				
				if (!this._dontRender) {
					// Check for cached version
					if (this._cache || this._compositeCache) {
						// Caching is enabled
						if (this._cacheDirty) {
							// The cache is dirty, redraw it
							this._refreshCache(dontTransform);
						}
						
						// Now render the cached image data to the main canvas
						this._renderCache(ctx);
					} else {
						// Non-cached output
						// Transform the context by the current transform settings
						if (!dontTransform) {
							this._transformContext(ctx);
						}
						
						// Render the entity
						this._renderEntity(ctx, dontTransform);
					}
				}
				
				// Process any automatic-mode stream updating required
				if (this._streamMode === 1) {
					this.streamSync();
				}
				
				if (this._compositeCache) {
					if (this._cacheDirty) {
						// Process children
						IgeObject.prototype.tick.call(this, this._cacheCtx);
						this._renderCache(ctx);
						this._cacheDirty = false;
					}
				} else {
					// Process children
					IgeObject.prototype.tick.call(this, ctx);
				}
			}
		},
		
		_processTriggerHitTests: function () {
			var mp, mouseTriggerPoly;
			
			if (ige._currentViewport) {
				if (!this._mouseAlwaysInside) {
					mp = this.mousePosWorld();
					
					if (mp) {
						// Use the trigger polygon if defined
						if (this._triggerPolygon && this[this._triggerPolygon]) {
							mouseTriggerPoly = this[this._triggerPolygon](mp);
						} else {
							// Default to either aabb or bounds3dPolygon depending on entity parent mounting mode
							if (this._parent && this._parent._mountMode === 1) {
								// Use bounds3dPolygon
								mouseTriggerPoly = this.bounds3dPolygon();
							} else {
								// Use aabb
								mouseTriggerPoly = this.aabb();
							}
						}
						
						// Check if the current mouse position is inside this aabb
						return mouseTriggerPoly.xyInside(mp.x, mp.y);
					}
				} else {
					return true;
				}
			}
			
			return false;
		},
		
		_refreshCache: function (dontTransform) {
			// The cache is not clean so re-draw it
			// Render the entity to the cache
			var _canvas = this._cacheCanvas,
				_ctx = this._cacheCtx;
			
			if (this._compositeCache) {
				// Get the composite entity AABB and alter the internal canvas
				// to the composite size so we can render the entire entity
				var aabbC = this.compositeAabb(true);
				
				this._compositeAabbCache = aabbC;
				
				if (aabbC.width > 0 && aabbC.height > 0) {
					_canvas.width = Math.ceil(aabbC.width);
					_canvas.height = Math.ceil(aabbC.height);
				} else {
					// We cannot set a zero size for a canvas, it will
					// cause the browser to freak out
					_canvas.width = 2;
					_canvas.height = 2;
				}
				
				// Translate to the center of the canvas
				_ctx.translate(-aabbC.x, -aabbC.y);
				
				/**
				 * Fires when the entity's composite cache is ready.
				 * @event IgeEntity#compositeReady
				 */
				this.emit('compositeReady');
			} else {
				if (this._bounds2d.x > 0 && this._bounds2d.y > 0) {
					_canvas.width = this._bounds2d.x;
					_canvas.height = this._bounds2d.y;
				} else {
					// We cannot set a zero size for a canvas, it will
					// cause the browser to freak out
					_canvas.width = 1;
					_canvas.height = 1;
				}
				
				// Translate to the center of the canvas
				_ctx.translate(this._bounds2d.x2, this._bounds2d.y2);
				
				this._cacheDirty = false;
			}
			
			// Transform the context by the current transform settings
			if (!dontTransform) {
				this._transformContext(_ctx);
			}
			
			this._renderEntity(_ctx, dontTransform);
		},
		
		/**
		 * Handles calling the texture.render() method if a texture
		 * is applied to the entity. This part of the tick process has
		 * been abstracted to allow it to be overridden by an extending
		 * class.
		 * @param {CanvasRenderingContext2D} ctx The canvas context to render
		 * the entity to.
		 * @private
		 */
		_renderEntity: function (ctx) {
			if (this._opacity > 0) {
				// Check if the entity has a background pattern
				if (this._backgroundPattern) {
					if (!this._backgroundPatternFill) {
						// We have a pattern but no fill produced
						// from it. Check if we have a context to
						// generate a pattern from
						if (ctx) {
							// Produce the pattern fill
							this._backgroundPatternFill = ctx.createPattern(this._backgroundPattern.image, this._backgroundPatternRepeat);
						}
					}
					
					if (this._backgroundPatternFill) {
						// Draw the fill
						ctx.save();
						ctx.fillStyle = this._backgroundPatternFill;
						
						// TODO: When firefox has fixed their bug regarding negative rect co-ordinates, revert this change
						
						// This is the proper way to do this but firefox has a bug which I'm gonna report
						// so instead I have to use ANOTHER translate call instead. So crap!
						//ctx.rect(-this._bounds2d.x2, -this._bounds2d.y2, this._bounds2d.x, this._bounds2d.y);
						ctx.translate(-this._bounds2d.x2, -this._bounds2d.y2);
						ctx.rect(0, 0, this._bounds2d.x, this._bounds2d.y);
						if (this._backgroundPatternTrackCamera) {
							ctx.translate(-ige._currentCamera._translate.x, -ige._currentCamera._translate.y);
							ctx.scale(ige._currentCamera._scale.x, ige._currentCamera._scale.y);
						}
						ctx.fill();
						ige._drawCount++;
						
						if (this._backgroundPatternIsoTile) {
							ctx.translate(-Math.floor(this._backgroundPattern.image.width) / 2, -Math.floor(this._backgroundPattern.image.height / 2));
							ctx.fill();
							ige._drawCount++;
						}
						
						ctx.restore();
					}
				}
				
				var texture = this._texture;
				
				// Check if the entity is visible based upon its opacity
				if (texture && texture._loaded) {
					// Draw the entity image
					texture.render(ctx, this, ige._tickDelta);
					
					if (this._highlight) {
						ctx.globalCompositeOperation = 'lighter';
						texture.render(ctx, this);
					}
				}
				
				if (this._compositeCache && ige._currentViewport._drawCompositeBounds) {
					//console.log('moo');
					ctx.fillStyle = 'rgba(0, 0, 255, 0.3)';
					ctx.fillRect(-this._bounds2d.x2, -this._bounds2d.y2, this._bounds2d.x,	this._bounds2d.y);
					ctx.fillStyle = '#ffffff';
					ctx.fillText('Composite Entity', -this._bounds2d.x2, -this._bounds2d.y2 - 15);
					ctx.fillText(this.id(), -this._bounds2d.x2, -this._bounds2d.y2 - 5);
				}
			}
		},
		
		/**
		 * Draws the cached off-screen canvas image data to the passed canvas
		 * context.
		 * @param {CanvasRenderingContext2D} ctx The canvas context to render
		 * the entity to.
		 * @private
		 */
		_renderCache: function (ctx) {
			ctx.save();
			if (this._compositeCache) {
				var aabbC = this._compositeAabbCache;
				ctx.translate(this._bounds2d.x2 + aabbC.x, this._bounds2d.y2 + aabbC.y);
				
				if (this._parent && this._parent._ignoreCamera) {
					// Translate the entity back to negate the scene translate
					var cam = ige._currentCamera;
					//ctx.translate(-cam._translate.x, -cam._translate.y);
					/*this.scaleTo(1 / cam._scale.x, 1 / cam._scale.y, 1 / cam._scale.z);
					 this.rotateTo(-cam._rotate.x, -cam._rotate.y, -cam._rotate.z);*/
				}
			}
			
			// We have a clean cached version so output that
			ctx.drawImage(
				this._cacheCanvas,
				-this._bounds2d.x2, -this._bounds2d.y2
			);
			
			if (ige._currentViewport._drawCompositeBounds) {
				ctx.fillStyle = 'rgba(0, 255, 0, 0.5)';
				ctx.fillRect(-this._bounds2d.x2, -this._bounds2d.y2, this._cacheCanvas.width,	this._cacheCanvas.height);
				ctx.fillStyle = '#ffffff';
				ctx.fillText('Composite Cache', -this._bounds2d.x2, -this._bounds2d.y2 - 15);
				ctx.fillText(this.id(), -this._bounds2d.x2, -this._bounds2d.y2 - 5);
			}
			
			ige._drawCount++;
			
			if (this._highlight) {
				ctx.globalCompositeOperation = 'lighter';
				ctx.drawImage(
					this._cacheCanvas,
					-this._bounds2d.x2, -this._bounds2d.y2
				);
				
				ige._drawCount++;
			}
			ctx.restore();
		},
		
		/**
		 * Transforms a point by the entity's parent world matrix and
		 * it's own local matrix transforming the point to this entity's
		 * world space.
		 * @param {IgePoint3d} point The point to transform.
		 * @example #Transform a point by the entity's world matrix values
		 *     var point = new IgePoint3d(0, 0, 0);
		 *     entity._transformPoint(point);
		 *
		 *     console.log(point);
		 * @return {IgePoint3d} The transformed point.
		 * @private
		 */
		_transformPoint: function (point) {
			if (this._parent) {
				var tempMat = new IgeMatrix2d();
				// Copy the parent world matrix
				tempMat.copy(this._parent._worldMatrix);
				// Apply any local transforms
				tempMat.multiply(this._localMatrix);
				// Now transform the point
				tempMat.getInverse().transformCoord(point, this);
			} else {
				this._localMatrix.transformCoord(point, this);
			}
			
			return point;
		},
		
		/**
		 * Helper method to transform an array of points using _transformPoint.
		 * @param {Array} points The points array to transform.
		 * @private
		 */
		_transformPoints: function (points) {
			var point, pointCount = points.length;
			
			while (pointCount--) {
				point = points[pointCount];
				if (this._parent) {
					var tempMat = new IgeMatrix2d();
					// Copy the parent world matrix
					tempMat.copy(this._parent._worldMatrix);
					// Apply any local transforms
					tempMat.multiply(this._localMatrix);
					// Now transform the point
					tempMat.getInverse().transformCoord(point, this);
				} else {
					this._localMatrix.transformCoord(point, this);
				}
			}
		},
		
		/**
		 * Generates a string containing a code fragment that when
		 * evaluated will reproduce this object's properties via
		 * chained commands. This method will only check for
		 * properties that are directly related to this class.
		 * Other properties are handled by their own class method.
		 * @return {String} The string code fragment that will
		 * reproduce this entity when evaluated.
		 */
		_stringify: function (options) {
			// Make sure we have an options object
			if (options === undefined) { options = {}; }
			
			// Get the properties for all the super-classes
			var str = IgeObject.prototype._stringify.call(this, options), i;
			
			// Loop properties and add property assignment code to string
			for (i in this) {
				if (this.hasOwnProperty(i) && this[i] !== undefined) {
					switch (i) {
						case '_opacity':
							str += ".opacity(" + this.opacity() + ")";
							break;
						case '_texture':
							str += ".texture(ige.$('" + this.texture().id() + "'))";
							break;
						case '_cell':
							str += ".cell(" + this.cell() + ")";
							break;
						case '_translate':
							if (options.transform !== false && options.translate !== false) {
								str += ".translateTo(" + this._translate.x + ", " + this._translate.y + ", " + this._translate.z + ")";
							}
							break;
						case '_rotate':
							if (options.transform !== false && options.rotate !== false) {
								str += ".rotateTo(" + this._rotate.x + ", " + this._rotate.y + ", " + this._rotate.z + ")";
							}
							break;
						case '_scale':
							if (options.transform !== false && options.scale !== false) {
								str += ".scaleTo(" + this._scale.x + ", " + this._scale.y + ", " + this._scale.z + ")";
							}
							break;
						case '_origin':
							if (options.origin !== false) {
								str += ".originTo(" + this._origin.x + ", " + this._origin.y + ", " + this._origin.z + ")";
							}
							break;
						case '_anchor':
							if (options.anchor !== false) {
								str += ".anchor(" + this._anchor.x + ", " + this._anchor.y + ")";
							}
							break;
						case '_width':
							if (typeof(this.width()) === 'string') {
								str += ".width('" + this.width() + "')";
							} else {
								str += ".width(" + this.width() + ")";
							}
							break;
						case '_height':
							if (typeof(this.height()) === 'string') {
								str += ".height('" + this.height() + "')";
							} else {
								str += ".height(" + this.height() + ")";
							}
							break;
						case '_bounds3d':
							str += ".bounds3d(" + this._bounds3d.x + ", " + this._bounds3d.y + ", " + this._bounds3d.z + ")";
							break;
						case '_deathTime':
							if (options.deathTime !== false && options.lifeSpan !== false) {
								str += ".deathTime(" + this.deathTime() + ")";
							}
							break;
						case '_highlight':
							str += ".highlight(" + this.highlight() + ")";
							break;
					}
				}
			}
			
			return str;
		},
		
		/**
		 * Destroys the entity by removing it from the scenegraph,
		 * calling destroy() on any child entities and removing
		 * any active event listeners for the entity. Once an entity
		 * has been destroyed it's this._alive flag is also set to
		 * false.
		 * @example #Destroy the entity
		 *     entity.destroy();
		 */
		destroy: function () {
			this._alive = false;
			
			/* CEXCLUDE */
			// Check if the entity is streaming
			if (this._streamMode === 1) {
				delete this._streamDataCache;
				this.streamDestroy();
			}
			/* CEXCLUDE */
			
			/**
			 * Fires when the entity has been destroyed.
			 * @event IgeEntity#destroyed
			 * @param {IgeEntity} The entity that has been destroyed.
			 */
			this.emit('destroyed', this);
			
			// Call IgeObject.destroy()
			IgeObject.prototype.destroy.call(this);
		},
		
		saveSpecialProp: function (obj, i) {
			switch (i) {
				case '_texture':
					if (obj._texture) {
						return {_texture: obj._texture.id()};
					}
					break;
				
				default:
					// Call super-class saveSpecialProp
					return IgeObject.prototype.saveSpecialProp.call(this, obj, i);
					break;
			}
			
			return undefined;
		},
		
		loadSpecialProp: function (obj, i) {
			switch (i) {
				case '_texture':
					return {_texture: ige.$(obj[i])};
					break;
				
				default:
					// Call super-class loadSpecialProp
					return IgeObject.prototype.loadSpecialProp.call(this, obj, i);
					break;
			}
			
			return undefined;
		},
		
		////////////////////////////////////////////////////////////////////////////////////////////////////////////////
		// INTERACTION
		////////////////////////////////////////////////////////////////////////////////////////////////////////////////
		/**
		 * Gets / sets the callback that is fired when a mouse
		 * move event is triggered.
		 * @param {Function=} callback
		 * @example #Hook the mouse move event and stop it propagating further down the scenegraph
		 *     entity.mouseMove(function (event, control) {
	 *         // Mouse moved with button
	 *         console.log('Mouse move button: ' + event.button);
	 *
	 *         // Stop the event propagating further down the scenegraph
	 *         control.stopPropagation();
	 *
	 *         // You can ALSO stop propagation without the control object
	 *         // reference via the global reference:
	 *         ige.input.stopPropagation();
	 *     });
		 * @return {*}
		 */
		mouseMove: function (callback) {
			if (callback) {
				this._mouseMove = callback;
				this._mouseEventsActive = true;
				return this;
			}
			
			return this._mouseMove;
		},
		
		/**
		 * Gets / sets the callback that is fired when a mouse
		 * over event is triggered.
		 * @param {Function=} callback
		 * @example #Hook the mouse over event and stop it propagating further down the scenegraph
		 *     entity.mouseOver(function (event, control) {
	 *         // Mouse over with button
	 *         console.log('Mouse over button: ' + event.button);
	 *
	 *         // Stop the event propagating further down the scenegraph
	 *         control.stopPropagation();
	 *
	 *         // You can ALSO stop propagation without the control object
	 *         // reference via the global reference:
	 *         ige.input.stopPropagation();
	 *     });
		 * @return {*}
		 */
		mouseOver: function (callback) {
			if (callback) {
				this._mouseOver = callback;
				this._mouseEventsActive = true;
				return this;
			}
			
			return this._mouseOver;
		},
		
		/**
		 * Gets / sets the callback that is fired when a mouse
		 * out event is triggered.
		 * @param {Function=} callback
		 * @example #Hook the mouse out event and stop it propagating further down the scenegraph
		 *     entity.mouseOut(function (event, control) {
	 *         // Mouse out with button
	 *         console.log('Mouse out button: ' + event.button);
	 *
	 *         // Stop the event propagating further down the scenegraph
	 *         control.stopPropagation();
	 *
	 *         // You can ALSO stop propagation without the control object
	 *         // reference via the global reference:
	 *         ige.input.stopPropagation();
	 *     });
		 * @return {*}
		 */
		mouseOut: function (callback) {
			if (callback) {
				this._mouseOut = callback;
				this._mouseEventsActive = true;
				return this;
			}
			
			return this._mouseOut;
		},
		
		/**
		 * Gets / sets the callback that is fired when a mouse
		 * up event is triggered.
		 * @param {Function=} callback
		 * @example #Hook the mouse up event and stop it propagating further down the scenegraph
		 *     entity.mouseUp(function (event, control) {
	 *         // Mouse up with button
	 *         console.log('Mouse up button: ' + event.button);
	 *
	 *         // Stop the event propagating further down the scenegraph
	 *         control.stopPropagation();
	 *
	 *         // You can ALSO stop propagation without the control object
	 *         // reference via the global reference:
	 *         ige.input.stopPropagation();
	 *     });
		 * @return {*}
		 */
		mouseUp: function (callback) {
			if (callback) {
				this._mouseUp = callback;
				this._mouseEventsActive = true;
				return this;
			}
			
			return this._mouseUp;
		},
		
		/**
		 * Gets / sets the callback that is fired when a mouse
		 * down event is triggered.
		 * @param {Function=} callback
		 * @example #Hook the mouse down event and stop it propagating further down the scenegraph
		 *     entity.mouseDown(function (event, control) {
	 *         // Mouse down with button
	 *         console.log('Mouse down button: ' + event.button);
	 *
	 *         // Stop the event propagating further down the scenegraph
	 *         control.stopPropagation();
	 *
	 *         // You can ALSO stop propagation without the control object
	 *         // reference via the global reference:
	 *         ige.input.stopPropagation();
	 *     });
		 * @return {*}
		 */
		mouseDown: function (callback) {
			if (callback) {
				this._mouseDown = callback;
				this._mouseEventsActive = true;
				return this;
			}
			
			return this._mouseDown;
		},
		
		/**
		 * Gets / sets the callback that is fired when a mouse
		 * wheel event is triggered.
		 * @param {Function=} callback
		 * @example #Hook the mouse wheel event and stop it propagating further down the scenegraph
		 *     entity.mouseWheel(function (event, control) {
	 *         // Mouse wheel with button
	 *         console.log('Mouse wheel button: ' + event.button);
	 *         console.log('Mouse wheel delta: ' + event.wheelDelta);
	 *
	 *         // Stop the event propagating further down the scenegraph
	 *         control.stopPropagation();
	 *
	 *         // You can ALSO stop propagation without the control object
	 *         // reference via the global reference:
	 *         ige.input.stopPropagation();
	 *     });
		 * @return {*}
		 */
		mouseWheel: function (callback) {
			if (callback) {
				this._mouseWheel = callback;
				this._mouseEventsActive = true;
				return this;
			}
			
			return this._mouseWheel;
		},
		
		/**
		 * Removes the callback that is fired when a mouse
		 * move event is triggered.
		 */
		mouseMoveOff: function () {
			delete this._mouseMove;
			
			return this;
		},
		
		/**
		 * Removes the callback that is fired when a mouse
		 * over event is triggered.
		 */
		mouseOverOff: function () {
			delete this._mouseOver;
			
			return this;
		},
		
		/**
		 * Removes the callback that is fired when a mouse
		 * out event is triggered.
		 */
		mouseOutOff: function () {
			delete this._mouseOut;
			
			return this;
		},
		
		/**
		 * Removes the callback that is fired when a mouse
		 * up event is triggered.
		 */
		mouseUpOff: function () {
			delete this._mouseUp;
			
			return this;
		},
		
		/**
		 * Removes the callback that is fired when a mouse
		 * down event is triggered if the listener was registered
		 * via the mouseDown() method.
		 */
		mouseDownOff: function () {
			delete this._mouseDown;
			
			return this;
		},
		
		/**
		 * Removes the callback that is fired when a mouse
		 * wheel event is triggered.
		 */
		mouseWheelOff: function () {
			delete this._mouseWheel;
			
			return this;
		},
		
		triggerPolygon: function (poly) {
			if (poly !== undefined) {
				this._triggerPolygon = poly;
				return this;
			}
			
			return this._triggerPolygon;
		},
		
		/**
		 * Gets / sets the shape / polygon that the mouse events
		 * are triggered against. There are two options, 'aabb' and
		 * 'isoBounds'. The default is 'aabb'.
		 * @param val
		 * @returns {*}
		 * @deprecated
		 */
		mouseEventTrigger: function (val) {
			this.log('mouseEventTrigger is no longer in use. Please see triggerPolygon() instead.', 'warning');
			/*if (val !== undefined) {
			 // Set default value
			 this._mouseEventTrigger = 0;
			 
			 switch (val) {
			 case 'isoBounds':
			 this._mouseEventTrigger = 1;
			 break;
			 
			 case 'custom':
			 this._mouseEventTrigger = 2;
			 break;
			 
			 case 'aabb':
			 this._mouseEventTrigger = 0;
			 break;
			 }
			 return this;
			 }
			 
			 return this._mouseEventTrigger === 0 ? 'aabb' : 'isoBounds';*/
		},
		
		/**
		 * Handler method that determines which mouse-move event
		 * to fire, a mouse-over or a mouse-move.
		 * @private
		 */
		_handleMouseIn: function (event, evc, data) {
			// Check if the mouse move is a mouse over
			if (!this._mouseStateOver) {
				this._mouseStateOver = true;
				if (this._mouseOver) { this._mouseOver(event, evc, data); }
				
				/**
				 * Fires when the mouse moves over the entity.
				 * @event IgeEntity#mouseOver
				 * @param {Object} The DOM event object.
				 * @param {Object} The IGE event control object.
				 * @param {*} Any further event data.
				 */
				this.emit('mouseOver', [event, evc, data]);
			}
			
			if (this._mouseMove) { this._mouseMove(event, evc, data); }
			this.emit('mouseMove', [event, evc, data]);
		},
		
		/**
		 * Handler method that determines if a mouse-out event
		 * should be fired.
		 * @private
		 */
		_handleMouseOut: function (event, evc, data) {
			// The mouse went away from this entity so
			// set mouse-down to false, regardless of the situation
			this._mouseStateDown = false;
			
			// Check if the mouse move is a mouse out
			if (this._mouseStateOver) {
				this._mouseStateOver = false;
				if (this._mouseOut) { this._mouseOut(event, evc, data); }
				
				/**
				 * Fires when the mouse moves away from the entity.
				 * @event IgeEntity#mouseOut
				 * @param {Object} The DOM event object.
				 * @param {Object} The IGE event control object.
				 * @param {*} Any further event data.
				 */
				this.emit('mouseOut', [event, evc, data]);
			}
		},
		
		/**
		 * Handler method that determines if a mouse-wheel event
		 * should be fired.
		 * @private
		 */
		_handleMouseWheel: function (event, evc, data) {
			if (this._mouseWheel) { this._mouseWheel(event, evc, data); }
			
			/**
			 * Fires when the mouse wheel is moved over the entity.
			 * @event IgeEntity#mouseWheel
			 * @param {Object} The DOM event object.
			 * @param {Object} The IGE event control object.
			 * @param {*} Any further event data.
			 */
			this.emit('mouseWheel', [event, evc, data]);
		},
		
		/**
		 * Handler method that determines if a mouse-up event
		 * should be fired.
		 * @private
		 */
		_handleMouseUp: function (event, evc, data) {
			// Reset the mouse-down flag
			this._mouseStateDown = false;
			if (this._mouseUp) { this._mouseUp(event, evc, data); }
			
			/**
			 * Fires when a mouse up occurs on the entity.
			 * @event IgeEntity#mouseUp
			 * @param {Object} The DOM event object.
			 * @param {Object} The IGE event control object.
			 * @param {*} Any further event data.
			 */
			this.emit('mouseUp', [event, evc, data]);
		},
		
		/**
		 * Handler method that determines if a mouse-down event
		 * should be fired.
		 * @private
		 */
		_handleMouseDown: function (event, evc, data) {
			if (!this._mouseStateDown) {
				this._mouseStateDown = true;
				if (this._mouseDown) { this._mouseDown(event, evc, data); }
				
				/**
				 * Fires when a mouse down occurs on the entity.
				 * @event IgeEntity#mouseDown
				 * @param {Object} The DOM event object.
				 * @param {Object} The IGE event control object.
				 * @param {*} Any further event data.
				 */
				this.emit('mouseDown', [event, evc, data]);
			}
		},
		
		/**
		 * Checks mouse input types and fires the correct mouse event
		 * handler. This is an internal method that should never be
		 * called externally.
		 * @param {Object} evc The input component event control object.
		 * @param {Object} data Data passed by the input component into
		 * the new event.
		 * @private
		 */
		_mouseInTrigger: function (evc, data) {
			if (ige.input.mouseMove) {
				// There is a mouse move event
				this._handleMouseIn(ige.input.mouseMove, evc, data);
			}
			
			if (ige.input.mouseDown) {
				// There is a mouse down event
				this._handleMouseDown(ige.input.mouseDown, evc, data);
			}
			
			if (ige.input.mouseUp) {
				// There is a mouse up event
				this._handleMouseUp(ige.input.mouseUp, evc, data);
			}
			
			if (ige.input.mouseWheel) {
				// There is a mouse wheel event
				this._handleMouseWheel(ige.input.mouseWheel, evc, data);
			}
		},
		
		////////////////////////////////////////////////////////////////////////////////////////////////////////////////
		// TRANSFORM
		////////////////////////////////////////////////////////////////////////////////////////////////////////////////
		/**
		 * Enables tracing calls which inadvertently assign NaN values to
		 * transformation properties. When called on an entity this system
		 * will break with a debug line when a transform property is set
		 * to NaN allowing you to step back through the call stack and
		 * determine where the offending value originated.
		 * @returns {IgeEntity}
		 */
		debugTransforms: function () {
			ige.traceSet(this._translate, 'x', 1, function (val) {
				return isNaN(val);
			});
			
			ige.traceSet(this._translate, 'y', 1, function (val) {
				return isNaN(val);
			});
			
			ige.traceSet(this._translate, 'z', 1, function (val) {
				return isNaN(val);
			});
			
			ige.traceSet(this._rotate, 'x', 1, function (val) {
				return isNaN(val);
			});
			
			ige.traceSet(this._rotate, 'y', 1, function (val) {
				return isNaN(val);
			});
			
			ige.traceSet(this._rotate, 'z', 1, function (val) {
				return isNaN(val);
			});
			
			ige.traceSet(this._scale, 'x', 1, function (val) {
				return isNaN(val);
			});
			
			ige.traceSet(this._scale, 'y', 1, function (val) {
				return isNaN(val);
			});
			
			ige.traceSet(this._scale, 'z', 1, function (val) {
				return isNaN(val);
			});
			
			return this;
		},
		
		velocityTo: function (x, y, z) {
			if (x !== undefined && y!== undefined && z !== undefined) {
				this._velocity.x = x;
				this._velocity.y = y;
				this._velocity.z = z;
			} else {
				this.log('velocityTo() called with a missing or undefined x, y or z parameter!', 'error');
			}
			
			return this._entity || this;
		},
		
		velocityBy: function (x, y, z) {
			if (x !== undefined && y!== undefined && z !== undefined) {
				this._velocity.x += x;
				this._velocity.y += y;
				this._velocity.z += z;
			} else {
				this.log('velocityBy() called with a missing or undefined x, y or z parameter!', 'error');
			}
			
			return this._entity || this;
		},
		
		/**
		 * Translates the entity by adding the passed values to
		 * the current translation values.
		 * @param {Number} x The x co-ordinate.
		 * @param {Number} y The y co-ordinate.
		 * @param {Number} z The z co-ordinate.
		 * @example #Translate the entity by 10 along the x axis
		 *     entity.translateBy(10, 0, 0);
		 * @return {*}
		 */
		translateBy: function (x, y, z) {
			if (x !== undefined && y!== undefined && z !== undefined) {
				this._translate.x += x;
				this._translate.y += y;
				this._translate.z += z;
			} else {
				this.log('translateBy() called with a missing or undefined x, y or z parameter!', 'error');
			}
			
			return this._entity || this;
		},
		
		/**
		 * Translates the entity to the passed values.
		 * @param {Number} x The x co-ordinate.
		 * @param {Number} y The y co-ordinate.
		 * @param {Number} z The z co-ordinate.
		 * @example #Translate the entity to 10, 0, 0
		 *     entity.translateTo(10, 0, 0);
		 * @return {*}
		 */
		translateTo: function (x, y, z) {
			if (x !== undefined && y!== undefined && z !== undefined) {
				this._translate.x = x;
				this._translate.y = y;
				this._translate.z = z;
			} else {
				this.log('translateTo() called with a missing or undefined x, y or z parameter!', 'error');
			}
			
			return this._entity || this;
		},
		
		/**
		 * Translates the entity to the passed point.
		 * @param {IgePoint3d} point The point with co-ordinates.
		 * @example #Translate the entity to 10, 0, 0
		 *     var point = new IgePoint3d(10, 0, 0),
		 *         entity = new IgeEntity();
		 *
		 *     entity.translateToPoint(point);
		 * @return {*}
		 */
		translateToPoint: function (point) {
			if (point !== undefined) {
				this._translate.x = point.x;
				this._translate.y = point.y;
				this._translate.z = point.z;
			} else {
				this.log('translateToPoint() called with a missing or undefined point parameter!', 'error');
			}
			
			return this._entity || this;
		},
		
		/**
		 * Translates the object to the tile co-ordinates passed.
		 * @param {Number} x The x tile co-ordinate.
		 * @param {Number} y The y tile co-ordinate.
		 * @param {Number=} z The z tile co-ordinate.
		 * @example #Translate entity to tile
		 *     // Create a tile map
		 *     var tileMap = new IgeTileMap2d()
		 *         .tileWidth(40)
		 *         .tileHeight(40);
		 *
		 *     // Mount our entity to the tile map
		 *     entity.mount(tileMap);
		 *
		 *     // Translate the entity to the tile x:10, y:12
		 *     entity.translateToTile(10, 12, 0);
		 * @return {*} The object this method was called from to allow
		 * method chaining.
		 */
		translateToTile: function (x, y, z) {
			if (this._parent && this._parent._tileWidth !== undefined && this._parent._tileHeight !== undefined) {
				var finalZ;
				
				// Handle being passed a z co-ordinate
				if (z !== undefined) {
					finalZ = z * this._parent._tileWidth;
				} else {
					finalZ = this._translate.z;
				}
				
				this.translateTo((x * this._parent._tileWidth) + this._parent._tileWidth / 2, (y * this._parent._tileHeight) + this._parent._tileWidth / 2, finalZ);
			} else {
				this.log('Cannot translate to tile because the entity is not currently mounted to a tile map or the tile map has no tileWidth or tileHeight values.', 'warning');
			}
			
			return this;
		},
		
		/**
		 * Gets the translate accessor object.
		 * @example #Use the translate accessor object to alter the y co-ordinate of the entity to 10
		 *     entity.translate().y(10);
		 * @return {*}
		 */
		translate: function () {
			if (arguments.length) {
				this.log('You called translate with arguments, did you mean translateTo or translateBy instead of translate?', 'warning');
			}
			
			this.x = this._translateAccessorX;
			this.y = this._translateAccessorY;
			this.z = this._translateAccessorZ;
			
			return this._entity || this;
		},
		
		/**
		 * The translate accessor method for the x axis. This
		 * method is not called directly but is accessed through
		 * the accessor object obtained by calling entity.translate().
		 * @param {Number=} val The new value to apply to the co-ordinate.
		 * @return {*}
		 * @private
		 */
		_translateAccessorX: function (val) {
			if (val !== undefined) {
				this._translate.x = val;
				return this._entity || this;
			}
			
			return this._translate.x;
		},
		
		/**
		 * The translate accessor method for the y axis. This
		 * method is not called directly but is accessed through
		 * the accessor object obtained by calling entity.translate().
		 * @param {Number=} val The new value to apply to the co-ordinate.
		 * @return {*}
		 * @private
		 */
		_translateAccessorY: function (val) {
			if (val !== undefined) {
				this._translate.y = val;
				return this._entity || this;
			}
			
			return this._translate.y;
		},
		
		/**
		 * The translate accessor method for the z axis. This
		 * method is not called directly but is accessed through
		 * the accessor object obtained by calling entity.translate().
		 * @param {Number=} val The new value to apply to the co-ordinate.
		 * @return {*}
		 * @private
		 */
		_translateAccessorZ: function (val) {
			// TODO: Do we need to do anything to the matrix here for iso views?
			//this._localMatrix.translateTo(this._translate.x, this._translate.y);
			if (val !== undefined) {
				this._translate.z = val;
				return this._entity || this;
			}
			
			return this._translate.z;
		},
		
		/**
		 * Rotates the entity by adding the passed values to
		 * the current rotation values.
		 * @param {Number} x The x co-ordinate.
		 * @param {Number} y The y co-ordinate.
		 * @param {Number} z The z co-ordinate.
		 * @example #Rotate the entity by 10 degrees about the z axis
		 *     entity.rotateBy(0, 0, Math.radians(10));
		 * @return {*}
		 */
		rotateBy: function (x, y, z) {
			if (x !== undefined && y!== undefined && z !== undefined) {
				this._rotate.x += x;
				this._rotate.y += y;
				this._rotate.z += z;
			} else {
				this.log('rotateBy() called with a missing or undefined x, y or z parameter!', 'error');
			}
			
			return this._entity || this;
		},
		
		/**
		 * Rotates the entity to the passed values.
		 * @param {Number} x The x co-ordinate.
		 * @param {Number} y The y co-ordinate.
		 * @param {Number} z The z co-ordinate.
		 * @example #Rotate the entity to 10 degrees about the z axis
		 *     entity.rotateTo(0, 0, Math.radians(10));
		 * @return {*}
		 */
		rotateTo: function (x, y, z) {
			if (x !== undefined && y!== undefined && z !== undefined) {
				this._rotate.x = x;
				this._rotate.y = y;
				this._rotate.z = z;
			} else {
				this.log('rotateTo() called with a missing or undefined x, y or z parameter!', 'error');
			}
			
			return this._entity || this;
		},
		
		/**
		 * Gets the translate accessor object.
		 * @example #Use the rotate accessor object to rotate the entity about the z axis 10 degrees
		 *     entity.rotate().z(Math.radians(10));
		 * @return {*}
		 */
		rotate: function () {
			if (arguments.length) {
				this.log('You called rotate with arguments, did you mean rotateTo or rotateBy instead of rotate?', 'warning');
			}
			
			this.x = this._rotateAccessorX;
			this.y = this._rotateAccessorY;
			this.z = this._rotateAccessorZ;
			
			return this._entity || this;
		},
		
		/**
		 * The rotate accessor method for the x axis. This
		 * method is not called directly but is accessed through
		 * the accessor object obtained by calling entity.rotate().
		 * @param {Number=} val The new value to apply to the co-ordinate.
		 * @return {*}
		 * @private
		 */
		_rotateAccessorX: function (val) {
			if (val !== undefined) {
				this._rotate.x = val;
				return this._entity || this;
			}
			
			return this._rotate.x;
		},
		
		/**
		 * The rotate accessor method for the y axis. This
		 * method is not called directly but is accessed through
		 * the accessor object obtained by calling entity.rotate().
		 * @param {Number=} val The new value to apply to the co-ordinate.
		 * @return {*}
		 * @private
		 */
		_rotateAccessorY: function (val) {
			if (val !== undefined) {
				this._rotate.y = val;
				return this._entity || this;
			}
			
			return this._rotate.y;
		},
		
		/**
		 * The rotate accessor method for the z axis. This
		 * method is not called directly but is accessed through
		 * the accessor object obtained by calling entity.rotate().
		 * @param {Number=} val The new value to apply to the co-ordinate.
		 * @return {*}
		 * @private
		 */
		_rotateAccessorZ: function (val) {
			if (val !== undefined) {
				this._rotate.z = val;
				return this._entity || this;
			}
			
			return this._rotate.z;
		},
		
		/**
		 * Scales the entity by adding the passed values to
		 * the current scale values.
		 * @param {Number} x The x co-ordinate.
		 * @param {Number} y The y co-ordinate.
		 * @param {Number} z The z co-ordinate.
		 * @example #Scale the entity by 2 on the x axis
		 *     entity.scaleBy(2, 0, 0);
		 * @return {*}
		 */
		scaleBy: function (x, y, z) {
			if (x !== undefined && y!== undefined && z !== undefined) {
				this._scale.x += x;
				this._scale.y += y;
				this._scale.z += z;
			} else {
				this.log('scaleBy() called with a missing or undefined x, y or z parameter!', 'error');
			}
			
			return this._entity || this;
		},
		
		/**
		 * Scale the entity to the passed values.
		 * @param {Number} x The x co-ordinate.
		 * @param {Number} y The y co-ordinate.
		 * @param {Number} z The z co-ordinate.
		 * @example #Set the entity scale to 1 on all axes
		 *     entity.scaleTo(1, 1, 1);
		 * @return {*}
		 */
		scaleTo: function (x, y, z) {
			if (x !== undefined && y!== undefined && z !== undefined) {
				this._scale.x = x;
				this._scale.y = y;
				this._scale.z = z;
			} else {
				this.log('scaleTo() called with a missing or undefined x, y or z parameter!', 'error');
			}
			
			return this._entity || this;
		},
		
		/**
		 * Gets the scale accessor object.
		 * @example #Use the scale accessor object to set the scale of the entity on the x axis to 1
		 *     entity.scale().x(1);
		 * @return {*}
		 */
		scale: function () {
			if (arguments.length) {
				this.log('You called scale with arguments, did you mean scaleTo or scaleBy instead of scale?', 'warning');
			}
			
			this.x = this._scaleAccessorX;
			this.y = this._scaleAccessorY;
			this.z = this._scaleAccessorZ;
			
			return this._entity || this;
		},
		
		/**
		 * The scale accessor method for the x axis. This
		 * method is not called directly but is accessed through
		 * the accessor object obtained by calling entity.scale().
		 * @param {Number=} val The new value to apply to the co-ordinate.
		 * @return {*}
		 * @private
		 */
		_scaleAccessorX: function (val) {
			if (val !== undefined) {
				this._scale.x = val;
				return this._entity || this;
			}
			
			return this._scale.x;
		},
		
		/**
		 * The scale accessor method for the y axis. This
		 * method is not called directly but is accessed through
		 * the accessor object obtained by calling entity.scale().
		 * @param {Number=} val The new value to apply to the co-ordinate.
		 * @return {*}
		 * @private
		 */
		_scaleAccessorY: function (val) {
			if (val !== undefined) {
				this._scale.y = val;
				return this._entity || this;
			}
			
			return this._scale.y;
		},
		
		/**
		 * The scale accessor method for the z axis. This
		 * method is not called directly but is accessed through
		 * the accessor object obtained by calling entity.scale().
		 * @param {Number=} val The new value to apply to the co-ordinate.
		 * @return {*}
		 * @private
		 */
		_scaleAccessorZ: function (val) {
			if (val !== undefined) {
				this._scale.z = val;
				return this._entity || this;
			}
			
			return this._scale.z;
		},
		
		/**
		 * Sets the origin of the entity by adding the passed values to
		 * the current origin values.
		 * @param {Number} x The x co-ordinate.
		 * @param {Number} y The y co-ordinate.
		 * @param {Number} z The z co-ordinate.
		 * @example #Add 0.5 to the origin on the x axis
		 *     entity.originBy(0.5, 0, 0);
		 * @return {*}
		 */
		originBy: function (x, y, z) {
			if (x !== undefined && y!== undefined && z !== undefined) {
				this._origin.x += x;
				this._origin.y += y;
				this._origin.z += z;
			} else {
				this.log('originBy() called with a missing or undefined x, y or z parameter!', 'error');
			}
			
			return this._entity || this;
		},
		
		/**
		 * Set the origin of the entity to the passed values.
		 * @param {Number} x The x co-ordinate.
		 * @param {Number} y The y co-ordinate.
		 * @param {Number} z The z co-ordinate.
		 * @example #Set the entity origin to 0.5 on all axes
		 *     entity.originTo(0.5, 0.5, 0.5);
		 * @return {*}
		 */
		originTo: function (x, y, z) {
			if (x !== undefined && y!== undefined && z !== undefined) {
				this._origin.x = x;
				this._origin.y = y;
				this._origin.z = z;
			} else {
				this.log('originTo() called with a missing or undefined x, y or z parameter!', 'error');
			}
			
			return this._entity || this;
		},
		
		/**
		 * Gets the origin accessor object.
		 * @example #Use the origin accessor object to set the origin of the entity on the x axis to 1
		 *     entity.origin().x(1);
		 * @return {*}
		 */
		origin: function () {
			this.x = this._originAccessorX;
			this.y = this._originAccessorY;
			this.z = this._originAccessorZ;
			
			return this._entity || this;
		},
		
		/**
		 * The origin accessor method for the x axis. This
		 * method is not called directly but is accessed through
		 * the accessor object obtained by calling entity.origin().
		 * @param {Number=} val The new value to apply to the co-ordinate.
		 * @return {*}
		 * @private
		 */
		_originAccessorX: function (val) {
			if (val !== undefined) {
				this._origin.x = val;
				return this._entity || this;
			}
			
			return this._origin.x;
		},
		
		/**
		 * The origin accessor method for the y axis. This
		 * method is not called directly but is accessed through
		 * the accessor object obtained by calling entity.origin().
		 * @param {Number=} val The new value to apply to the co-ordinate.
		 * @return {*}
		 * @private
		 */
		_originAccessorY: function (val) {
			if (val !== undefined) {
				this._origin.y = val;
				return this._entity || this;
			}
			
			return this._origin.y;
		},
		
		/**
		 * The origin accessor method for the z axis. This
		 * method is not called directly but is accessed through
		 * the accessor object obtained by calling entity.origin().
		 * @param {Number=} val The new value to apply to the co-ordinate.
		 * @return {*}
		 * @private
		 */
		_originAccessorZ: function (val) {
			if (val !== undefined) {
				this._origin.z = val;
				return this._entity || this;
			}
			
			return this._origin.z;
		},
		
		_rotatePoint: function (point, radians, origin) {
			var cosAngle = Math.cos(radians),
				sinAngle = Math.sin(radians);
			
			return {
				x: origin.x + (point.x - origin.x) * cosAngle + (point.y - origin.y) * sinAngle,
				y: origin.y - (point.x - origin.x) * sinAngle + (point.y - origin.y) * cosAngle
			};
		},
		
		/**
		 * Checks the current transform values against the previous ones. If
		 * any value is different, the appropriate method is called which will
		 * update the transformation matrix accordingly.
		 */
		updateTransform: function () {
			this._localMatrix.identity();
			
			if (this._mode === 0) {
				// 2d translation
				this._localMatrix.multiply(this._localMatrix._newTranslate(this._translate.x, this._translate.y));
			}
			
			if (this._mode === 1) {
				// iso translation
				var isoPoint = this._translateIso = new IgePoint3d(
					this._translate.x,
					this._translate.y,
					this._translate.z + this._bounds3d.z / 2
				).toIso();
				
				if (this._parent && this._parent._bounds3d.z) {
					// This adjusts the child entity so that 0, 0, 0 inside the
					// parent is the center of the base of the parent
					isoPoint.y += this._parent._bounds3d.z / 1.6;
				}
				
				this._localMatrix.multiply(this._localMatrix._newTranslate(isoPoint.x, isoPoint.y));
			}
			
			this._localMatrix.rotateBy(this._rotate.z);
			this._localMatrix.scaleBy(this._scale.x, this._scale.y);
			
			// Adjust local matrix for origin values if not at center
			if (this._origin.x !== 0.5 || this._origin.y !== 0.5) {
				this._localMatrix.translateBy(
					(this._bounds2d.x * (0.5 - this._origin.x)),
					(this._bounds2d.y * (0.5 - this._origin.y))
				);
			}
			
			// TODO: If the parent and local transforms are unchanged, we should used cached values
			if (this._parent) {
				this._worldMatrix.copy(this._parent._worldMatrix);
				this._worldMatrix.multiply(this._localMatrix);
			} else {
				this._worldMatrix.copy(this._localMatrix);
			}
			
			// Check if the world matrix has changed and if so, set a few flags
			// to allow other methods to know that a matrix change has occurred
			if (!this._worldMatrix.compare(this._oldWorldMatrix)) {
				this._oldWorldMatrix.copy(this._worldMatrix);
				this._transformChanged = true;
				this._aabbDirty = true;
				this._bounds3dPolygonDirty = true;
			} else {
				this._transformChanged = false;
			}
			
			// Check if the geometry has changed and if so, update the aabb dirty
			if (!this._oldBounds2d.compare(this._bounds2d)) {
				this._aabbDirty = true;
				
				// Record the new geometry to the oldGeometry data
				this._oldBounds2d.copy(this._bounds2d);
			}
			
			if (!this._oldBounds3d.compare(this._bounds3d)) {
				this._bounds3dPolygonDirty = true;
				
				// Record the new geometry to the oldGeometry data
				this._oldBounds3d.copy(this._bounds3d);
			}
			
			return this;
		},
		
		/**
		 * Gets / sets the disable interpolation flag. If set to true then
		 * stream data being received by the client will not be interpolated
		 * and will be instantly assigned instead. Useful if your entity's
		 * transformations should not be interpolated over time.
		 * @param val
		 * @returns {*}
		 */
		disableInterpolation: function (val) {
			if (val !== undefined) {
				this._disableInterpolation = val;
				return this;
			}
			
			return this._disableInterpolation;
		},
		
		////////////////////////////////////////////////////////////////////////////////////////////////////////////////
		// STREAM
		////////////////////////////////////////////////////////////////////////////////////////////////////////////////
		/**
		 * Gets / sets the array of sections that this entity will
		 * encode into its stream data.
		 * @param {Array=} sectionArray An array of strings.
		 * @example #Define the sections this entity will use in the network stream. Use the default "transform" section as well as a "custom1" section
		 *     entity.streamSections(['transform', 'custom1']);
		 * @return {*} "this" when arguments are passed to allow method
		 * chaining or the current value if no arguments are specified.
		 */
		streamSections: function (sectionArray) {
			if (sectionArray !== undefined) {
				this._streamSections = sectionArray;
				return this;
			}
			
			return this._streamSections;
		},
		
		/**
		 * Pushes a section into the stream sections array that this
		 * entity will encode into its stream data.
		 * @param {String} section The section to push into the sections array.
		 * @example #Push a section to the sections array this entity will use in the network stream.
		 *     entity.streamSectionsPush('transform');
		 * @return {*} "this" when arguments are passed to allow method
		 * chaining or the current value if no arguments are specified.
		 */
		streamSectionsPush: function (sectionName) {
			this._streamSections = this._streamSections || [];
			this._streamSections.push(sectionName);
			
			return this;
		},
		
		/**
		 * Removes a section into the existing streamed sections array.
		 * @param {String} sectionName The section name to remove.
		 */
		streamSectionsPull: function (sectionName) {
			if (this._streamSections) {
				this._streamSections.pull(sectionName);
			}
			
			return this;
		},
		
		/**
		 * Gets / sets a streaming property on this entity. If set, the
		 * property's new value is streamed to clients on the next packet.
		 *
		 * @param {String} propName The name of the property to get / set.
		 * @param {*=} propVal Optional. If provided, the property is set
		 * to this value.
		 * @return {*} "this" when a propVal argument is passed to allow method
		 * chaining or the current value if no propVal argument is specified.
		 */
		streamProperty: function (propName, propVal) {
			this._streamProperty = this._streamProperty || {};
			//this._streamPropertyChange = this._streamPropertyChange || {};
			
			if (propName !== undefined) {
				if (propVal !== undefined) {
					//this._streamPropertyChange[propName] = this._streamProperty[propName] !== propVal;
					this._streamProperty[propName] = propVal;
					
					return this;
				}
				
				return this._streamProperty[propName];
			}
			
			return undefined;
		},
		
		/**
		 * Gets / sets the data for the specified data section id. This method
		 * is usually not called directly and instead is part of the network
		 * stream system. General use case is to write your own custom streamSectionData
		 * method in a class that extends IgeEntity so that you can control the
		 * data that the entity will send and receive over the network stream.
		 * @param {String} sectionId A string identifying the section to
		 * handle data get / set for.
		 * @param {*=} data If present, this is the data that has been sent
		 * from the server to the client for this entity.
		 * @param {Boolean=} bypassTimeStream If true, will assign transform
		 * directly to entity instead of adding the values to the time stream.
		 * @return {*} "this" when a data argument is passed to allow method
		 * chaining or the current value if no data argument is specified.
		 */
		streamSectionData: function (sectionId, data, bypassTimeStream) {
			switch (sectionId) {
				case 'transform':
					if (data) {
						// We have received updated data
						var dataArr = data.split(',');
						
						if (!this._disableInterpolation && !bypassTimeStream && !this._streamJustCreated) {
							// Translate
							if (dataArr[0]) { dataArr[0] = parseFloat(dataArr[0]); }
							if (dataArr[1]) { dataArr[1] = parseFloat(dataArr[1]); }
							if (dataArr[2]) { dataArr[2] = parseFloat(dataArr[2]); }
							
							// Scale
							if (dataArr[3]) { dataArr[3] = parseFloat(dataArr[3]); }
							if (dataArr[4]) { dataArr[4] = parseFloat(dataArr[4]); }
							if (dataArr[5]) { dataArr[5] = parseFloat(dataArr[5]); }
							
							// Rotate
							if (dataArr[6]) { dataArr[6] = parseFloat(dataArr[6]); }
							if (dataArr[7]) { dataArr[7] = parseFloat(dataArr[7]); }
							if (dataArr[8]) { dataArr[8] = parseFloat(dataArr[8]); }
							
							// Add it to the time stream
							this._timeStream.push([ige.network.stream._streamDataTime + ige.network._latency, dataArr]);
							
							// Check stream length, don't allow higher than 10 items
							if (this._timeStream.length > 10) {
								// Remove the first item
								this._timeStream.shift();
							}
						} else {
							// Assign all the transform values immediately
							if (dataArr[0]) { this._translate.x = parseFloat(dataArr[0]); }
							if (dataArr[1]) { this._translate.y = parseFloat(dataArr[1]); }
							if (dataArr[2]) { this._translate.z = parseFloat(dataArr[2]); }
							
							// Scale
							if (dataArr[3]) { this._scale.x = parseFloat(dataArr[3]); }
							if (dataArr[4]) { this._scale.y = parseFloat(dataArr[4]); }
							if (dataArr[5]) { this._scale.z = parseFloat(dataArr[5]); }
							
							// Rotate
							if (dataArr[6]) { this._rotate.x = parseFloat(dataArr[6]); }
							if (dataArr[7]) { this._rotate.y = parseFloat(dataArr[7]); }
							if (dataArr[8]) { this._rotate.z = parseFloat(dataArr[8]); }
							
							// If we are using composite caching ensure we update the cache
							if (this._compositeCache) {
								this.cacheDirty(true);
							}
						}
					} else {
						// We should return stringified data
						return this._translate.toString(this._streamFloatPrecision) + ',' + // translate
							this._scale.toString(this._streamFloatPrecision) + ',' + // scale
							this._rotate.toString(this._streamFloatPrecision) + ','; // rotate
					}
					break;
				
				case 'depth':
					if (data !== undefined) {
						if (ige.isClient) {
							this.depth(parseInt(data));
						}
					} else {
						return String(this.depth());
					}
					break;
				
				case 'layer':
					if (data !== undefined) {
						if (ige.isClient) {
							this.layer(parseInt(data));
						}
					} else {
						return String(this.layer());
					}
					break;
				
				case 'bounds2d':
					if (data !== undefined) {
						if (ige.isClient) {
							var geom = data.split(',');
							this.bounds2d(parseFloat(geom[0]), parseFloat(geom[1]));
						}
					} else {
						return String(this._bounds2d.x + ',' + this._bounds2d.y);
					}
					break;
				
				case 'bounds3d':
					if (data !== undefined) {
						if (ige.isClient) {
							var geom = data.split(',');
							this.bounds3d(parseFloat(geom[0]), parseFloat(geom[1]), parseFloat(geom[2]));
						}
					} else {
						return String(this._bounds3d.x + ',' + this._bounds3d.y + ',' + this._bounds3d.z);
					}
					break;
				
				case 'hidden':
					if (data !== undefined) {
						if (ige.isClient) {
							if (data == 'true') {
								this.hide();
							} else {
								this.show();
							}
						}
					} else {
						return String(this.isHidden());
					}
					break;
				
				case 'mount':
					if (data !== undefined) {
						if (ige.isClient) {
							if (data) {
								var newParent = ige.$(data);
								
								if (newParent) {
									this.mount(newParent);
								}
							} else {
								// Unmount
								this.unMount();
							}
						}
					} else {
						var parent = this.parent();
						
						if (parent) {
							return this.parent().id();
						} else {
							return '';
						}
					}
					break;
				
				case 'origin':
					if (data !== undefined) {
						if (ige.isClient) {
							var geom = data.split(',');
							this.origin(parseFloat(geom[0]), parseFloat(geom[1]), parseFloat(geom[2]));
						}
					} else {
						return String(this._origin.x + ',' + this._origin.y + ',' + this._origin.z);
					}
					break;
				
				case 'props':
					var newData,
						changed,
						i;
					
					if (data !== undefined) {
						if (ige.isClient) {
							var props = JSON.parse(data);
							
							// Update properties that have been sent through
							for (i in props) {
								changed = false;
								if (props.hasOwnProperty(i)) {
									if (this._streamProperty[i] != props[i]) {
										changed = true;
									}
									this._streamProperty[i] = props[i];
									
									this.emit('streamPropChange', [i, props[i]]);
								}
							}
						}
					} else {
						newData = {};
						
						for (i in this._streamProperty) {
							if (this._streamProperty.hasOwnProperty(i)) {
								//if (this._streamPropertyChange[i]) {
								newData[i] = this._streamProperty[i];
								//this._streamPropertyChange[i] = false;
								//}
							}
						}
						
						return JSON.stringify(newData);
					}
					break;
			}
		},
		
		/* CEXCLUDE */
		/**
		 * Gets / sets the stream mode that the stream system will use when
		 * handling pushing data updates to connected clients.
		 * @param {Number=} val A value representing the stream mode.
		 * @example #Set the entity to disable streaming
		 *     entity.streamMode(0);
		 * @example #Set the entity to automatic streaming
		 *     entity.streamMode(1);
		 * @example #Set the entity to manual (advanced mode) streaming
		 *     entity.streamMode(2);
		 * @return {*} "this" when arguments are passed to allow method
		 * chaining or the current value if no arguments are specified.
		 */
		streamMode: function (val) {
			if (val !== undefined) {
				if (ige.isServer) {
					this._streamMode = val;
				}
				return this;
			}
			
			return this._streamMode;
		},
		
		/**
		 * Gets / sets the stream control callback function that will be called
		 * each time the entity tick method is called and stream-able data is
		 * updated.
		 * @param {Function=} method The stream control method.
		 * @example #Set the entity's stream control method to control when this entity is streamed and when it is not
		 *     entity.streamControl(function (clientId) {
	 *         // Let's use an example where we only want this entity to stream
	 *         // to one particular client with the id 4039589434
	 *         if (clientId === '4039589434') {
	 *             // Returning true tells the network stream to send data
	 *             // about this entity to the client
	 *             return true;
	 *         } else {
	 *             // Returning false tells the network stream NOT to send
	 *             // data about this entity to the client
	 *             return false;
	 *         }
	 *     });
		 *
		 * Further reading: [Controlling Streaming](http://www.isogenicengine.com/documentation/isogenic-game-engine/versions/1-1-0/manual/networking-multiplayer/realtime-network-streaming/stream-modes-and-controlling-streaming/)
		 * @return {*} "this" when arguments are passed to allow method
		 * chaining or the current value if no arguments are specified.
		 */
		streamControl: function (method) {
			if (method !== undefined) {
				this._streamControl = method;
				return this;
			}
			
			return this._streamControl;
		},
		
		/**
		 * Gets / sets the stream sync interval. This value
		 * is in milliseconds and cannot be lower than 16. It will
		 * determine how often data from this entity is added to the
		 * stream queue.
		 * @param {Number=} val Number of milliseconds between adding
		 * stream data for this entity to the stream queue.
		 * @param {String=} sectionId Optional id of the stream data
		 * section you want to set the interval for. If omitted the
		 * interval will be applied to all sections.
		 * @example #Set the entity's stream update (sync) interval to 1 second because this entity's data is not highly important to the simulation so save some bandwidth!
		 *     entity.streamSyncInterval(1000);
		 * @example #Set the entity's stream update (sync) interval to 16 milliseconds because this entity's data is very important to the simulation so send as often as possible!
		 *     entity.streamSyncInterval(16);
		 * @return {*} "this" when arguments are passed to allow method
		 * chaining or the current value if no arguments are specified.
		 */
		streamSyncInterval: function (val, sectionId) {
			if (val !== undefined) {
				if (!sectionId) {
					if (val < 16) {
						delete this._streamSyncInterval;
					} else {
						this._streamSyncDelta = 0;
						this._streamSyncInterval = val;
					}
				} else {
					this._streamSyncSectionInterval = this._streamSyncSectionInterval || {};
					this._streamSyncSectionDelta = this._streamSyncSectionDelta || {};
					if (val < 16) {
						delete this._streamSyncSectionInterval[sectionId];
					} else {
						this._streamSyncSectionDelta[sectionId] = 0;
						this._streamSyncSectionInterval[sectionId] = val;
					}
				}
				return this;
			}
			
			return this._streamSyncInterval;
		},
		
		/**
		 * Gets / sets the precision by which floating-point values will
		 * be encoded and sent when packaged into stream data.
		 * @param {Number=} val The number of decimal places to preserve.
		 * @example #Set the float precision to 2
		 *     // This will mean that any data using floating-point values
		 *     // that gets sent across the network stream will be rounded
		 *     // to 2 decimal places. This helps save bandwidth by not
		 *     // having to send the entire number since precision above
		 *     // 2 decimal places is usually not that important to the
		 *     // simulation.
		 *     entity.streamFloatPrecision(2);
		 * @return {*} "this" when arguments are passed to allow method
		 * chaining or the current value if no arguments are specified.
		 */
		streamFloatPrecision: function (val) {
			if (val !== undefined) {
				this._streamFloatPrecision = val;
				
				var i, floatRemove = '\\.';
				
				// Update the floatRemove regular expression pattern
				for (i = 0; i < this._streamFloatPrecision; i++) {
					floatRemove += '0';
				}
				
				// Add the trailing comma
				floatRemove += ',';
				
				// Create the new regexp
				this._floatRemoveRegExp = new RegExp(floatRemove, 'g');
				
				return this;
			}
			
			return this._streamFloatPrecision;
		},
		
		/**
		 * Queues stream data for this entity to be sent to the
		 * specified client id or array of client ids.
		 * @param {Array} clientId An array of string IDs of each
		 * client to send the stream data to.
		 * @return {IgeEntity} "this".
		 */
		streamSync: function (clientId) {
			if (this._streamMode === 1) {
				// Check if we have a stream sync interval
				if (this._streamSyncInterval) {
					this._streamSyncDelta += ige._tickDelta;
					
					if (this._streamSyncDelta < this._streamSyncInterval) {
						// The stream sync interval is still higher than
						// the stream sync delta so exit without calling the
						// stream sync method
						return this;
					} else {
						// We've reached the delta we want so zero it now
						// ready for the next loop
						this._streamSyncDelta = 0;
					}
				}
				
				// Grab an array of connected clients from the network
				// system
				var recipientArr = [],
					clientArr = ige.network.clients(this._streamRoomId),
					i;
				
				for (i in clientArr) {
					if (clientArr.hasOwnProperty(i)) {
						// Check for a stream control method
						if (this._streamControl) {
							// Call the callback method and if it returns true,
							// send the stream data to this client
							if (this._streamControl.apply(this, [i, this._streamRoomId])) {
								recipientArr.push(i);
							}
						} else {
							// No control method so process for this client
							recipientArr.push(i);
						}
					}
				}
				
				this._streamSync(recipientArr);
				return this;
			}
			
			if (this._streamMode === 2) {
				// Stream mode is advanced
				this._streamSync(clientId, this._streamRoomId);
				
				return this;
			}
			
			return this;
		},
		
		/**
		 * Override this method if your entity should send data through to
		 * the client when it is being created on the client for the first
		 * time through the network stream. The data will be provided as the
		 * first argument in the constructor call to the entity class so
		 * you should expect to receive it as per this example:
		 * @example #Using and Receiving Stream Create Data
		 *     var MyNewClass = IgeEntity.extend({
	 *         classId: 'MyNewClass',
	 *
	 *         // Define the init with the parameter to receive the
	 *         // data you return in the streamCreateData() method
	 *         init: function (myCreateData) {
	 *             this._myData = myCreateData;
	 *         },
	 *
	 *         streamCreateData: function () {
	 *             return this._myData;
	 *         }
	 *     });
		 *
		 * Valid return values must not include circular references!
		 */
		streamCreateData: function () {},
		
		/**
		 * Gets / sets the stream emit created flag. If set to true this entity
		 * emit a "streamCreated" event when it is created by the stream, but
		 * after the id and initial transform are set.
		 * @param val
		 * @returns {*}
		 */
		streamEmitCreated: function (val) {
			if (val !== undefined) {
				this._streamEmitCreated = val;
				return this;
			}
			
			return this._streamEmitCreated;
		},
		
		/**
		 * Asks the stream system to queue the stream data to the specified
		 * client id or array of ids.
		 * @param {Array} recipientArr The array of ids of the client(s) to
		 * queue stream data for. The stream data being queued
		 * is returned by a call to this._streamData().
		 * @param {String} streamRoomId The id of the room the entity belongs
		 * in (can be undefined or null if no room assigned).
		 * @private
		 */
		_streamSync: function (recipientArr, streamRoomId) {
			var arrCount = recipientArr.length,
				arrIndex,
				clientId,
				stream = ige.network.stream,
				thisId = this.id(),
				filteredArr = [],
				createResult = true; // We set this to true by default
			
			// Loop the recipient array
			for (arrIndex = 0; arrIndex < arrCount; arrIndex++) {
				clientId = recipientArr[arrIndex];
				
				// Check if the client has already received a create
				// command for this entity
				stream._streamClientCreated[thisId] = stream._streamClientCreated[thisId] || {};
				if (!stream._streamClientCreated[thisId][clientId]) {
					createResult = this.streamCreate(clientId);
				}
				
				// Make sure that if we had to create the entity for
				// this client that the create worked before bothering
				// to waste bandwidth on stream updates
				if (createResult) {
					// Get the stream data
					var data = this._streamData();
					
					// Is the data different from the last data we sent
					// this client?
					stream._streamClientData[thisId] = stream._streamClientData[thisId] || {};
					
					if (stream._streamClientData[thisId][clientId] != data) {
						filteredArr.push(clientId);
						
						// Store the new data for later comparison
						stream._streamClientData[thisId][clientId] = data;
					}
				}
			}
			
			if (filteredArr.length) {
				stream.queue(thisId, data, filteredArr);
			}
		},
		
		/**
		 * Forces the stream to push this entity's full stream data on the
		 * next stream sync regardless of what clients have received in the
		 * past. This should only be used when required rather than every
		 * tick as it will reduce the overall efficiency of the stream if
		 * used every tick.
		 * @returns {*}
		 */
		streamForceUpdate: function () {
			if (ige.isServer) {
				var thisId = this.id();
				
				// Invalidate the stream client data lookup to ensure
				// the latest data will be pushed on the next stream sync
				if (ige.network && ige.network.stream && ige.network.stream._streamClientData && ige.network.stream._streamClientData[thisId]) {
					ige.network.stream._streamClientData[thisId] = {};
				}
			}
			
			return this;
		},
		
		/**
		 * Issues a create entity command to the passed client id
		 * or array of ids. If no id is passed it will issue the
		 * command to all connected clients. If using streamMode(1)
		 * this method is called automatically.
		 * @param {*} clientId The id or array of ids to send
		 * the command to.
		 * @example #Send a create command for this entity to all clients
		 *     entity.streamCreate();
		 * @example #Send a create command for this entity to an array of client ids
		 *     entity.streamCreate(['43245325', '326755464', '436743453']);
		 * @example #Send a create command for this entity to a single client id
		 *     entity.streamCreate('43245325');
		 * @return {Boolean}
		 */
		streamCreate: function (clientId) {
			if (this._parent) {
				var thisId = this.id(),
					arr,
					i;
				
				// Send the client an entity create command first
				ige.network.send('_igeStreamCreate', [
					this.classId(),
					thisId,
					this._parent.id(),
					this.streamSectionData('transform'),
					this.streamCreateData()
				], clientId);
				
				ige.network.stream._streamClientCreated[thisId] = ige.network.stream._streamClientCreated[thisId] || {};
				
				if (clientId) {
					// Mark the client as having received a create
					// command for this entity
					ige.network.stream._streamClientCreated[thisId][clientId] = true;
				} else {
					// Mark all clients as having received this create
					arr = ige.network.clients();
					
					for (i in arr) {
						if (arr.hasOwnProperty(i)) {
							ige.network.stream._streamClientCreated[thisId][i] = true;
						}
					}
				}
				
				return true;
			}
			
			return false;
		},
		
		/**
		 * Issues a destroy entity command to the passed client id
		 * or array of ids. If no id is passed it will issue the
		 * command to all connected clients. If using streamMode(1)
		 * this method is called automatically.
		 * @param {*} clientId The id or array of ids to send
		 * the command to.
		 * @example #Send a destroy command for this entity to all clients
		 *     entity.streamDestroy();
		 * @example #Send a destroy command for this entity to an array of client ids
		 *     entity.streamDestroy(['43245325', '326755464', '436743453']);
		 * @example #Send a destroy command for this entity to a single client id
		 *     entity.streamDestroy('43245325');
		 * @return {Boolean}
		 */
		streamDestroy: function (clientId) {
			var thisId = this.id(),
				arr,
				i;
			
			// Send clients the stream destroy command for this entity
			ige.network.send('_igeStreamDestroy', [ige._currentTime, thisId], clientId);
			
			ige.network.stream._streamClientCreated[thisId] = ige.network.stream._streamClientCreated[thisId] || {};
			ige.network.stream._streamClientData[thisId] = ige.network.stream._streamClientData[thisId] || {};
			
			if (clientId) {
				// Mark the client as having received a destroy
				// command for this entity
				ige.network.stream._streamClientCreated[thisId][clientId] = false;
				ige.network.stream._streamClientData[thisId][clientId] = undefined;
			} else {
				// Mark all clients as having received this destroy
				arr = ige.network.clients();
				
				for (i in arr) {
					if (arr.hasOwnProperty(i)) {
						ige.network.stream._streamClientCreated[thisId][i] = false;
						ige.network.stream._streamClientData[thisId][i] = undefined;
					}
				}
			}
			
			return true;
		},
		
		/**
		 * Generates and returns the current stream data for this entity. The
		 * data will usually include only properties that have changed since
		 * the last time the stream data was generated. The returned data is
		 * a string that has been compressed in various ways to reduce network
		 * overhead during transmission.
		 * @return {String} The string representation of the stream data for
		 * this entity.
		 * @private
		 */
		_streamData: function () {
			// Check if we already have a cached version of the streamData
			if (this._streamDataCache) {
				return this._streamDataCache;
			} else {
				// Let's generate our stream data
				var streamData = '',
					sectionDataString = '',
					sectionArr = this._streamSections,
					sectionCount = sectionArr.length,
					sectionData,
					sectionIndex,
					sectionId;
				
				// Add the entity id
				streamData += this.id();
				
				// Only send further data if the entity is still "alive"
				if (this._alive) {
					// Now loop the data sections array and compile the rest of the
					// data string from the data section return data
					for (sectionIndex = 0; sectionIndex < sectionCount; sectionIndex++) {
						sectionData = '';
						sectionId = sectionArr[sectionIndex];
						
						// Stream section sync intervals allow individual stream sections
						// to be streamed at different (usually longer) intervals than other
						// sections so you could for instance reduce the number of updates
						// a particular section sends out in a second because the data is
						// not that important compared to updated transformation data
						if (this._streamSyncSectionInterval && this._streamSyncSectionInterval[sectionId]) {
							// Check if the section interval has been reached
							this._streamSyncSectionDelta[sectionId] += ige._tickDelta;
							
							if (this._streamSyncSectionDelta[sectionId] >= this._streamSyncSectionInterval[sectionId]) {
								// Get the section data for this section id
								sectionData = this.streamSectionData(sectionId);
								
								// Reset the section delta
								this._streamSyncSectionDelta[sectionId] = 0;
							}
						} else {
							// Get the section data for this section id
							sectionData = this.streamSectionData(sectionId);
						}
						
						// Add the section start designator character. We do this
						// regardless of if there is actually any section data because
						// we want to be able to identify sections in a serial fashion
						// on receipt of the data string on the client
						sectionDataString += ige.network.stream._sectionDesignator;
						
						// Check if we were returned any data
						if (sectionData !== undefined) {
							// Add the data to the section string
							sectionDataString += sectionData;
						}
					}
					
					// Add any custom data to the stream string at this point
					if (sectionDataString) {
						streamData += sectionDataString;
					}
					
					// Remove any .00 from the string since we don't need that data
					// TODO: What about if a property is a string with something.00 and it should be kept?
					streamData = streamData.replace(this._floatRemoveRegExp, ',');
				}
				
				// Store the data in cache in case we are asked for it again this tick
				// the update() method of the IgeEntity class clears this every tick
				this._streamDataCache = streamData;
				
				return streamData;
			}
		},
		/* CEXCLUDE */
		
		////////////////////////////////////////////////////////////////////////////////////////////////////////////////
		// INTERPOLATOR
		////////////////////////////////////////////////////////////////////////////////////////////////////////////////
		/**
		 * Calculates the current value based on the time along the
		 * value range.
		 * @param {Number} startValue The value that the interpolation started from.
		 * @param {Number} endValue The target value to be interpolated to.
		 * @param {Number} startTime The time the interpolation started.
		 * @param {Number} currentTime The current time.
		 * @param {Number} endTime The time the interpolation will end.
		 * @return {Number} The interpolated value.
		 */
		interpolateValue: function (startValue, endValue, startTime, currentTime, endTime) {
			var totalValue = endValue - startValue,
				dataDelta = endTime - startTime,
				offsetDelta = currentTime - startTime,
				deltaTime = offsetDelta / dataDelta;
			
			// Clamp the current time from 0 to 1
			if (deltaTime < 0) { deltaTime = 0; } else if (deltaTime > 1) { deltaTime = 1; }
			
			return (totalValue * deltaTime) + startValue;
		},
		
		/**
		 * Processes the time stream for the entity.
		 * @param {Number} renderTime The time that the time stream is
		 * targeting to render the entity at.
		 * @param {Number} maxLerp The maximum lerp before the value
		 * is assigned directly instead of being interpolated.
		 * @private
		 */
		_processInterpolate: function (renderTime, maxLerp) {
			// Set the maximum lerp to 200 if none is present
			if (!maxLerp) { maxLerp = 200; }
			
			var maxLerpSquared = maxLerp * maxLerp,
				previousData,
				nextData,
				timeStream = this._timeStream,
				dataDelta,
				offsetDelta,
				currentTime,
				previousTransform,
				nextTransform,
				currentTransform = [],
				i = 1;
			
			// Find the point in the time stream that is
			// closest to the render time and assign the
			// previous and next data points
			while (timeStream[i]) {
				if (timeStream[i][0] > renderTime) {
					// We have previous and next data points from the
					// time stream so store them
					previousData = timeStream[i - 1];
					nextData = timeStream[i];
					break;
				}
				i++;
			}
			
			// Check if we have some data to use
			if (!nextData && !previousData) {
				// No in-time data was found, check for lagging data
				if (timeStream.length > 2) {
					if (timeStream[timeStream.length - 1][0] < renderTime) {
						// Lagging data is available, use that
						previousData = timeStream[timeStream.length - 2];
						nextData = timeStream[timeStream.length - 1];
						timeStream.shift();
						
						/**
						 * Fires when the entity interpolates against old data, usually
						 * the result of slow processing on the client or too much data
						 * being sent from the server.
						 * @event IgeEntity#interpolationLag
						 */
						this.emit('interpolationLag');
					}
				}
			} else {
				// We have some new data so clear the old data
				timeStream.splice(0, i - 1);
			}
			
			// If we have data to use
			if (nextData && previousData) {
				// Check if the previous data has a timestamp and if not,
				// use the next data's timestamp
				if (isNaN(previousData[0])) { previousData[0] = nextData[0]; }
				
				// Store the data so outside systems can access them
				this._timeStreamPreviousData = previousData;
				this._timeStreamNextData = nextData;
				
				// Calculate the delta times
				dataDelta = nextData[0] - previousData[0];
				offsetDelta = renderTime - previousData[0];
				
				this._timeStreamDataDelta = Math.floor(dataDelta);
				this._timeStreamOffsetDelta = Math.floor(offsetDelta);
				
				// Calculate the current time between the two data points
				currentTime = offsetDelta / dataDelta;
				
				this._timeStreamCurrentInterpolateTime = currentTime;
				
				// Clamp the current time from 0 to 1
				//if (currentTime < 0) { currentTime = 0.0; } else if (currentTime > 1) { currentTime = 1.0; }
				
				// Set variables up to store the previous and next data
				previousTransform = previousData[1];
				nextTransform = nextData[1];
				
				// Translate
				currentTransform[0] = this.interpolateValue(previousTransform[0], nextTransform[0], previousData[0], renderTime, nextData[0]);
				currentTransform[1] = this.interpolateValue(previousTransform[1], nextTransform[1], previousData[0], renderTime, nextData[0]);
				currentTransform[2] = this.interpolateValue(previousTransform[2], nextTransform[2], previousData[0], renderTime, nextData[0]);
				// Scale
				currentTransform[3] = this.interpolateValue(previousTransform[3], nextTransform[3], previousData[0], renderTime, nextData[0]);
				currentTransform[4] = this.interpolateValue(previousTransform[4], nextTransform[4], previousData[0], renderTime, nextData[0]);
				currentTransform[5] = this.interpolateValue(previousTransform[5], nextTransform[5], previousData[0], renderTime, nextData[0]);
				// Rotate
				currentTransform[6] = this.interpolateValue(previousTransform[6], nextTransform[6], previousData[0], renderTime, nextData[0]);
				currentTransform[7] = this.interpolateValue(previousTransform[7], nextTransform[7], previousData[0], renderTime, nextData[0]);
				currentTransform[8] = this.interpolateValue(previousTransform[8], nextTransform[8], previousData[0], renderTime, nextData[0]);
				
				this.translateTo(parseFloat(currentTransform[0]), parseFloat(currentTransform[1]), parseFloat(currentTransform[2]));
				this.scaleTo(parseFloat(currentTransform[3]), parseFloat(currentTransform[4]), parseFloat(currentTransform[5]));
				this.rotateTo(parseFloat(currentTransform[6]), parseFloat(currentTransform[7]), parseFloat(currentTransform[8]));
				
				/*// Calculate the squared distance between the previous point and next point
				 dist = this.distanceSquared(previousTransform.x, previousTransform.y, nextTransform.x, nextTransform.y);
				 
				 // Check that the distance is not higher than the maximum lerp and if higher,
				 // set the current time to 1 to snap to the next position immediately
				 if (dist > maxLerpSquared) { currentTime = 1; }
				 
				 // Interpolate the entity position by multiplying the Delta times T, and adding the previous position
				 currentPosition = {};
				 currentPosition.x = ( (nextTransform.x - previousTransform.x) * currentTime ) + previousTransform.x;
				 currentPosition.y = ( (nextTransform.y - previousTransform.y) * currentTime ) + previousTransform.y;
				 
				 // Now actually transform the entity
				 this.translate(entity, currentPosition.x, currentPosition.y);*/
				
				// Record the last time we updated the entity so we can disregard any updates
				// that arrive and are before this timestamp (not applicable in TCP but will
				// apply if we ever get UDP in websockets)
				this._lastUpdate = new Date().getTime();
			}
		}
	});
	
	return IgeEntity;
});
},{"irrelon-appcore":67}],33:[function(_dereq_,module,exports){
"use strict";

var appCore = _dereq_('irrelon-appcore');

appCore.module('IgeEventingClass', function (IgeClass) {
	/**
	 * Creates a new class with the capability to emit events.
	 */
	var IgeEventingClass = IgeClass.extend({
		classId: 'IgeEventingClass',
		
		/**
		 * Add an event listener method for an event.
		 * @param {String || Array} eventName The name of the event to listen for (string), or an array of events to listen for.
		 * @param {Function} call The method to call when the event listener is triggered.
		 * @param {Object=} context The context in which the call to the listening method will be made (sets the 'this' variable in the method to the object passed as this parameter).
		 * @param {Boolean=} oneShot If set, will instruct the listener to only listen to the event being fired once and will not fire again.
		 * @param {Boolean=} sendEventName If set, will instruct the emitter to send the event name as the argument instead of any emitted arguments.
		 * @return {Object} The event listener object. Hold this value if you later want to turn off the event listener.
		 * @example #Add an Event Listener
		 *     // Register event lister and store in "evt"
		 *     var evt = myEntity.on('mouseDown', function () { console.log('down'); });
		 * @example #Listen for Event Data
		 *     // Set a listener to listen for the data (multiple values emitted
		 *     // from an event are passed as function arguments)
		 *     myEntity.on('hello', function (arg1, arg2) {
	 *         console.log(arg1, arg2);
	 *     }
		 *
		 *     // Emit the event named "hello"
		 *     myEntity.emit('hello', ['data1', 'data2']);
		 *
		 *     // The console output is:
		 *     //    data1, data2
		 */
		on: function (eventName, call, context, oneShot, sendEventName) {
			var self = this,
				newListener,
				addListener,
				existingIndex,
				elArr,
				multiEvent,
				eventIndex,
				eventData,
				eventObj,
				multiEventName,
				i;
			
			// Check that we have an event listener object
			this._eventListeners = this._eventListeners || {};
			
			if (typeof call === 'function') {
				if (typeof eventName === 'string') {
					// Compose the new listener
					newListener = {
						call: call,
						context: context,
						oneShot: oneShot,
						sendEventName: sendEventName
					};
					
					elArr = this._eventListeners[eventName] = this._eventListeners[eventName] || [];
					
					// Check if we already have this listener in the list
					addListener = true;
					
					// TO-DO - Could this do with using indexOf? Would that work? Would be faster?
					existingIndex = elArr.indexOf(newListener);
					if (existingIndex > -1) {
						addListener = false;
					}
					
					// Add this new listener
					if (addListener) {
						elArr.push(newListener);
					}
					
					return newListener;
				} else {
					// The eventName is an array of names, creating a group of events
					// that must be fired to fire this event callback
					if (eventName.length) {
						// Loop the event array
						multiEvent = [];
						multiEvent[0] = 0; // This will hold our event count total
						multiEvent[1] = 0; // This will hold our number of events fired
						
						// Define the multi event callback
						multiEvent[3] = function (firedEventName) {
							multiEvent[1]++;
							
							if (multiEvent[0] === multiEvent[1]) {
								// All the multi-event events have fired
								// so fire the callback
								call.apply(context || self);
							}
						};
						
						for (eventIndex in eventName) {
							if (eventName.hasOwnProperty(eventIndex)) {
								eventData = eventName[eventIndex];
								eventObj = eventData[0];
								multiEventName = eventData[1];
								
								// Increment the event listening count total
								multiEvent[0]++;
								
								// Register each event against the event object with a callback
								eventObj.on(multiEventName, multiEvent[3], null, true, true);
							}
						}
					}
				}
			} else {
				if (typeof(eventName) !== 'string') {
					eventName = '*Multi-Event*';
				}
				this.log('Cannot register event listener for event "' + eventName + '" because the passed callback is not a function!', 'error');
			}
		},
		
		/**
		 * Remove an event listener. If the _processing flag is true
		 * then the removal will be placed in the removals array to be
		 * processed after the event loop has completed in the emit()
		 * method.
		 * @param {Boolean} eventName The name of the event you originally registered to listen for.
		 * @param {Object} evtListener The event listener object to cancel. This object is the one
		 * returned when calling the on() method. It is NOT the method you passed as the second argument
		 * to the on() method.
		 * @param {Function} callback The callback method to call when the event listener has been
		 * successfully removed. If you attempt to remove a listener during the event firing loop
		 * then the listener will not immediately be removed but will be queued for removal before
		 * the next listener loop is fired. In this case you may like to be informed via callback
		 * when the listener has been fully removed in which case, provide a method for this argument.
		 *
		 * The callback will be passed a single boolean argument denoting if the removal was successful
		 * (true) or the listener did not exist to remove (false).
		 * @example #Switch off an Event Listener
		 *     // Register event lister and store in "evt"
		 *     var evt = myEntity.on('mouseDown', function () { console.log('down'); });
		 *
		 *     // Switch off event listener
		 *     myEntity.off('mouseDown', evt);
		 * @return {Boolean}
		 */
		off: function (eventName, evtListener, callback) {
			if (this._eventListeners) {
				if (!this._eventListeners._processing) {
					if (this._eventListeners[eventName]) {
						// Find this listener in the list
						var evtListIndex = this._eventListeners[eventName].indexOf(evtListener);
						if (evtListIndex > -1) {
							// Remove the listener from the event listener list
							this._eventListeners[eventName].splice(evtListIndex, 1);
							if (callback) {
								callback(true);
							}
							return true;
						} else {
							this.log('Failed to cancel event listener for event named "' + eventName + '" !', 'warning', evtListener);
						}
					} else {
						this.log('Failed to cancel event listener!');
					}
				} else {
					// Add the removal to a remove queue since we are processing
					// listeners at the moment and removing one would mess up the
					// loop!
					this._eventListeners._removeQueue = this._eventListeners._removeQueue || [];
					this._eventListeners._removeQueue.push([eventName, evtListener, callback]);
					
					return -1;
				}
			}
			
			if (callback) {
				callback(false);
			}
			return false;
		},
		
		/**
		 * Emit an event by name.
		 * @param {Object} eventName The name of the event to emit.
		 * @param {Object || Array} args The arguments to send to any listening methods.
		 * If you are sending multiple arguments, use an array containing each argument.
		 * @return {Number}
		 * @example #Emit an Event
		 *     // Emit the event named "hello"
		 *     myEntity.emit('hello');
		 * @example #Emit an Event With Data Object
		 *     // Emit the event named "hello"
		 *     myEntity.emit('hello', {moo: true});
		 * @example #Emit an Event With Multiple Data Values
		 *     // Emit the event named "hello"
		 *     myEntity.emit('hello', [{moo: true}, 'someString']);
		 * @example #Listen for Event Data
		 *     // Set a listener to listen for the data (multiple values emitted
		 *     // from an event are passed as function arguments)
		 *     myEntity.on('hello', function (arg1, arg2) {
	 *         console.log(arg1, arg2);
	 *     }
		 *
		 *     // Emit the event named "hello"
		 *     myEntity.emit('hello', ['data1', 'data2']);
		 *
		 *     // The console output is:
		 *     //    data1, data2
		 */
		emit: function (eventName, args) {
			if (this._eventListeners) {
				// Check if the event has any listeners
				if (this._eventListeners[eventName]) {
					
					// Fire the listeners for this event
					var eventCount = this._eventListeners[eventName].length,
						eventCount2 = this._eventListeners[eventName].length - 1,
						finalArgs, i, cancelFlag, eventIndex, tempEvt, retVal;
					
					// If there are some events, ensure that the args is ready to be used
					if (eventCount) {
						finalArgs = [];
						if (typeof(args) === 'object' && args !== null && args[0] !== null && args[0] !== undefined) {
							for (i in args) {
								if (args.hasOwnProperty(i)) {
									finalArgs[i] = args[i];
								}
							}
						} else {
							finalArgs = [args];
						}
						
						// Loop and emit!
						cancelFlag = false;
						
						this._eventListeners._processing = true;
						while (eventCount--) {
							eventIndex = eventCount2 - eventCount;
							tempEvt = this._eventListeners[eventName][eventIndex];
							
							
							// If the sendEventName flag is set, overwrite the arguments with the event name
							if (tempEvt.sendEventName) { finalArgs = [eventName]; }
							
							// Call the callback
							retVal = tempEvt.call.apply(tempEvt.context || this, finalArgs);
							
							// If the retVal === true then store the cancel flag and return to the emitting method
							if (retVal === true) {
								// The receiver method asked us to send a cancel request back to the emitter
								cancelFlag = true;
							}
							
							// Check if we should now cancel the event
							if (tempEvt.oneShot) {
								// The event has a oneShot flag so since we have fired the event,
								// lets cancel the listener now
								if (this.off(eventName, tempEvt) === true) {
									eventCount2--;
								}
							}
						}
						
						// Check that the array still exists because an event
						// could have triggered a method that destroyed our object
						// which would have deleted the array!
						if (this._eventListeners) {
							this._eventListeners._processing = false;
							
							// Now process any event removal
							this._processRemovals();
						}
						
						if (cancelFlag) {
							return 1;
						}
						
					}
					
				}
			}
		},
		
		/**
		 * Returns an object containing the current event listeners.
		 * @return {Object}
		 */
		eventList: function () {
			return this._eventListeners;
		},
		
		/**
		 * Loops the removals array and processes off() calls for
		 * each array item.
		 * @private
		 */
		_processRemovals: function () {
			if (this._eventListeners) {
				var remArr = this._eventListeners._removeQueue,
					arrCount,
					item,
					result;
				
				// If the removal array exists
				if (remArr) {
					// Get the number of items in the removal array
					arrCount = remArr.length;
					
					// Loop the array
					while (arrCount--) {
						item = remArr[arrCount];
						
						// Call the off() method for this item
						result = this.off(item[0], item[1]);
						
						// Check if there is a callback
						if (typeof remArr[2] === 'function') {
							// Call the callback with the removal result
							remArr[2](result);
						}
					}
				}
				
				// Remove the removal array
				delete this._eventListeners._removeQueue;
			}
		}
	});
	
	return IgeEventingClass;
});
},{"irrelon-appcore":67}],34:[function(_dereq_,module,exports){
"use strict";

var appCore = _dereq_('irrelon-appcore');

appCore.module('IgeFSM', function (IgeClass) {
	/**
	 * A simple finite state machine implementation.
	 */
	var IgeFSM = IgeClass.extend({
		classId: 'IgeFSM',
		
		init: function () {
			var self = this;
			
			this._states = {};
			this._transitions = {};
			
			// Track states by name.
			this._initialStateName = '';
			this._currentStateName = '';
			this._previousStateName = '';
			
			this._debug = false;
		},
		
		/**
		 * Returns the name of the initial state.
		 * @returns {string}
		 */
		initialStateName: function () {
			return this._currentStateName;
		},
		
		/**
		 * Returns the name of the previous state.
		 * @returns {string}
		 */
		previousStateName: function () {
			return this._currentStateName;
		},
		
		/**
		 * Returns the name of the current state.
		 * @returns {string}
		 */
		currentStateName: function () {
			return this._currentStateName;
		},
		
		/**
		 * Gets / sets the debug flag. If set to true will enable console logging
		 * of state changes / events.
		 * @param {Boolean=} val Set to true to enable.
		 * @returns {*}
		 */
		debug: function (val) {
			if (val !== undefined) {
				this._debug = val;
				return this;
			}
			
			return this._debug;
		},
		
		/**
		 * Defines a state with a name and a state definition.
		 * @param {String} name The name of the state to define.
		 * @param {Object} definition The state definition object.
		 * @example #Define a state
		 *     var fsm = new IgeFSM();
		 *
		 *     // Define an "idle" state
		 *     fsm.defineState('idle', {
	 *         enter: function (data, completeCallback) {
	 *             console.log('entered idle state');
	 *             completeCallback();
	 *         },
	 *         exit: function (data, completeCallback) {
	 *             console.log('exited idle state');
	 *             completeCallback();
	 *         }
	 *     });
		 * @returns {IgeFSM}
		 */
		defineState: function (name, definition) {
			this._states[name] = definition;
			
			if (!this._initialStateName) {
				this._initialStateName = name;
			}
			
			return this;
		},
		
		/**
		 * Defines a transition between two states.
		 * @param {String} fromState The state name the transition is from.
		 * @param {String} toState The state name the transition is to.
		 * @param {Function} transitionCheck A method to call just before this transition
		 * between the two specified states is executed, that will call the callback method
		 * passed to it in the second parameter and include either true to allow the
		 * transition to continue, or false to cancel it in the first parameter.
		 * @example #Define a state transition
		 *     var fsm = new IgeFSM();
		 *
		 *     // Define an "idle" state
		 *     fsm.defineState('idle', {
	 *         enter: function (data, completeCallback) {
	 *             console.log('entered idle state');
	 *             completeCallback();
	 *         },
	 *         exit: function (data, completeCallback) {
	 *             console.log('exited idle state');
	 *             completeCallback();
	 *         }
	 *     });
		 *
		 *     // Define a "moving" state
		 *     fsm.defineState('moving', {
	 *         enter: function (data, completeCallback) {
	 *             console.log('entered moving state');
	 *             completeCallback();
	 *         },
	 *         exit: function (data, completeCallback) {
	 *             console.log('exited moving state');
	 *             completeCallback();
	 *         }
	 *     });
		 *
		 *     // Define a transition between the two methods
		 *     fsm.defineTransition('idle', 'moving', function (data, callback) {
	 *         // Check some data we were passed
	 *         if (data === 'ok') {
	 *             // Callback the listener and tell them there was no error
	 *             // (first argument is an err flag, set to false for no error)
	 *             callback(false);
	 *         } else {
	 *             // Callback and say there was an error by passing anything other
	 *             // than false in the first argument
	 *             callback('Some error string, or true or any data');
	 *         }
	 *     });
		 *
		 *     // Now change states and cause it to fail
		 *     fsm.enterState('moving', 'notOk', function (err, data) {
	 *         if (!err) {
	 *             // There was no error, the state changed successfully
	 *             console.log('State changed!', fsm.currentStateName());
	 *         } else {
	 *             // There was an error, the state did not change
	 *             console.log('State did NOT change!', fsm.currentStateName());
	 *         }
	 *     });
		 *
		 *     // Now change states and pass "ok" in the data to make it proceed
		 *     fsm.enterState('moving', 'ok', function (err, data) {
	 *         if (!err) {
	 *             // There was no error, the state changed successfully
	 *             console.log('State changed!', fsm.currentStateName());
	 *         } else {
	 *             // There was an error, the state did not change
	 *             console.log('State did NOT change!', fsm.currentStateName());
	 *         }
	 *     });
		 * @returns {*}
		 */
		defineTransition: function (fromState, toState, transitionCheck) {
			if (fromState && toState && transitionCheck) {
				if (!this._states[fromState]) {
					this.log('fromState "' + fromState + '" specified is not defined as a state!', 'error');
				}
				
				if (!this._states[toState]) {
					this.log('toState "' + toState + '" specified is not defined as a state!', 'error');
				}
				
				this._transitions[fromState] = this._transitions[fromState] || {};
				this._transitions[fromState][toState] = transitionCheck;
				
				return this;
			}
			
			return false;
		},
		
		/**
		 * After defining your states, call this with the state name and the initial
		 * state of the FSM will be set.
		 * @param {String} stateName The state to set as the initial state.
		 * @param {*=} data Any data you wish to pass the state's "enter" method.
		 * @param {Function=} callback An optional callback method that will be called
		 * once the state has been entered successfully, or if there was an error.
		 */
		initialState: function (stateName, data, callback) {
			var newStateObj = this.getState(stateName);
			
			this._currentStateName = stateName;
			
			if (this._debug) { this.log('Entering initial state: ' + stateName); }
			
			if (newStateObj.enter) {
				newStateObj.enter.apply(newStateObj, [data, function (enterErr, enterData) {
					if (callback) { callback(enterErr, enterData); }
				}]);
			}
		},
		
		/**
		 * Gets the state definition object for the specified state name.
		 * @param {String} stateName The name of the state who's definition object should
		 * be looked up and returned.
		 * @returns {Object} The state definition object or undefined if no state exists
		 * with that name.
		 */
		getState: function (stateName) {
			return this._states[stateName];
		},
		
		/**
		 * Tell the FSM to enter the state specified.
		 * @param {String} newStateName The new state to enter.
		 * @param {*} data Any data to pass to the exit and enter methods.
		 * @param {Function=} callback The optional callback method to call on completion.
		 */
		enterState: function (newStateName, data, callback) {
			var self = this;
			
			if (self._transitions[self._currentStateName] && self._transitions[self._currentStateName][newStateName]) {
				// There is a transition check method, call it to see if we can change states
				self._transitions[self._currentStateName][newStateName](data, function (err) {
					if (!err) {
						// State change allowed
						self._transitionStates(self._currentStateName, newStateName, data, callback);
					} else {
						// State change not allowed or error
						if (callback ) { callback(err); }
						
						this.log('Cannot transition from "' + self._currentStateName + '" to "' + newStateName + '" states.', 'warning');
					}
				});
			} else {
				// No transition check method exists, continue to change states
				self._transitionStates(self._currentStateName, newStateName, data, callback);
			}
		},
		
		/**
		 * Tell the FSM to exit the current state and enter the previous state.
		 * @param {Function=} callback Optional callback method once exiting the state
		 * has been executed.
		 */
		exitState: function (callback) {
			this.enterState(this._previousStateName, null, callback);
		},
		
		/**
		 * Handles changing states from one to another by checking for transitions and
		 * handling callbacks.
		 * @param {String} oldStateName The name of the state we are transitioning from.
		 * @param {String} newStateName The name of the state we are transitioning to.
		 * @param {*=} data Optional data to pass to the exit and enter methods of each state.
		 * @param {Function=} callback Optional callback method to execute once the transition
		 * has been completed.
		 * @private
		 */
		_transitionStates: function (oldStateName, newStateName, data, callback) {
			var self = this,
				currentStateObj = self.getState(self._currentStateName),
				newStateObj = self.getState(newStateName);
			
			if (currentStateObj && newStateObj) {
				if (self._debug) { self.log('Exiting state: ' + self._currentStateName); }
				if (currentStateObj.exit) {
					currentStateObj.exit.apply(currentStateObj, [data, function (exitStateErr, exitStateData) {
						self._previousStateName = self._currentStateName;
						self._currentStateName = newStateName;
						
						if (self._debug) { self.log('Entering state: ' + newStateName); }
						if (newStateObj.enter) {
							newStateObj.enter.apply(newStateObj, [data, function (enterStateErr, enterStateData) {
								if (callback) { callback(enterStateErr, data); }
							}]);
						}
					}]);
				}
			} else {
				if (callback) { callback('Cannot change states from "' + self._currentStateName + '" to "' + newStateName + '" states.'); }
				self.log('Cannot change states from "' + self._currentStateName + '" to "' + newStateName + '" states.', 'warning');
			}
		}
	});
	
	return IgeFSM;
});
},{"irrelon-appcore":67}],35:[function(_dereq_,module,exports){
"use strict";

var appCore = _dereq_('irrelon-appcore');

appCore.module('IgeFilters', function () {
	// See the ige/engine/filters folder for the individual filter source
	var IgeFilters = {};
	
	if (typeof(window) !== 'undefined') {
		// Create a temporary canvas for the filter system to use
		IgeFilters.tmpCanvas = document.createElement('canvas');
		IgeFilters.tmpCtx = IgeFilters.tmpCanvas.getContext('2d');
	}
	
	return IgeFilters;
});
},{"irrelon-appcore":67}],36:[function(_dereq_,module,exports){
"use strict";

var appCore = _dereq_('irrelon-appcore');

appCore.module('IgeFontEntity', function (IgeUiEntity, IgeTexture, IgeFontSmartTexture) {
	/**
	 * Creates a new font entity. A font entity will use a font sheet
	 * (IgeFontSheet) or native font and render text.
	 */
	var IgeFontEntity = IgeUiEntity.extend({
		classId: 'IgeFontEntity',
		
		init: function () {
			IgeUiEntity.prototype.init.call(this);
			
			this._renderText = undefined;
			this._text = undefined;
			this._textAlignX = 1;
			this._textAlignY = 1;
			this._textLineSpacing = 0;
			this._nativeMode = false;
			
			// Enable caching by default for font entities!
			this.cache(true);
		},
		
		/**
		 * Extends the IgeUiEntity.width() method and if the value being
		 * set is different from the current width value then the font's
		 * cache is invalidated so it gets redrawn.
		 * @param val
		 * @param lockAspect
		 * @param modifier
		 * @param noUpdate
		 * @returns {*}
		 */
		width: function (val, lockAspect, modifier, noUpdate) {
			if (val !== undefined) {
				if (this._bounds2d.x !== val) {
					this.clearCache();
				}
			}
			
			var retVal = IgeUiEntity.prototype.width.call(this, val, lockAspect, modifier, noUpdate);
			
			if (this._autoWrap) {
				this._applyAutoWrap();
			}
			
			return retVal;
		},
		
		/**
		 * Extends the IgeUiEntity.height() method and if the value being
		 * set is different from the current height value then the font's
		 * cache is invalidated so it gets redrawn.
		 * @param val
		 * @param lockAspect
		 * @param modifier
		 * @param noUpdate
		 * @returns {*|number}
		 */
		height: function (val, lockAspect, modifier, noUpdate) {
			if (val !== undefined) {
				if (this._bounds2d.y !== val) {
					this.clearCache();
				}
			}
			
			return IgeUiEntity.prototype.height.call(this, val, lockAspect, modifier, noUpdate);
		},
		
		/**
		 * Sets the text to render for this font entity. This sets both
		 * the private properties "_text" and "_renderText". If auto-wrapping
		 * has been enabled then the "_text" remains equal to whatever
		 * text you pass into this method but "_renderText" becomes the
		 * line-broken text that the auto-wrapper method creates. When the
		 * entity renders it's text string it ALWAYS renders from "_renderText"
		 * and not the value of "_text". Effectively this means that "_text"
		 * contains the unaltered version of your original text and
		 * "_renderText" will be either the same as "_text" if auto-wrapping
		 * is disable or a wrapped version otherwise.
		 * @param {String} text The text string to render.
		 * @returns {*}
		 */
		text: function (text) {
			if (text !== undefined) {
				var wasDifferent = false;
				
				// Ensure we have a string
				text = String(text);
				
				if (this._text !== text) {
					this.clearCache();
					wasDifferent = true;
				}
				
				this._text = text;
				
				if (this._autoWrap && wasDifferent) {
					this._applyAutoWrap();
				} else {
					this._renderText = text;
				}
				
				return this;
			}
			
			return this._text;
		},
		
		/**
		 * Allows you to bind the text output of this font entity to match
		 * the value of an object's property so that when it is updated the
		 * text will automatically update on this entity. Useful for score,
		 * position etc output where data is stored in an object and changes
		 * frequently.
		 * @param {Object} obj The object to read the property from.
		 * @param {String} propName The name of the property to read value from.
		 * @param {String} preText Text to place before the output.
		 * @param {String} postText Text to place after the output.
		 * @returns {*}
		 */
		bindData: function (obj, propName, preText, postText) {
			if (obj !== undefined && propName !== undefined) {
				this._bindDataObject = obj;
				this._bindDataProperty = propName;
				this._bindDataPreText = preText || '';
				this._bindDataPostText = postText || '';
			}
			
			return this;
		},
		
		/**
		 * Gets / sets the current horizontal text alignment. Accepts
		 * a value of 0, 1 or 2 (left, centre, right) respectively.
		 * @param {Number=} val
		 * @returns {*}
		 */
		textAlignX: function (val) {
			if (val !== undefined) {
				if (this._textAlignX !== val) {
					this.clearCache();
				}
				this._textAlignX = val;
				return this;
			}
			return this._textAlignX;
		},
		
		/**
		 * Gets / sets the current vertical text alignment. Accepts
		 * a value of 0, 1 or 2 (top, middle, bottom) respectively.
		 * @param {Number=} val
		 * @returns {*}
		 */
		textAlignY: function (val) {
			if (val !== undefined) {
				if (this._textAlignY !== val) {
					this.clearCache();
				}
				this._textAlignY = val;
				return this;
			}
			return this._textAlignY;
		},
		
		/**
		 * Gets / sets the amount of spacing between the lines of text being
		 * rendered. Accepts negative values as well as positive ones.
		 * @param {Number=} val
		 * @returns {*}
		 */
		textLineSpacing: function (val) {
			if (val !== undefined) {
				if (this._textLineSpacing !== val) {
					this.clearCache();
				}
				this._textLineSpacing = val;
				return this;
			}
			return this._textLineSpacing;
		},
		
		/**
		 * Gets / sets the string hex or rgba value of the colour
		 * to use as an overlay when rending this entity's texture.
		 * @param {String=} val The colour value as hex e.g. '#ff0000'
		 * or as rgba e.g. 'rbga(255, 0, 0, 0.5)'. To remove an overlay
		 * colour simply passed an empty string.
		 * @return {*} "this" when arguments are passed to allow method
		 * chaining or the current value if no arguments are specified.
		 */
		colorOverlay: function (val) {
			if (val !== undefined) {
				if (this._colorOverlay !== val) {
					this.clearCache();
				}
				this._colorOverlay = val;
				return this;
			}
			
			return this._colorOverlay;
		},
		
		/**
		 * A proxy for colorOverlay().
		 */
		color: function (val) {
			return this.colorOverlay(val);
		},
		
		/**
		 * Clears the texture cache for this entity's text string.
		 */
		clearCache: function () {
			if (this._cache) {
				this.cacheDirty(true);
			}
			
			if (this._texture && this._texture._caching && this._texture._cacheText[this._renderText]) {
				delete this._texture._cacheText[this._renderText];
			}
		},
		
		/**
		 * When using native font rendering (canvasContext.fillText())
		 * this sets the font and size as per the canvasContext.font
		 * string specification.
		 * @param {String=} val The font style string.
		 * @return {*} "this" when arguments are passed to allow method
		 * chaining or the current value if no arguments are specified.
		 */
		nativeFont: function (val) {
			if (val !== undefined) {
				// Check if this font is different from the current
				// assigned font
				if (this._nativeFont !== val) {
					// The fonts are different, clear existing cache
					this.clearCache();
				}
				this._nativeFont = val;
				
				// Assign the native font smart texture
				var tex = new IgeTexture(IgeFontSmartTexture);
				this.texture(tex);
				
				// Set the flag indicating we are using a native font
				this._nativeMode = true;
				
				return this;
			}
			
			return this._nativeFont;
		},
		
		/**
		 * Gets / sets the text stroke size that applies when using
		 * a native font for text rendering.
		 * @param {Number=} val The size of the text stroke.
		 * @return {*}
		 */
		nativeStroke: function (val) {
			if (val !== undefined) {
				if (this._nativeStroke !== val) {
					this.clearCache();
				}
				this._nativeStroke = val;
				return this;
			}
			
			return this._nativeStroke;
		},
		
		/**
		 * Gets / sets the text stroke color that applies when using
		 * a native font for text rendering.
		 * @param {Number=} val The color of the text stroke.
		 * @return {*}
		 */
		nativeStrokeColor: function (val) {
			if (val !== undefined) {
				if (this._nativeStrokeColor !== val) {
					this.clearCache();
				}
				this._nativeStrokeColor = val;
				return this;
			}
			
			return this._nativeStrokeColor;
		},
		
		/**
		 * Gets / sets the auto-wrapping mode. If set to true then the
		 * text this font entity renders will be automatically line-broken
		 * when a line reaches the width of the entity.
		 * @param val
		 * @returns {*}
		 */
		autoWrap: function (val) {
			if (val !== undefined) {
				this._autoWrap = val;
				
				// Execute an auto-wrap modification of the text
				if (this._text) {
					this._applyAutoWrap();
					this.clearCache();
				}
				return this;
			}
			
			return this._autoWrap;
		},
		
		/**
		 * Automatically detects where line-breaks need to occur in the text
		 * assigned to the entity and adds them.
		 * @private
		 */
		_applyAutoWrap: function () {
			if (this._text) {
				// Un-wrap the text so it is all on one line
				var oneLineText = this._text.replace(/\n/g, ' '),
					words,
					wordIndex,
					textArray = [],
					currentTextLine = '',
					lineWidth;
				
				// Break the text into words
				words = oneLineText.split(' ');
				
				// There are multiple words - loop the words
				for (wordIndex = 0; wordIndex < words.length; wordIndex++) {
					if (currentTextLine) {
						currentTextLine += ' ';
					}
					currentTextLine += words[wordIndex];
					
					// Check the width and if greater than the width of the entity,
					// add a line break before the word
					lineWidth = this.measureTextWidth(currentTextLine);
					
					if (lineWidth >= this._bounds2d.x) {
						// Start a new line
						currentTextLine = words[wordIndex];
						
						// Add a line break
						textArray.push('\n' + words[wordIndex]);
					} else {
						textArray.push(words[wordIndex]);
					}
					
				}
				
				this._renderText = textArray.join(' ');
			}
		},
		
		/**
		 * Will measure and return the width in pixels of a line or multiple
		 * lines of text. If no text parameter is passed, will use the current
		 * text assigned to the font entity.
		 * @param {String=} text Optional text to measure, used existing entity
		 * text value if none is provided.
		 * @returns {Number} The width of the text in pixels.
		 */
		measureTextWidth: function (text) {
			text = text || this._text;
			
			// Both IgeFontSheet and the IgeFontSmartTexture have a method
			// called measureTextWidth() so we can just asks the current
			// texture for the width :)
			if (this._texture._mode === 0) {
				return this._texture.measureTextWidth(text);
			} else {
				return this._texture.script.measureTextWidth(text, this);
			}
		},
		
		tick: function (ctx) {
			// Check for an auto-progress update
			if (this._bindDataObject && this._bindDataProperty) {
				if (this._bindDataObject._alive === false) {
					// The object we have bind data from has been
					// destroyed so release our reference to it!
					delete this._bindDataObject;
				} else {
					this.text(this._bindDataPreText + this._bindDataObject[this._bindDataProperty] + this._bindDataPostText);
				}
			}
			
			IgeUiEntity.prototype.tick.call(this, ctx);
		},
		
		/**
		 * Returns a string containing a code fragment that when
		 * evaluated will reproduce this object's properties via
		 * chained commands. This method will only check for
		 * properties that are directly related to this class.
		 * Other properties are handled by their own class method.
		 * @return {String}
		 */
		_stringify: function () {
			// Get the properties for all the super-classes
			var str = IgeUiEntity.prototype._stringify.call(this), i;
			
			// Loop properties and add property assignment code to string
			for (i in this) {
				if (this.hasOwnProperty(i) && this[i] !== undefined) {
					switch (i) {
						case '_text':
							str += ".text(" + this.text() + ")";
							break;
						case '_textAlignX':
							str += ".textAlignX(" + this.textAlignX() + ")";
							break;
						case '_textAlignY':
							str += ".textAlignY(" + this.textAlignY() + ")";
							break;
						case '_textLineSpacing':
							str += ".textLineSpacing(" + this.textLineSpacing() + ")";
							break;
					}
				}
			}
			
			return str;
		}
	});
	
	return IgeFontEntity;
});
},{"irrelon-appcore":67}],37:[function(_dereq_,module,exports){
"use strict";

var appCore = _dereq_('irrelon-appcore');

appCore.module('IgeFontSheet', function (IgeTexture) {
	/* TODO: URGENT - Make this alignment stuff work inside the bounds of the entity it is attached to
	 * so that bottom-right aligns to the lower-right point of the bounding box of the entity
	 * whilst maintaining the current text-alignment as well
	 * */
	
	/**
	 * Creates a new font sheet. A font sheet is an image that contains
	 * letters and numbers rendered to specifications. It allows you to
	 * use and render text fonts without the font actually existing on
	 * the target system that the engine is running in.
	 */
	var IgeFontSheet = IgeTexture.extend({
		classId: 'IgeFontSheet',
		
		init: function (url) {
			IgeTexture.prototype.init.call(this, url);
			
			if (arguments[1]) {
				this.log('Font sheets no longer accept a caching limit value. All font output is now cached by default via the actual font entity - fontEntity.cache(true);', 'warning');
			}
			
			// Set the _noDimensions flag which tells any entity
			// that assigns this texture that the texture has an
			// unknown width/height so it should not get it's
			// dimension data from the texture
			this._noDimensions = true;
			
			// Set a listener for when the texture loads
			this.on('loaded', function () {
				if (this.image) {
					// Store the cell sheet image
					this._sheetImage = this.image;
					
					// Get the font sheet data header
					this._fontData = this.decodeHeader();
					
					// Cache access to looped data
					this._charCodeMap = this._fontData.characters.charCodes;
					this._charPosMap = this._fontData.characters.charPosition;
					this._measuredWidthMap = this._fontData.characters.measuredWidth;
					this._pixelWidthMap = this._fontData.characters.pixelWidth;
					
					if (this._fontData) {
						var header = this._fontData.font;
						this.log('Loaded font sheet for font: ' + header.fontName + ' @ ' + header.fontSize + header.fontSizeUnit + ' in ' + header.fontColor);
					} else {
						this.log('Could not load data header for font sheet: ' + this.image.src, 'error');
					}
				}
			});
		},
		
		decodeHeader: function () {
			// Create a temporary canvas
			var canvas = document.createElement('canvas'),
				ctx = canvas.getContext('2d');
			
			// Set canvas width to match font sheet image and
			// height to 1 as we have 1 line of header data
			canvas.width = this.image.width;
			canvas.height = 1;
			
			// Draw the font sheet to the canvas
			ctx.drawImage(this.image, 0, 0);
			
			// Decode the font sheet pixel-encoded data
			return this._decode(canvas, 0, 0, this.image.width);
		},
		
		_decode: function (canvas, x, y, maxX) {
			"use strict";
			var ctx = canvas.getContext('2d'),
				imageData = ctx.getImageData(x, y, maxX, canvas.height).data,
				run = true,
				quadCode,
				i = 0,
				jsonString = '';
			
			while (run) {
				quadCode = String(imageData[i]) + ' ' + String(imageData[i + 1]) + ' ' + String(imageData[i + 2]);
				if (quadCode === '3 2 1') {
					// We have scanned the terminal code
					// so exit the loop
					run = false;
					return JSON.parse(jsonString);
				} else {
					jsonString += String.fromCharCode(imageData[i]) + String.fromCharCode(imageData[i + 1]) + String.fromCharCode(imageData[i + 2]);
				}
				i += 4;
				
				if (i > imageData.length) {
					run = false;
					console.log('Image JSON Decode Error!');
				}
			}
		},
		
		lineHeightModifier: function (val) {
			if (typeof(val) !== 'undefined') {
				this._lineHeightModifier = val;
			}
		},
		
		/**
		 * Returns the width in pixels of the text passed in the
		 * argument.
		 * @param {String} text The text to measure.
		 * @returns {number}
		 */
		measureTextWidth: function (text) {
			if (this._loaded) {
				var characterIndex,
					charCodeMap = this._charCodeMap,
					measuredWidthMap = this._measuredWidthMap,
					charIndex,
					lineArr = [],
					lineIndex,
					measuredWidth,
					maxWidth = 0;
				
				// Handle multi-line text
				if (text.indexOf('\n') > -1) {
					// Split each line into an array item
					lineArr = text.split('\n');
				} else {
					// Store the text as a single line
					lineArr.push(text);
				}
				
				for (lineIndex = 0; lineIndex < lineArr.length; lineIndex++) {
					// Calculate the total width of the line of text
					measuredWidth = 0;
					for (characterIndex = 0; characterIndex < lineArr[lineIndex].length; characterIndex++) {
						charIndex = charCodeMap[lineArr[lineIndex].charCodeAt(characterIndex)];
						measuredWidth += measuredWidthMap[charIndex] || 0;
					}
					
					if (measuredWidth > maxWidth) {
						maxWidth = measuredWidth;
					}
				}
				
				// Store the width of this line so we can align it correctly
				return measuredWidth;
			}
			
			return -1;
		},
		
		render: function (ctx, entity) {
			if (entity._renderText && this._loaded) {
				var _ctx = ctx,
					text = entity._renderText,
					lineText,
					lineArr = [],
					lineIndex,
					characterIndex,
					charCodeMap = this._charCodeMap,
					charPosMap = this._charPosMap,
					measuredWidthMap = this._measuredWidthMap,
					pixelWidthMap = this._pixelWidthMap,
					renderX = 0,
					renderY = 0,
					renderStartX = 0,
					renderStartY = 0,
					masterX = 0,
					masterY = 0,
					lineWidth = [],
					lineHeight = (this._sizeY - 2),
					singleLineWidth = 0,
					totalWidth = 0,
					totalHeight,
					charIndex;
				
				// Handle multi-line text
				if (text.indexOf('\n') > -1) {
					// Split each line into an array item
					lineArr = text.split('\n');
				} else {
					// Store the text as a single line
					lineArr.push(text);
				}
				
				totalHeight = (lineHeight * lineArr.length);
				
				// TODO: Y-based alignment doesn't work at the moment. Fix it!
				// Handle text alignment y
				switch (entity._textAlignY) {
					case 0: // Align top
						renderStartY = -((lineHeight * (lineArr.length)) / 2) - (entity._textLineSpacing * ((lineArr.length - 1) / 2));//0;
						break;
					
					case 1: // Align middle
						renderStartY = -((lineHeight * (lineArr.length)) / 2) - (entity._textLineSpacing * ((lineArr.length - 1) / 2));
						break;
					
					case 2: // Align bottom
						renderStartY = -((lineHeight * (lineArr.length)) / 2) - (entity._textLineSpacing * ((lineArr.length - 1) / 2));//-((lineHeight) * (lineArr.length)) - (entity._textLineSpacing * (lineArr.length - 1));
						break;
				}
				
				// Calculate the total text width of each line
				for (lineIndex = 0; lineIndex < lineArr.length; lineIndex++) {
					lineText = lineArr[lineIndex];
					for (characterIndex = 0; characterIndex < lineText.length; characterIndex++) {
						charIndex = charCodeMap[lineText.charCodeAt(characterIndex)];
						singleLineWidth += measuredWidthMap[charIndex] || 0;
					}
					
					// Store the width of this line so we can align it correctly
					lineWidth[lineIndex] = singleLineWidth;
					
					if (singleLineWidth > totalWidth) {
						totalWidth = singleLineWidth;
					}
					
					singleLineWidth = 0;
				}
				
				// Handle text cached alignment x
				switch (entity._textAlignX) {
					case 0: // Align left
						renderStartX = -entity._bounds2d.x2;
						break;
					
					case 1: // Align center
						renderStartX = -totalWidth / 2;
						break;
					
					case 2: // Align right
						renderStartX = entity._bounds2d.x2 - totalWidth;
						break;
				}
				
				/*_ctx.strokeStyle = '#ff0000';
				 _ctx.strokeRect(renderStartX, renderStartY, totalWidth, totalHeight);*/
				
				for (lineIndex = 0; lineIndex < lineArr.length; lineIndex++) {
					lineText = lineArr[lineIndex];
					renderY = (lineHeight * lineIndex) + (entity._textLineSpacing * (lineIndex));
					
					// Handle text alignment x
					switch (entity._textAlignX) {
						case 0: // Align left
							renderX = -entity._bounds2d.x2;
							break;
						
						case 1: // Align center
							renderX = -lineWidth[lineIndex] / 2;
							break;
						
						case 2: // Align right
							renderX = entity._bounds2d.x2 - lineWidth[lineIndex];
							break;
					}
					
					for (characterIndex = 0; characterIndex < lineText.length; characterIndex++) {
						charIndex = charCodeMap[lineText.charCodeAt(characterIndex)];
						
						_ctx.drawImage(
							this.image,
							charPosMap[charIndex], // texture x
							2, // texture y
							pixelWidthMap[charIndex], // texture width
							this._sizeY - 2, // texture height
							Math.floor(masterX + renderX), // render x TODO: Performance - Cache these?
							Math.floor(masterY + renderStartY + renderY), // render y
							pixelWidthMap[charIndex], // render width
							(this._sizeY - 2) // render height
						);
						
						// Check if we should overlay with a colour
						if (entity._colorOverlay) {
							_ctx.save();
							// Set the composite operation and draw the colour over the top
							_ctx.globalCompositeOperation = 'source-atop';
							
							_ctx.fillStyle = entity._colorOverlay;
							_ctx.fillRect(
								Math.floor(masterX + renderX), // render x TODO: Performance - Cache these?
								Math.floor(masterY + renderStartY + renderY), // render y
								pixelWidthMap[charIndex], // render width
								(this._sizeY - 2) // render height
							);
							_ctx.restore();
						}
						
						renderX += measuredWidthMap[charIndex] || 0;
						
						ige._drawCount++;
					}
					
					renderX = 0;
				}
			}
		},
		
		destroy: function () {
			this.image = null;
			this.script = null;
		}
	});
	
	return IgeFontSheet;
});
},{"irrelon-appcore":67}],38:[function(_dereq_,module,exports){
"use strict";

var appCore = _dereq_('irrelon-appcore');

appCore.module('IgeInterval', function (IgeEventingClass) {
	/**
	 * Provides an alternative to setInterval() which works based on the engine's internal
	 * time system allowing intervals to fire correctly, taking into account pausing the
	 * game and differences in rendering speed etc.
	 */
	var IgeInterval = IgeEventingClass.extend({
		classId: 'IgeInterval',
		
		/**
		 * Creates a new timer that will call the method every given number of
		 * milliseconds specified by the interval parameter.
		 * @param {Function} method The method to call each interval.
		 * @param {Number} interval The number of milliseconds between each interval.
		 * @example #Create a timer that will call a method every 1 second in engine time
		 *     var myInterval = new IgeInterval(function () {
	 *     		console.log('interval fired');
	 *     }, 1000);
		 */
		init: function (method, interval) {
			var self = this;
			
			this._method = method;
			this._interval = interval;
			this._time = 0;
			this._started = ige._currentTime;
			
			// Attach ourselves to the time system
			ige.time.addTimer(this);
		},
		
		/**
		 * Adds time to the timer's internal clock.
		 * @param {Number} time The time in milliseconds to add to the timer's internal clock.
		 * @returns {*}
		 */
		addTime: function (time) {
			this._time += time;
			return this;
		},
		
		/**
		 * Cancels the timer stopping all future method calls.
		 * @example #Cancel an interval timer
		 *     var myInterval = new IgeInterval(function () {
	 *     		console.log('interval fired');
	 *     }, 1000);
		 *
		 *     myInterval.cancel();
		 * @returns {*}
		 */
		cancel: function () {
			ige.time.removeTimer(this);
			return this;
		},
		
		/**
		 * Checks for a timer event to see if we should call the timer method. This is
		 * called automatically by the IgeTimeComponent class and does not need to be
		 * called manually.
		 * @returns {*}
		 */
		update: function () {
			if (this._time > this._interval) {
				// Fire an interval
				this._method(ige._currentTime);
				this._time -= this._interval;
			}
			
			return this;
		}
	});
	
	return IgeInterval;
});
},{"irrelon-appcore":67}],39:[function(_dereq_,module,exports){
"use strict";

var appCore = _dereq_('irrelon-appcore');

appCore.module('IgeMap2d', function (IgeClass) {
	/**
	 * Creates a new map that has two dimensions (x and y) to it's data.
	 */
	var IgeMap2d = IgeClass.extend({
		classId: 'IgeMap2d',
		
		init: function (data) {
			this._mapData = data || [];
		},
		
		/**
		 * Gets / sets a value on the specified map tile co-ordinates.
		 * @param {Number} x
		 * @param {Number} y
		 * @param {*=} val The data to set on the map tile co-ordinate.
		 * @return {*}
		 */
		tileData: function (x, y, val) {
			if (x !== undefined && y !== undefined) {
				if (val !== undefined) {
					// Assign a value
					this._mapData[y] = this._mapData[y] || [];
					this._mapData[y][x] = val;
					return this;
				} else {
					// No assignment so see if we have data to return
					if (this._mapData[y]) {
						return this._mapData[y][x];
					}
				}
			}
			
			// Either no x, y was specified or there was
			// no data at the x, y so return undefined
			return undefined;
		},
		
		/**
		 * Clears any data set at the specified map tile co-ordinates.
		 * @param x
		 * @param y
		 * @return {Boolean} True if data was cleared or false if no data existed.
		 */
		clearData: function (x, y) {
			if (x !== undefined && y !== undefined) {
				if (this._mapData[y] !== undefined) {
					delete this._mapData[y][x];
					return true;
				}
			}
			
			return false;
		},
		
		/**
		 * Checks if the tile area passed has any data stored in it. If
		 * so, returns true, otherwise false.
		 * @param x
		 * @param y
		 * @param width
		 * @param height
		 */
		collision: function (x, y, width, height) {
			var xi, yi;
			
			if (width === undefined) { width = 1; }
			if (height === undefined) { height = 1; }
			
			if (x !== undefined && y !== undefined) {
				for (yi = 0; yi < height; yi++) {
					for (xi = 0; xi < width; xi++) {
						if (this.tileData(x + xi, y + yi)) {
							return true;
						}
					}
				}
			}
			
			return false;
		},
		
		/**
		 * Checks if the tile area passed has data stored in it that matches
		 * the passed data. If so, returns true, otherwise false.
		 * @param x
		 * @param y
		 * @param width
		 * @param height
		 * @param data
		 */
		collisionWith: function (x, y, width, height, data) {
			var xi, yi;
			
			if (width === undefined) { width = 1; }
			if (height === undefined) { height = 1; }
			
			if (x !== undefined && y !== undefined) {
				for (yi = 0; yi < height; yi++) {
					for (xi = 0; xi < width; xi++) {
						if (this.tileData(x + xi, y + yi) === data) {
							return true;
						}
					}
				}
			}
			
			return false;
		},
		
		/**
		 * Checks if the tile area passed has data stored in it that matches
		 * the passed data and does not collide with any other stored tile
		 * data. If so, returns true, otherwise false.
		 * @param x
		 * @param y
		 * @param width
		 * @param height
		 * @param data
		 */
		collisionWithOnly: function (x, y, width, height, data) {
			var xi, yi,
				tileData,
				withData = false;
			
			if (width === undefined) { width = 1; }
			if (height === undefined) { height = 1; }
			
			if (x !== undefined && y !== undefined) {
				for (yi = 0; yi < height; yi++) {
					for (xi = 0; xi < width; xi++) {
						tileData = this.tileData(x + xi, y + yi);
						if (tileData) {
							if (this.tileData(x + xi, y + yi) === data) {
								withData = true;
							} else {
								return false;
							}
						}
					}
				}
			}
			
			return withData;
		},
		
		/**
		 * Gets / sets the map's tile data.
		 * @param {Array} val The map data array.
		 * @param {Integer} startX The start x co-ordinate of the data.
		 * @param {Integer} startY The start y co-ordinate of the data.
		 * @return {*}
		 */
		mapData: function (val, startX, startY) {
			if (val !== undefined) {
				if (!startX && !startY) {
					this._mapData = val;
				} else {
					// Loop the map data and apply based on the start positions
					var x, y;
					
					for (y in val) {
						for (x in val[y]) {
							this._mapData[startY + parseInt(y)][startX + parseInt(x)] = val[y][x];
						}
					}
				}
				return this;
			}
			
			return this._mapData;
		},
		
		sortedMapDataAsArray: function () {
			var data = this.mapData(),
				finalData = {};
			
			var x, y, xArr, yArr, i, k;
			
			yArr = this._sortKeys(data);
			
			for (i = 0; i < yArr.length; i++) {
				y = yArr[i];
				xArr = this._sortKeys(data[y]);
				
				finalData[y] = finalData[y] || {};
				
				for (k = 0; k < xArr.length; k++) {
					x = xArr[k];
					finalData[y][x] = data[y][x];
				}
			}
			
			return finalData;
		},
		
		_sortKeys: function (obj) {
			var arr = [];
			
			for (var i in obj) {
				arr.push(i);
			}
			
			arr.sort();
			return arr;
		},
		
		/**
		 * Returns a string of the map's data in JSON format.
		 * @return {String}
		 */
		mapDataString: function () {
			return JSON.stringify(this.mapData());
		},
		
		/**
		 * Inserts map data into the map at the given co-ordinates. Please note this
		 * is not used for setting a tile's value. This is used to add large sections
		 * of map data at the specified co-ordinates. To set an individual tile value,
		 * please use tile(x, y, val).
		 * @param {Number} x
		 * @param {Number} y
		 * @param {Array} val The map data array.
		 */
		//TODO: Write this function's internals!
		insertMapData: function (x, y, val) {
			// Loop the data and fill the map data with it
		},
		
		/**
		 * Rotates map data either -90 degrees (anti-clockwise), 90 degrees (clockwise) or
		 * 180 degrees. Useful when you want to define one section of a map and then re-use
		 * it in slightly different layouts.
		 * @param {Array} val The map data array to rotate.
		 * @param {Number} mode Either -90, 90 or 180 to denote the type of rotation to perform.
		 */
		//TODO: Write this function's internals!
		rotateData: function (val, mode) {
			switch (mode) {
				case -90:
					// Rotate the data
					break;
				
				case 180:
					break;
				
				case 90:
				default:
					break;
			}
		},
		
		translateDataBy: function (transX, transY) {
			var yArr = this.mapData(),
				newArr = [],
				x, y,
				xArr,
				i, k;
			
			for (y in yArr) {
				if (yArr.hasOwnProperty(y)) {
					i = parseInt(y, 10);
					xArr = yArr[i];
					
					newArr[i + transY] = newArr[i + transY] || {};
					
					for (x in xArr) {
						if (xArr.hasOwnProperty(x)) {
							k = parseInt(x, 10);
							newArr[i + transY][k + transX] = yArr[y][x];
						}
					}
				}
			}
			
			this.mapData(newArr, 0, 0);
		}
	});
	
	return IgeMap2d;
});
},{"irrelon-appcore":67}],40:[function(_dereq_,module,exports){
"use strict";

var appCore = _dereq_('irrelon-appcore');

appCore.module('IgeMapStack2d', function (IgeClass) {
	/**
	 * Creates a new map that has two dimensions (x and y) to it's data
	 * and allows multiple items to be stored or "stacked" on a single
	 * x, y map position.
	 */
	var IgeMapStack2d = IgeClass.extend({
		classId: 'IgeMapStack2d',
		
		init: function (data) {
			this._mapData = data || [];
		},
		
		/**
		 * Gets / sets the data stored at the specified map tile co-ordinates. If data already
		 * exists at the specified co-ordinates, it is replaced with the passed data.
		 * @param {Number} x
		 * @param {Number} y
		 * @param {Array=} val The array of data items to set at the specified co-ordinates.
		 * @return {*} This or an array of data items at the specified co-ordinates.
		 */
		tileData: function (x, y, val) {
			if (x !== undefined && y !== undefined) {
				if (val !== undefined) {
					// Assign a value
					this._mapData[y] = this._mapData[y] || [];
					this._mapData[y][x] = [];
					this._mapData[y][x].push(val);
					return this;
				} else {
					// No assignment so see if we have data to return
					if (this._mapData[y] !== undefined) {
						return this._mapData[y][x];
					}
				}
			}
			
			// Either no x, y was specified or there was
			// no data at the x, y so return undefined
			return undefined;
		},
		
		/**
		 * Gets the data stored at the specified co-ordinates and index.
		 * @param {Number} x
		 * @param {Number} y
		 * @param {Number} index
		 * @return {*} The current data stored at the specified point or undefined if no data exists.
		 */
		tileDataAtIndex: function (x, y, index) {
			if (this._mapData[y] && this._mapData[y][x]) {
				return this._mapData[y][x][index];
			}
			
			return undefined;
		},
		
		/**
		 * Adds a data item to the specified map tile co-ordinates.
		 * @param {Number} x
		 * @param {Number} y
		 * @param {*} val The data to add.
		 * @return {*} This on success or false on failure.
		 */
		push: function (x, y, val) {
			if (val !== undefined) {
				this._mapData[y] = this._mapData[y] || [];
				this._mapData[y][x] = this._mapData[y][x] || [];
				this._mapData[y][x].push(val);
				return this;
			}
			
			return false;
		},
		
		/**
		 * Removes a data item from the specified map tile co-ordinates.
		 * @param {Number} x
		 * @param {Number} y
		 * @param {*} val The data to remove.
		 * @return {*} This on success or false on failure.
		 */
		pull: function (x, y, val) {
			if (this._mapData[y] && this._mapData[y][x]) {
				this._mapData[y][x].pull(val);
				return this;
			}
			
			return false;
		},
		
		/**
		 * Checks if the tile area passed has any data stored in it. If
		 * so, returns true, otherwise false.
		 * @param x
		 * @param y
		 * @param width
		 * @param height
		 */
		collision: function (x, y, width, height) {
			var xi, yi;
			
			if (width === undefined) { width = 1; }
			if (height === undefined) { height = 1; }
			
			if (x !== undefined && y !== undefined) {
				for (yi = 0; yi < height; yi++) {
					for (xi = 0; xi < width; xi++) {
						if (this._mapData[y + yi] && this._mapData[y + yi][x + xi] && this._mapData[y + yi][x + xi].length) {
							return true;
						}
					}
				}
			}
			
			return false;
		},
		
		/**
		 * Clears any data set at the specified map tile co-ordinates.
		 * @param x
		 * @param y
		 * @return {Boolean} True if data was cleared or false if no data existed.
		 */
		clearData: function (x, y) {
			if (x !== undefined && y !== undefined) {
				if (this._mapData[y] !== undefined) {
					delete this._mapData[y][x];
					return true;
				}
			}
			
			return false;
		},
		
		/**
		 * Gets / sets the map's tile data.
		 * @param {Array} val The map data array.
		 * @return {*}
		 */
		mapData: function (val) {
			if (val !== undefined) {
				this._mapData = val;
				return this;
			}
			
			return this._mapData;
		}
	});
	
	return IgeMapStack2d;
});
},{"irrelon-appcore":67}],41:[function(_dereq_,module,exports){
"use strict";

var appCore = _dereq_('irrelon-appcore');

appCore.module('IgeMatrix2d', function (IgePoint3d) {
// TODO: Clean up the variable declarations in this file so they all run on the same var call at the top of the method.
	/**
	 * Creates a new transformation matrix.
	 */
	var IgeMatrix2d = function () {
		this.matrix = [
			1.0, 0.0, 0.0,
			0.0, 1.0, 0.0,
			0.0, 0.0, 1.0
		];
		
		this._rotateOrigin = new IgePoint3d(0, 0, 0);
		this._scaleOrigin = new IgePoint3d(0, 0, 0);
	};
	
	IgeMatrix2d.prototype = {
		matrix: null,
		
		/**
		 * Transform a point by this matrix. The parameter point will be modified with the transformation values.
		 * @param {IgePoint3d} point
		 * @return {IgePoint3d} The passed point.
		 */
		transformCoord: function (point, obj) {
			var x = point.x,
				y = point.y,
				tm = this.matrix;
			
			point.x = x * tm[0] + y * tm[1] + tm[2];
			point.y = x * tm[3] + y * tm[4] + tm[5];
			
			/* DEXCLUDE */
			if (isNaN(tm[0]) || isNaN(tm[1]) || isNaN(tm[2]) || isNaN(tm[3]) || isNaN(tm[4]) || isNaN(tm[5])) {
				obj.log('The matrix operation produced a NaN value!', 'error');
			}
			/* DEXCLUDE */
			
			return point;
		},
		
		/**
		 * Transform a point by this matrix in inverse. The parameter point will be modified with the transformation values.
		 * @param {IgePoint3d} point.
		 * @return {IgePoint3d} The passed point.
		 */
		transformCoordInverse: function (point, obj) {
			var x = point.x,
				y = point.y,
				tm = this.matrix;
			
			point.x = x * tm[0] - y * tm[1] + tm[2];
			point.y = x * tm[3] + y * tm[4] - tm[5];
			
			/* DEXCLUDE */
			if (isNaN(tm[0]) || isNaN(tm[1]) || isNaN(tm[2]) || isNaN(tm[3]) || isNaN(tm[4]) || isNaN(tm[5])) {
				obj.log('The matrix operation produced a NaN value!', 'error');
			}
			/* DEXCLUDE */
			
			return point;
		},
		
		transform: function (points, obj) {
			var pointIndex,
				pointCount = points.length;
			
			for (pointIndex = 0; pointIndex < pointCount; pointIndex++) {
				this.transformCoord(points[pointIndex], obj);
			}
			
			return points;
		},
		
		/**
		 * Create a new rotation matrix and set it up for the specified angle in radians.
		 * @param {Number} angle
		 * @return {IgeMatrix2d} A new matrix object.
		 */
		_newRotate: function (angle) {
			var m = new IgeMatrix2d();
			m.rotateTo(angle);
			return m;
		},
		
		rotateBy: function (angle) {
			var m = new IgeMatrix2d();
			
			m.translateBy(this._rotateOrigin.x, this._rotateOrigin.y);
			m.rotateTo(angle);
			m.translateBy(-this._rotateOrigin.x, -this._rotateOrigin.y);
			
			this.multiply(m);
			
			return this;
		},
		
		rotateTo: function (angle) {
			var tm = this.matrix,
				c = Math.cos(angle),
				s = Math.sin(angle);
			
			tm[0] = c;
			tm[1] = -s;
			tm[3] = s;
			tm[4] = c;
			
			/* DEXCLUDE */
			if (isNaN(tm[0]) || isNaN(tm[1]) || isNaN(tm[2]) || isNaN(tm[3]) || isNaN(tm[4]) || isNaN(tm[5])) {
				console.log('The matrix operation produced a NaN value!', 'error');
			}
			/* DEXCLUDE */
			
			return this;
		},
		
		/**
		 * Gets the rotation from the matrix and returns it in
		 * radians.
		 * @return {Number}
		 */
		rotationRadians: function () {
			return Math.asin(this.matrix[3]);
		},
		
		/**
		 * Gets the rotation from the matrix and returns it in
		 * degrees.
		 * @return {Number}
		 */
		rotationDegrees: function () {
			return Math.degrees(Math.acos(this.matrix[0]));
		},
		
		/**
		 * Create a scale matrix.
		 * @param {Number} x X scale magnitude.
		 * @param {Number} y Y scale magnitude.
		 *
		 * @return {IgeMatrix2d} a matrix object.
		 *
		 * @static
		 */
		_newScale: function (x, y) {
			var m = new IgeMatrix2d();
			
			m.matrix[0] = x;
			m.matrix[4] = y;
			
			return m;
		},
		
		scaleBy: function (x, y) {
			var m = new IgeMatrix2d();
			
			m.matrix[0] = x;
			m.matrix[4] = y;
			
			this.multiply(m);
			
			return this;
		},
		
		scaleTo: function (x, y) {
			var tm = this.matrix;
			//this.identity();
			tm[0] = x;
			tm[4] = y;
			
			/* DEXCLUDE */
			if (isNaN(tm[0]) || isNaN(tm[1]) || isNaN(tm[2]) || isNaN(tm[3]) || isNaN(tm[4]) || isNaN(tm[5])) {
				this.log('The matrix operation produced a NaN value!', 'error');
			}
			/* DEXCLUDE */
			
			return this;
		},
		
		/**
		 * Create a translation matrix.
		 * @param {Number} x X translation magnitude.
		 * @param {Number} y Y translation magnitude.
		 * @return {IgeMatrix2d} A new matrix object.
		 */
		_newTranslate: function (x, y) {
			var m = new IgeMatrix2d();
			
			m.matrix[2] = x;
			m.matrix[5] = y;
			
			return m;
		},
		
		translateBy: function (x, y) {
			var m = new IgeMatrix2d();
			
			m.matrix[2] = x;
			m.matrix[5] = y;
			
			this.multiply(m);
			
			return this;
		},
		
		/**
		 * Sets this matrix as a translation matrix.
		 * @param x
		 * @param y
		 */
		translateTo: function (x, y) {
			var tm = this.matrix;
			
			tm[2] = x;
			tm[5] = y;
			
			/* DEXCLUDE */
			if (isNaN(tm[0]) || isNaN(tm[1]) || isNaN(tm[2]) || isNaN(tm[3]) || isNaN(tm[4]) || isNaN(tm[5])) {
				this.log('The matrix operation produced a NaN value!', 'error');
			}
			/* DEXCLUDE */
			
			return this;
		},
		
		/**
		 * Copy into this matrix the given matrix values.
		 * @param {IgeMatrix2d} matrix
		 * @return {Object} "this".
		 */
		copy: function (matrix) {
			matrix = matrix.matrix;
			
			var tmatrix = this.matrix;
			tmatrix[0] = matrix[0];
			tmatrix[1] = matrix[1];
			tmatrix[2] = matrix[2];
			tmatrix[3] = matrix[3];
			tmatrix[4] = matrix[4];
			tmatrix[5] = matrix[5];
			tmatrix[6] = matrix[6];
			tmatrix[7] = matrix[7];
			tmatrix[8] = matrix[8];
			
			return this;
		},
		
		compare: function (matrix) {
			var thisMatrix = this.matrix,
				thatMatrix = matrix.matrix;
			
			for (var i = 0; i < 9; i++) {
				if (thisMatrix[i] !== thatMatrix[i]) {
					return false;
				}
			}
			
			return true;
		},
		
		/**
		 * Set this matrix to the identity matrix.
		 * @return {Object} "this".
		 */
		identity: function () {
			
			var m = this.matrix;
			m[0] = 1.0;
			m[1] = 0.0;
			m[2] = 0.0;
			
			m[3] = 0.0;
			m[4] = 1.0;
			m[5] = 0.0;
			
			m[6] = 0.0;
			m[7] = 0.0;
			m[8] = 1.0;
			
			return this;
		},
		
		/**
		 * Multiply this matrix by a given matrix.
		 * @param {IgeMatrix2d} m The IgeMatrix2d to multiply the
		 * current matrix by.
		 * @return {Object} "this".
		 */
		multiply: function (m) {
			var tm = this.matrix,
				mm = m.matrix,
				
				tm0 = tm[0],
				tm1 = tm[1],
				tm2 = tm[2],
				tm3 = tm[3],
				tm4 = tm[4],
				tm5 = tm[5],
				tm6 = tm[6],
				tm7 = tm[7],
				tm8 = tm[8],
				
				mm0 = mm[0],
				mm1 = mm[1],
				mm2 = mm[2],
				mm3 = mm[3],
				mm4 = mm[4],
				mm5 = mm[5],
				mm6 = mm[6],
				mm7 = mm[7],
				mm8 = mm[8];
			
			tm[0] = tm0 * mm0 + tm1 * mm3 + tm2 * mm6;
			tm[1] = tm0 * mm1 + tm1 * mm4 + tm2 * mm7;
			tm[2] = tm0 * mm2 + tm1 * mm5 + tm2 * mm8;
			tm[3] = tm3 * mm0 + tm4 * mm3 + tm5 * mm6;
			tm[4] = tm3 * mm1 + tm4 * mm4 + tm5 * mm7;
			tm[5] = tm3 * mm2 + tm4 * mm5 + tm5 * mm8;
			tm[6] = tm6 * mm0 + tm7 * mm3 + tm8 * mm6;
			tm[7] = tm6 * mm1 + tm7 * mm4 + tm8 * mm7;
			tm[8] = tm6 * mm2 + tm7 * mm5 + tm8 * mm8;
			
			return this;
		},
		
		/**
		 * Premultiply this matrix by a given matrix.
		 * @param {IgeMatrix2d} m The IgeMatrix2d to premultiply the
		 * current matrix by.
		 * @return {Object} "this".
		 */
		premultiply: function (m) {
			
			var m00 = m.matrix[0] * this.matrix[0] + m.matrix[1] * this.matrix[3] + m.matrix[2] * this.matrix[6];
			var m01 = m.matrix[0] * this.matrix[1] + m.matrix[1] * this.matrix[4] + m.matrix[2] * this.matrix[7];
			var m02 = m.matrix[0] * this.matrix[2] + m.matrix[1] * this.matrix[5] + m.matrix[2] * this.matrix[8];
			
			var m10 = m.matrix[3] * this.matrix[0] + m.matrix[4] * this.matrix[3] + m.matrix[5] * this.matrix[6];
			var m11 = m.matrix[3] * this.matrix[1] + m.matrix[4] * this.matrix[4] + m.matrix[5] * this.matrix[7];
			var m12 = m.matrix[3] * this.matrix[2] + m.matrix[4] * this.matrix[5] + m.matrix[5] * this.matrix[8];
			
			var m20 = m.matrix[6] * this.matrix[0] + m.matrix[7] * this.matrix[3] + m.matrix[8] * this.matrix[6];
			var m21 = m.matrix[6] * this.matrix[1] + m.matrix[7] * this.matrix[4] + m.matrix[8] * this.matrix[7];
			var m22 = m.matrix[6] * this.matrix[2] + m.matrix[7] * this.matrix[5] + m.matrix[8] * this.matrix[8];
			
			this.matrix[0] = m00;
			this.matrix[1] = m01;
			this.matrix[2] = m02;
			
			this.matrix[3] = m10;
			this.matrix[4] = m11;
			this.matrix[5] = m12;
			
			this.matrix[6] = m20;
			this.matrix[7] = m21;
			this.matrix[8] = m22;
			
			return this;
		},
		
		/**
		 * Creates a new inverse matrix from this matrix.
		 * @return {IgeMatrix2d} An inverse matrix.
		 */
		getInverse: function () {
			var tm = this.matrix;
			
			var m00 = tm[0],
				m01 = tm[1],
				m02 = tm[2],
				m10 = tm[3],
				m11 = tm[4],
				m12 = tm[5],
				m20 = tm[6],
				m21 = tm[7],
				m22 = tm[8],
				
				newMatrix = new IgeMatrix2d(),
				determinant = m00 * (m11 * m22 - m21 * m12) - m10 * (m01 * m22 - m21 * m02) + m20 * (m01 * m12 - m11 * m02);
			
			if (determinant === 0) {
				return null;
			}
			
			var m = newMatrix.matrix;
			
			m[0] = m11 * m22 - m12 * m21;
			m[1] = m02 * m21 - m01 * m22;
			m[2] = m01 * m12 - m02 * m11;
			
			m[3] = m12 * m20 - m10 * m22;
			m[4] = m00 * m22 - m02 * m20;
			m[5] = m02 * m10 - m00 * m12;
			
			m[6] = m10 * m21 - m11 * m20;
			m[7] = m01 * m20 - m00 * m21;
			m[8] = m00 * m11 - m01 * m10;
			
			newMatrix.multiplyScalar(1 / determinant);
			
			return newMatrix;
		},
		
		/**
		 * Multiply this matrix by a scalar.
		 * @param scalar {number} Scalar value.
		 * @return this
		 */
		multiplyScalar: function (scalar) {
			var i;
			
			for (i = 0; i < 9; i++) {
				this.matrix[i] *= scalar;
			}
			
			return this;
		},
		
		/**
		 * Transforms the passed rendering context by the current matrix
		 * data using the setTransform() method so that the matrix data
		 * is set non-cumulative with the previous matrix data.
		 * @param {CanvasRenderingContext2d} ctx The rendering context to
		 * set the transform matrix for.
		 */
		transformRenderingContextSet: function (ctx) {
			var m = this.matrix;
			ctx.setTransform(m[0], m[3], m[1], m[4], m[2], m[5]);
			return this;
		},
		
		/**
		 * Transforms the passed rendering context by the current matrix
		 * data using the transform() method so that the matrix data
		 * is set cumulative with the previous matrix data.
		 * @param {CanvasRenderingContext2d} ctx The rendering context to
		 * set the transform matrix for.
		 */
		transformRenderingContext: function (ctx) {
			var m = this.matrix;
			ctx.transform(m[0], m[3], m[1], m[4], m[2], m[5]);
			return this;
		}
	};
	
	return IgeMatrix2d;
});
},{"irrelon-appcore":67}],42:[function(_dereq_,module,exports){
"use strict";

var appCore = _dereq_('irrelon-appcore');

appCore.module('IgeObject', function (igeBase, IgeEventingClass) {
	/**
	 * Creates a new object.
	 */
	var IgeObject = IgeEventingClass.extend({
		classId: 'IgeObject',
		
		init: function () {
			this._newBorn = true;
			this._alive = true;
			this._mode = 0;
			this._mountMode = 0;
			this._parent = null;
			this._children = [];
			this._layer = 0;
			this._depth = 0;
			this._depthSortMode = 0;
			this._timeStream = [];
			this._inView = true;
			this._managed = 1;
			
			this._specialProp = [
				'_id',
				'_parent',
				'_children'
			];
		},
		
		/**
		 * Determines if the object is alive or not. The alive
		 * value is automatically set to false when the object's
		 * destroy() method is called. Useful for checking if
		 * an object that you are holding a reference to has been
		 * destroyed.
		 * @param {Boolean=} val The value to set the alive flag
		 * to.
		 * @example #Get the alive flag value
		 *     var entity = new IgeEntity();
		 *     console.log(entity.alive());
		 * @example #Set the alive flag value
		 *     var entity = new IgeEntity();
		 *     entity.alive(true);
		 * @return {*}
		 */
		alive: function (val) {
			if (val !== undefined) {
				this._alive = val;
				return this;
			}
			
			return this._alive;
		},
		
		/**
		 * Gets / set the managed mode from 0 to 2. 0 = off, 1 = static, 2 = dynamic.
		 *
		 * @param {Number=} val Set to 0 to switch off managed mode, 1 to set to static
		 * managed mode or 2 to dynamic managed mode. When in a managed mode and when
		 * the parent of this entity has an entity manager component enabled, the entity
		 * will be checked to see if it is inside the visible area of a viewport. If it
		 * is deemed not to be in a visible area (via it's AABB non-intersection with
		 * viewport view area) then it will either be un-mounted from the parent (mode 1)
		 * or marked as no longer in view (mode 2). Mode 2 in view = false will cause the
		 * entity to no longer be depth-sorted or rendered but will still have it's
		 * update() method called each frame allowing logic processing to occur as normal.
		 * The default managed mode is 1.
		 * @returns {*}
		 */
		managed: function (val) {
			if (val !== undefined) {
				this._managed = val;
				return this;
			}
			
			return this._managed;
		},
		
		/**
		 * Gets / sets the current object id. If no id is currently assigned and no
		 * id is passed to the method, it will automatically generate and assign a
		 * new id as a 16 character hexadecimal value typed as a string.
		 * @param {String=} id
		 * @example #Get the id of an entity
		 *     var entity = new IgeEntity();
		 *     console.log(entity.id());
		 * @example #Set the id of an entity
		 *     var entity = new IgeEntity();
		 *     entity.id('myNewId');
		 * @example #Set the id of an entity via chaining
		 *     var entity = new IgeEntity()
		 *         .id('myNewId');
		 * @return {*} Returns this when setting the value or the current value if none is specified.
		 */
		id: function (id) {
			if (id !== undefined) {
				// Check if we're changing the id
				if (id !== this._id) {
					// Check if this ID already exists in the object register
					if (ige._register[id]) {
						// Already an object with this ID!
						if (ige._register[id] !== this) {
							this.log('Cannot set ID of object to "' + id + '" because that ID is already in use by another object!', 'error');
						}
					} else {
						// Check if we already have an id assigned
						if (this._id && ige._register[this._id]) {
							// Unregister the old ID before setting this new one
							ige.unRegister(this);
						}
						
						this._id = id;
						
						// Now register this object with the object register
						ige.register(this);
						
						return this;
					}
				} else {
					// The same ID we already have is being applied,
					// ignore the request and return
					return this;
				}
			}
			
			if (!this._id) {
				// The item has no id so generate one automatically
				this._id = ige.newIdHex();
				ige.register(this);
			}
			
			return this._id;
		},
		
		/**
		 * Gets / sets the arbitrary category name that the object belongs to.
		 * @param {String=} val
		 * @example #Get the category of an entity
		 *     var entity = new IgeEntity();
		 *     console.log(entity.category());
		 * @example #Set the category of an entity
		 *     var entity = new IgeEntity();
		 *     entity.category('myNewCategory');
		 * @example #Set the category of an entity via chaining
		 *     var entity = new IgeEntity()
		 *         .category('myNewCategory');
		 * @example #Get all the entities belonging to a category
		 *     var entityArray = ige.$$('categoryName');
		 * @example #Remove the category of an entity
		 *     // Set category to some name
		 *     var entity = new IgeEntity()
		 *         .category('myCategory');
		 *
		 *     // Will output "myCategory"
		 *     console.log(entity.category());
		 *
		 *     // Now remove the category
		 *     entity.category('');
		 *
		 *     // Will return ""
		 *     console.log(entity.category());
		 * @return {*}
		 */
		category: function (val) {
			if (val !== undefined) {
				// Check if we already have a category
				if (this._category) {
					// Check if the category being assigned is different from
					// the current one
					if (this._category !== val) {
						// The category is different so remove this object
						// from the current category association
						ige.categoryUnRegister(this);
					}
				}
				
				this._category = val;
				
				// Check the category is not a blank string
				if (val) {
					// Now register this object with the category it has been assigned
					ige.categoryRegister(this);
				}
				return this;
			}
			
			return this._category;
		},
		
		/**
		 * DEPRECIATED - Use category() instead. A warning method to
		 * help developers move to the new groups system.
		 */
		group: function () {
			this.log('The group() method has been renamed to category(). Please update your code.', 'error');
		},
		
		/**
		 * Adds this entity to a group or groups passed as
		 * arguments.
		 * @param {*} groupName A group or array of group names
		 * to add the entity to.
		 * @example #Add entity to a single group
		 *     var entity = new IgeEntity();
		 *     entity.addGroup('g1');
		 * @example #Add entity to multiple groups
		 *     var entity = new IgeEntity();
		 *     entity.addGroup('g1', 'g2', 'g3');
		 * @example #Add entity to multiple groups via an array
		 *     var entity = new IgeEntity();
		 *     entity.addGroup(['g1', 'g2', 'g3']);
		 * @example #Add entity to multiple groups via multiple arrays
		 *     var entity = new IgeEntity();
		 *     entity.addGroup(['g1', 'g2', 'g3'], ['g4', 'g5']);
		 * @return {*}
		 */
		addGroup: function () {
			var arrCount = arguments.length,
				groupName,
				groupItemCount;
			
			while (arrCount--) {
				groupName = arguments[arrCount];
				
				// Check if the argument is an array
				if (groupName instanceof Array) {
					groupItemCount = groupName.length;
					
					// Add each group of the array to the entity
					while (groupItemCount--) {
						if (!this._groups || this._groups.indexOf(groupName[groupItemCount]) === -1) {
							this._groups = this._groups || [];
							this._groups.push(groupName[groupItemCount]);
							
							// Now register this object with the group it has been assigned
							ige.groupRegister(this, groupName[groupItemCount]);
						}
					}
				} else {
					if (!this._groups || this._groups.indexOf(groupName) === -1) {
						this._groups = this._groups || [];
						this._groups.push(groupName);
						
						// Now register this object with the group it has been assigned
						ige.groupRegister(this, groupName);
					}
				}
			}
			
			return this;
		},
		
		/**
		 * Checks if the entity is in the group or array of group
		 * names passed.
		 * @param {*} groupName A group name or array of names.
		 * @param {Boolean=} matchAllGroups If set to true, will cause
		 * the method to check if the entity is in ALL the groups,
		 * otherwise the method will check if the entity is in ANY group.
		 * @example #Check if the entity is in a group
		 *     var entity = new IgeEntity();
		 *     entity.addGroup('g1', 'g2');
		 *
		 *     // Will output true since entity is part of g1 group
		 *     console.log(entity.inGroup('g1', false);
		 *
		 *     // Will output false since entity is not part of g3 group
		 *     console.log(entity.inGroup('g3', false);
		 * @example #Check if the entity is in an array of groups using ANY and ALL options
		 *     var entity = new IgeEntity();
		 *     entity.addGroup('g1', 'g2');
		 *
		 *     // Will output true since entity is part of g1 group
		 *     console.log(entity.inGroup(['g1, 'g3'], false);
		 *
		 *     // Will output false since entity is not part of g3 group
		 *     console.log(entity.inGroup(['g1, 'g3'], true);
		 * @return {Boolean}
		 */
		inGroup: function (groupName, matchAllGroups) {
			if (groupName) {
				if (matchAllGroups) {
					return this.inAllGroups(groupName);
				} else {
					return this.inAnyGroup(groupName);
				}
			}
			
			return false;
		},
		
		/**
		 * Checks if the entity is in the specified group or
		 * array of groups. If multiple group names are passed,
		 * as an array the method will only return true if the
		 * entity is in ALL the passed groups.
		 * @param {*} groupName The name of the group or array
		 * if group names to check if this entity is a member of.
		 * @example #Check if entity belongs to all of the passed groups
		 *     // Add a couple of groups
		 *     var entity = new IgeEntity();
		 *     entity.addGroup(['g1', 'g2']);
		 *
		 *     // This will output "false" (entity is not part of g3)
		 *     console.log(entity.inAllGroups(['g1', 'g3']));
		 *
		 *     // This will output "true"
		 *     console.log(entity.inAllGroups('g1'));
		 *
		 *     // This will output "true"
		 *     console.log(entity.inAllGroups(['g1', 'g2']));
		 * @return {Boolean}
		 */
		inAllGroups: function (groupName) {
			var arrItem, arrCount;
			
			if (groupName instanceof Array) {
				arrCount = groupName.length;
				
				while (arrCount--) {
					arrItem = groupName[arrCount];
					
					if (arrItem) {
						if (!this._groups || this._groups.indexOf(arrItem) === -1) {
							return false;
						}
					}
				}
			} else {
				return !(!this._groups || this._groups.indexOf(groupName) === -1);
			}
			
			return true;
		},
		
		/**
		 * Checks if the entity is in the specified group or
		 * array of group names. If multiple group names are passed
		 * as an array, the method will return true if the entity
		 * is in ANY of the the passed groups.
		 * @param {*} groupName The name of the group or array of
		 * group names to check if this entity is a member of.
		 * @example #Check if entity belongs to any of the passed groups
		 *     // Add a couple of groups
		 *     var entity = new IgeEntity();
		 *     entity.addGroup('g1', 'g2');
		 *
		 *     // This will output "false"
		 *     console.log(entity.inAnyGroup('g3'));
		 *
		 *     // This will output "true"
		 *     console.log(entity.inAnyGroup(['g3', 'g1']));
		 * @return {Boolean}
		 */
		inAnyGroup: function (groupName) {
			var arrItem, arrCount;
			
			if (groupName instanceof Array) {
				arrCount = groupName.length;
				
				while (arrCount--) {
					arrItem = groupName[arrCount];
					
					if (arrItem) {
						if (this._groups && this._groups.indexOf(arrItem) > -1) {
							return true;
						}
					}
				}
			} else {
				return (this._groups && this._groups.indexOf(groupName) > -1);
			}
			
			return false;
		},
		
		/**
		 * Gets an array of all groups this entity belongs to.
		 * @example #Get array of groups entity belongs to
		 *     var entity = new IgeEntity();
		 *     entity.addGroup('g1', 'g2');
		 *
		 *     // This will output "['g1', 'g2']"
		 *     console.log(entity.groups());
		 * @return {*}
		 */
		groups: function () {
			return this._groups || [];
		},
		
		/**
		 * Gets the number of groups this entity belongs to.
		 * @example #Get number of groups entity belongs to
		 *     var entity = new IgeEntity();
		 *     entity.addGroup('g1', 'g2');
		 *
		 *     // This will output "2"
		 *     console.log(entity.groupCount());
		 * @return {Number}
		 */
		groupCount: function () {
			return this._groups ? this._groups.length : 0;
		},
		
		/**
		 * Removes the entity from the group or groups passed. This
		 * method accepts multiple arguments and will remove the entity
		 * from all groups passed as arguments.
		 * @param {*} groupName The name of the group or array of group
		 * names to remove this entity as a member of.
		 * @example #Remove entity from single group
		 *     var entity = new IgeEntity();
		 *     entity.addGroup('g1', 'g2');
		 *
		 *     // This will output "['g1', 'g2']"
		 *     console.log(entity.groups());
		 *
		 *     // Remove entity from a single group
		 *     entity.removeGroup('g1');
		 *
		 *     // This will output "['g2']"
		 *     console.log(entity.groups());
		 * @example #Remove entity from multiple groups
		 *     var entity = new IgeEntity();
		 *     entity.addGroup('g1', 'g3', 'g2');
		 *
		 *     // This will output "['g1', 'g3', 'g2']"
		 *     console.log(entity.groups());
		 *
		 *     // Remove entity from multiple groups
		 *     entity.removeGroup('g1', 'g3');
		 *
		 *     // This will output "['g2']"
		 *     console.log(entity.groups());
		 * @example #Remove entity from multiple groups via an array
		 *     var entity = new IgeEntity();
		 *     entity.addGroup('g1', 'g3', 'g2');
		 *
		 *     // This will output "['g1', 'g3', 'g2']"
		 *     console.log(entity.groups());
		 *
		 *     // Remove entity from multiple groups
		 *     entity.removeGroup(['g1', 'g3']);
		 *
		 *     // This will output "['g2']"
		 *     console.log(entity.groups());
		 * @example #Remove entity from multiple groups via multiple arrays
		 *     var entity = new IgeEntity();
		 *     entity.addGroup('g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7');
		 *
		 *     // This will output "['g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7']"
		 *     console.log(entity.groups());
		 *
		 *     // Remove entity from multiple groups
		 *     entity.removeGroup(['g1', 'g3'], ['g5', 'g6', 'g7']);
		 *
		 *     // This will output "['g2', 'g4']"
		 *     console.log(entity.groups());
		 * @return {*}
		 */
		removeGroup: function () {
			if (this._groups) {
				var arrCount = arguments.length,
					groupName,
					groupNameCount;
				
				while (arrCount--) {
					groupName = arguments[arrCount];
					
					if (groupName instanceof Array) {
						groupNameCount = groupName.length;
						
						while (groupNameCount--) {
							this._groups.pull(groupName[groupNameCount]);
							
							// Now un-register this object with the group it has been assigned
							ige.groupUnRegister(this, groupName[groupNameCount]);
						}
					} else {
						this._groups.pull(groupName);
						
						// Now un-register this object with the group it has been assigned
						ige.groupUnRegister(this, groupName);
					}
				}
			}
			
			return this;
		},
		
		/**
		 * Removes the entity from all groups it is a member of.
		 * @example #Remove entity from all groups
		 *     var entity = new IgeEntity();
		 *     entity.addGroup('g1', 'g3', 'g2');
		 *
		 *     // This will output "['g1', 'g3', 'g2']"
		 *     console.log(entity.groups());
		 *
		 *     // Remove all the groups
		 *     entity.removeAllGroups();
		 *
		 *     // This will output "[]"
		 *     console.log(entity.groups());
		 * @return {*}
		 */
		removeAllGroups: function () {
			if (this._groups) {
				// Loop through all groups and un-register one at a time
				var arr = this._groups,
					arrCount = arr.length;
				
				while (arrCount--) {
					ige.groupUnRegister(this, arr[arrCount]);
				}
				
				delete this._groups;
			}
			return this;
		},
		
		/**
		 * Adds a behaviour to the object's active behaviour list.
		 * @param {String} id
		 * @param {Function} behaviour
		 * @param {Boolean=} duringTick If true, will execute the behaviour
		 * during the tick() method instead of the update() method.
		 * @example #Add a behaviour with the id "myBehaviour"
		 *     var entity = new IgeEntity();
		 *     entity.addBehaviour('myBehaviour', function () {
	 *         // Code here will execute during each engine update for
	 *         // this entity. I can access the entity via the "this"
	 *         // keyword such as:
	 *         this._somePropertyOfTheEntity = 'moo';
	 *     });
		 *
		 *     // Now since each update we are setting _somePropertyOfTheEntity
		 *     // to equal "moo" we can console log the property and get
		 *     // the value as "moo"
		 *     console.log(entity._somePropertyOfTheEntity);
		 * @return {*} Returns this on success or false on failure.
		 */
		addBehaviour: function (id, behaviour, duringTick) {
			if (typeof(id) === 'string') {
				if (typeof(behaviour) === 'function') {
					if (duringTick) {
						this._tickBehaviours = this._tickBehaviours || [];
						this._tickBehaviours.push({
							id:id,
							method: behaviour
						});
					} else {
						this._updateBehaviours = this._updateBehaviours || [];
						this._updateBehaviours.push({
							id:id,
							method: behaviour
						});
					}
					
					return this;
				} else {
					this.log('The behaviour you passed is not a function! The second parameter of the call must be a function!', 'error');
				}
			} else {
				this.log('Cannot add behaviour to object because the specified behaviour id is not a string. You must provide two parameters with the addBehaviour() call, an id:String and a behaviour:Function. Adding a behaviour with an id allows you to remove it by it\'s id at a later stage!', 'error');
			}
			
			return false;
		},
		
		/**
		 * Removes a behaviour to the object's active behaviour list by it's id.
		 * @param {String} id
		 * @param {Boolean=} duringTick If true will look to remove the behaviour
		 * from the tick method rather than the update method.
		 * @example #Remove a behaviour with the id "myBehaviour"
		 *     var entity = new IgeEntity();
		 *     entity.addBehaviour('myBehaviour', function () {
	 *         // Code here will execute during each engine update for
	 *         // this entity. I can access the entity via the "this"
	 *         // keyword such as:
	 *         this._somePropertyOfTheEntity = 'moo';
	 *     });
		 *
		 *     // Now remove the "myBehaviour" behaviour
		 *     entity.removeBehaviour('myBehaviour');
		 * @return {*} Returns this on success or false on failure.
		 */
		removeBehaviour: function (id, duringTick) {
			if (id !== undefined) {
				var arr,
					arrCount;
				
				if (duringTick) {
					arr = this._tickBehaviours;
				} else {
					arr = this._updateBehaviours;
				}
				
				// Find the behaviour
				if (arr) {
					arrCount = arr.length;
					
					while (arrCount--) {
						if (arr[arrCount].id === id) {
							// Remove the item from the array
							arr.splice(arrCount, 1);
							return this;
						}
					}
				}
			}
			
			return false;
		},
		
		/**
		 * Checks if the object has the specified behaviour already added to it.
		 * @param {String} id
		 * @param {Boolean=} duringTick If true will look to remove the behaviour
		 * from the tick method rather than the update method.
		 * @example #Check for a behaviour with the id "myBehaviour"
		 *     var entity = new IgeEntity();
		 *     entity.addBehaviour('myBehaviour', function () {
	 *         // Code here will execute during each engine update for
	 *         // this entity. I can access the entity via the "this"
	 *         // keyword such as:
	 *         this._somePropertyOfTheEntity = 'moo';
	 *     });
		 *
		 *     // Now check for the "myBehaviour" behaviour
		 *     console.log(entity.hasBehaviour('myBehaviour')); // Will log "true"
		 * @return {*} Returns this on success or false on failure.
		 */
		hasBehaviour: function (id, duringTick) {
			if (id !== undefined) {
				var arr,
					arrCount;
				
				if (duringTick) {
					arr = this._tickBehaviours;
				} else {
					arr = this._updateBehaviours;
				}
				
				// Find the behaviour
				if (arr) {
					arrCount = arr.length;
					
					while (arrCount--) {
						if (arr[arrCount].id === id) {
							return true;
						}
					}
				}
			}
			
			return false;
		},
		
		/**
		 * Gets / sets the boolean flag determining if this object should have
		 * it's bounds drawn when the bounds for all objects are being drawn.
		 * In order for bounds to be drawn the viewport the object is being drawn
		 * to must also have draw bounds enabled.
		 * @param {Boolean} val
		 * @example #Enable draw bounds
		 *     var entity = new IgeEntity();
		 *     entity.drawBounds(true);
		 * @example #Disable draw bounds
		 *     var entity = new IgeEntity();
		 *     entity.drawBounds(false);
		 * @example #Get the current flag value
		 *     console.log(entity.drawBounds());
		 * @return {*}
		 */
		drawBounds: function (val) {
			if (val !== undefined) {
				this._drawBounds = val;
				return this;
			}
			
			return this._drawBounds;
		},
		
		/**
		 * Gets / sets the boolean flag determining if this object should have
		 * it's bounds data drawn when the bounds for all objects are being drawn.
		 * Bounds data includes the object ID and it's current depth etc.
		 * @param {Boolean} val
		 * @example #Enable draw bounds data
		 *     var entity = new IgeEntity();
		 *     entity.drawBoundsData(true);
		 * @example #Disable draw bounds data
		 *     var entity = new IgeEntity();
		 *     entity.drawBoundsData(false);
		 * @example #Get the current flag value
		 *     console.log(entity.drawBoundsData());
		 * @return {*}
		 */
		drawBoundsData: function (val) {
			if (val !== undefined) {
				this._drawBoundsData = val;
				return this;
			}
			
			return this._drawBoundsData;
		},
		
		/**
		 * Gets / sets the boolean flag determining if this object should have
		 * it's mouse position drawn, usually for debug purposes.
		 * @param {Boolean=} val
		 * @example #Enable draw mouse position data
		 *     var entity = new IgeEntity();
		 *     entity.drawMouse(true);
		 * @example #Disable draw mouse position data
		 *     var entity = new IgeEntity();
		 *     entity.drawMouse(false);
		 * @example #Get the current flag value
		 *     console.log(entity.drawMouse());
		 * @return {*}
		 */
		drawMouse: function (val) {
			if (val !== undefined) {
				this._drawMouse = val;
				return this;
			}
			
			return this._drawMouse;
		},
		
		/**
		 * Gets / sets the boolean flag determining if this object should have
		 * it's extra mouse data drawn for debug purposes. For instance, on tilemaps
		 * (IgeTileMap2d) instances, when enabled you will see the tile x and y
		 * co-ordinates currently being hoverered over by the mouse.
		 * @param {Boolean=} val
		 * @example #Enable draw mouse data
		 *     var entity = new IgeEntity();
		 *     entity.drawMouseData(true);
		 * @example #Disable draw mouse data
		 *     var entity = new IgeEntity();
		 *     entity.drawMouseData(false);
		 * @example #Get the current flag value
		 *     console.log(entity.drawMouseData());
		 * @return {*}
		 */
		drawMouseData: function (val) {
			if (val !== undefined) {
				this._drawMouseData = val;
				return this;
			}
			
			return this._drawMouseData;
		},
		
		/**
		 * Finds a child entity that matches the id mounted to this
		 * or any other child entity down the scenegraph chain. Will
		 * only return an object if the entity found has this entity
		 * as an ancestor (parent or parent of parent etc).
		 * @param {String} id The id of the entity to find.
		 * @returns {*} The entity or undefined.
		 */
		$: function (id) {
			var obj = ige.$(id);
			
			if (obj._parent === this) {
				// We found a child and it's parent is this object so return it
				return obj;
			} else {
				// Scan up the object's parent chain to see if this object is
				// an ancestor at some point
				var ancestor = obj.parent(this.id());
				
				if (ancestor) {
					return obj;
				} else {
					return undefined;
				}
			}
		},
		
		/**
		 * Finds all child entities of this or any child of this entity
		 * down the scenegraph who's category matches the category name
		 * passed.
		 * @param {String} categoryName The category name to scan for.
		 * @returns {Array}
		 */
		$$: function (categoryName) {
			var objArr = ige.$$(categoryName),
				arrCount = objArr.length,
				obj,
				finalArr = [],
				thisId = this.id();
			
			// Scan all objects that have the specified category
			// and see if we are it's parent or an ancestor
			while (arrCount--) {
				obj = objArr[arrCount];
				if (obj._parent === this || obj.parent(thisId)) {
					finalArr.push(obj);
				}
			}
			
			return finalArr;
		},
		
		/**
		 * Returns the object's parent object (the object that
		 * it is mounted to).
		 * @param {String=} id Optional, if present will scan up
		 * the parent chain until a parent with the matching id is
		 * found. If none is found, returns undefined.
		 * @example #Get the object parent
		 *     // Create a couple of entities and give them ids
		 *     var entity1 = new IgeEntity().id('entity1'),
		 *         entity2 = new IgeEntity().id('entity2');
		 *
		 *     // Mount entity2 to entity1
		 *     entity2.mount(entity1);
		 *
		 *     // Get the parent of entity2 (which is entity1)
		 *     var parent = entity2.parent();
		 *
		 *     // Log the parent's id (will output "entity1")
		 *     console.log(parent.id());
		 * @return {*}
		 */
		parent: function (id) {
			if (!id) {
				return this._parent;
			}
			
			if (this._parent) {
				if (this._parent.id() === id) {
					return this._parent;
				} else {
					return this._parent.parent(id);
				}
			}
			
			return undefined;
		},
		
		/**
		 * Returns the object's children as an array of objects.
		 * @example #Get the child objects array
		 *     // Create a couple of entities and give them ids
		 *     var entity1 = new IgeEntity().id('entity1'),
		 *         entity2 = new IgeEntity().id('entity2');
		 *
		 *     // Mount entity2 to entity1
		 *     entity2.mount(entity1);
		 *
		 *     // Get the chilren array entity1
		 *     var childArray = entity1.children();
		 *
		 *     // Log the child array contents (will contain entity2)
		 *     console.log(childArray);
		 * @return {Array} The array of child objects.
		 */
		children: function () {
			return this._children;
		},
		
		/**
		 * Mounts this object to the passed object in the scenegraph.
		 * @param {IgeObject} obj
		 * @example #Mount an entity to another entity
		 *     // Create a couple of entities and give them ids
		 *     var entity1 = new IgeEntity().id('entity1'),
		 *         entity2 = new IgeEntity().id('entity2');
		 *
		 *     // Mount entity2 to entity1
		 *     entity2.mount(entity1);
		 * @return {*} Returns this on success or false on failure.
		 */
		mount: function (obj) {
			if (obj) {
				if (obj === this) {
					this.log('Cannot mount an object to itself!', 'error');
					return this;
				}
				
				if (obj._children) {
					// Check that the engine will allow us to register this object
					this.id(); // Generates a new id if none is currently set, and registers it on the object register!
					
					if (this._parent) {
						if (this._parent === obj) {
							// We are already mounted to the parent!
							return this;
						} else {
							// We are already mounted to a different parent
							this.unMount();
						}
					}
					
					this._parent = obj;
					
					// Check if we need to set the ignore camera flag
					if (!this._ignoreCamera && this._parent._ignoreCamera) {
						this._ignoreCamera = this._parent._ignoreCamera;
						
						/*if (this.ignoreCameraComposite) {
						 this.ignoreCameraComposite(this._parent._ignoreCamera);
						 }*/
					}
					
					// Make sure we keep the child's room id in sync with it's parent
					if (this._parent._streamRoomId) {
						this._streamRoomId = this._parent._streamRoomId;
					}
					
					obj._children.push(this);
					this._parent._childMounted(this);
					
					if (obj.updateTransform) {
						obj.updateTransform();
						obj.aabb(true);
					}
					
					if (obj._compositeCache) {
						this._compositeParent = true;
					} else {
						delete this._compositeParent;
					}
					
					this._mounted(this._parent);
					
					this.emit('mounted', this._parent);
					
					return this;
				} else {
					// The object has no _children array!
					this.log('Cannot mount object because it has no _children array! If you are mounting to a custom class, ensure that you have called the prototype.init() method of your super-class during the init of your custom class.', 'warning');
					return false;
				}
			} else {
				this.log('Cannot mount non-existent object!', 'error');
			}
		},
		
		/**
		 * Unmounts this object from it's parent object in the scenegraph.
		 * @example #Unmount an entity from another entity
		 *     // Create a couple of entities and give them ids
		 *     var entity1 = new IgeEntity().id('entity1'),
		 *         entity2 = new IgeEntity().id('entity2');
		 *
		 *     // Mount entity2 to entity1
		 *     entity2.mount(entity1);
		 *
		 *     // Now unmount entity2 from entity1
		 *     entity2.unMount();
		 * @return {*} Returns this on success or false on failure.
		 */
		unMount: function () {
			if (this._parent) {
				var childArr = this._parent._children,
					index = childArr.indexOf(this),
					oldParent = this._parent;
				
				if (index > -1) {
					// Found this in the parent._children array so remove it
					childArr.splice(index, 1);
					
					this._parent._childUnMounted(this);
					this._parent = null;
					
					this._unMounted(oldParent);
					
					return this;
				} else {
					// Cannot find this in the parent._children array
					return false;
				}
			} else {
				return false;
			}
		},
		
		/**
		 * Determines if the object has a parent up the scenegraph whose
		 * id matches the one passed. Will traverse each parent object
		 * checking if the id matches. This information will be cached when
		 * first called and can be refreshed by setting the "fresh" parameter
		 * to true.
		 * @param {String} parentId The id of the parent to check for.
		 * @param {Boolean=} fresh If true will force a full check instead of
		 * using the cached value from an earlier check.
		 */
		hasParent: function (parentId, fresh) {
			var bool = false;
			
			// Check for a cached value
			if (!fresh && this._hasParent && this._hasParent[parentId] !== undefined) {
				return this._hasParent[parentId];
			}
			
			if (this._parent) {
				if (this._parent.id() === parentId) {
					bool = true;
				} else {
					bool = this._parent.hasParent(parentId, fresh);
				}
			}
			
			this._hasParent = this._hasParent || {};
			this._hasParent[parentId] = bool;
			
			return bool;
		},
		
		/**
		 * Clones the object and all it's children and returns a new object.
		 */
		clone: function (options) {
			// Make sure we have an options object
			if (options === undefined) { options = {}; }
			
			// Set some default option values
			if (options.id === undefined) { options.id = false; }
			if (options.mount === undefined) { options.mount = false; }
			if (options.transform === undefined) { options.transform = true; }
			
			// Loop all children and clone them, then return cloned version of ourselves
			var newObject = eval(this.stringify(options));
			
			return newObject;
		},
		
		/**
		 * Gets / sets the positioning mode of the entity.
		 * @param {Number=} val 0 = 2d, 1 = isometric
		 * @example #Set the positioning mode to 2d
		 *     var entity = new IgeEntity()
		 *         .mode(0);
		 * @example #Set the positioning mode to isometric
		 *     var entity = new IgeEntity()
		 *         .mode(1);
		 * @return {*}
		 */
		mode: function (val) {
			if (val !== undefined) {
				this._mode = val;
				return this;
			}
			
			return this._mode;
		},
		
		/**
		 * Gets / sets if this object should be positioned isometrically
		 * or in 2d.
		 * @param {Boolean} val Set to true to position this object in
		 * isometric space or false to position it in 2d space.
		 * @example #Set the positioning mode to isometric
		 *     var entity = new IgeEntity()
		 *         .isometric(true);
		 * @example #Set the positioning mode to 2d
		 *     var entity = new IgeEntity()
		 *         .isometric(false);
		 * @return {*}
		 */
		isometric: function (val) {
			if (val === true) {
				this._mode = 1;
				return this;
			}
			
			if (val === false) {
				this._mode = 0;
				return this;
			}
			
			return this._mode === 1;
		},
		
		/**
		 * Gets / sets if objects mounted to this object should be positioned
		 * and depth-sorted in an isometric fashion or a 2d fashion.
		 * @param {Boolean=} val Set to true to enabled isometric positioning
		 * and depth sorting of objects mounted to this object, or false to
		 * enable 2d positioning and depth-sorting of objects mounted to this
		 * object.
		 * @example #Set children to be positioned and depth sorted in 2d
		 *     var entity = new IgeEntity()
		 *         .isometricMounts(false);
		 * @example #Set children to be positioned and depth sorted in isometric
		 *     var entity = new IgeEntity()
		 *         .isometricMounts(true);
		 * @return {*}
		 */
		isometricMounts: function (val) {
			if (val === true) {
				this._mountMode = 1;
				return this;
			}
			
			if (val === false) {
				this._mountMode = 0;
				return this;
			}
			
			return this._mountMode === 1;
		},
		
		/**
		 * Gets / sets the indestructible flag. If set to true, the object will
		 * not be destroyed even if a call to the destroy() method is made.
		 * @param {Number=} val
		 * @example #Set an entity to indestructible
		 *     var entity = new IgeEntity()
		 *         .indestructible(true);
		 * @example #Set an entity to destructible
		 *     var entity = new IgeEntity()
		 *         .indestructible(false);
		 * @example #Get an entity's indestructible flag value
		 *     var entity = new IgeEntity()
		 *     console.log(entity.indestructible());
		 * @return {*} Returns this when setting the value or the current value if none is specified.
		 */
		indestructible: function (val) {
			if (typeof(val) !== 'undefined') {
				this._indestructible = val;
				return this;
			}
			
			return this._indestructible;
		},
		
		/**
		 * Gets / sets the current entity layer. This affects how the entity is depth-sorted
		 * against other entities of the same parent. Please note that entities are first sorted
		 * by their layer and then by their depth, and only entities of the same layer will be
		 * sorted against each other by their depth values.
		 * @param {Number=} val
		 * @example #Set an entity's layer to 22
		 *     var entity = new IgeEntity()
		 *         .layer(22);
		 * @example #Get an entity's layer value
		 *     var entity = new IgeEntity()
		 *     console.log(entity.layer());
		 * @example #How layers and depths are handled together
		 *     var entity1 = new IgeEntity(),
		 *         entity2 = new IgeEntity(),
		 *         entity3 = new IgeEntity();
		 *
		 *     // Set entity1 to at layer zero and depth 100
		 *     entity1.layer(0)
		 *         .depth(100);
		 *
		 *     // Set entity2 and 3 to be at layer 1
		 *     entity2.layer(1);
		 *     entity3.layer(1);
		 *
		 *     // Set entity3 to have a higher depth than entity2
		 *     entity2.depth(0);
		 *     entity3.depth(1);
		 *
		 *     // The engine sorts first based on layer from lowest to highest
		 *     // and then within each layer, by depth from lowest to highest.
		 *     // This means that entity1 will be drawn before entity 2 and 3
		 *     // because even though it's depth is higher, it is not on the same
		 *     // layer as entity 2 and 3.
		 *
		 *     // Based on the layers and depths we have assigned, here
		 *     // is how the engine will sort the draw order of the entities
		 *     // entity1
		 *     // entity2
		 *     // entity3
		 * @return {*} Returns this when setting the value or the current value if none is specified.
		 */
		layer: function (val) {
			if (val !== undefined) {
				this._layer = val;
				return this;
			}
			
			return this._layer;
		},
		
		/**
		 * Gets / sets the current render depth of the object (higher depths
		 * are drawn over lower depths). Please note that entities are first sorted
		 * by their layer and then by their depth, and only entities of the same layer will be
		 * sorted against each other by their depth values.
		 * @param {Number=} val
		 * @example #Set an entity's depth to 1
		 *     var entity = new IgeEntity()
		 *         .depth(1);
		 * @example #Get an entity's depth value
		 *     var entity = new IgeEntity()
		 *     console.log(entity.depth());
		 * @example #How layers and depths are handled together
		 *     var entity1 = new IgeEntity(),
		 *         entity2 = new IgeEntity(),
		 *         entity3 = new IgeEntity();
		 *
		 *     // Set entity1 to at layer zero and depth 100
		 *     entity1.layer(0)
		 *         .depth(100);
		 *
		 *     // Set entity2 and 3 to be at layer 1
		 *     entity2.layer(1);
		 *     entity3.layer(1);
		 *
		 *     // Set entity3 to have a higher depth than entity2
		 *     entity2.depth(0);
		 *     entity3.depth(1);
		 *
		 *     // The engine sorts first based on layer from lowest to highest
		 *     // and then within each layer, by depth from lowest to highest.
		 *     // This means that entity1 will be drawn before entity 2 and 3
		 *     // because even though it's depth is higher, it is not on the same
		 *     // layer as entity 2 and 3.
		 *
		 *     // Based on the layers and depths we have assigned, here
		 *     // is how the engine will sort the draw order of the entities
		 *     // entity1
		 *     // entity2
		 *     // entity3
		 * @return {*} Returns this when setting the value or the current value if none is specified.
		 */
		depth: function (val) {
			if (val !== undefined) {
				this._depth = val;
				return this;
			}
			
			return this._depth;
		},
		
		/**
		 * Loops through all child objects of this object and destroys them
		 * by calling each child's destroy() method then clears the object's
		 * internal _children array.
		 */
		destroyChildren: function () {
			var arr = this._children,
				arrCount;
			
			if (arr) {
				arrCount = arr.length;
				
				while (arrCount--) {
					arr[arrCount].destroy();
				}
			}
			
			this._children = [];
			
			return this;
		},
		
		/**
		 * Removes all references to any behaviour methods that were added to
		 * this object.
		 */
		destroyBehaviours: function () {
			delete this._updateBehaviours;
			delete this._tickBehaviours;
		},
		
		/**
		 * Loops through all components added to this object and calls their
		 * destroy() method, then removes any references to the components.
		 * @return {*}
		 */
		destroyComponents: function () {
			var arr = this._components,
				arrCount;
			
			if (arr) {
				arrCount = arr.length;
				
				while (arrCount--) {
					if (arr[arrCount].destroy) {
						arr[arrCount].destroy();
					}
				}
			}
			
			delete this._components;
			
			return this;
		},
		
		/**
		 * Gets / sets the depth sort mode that is used when
		 * depth sorting this object's children against each other. This
		 * mode only applies if this object's mount mode is isometric,
		 * as set by calling isometricMounts(true). If the mount mode is
		 * 2d, the depth sorter will use a very fast 2d depth sort that
		 * does not use 3d bounds at all.
		 * @param {Number=} val The mode to use when depth sorting
		 * this object's children, given as an integer value.
		 * @example #Turn off all depth sorting for this object's children
		 *     entity.depthSortMode(-1);
		 * @example #Use 3d bounds when sorting this object's children
		 *     entity.depthSortMode(0);
		 * @example #Use 3d bounds optimised for mostly cube-shaped bounds when sorting this object's children
		 *     entity.depthSortMode(1);
		 * @example #Use 3d bounds optimised for all cube-shaped bounds when sorting this object's children
		 *     entity.depthSortMode(2);
		 * @return {*}
		 */
		depthSortMode: function (val) {
			if (val !== undefined) {
				this._depthSortMode = val;
				return this;
			}
			
			return this._depthSortMode;
		},
		
		/**
		 * Sorts the _children array by the layer and then depth of each object.
		 */
		depthSortChildren: function () {
			if (this._depthSortMode !== -1) {
				// TODO: Optimise this method, it is not especially efficient at the moment!
				var arr = this._children,
					arrCount,
					sortObj,
					i, j;
				
				if (arr) {
					arrCount = arr.length;
					
					// See if we can bug-out early
					if (arrCount > 1) {
						// Check if the mount mode is isometric
						if (this._mountMode === 1) {
							// Check the depth sort mode
							if (this._depthSortMode === 0) { // Slowest, uses 3d bounds
								// Calculate depths from 3d bounds
								sortObj = {
									adj: [],
									c: [],
									p: [],
									order: [],
									order_ind: arrCount - 1
								};
								
								for (i = 0; i < arrCount; ++i) {
									sortObj.c[i] = 0;
									sortObj.p[i] = -1;
									
									for (j = i + 1; j < arrCount; ++j) {
										sortObj.adj[i] = sortObj.adj[i] || [];
										sortObj.adj[j] = sortObj.adj[j] || [];
										
										if (arr[i]._inView && arr[j]._inView && arr[i]._projectionOverlap && arr[j]._projectionOverlap) {
											if (arr[i]._projectionOverlap(arr[j])) {
												if (arr[i].isBehind(arr[j])) {
													sortObj.adj[j].push(i);
												} else {
													sortObj.adj[i].push(j);
												}
											}
										}
									}
								}
								
								for (i = 0; i < arrCount; ++i) {
									if (sortObj.c[i] === 0) {
										this._depthSortVisit(i, sortObj);
									}
								}
								
								for (i = 0; i < sortObj.order.length; i++) {
									arr[sortObj.order[i]].depth(i);
								}
								
								this._children.sort(function (a, b) {
									var layerIndex = b._layer - a._layer;
									
									if (layerIndex === 0) {
										// On same layer so sort by depth
										return b._depth - a._depth;
									} else {
										// Not on same layer so sort by layer
										return layerIndex;
									}
								});
							}
							
							if (this._depthSortMode === 1) { // Medium speed, optimised for almost-cube shaped 3d bounds
								// Now sort the entities by depth
								this._children.sort(function (a, b) {
									var layerIndex = b._layer - a._layer;
									
									if (layerIndex === 0) {
										// On same layer so sort by depth
										//if (a._projectionOverlap(b)) {
										if (a.isBehind(b)) {
											return -1;
										} else {
											return 1;
										}
										//}
									} else {
										// Not on same layer so sort by layer
										return layerIndex;
									}
								});
							}
							
							if (this._depthSortMode === 2) { // Fastest, optimised for cube-shaped 3d bounds
								while (arrCount--) {
									sortObj = arr[arrCount];
									j = sortObj._translate;
									
									if (j) {
										sortObj._depth = j.x + j.y + j.z;
									}
								}
								
								// Now sort the entities by depth
								this._children.sort(function (a, b) {
									var layerIndex = b._layer - a._layer;
									
									if (layerIndex === 0) {
										// On same layer so sort by depth
										return b._depth - a._depth;
									} else {
										// Not on same layer so sort by layer
										return layerIndex;
									}
								});
							}
						} else { // 2d mode
							// Now sort the entities by depth
							this._children.sort(function (a, b) {
								var layerIndex = b._layer - a._layer;
								
								if (layerIndex === 0) {
									// On same layer so sort by depth
									return b._depth - a._depth;
								} else {
									// Not on same layer so sort by layer
									return layerIndex;
								}
							});
						}
					}
				}
			}
		},
		
		/**
		 * Gets / sets the view checking flag that if set to true
		 * will ask the engine to check during each tick if this
		 * object is actually "on screen" or not, and bypass it
		 * if it is not. The default is this flag set to false.
		 * @param {Boolean=} val The boolean flag value.
		 * @return {*}
		 */
		viewChecking: function (val) {
			if (val !== undefined) {
				this._viewChecking = val;
				return this;
			}
			
			return this._viewChecking;
		},
		
		/**
		 * ALPHA CODE DO NOT USE YET.
		 * When view checking is enabled, this method is called to
		 * determine if this object is within the bounds of an active
		 * viewport, essentially determining if the object is
		 * "on screen" or not.
		 */
		viewCheckChildren: function () {
			if (ige._currentViewport) {
				var arr = this._children,
					arrCount = arr.length,
					vpViewArea = ige._currentViewport.viewArea(),
					item;
				
				while (arrCount--) {
					item = arr[arrCount];
					
					if (item._alwaysInView) {
						item._inView = true;
					} else {
						if (item.aabb) {
							// Check the entity to see if its bounds are "inside" the
							// viewport's visible area
							if (vpViewArea.intersects(item.aabb(true))) {
								// The entity is inside the viewport visible area
								item._inView = true;
							} else {
								item._inView = false;
							}
						} else {
							item._inView = false;
						}
					}
				}
			}
			
			return this;
		},
		
		update: function (ctx, tickDelta) {
			// Check that we are alive before processing further
			if (this._alive) {
				if (this._newBorn) { this._newBorn = false; }
				var arr = this._children,
					arrCount,
					ts, td;
				
				if (arr) {
					arrCount = arr.length;
					
					// Depth sort all child objects
					if (arrCount && !ige._headless) {
						if (igeBase.igeConfig.debug._timing) {
							if (!ige._timeSpentLastTick[this.id()]) {
								ige._timeSpentLastTick[this.id()] = {};
							}
							
							ts = new Date().getTime();
							this.depthSortChildren();
							td = new Date().getTime() - ts;
							ige._timeSpentLastTick[this.id()].depthSortChildren = td;
						} else {
							this.depthSortChildren();
						}
					}
					
					// Loop our children and call their update methods
					if (igeBase.igeConfig.debug._timing) {
						while (arrCount--) {
							ts = new Date().getTime();
							arr[arrCount].update(ctx, tickDelta);
							td = new Date().getTime() - ts;
							if (arr[arrCount]) {
								if (!ige._timeSpentInTick[arr[arrCount].id()]) {
									ige._timeSpentInTick[arr[arrCount].id()] = 0;
								}
								
								if (!ige._timeSpentLastTick[arr[arrCount].id()]) {
									ige._timeSpentLastTick[arr[arrCount].id()] = {};
								}
								
								ige._timeSpentInTick[arr[arrCount].id()] += td;
								ige._timeSpentLastTick[arr[arrCount].id()].tick = td;
							}
						}
					} else {
						while (arrCount--) {
							arr[arrCount].update(ctx, tickDelta);
						}
					}
				}
			}
		},
		
		/**
		 * Processes the actions required each render frame.
		 */
		tick: function (ctx) {
			// Check that we are alive before processing further
			if (this._alive) {
				var arr = this._children,
					arrCount,
					ts, td;
				
				if (this._viewChecking) {
					// Set the in-scene flag for each child based on
					// the current viewport
					this.viewCheckChildren();
				}
				
				// Loop the child objects of this object
				if (arr) {
					arrCount = arr.length;
					
					// Loop our children and call their tick methods
					if (igeBase.igeConfig.debug._timing) {
						while (arrCount--) {
							if (!arr[arrCount]) {
								this.log('Object _children is undefined for index ' + arrCount + ' and _id: ' + this._id, 'error');
								continue;
							}
							
							if (!arr[arrCount]._newBorn) {
								ctx.save();
								ts = new Date().getTime();
								arr[arrCount].tick(ctx);
								td = new Date().getTime() - ts;
								if (arr[arrCount]) {
									if (!ige._timeSpentInTick[arr[arrCount].id()]) {
										ige._timeSpentInTick[arr[arrCount].id()] = 0;
									}
									
									if (!ige._timeSpentLastTick[arr[arrCount].id()]) {
										ige._timeSpentLastTick[arr[arrCount].id()] = {};
									}
									
									ige._timeSpentInTick[arr[arrCount].id()] += td;
									ige._timeSpentLastTick[arr[arrCount].id()].tick = td;
								}
								ctx.restore();
							}
						}
					} else {
						while (arrCount--) {
							if (!arr[arrCount]) {
								this.log('Object _children is undefined for index ' + arrCount + ' and _id: ' + this._id, 'error');
								continue;
							}
							
							if (!arr[arrCount]._newBorn) {
								ctx.save();
								arr[arrCount].tick(ctx);
								ctx.restore();
							}
						}
					}
				}
			}
		},
		
		_depthSortVisit: function (u, sortObj) {
			var arr = sortObj.adj[u],
				arrCount = arr.length,
				i, v;
			
			sortObj.c[u] = 1;
			
			for (i = 0; i < arrCount; ++i) {
				v = arr[i];
				
				if (sortObj.c[v] === 0) {
					sortObj.p[v] = u;
					this._depthSortVisit(v, sortObj);
				}
			}
			
			sortObj.c[u] = 2;
			sortObj.order[sortObj.order_ind] = u;
			--sortObj.order_ind;
		},
		
		/**
		 * Handles screen resize events. Calls the _resizeEvent method of
		 * every child object mounted to this object.
		 * @param event
		 * @private
		 */
		_resizeEvent: function (event) {
			var arr = this._children,
				arrCount;
			
			if (arr) {
				arrCount = arr.length;
				
				while (arrCount--) {
					arr[arrCount]._resizeEvent(event);
				}
			}
			
			
		},
		
		/**
		 * Calls each behaviour method for the object.
		 * @private
		 */
		_processUpdateBehaviours: function (ctx, tickDelta) {
			var arr = this._updateBehaviours,
				arrCount;
			
			if (arr) {
				arrCount = arr.length;
				while (arrCount--) {
					arr[arrCount].method.apply(this, arguments);
				}
			}
		},
		
		/**
		 * Calls each behaviour method for the object.
		 * @private
		 */
		_processTickBehaviours: function (ctx) {
			var arr = this._tickBehaviours,
				arrCount;
			
			if (arr) {
				arrCount = arr.length;
				while (arrCount--) {
					arr[arrCount].method.apply(this, arguments);
				}
			}
		},
		
		/**
		 * Called when a child object is mounted to this object.
		 * @param obj
		 * @private
		 */
		_childMounted: function (obj) {
			this._resizeEvent(null);
		},
		
		/**
		 * Called when a child object is un-mounted to this object.
		 * @param obj
		 * @private
		 */
		_childUnMounted: function (obj) {},
		
		/**
		 * Called when this object is mounted to another object.
		 * @param obj
		 * @private
		 */
		_mounted: function (obj) {
			
		},
		
		/**
		 * Called when this object is un-mounted from it's parent.
		 * @param obj
		 * @private
		 */
		_unMounted: function (obj) {
			
		},
		
		/**
		 * Destroys the object and all it's child objects, removing them from the
		 * scenegraph and from memory.
		 */
		destroy: function () {
			// Remove ourselves from any parent
			this.unMount();
			
			// Remove any children
			if (this._children) {
				this.destroyChildren();
			}
			
			// Remove any components
			this.destroyComponents();
			
			// Remove any behaviours
			this.destroyBehaviours();
			
			// Remove the object from the lookup system
			ige.unRegister(this);
			ige.categoryUnRegister(this);
			ige.groupUnRegister(this);
			
			// Set a flag in case a reference to this object
			// has been held somewhere, shows that the object
			// should no longer be interacted with
			this._alive = false;
			
			// Remove the event listeners array in case any
			// object references still exist there
			delete this._eventListeners;
			
			return this;
		},
		
		objSave: function () {
			return {igeClass: this.classId(), data: this._objSaveReassign(this, [])};
		},
		
		objLoad: function (obj) {
			this._objLoadReassign(this, obj.data);
		},
		
		saveSpecialProp: function (obj, i) {
			switch (i) {
				case '_id':
					if (obj._id) {
						return {_id: obj._id};
					}
					break;
				
				case '_parent':
					if (obj._parent) {
						return {_parent: obj._parent.id()};
					}
					break;
				
				case '_children':
					if (obj._children.length) {
						var childIndex,
							child,
							arr = [];
						
						for (childIndex = 0; childIndex < obj._children.length; childIndex++) {
							child = obj._children[childIndex];
							arr.push(child.objSave());
						}
						
						return {_children: arr};
					}
					break;
			}
			
			return undefined;
		},
		
		loadSpecialProp: function (obj, i) {
			switch (i) {
				case '_id':
					return {_id: obj[i]};
					break;
				
				case '_parent':
					return {_parent: obj[i]};
					break;
				
				case '_children':
					return {_children: obj[i]};
					break;
			}
			return undefined;
		},
		
		loadGraph: function (obj) {
			if (obj.igeClass && obj.data) {
				// Create a new class instance
				var classInstance = ige.newClassInstance(obj.igeClass),
					newId,
					childArr,
					childIndex,
					parentId;
				
				classInstance.objLoad(obj);
				
				if (classInstance._parent) {
					// Record the id and delete it
					parentId = classInstance._parent;
					delete classInstance._parent;
				}
				
				// Process item id
				if (classInstance._id) {
					newId = classInstance._id;
					delete classInstance._id;
					
					classInstance.id(newId);
				}
				
				// Check for children and process them if exists
				if (classInstance._children && classInstance._children.length) {
					childArr = classInstance._children;
					classInstance._children = [];
					
					for (childIndex = 0; childIndex < childArr.length; childIndex++) {
						classInstance.loadGraph(childArr[childIndex]);
					}
				}
				
				// Now mount the instance if it has a parent
				classInstance.mount(this);
			}
		},
		
		_objSaveReassign: function (obj, ref) {
			var copyObj,
				specialKeys = this._specialProp,
				refIndex,
				specProp,
				specPropKey,
				i;
			
			if (typeof(obj) === 'object' && !(obj instanceof Array)) {
				copyObj = {};
				
				for (i in obj) {
					if (obj.hasOwnProperty(i)) {
						if (typeof(obj[i]) === 'object') {
							if (specialKeys.indexOf(i) === -1) {
								// Check if the ref already exists
								refIndex = ref.indexOf(obj[i]);
								
								if (refIndex > -1) {
									copyObj[i] = '{ref:' + refIndex + '}';
									this.log('Possible circular reference for property ' + i);
								} else {
									ref.push(obj[i]);
									copyObj[i] = this._objSaveReassign(obj[i], ref);
								}
							} else {
								// This is a special property that needs handling via
								// it's own method to return an appropriate data value
								// so check if there is a method for it
								specProp = this.saveSpecialProp(obj, i);
								
								if (specProp) {
									if (typeof(specProp) === 'object' && !(specProp instanceof Array)) {
										// Process the returned object properties
										for (specPropKey in specProp) {
											if (specProp.hasOwnProperty(specPropKey)) {
												// Copy the special property data to the key in
												// our return object
												copyObj[specPropKey] = specProp[specPropKey];
											}
										}
									} else {
										copyObj[i] = specProp;
									}
								}
							}
						} else {
							copyObj[i] = obj[i];
						}
					}
				}
				
				return copyObj;
			} else {
				return obj;
			}
		},
		
		_objLoadReassign: function (obj, newProps) {
			var specialKeys = this._specialProp,
				specProp,
				specPropKey,
				i;
			
			for (i in newProps) {
				if (newProps.hasOwnProperty(i)) {
					if (specialKeys.indexOf(i) === -1) {
						if (typeof(newProps[i]) === 'object' && obj[i]) {
							this._objLoadReassign(obj[i], newProps[i]);
						} else {
							// Assign the property value directly
							obj[i] = newProps[i];
						}
					} else {
						// This is a special property that needs handling via
						// it's own method to return an appropriate data value
						// so check if there is a method for it
						specProp = this.loadSpecialProp(newProps, i);
						
						if (specProp) {
							if (typeof(specProp) === 'object' && !(specProp instanceof Array)) {
								// Process the returned object properties
								for (specPropKey in specProp) {
									if (specProp.hasOwnProperty(specPropKey)) {
										// Copy the special property data to the key in
										// our return object
										obj[specPropKey] = specProp[specPropKey];
									}
								}
							} else {
								obj[i] = specProp;
							}
						}
					}
				}
			}
		},
		
		/**
		 * Returns a string containing a code fragment that when
		 * evaluated will reproduce this object.
		 * @return {String}
		 */
		stringify: function (options) {
			// Make sure we have an options object
			if (options === undefined) { options = {}; }
			
			var str = "new " + this.classId() + "()";
			
			// Every object has an ID, assign that first
			if (options.id !== false) {
				str += ".id('" + this.id() + "')";
			}
			
			// Now check if there is a parent and mount that
			if (options.mount !== false && this.parent()) {
				str += ".mount(ige.$('" + this.parent().id() + "'))";
			}
			
			// Now get all other properties
			str += this._stringify(options);
			
			return str;
		},
		
		/**
		 * Returns a string containing a code fragment that when
		 * evaluated will reproduce this object's properties via
		 * chained commands. This method will only check for
		 * properties that are directly related to this class.
		 * Other properties are handled by their own class method.
		 * @return {String}
		 */
		_stringify: function (options) {
			// Make sure we have an options object
			if (options === undefined) { options = {}; }
			
			var str = '', i;
			
			// Loop properties and add property assignment code to string
			for (i in this) {
				if (this.hasOwnProperty(i) && this[i] !== undefined) {
					switch (i) {
						case '_category':
							str += ".category(" + this.category() + ")";
							break;
						case '_drawBounds':
							str += ".drawBounds(" + this.drawBounds() + ")";
							break;
						case '_drawBoundsData':
							str += ".drawBoundsData(" + this.drawBoundsData() + ")";
							break;
						case '_drawMouse':
							str += ".drawMouse(" + this.drawMouse() + ")";
							break;
						case '_mode':
							str += ".mode(" + this.mode() + ")";
							break;
						case '_isometricMounts':
							str += ".isometricMounts(" + this.isometricMounts() + ")";
							break;
						case '_indestructible':
							str += ".indestructible(" + this.indestructible() + ")";
							break;
						case '_layer':
							str += ".layer(" + this.layer() + ")";
							break;
						case '_depth':
							str += ".depth(" + this.depth() + ")";
							break;
					}
				}
			}
			
			return str;
		}
	});
	
	return IgeObject;
});

},{"irrelon-appcore":67}],43:[function(_dereq_,module,exports){
"use strict";

var appCore = _dereq_('irrelon-appcore');

appCore.module('IgeParticle', function (IgeEntity, IgeVelocityComponent) {
	var IgeParticle = IgeEntity.extend({
		classId: 'IgeParticle',
		
		init: function (emitter) {
			this._emitter = emitter;
			IgeEntity.prototype.init.call(this);
			
			// Setup the particle default values
			this.addComponent(IgeVelocityComponent);
		},
		
		destroy: function () {
			// Remove ourselves from the emitter
			if (this._emitter !== undefined) {
				this._emitter._particles.pull(this);
			}
			IgeEntity.prototype.destroy.call(this);
		}
	});
	
	return IgeParticle;
});
},{"irrelon-appcore":67}],44:[function(_dereq_,module,exports){
"use strict";

var appCore = _dereq_('irrelon-appcore');

appCore.module('IgeParticleEmitter', function (IgeUiEntity, IgeTween) {
	/**
	 * Creates a new particle emitter.
	 */
	var IgeParticleEmitter = IgeUiEntity.extend({
		classId: 'IgeParticleEmitter',
		IgeParticleEmitter: true,
		
		init: function () {
			// IgeBody.init()
			IgeUiEntity.prototype.init.call(this);
			
			// Set some defaults
			this._currentDelta = 0;
			this._started = false;
			this._particles = [];
			
			this.applyDepthToParticles(true);
			this.applyLayerToParticles(true);
			this.quantityTimespan(1000);
			this.quantityBase(10);
			this.quantityVariance(0, 0);
			this.translateBaseX(0);
			this.translateBaseY(0);
			this.translateBaseZ(0);
			this.translateVarianceX(0, 0);
			this.translateVarianceY(0, 0);
			this.translateVarianceZ(0, 0);
			this.rotateBase(0);
			this.rotateVariance(0, 0);
			this.deathRotateBase(0);
			this.deathRotateVariance(0, 0);
			this.scaleBaseX(1);
			this.scaleBaseY(1);
			this.scaleBaseZ(1);
			this.scaleVarianceX(0, 0);
			this.scaleVarianceY(0, 0);
			this.scaleVarianceZ(0, 0);
			this.scaleLockAspect(false);
			this.deathScaleBaseX(0);
			this.deathScaleBaseY(0);
			this.deathScaleBaseZ(0);
			this.deathScaleVarianceX(0, 0);
			this.deathScaleVarianceY(0, 0);
			this.deathScaleVarianceZ(0, 0);
			this.deathScaleLockAspect(false);
			this.opacityBase(1);
			this.opacityVariance(0, 0);
			this.deathOpacityBase(1);
			this.deathOpacityVariance(0, 0);
			this.lifeBase(1000);
			this.lifeVariance(0, 0);
		},
		
		/**
		 * Sets the class that all particles emitted from this
		 * emitter will be created from.
		 * @param {IgeEntity} obj
		 * @return {*}
		 */
		particle: function (obj) {
			this._particle = obj;
			return this;
		},
		
		particleMountTarget: function (obj) {
			this._particleMountTarget = obj;
			return this;
		},
		
		applyDepthToParticles: function (val) {
			this._applyDepthToParticles = val;
			return this;
		},
		
		applyLayerToParticles: function (val) {
			this._applyLayerToParticles = val;
			return this;
		},
		
		quantityTimespan: function (val) {
			this._quantityTimespan = val;
			return this;
		},
		
		quantityBase: function (val) {
			this._quantityBase = val;
			return this;
		},
		
		quantityVariance: function (a, b) {
			this._quantityVariance = [a, b];
			return this;
		},
		
		quantityMax: function (val) {
			this._quantityMax = val;
			this._quantityProduced = 0;
			return this;
		},
		
		translateBaseX: function (val) {
			this._translateBaseX = val;
			return this;
		},
		
		translateBaseY: function (val) {
			this._translateBaseY = val;
			return this;
		},
		
		translateBaseZ: function (val) {
			this._translateBaseZ = val;
			return this;
		},
		
		translateVarianceX: function (a, b) {
			this._translateVarianceX = [a, b];
			return this;
		},
		
		translateVarianceY: function (a, b) {
			this._translateVarianceY = [a, b];
			return this;
		},
		
		translateVarianceZ: function (a, b) {
			this._translateVarianceZ = [a, b];
			return this;
		},
		
		rotateBase: function (val) {
			this._rotateBase = val;
			return this;
		},
		
		rotateVariance: function (a, b) {
			this._rotateVariance = [a, b];
			return this;
		},
		
		deathRotateBase: function (val) {
			this._deathRotateBase = val;
			return this;
		},
		
		deathRotateVariance: function (a, b) {
			this._deathRotateVariance = [a, b];
			return this;
		},
		
		scaleBaseX: function (val) {
			this._scaleBaseX = val;
			return this;
		},
		
		scaleBaseY: function (val) {
			this._scaleBaseY = val;
			return this;
		},
		
		scaleBaseZ: function (val) {
			this._scaleBaseZ = val;
			return this;
		},
		
		scaleVarianceX: function (a, b) {
			this._scaleVarianceX = [a, b];
			return this;
		},
		
		scaleVarianceY: function (a, b) {
			this._scaleVarianceY = [a, b];
			return this;
		},
		
		scaleVarianceZ: function (a, b) {
			this._scaleVarianceZ = [a, b];
			return this;
		},
		
		scaleLockAspect: function (val) {
			this._scaleLockAspect = val;
			return this;
		},
		
		deathScaleBaseX: function (val) {
			this._deathScaleBaseX = val;
			return this;
		},
		
		deathScaleBaseY: function (val) {
			this._deathScaleBaseY = val;
			return this;
		},
		
		deathScaleBaseZ: function (val) {
			this._deathScaleBaseZ = val;
			return this;
		},
		
		deathScaleVarianceX: function (a, b) {
			this._deathScaleVarianceX = [a, b];
			return this;
		},
		
		deathScaleVarianceY: function (a, b) {
			this._deathScaleVarianceY = [a, b];
			return this;
		},
		
		deathScaleVarianceZ: function (a, b) {
			this._deathScaleVarianceZ = [a, b];
			return this;
		},
		
		deathScaleLockAspect: function (val) {
			this._deathScaleLockAspect = val;
			return this;
		},
		
		opacityBase: function (val) {
			this._opacityBase = val;
			return this;
		},
		
		opacityVariance: function (a, b) {
			this._opacityVariance = [a, b];
			return this;
		},
		
		deathOpacityBase: function (val) {
			this._deathOpacityBase = val;
			return this;
		},
		
		deathOpacityVariance: function (a, b) {
			this._deathOpacityVariance = [a, b];
			return this;
		},
		
		lifeBase: function (val) {
			this._lifeBase = val;
			return this;
		},
		
		lifeVariance: function (a, b) {
			this._lifeVariance = [a, b];
			return this;
		},
		
		/**
		 * Sets the base velocity vector of each emitted particle and optionally
		 * the min and max vectors that are used to randomize the resulting particle
		 * velocity vector.
		 * @param baseVector
		 * @param minVector
		 * @param maxVector
		 */
		velocityVector: function (baseVector, minVector, maxVector) {
			this._velocityVector = {
				base: baseVector,
				min: minVector,
				max: maxVector
			};
			
			return this;
		},
		
		linearForceVector: function (baseVector, minVector, maxVector) {
			this._linearForceVector = {
				base: baseVector,
				min: minVector,
				max: maxVector
			};
			
			return this;
		},
		
		/**
		 * Starts the particle emitter which will begin spawning
		 * particle entities based upon the emitter's current settings.
		 * @return {*}
		 */
		start: function () {
			if (this._particle) {
				// Update the transform matrix before starting
				// otherwise some particles might read the old
				// matrix values if the start method was chained!
				this.updateTransform();
				
				this._quantityTimespan = this._quantityTimespan !== undefined ? this._quantityTimespan : 1000;
				this._maxParticles = this.baseAndVarianceValue(this._quantityBase, this._quantityVariance, true);
				this._particlesPerTimeVector = this._quantityTimespan / this._maxParticles; // 1 Particle every x milliseconds (x stored in this._particlesPerTimeVector)
				this._currentDelta = 0;
				
				// Set the emitter started flag
				this._quantityProduced = 0;
				this._started = true;
			} else {
				this.log('Cannot start particle emitter because no particle class was specified with a call to particle()', 'error');
			}
			
			return this;
		},
		
		updateSettings: function () {
			this._maxParticles = this.baseAndVarianceValue(this._quantityBase, this._quantityVariance, true);
			this._particlesPerTimeVector = this._quantityTimespan / this._maxParticles; // 1 Particle every x milliseconds (x stored in this._particlesPerTimeVector)
		},
		
		/**
		 * Stops the particle emitter. The current particles will
		 * continue to process until they reach their natural lifespan.
		 * @return {*}
		 */
		stop: function () {
			this._started = false;
			return this;
		},
		
		/**
		 * Stops the particle emitter. The current particles will be
		 * destroyed immediately.
		 * @return {*}
		 */
		stopAndKill: function () {
			this._started = false;
			
			// Loop the particles array and destroy all the particles
			var arr = this._particles,
				arrCount = arr.length;
			
			while (arrCount--) {
				arr[arrCount].destroy();
			}
			
			// Remove all references to the particles by
			// re-initialising the particles array
			this._particles = [];
			
			return this;
		},
		
		/**
		 * Takes a base value and a variance range and returns a random
		 * value between the range, added to the base.
		 * @param {Number} base The base value.
		 * @param {Array} variance An array containing the two values of
		 * the variance range.
		 * @param {Boolean} floorIt If set to true, will cause the returned
		 * value to be passed through Math.floor().
		 * @return {Number} Returns the final value based upon the base
		 * value and variance range.
		 */
		baseAndVarianceValue: function (base, variance, floorIt) {
			base = base || 0;
			variance = variance || [0, 0];
			var variant = 0;
			
			if (floorIt) {
				variant = Math.floor(variance[0] + Math.random() * (variance[1] - variance[0]));
			} else {
				variant = (variance[0] + Math.random() * (variance[1] - variance[0]));
			}
			
			return base + variant;
		},
		
		vectorFromBaseMinMax: function (vectorData) {
			if (vectorData.min && vectorData.max) {
				var base = vectorData.base,
					min = vectorData.min,
					max = vectorData.max,
					newVector = {};
				
				newVector.x = base.x + (min.x + Math.random() * (max.x - min.x));
				newVector.y = base.y + (min.y + Math.random() * (max.y - min.y));
				newVector.z = base.z + (min.z + Math.random() * (max.z - min.z));
				
				return newVector;
			} else {
				// There was no variance data so return the base vector
				return vectorData.base;
			}
		},
		
		/**
		 * Creates and maintains the particles that this emitter is
		 * responsible for spawning and controlling.
		 * @param ctx
		 */
		tick: function (ctx) {
			this._currentDelta += ige._tickDelta;
			
			// Check if the emitter is mounted to anything and started, if not
			// then don't bother creating particles!
			if (this._parent && this._started) {
				if (!this._quantityMax || this._quantityProduced < this._quantityMax) {
					var particleCount,
						translateX,
						translateY,
						translateZ,
						//vectorAngle,
						//vectorPower,
						velocityVector,
						newVecX, newVecY,
						rotX, rotY,
						cosRot, sinRot,
						scaleX,
						scaleY,
						scaleZ,
						rotate,
						opacity,
						life,
						//linearForceAngle,
						//linearForcePower,
						linearForceVector,
						deathScaleX,
						deathScaleY,
						deathScaleZ,
						deathRotate,
						deathOpacity,
						tempParticle,
						tweens,
						scaleProps,
						i;
					
					if (this._currentDelta > this._quantityTimespan) {
						this._currentDelta = this._quantityTimespan;
					}
					
					if (this._currentDelta >= this._particlesPerTimeVector) {
						particleCount = ((this._currentDelta / this._particlesPerTimeVector)|0); // Bitwise floor
						this._currentDelta -= (this._particlesPerTimeVector * particleCount);
						
						// Loop the particle array and if no particle exists,
						// create one to fill the space. Basically this keeps
						// the emitters creating new particles until it is
						// stopped.
						if (particleCount) {
							while (particleCount--) {
								if (this._quantityMax) {
									this._quantityProduced ++;
									
									// If the number of particles produced is equal to or greater
									// than the max we should produce then exit the loop
									if (this._quantityProduced >= this._quantityMax) {
										this.stop();
										break;
									}
								}
								
								// Create the initial particle values based on
								// the emitter options values
								
								// Generate the particle's initial translate values
								translateX = this.baseAndVarianceValue(this._translateBaseX, this._translateVarianceX, true);
								translateY = this.baseAndVarianceValue(this._translateBaseY, this._translateVarianceY, true);
								translateZ = this.baseAndVarianceValue(this._translateBaseZ, this._translateVarianceZ, true);
								
								//translateX += this._worldMatrix.matrix[2];
								//translateY += this._worldMatrix.matrix[5];
								
								if (this._velocityVector) {
									// Generate the particle's initial vector angle and power
									velocityVector = this.vectorFromBaseMinMax(this._velocityVector);
									
									// Rotate the vector's point to match the current emitter rotation
									rotX = velocityVector.x;
									rotY = velocityVector.y;
									cosRot = this._worldMatrix.matrix[0]; //Math.cos(this._rotate.z);
									sinRot = this._worldMatrix.matrix[3]; //Math.sin(this._rotate.z);
									newVecX = rotX * cosRot - rotY * sinRot;
									newVecY = rotY * cosRot + rotX * sinRot;
									
									// Assign the rotated vector back again
									velocityVector.x = newVecX;
									velocityVector.y = newVecY;
								}
								
								//vectorAngle = this.baseAndVarianceValue(this._vectorAngleBase, this._vectorAngleVariance, true);
								//vectorPower = this.baseAndVarianceValue(this._vectorPowerBase, this._vectorPowerVariance, false);
								
								// Generate the particle's initial scale
								scaleX = this.baseAndVarianceValue(this._scaleBaseX, this._scaleVarianceX, false);
								scaleZ = scaleY = scaleX;
								if (!this._scaleLockAspect) {
									scaleY = this.baseAndVarianceValue(this._scaleBaseY, this._scaleVarianceY, false);
									scaleZ = this.baseAndVarianceValue(this._scaleBaseZ, this._scaleVarianceZ, false);
								}
								
								// Generate the particle's initial rotation
								rotate = this.baseAndVarianceValue(this._rotateBase, this._rotateVariance, true);
								
								// Generate the particle's initial opacity
								opacity = this.baseAndVarianceValue(this._opacityBase, this._opacityVariance, false);
								
								// Generate the particle's initial lifespan
								life = this.baseAndVarianceValue(this._lifeBase, this._lifeVariance, true);
								
								// Generate the particle's linear force vector angle and power
								if (this._linearForceVector) {
									linearForceVector = this.vectorFromBaseMinMax(this._linearForceVector);
									
									// Rotate the vector's point to match the current emitter rotation
									rotX = linearForceVector.x;
									rotY = linearForceVector.y;
									cosRot = this._worldMatrix.matrix[0]; //Math.cos(this._rotate.z);
									sinRot = this._worldMatrix.matrix[3]; //Math.sin(this._rotate.z);
									newVecX = rotX * cosRot - rotY * sinRot;
									newVecY = rotY * cosRot + rotX * sinRot;
									
									// Assign the rotated vector back again
									linearForceVector.x = newVecX;
									linearForceVector.y = newVecY;
								}
								
								//linearForceAngle = this.baseAndVarianceValue(this._linearForceAngleBase, this._linearForceAngleVariance);
								//linearForcePower = this.baseAndVarianceValue(this._linearForcePowerBase, this._linearForcePowerVariance, false);
								
								// Generate the particle's death scale
								if (typeof(this._deathScaleBaseX) !== 'undefined') {
									deathScaleX = this.baseAndVarianceValue(
										this._deathScaleBaseX,
										this._deathScaleVarianceX,
										false
									);
								}
								if (typeof(this._deathScaleBaseY) !== 'undefined' && !this._deathScaleLockAspect) {
									deathScaleY = this.baseAndVarianceValue(
										this._deathScaleBaseY,
										this._deathScaleVarianceY,
										false
									);
								}
								if (typeof(this._deathScaleBaseZ) !== 'undefined' && !this._deathScaleLockAspect) {
									deathScaleZ = this.baseAndVarianceValue(
										this._deathScaleBaseZ,
										this._deathScaleVarianceZ,
										false
									);
								}
								if (this._deathScaleLockAspect) {
									deathScaleZ = deathScaleY = deathScaleX;
								}
								
								// Generate the particle's death rotation
								if (typeof(this._deathRotateBase) !== 'undefined') {
									deathRotate = this.baseAndVarianceValue(
										this._deathRotateBase,
										this._deathRotateVariance,
										true
									);
								}
								
								// Generate the particle's death opacity
								if (typeof(this._deathOpacityBase) !== 'undefined') {
									deathOpacity = this.baseAndVarianceValue(
										this._deathOpacityBase,
										this._deathOpacityVariance,
										false
									);
								}
								
								// Create the particle entity
								tempParticle = new this._particle(this);
								
								// Add the current transform of the emitter to the final
								// particle transforms
								if (this._ignoreCamera) {
									translateX += this._translate.x;
									translateY += this._translate.y;
								} else {
									translateX += this._worldMatrix.matrix[2];
									translateY += this._worldMatrix.matrix[5];
								}
								translateZ += this._translate.z;
								
								scaleX *= this._scale.x;
								scaleY *= this._scale.y;
								scaleZ *= this._scale.z;
								
								deathScaleX *= this._scale.x;
								deathScaleY *= this._scale.y;
								deathScaleZ *= this._scale.z;
								
								// Apply all the transforms (don't do this in the initial
								// entity definition because some components may already
								// have initialised due to the particle template
								tempParticle.translateTo(translateX, translateY, translateZ);
								tempParticle.rotateTo(0, 0, Math.radians(rotate));
								tempParticle.scaleTo(scaleX, scaleY, scaleZ);
								tempParticle.opacity(opacity);
								
								if (this._applyDepthToParticles) { tempParticle.depth(this._depth); }
								if (this._applyLayerToParticles) { tempParticle.layer(this._layer); }
								
								if (typeof(velocityVector) === 'object') {
									tempParticle.velocity.vector3(velocityVector, false);
								}
								
								if (typeof(linearForceVector) === 'object') {
									tempParticle.velocity.linearForceVector3(linearForceVector, false);
								}
								
								tweens = [];
								if (typeof(deathRotate) !== 'undefined') {
									tweens.push(new IgeTween()
										.targetObj(tempParticle._rotate)
										.properties({z: Math.radians(deathRotate)})
										.duration(life));
								}
								if (typeof(deathOpacity) !== 'undefined') {
									tweens.push(new IgeTween()
										.targetObj(tempParticle)
										.properties({_opacity: deathOpacity})
										.duration(life));
								}
								
								scaleProps = {};
								if (typeof(deathScaleX) !== 'undefined') {
									scaleProps.x = deathScaleX;
								}
								if (typeof(deathScaleY) !== 'undefined') {
									scaleProps.y = deathScaleY;
								}
								if (typeof(deathScaleZ) !== 'undefined') {
									scaleProps.z = deathScaleZ;
								}
								
								if (scaleProps.x || scaleProps.y || scaleProps.z) {
									tweens.push(new IgeTween()
										.targetObj(tempParticle._scale)
										.properties(scaleProps)
										.duration(life));
								}
								
								if (typeof(life) === 'number') {
									tempParticle.lifeSpan(life);
								}
								
								// Add the particle to this emitter's particle array
								this._particles.push(tempParticle);
								
								// Add the particle to the scene
								tempParticle.mount(this._particleMountTarget || this._parent);
								
								// Start the relevant tweens
								for (i = 0; i < tweens.length; i++) {
									tweens[i].start();
								}
							}
						}
					}
				}
			}
			
			IgeUiEntity.prototype.tick.call(this, ctx);
		},
		
		/**
		 * Returns an array of the current particle entities that this
		 * emitter has spawned.
		 * @return {Array} The array of particle entities the emitter spawned.
		 */
		particles: function () {
			return this._particles;
		},
		
		/**
		 * Returns a string containing a code fragment that when
		 * evaluated will reproduce this object's properties via
		 * chained commands. This method will only check for
		 * properties that are directly related to this class.
		 * Other properties are handled by their own class method.
		 * @return {String}
		 */
		_stringify: function () {
			// Get the properties for all the super-classes
			var str = IgeUiEntity.prototype._stringify.call(this), i;
			return str;
			
			// TODO: WRITE THIS FOR THIS CLASS - EPIC AMOUNT OF WORK HERE
			// Loop properties and add property assignment code to string
			for (i in this) {
				if (this.hasOwnProperty(i) && this[i] !== undefined) {
					switch (i) {
						case '':
							str += ".text(" + this.text() + ")";
							break;
					}
				}
			}
			
			return str;
		}
	});
	
	return IgeParticleEmitter;
});
},{"irrelon-appcore":67}],45:[function(_dereq_,module,exports){
"use strict";

var appCore = _dereq_('irrelon-appcore');

appCore.module('IgePathFinder', function (IgeEventingClass, IgePathNode) {
	/**
	 * Creates a new path using the A* path-finding algorithm.
	 */
	var IgePathFinder = IgeEventingClass.extend({
		classId: 'IgePathFinder',
		
		init: function() {
			this._neighbourLimit = 1000;
			this._squareCost = 10;
			this._diagonalCost = 10;
		},
		
		/**
		 * Gets / sets the cost of movement over a square (left,
		 * right, up, down) adjacent tile.
		 * @param {Number=} val
		 * @return {*}
		 */
		squareCost: function (val) {
			if (val !== undefined) {
				this._squareCost = val;
				return this;
			}
			
			return this._squareCost;
		},
		
		/**
		 * Gets / sets the cost of movement over a diagonal (nw,
		 * ne, sw, se) adjacent tile.
		 * @param {Number=} val
		 * @return {*}
		 */
		diagonalCost: function (val) {
			if (val !== undefined) {
				this._diagonalCost = val;
				return this;
			}
			
			return this._diagonalCost;
		},
		
		/**
		 * Gets / sets the limit on the number of neighbour nodes
		 * that the path-finder will analyse before reaching it's
		 * target tile. On large maps this limit should be increased
		 * to allow pathing where many neighbours need to be
		 * considered.
		 * @param val
		 * @return {*}
		 */
		neighbourLimit: function (val) {
			if (val !== undefined) {
				this._neighbourLimit = val;
				return this;
			}
			
			return this._neighbourLimit;
		},
		
		aStar: function () {
			this.log('The "IgePathFinder.aStar" method has been renamed to "generate". Please update your code.', 'error');
		},
		
		/**
		 * Uses the A* algorithm to generate path data between two points.
		 * @param {IgeCollisionMap2d} tileMap The tile map to use when generating the path.
		 * @param {IgePoint3d} startPoint The point on the map to start path-finding from.
		 * @param {IgePoint3d} endPoint The point on the map to try to path-find to.
		 * @param {Function} comparisonCallback The callback function that will decide if each tile that is being considered for use in the path is allowed or not based on the tile map's data stored for that tile which is passed to this method as the first parameter. Must return a boolean value.
		 * @param {Boolean} allowSquare Whether to allow neighboring tiles along a square axis. Defaults to true if undefined.
		 * @param {Boolean} allowDiagonal Whether to allow neighboring tiles along a diagonal axis. Defaults to false if undefined.
		 * @param {Boolean=} allowInvalidDestination If the path finder cannot path to the destination tile, if this is true the closest path will be returned instead.
		 * @return {Array} An array of objects each containing an x, y co-ordinate that describes the path from the starting point to the end point in order.
		 */
		generate: function (tileMap, startPoint, endPoint, comparisonCallback, allowSquare, allowDiagonal, allowInvalidDestination) {
			var openList = [],
				closedList = [],
				listHash = {},
				startNode,
				lowestFScoringIndex,
				openCount,
				currentNode,
				pathPoint,
				finalPath,
				neighbourList,
				neighbourCount,
				neighbourNode,
				endPointCheckTile,
				tileMapData,
				existingNode,
				lowestHNode;
			
			// Set some defaults
			if (allowSquare === undefined) { allowSquare = true; }
			if (allowDiagonal === undefined) { allowDiagonal = false; }
			
			// Check that the end point on the map is actually allowed to be pathed to!
			tileMapData = tileMap.map._mapData;
			endPointCheckTile = tileMapData[endPoint.y] && tileMapData[endPoint.y][endPoint.x] ? tileMapData[endPoint.y][endPoint.x] : null;
			if (!allowInvalidDestination && !comparisonCallback(endPointCheckTile, endPoint.x, endPoint.y)) {
				// There is no path to the end point because the end point
				// is not allowed to be pathed to!
				this.emit('noPathFound');
				//this.log('Cannot path to destination because the destination tile is not pathable!');
				return [];
			}
			
			// Starting point to open list
			startNode = new IgePathNode(startPoint.x, startPoint.y, 0, 0, this._heuristic(startPoint.x, startPoint.y, endPoint.x, endPoint.y, 10));
			startNode.link = 1;
			openList.push(startNode);
			listHash[startNode.hash] = startNode;
			startNode.listType = 1;
			
			lowestHNode = startNode;
			
			// Loop as long as there are more points to process in our open list
			while (openList.length) {
				// Check for some major error
				if (openList.length > this._neighbourLimit) {
					//this.log('Path finder error, open list nodes exceeded ' + this._neighbourLimit + '!', 'warning');
					this.emit('exceededLimit');
					break;
				}
				
				// Grab the lowest f scoring node from the open list
				// to process next
				lowestFScoringIndex = 0;
				openCount = openList.length;
				
				while (openCount--) {
					if(openList[openCount].f < openList[lowestFScoringIndex].f) { lowestFScoringIndex = openCount; }
				}
				
				currentNode = openList[lowestFScoringIndex];
				
				// Check if the current node is the end point
				if (currentNode.x === endPoint.x && currentNode.y === endPoint.y) {
					// We have reached the end point
					pathPoint = currentNode;
					finalPath = [];
					
					while(pathPoint.link) {
						finalPath.push(pathPoint);
						pathPoint = pathPoint.link;
					}
					
					this.emit('pathFound', finalPath);
					
					return finalPath.reverse();
				} else {
					// Remove the current node from the open list
					openList.splice(lowestFScoringIndex, 1);
					
					// Add the current node to the closed list
					closedList.push(currentNode);
					currentNode.listType = -1;
					
					// Get the current node's neighbors
					neighbourList = this._getNeighbours(currentNode, endPoint, tileMap, comparisonCallback, allowSquare, allowDiagonal);
					neighbourCount = neighbourList.length;
					
					// Loop the neighbours and add each one to the open list
					while (neighbourCount--) {
						neighbourNode = neighbourList[neighbourCount];
						existingNode = listHash[neighbourNode.hash];
						
						// Check that the neighbour is not on the closed list
						if (!existingNode || existingNode.listType !== -1) {
							// The neighbour is not on the closed list so
							// check if it is already on the open list
							if (existingNode && existingNode.listType === 1) {
								// The neighbour is already on the open list
								// so check if our new path is a better score
								if (existingNode.g > neighbourNode.g) {
									// Pathing from the current node through this neighbour
									// costs less that any way we've calculated before
									existingNode.link = neighbourNode.link;
									existingNode.g = neighbourNode.g;
									existingNode.f = neighbourNode.f;
								}
							} else {
								// Add the neighbour to the open list
								openList.push(neighbourNode);
								listHash[neighbourNode.hash] = neighbourNode;
								neighbourNode.listType = 1;
								existingNode = neighbourNode;
							}
						}
						
						// Check if this neighbour node has the lowest
						// h value (distance from target) and store it
						if (!lowestHNode || existingNode.h < lowestHNode.h) {
							lowestHNode = existingNode;
						}
					}
				}
				
			}
			
			if (!allowInvalidDestination || (allowInvalidDestination && !lowestHNode)) {
				// Could not find a path, return an empty array!
				//this.log('Could not find a path to destination!');
				this.emit('noPathFound');
				return [];
			} else {
				// We couldn't path to the destination so return
				// the closest detected end point
				pathPoint = lowestHNode;
				finalPath = [];
				
				while(pathPoint.link) {
					finalPath.push(pathPoint);
					pathPoint = pathPoint.link;
				}
				
				// Reverse the final path so it is from
				// start to finish
				finalPath = finalPath.reverse();
				
				this.emit('pathFound', finalPath);
				return finalPath;
			}
		},
		
		/**
		 * Get all the neighbors of a node for the A* algorithm.
		 * @param {IgePathNode} currentNode The current node along the path to evaluate neighbors for.
		 * @param {IgePathNode} endPoint The end point of the path.
		 * @param {IgeCollisionMap2d} tileMap The tile map to use when evaluating neighbours.
		 * @param {Function} comparisonCallback The callback function that will decide if the tile data at the neighbouring node is to be used or not. Must return a boolean value.
		 * @param {Boolean} allowSquare Whether to allow neighboring tiles along a square axis.
		 * @param {Boolean} allowDiagonal Whether to allow neighboring tiles along a diagonal axis.
		 * @return {Array} An array containing nodes describing the neighbouring tiles of the current node.
		 * @private
		 */
		_getNeighbours: function (currentNode, endPoint, tileMap, comparisonCallback, allowSquare, allowDiagonal) {
			var list = [],
				x = currentNode.x,
				y = currentNode.y,
				newX = 0,
				newY = 0,
				newNode,
				mapData = tileMap.map._mapData,
				currentNodeData = mapData[y] && mapData[y][x] ? mapData[y][x] : undefined,
				tileData;
			
			if (allowSquare) {
				newX = x - 1; newY = y;
				tileData = mapData[newY] && mapData[newY][newX] ? mapData[newY][newX] : null;
				if (comparisonCallback(tileData, newX, newY, currentNodeData, x, y)) {
					newNode = new IgePathNode(newX, newY, currentNode.g, this._squareCost, this._heuristic(newX, newY, endPoint.x, endPoint.y, this._squareCost), currentNode, 'W');
					list.push(newNode);
				}
				
				newX = x + 1; newY = y;
				tileData = mapData[newY] && mapData[newY][newX] ? mapData[newY][newX] : null;
				if (comparisonCallback(tileData, newX, newY, currentNodeData, x, y)) {
					newNode = new IgePathNode(newX, newY, currentNode.g, this._squareCost, this._heuristic(newX, newY, endPoint.x, endPoint.y, this._squareCost), currentNode, 'E');
					list.push(newNode);
				}
				
				newX = x; newY = y - 1;
				tileData = mapData[newY] && mapData[newY][newX] ? mapData[newY][newX] : null;
				if (comparisonCallback(tileData, newX, newY, currentNodeData, x, y)) {
					newNode = new IgePathNode(newX, newY, currentNode.g, this._squareCost, this._heuristic(newX, newY, endPoint.x, endPoint.y, this._squareCost), currentNode, 'N');
					list.push(newNode);
				}
				
				newX = x; newY = y + 1;
				tileData = mapData[newY] && mapData[newY][newX] ? mapData[newY][newX] : null;
				if (comparisonCallback(tileData, newX, newY, currentNodeData, x, y)) {
					newNode = new IgePathNode(newX, newY, currentNode.g, this._squareCost, this._heuristic(newX, newY, endPoint.x, endPoint.y, this._squareCost), currentNode, 'S');
					list.push(newNode);
				}
				
			}
			
			if (allowDiagonal) {
				newX = x - 1; newY = y - 1;
				tileData = mapData[newY] && mapData[newY][newX] ? mapData[newY][newX] : null;
				if (comparisonCallback(tileData, newX, newY, currentNodeData, x, y)) {
					newNode = new IgePathNode(newX, newY, currentNode.g, this._diagonalCost, this._heuristic(newX, newY, endPoint.x, endPoint.y, this._diagonalCost), currentNode, 'NW');
					list.push(newNode);
				}
				
				newX = x + 1; newY = y - 1;
				tileData = mapData[newY] && mapData[newY][newX] ? mapData[newY][newX] : null;
				if (comparisonCallback(tileData, newX, newY, currentNodeData, x, y)) {
					newNode = new IgePathNode(newX, newY, currentNode.g, this._diagonalCost, this._heuristic(newX, newY, endPoint.x, endPoint.y, this._diagonalCost), currentNode, 'NE');
					list.push(newNode);
				}
				
				newX = x - 1; newY = y + 1;
				tileData = mapData[newY] && mapData[newY][newX] ? mapData[newY][newX] : null;
				if (comparisonCallback(tileData, newX, newY, currentNodeData, x, y)) {
					newNode = new IgePathNode(newX, newY, currentNode.g, this._diagonalCost, this._heuristic(newX, newY, endPoint.x, endPoint.y, this._diagonalCost), currentNode, 'SW');
					list.push(newNode);
				}
				
				newX = x + 1; newY = y + 1;
				tileData = mapData[newY] && mapData[newY][newX] ? mapData[newY][newX] : null;
				if (comparisonCallback(tileData, newX, newY, currentNodeData, x, y)) {
					newNode = new IgePathNode(newX, newY, currentNode.g, this._diagonalCost, this._heuristic(newX, newY, endPoint.x, endPoint.y, this._diagonalCost), currentNode, 'SE');
					list.push(newNode);
				}
			}
			
			return list;
		},
		
		/**
		 * The heuristic to calculate the rough cost of pathing from the
		 * x1, y1 to x2, y2.
		 * @param {Number} x1 The first x co-ordinate.
		 * @param {Number} y1 The first y co-ordinate.
		 * @param {Number} x2 The second x co-ordinate.
		 * @param {Number} y2 The second y co-ordinate.
		 * @param {Number} moveCost The cost multiplier to multiply by.
		 * @return {Number} Returns the heuristic cost between the co-ordinates specified.
		 * @private
		 */
		_heuristic: function (x1, y1, x2, y2, moveCost) {
			return moveCost * (Math.abs(x1 - x2) + Math.abs(y1 - y2));
		},
		
		as: function (map, fromNode, toNode) {
			var openList = [],
				closedList = [];
			
			// Add start point to open list
			openList.push(fromNode);
			
			
		},
		
		_as: function (openList, closedList, currentNode, toNode) {
			
		}
	});
	
	return IgePathFinder;
});
},{"irrelon-appcore":67}],46:[function(_dereq_,module,exports){
"use strict";

var appCore = _dereq_('irrelon-appcore');

appCore.module('IgePathNode', function (IgePoint3d) {
	/**
	 * Creates a new path node for use with the IgePathFinder class.
	 */
	var IgePathNode = IgePoint3d.extend({
		classId: 'IgePathNode',
		
		/**
		 * @constructor
		 * @param {Number} x
		 * @param {Number} y
		 * @param {Number} g
		 * @param {Number} moveCost
		 * @param {Number} h
		 * @param {Object} parent
		 * @param {String} direction
		 */
		init: function(x, y, g, moveCost, h, parent, direction) {
			this.z = 0; // Compat with IgePoint3d
			
			this.x = x;
			this.y = y;
			this.g = g + moveCost; // Cost of moving from the start point along the path to this node (parentNode.g + moveCost)
			this.h = h; // Rough distance to target node
			this.moveCost = moveCost;
			this.f = g + h; // Result of g + h
			this.link = parent;
			this.hash = x + ',' + y;
			this.listType = 0;
			this.direction = direction;
			this.mode = 0;
		},
		
		/**
		 * Gets / sets the path node mode. The mode determines if the co-ordinates
		 * will be in tile or absolute co-ordinates.
		 * @param {Number=} val 0 = tile based, 1 = absolute based.
		 * @return {*}
		 */
		mode: function (val) {
			if (val !== undefined) {
				this.mode = val;
				return this;
			}
			
			return this.mode;
		}
	});
	
	return IgePathNode;
});
},{"irrelon-appcore":67}],47:[function(_dereq_,module,exports){
"use strict";

var appCore = _dereq_('irrelon-appcore');

appCore.module('IgePoint2d', function (IgeClass) {
	/**
	 * Creates a new 2d point (x, y).
	 */
	var IgePoint2d = IgeClass.extend({
		classId: 'IgePoint2d',
		
		init: function (x, y, floor) {
			// Set values to the passed parameters or
			// zero if they are undefined
			// Commented for increase performance over stability checks
			/*if (x === undefined) { debugger; }
			 if (y === undefined) { debugger; }*/
			this.x = x = x !== undefined ? x : 0;
			this.y = y = y !== undefined ? y : 0;
			
			this._floor = floor !== undefined;
			
			if (this._floor) {
				this.x2 = Math.floor(x / 2);
				this.y2 = Math.floor(y / 2);
			} else {
				this.x2 = x / 2;
				this.y2 = y / 2;
			}
			
			return this;
		},
		
		/**
		 * Gets / sets the floor mode of this point. If set to true the point's
		 * data will be mathematically floored when they are assigned.
		 * @param val
		 * @return {*}
		 */
		floor: function (val) {
			if (val !== undefined) {
				this._floor = val;
				return this;
			}
			
			return this._floor;
		},
		
		/**
		 * Compares this point's x, y data with the passed point and returns
		 * true if they are the same and false if any is different.
		 * @param {IgePoint2d} point The point to compare data with.
		 * @return {Boolean}
		 */
		compare: function (point) {
			return point && this.x === point.x && this.y === point.y;
		},
		
		/**
		 * Copies the x, y data from the passed point and overwrites this
		 * point's data with those values.
		 * @param {IgePoint2d} point The point to copy values from.
		 * @returns {*}
		 */
		copy: function (point) {
			this.x = point.x;
			this.y = point.y;
			this.z = point.z;
			
			return this;
		},
		
		/**
		 * Converts the point's x, y to an isometric x, y 2d co-ordinate
		 * and returns an object whose x, y values are the result.
		 * @return {Object}
		 */
		toIso: function () {
			var sx = this.x - this.y,
				sy = (this.x + this.y) * 0.5;
			
			return {x: sx, y: sy};
		},
		
		/**
		 * Converts this point's x, y data into isometric co-ordinate space
		 * and overwrites the previous x, y values with the result.
		 * @return {*}
		 */
		thisToIso: function () {
			var val = this.toIso();
			this.x = val.x;
			this.y = val.y;
			
			return this;
		},
		
		/**
		 * Converts this point's x, y data into 2d co-ordinate space
		 * and returns an object whose x, y values are the result.
		 * @return {Object}
		 */
		to2d: function () {
			var sx = this.y + this.x / 2,
				sy = this.y - this.x / 2;
			
			return {x: sx, y: sy};
		},
		
		/**
		 * Converts this point's x, y data into 2d co-ordinate space
		 * and overwrites the previous x, y values with the result.
		 * @return {*}
		 */
		thisTo2d: function () {
			var val = this.to2d();
			this.x = val.x;
			this.y = val.y;
			
			return this;
		},
		
		/**
		 * Adds this point's data by the x, y, values specified
		 * and returns a new IgePoint2d whose values are the result.
		 * @param point
		 * @return {*}
		 */
		addPoint: function (point) {
			return new IgePoint2d(this.x + point.x, this.y + point.y);
		},
		
		/**
		 * Adds this point's data by the x, y values specified and
		 * overwrites the previous x, y values with the result.
		 * @param point
		 * @return {*}
		 */
		thisAddPoint: function (point) {
			this.x += point.x;
			this.y += point.y;
			
			return this;
		},
		
		/**
		 * Minuses this point's data by the x, y values specified
		 * and returns a new IgePoint2d whose values are the result.
		 * @param point
		 * @return {*}
		 */
		minusPoint: function (point) {
			return new IgePoint2d(this.x - point.x, this.y - point.y);
		},
		
		/**
		 * Minuses this point's data by the x, y values specified and
		 * overwrites the previous x, y values with the result.
		 * @param point
		 * @return {*}
		 */
		thisMinusPoint: function (point) {
			this.x -= point.x;
			this.y -= point.y;
			
			return this;
		},
		
		/**
		 * Multiplies this point's data by the x, y values specified
		 * and returns a new IgePoint2d whose values are the result.
		 * @param x
		 * @param y
		 * @return {*}
		 */
		multiply: function (x, y) {
			return new IgePoint2d(this.x * x, this.y * y);
		},
		
		/**
		 * Multiplies this point's data by the point specified
		 * and returns a new IgePoint2d whose values are the result.
		 * @param {IgePoint2d} point
		 * @return {*}
		 */
		multiplyPoint: function (point) {
			return new IgePoint2d(this.x * point.x, this.y * point.y);
		},
		
		/**
		 * Multiplies this point's data by the x, y values specified and
		 * overwrites the previous x, y values with the result.
		 * @param x
		 * @param y
		 * @param z
		 * @return {*}
		 */
		thisMultiply: function (x, y) {
			this.x *= x;
			this.y *= y;
			
			return this;
		},
		
		/**
		 * Divides this point's data by the x, y values specified
		 * and returns a new IgePoint2d whose values are the result.
		 * @param x
		 * @param y
		 * @return {*}
		 */
		divide: function (x, y) {
			return new IgePoint2d(this.x / x, this.y / y);
		},
		
		/**
		 * Divides this point's data by the point specified
		 * and returns a new IgePoint2d whose values are the result.
		 * @param {IgePoint2d} point
		 * @return {*}
		 */
		dividePoint: function (point) {
			var newX = this.x,
				newY = this.y;
			
			if (point.x) { newX = this.x / point.x; }
			if (point.y) { newY = this.y / point.y; }
			
			return new IgePoint2d(newX, newY);
		},
		
		/**
		 * Divides this point's data by the x, y values specified and
		 * overwrites the previous x, y values with the result.
		 * @param x
		 * @param y
		 * @return {*}
		 */
		thisDivide: function (x, y) {
			this.x /= x;
			this.y /= y;
			
			return this;
		},
		
		/**
		 * Returns a clone of this IgePoint2d's data as a new instance.
		 * @return {*}
		 */
		clone: function () {
			return new IgePoint2d(this.x, this.y);
		},
		
		/**
		 * Interpolates the x, y values of this point towards the endPoint's
		 * x, y values based on the passed time variables and returns a new
		 * IgePoint2d whose values are the result.
		 * @param endPoint
		 * @param startTime
		 * @param currentTime
		 * @param endTime
		 * @return {*}
		 */
		interpolate: function (endPoint, startTime, currentTime, endTime) {
			var totalX = endPoint.x - this.x,
				totalY = endPoint.y - this.y,
				totalTime = endTime - startTime,
				deltaTime = totalTime - (currentTime - startTime),
				timeRatio = deltaTime / totalTime;
			
			return new IgePoint2d(endPoint.x - (totalX * timeRatio), endPoint.y - (totalY * timeRatio));
		},
		
		/**
		 * Rotates the point by the given radians.
		 * @param {Number} radians Radians to rotate by.
		 * @return {IgePoint2d} A new point with the rotated x, y.
		 */
		rotate: function (radians) {
			var s = Math.sin(radians),
				c = Math.cos(radians),
				x = c * this.x - s * this.y,
				y = s * this.x - c * this.y;
			
			return new IgePoint2d(x, y);
		},
		
		/**
		 * Rotates the point by the given radians and updates this point
		 * to the new x, y values.
		 * @param {Number} radians Radians to rotate by.
		 * @return {IgePoint2d} This point.
		 */
		thisRotate: function (radians) {
			var s = Math.sin(radians),
				c = Math.cos(radians),
				x = this.x,
				y = this.y;
			
			this.x = c * x - s * y;
			this.y = s * x - c * y;
			
			return this;
		},
		
		/**
		 * Returns a string representation of the point's x, y
		 * converting floating point values into fixed using the
		 * passed precision parameter. If no precision is specified
		 * then the precision defaults to 2.
		 * @param {Number=} precision
		 * @return {String}
		 */
		toString: function (precision) {
			if (precision === undefined) { precision = 2; }
			return this.x.toFixed(precision) + ',' + this.y.toFixed(precision);
		}
	});
	
	return IgePoint2d;
});
},{"irrelon-appcore":67}],48:[function(_dereq_,module,exports){
"use strict";

var appCore = _dereq_('irrelon-appcore');

appCore.module('IgePoint3d', function (IgeClass) {
	/**
	 * Creates a new 3d point (x, y, z).
	 */
	var IgePoint3d = IgeClass.extend({
		classId: 'IgePoint3d',
		
		init: function (x, y, z, floor) {
			// Set values to the passed parameters or
			// zero if they are undefined
			// Commented for increase performance over stability checks
			/*if (x === undefined) { debugger; }
			 if (y === undefined) { debugger; }
			 if (z === undefined) { debugger; }*/
			this.x = x = x !== undefined ? x : 0;
			this.y = y = y !== undefined ? y : 0;
			this.z = z = z !== undefined ? z : 0;
			
			this._floor = floor !== undefined;
			
			if (this._floor) {
				this.x2 = Math.floor(x / 2);
				this.y2 = Math.floor(y / 2);
				this.z2 = Math.floor(z / 2);
			} else {
				this.x2 = x / 2;
				this.y2 = y / 2;
				this.z2 = z / 2;
			}
			
			return this;
		},
		
		/**
		 * Gets / sets the floor mode of this point. If set to true the point's
		 * data will be mathematically floored when they are assigned.
		 * @param val
		 * @return {*}
		 */
		floor: function (val) {
			if (val !== undefined) {
				this._floor = val;
				return this;
			}
			
			return this._floor;
		},
		
		/**
		 * Compares this point's x, y, z data with the passed point and returns
		 * true if they are the same and false if any is different.
		 * @param {IgePoint3d} point The point to compare data with.
		 * @return {Boolean}
		 */
		compare: function (point) {
			return point && this.x === point.x && this.y === point.y && this.z === point.z;
		},
		
		/**
		 * Copies the x, y, z data from the passed point and overwrites this
		 * point's data with those values.
		 * @param {IgePoint3d} point The point to copy values from.
		 * @returns {*}
		 */
		copy: function (point) {
			this.x = point.x;
			this.y = point.y;
			this.z = point.z;
			
			return this;
		},
		
		/**
		 * Converts the point's x, y, z to an isometric x, y 2d co-ordinate
		 * and returns an object whose x, y values are the result.
		 * @return {Object}
		 */
		toIso: function () {
			var sx = this.x - this.y,
				sy = (-this.z) * 1.2247 + (this.x + this.y) * 0.5;
			
			return {x: sx, y: sy};
		},
		
		/**
		 * Converts this point's x, y, z data into isometric co-ordinate space
		 * and overwrites the previous x, y, z values with the result.
		 * @return {*}
		 */
		thisToIso: function () {
			var val = this.toIso();
			this.x = val.x;
			this.y = val.y;
			
			return this;
		},
		
		/**
		 * Converts this point's x, y, z data into 2d co-ordinate space
		 * and returns an object whose x, y values are the result.
		 * @return {Object}
		 */
		to2d: function () {
			var sx = this.y + this.x / 2,
				sy = this.y - this.x / 2;
			
			return {x: sx, y: sy};
		},
		
		/**
		 * Converts this point's x, y, z data into 2d co-ordinate space
		 * and overwrites the previous x, y, z values with the result.
		 * @return {*}
		 */
		thisTo2d: function () {
			var val = this.to2d();
			this.x = val.x;
			this.y = val.y;
			this.z = 0;
			
			return this;
		},
		
		/**
		 * Adds this point's data by the x, y, z, values specified
		 * and returns a new IgePoint3d whose values are the result.
		 * @param point
		 * @return {*}
		 */
		addPoint: function (point) {
			return new IgePoint3d(this.x + point.x, this.y + point.y, this.z + point.z);
		},
		
		/**
		 * Adds this point's data by the x, y, z values specified and
		 * overwrites the previous x, y, z values with the result.
		 * @param point
		 * @return {*}
		 */
		thisAddPoint: function (point) {
			this.x += point.x;
			this.y += point.y;
			this.z += point.z;
			
			return this;
		},
		
		/**
		 * Minuses this point's data by the x, y, z, values specified
		 * and returns a new IgePoint3d whose values are the result.
		 * @param point
		 * @return {*}
		 */
		minusPoint: function (point) {
			return new IgePoint3d(this.x - point.x, this.y - point.y, this.z - point.z);
		},
		
		/**
		 * Minuses this point's data by the x, y, z values specified and
		 * overwrites the previous x, y, z values with the result.
		 * @param point
		 * @return {*}
		 */
		thisMinusPoint: function (point) {
			this.x -= point.x;
			this.y -= point.y;
			this.z -= point.z;
			
			return this;
		},
		
		/**
		 * Multiplies this point's data by the x, y, z, values specified
		 * and returns a new IgePoint3d whose values are the result.
		 * @param x
		 * @param y
		 * @param z
		 * @return {*}
		 */
		multiply: function (x, y, z) {
			return new IgePoint3d(this.x * x, this.y * y, this.z * z);
		},
		
		/**
		 * Multiplies this point's data by the point specified
		 * and returns a new IgePoint3d whose values are the result.
		 * @param {IgePoint3d} point
		 * @return {*}
		 */
		multiplyPoint: function (point) {
			return new IgePoint3d(this.x * point.x, this.y * point.y, this.z * point.z);
		},
		
		/**
		 * Multiplies this point's data by the x, y, z values specified and
		 * overwrites the previous x, y, z values with the result.
		 * @param x
		 * @param y
		 * @param z
		 * @return {*}
		 */
		thisMultiply: function (x, y, z) {
			this.x *= x;
			this.y *= y;
			this.z *= z;
			
			return this;
		},
		
		/**
		 * Divides this point's data by the x, y, z, values specified
		 * and returns a new IgePoint3d whose values are the result.
		 * @param x
		 * @param y
		 * @param z
		 * @return {*}
		 */
		divide: function (x, y, z) {
			return new IgePoint3d(this.x / x, this.y / y, this.z / z);
		},
		
		/**
		 * Divides this point's data by the point specified
		 * and returns a new IgePoint3d whose values are the result.
		 * @param {IgePoint3d} point
		 * @return {*}
		 */
		dividePoint: function (point) {
			var newX = this.x,
				newY = this.y,
				newZ = this.z;
			
			if (point.x) { newX = this.x / point.x; }
			if (point.y) { newY = this.y / point.y; }
			if (point.z) { newZ = this.z / point.z; }
			
			return new IgePoint3d(newX, newY, newZ);
		},
		
		/**
		 * Divides this point's data by the x, y, z values specified and
		 * overwrites the previous x, y, z values with the result.
		 * @param x
		 * @param y
		 * @param z
		 * @return {*}
		 */
		thisDivide: function (x, y, z) {
			this.x /= x;
			this.y /= y;
			this.z /= z;
			
			return this;
		},
		
		/**
		 * Returns a clone of this IgePoint3d's data as a new instance.
		 * @return {*}
		 */
		clone: function () {
			return new IgePoint3d(this.x, this.y, this.z);
		},
		
		/**
		 * Interpolates the x, y, z values of this point towards the endPoint's
		 * x, y, z values based on the passed time variables and returns a new
		 * IgePoint3d whose values are the result.
		 * @param endPoint
		 * @param startTime
		 * @param currentTime
		 * @param endTime
		 * @return {*}
		 */
		interpolate: function (endPoint, startTime, currentTime, endTime) {
			var totalX = endPoint.x - this.x,
				totalY = endPoint.y - this.y,
				totalZ = endPoint.z - this.z,
				totalTime = endTime - startTime,
				deltaTime = totalTime - (currentTime - startTime),
				timeRatio = deltaTime / totalTime;
			
			return new IgePoint3d(endPoint.x - (totalX * timeRatio), endPoint.y - (totalY * timeRatio), endPoint.z - (totalZ * timeRatio));
		},
		
		/**
		 * Rotates the point by the given radians.
		 * @param {Number} radians Radians to rotate by.
		 * @return {IgePoint3d} A new point with the rotated x, y.
		 */
		rotate: function (radians) {
			var s = Math.sin(radians),
				c = Math.cos(radians),
				x = c * this.x - s * this.y,
				y = s * this.x - c * this.y;
			
			return new IgePoint3d(x, y, this.z);
		},
		
		/**
		 * Rotates the point by the given radians and updates this point
		 * to the new x, y values.
		 * @param {Number} radians Radians to rotate by.
		 * @return {IgePoint3d} This point.
		 */
		thisRotate: function (radians) {
			var s = Math.sin(radians),
				c = Math.cos(radians),
				x = this.x,
				y = this.y;
			
			this.x = c * x - s * y;
			this.y = s * x - c * y;
			
			return this;
		},
		
		/**
		 * Returns a string representation of the point's x, y, z
		 * converting floating point values into fixed using the
		 * passed precision parameter. If no precision is specified
		 * then the precision defaults to 2.
		 * @param {Number=} precision
		 * @return {String}
		 */
		toString: function (precision) {
			if (precision === undefined) { precision = 2; }
			return this.x.toFixed(precision) + ',' + this.y.toFixed(precision) + ',' + this.z.toFixed(precision);
		}
	});
	
	return IgePoint3d;
});
},{"irrelon-appcore":67}],49:[function(_dereq_,module,exports){
"use strict";

var appCore = _dereq_('irrelon-appcore');

appCore.module('IgePoly2d', function (IgeClass, IgePoint2d, IgeRect) {
	/**
	 * Creates a new 2d polygon made up of IgePoint2d instances.
	 */
	var IgePoly2d = IgeClass.extend({
		classId: 'IgePoly2d',
		
		init: function () {
			this._poly = [];
			this._scale = new IgePoint2d(1, 1);
		},
		
		scale: function (x, y) {
			if (x !== undefined && y !== undefined) {
				this._scale.x = x;
				this._scale.y = y;
				
				return this;
			}
			
			return this._scale;
		},
		
		/**
		 * Multiplies the points of the polygon by the supplied factor.
		 * @param {Number} factor The multiplication factor.
		 * @return {*}
		 */
		multiply: function (factor) {
			if (factor !== undefined) {
				var polyPoints = this._poly,
					pointCount = polyPoints.length,
					pointIndex;
				
				for (pointIndex = 0; pointIndex < pointCount; pointIndex++) {
					polyPoints[pointIndex].x *= factor;
					polyPoints[pointIndex].y *= factor;
				}
			}
			
			return this;
		},
		
		/**
		 * Divides the points of the polygon by the supplied value.
		 * @param {Number} value The divide value.
		 * @return {*}
		 */
		divide: function (value) {
			if (value !== undefined) {
				var polyPoints = this._poly,
					pointCount = polyPoints.length,
					pointIndex;
				
				for (pointIndex = 0; pointIndex < pointCount; pointIndex++) {
					polyPoints[pointIndex].x /= value;
					polyPoints[pointIndex].y /= value;
				}
			}
			
			return this;
		},
		
		/**
		 * Adds a point to the polygon relative to the polygon center at 0, 0.
		 * @param x
		 * @param y
		 */
		addPoint: function (x, y) {
			this._poly.push(new IgePoint2d(x, y));
			return this;
		},
		
		/**
		 * Returns the length of the poly array.
		 * @return {Number}
		 */
		length: function () {
			return this._poly.length;
		},
		
		/**
		 * Check if a point is inside this polygon.
		 * @param {IgePoint2d} point
		 * @return {Boolean}
		 */
		pointInPoly: function (point) {
			var polyPoints = this._poly,
				pointCount = polyPoints.length,
				pointIndex,
				oldPointIndex = pointCount - 1,
				c = 0;
			
			for (pointIndex = 0; pointIndex < pointCount; oldPointIndex = pointIndex++) {
				if (((polyPoints[pointIndex].y > point.y) !== (polyPoints[oldPointIndex].y > point.y)) &&
					(point.x < (polyPoints[oldPointIndex].x - polyPoints[pointIndex].x) *
					(point.y - polyPoints[pointIndex].y) / (polyPoints[oldPointIndex].y - polyPoints[pointIndex].y) +
					polyPoints[pointIndex].x)) {
					c = !c;
				}
			}
			
			return Boolean(c);
		},
		
		/**
		 * Check if the passed x and y are inside this polygon.
		 * @param {Number} x
		 * @param {Number} y
		 * @return {Boolean}
		 */
		xyInside: function (x, y) {
			var polyPoints = this._poly,
				pointCount = polyPoints.length,
				pointIndex,
				oldPointIndex = pointCount - 1,
				c = 0;
			
			for (pointIndex = 0; pointIndex < pointCount; oldPointIndex = pointIndex++) {
				if (((polyPoints[pointIndex].y > y) !== (polyPoints[oldPointIndex].y > y)) &&
					(x < (polyPoints[oldPointIndex].x - polyPoints[pointIndex].x) *
					(y - polyPoints[pointIndex].y) / (polyPoints[oldPointIndex].y - polyPoints[pointIndex].y) +
					polyPoints[pointIndex].x)) {
					c = !c;
				}
			}
			
			return Boolean(c);
		},
		
		aabb: function () {
			var minX,
				minY,
				maxX,
				maxY,
				xArr = [],
				yArr = [],
				arr = this._poly,
				arrIndex,
				arrCount = arr.length;
			
			for (arrIndex = 0; arrIndex < arrCount; arrIndex++) {
				xArr.push(arr[arrIndex].x);
				yArr.push(arr[arrIndex].y);
			}
			
			// Get the extents of the newly transformed poly
			minX = Math.min.apply(Math, xArr);
			minY = Math.min.apply(Math, yArr);
			maxX = Math.max.apply(Math, xArr);
			maxY = Math.max.apply(Math, yArr);
			
			return new IgeRect(minX, minY, maxX - minX, maxY - minY);
		},
		
		/**
		 * Returns a copy of this IgePoly2d object that is
		 * it's own version, separate from the original.
		 * @return {IgePoly2d}
		 */
		clone: function () {
			var newPoly = new IgePoly2d(),
				arr = this._poly,
				arrCount = arr.length,
				i;
			
			for (i = 0; i < arrCount; i++) {
				newPoly.addPoint(arr[i].x, arr[i].y);
			}
			
			newPoly.scale(this._scale.x, this._scale.y);
			
			return newPoly;
		},
		
		/**
		 * Determines if the polygon is clockwise or not.
		 * @return {Boolean} A boolean true if clockwise or false
		 * if not.
		 */
		clockWiseTriangle: function () {
			// Loop the polygon points and determine if they are counter-clockwise
			var arr = this._poly,
				val,
				p1, p2, p3;
			
			p1 = arr[0];
			p2 = arr[1];
			p3 = arr[2];
			
			val = (p1.x * p2.y) + (p2.x * p3.y) + (p3.x * p1.y) - (p2.y * p3.x) - (p3.y * p1.x) - (p1.y * p2.x);
			
			return val > 0;
		},
		
		makeClockWiseTriangle: function () {
			// If our data is already clockwise exit
			if (!this.clockWiseTriangle()) {
				var p0 = this._poly[0],
					p1 = this._poly[1],
					p2 = this._poly[2];
				
				this._poly[2] = p1;
				this._poly[1] = p2;
			}
		},
		
		triangulate: function () {
			// Get the indices of each new triangle
			var poly = this._poly,
				triangles = [],
				indices = this.triangulationIndices(),
				i,
				point1,
				point2,
				point3,
				newPoly;
			
			// Generate new polygons from the index data
			for (i = 0; i < indices.length; i += 3) {
				point1 = poly[indices[i]];
				point2 = poly[indices[i + 1]];
				point3 = poly[indices[i + 2]];
				newPoly = new IgePoly2d();
				
				newPoly.addPoint(point1.x, point1.y);
				newPoly.addPoint(point2.x, point2.y);
				newPoly.addPoint(point3.x, point3.y);
				
				// Check the new poly and make sure it's clockwise
				newPoly.makeClockWiseTriangle();
				triangles.push(newPoly);
			}
			
			return triangles;
		},
		
		triangulationIndices: function () {
			var indices = [],
				n = this._poly.length,
				v = [],
				V = [],
				nv,
				count,
				m,
				u,
				w,
				a,
				b,
				c,
				s,
				t;
			
			if (n < 3) { return indices; }
			
			if (this._area() > 0) {
				for (v = 0; v < n; v++) {
					V[v] = v;
				}
			} else {
				for (v = 0; v < n; v++) {
					V[v] = (n - 1) - v;
				}
			}
			
			nv = n;
			count = 2 * nv;
			m = 0;
			
			for (v = nv - 1; nv > 2; ) {
				if ((count--) <= 0) {
					return indices;
				}
				
				u = v;
				if (nv <= u) {
					u = 0;
				}
				
				v = u + 1;
				
				if (nv <= v) {
					v = 0;
				}
				
				w = v + 1;
				
				if (nv <= w) {
					w = 0;
				}
				
				if (this._snip(u, v, w, nv, V)) {
					a = V[u];
					b = V[v];
					c = V[w];
					indices.push(a);
					indices.push(b);
					indices.push(c);
					m++;
					s = v;
					
					for (t = v + 1; t < nv; t++) {
						V[s] = V[t];
						s++;
					}
					
					nv--;
					count = 2 * nv;
				}
			}
			
			indices.reverse();
			return indices;
		},
		
		_area: function () {
			var n = this._poly.length,
				a = 0.0,
				q = 0,
				p,
				pval,
				qval;
			
			for (p = n - 1; q < n; p = q++) {
				pval = this._poly[p];
				qval = this._poly[q];
				a += pval.x * qval.y - qval.x * pval.y;
			}
			
			return (a * 0.5);
		},
		
		_snip: function (u, v, w, n, V) {
			var p,
				A = this._poly[V[u]],
				B = this._poly[V[v]],
				C = this._poly[V[w]],
				P;
			
			// Replaced Math.Epsilon with 0.00001
			if (0.00001 > (((B.x - A.x) * (C.y - A.y)) - ((B.y - A.y) * (C.x - A.x)))) {
				return false;
			}
			
			for (p = 0; p < n; p++) {
				if ((p == u) || (p == v) || (p == w)) {
					continue;
				}
				
				P = this._poly[V[p]];
				if (this._insideTriangle(A, B, C, P)) {
					return false;
				}
			}
			
			return true;
		},
		
		_insideTriangle: function (A, B, C, P) {
			var ax,
				ay,
				bx,
				by,
				cx,
				cy,
				apx,
				apy,
				bpx,
				bpy,
				cpx,
				cpy,
				cCROSSap,
				bCROSScp,
				aCROSSbp;
			
			ax = C.x - B.x; ay = C.y - B.y;
			bx = A.x - C.x; by = A.y - C.y;
			cx = B.x - A.x; cy = B.y - A.y;
			apx = P.x - A.x; apy = P.y - A.y;
			bpx = P.x - B.x; bpy = P.y - B.y;
			cpx = P.x - C.x; cpy = P.y - C.y;
			
			aCROSSbp = ax * bpy - ay * bpx;
			cCROSSap = cx * apy - cy * apx;
			bCROSScp = bx * cpy - by * cpx;
			
			return ((aCROSSbp >= 0.0) && (bCROSScp >= 0.0) && (cCROSSap >= 0.0));
		},
		
		/**
		 * Draws the polygon bounding lines to the passed context.
		 * @param {CanvasRenderingContext2D} ctx
		 */
		render: function (ctx, fill) {
			var polyPoints = this._poly,
				pointCount = polyPoints.length,
				scaleX = this._scale.x,
				scaleY = this._scale.y,
				i;
			
			ctx.beginPath();
			ctx.moveTo(polyPoints[0].x * scaleX, polyPoints[0].y * scaleY);
			for (i = 1; i < pointCount; i++) {
				ctx.lineTo(polyPoints[i].x * scaleX, polyPoints[i].y * scaleY);
			}
			ctx.lineTo(polyPoints[0].x * scaleX, polyPoints[0].y * scaleY);
			if (fill) { ctx.fill(); }
			ctx.stroke();
			
			return this;
		}
	});
	
	return IgePoly2d;
});
},{"irrelon-appcore":67}],50:[function(_dereq_,module,exports){
"use strict";

var appCore = _dereq_('irrelon-appcore');

appCore.module('IgeQuest', function (IgeEventingClass) {
	var IgeQuest = IgeEventingClass.extend({
		classId: 'IgeQuest',
		
		init: function (questDefinition, completeCallback) {
			this._linear = false;
			this._items = [];
			
			this._itemCount = 0;
			this._eventCount = 0;
			this._itemCompleteCount = 0;
			this._eventCompleteCount = 0;
			
			this._started = false;
			this._isComplete = false;
			
			if (questDefinition !== undefined) {
				this.items(questDefinition);
			}
			
			if (completeCallback !== undefined) {
				this._completeCallback = completeCallback;
			}
		},
		
		/**
		 * Gets / sets the callback method that will fire when
		 * the quest has been completed.
		 * @param callback
		 * @return {*}
		 */
		complete: function (callback) {
			if (callback !== undefined) {
				this._completeCallback = callback;
				return this;
			}
			
			return this._completeCallback;
		},
		
		/**
		 * Gets / sets the flag that determines if the quest
		 * has been completed successfully or not.
		 * @param val
		 * @return {*}
		 */
		isComplete: function (val) {
			if (val !== undefined) {
				this._isComplete = val;
				return this;
			}
			
			return this._isComplete;
		},
		
		/**
		 * Gets / sets the flag that determines if the quest items
		 * need to be completed in order (true) or if they can be
		 * completed in any order (false). Default is false.
		 * @param val
		 * @return {*}
		 */
		linear: function (val) {
			if (val !== undefined) {
				this._linear = val;
				return this;
			}
			
			return this._linear;
		},
		
		/**
		 * Gets / sets the items array containing the quest item
		 * definition objects.
		 * @param val
		 * @return {*}
		 */
		items: function (val) {
			if (val !== undefined) {
				this._items = val;
				
				// Set the event and item counts
				var arr = this._items,
					arrCount = arr.length,
					i,
					eventCount = 0;
				
				for (i = 0; i < arrCount; i++) {
					eventCount += arr[i].count;
				}
				
				this._eventCount = eventCount;
				this._itemCount = arrCount;
				
				return this;
			}
			
			return this._items;
		},
		
		/**
		 * Returns the number of quest items this quest has.
		 * @return {Number}
		 */
		itemCount: function () {
			return this._itemCount;
		},
		
		/**
		 * Returns the sum of all event counts for every item
		 * in the quest giving an overall number of events that
		 * need to fire in order for the quest to be completed.
		 * @return {Number}
		 */
		eventCount: function () {
			return this._eventCount;
		},
		
		/**
		 * Returns the number of events that have been completed.
		 * @return {Number}
		 */
		eventCompleteCount: function () {
			return this._eventCompleteCount;
		},
		
		/**
		 * Returns the number of items that have been completed.
		 * @return {Number}
		 */
		itemCompleteCount: function () {
			return this._itemCompleteCount;
		},
		
		/**
		 * Returns the percentage representation of the quest's
		 * overall completion based on number of overall events and
		 * number of events that have been completed.
		 * @return {Number} A number from zero to one-hundred.
		 */
		percentComplete: function () {
			return Math.floor((100 / this._eventCount) * this._eventCompleteCount);
		},
		
		/**
		 * Starts the quest by setting up the quest event
		 * listeners.
		 */
		start: function () {
			if (!this._started) {
				var self = this,
					arr = this._items,
					arrCount = arr.length,
					i;
				
				// Mark the quest as started
				this._started = true;
				
				// Check if we have a linear quest or a non-linear one
				if (!this._linear) {
					// The quest is non-linear so activate all the item listeners now...
					// Loop the quest items array
					for (i = 0; i < arrCount; i++) {
						// Setup the listener for this item
						this._setupItemListener(arr[i]);
					}
				} else {
					// The quest is linear so only activate the first listener for now...
					this._setupItemListener(arr[0]);
				}
				
				this.emit('started');
			} else {
				// Quest already started!
				this.log('Cannot start quest because it has already been started!', 'warning');
				this.emit('alreadyStarted');
			}
			
			return this;
		},
		
		/**
		 * Stops the quest and sets all the event listeners to
		 * ignore events until the quest is restarted.
		 */
		stop: function () {
			if (this._started) {
				this._started = false;
				this.emit('stopped');
			} else {
				this.log('Cannot stop quest because it has not been started yet!', 'warning');
				this.emit('notStarted');
			}
			
			return this;
		},
		
		/**
		 * Resets the quest and item internals back to their
		 * original values and cancels all current event listeners.
		 */
		reset: function () {
			var arr = this._items,
				arrCount = arr.length,
				i, item;
			
			for (i = 0; i < arrCount; i++) {
				item = arr[i];
				
				// Reset all the item internals
				item._complete = false;
				item._eventCount = 0;
				
				// Cancel the event listener
				if (item._listener) {
					item.emitter.off(item.eventName, item._listener);
				}
				
				// Clear the reference holding the item listener
				delete item._listener;
			}
			
			// Reset quest internals
			this._eventCompleteCount = 0;
			this._itemCompleteCount = 0;
			this._isComplete = false;
			
			this.emit('reset');
			
			return this;
		},
		
		/**
		 * Sets up a quest item's event listener.
		 * @param item
		 * @private
		 */
		_setupItemListener: function (item) {
			var self = this;
			
			// Check for an existing listener
			if (!item._listener) {
				// Set the item's internal event count to zero
				// (number of times the event has fired)
				item._eventCount = 0;
				item._complete = false;
				
				// Create the event listener
				item._listener = item.emitter.on(item.eventName, function () {
					// Check if the quest is currently started
					if (self._started) {
						// If the item has an event evaluator method...
						if (item.eventEvaluate) {
							// Check if the event's data evaluated to true
							if (item.eventEvaluate.apply(self, arguments)) {
								// The evaluator returned true so complete the event
								self._eventComplete(item);
							}
						} else {
							self._eventComplete(item);
						}
					}
				});
			}
		},
		
		/**
		 * Handles when an event has been fired for a quest item.
		 * @param item
		 * @private
		 */
		_eventComplete: function (item) {
			// Increment the internal event count
			item._eventCount++;
			
			// Increment the quest's internal event count
			this._eventCompleteCount++;
			
			// Fire the callback to the game logic
			if (item.eventCallback) {
				item.eventCallback.apply(this, item);
			}
			
			// Emit the event complete event
			this.emit('eventComplete', item);
			
			// Check if we've reached our designated event count
			if (item._eventCount === item.count) {
				this._itemComplete(item);
			}
		},
		
		/**
		 * Handles when an item's events have all been fired.
		 * @param item
		 * @private
		 */
		_itemComplete: function (item) {
			var itemIndex,
				arr = this._items;
			
			// Mark the item as complete
			item._complete = true;
			
			// Cancel the listener
			item.emitter.off(item.eventName, item._listener);
			delete item._listener;
			
			// Increment the quest's item complete count
			this._itemCompleteCount++;
			
			// Fire the item's itemCallback to the game logic
			if (item.itemCallback) {
				item.itemCallback.apply(this, item);
			}
			
			// Emit the item complete event
			this.emit('itemComplete', item);
			
			// Tell the quest to check it's internals
			this._update();
			
			// Check if the quest is linear
			if (this._started && this._linear && this._itemCompleteCount < this.itemCount()) {
				// Advance the listener to the next item
				itemIndex = arr.indexOf(item);
				this._setupItemListener(arr[itemIndex + 1]);
				
				// Emit the nextItem event (linear quests only)
				this.emit('nextItem', arr[itemIndex + 1]);
			}
		},
		
		/**
		 * Called when a quest item has been completed to determine
		 * if the quest should continue or if it has also been
		 * completed.
		 * @private
		 */
		_update: function () {
			// Check if all our items are complete
			if (this._itemCompleteCount === this.itemCount()) {
				// Mark the quest as complete
				this._isComplete = true;
				
				// Fire the quest completed callback
				this._completeCallback.apply(this);
				
				// Emit the quest complete event
				this.emit('complete');
				
				// Stop the quest
				this.stop();
				
				// Reset the quest (kills current event listeners)
				this.reset();
			}
		}
	});
	
	return IgeQuest;
});
},{"irrelon-appcore":67}],51:[function(_dereq_,module,exports){
"use strict";

var appCore = _dereq_('irrelon-appcore');

appCore.module('IgeRect', function (IgeClass) {
	/**
	 * Creates a new rectangle (x, y, width, height).
	 */
	var IgeRect = IgeClass.extend({
		classId: 'IgeRect',
		
		init: function (x, y, width, height) {
			// Set values to the passed parameters or
			// zero if they are undefined
			this.x = x = x !== undefined ? x : 0;
			this.y = y = y !== undefined ? y : 0;
			this.width = width = width !== undefined ? width : 0;
			this.height = height = height !== undefined ? height : 0;
			
			this.x2 = this.x / 2;
			this.y2 = this.y / 2;
			
			return this;
		},
		
		/**
		 * Combines the extents of the passed IgeRect with this rect
		 * to create a new rect whose bounds encapsulate both rects.
		 * @param {IgeRect} rect The rect to combine with this one.
		 * @return {IgeRect} The new rect encapsulating both rects.
		 */
		combineRect: function (rect) {
			var thisRectMaxX = this.x + this.width,
				thisRectMaxY = this.y + this.height,
				thatRectMaxX = rect.x + rect.width,
				thatRectMaxY = rect.y + rect.height,
				
				x = Math.min(this.x, rect.x),
				y = Math.min(this.y, rect.y),
				width = Math.max(thisRectMaxX - this.x, thatRectMaxX - this.x),
				height = Math.max(thisRectMaxY - this.y, thatRectMaxY - this.y);
			
			return new IgeRect(x, y, width, height);
		},
		
		/**
		 * Combines the extents of the passed IgeRect with this rect
		 * and replaces this rect with one whose bounds encapsulate
		 * both rects.
		 * @param {IgeRect} rect The rect to combine with this one.
		 */
		thisCombineRect: function (rect) {
			var thisRectMaxX = this.x + this.width,
				thisRectMaxY = this.y + this.height,
				thatRectMaxX = rect.x + rect.width,
				thatRectMaxY = rect.y + rect.height;
			
			this.x = Math.min(this.x, rect.x);
			this.y = Math.min(this.y, rect.y);
			
			this.width = Math.max(thisRectMaxX - this.x, thatRectMaxX - this.x);
			this.height = Math.max(thisRectMaxY - this.y, thatRectMaxY - this.y);
		},
		
		minusPoint: function (point) {
			return new IgeRect(this.x - point.x, this.y - point.y, this.width, this.height);
		},
		
		/**
		 * Compares this rect's dimensions with the passed rect and returns
		 * true if they are the same and false if any is different.
		 * @param {IgeRect} rect
		 * @return {Boolean}
		 */
		compare: function (rect) {
			return rect && this.x === rect.x && this.y === rect.y && this.width === rect.width && this.height === rect.height;
		},
		
		/**
		 * Returns boolean indicating if the passed x, y is
		 * inside the rectangle.
		 * @param x
		 * @param y
		 * @return {Boolean}
		 */
		xyInside: function (x, y) {
			return x >= this.x && y > this.y && x <= this.x + this.width && y <= this.y + this.height;
		},
		
		/**
		 * Returns boolean indicating if the passed point is
		 * inside the rectangle.
		 * @param {IgePoint3d} point
		 * @return {Boolean}
		 */
		pointInside: function (point) {
			return point.x >= this.x && point.y > this.y && point.x <= this.x + this.width && point.y <= this.y + this.height;
		},
		
		/**
		 * Returns boolean indicating if the passed IgeRect is
		 * intersecting the rectangle.
		 * @param {IgeRect} rect
		 * @return {Boolean}
		 */
		rectIntersect: function (rect) {
			this.log('rectIntersect has been renamed to "intersects". Please update your code. rectIntersect will be removed in a later version of IGE.', 'warning');
			return this.intersects(rect);
		},
		
		/**
		 * Returns boolean indicating if the passed IgeRect is
		 * intersecting the rectangle.
		 * @param {IgeRect} rect
		 * @return {Boolean}
		 */
		intersects: function (rect) {
			if (rect) {
				var sX1 = this.x,
					sY1 = this.y,
					sW = this.width,
					sH = this.height,
					
					dX1 = rect.x,
					dY1 = rect.y,
					dW = rect.width,
					dH = rect.height,
					
					sX2 = sX1 + sW,
					sY2 = sY1 + sH,
					dX2 = dX1 + dW,
					dY2 = dY1 + dH;
				
				if (sX1 < dX2 && sX2 > dX1 && sY1 < dY2 && sY2 > dY1) {
					return true;
				}
			}
			
			return false;
		},
		
		/**
		 * Multiplies this rect's data by the values specified
		 * and returns a new IgeRect whose values are the result.
		 * @param x1
		 * @param y1
		 * @param x2
		 * @param y2
		 * @return {*}
		 */
		multiply: function (x1, y1, x2, y2) {
			return new IgeRect(this.x * x1, this.y * y1, this.width * x2, this.height * y2);
		},
		
		/**
		 * Multiplies this rects's data by the values specified and
		 * overwrites the previous values with the result.
		 * @param x1
		 * @param y1
		 * @param x2
		 * @param y2
		 * @return {*}
		 */
		thisMultiply: function (x1, y1, x2, y2) {
			this.x *= x1;
			this.y *= y1;
			this.width *= x2;
			this.height *= y2;
			
			return this;
		},
		
		/**
		 * Returns a clone of this object that is not a reference
		 * but retains the same values.
		 * @return {IgeRect}
		 */
		clone: function () {
			return new IgeRect(this.x, this.y, this.width, this.height);
		},
		
		/**
		 * Returns a string representation of the rect's x, y, width,
		 * height, converting floating point values into fixed using the
		 * passed precision parameter. If no precision is specified
		 * then the precision defaults to 2.
		 * @param {Number=} precision
		 * @return {String}
		 */
		toString: function (precision) {
			if (precision === undefined) { precision = 2; }
			return this.x.toFixed(precision) + ',' + this.y.toFixed(precision) + ',' + this.width.toFixed(precision) + ',' + this.height.toFixed(precision);
		},
		
		/**
		 * Draws the polygon bounding lines to the passed context.
		 * @param {CanvasRenderingContext2D} ctx
		 */
		render: function (ctx, fill) {
			ctx.rect(this.x, this.y, this.width, this.height);
			if (fill) { ctx.fill(); }
			ctx.stroke();
			
			return this;
		}
	});
	
	return IgeRect;
});
},{"irrelon-appcore":67}],52:[function(_dereq_,module,exports){
"use strict";

var appCore = _dereq_('irrelon-appcore');

appCore.module('IgeScene2d', function (IgeEntity) {
	/**
	 * Creates a new 2d scene.
	 */
	var IgeScene2d = IgeEntity.extend({
		classId: 'IgeScene2d',
		
		init: function () {
			this._mouseAlwaysInside = true;
			this._alwaysInView = true;
			IgeEntity.prototype.init.call(this);
			
			this._shouldRender = true;
			this._autoSize = true;
			
			// Set the geometry of the scene to the main canvas
			// width / height - used when positioning UI elements
			this._bounds2d.x = ige._bounds2d.x;
			this._bounds2d.y = ige._bounds2d.y;
			
			this.streamSections(['transform', 'ignoreCamera']);
		},
		
		/**
		 * Gets / sets the stream room id. If set, any streaming entities that
		 * are mounted to this scene will only sync with clients that have been
		 * assigned to this room id.
		 *
		 * @param {String} id The id of the room.
		 * @returns {*}
		 */
		streamRoomId: function (id) {
			if (id !== undefined) {
				this._streamRoomId = id;
				return this;
			}
			
			return this._streamRoomId;
		},
		
		/**
		 * Overrides the default entity stream sections to also stream important
		 * data about scenes to the client.
		 * @param sectionId
		 * @param data
		 * @returns {*}
		 */
		streamSectionData: function (sectionId, data) {
			switch (sectionId) {
				case 'ignoreCamera':
					if (data !== undefined) {
						// Setter
						if (data === 'false') {
							this.ignoreCamera(false);
						} else {
							this.ignoreCamera(true);
						}
					} else {
						// Getter
						return String(this._ignoreCamera);
					}
					break;
				
				default:
					IgeEntity.prototype.streamSectionData.call(this, sectionId, data);
					break;
			}
		},
		
		/**
		 * Gets / sets the auto-size property. If set to true, the scene will
		 * automatically resize to the engine's canvas geometry.
		 * @param {Boolean=} val If true, will autosize the scene to match the
		 * main canvas geometry. This is enabled by default and is unlikely to
		 * help you if you switch it off.
		 * @return {*}
		 */
		autoSize: function (val) {
			if (typeof(val) !== 'undefined') {
				this._autoSize = val;
				return this;
			}
			
			return this._autoSize;
		},
		
		/**
		 * Gets / sets the _shouldRender property. If set to true, the scene's child
		 * object's tick methods will be called.
		 * @param {Boolean} val If set to false, no child entities will be rendered.
		 * @return {Boolean}
		 */
		shouldRender: function (val) {
			if (val !== undefined) {
				this._shouldRender = val;
				return this;
			}
			
			return this._shouldRender;
		},
		
		/**
		 * Gets / sets the flag that determines if the scene will ignore camera
		 * transform values allowing the scene to remain static on screen
		 * regardless of the camera transform.
		 * @param {Boolean=} val True to ignore, false to not ignore.
		 * @return {*}
		 */
		ignoreCamera: function (val) {
			if (val !== undefined) {
				this._ignoreCamera = val;
				return this;
			}
			
			return this._ignoreCamera;
		},
		
		update: function (ctx, tickDelta) {
			if (this._ignoreCamera) {
				// Translate the scene so it is always center of the camera
				var cam = ige._currentCamera;
				this.translateTo(cam._translate.x, cam._translate.y, cam._translate.z);
				this.scaleTo(1 / cam._scale.x, 1 / cam._scale.y, 1 / cam._scale.z);
				this.rotateTo(-cam._rotate.x, -cam._rotate.y, -cam._rotate.z);
				//this._localMatrix.multiply(ige._currentCamera._worldMatrix.getInverse());
			}
			
			IgeEntity.prototype.update.call(this, ctx, tickDelta);
		},
		
		/**
		 * Processes the actions required each render frame.
		 * @param {CanvasRenderingContext2D} ctx The canvas context to render to.
		 */
		tick: function (ctx) {
			if (this._shouldRender) {
				IgeEntity.prototype.tick.call(this, ctx);
			}
		},
		
		/**
		 * Handles screen resize events.
		 * @param event
		 * @private
		 */
		_resizeEvent: function (event) {
			// Set width / height of scene to match main ige (SCENES ARE ALWAYS THE FULL IGE SIZE!!)
			if (this._autoSize) {
				this._bounds2d = ige._bounds2d.clone();
			}
			
			// Resize any children
			var arr = this._children,
				arrCount = arr.length;
			
			while (arrCount--) {
				arr[arrCount]._resizeEvent(event);
			}
		},
		
		/**
		 * Returns a string containing a code fragment that when
		 * evaluated will reproduce this object's properties via
		 * chained commands. This method will only check for
		 * properties that are directly related to this class.
		 * Other properties are handled by their own class method.
		 * @return {String}
		 */
		_stringify: function () {
			// Get the properties for all the super-classes
			var str = IgeEntity.prototype._stringify.call(this), i;
			
			// Loop properties and add property assignment code to string
			for (i in this) {
				if (this.hasOwnProperty(i) && this[i] !== undefined) {
					switch (i) {
						case '_shouldRender':
							str += ".shouldRender(" + this.shouldRender() + ")";
							break;
						case '_autoSize':
							str += ".autoSize(" + this.autoSize() + ")";
							break;
					}
				}
			}
			
			return str;
		}
	});
	
	return IgeScene2d;
});
},{"irrelon-appcore":67}],53:[function(_dereq_,module,exports){
"use strict";

var appCore = _dereq_('irrelon-appcore');

appCore.module('IgeSceneGraph', function (IgeClass) {
	var IgeSceneGraph = IgeClass.extend({
		classId: 'IgeSceneGraph',
		interfaceImplements: [
			'addGraph',
			'removeGraph'
		],
		
		/**
		 * Called when loading the graph data via ige.addGraph().
		 * @param {Object=} options The options that were passed with the call
		 * to ige.addGraph().
		 */
		addGraph: function (options) {
			
		},
		
		/**
		 * The method called when the graph items are to be removed from the
		 * active graph.
		 */
		removeGraph: function () {
			
		}
	});
	
	return IgeSceneGraph;
});
},{"irrelon-appcore":67}],54:[function(_dereq_,module,exports){
"use strict";

var appCore = _dereq_('irrelon-appcore');

appCore.module('IgeSpriteSheet', function (IgeTexture) {
	/**
	 * Creates a new sprite sheet that cuts an image up into
	 * arbitrary sections.
	 */
	var IgeSpriteSheet = IgeTexture.extend({
		classId: 'IgeSpriteSheet',
		IgeSpriteSheet: true,
		
		init: function (url, cells) {
			this._spriteCells = cells;
			
			IgeTexture.prototype.init.call(this, url);
		},
		
		_textureLoaded: function () {
			if (this.image) {
				// Store the cell sheet image
				this._sheetImage = this.image;
				var i, cells = this._spriteCells;
				
				if (!cells) {
					// Try to automatically determine cells
					this.log('No cell data provided for sprite sheet, attempting to automatically detect sprite bounds...');
					cells = this.detectCells(this._sheetImage);
				}
				
				// Cells in the sheets always start at index
				// 1 so move all the cells one forward
				for (i = 0; i < cells.length; i++) {
					this._cells[i + 1] = cells[i];
					
					if (this._checkModulus) {
						// Check cell for division by 2 modulus warnings
						if (cells[i][2] % 2) {
							this.log('This texture\'s cell definition defines a cell width is not divisible by 2 which can cause the texture to use sub-pixel rendering resulting in a blurred image. This may also slow down the renderer on some browsers. Image file: ' + this._url, 'warning', cells[i]);
						}
						
						if (cells[i][3] % 2) {
							this.log('This texture\'s cell definition defines a cell height is not divisible by 2 which can cause the texture to use sub-pixel rendering resulting in a blurred image. This may also slow down the renderer on some browsers. Image file: ' + this._url, 'warning', cells[i]);
						}
					}
				}
			} else {
				// Unable to create cells from non-image texture
				// TODO: Low-priority - Support cell sheets from smart-textures
				this.log('Cannot create cell-sheet because texture has not loaded an image!', 'error');
			}
			
			IgeTexture.prototype._textureLoaded.call(this);
		},
		
		/**
		 * Uses the sprite sheet image pixel data to detect distinct sprite
		 * bounds.
		 * @param img
		 * @return {Array} An array of cell bounds.
		 */
		detectCells: function (img) {
			// Create a temp canvas
			var canvas = document.createElement('canvas'),
				ctx = canvas.getContext('2d'),
				pixels,
				x, y,
				newRect,
				spriteRects = [];
			
			canvas.width = img.width;
			canvas.height = img.height;
			
			// Draw the sheet to the canvas
			ctx.drawImage(img, 0, 0);
			
			// Read the pixel data
			pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
			
			// Loop the pixels and find non-transparent one
			for (y = 0; y < canvas.height; y++) {
				for (x = 0; x < canvas.width; x++) {
					// Check if the pixel is not transparent
					if (!pixels.isTransparent(x, y)) {
						// We found a non-transparent pixel so
						// is it in a rect we have already defined?
						if (!this._pixelInRects(spriteRects, x, y)) {
							// The pixel is not already in a rect,
							// so determine the bounding rect for
							// the new sprite whose pixel we've found
							newRect = this._determineRect(pixels, x, y);
							
							if (newRect) {
								spriteRects.push(newRect);
							} else {
								this.log('Cannot automatically determine sprite bounds!', 'warning');
								return [];
							}
						}
					}
				}
			}
			
			return spriteRects;
		},
		
		_pixelInRects: function (rects, x, y) {
			var rectIndex,
				rectCount = rects.length,
				rect;
			
			for (rectIndex = 0; rectIndex < rectCount; rectIndex++) {
				rect = rects[rectIndex];
				
				// Check if the x, y is inside this rect
				if (x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height) {
					// The x, y is inside this rect
					return true;
				}
			}
			
			return false;
		},
		
		_determineRect: function (pixels, x, y) {
			var pixArr = [{x: x, y: y}],
				rect = {x: x, y: y, width: 1, height: 1},
				currentPixel;
			
			while (pixArr.length) {
				// De-queue front item
				currentPixel = pixArr.shift();
				
				// Expand rect to include pixel position
				if (currentPixel.x > rect.x + rect.width) {
					rect.width = currentPixel.x - rect.x + 1;
				}
				
				if (currentPixel.y > rect.y + rect.height) {
					rect.height = currentPixel.y - rect.y + 1;
				}
				
				if (currentPixel.x < rect.x) {
					rect.width += rect.x - currentPixel.x;
					rect.x = currentPixel.x;
				}
				
				if (currentPixel.y < rect.y) {
					rect.height += rect.y - currentPixel.y;
					rect.y = currentPixel.y;
				}
				
				// Check surrounding pixels
				if (!pixels.isTransparent(currentPixel.x - 1, currentPixel.y - 1)) {
					// Mark pixel so we dont use it again
					pixels.makeTransparent(currentPixel.x - 1, currentPixel.y - 1);
					
					// Add pixel position to queue
					pixArr.push({x: currentPixel.x - 1, y: currentPixel.y - 1})
				}
				
				if (!pixels.isTransparent(currentPixel.x, currentPixel.y - 1)) {
					// Mark pixel so we dont use it again
					pixels.makeTransparent(currentPixel.x, currentPixel.y - 1);
					
					// Add pixel position to queue
					pixArr.push({x: currentPixel.x, y: currentPixel.y - 1})
				}
				
				if (!pixels.isTransparent(currentPixel.x + 1, currentPixel.y - 1)) {
					// Mark pixel so we dont use it again
					pixels.makeTransparent(currentPixel.x + 1, currentPixel.y - 1);
					
					// Add pixel position to queue
					pixArr.push({x: currentPixel.x + 1, y: currentPixel.y - 1})
				}
				
				if (!pixels.isTransparent(currentPixel.x - 1, currentPixel.y)) {
					// Mark pixel so we dont use it again
					pixels.makeTransparent(currentPixel.x - 1, currentPixel.y);
					
					// Add pixel position to queue
					pixArr.push({x: currentPixel.x - 1, y: currentPixel.y})
				}
				
				if (!pixels.isTransparent(currentPixel.x + 1, currentPixel.y)) {
					// Mark pixel so we dont use it again
					pixels.makeTransparent(currentPixel.x + 1, currentPixel.y);
					
					// Add pixel position to queue
					pixArr.push({x: currentPixel.x + 1, y: currentPixel.y})
				}
				
				if (!pixels.isTransparent(currentPixel.x - 1, currentPixel.y + 1)) {
					// Mark pixel so we dont use it again
					pixels.makeTransparent(currentPixel.x - 1, currentPixel.y + 1);
					
					// Add pixel position to queue
					pixArr.push({x: currentPixel.x - 1, y: currentPixel.y + 1})
				}
				
				if (!pixels.isTransparent(currentPixel.x, currentPixel.y + 1)) {
					// Mark pixel so we dont use it again
					pixels.makeTransparent(currentPixel.x, currentPixel.y + 1);
					
					// Add pixel position to queue
					pixArr.push({x: currentPixel.x, y: currentPixel.y + 1})
				}
				
				if (!pixels.isTransparent(currentPixel.x + 1, currentPixel.y + 1)) {
					// Mark pixel so we dont use it again
					pixels.makeTransparent(currentPixel.x + 1, currentPixel.y + 1);
					
					// Add pixel position to queue
					pixArr.push({x: currentPixel.x + 1, y: currentPixel.y + 1})
				}
			}
			
			return [rect.x, rect.y, rect.width, rect.height];
		},
		
		/**
		 * Returns the total number of cells in the cell sheet.
		 * @return {Number}
		 */
		cellCount: function () {
			return this._cells.length;
		},
		
		/**
		 * Returns the cell index that the passed cell id corresponds
		 * to.
		 * @param {String} id
		 * @return {Number} The cell index that the cell id corresponds
		 * to or -1 if a corresponding index could not be found.
		 */
		cellIdToIndex: function (id) {
			var cells = this._cells,
				i;
			for (i = 1; i < cells.length; i++) {
				if (cells[i][4] === id) {
					// Found the cell id so return the index
					return i;
				}
			}
			
			return -1;
		},
		
		/**
		 * Returns a string containing a code fragment that when
		 * evaluated will reproduce this object.
		 * @return {String}
		 */
		stringify: function () {
			var str = "new " + this.classId() + "('" + this.url() + "', " + this._cells.toString() + ")";
			
			// Every object has an ID, assign that first
			// IDs are automatically generated from texture urls
			//str += ".id('" + this.id() + "');";
			
			return str;
		}
	});
	
	return IgeSpriteSheet;
});
},{"irrelon-appcore":67}],55:[function(_dereq_,module,exports){
"use strict";

var appCore = _dereq_('irrelon-appcore');

appCore.module('IgeTexture', function (IgeEventingClass) {
	/**
	 * Creates a new texture.
	 */
	var IgeTexture = IgeEventingClass.extend({
		classId: 'IgeTexture',
		IgeTexture: true,
		
		/**
		 * Constructor for a new IgeTexture.
		 * @param {String, Object} urlOrObject Either a string URL that
		 * points to the path of the image or script you wish to use as
		 * the texture image, or an object containing a smart texture.
		 * @return {*}
		 */
		init: function (urlOrObject) {
			this._loaded = false;
			
			/* CEXCLUDE */
			// If on a server, error
			if (ige.isServer) {
				this.log('Cannot create a texture on the server. Textures are only client-side objects. Please alter your code so that you don\'t try to load a texture on the server-side using something like an if statement around your texture laoding such as "if (ige.isClient) {}".', 'error');
				return this;
			}
			/* CEXCLUDE */
			
			// Create an array that is used to store cell dimensions
			this._cells = [];
			this._smoothing = ige._globalSmoothing;
			
			// Instantiate filter lists for filter combinations
			this._applyFilters = [];
			this._applyFiltersData = [];
			this._preFilters = [];
			this._preFiltersData = [];
			
			var type = typeof(urlOrObject);
			
			if (type === 'string') {
				// Load the texture URL
				if (urlOrObject) {
					this.url(urlOrObject);
				}
			}
			
			if (type === 'object') {
				// Assign the texture script object
				this.assignSmartTextureImage(urlOrObject);
			}
		},
		
		/**
		 * Gets / sets the current object id. If no id is currently assigned and no
		 * id is passed to the method, it will automatically generate and assign a
		 * new id as a 16 character hexadecimal value typed as a string.
		 * @param {String=} id
		 * @return {*} Returns this when setting the value or the current value if none is specified.
		 */
		id: function (id) {
			if (id !== undefined) {
				// Check if this ID already exists in the object register
				if (ige._register[id]) {
					if (ige._register[id] === this) {
						// We are already registered as this id
						return this;
					}
					
					// Already an object with this ID!
					this.log('Cannot set ID of object to "' + id + '" because that ID is already in use by another object!', 'error');
				} else {
					// Check if we already have an id assigned
					if (this._id && ige._register[this._id]) {
						// Unregister the old ID before setting this new one
						ige.unRegister(this);
					}
					
					this._id = id;
					
					// Now register this object with the object register
					ige.register(this);
					
					return this;
				}
			}
			
			if (!this._id) {
				// The item has no id so generate one automatically
				if (this._url) {
					// Generate an ID from the URL string of the image
					// this texture is using. Useful for always reproducing
					// the same ID for the same texture :)
					this._id = ige.newIdFromString(this._url);
				} else {
					// We don't have a URL so generate a random ID
					this._id = ige.newIdHex();
				}
				ige.register(this);
			}
			
			return this._id;
		},
		
		/**
		 * Gets / sets the source file for this texture.
		 * @param {String=} url "The url used to load the file for this texture.
		 * @return {*}
		 */
		url: function (url) {
			if (url !== undefined) {
				this._url = url;
				
				if (url.substr(url.length - 2, 2) === 'js') {
					// This is a script-based texture, load the script
					this._loadScript(url);
				} else {
					// This is an image-based texture, load the image
					this._loadImage(url);
				}
				
				return this;
			}
			
			return this._url;
		},
		
		/**
		 * Loads an image into an img tag and sets an onload event
		 * to capture when the image has finished loading.
		 * @param {String} imageUrl The image url used to load the
		 * image data.
		 * @private
		 */
		_loadImage: function (imageUrl) {
			var image,
				self = this;
			
			if (ige.isClient) {
				// Increment the texture load count
				ige.textureLoadStart(imageUrl, this);
				
				// Check if the image url already exists in the image cache
				if (!ige._textureImageStore[imageUrl]) {
					// Image not in cache, create the image object
					image = ige._textureImageStore[imageUrl] = this.image = this._originalImage = new Image();
					image._igeTextures = image._igeTextures || [];
					
					// Add this texture to the textures that are using this image
					image._igeTextures.push(this);
					
					image.onload = function () {
						// Mark the image as loaded
						image._loaded = true;
						
						// Log success
						ige.log('Texture image (' + imageUrl + ') loaded successfully');
						
						/*if (image.width % 2) {
						 self.log('The texture ' + imageUrl + ' width (' + image.width + ') is not divisible by 2 to a whole number! This can cause rendering artifacts. It can also cause performance issues on some GPUs. Please make sure your texture width is divisible by 2!', 'warning');
						 }
						 
						 if (image.height % 2) {
						 self.log('The texture ' + imageUrl + ' height (' + image.height + ') is not divisible by 2 to a whole number! This can cause rendering artifacts. It can also cause performance issues on some GPUs. Please make sure your texture height is divisible by 2!', 'warning');
						 }*/
						
						// Loop textures that are using this image
						var arr = image._igeTextures,
							arrCount = arr.length, i,
							item;
						
						for (i = 0; i < arrCount; i++) {
							item = arr[i];
							
							item._mode = 0;
							
							item.sizeX(image.width);
							item.sizeY(image.height);
							
							item._cells[1] = [0, 0, item._sizeX, item._sizeY];
							
							// Mark texture as loaded
							item._textureLoaded();
						}
					};
					
					// Start the image loading by setting the source url
					image.src = imageUrl;
				} else {
					// Grab the cached image object
					image = this.image = this._originalImage = ige._textureImageStore[imageUrl];
					
					// Add this texture to the textures that are using this image
					image._igeTextures.push(this);
					
					if (image._loaded) {
						// The cached image object is already loaded so
						// fire off the relevant events
						self._mode = 0;
						
						self.sizeX(image.width);
						self.sizeY(image.height);
						
						if (image.width % 2) {
							this.log('This texture\'s width is not divisible by 2 which will cause the texture to use sub-pixel rendering resulting in a blurred image. This may also slow down the renderer on some browsers. Image file: ' + this._url, 'warning');
						}
						
						if (image.height % 2) {
							this.log('This texture\'s height is not divisible by 2 which will cause the texture to use sub-pixel rendering resulting in a blurred image. This may also slow down the renderer on some browsers. Image file: ' + this._url, 'warning');
						}
						
						self._cells[1] = [0, 0, self._sizeX, self._sizeY];
						
						// Mark texture as loaded
						self._textureLoaded();
					}
				}
			}
		},
		
		_textureLoaded: function () {
			var self = this;
			
			// Set a timeout here so that when this event is emitted,
			// the code creating the texture is given a chance to
			// set a listener first, otherwise this will be emitted
			// but nothing will have time to register a listener!
			setTimeout(function () {
				self._loaded = true;
				self.emit('loaded');
				
				// Inform the engine that this image has loaded
				ige.textureLoadEnd(self.image.src, self);
			}, 5);
		},
		
		/**
		 * Loads a render script into a script tag and sets an onload
		 * event to capture when the script has finished loading.
		 * @param {String} scriptUrl The script url used to load the
		 * script data.
		 * @private
		 */
		_loadScript: function (scriptUrl) {
			var textures = ige.textures,
				rs_sandboxContext,
				self = this,
				scriptElem;
			
			ige.textureLoadStart(scriptUrl, this);
			
			if (ige.isClient) {
				scriptElem = document.createElement('script');
				scriptElem.onload = function(data) {
					self.log('Texture script "' + scriptUrl + '" loaded successfully');
					// Parse the JS with evil eval and store the result in the asset
					eval(data);
					
					// Store the eval data (the "image" variable is declared
					// by the texture script and becomes available in this scope
					// because we evaluated it above)
					self._mode = 1;
					self.script = image;
					
					// Run the asset script init method
					if (typeof(image.init) === 'function') {
						image.init.apply(image, [self]);
					}
					
					//self.sizeX(image.width);
					//self.sizeY(image.height);
					
					self._loaded = true;
					self.emit('loaded');
					ige.textureLoadEnd(scriptUrl, self);
				};
				
				scriptElem.addEventListener('error', function () {
					self.log('Error loading smart texture script file: ' + scriptUrl, 'error');
				}, true);
				
				scriptElem.src = scriptUrl;
				document.getElementsByTagName('head')[0].appendChild(scriptElem);
			}
		},
		
		/**
		 * Assigns a render script to the smart texture.
		 * @param {String} scriptObj The script object.
		 * @private
		 */
		assignSmartTextureImage: function (scriptObj) {
			var textures = ige.textures,
				rs_sandboxContext,
				self = this,
				scriptElem;
			
			// Check the object has a render method
			if (typeof(scriptObj.render) === 'function') {
				//ige.textureLoadStart(scriptUrl, this);
				
				// Store the script data
				self._mode = 1;
				self.script = scriptObj;
				
				// Run the asset script init method
				if (typeof(scriptObj.init) === 'function') {
					scriptObj.init.apply(scriptObj, [self]);
				}
				
				//self.sizeX(image.width);
				//self.sizeY(image.height);
				
				self._loaded = true;
				self.emit('loaded');
				//ige.textureLoadEnd(scriptUrl, self);
			} else {
				this.log('Cannot assign smart texture because it doesn\'t have a render() method!', 'error');
			}
		},
		
		/**
		 * Sets the image element that the IgeTexture will use when
		 * rendering. This is a special method not designed to be called
		 * directly by any game code and is used specifically when
		 * assigning an existing canvas element to an IgeTexture.
		 * @param {Image} imageElement The canvas / image to use as
		 * the image data for the IgeTexture.
		 * @private
		 */
		_setImage: function (imageElement) {
			var image,
				self = this;
			
			if (ige.isClient) {
				// Create the image object
				image = this.image = this._originalImage = imageElement;
				image._igeTextures = image._igeTextures || [];
				
				// Mark the image as loaded
				image._loaded = true;
				
				this._mode = 0;
				
				this.sizeX(image.width);
				this.sizeY(image.height);
				
				this._cells[1] = [0, 0, this._sizeX, this._sizeY];
			}
		},
		
		/**
		 * Creates a new texture from a cell in the existing texture
		 * and returns the new texture.
		 * @param {Number, String} indexOrId The cell index or id to use.
		 * @return {*}
		 */
		textureFromCell: function (indexOrId) {
			var tex = new IgeTexture(),
				self = this;
			
			if (this._loaded) {
				this._textureFromCell(tex, indexOrId);
			} else {
				// The texture has not yet loaded, return the new texture and set a listener to handle
				// when this texture has loaded so we can assign the texture's image properly
				this.on('loaded', function () {
					self._textureFromCell(tex, indexOrId);
				})
			}
			
			return tex;
		},
		
		/**
		 * Called by textureFromCell() when the texture is ready
		 * to be processed. See textureFromCell() for description.
		 * @param {IgeTexture} tex The new texture to paint to.
		 * @param {Number, String} indexOrId The cell index or id
		 * to use.
		 * @private
		 */
		_textureFromCell: function (tex, indexOrId) {
			var index,
				cell,
				canvas,
				ctx;
			
			if (typeof(indexOrId) === 'string') {
				index = this.cellIdToIndex(indexOrId);
			} else {
				index = indexOrId;
			}
			
			if (this._cells[index]) {
				// Create a new IgeTexture, then draw the existing cell
				// to it's internal canvas
				cell = this._cells[index];
				canvas = document.createElement('canvas');
				ctx = canvas.getContext('2d');
				
				// Set smoothing mode
				// TODO: Does this cause a costly context change? If so maybe we set a global value to keep
				// TODO: track of the value and evaluate first before changing?
				if (!this._smoothing) {
					ctx.imageSmoothingEnabled = false;
					ctx.webkitImageSmoothingEnabled = false;
					ctx.mozImageSmoothingEnabled = false;
				} else {
					ctx.imageSmoothingEnabled = true;
					ctx.webkitImageSmoothingEnabled = true;
					ctx.mozImageSmoothingEnabled = true;
				}
				
				canvas.width = cell[2];
				canvas.height = cell[3];
				
				// Draw the cell to the canvas
				ctx.drawImage(
					this._originalImage,
					cell[0],
					cell[1],
					cell[2],
					cell[3],
					0,
					0,
					cell[2],
					cell[3]
				);
				
				// Set the new texture's image to the canvas
				tex._setImage(canvas);
				tex._loaded = true;
				
				// Fire the loaded event
				setTimeout(function () {
					tex.emit('loaded');
				}, 1);
			} else {
				this.log('Unable to create new texture from passed cell index (' + indexOrId + ') because the cell does not exist!', 'warning');
			}
		},
		
		/**
		 * Sets the _sizeX property.
		 * @param {Number} val
		 */
		sizeX: function (val) {
			this._sizeX = val;
		},
		
		/**
		 * Sets the _sizeY property.
		 * @param {Number} val
		 */
		sizeY: function (val) {
			this._sizeY = val;
		},
		
		/**
		 * Resizes the original texture image to a new size. This alters
		 * the image that the texture renders so all entities that use
		 * this texture will output the newly resized version of the image.
		 * @param {Number} x The new width.
		 * @param {Number} y The new height.
		 * @param {Boolean=} dontDraw If true the resized image will not be
		 * drawn to the texture canvas. Useful for just resizing the texture
		 * canvas and not the output image. Use in conjunction with the
		 * applyFilter() and preFilter() methods.
		 */
		resize: function (x, y, dontDraw) {
			if (this._originalImage) {
				if (this._loaded) {
					if (!this._textureCtx) {
						// Create a new canvas
						this._textureCanvas = document.createElement('canvas');
					}
					
					this._textureCanvas.width = x;
					this._textureCanvas.height = y;
					this._textureCtx = this._textureCanvas.getContext('2d');
					
					// Set smoothing mode
					if (!this._smoothing) {
						this._textureCtx.imageSmoothingEnabled = false;
						this._textureCtx.webkitImageSmoothingEnabled = false;
						this._textureCtx.mozImageSmoothingEnabled = false;
					} else {
						this._textureCtx.imageSmoothingEnabled = true;
						this._textureCtx.webkitImageSmoothingEnabled = true;
						this._textureCtx.mozImageSmoothingEnabled = true;
					}
					
					if (!dontDraw) {
						// Draw the original image to the new canvas
						// scaled as required
						this._textureCtx.drawImage(
							this._originalImage,
							0,
							0,
							this._originalImage.width,
							this._originalImage.height,
							0,
							0,
							x,
							y
						);
					}
					
					// Swap the current image for this new canvas
					this.image = this._textureCanvas;
				} else {
					this.log('Cannot resize texture because the texture image (' + this._url + ') has not loaded into memory yet!', 'error');
				}
			}
		},
		
		/**
		 * Resizes the original texture image to a new size based on percentage.
		 * This alters the image that the texture renders so all entities that use
		 * this texture will output the newly resized version of the image.
		 * @param {Number} x The new width.
		 * @param {Number} y The new height.
		 * @param {Boolean=} dontDraw If true the resized image will not be
		 * drawn to the texture canvas. Useful for just resizing the texture
		 * canvas and not the output image. Use in conjunction with the
		 * applyFilter() and preFilter() methods.
		 */
		resizeByPercent: function (x, y, dontDraw) {
			if (this._originalImage) {
				if (this._loaded) {
					// Calc final x/y values
					x = Math.floor((this.image.width / 100) * x);
					y = Math.floor((this.image.height / 100) * y);
					
					if (!this._textureCtx) {
						// Create a new canvas
						this._textureCanvas = document.createElement('canvas');
					}
					
					this._textureCanvas.width = x;
					this._textureCanvas.height = y;
					this._textureCtx = this._textureCanvas.getContext('2d');
					
					// Set smoothing mode
					if (!this._smoothing) {
						this._textureCtx.imageSmoothingEnabled = false;
						this._textureCtx.webkitImageSmoothingEnabled = false;
						this._textureCtx.mozImageSmoothingEnabled = false;
					} else {
						this._textureCtx.imageSmoothingEnabled = true;
						this._textureCtx.webkitImageSmoothingEnabled = true;
						this._textureCtx.mozImageSmoothingEnabled = true;
					}
					
					if (!dontDraw) {
						// Draw the original image to the new canvas
						// scaled as required
						this._textureCtx.drawImage(
							this._originalImage,
							0,
							0,
							this._originalImage.width,
							this._originalImage.height,
							0,
							0,
							x,
							y
						);
					}
					
					// Swap the current image for this new canvas
					this.image = this._textureCanvas;
				} else {
					this.log('Cannot resize texture because the texture image (' + this._url + ') has not loaded into memory yet!', 'error');
				}
			}
		},
		
		/**
		 * Sets the texture image back to the original image that the
		 * texture first loaded. Useful if you have applied filters
		 * or resized the image and now want to revert back to the
		 * original.
		 */
		restoreOriginal: function () {
			this.image = this._originalImage;
			delete this._textureCtx;
			delete this._textureCanvas;
			
			this.removeFilters();
		},
		
		smoothing: function (val) {
			if (val !== undefined) {
				this._smoothing = val;
				return this;
			}
			
			return this._smoothing;
		},
		
		/**
		 * Renders the texture image to the passed canvas context.
		 * @param {CanvasRenderingContext2d} ctx The canvas context to draw to.
		 * @param {IgeEntity} entity The entity that this texture is
		 * being drawn for.
		 */
		render: function (ctx, entity) {
			// Check that the cell is not set to null. If it is then
			// we don't render anything which effectively makes the
			// entity "blank"
			if (entity._cell !== null) {
				// TODO: Does this cause a costly context change? If so maybe we set a global value to keep
				// TODO: track of the value and evaluate first before changing?
				if (!this._smoothing) {
					ige._ctx.imageSmoothingEnabled = false;
					ige._ctx.webkitImageSmoothingEnabled = false;
					ige._ctx.mozImageSmoothingEnabled = false;
				} else {
					ige._ctx.imageSmoothingEnabled = true;
					ige._ctx.webkitImageSmoothingEnabled = true;
					ige._ctx.mozImageSmoothingEnabled = true;
				}
				
				if (this._mode === 0) {
					// This texture is image-based
					var cell = this._cells[entity._cell],
						geom = entity._bounds2d,
						poly = entity._renderPos; // Render pos is calculated in the IgeEntity.aabb() method
					
					if (cell) {
						if (this._preFilters.length > 0 && this._textureCtx) {
							// Call the drawing of the original image
							this._textureCtx.clearRect(0, 0, this._textureCanvas.width, this._textureCanvas.height);
							this._textureCtx.drawImage(this._originalImage, 0, 0);
							
							var self = this;
							// Call the applyFilter and preFilter methods one by one
							this._applyFilters.forEach(function(method, index) {
								self._textureCtx.save();
								method(self._textureCanvas, self._textureCtx, self._originalImage, self, self._applyFiltersData[index]);
								self._textureCtx.restore();
							});
							this._preFilters.forEach(function(method, index) {
								self._textureCtx.save();
								method(self._textureCanvas, self._textureCtx, self._originalImage, self, self._preFiltersData[index]);
								self._textureCtx.restore();
							});
						}
						
						ctx.drawImage(
							this.image,
							cell[0], // texture x
							cell[1], // texture y
							cell[2], // texture width
							cell[3], // texture height
							poly.x, // render x
							poly.y, // render y
							geom.x, // render width
							geom.y // render height
						);
						
						ige._drawCount++;
					} else {
						this.log('Cannot render texture using cell ' + entity._cell + ' because the cell does not exist in the assigned texture!', 'error');
					}
				}
				
				if (this._mode === 1) {
					// This texture is script-based (a "smart texture")
					ctx.save();
					this.script.render(ctx, entity, this);
					ctx.restore();
					
					ige._drawCount++;
				}
			}
		},
		
		/**
		 * Removes a certain filter from the texture
		 * Useful if you want to keep resizings, etc.
		 */
		removeFilter: function(method) {
			var i;
			while ((i = this._preFilters.indexOf(method)) > -1) {
				this._preFilters[i] = undefined;
				this._preFiltersData[i] = undefined;
			}
			while ((i = this._applyFilters.indexOf(method)) > -1) {
				this._applyFilters[i] = undefined;
				this._applyFiltersData[i] = undefined;
			}
			this._preFilters = this._preFilters.clean();
			this._preFiltersData = this._preFiltersData.clean();
			this._applyFilters = this._applyFilters.clean();
			this._applyFiltersData = this._applyFiltersData.clean();
			
			this._rerenderFilters();
		},
		
		/**
		 * Removes all filters on the texture
		 * Useful if you want to keep resizings, etc.
		 */
		removeFilters: function() {
			this._applyFilters = [];
			this._applyFiltersData = [];
			this._preFilters = [];
			this._preFiltersData = [];
			
			this._rerenderFilters();
		},
		
		/**
		 * Rerenders image with filter list. Keeps sizings.
		 * Useful if you have no preFilters
		 */
		_rerenderFilters: function() {
			if (!this._textureCanvas) return;
			// Rerender applyFilters from scratch:
			// Draw the basic image
			// resize it to the old boundaries
			this.resize(this._textureCanvas.width, this._textureCanvas.height, false);
			// Draw applyFilter layers upon it
			var self = this;
			this._applyFilters.forEach(function(method, index) {
				self._textureCtx.save();
				method(self._textureCanvas, self._textureCtx, self._originalImage, self, self._applyFiltersData[index]);
				self._textureCtx.restore();
			});
		},
		
		/**
		 * Gets / sets the pre-filter method that will be called before
		 * the texture is rendered and will allow you to modify the texture
		 * image before rendering each tick.
		 * @param method
		 * @return {*}
		 */
		preFilter: function (method, data) {
			if (method !== undefined) {
				if (this._originalImage) {
					if (!this._textureCtx) {
						// Create a new canvas
						this._textureCanvas = document.createElement('canvas');
						
						this._textureCanvas.width = this._originalImage.width;
						this._textureCanvas.height = this._originalImage.height;
						this._textureCtx = this._textureCanvas.getContext('2d');
						
						// Set smoothing mode
						if (!this._smoothing) {
							this._textureCtx.imageSmoothingEnabled = false;
							this._textureCtx.webkitImageSmoothingEnabled = false;
							this._textureCtx.mozImageSmoothingEnabled = false;
						} else {
							this._textureCtx.imageSmoothingEnabled = true;
							this._textureCtx.webkitImageSmoothingEnabled = true;
							this._textureCtx.mozImageSmoothingEnabled = true;
						}
					}
					
					// Swap the current image for this new canvas
					this.image = this._textureCanvas;
					
					// Save filter in active preFilter list
					this._preFilters[this._preFilters.length] = method;
					this._preFiltersData[this._preFiltersData.length] = !data ? {} : data;
				}
				return this;
			} else {
				this.log('Cannot use pre-filter, no filter method was passed!', 'warning');
			}
			
			return this._preFilters[this._preFilters.length - 1];
		},
		
		/**
		 * Applies a filter to the texture. The filter is a method that will
		 * take the canvas, context and originalImage parameters and then
		 * use context calls to alter / paint the context with the texture
		 * and any filter / adjustments that you want to apply.
		 * @param {Function} method
		 * @param {Object=} data
		 * @return {*}
		 */
		applyFilter: function (method, data) {
			if (this._loaded) {
				if (method !== undefined) {
					if (this._originalImage) {
						if (!this._textureCtx) {
							// Create a new canvas
							this._textureCanvas = document.createElement('canvas');
							
							this._textureCanvas.width = this._originalImage.width;
							this._textureCanvas.height = this._originalImage.height;
							this._textureCtx = this._textureCanvas.getContext('2d');
							
							// Draw the basic image
							this._textureCtx.clearRect(0, 0, this._textureCanvas.width, this._textureCanvas.height);
							this._textureCtx.drawImage(this._originalImage, 0, 0);
							
							// Set smoothing mode
							if (!this._smoothing) {
								this._textureCtx.imageSmoothingEnabled = false;
								this._textureCtx.webkitImageSmoothingEnabled = false;
								this._textureCtx.mozImageSmoothingEnabled = false;
							} else {
								this._textureCtx.imageSmoothingEnabled = true;
								this._textureCtx.webkitImageSmoothingEnabled = true;
								this._textureCtx.mozImageSmoothingEnabled = true;
							}
						}
						
						// Swap the current image for this new canvas
						this.image = this._textureCanvas;
						
						// Call the passed method
						if (this._preFilters.length <= 0) {
							this._textureCtx.save();
							method(this._textureCanvas, this._textureCtx, this._originalImage, this, data);
							this._textureCtx.restore();
						}
						
						// Save filter in active applyFiler list
						this._applyFilters[this._applyFilters.length] = method;
						this._applyFiltersData[this._applyFiltersData.length] = !data ? {} : data;
					}
				} else {
					this.log('Cannot apply filter, no filter method was passed!', 'warning');
				}
			} else {
				this.log('Cannot apply filter, the texture you are trying to apply the filter to has not yet loaded!', 'error');
			}
			
			return this;
		},
		
		/**
		 * Retrieves pixel data from x,y texture coordinate (starts from top-left).
		 * Important: If the texture has a cross-domain url, the image host must allow
		 * cross-origin resource sharing or a security error will be thrown.
		 * Reference: http://blog.chromium.org/2011/07/using-cross-domain-images-in-webgl-and.html
		 * @param  {Number} x
		 * @param  {Number} y
		 * @return {Array} [r,g,b,a] Pixel data.
		 */
		pixelData: function (x, y) {
			if (this._loaded) {
				if (this.image) {
					// Check if the texture is already using a canvas
					if (!this._textureCtx) {
						// Create a new canvas
						this._textureCanvas = document.createElement('canvas');
						
						this._textureCanvas.width = this.image.width;
						this._textureCanvas.height = this.image.height;
						this._textureCtx = this._textureCanvas.getContext('2d');
						
						// Set smoothing mode
						if (!this._smoothing) {
							this._textureCtx.imageSmoothingEnabled = false;
							this._textureCtx.webkitImageSmoothingEnabled = false;
							this._textureCtx.mozImageSmoothingEnabled = false;
						} else {
							this._textureCtx.imageSmoothingEnabled = true;
							this._textureCtx.webkitImageSmoothingEnabled = true;
							this._textureCtx.mozImageSmoothingEnabled = true;
						}
						
						// Draw the image to the canvas
						this._textureCtx.drawImage(this.image, 0, 0);
					} else {
						this._textureCtx = this._textureCtx;
					}
					
					return this._textureCtx.getImageData(x, y, 1, 1).data;
				}
			} else {
				this.log('Cannot read pixel data, the texture you are trying to read data from has not yet loaded!', 'error');
			}
			
			return this;
		},
		
		/**
		 * Creates a clone of the texture.
		 * @return {IgeTexture} A new, distinct texture with the same attributes
		 * as the one being cloned.
		 */
		clone: function () {
			return this.textureFromCell(1);
		},
		
		/**
		 * Returns a string containing a code fragment that when
		 * evaluated will reproduce this object.
		 * @return {String}
		 */
		stringify: function () {
			var str = "new " + this.classId() + "('" + this._url + "')";
			
			// Every object has an ID, assign that first
			// We've commented this because ids for textures are actually generated
			// from their asset so will ALWAYS produce the same ID as long as the asset
			// is the same path.
			//str += ".id('" + this.id() + "')";
			
			// Now get all other properties
			str += this._stringify();
			
			return str;
		},
		
		_stringify: function () {
			return '';
		},
		
		/**
		 * Destroys the item.
		 */
		destroy: function () {
			delete this._eventListeners;
			
			// Remove us from the image store reference array
			if (this.image && this.image._igeTextures) {
				this.image._igeTextures.pull(this);
			}
			
			// Remove the texture from the texture store
			ige._textureStore.pull(this);
			
			delete this.image;
			delete this.script;
			delete this._textureCanvas;
			delete this._textureCtx;
			
			this._destroyed = true;
		}
	});
	
	return IgeTexture;
});
},{"irrelon-appcore":67}],56:[function(_dereq_,module,exports){
"use strict";

var appCore = _dereq_('irrelon-appcore');

appCore.module('IgeTextureAtlas', function (IgeTextureMap) {
	/**
	 * Texture maps provide a way to display textures across a tile map.
	 */
	var IgeTextureAtlas = IgeTextureMap.extend({
		classId: 'IgeTextureAtlas',
		
		init: function (tileWidth, tileHeight) {
			IgeTextureMap.prototype.init.call(this, tileWidth, tileHeight);
		},
		
		/**
		 * Get / set the data source that the atlas system will use
		 * to retrieve new map data when required.
		 * @param {String, Object} ds The url of the data source API
		 * endpoint or the actual map data object.
		 * @return {*}
		 */
		dataSource: function (ds) {
			if (ds !== undefined) {
				this._dataSource = ds;
				
				// Check the type of data source and set a flag so we don't
				// have to check it every time we read data
				switch (typeof(this._dataSource)) {
					case 'string':
						// The data source is a string so it must be a URL
						this._dataSourceType = 'url';
						break;
					
					case 'object':
						// The data source is an object so it must be map data
						this._dataSourceType = 'data';
						break;
				}
				
				return this;
			}
			
			return this._dataSource;
		},
		
		/**
		 * Gets / sets the extra data to load around the main texture map size to
		 * try to mitigate loading times on new data.
		 * @param {Number} x The number of pixels along the x axis to load.
		 * @param {Number} y The number of pixels along the y axis to load.
		 * @return {*}
		 */
		bufferZone: function (x, y) {
			if (x !== undefined && y !== undefined) {
				this._bufferZone = {x: x, y: y};
				return this;
			}
			
			return {x: this._bufferZone.x, y: this._bufferZone.y};
		}
	});
	
	return IgeTextureAtlas;
});
},{"irrelon-appcore":67}],57:[function(_dereq_,module,exports){
"use strict";

var appCore = _dereq_('irrelon-appcore');

appCore.module('IgeTextureMap', function (IgeTileMap2d, IgeMap2d, IgePoint3d) {
// TODO: Implement the _stringify() method for this class
	/**
	 * Texture maps provide a way to display textures / cells across a tile map.
	 */
	var IgeTextureMap = IgeTileMap2d.extend({
		classId: 'IgeTextureMap',
		
		init: function (tileWidth, tileHeight) {
			IgeTileMap2d.prototype.init.call(this, tileWidth, tileHeight);
			this.map = new IgeMap2d();
			this._textureList = [];
			this._renderCenter = new IgePoint3d(0, 0, 0);
			this._cacheDirty = true;
		},
		
		/**
		 * Gets / sets the auto sectioning mode. If enabled the texture map
		 * will render to off-screen canvases in sections denoted by the
		 * number passed. For instance if you pass 10, the canvas sections
		 * will be 10x10 tiles in size.
		 * @param {Number=} val The size in tiles of each section.
		 * @return {*}
		 */
		autoSection: function (val) {
			if (val !== undefined) {
				this._autoSection = val;
				return this;
			}
			
			return this._autoSection;
		},
		
		/**
		 * Gets / sets the draw sections flag. If true the texture map will
		 * output debug lines between each section of the map when using the
		 * auto section system.
		 * @param {Number=} val The boolean flag value.
		 * @return {*}
		 */
		drawSectionBounds: function (val) {
			if (val !== undefined) {
				this._drawSectionBounds = val;
				return this;
			}
			
			return this._drawSectionBounds;
		},
		
		/**
		 * Forces a cache redraw on the next tick.
		 */
		cacheForceFrame: function () {
			this._cacheDirty = true;
		},
		
		/**
		 * Takes another map and removes any data from this map where data already
		 * exists in the other.
		 * @param {IgeTileMap2d} entity The other map to read map data from.
		 * @return {*}
		 */
		negate: function (entity) {
			if (entity !== undefined) {
				var x, y,
					entityMapData = entity.map._mapData,
					thisMapData = this.map._mapData;
				
				for (y in entityMapData) {
					if (entityMapData.hasOwnProperty(y)) {
						for (x in entityMapData[y]) {
							if (entityMapData[y].hasOwnProperty(x)) {
								if (thisMapData[y] && thisMapData[y][x]) {
									// This map has data in the same place as the passed
									// entity's map so remove this map's data
									delete thisMapData[y][x];
								}
							}
						}
					}
				}
			}
			
			return this;
		},
		
		/**
		 * Adds a texture to the texture map's internal texture list so
		 * that it can be referenced via an index so that the texture map's
		 * data will be something like [[textureId, textureCell]]
		 * or a real world example: [[0, 1], [1, 1]].
		 * @param {IgeTexture} texture
		 * @return {Integer} The index of the texture you just added.
		 */
		addTexture: function (texture) {
			this._textureList.push(texture);
			if (!texture._loaded) {
				this._allTexturesLoaded = false;
			}
			return this._textureList.length - 1;
		},
		
		/**
		 * Checks the status of all the textures that have been added to
		 * this texture map and returns true if they are all loaded.
		 * @return {Boolean} True if all textures are loaded, false if
		 * not.
		 */
		allTexturesLoaded: function () {
			if (!this._allTexturesLoaded) {
				var arr = this._textureList,
					arrCount = arr.length;
				
				while (arrCount--) {
					if (!arr[arrCount]._loaded) {
						return false;
					}
				}
			}
			
			this._allTexturesLoaded = true;
			return true;
		},
		
		/**
		 * Sets the specified tile's texture index and cell that will be used
		 * when rendering the texture map.
		 * @param {Number} x The tile x co-ordinate.
		 * @param {Number} y The tile y co-ordinate.
		 * @param {Number} textureIndex The texture index.
		 * @param {Number} cell The cell index.
		 */
		paintTile: function (x, y, textureIndex, cell) {
			if (x !== undefined && y !== undefined && textureIndex !== undefined) {
				if (cell === undefined || cell < 1) {
					cell = 1; // Set the cell default to 1
				}
				this.map.tileData(x, y, [textureIndex, cell]);
			}
		},
		
		/**
		 * Clears any previous tile texture and cell data for the specified
		 * tile co-ordinates.
		 * @param {Number} x The tile x co-ordinate.
		 * @param {Number} y The tile y co-ordinate.
		 */
		clearTile: function (x, y) {
			this.map.clearData(x, y);
		},
		
		/**
		 * Reads the map data from a standard map object and fills the map
		 * with the data found.
		 * @param {Object} map The map data object.
		 */
		loadMap: function (map) {
			if (map.textures) {
				// Empty the existing array
				this._textureList = [];
				
				var tex = [], i,
					self = this;
				
				// Loop the texture list and create each texture object
				for (i = 0; i < map.textures.length; i++) {
					// Load each texture
					eval('tex[' + i + '] = ' + map.textures[i]);
					self.addTexture(tex[i]);
				}
				
				// Fill in the map data
				self.map.mapData(map.data);
			} else {
				// Just fill in the map data
				this.map.mapData(map.data);
			}
			
			return this;
		},
		
		/**
		 * Returns a map JSON string that can be saved to a data file and loaded
		 * with the loadMap() method.
		 * @return {Object} The map data object.
		 */
		saveMap: function () {
			// in URL format
			var textures = [], i,
				x, y,
				dataX = 0, dataY = 0,
				mapData = this.map._mapData;
			
			// Grab all the texture definitions
			for (i = 0; i < this._textureList.length; i++) {
				textures.push(this._textureList[i].stringify());
			}
			
			// Get the lowest x, y
			for (y in mapData) {
				if (mapData.hasOwnProperty(y)) {
					for (x in mapData[y]) {
						if (mapData[y].hasOwnProperty(x)) {
							if (x < dataX) {
								dataX = x;
							}
							
							if (y < dataY) {
								dataY = y;
							}
						}
					}
				}
			}
			
			return JSON.stringify({
				textures: textures,
				data: this.map.mapData(),
				dataXY: [dataX, dataY]
			});
		},
		
		/**
		 * Clears the tile data from the map effectively wiping it clean. All
		 * existing map data will be removed. The textures assigned to the texture
		 * map will not be affected.
		 * @returns {*}
		 */
		clearMap: function () {
			this.map.mapData([]);
			return this;
		},
		
		/**
		 * Clears tile data from the map and also removes any textures from the
		 * map that were previously assigned to it. This is useful for reverting
		 * the texture map to it's virgin state as if it had just been created.
		 * @returns {*}
		 */
		reset: function () {
			this.clearMap();
			this._textureList = [];
			
			return this;
		},
		
		/**
		 * Gets / sets the specified tile's texture index.
		 * @param {Number} x The tile x co-ordinate.
		 * @param {Number} y The tile y co-ordinate.
		 * @param {Number=} textureIndex The new texture index.
		 */
		tileTextureIndex: function (x, y, textureIndex) {
			if (x !== undefined && y !== undefined) {
				var obj = this.map.tileData(x, y);
				if (textureIndex !== undefined) {
					// Set the cell
					obj[0] = textureIndex;
				} else {
					return obj[0];
				}
			}
		},
		
		/**
		 * Gets / sets the specified tile's texture cell.
		 * @param {Number} x The tile x co-ordinate.
		 * @param {Number} y The tile y co-ordinate.
		 * @param {Number} cell The new cell index.
		 */
		tileTextureCell: function (x, y, cell) {
			if (x !== undefined && y !== undefined) {
				var obj = this.map.tileData(x, y);
				if (cell !== undefined) {
					// Set the cell
					obj[1] = cell;
				} else {
					return obj[1];
				}
			}
		},
		
		/**
		 * Converts data that is saved in the format [x][y] to the IGE standard
		 * of [y][x] and then returns the data.
		 * @param {Array} mapData The map data array.
		 * @return {Object} The new map data.
		 */
		convertHorizontalData: function (mapData) {
			var newData = [],
				x, y;
			
			for (x in mapData) {
				if (mapData.hasOwnProperty(x)) {
					for (y in mapData[x]) {
						if (mapData[x].hasOwnProperty(y)) {
							// Displace the data from the x axis to the y axis
							newData[y] = newData[y] || [];
							newData[y][x] = mapData[x][y];
						}
					}
				}
			}
			
			return newData;
		},
		
		/**
		 * Handles rendering the texture map during engine tick events.
		 * @param {CanvasRenderingContext2d} ctx
		 */
		tick: function (ctx) {
			// TODO: This is being called at the wrong time, drawing children before this parent! FIX THIS
			// Run the IgeTileMap2d tick method
			IgeTileMap2d.prototype.tick.call(this, ctx);
			
			// Draw each image that has been defined on the map
			var mapData = this.map._mapData,
				x, y,
				tx, ty,
				xInt, yInt,
				finalX, finalY,
				finalPoint,
				tileData, tileEntity = this._newTileEntity(), // TODO: This is wasteful, cache it?
				sectionX, sectionY,
				tempSectionX, tempSectionY,
				_ctx,
				regions, region, i;
			
			if (this._autoSection > 0) {
				if (this._cacheDirty) {
					// Check that all the textures we need to use are loaded
					if (this.allTexturesLoaded()) {
						// We have a dirty cache so render the section cache
						// data first
						// TODO: Shouldn't we be replacing these arrays with new ones to drop the old ones from memory?
						// TODO: Gonna do that now and see what the result is.
						this._sections = []; //this._sections || [];
						this._sectionCtx = []; //this._sectionCtx || [];
						// TODO: This isn't ideal because we are almost certainly dropping sections that are still relevant,
						// TODO: so we should scan and garbage collect I think, instead.
						
						// Loop the map data
						for (y in mapData) {
							if (mapData.hasOwnProperty(y)) {
								for (x in mapData[y]) {
									if (mapData[y].hasOwnProperty(x)) {
										xInt = parseInt(x);
										yInt = parseInt(y);
										
										// Calculate the tile's final resting position in absolute
										// co-ordinates so we can work out which section canvas to
										// paint the tile to
										if (this._mountMode === 0) {
											// We're rendering a 2d map
											finalX = xInt;
											finalY = yInt;
										}
										
										if (this._mountMode === 1) {
											// We're rendering an iso map
											// Convert the tile x, y to isometric
											tx = xInt * this._tileWidth;
											ty = yInt * this._tileHeight;
											finalX = (tx - ty) / this._tileWidth;
											finalY = ((tx + ty) * 0.5) / this._tileHeight;
										}
										
										// Grab the tile data to paint
										tileData = mapData[y][x];
										
										// Work out which section to paint to
										sectionX = Math.floor(finalX / this._autoSection);
										sectionY = Math.floor(finalY / this._autoSection);
										
										// Check if an off-screen canvas already exists for this section
										// and if not, create one
										this._ensureSectionExists(sectionX, sectionY);
										
										// Grab the drawing context for the section
										_ctx = this._sectionCtx[sectionX][sectionY];
										
										if (tileData) {
											regions = this._renderTile(
												_ctx,
												xInt,
												yInt,
												tileData,
												tileEntity,
												null,
												sectionX,
												sectionY
											);
											
											// Check if the tile overlapped another section
											if (regions) {
												// Loop the regions and re-render the tile on the
												// other sections that it overlaps
												for (i = 0; i < regions.length; i++) {
													region = regions[i];
													
													tempSectionX = sectionX;
													tempSectionY = sectionY;
													
													if (region.x) {
														tempSectionX += region.x;
													}
													
													if (region.y) {
														tempSectionY += region.y;
													}
													
													this._ensureSectionExists(tempSectionX, tempSectionY);
													_ctx = this._sectionCtx[tempSectionX][tempSectionY];
													
													this._sectionTileRegion = this._sectionTileRegion || [];
													this._sectionTileRegion[tempSectionX] = this._sectionTileRegion[tempSectionX] || [];
													this._sectionTileRegion[tempSectionX][tempSectionY] = this._sectionTileRegion[tempSectionX][tempSectionY] || [];
													this._sectionTileRegion[tempSectionX][tempSectionY][xInt] = this._sectionTileRegion[tempSectionX][tempSectionY][xInt] || [];
													
													if (!this._sectionTileRegion[tempSectionX][tempSectionY][xInt][yInt]) {
														this._sectionTileRegion[tempSectionX][tempSectionY][xInt][yInt] = true;
														
														this._renderTile(
															_ctx,
															xInt,
															yInt,
															tileData,
															tileEntity,
															null,
															tempSectionX,
															tempSectionY
														);
													}
												}
											}
										}
									}
								}
							}
						}
						
						// Set the cache to clean!
						this._cacheDirty = false;
						
						// Remove the temporary section tile painted data
						delete this._sectionTileRegion;
					}
				}
				
				this._drawSectionsToCtx(ctx);
			} else {
				// Check that all the textures we need to use are loaded
				if (this.allTexturesLoaded()) {
					// Render the whole map
					for (y in mapData) {
						if (mapData.hasOwnProperty(y)) {
							for (x in mapData[y]) {
								if (mapData[y].hasOwnProperty(x)) {
									// Grab the tile data to paint
									tileData = mapData[y][x];
									
									if (tileData) {
										this._renderTile(ctx, x, y, tileData, tileEntity);
									}
								}
							}
						}
					}
				}
			}
		},
		
		/**
		 * Private method, checks if the specified section currently exists in the cache
		 * and if not, creates it.
		 * @param {Number} sectionX The section's x co-ordinate.
		 * @param {Number} sectionY The section's y co-ordinate.
		 * @private
		 */
		_ensureSectionExists: function (sectionX, sectionY) {
			var sectionCtx;
			
			this._sections[sectionX] = this._sections[sectionX] || [];
			this._sectionCtx[sectionX] = this._sectionCtx[sectionX] || [];
			
			if (!this._sections[sectionX][sectionY]) {
				this._sections[sectionX][sectionY] = document.createElement('canvas');
				this._sections[sectionX][sectionY].width = (this._tileWidth * this._autoSection);
				this._sections[sectionX][sectionY].height = (this._tileHeight * this._autoSection);
				
				sectionCtx = this._sectionCtx[sectionX][sectionY] = this._sections[sectionX][sectionY].getContext('2d');
				
				// Ensure the canvas is using the correct image antialiasing mode
				if (!ige._globalSmoothing) {
					sectionCtx.imageSmoothingEnabled = false;
					sectionCtx.webkitImageSmoothingEnabled = false;
					sectionCtx.mozImageSmoothingEnabled = false;
				} else {
					sectionCtx.imageSmoothingEnabled = true;
					sectionCtx.webkitImageSmoothingEnabled = true;
					sectionCtx.mozImageSmoothingEnabled = true;
				}
				
				// One-time translate the context
				sectionCtx.translate(this._tileWidth / 2, this._tileHeight / 2);
			}
		},
		
		/**
		 * Private method, draws cached image sections to the canvas context.
		 * @param {CanvasRenderingContext2d} ctx
		 * @private
		 */
		_drawSectionsToCtx: function (ctx) {
			var x, y, tileData,
				sectionRenderX, sectionRenderY,
				sectionAbsX, sectionAbsY,
				sectionWidth, sectionHeight,
				viewArea = ige._currentViewport.viewArea();
			
			// Render the map sections
			//ctx.translate(-(this._tileWidth / 2), -(this._tileHeight / 2));
			
			sectionWidth = (this._tileWidth * this._autoSection);
			sectionHeight = (this._tileHeight * this._autoSection);
			
			for (x in this._sections) {
				if (this._sections.hasOwnProperty(x)) {
					for (y in this._sections[x]) {
						if (this._sections[x].hasOwnProperty(y)) {
							sectionRenderX = x * (this._tileWidth * this._autoSection);
							sectionRenderY = y * (this._tileHeight * this._autoSection);
							sectionAbsX = this._translate.x + sectionRenderX - ige._currentCamera._translate.x;
							sectionAbsY = this._translate.y + sectionRenderY - ige._currentCamera._translate.y;
							
							// Check if we are drawing isometrically and adjust
							if (this._mountMode === 1) {
								sectionAbsX -= (this._tileWidth / 2);
								sectionAbsY -= (this._tileHeight / 2);
							}
							
							// Check if the section is "on screen"
							if ((sectionAbsX + sectionWidth + (this._tileHeight / 2) >= -(viewArea.width / 2) && sectionAbsX - (this._tileWidth / 2) <= (viewArea.width / 2)) && (sectionAbsY + sectionHeight + (this._tileHeight / 2) >= -(viewArea.height / 2) && sectionAbsY <= (viewArea.height / 2))) {
								// Grab the canvas to paint
								tileData = this._sections[x][y];
								
								ctx.drawImage(
									tileData,
									0, 0,
									sectionWidth,
									sectionHeight,
									sectionRenderX,
									sectionRenderY,
									sectionWidth,
									sectionHeight
								);
								
								ige._drawCount++;
								
								if (this._drawSectionBounds) {
									// Draw a bounding rectangle around the section
									ctx.strokeStyle = '#ff00f6';
									ctx.strokeRect(
										x * (this._tileWidth * this._autoSection),
										y * (this._tileHeight * this._autoSection),
										(this._tileWidth * this._autoSection),
										(this._tileHeight * this._autoSection)
									);
								}
							}
						}
					}
				}
			}
		},
		
		/**
		 * Private method, renders a tile texture based on data from the texture map,
		 * to a cached section.
		 * @param {CanvasRenderingContext2d} ctx
		 * @param {Number} x The tile x co-ordinate.
		 * @param {Number} y The tile y co-ordinate.
		 * @param {Object} tileData The tile's texture and cell data.
		 * @param {Object} tileEntity The object that represents the tile.
		 * @param {IgeRect=} rect The rectangular area to limit drawing to.
		 * @param {Number} sectionX The x co-ordinate of the section to draw to.
		 * @param {Number} sectionY The y co-ordinate of the section to draw to.
		 * @return {*}
		 * @private
		 */
		_renderTile: function (ctx, x, y, tileData, tileEntity, rect, sectionX, sectionY) {
			// TODO: Handle scaling so tiles don't loose res on scaled cached sections
			var finalX, finalY, regions,
				xm1, xp1, ym1, yp1, regObj,
				xAdjust = this._mountMode === 1 ? this._tileWidth / 2 : 0,
				yAdjust = this._mountMode === 1 ? this._tileHeight / 2 : 0,
				tx, ty, sx, sy,
				texture;
			
			// Translate the canvas to the tile position
			if (this._mountMode === 0) {
				finalX = x * this._tileWidth;
				finalY = y * this._tileHeight;
			}
			
			if (this._mountMode === 1) {
				// Convert the tile x, y to isometric
				tx = x * this._tileWidth;
				ty = y * this._tileHeight;
				sx = tx - ty;
				sy = (tx + ty) * 0.5;
				
				finalX = sx - this._tileWidth / 2;
				finalY = sy;
			}
			
			if (sectionX !== undefined) {
				finalX -= sectionX * this._autoSection * this._tileWidth;
			}
			if (sectionY !== undefined) {
				finalY -= sectionY * this._autoSection * this._tileHeight;
			}
			
			// If we have a rectangle region we are limiting to...
			if (rect) {
				// Check the bounds first
				if (!rect.xyInside(finalX, finalY)) {
					// The point is not inside the bounds, return
					return;
				}
			}
			
			if (finalX - (xAdjust) < 0) {
				regions = regions || [];
				regions.push({x: -1});
				xm1 = true;
				
				regObj = regObj || {};
				regObj.x = -1;
			}
			
			if (finalX + (xAdjust) > (ctx.canvas.width - (this._tileWidth))) {
				regions = regions || [];
				regions.push({x: 1});
				xp1 = true;
				
				regObj = regObj || {};
				regObj.x = 1;
			}
			
			if (finalY - (0) < 0) {
				regions = regions || [];
				regions.push({y: -1});
				ym1 = true;
				
				regObj = regObj || {};
				regObj.y = -1;
			}
			
			if (finalY + (0) > (ctx.canvas.height - (this._tileHeight))) {
				regions = regions || [];
				regions.push({y: 1});
				yp1 = true;
				
				regObj = regObj || {};
				regObj.y = 1;
			}
			
			if (xm1 || ym1 || xp1 || yp1) {
				regions.push(regObj);
			}
			
			ctx.save();
			ctx.translate(finalX, finalY);
			
			// Set the correct texture data
			texture = this._textureList[tileData[0]];
			tileEntity._cell = tileData[1];
			
			// Paint the texture
			if (texture) {
				texture.render(ctx, tileEntity, ige._tickDelta);
			}
			ctx.restore();
			
			return regions;
		},
		
		/**
		 * Private method, creates an entity object that a texture can use to render
		 * itself. This is basically a dummy object that has the minimum amount of data
		 * in it that a texture requires to render such as geometry, texture
		 * cell and rendering position.
		 * @return {Object} The new tile entity object.
		 * @private
		 */
		_newTileEntity: function () {
			if (this._mountMode === 0) {
				return {
					_cell: 1,
					_bounds2d: {
						x: this._tileWidth,
						y: this._tileHeight
					},
					_renderPos: {
						x: -this._tileWidth / 2,
						y: -this._tileHeight / 2
					}
				};
			}
			
			if (this._mountMode === 1) {
				return {
					_cell: 1,
					_bounds2d: {
						x: this._tileWidth * 2,
						y: this._tileHeight
					},
					_renderPos: {
						x: -this._tileWidth,
						y: -this._tileHeight / 2
					}
				};
			}
		}
	});
	
	return IgeTextureMap;
});
},{"irrelon-appcore":67}],58:[function(_dereq_,module,exports){
"use strict";

var appCore = _dereq_('irrelon-appcore');

appCore.module('IgeTileMap2d', function (IgeEntity, IgeTexture, IgeTileMap2dSmartTexture, IgeMap2d, IgeMatrix2d, IgePoint2d, IgePoint3d, IgePoly2d, IgeRect) {
	/**
	 * Tile maps provide a way to align mounted child objects to a tile-based grid.
	 * NOTE: These are not to be confused with IgeTextureMap's which allow you to
	 * paint a bunch of tiles to a grid.
	 */
	var IgeTileMap2d = IgeEntity.extend({
		classId: 'IgeTileMap2d',
		IgeTileMap2d: true,
		
		init: function (tileWidth, tileHeight) {
			IgeEntity.prototype.init.call(this);
			
			tileWidth = tileWidth !== undefined ? tileWidth : 40;
			tileHeight = tileHeight !== undefined ? tileHeight : 40;
			
			var self = this;
			
			if (!ige.isServer) {
				var tex = new IgeTexture(IgeTileMap2dSmartTexture);
				self.texture(tex);
			}
			
			self.map = new IgeMap2d();
			self._adjustmentMatrix = new IgeMatrix2d();
			
			self.tileWidth(tileWidth);
			self.tileHeight(tileHeight);
			self.gridSize(3, 3);
			
			self._drawGrid = 0;
			self._gridColor = '#ffffff';
		},
		
		/**
		 * Gets / sets the flag that determines if the tile map will paint the
		 * occupied tiles with an overlay colour so that it is easy to spot them.
		 * @param val
		 * @return {*}
		 */
		highlightOccupied: function (val) {
			if (val !== undefined) {
				this._highlightOccupied = val;
				return this;
			}
			
			return this._highlightOccupied;
		},
		
		highlightTileRect: function (val) {
			if (val !== undefined) {
				this._highlightTileRect = val;
				return this;
			}
			
			return this._highlightTileRect;
		},
		
		/**
		 * Gets / sets the map's tile width.
		 * @param {Number} val Tile width.
		 * @return {*}
		 */
		tileWidth: function (val) {
			if (val !== undefined) {
				this._tileWidth = val;
				if (this._gridSize && this._gridSize.x) {
					this.width(this._tileWidth * this._gridSize.x);
					this._updateAdjustmentMatrix();
				}
				
				return this;
			}
			
			return this._tileWidth;
		},
		
		/**
		 * Gets / sets the map's tile height.
		 * @param {Number} val Tile height.
		 * @return {*}
		 */
		tileHeight: function (val) {
			if (val !== undefined) {
				this._tileHeight = val;
				if (this._gridSize && this._gridSize.y) {
					this.height(this._tileHeight * this._gridSize.y);
					this._updateAdjustmentMatrix();
				}
				
				return this;
			}
			
			return this._tileHeight;
		},
		
		gridSize: function (x, y) {
			if (x !== undefined && y !== undefined) {
				this._gridSize = new IgePoint2d(x, y);
				
				// If in 2d mount mode
				if (this._mountMode === 0) {
					if (this._tileWidth) {
						this.width(this._tileWidth * this._gridSize.x);
					}
				}
				
				// If in isometric mount mode
				if (this._mountMode === 1) {
					if (this._tileWidth) {
						this.width((this._tileWidth * 2) * this._gridSize.x);
					}
				}
				
				if (this._tileHeight) {
					this.height(this._tileHeight * this._gridSize.y);
				}
				
				this._updateAdjustmentMatrix();
				
				return this;
			}
			
			return this._gridSize;
		},
		
		/**
		 * Gets / sets if the tile map should paint a grid to the context during
		 * the tick method.
		 * @param {Boolean=} val If true, will paint the grid on tick.
		 * @return {*}
		 */
		drawGrid: function (val)  {
			if (val !== undefined) {
				this._drawGrid = val;
				return this;
			}
			
			return this._drawGrid;
		},
		
		/**
		 * Gets / sets the color of the grid overlay. It accepts a string color
		 * definition with the same specifications as the canvas context strokeStyle
		 * property.
		 * @param {String=} val The color of the grid.
		 * @return {*}
		 */
		gridColor: function (val)  {
			if (val !== undefined) {
				this._gridColor = val;
				return this;
			}
			
			return this._gridColor;
		},
		
		/**
		 * Sets a tile or area as occupied by the passed obj parameter.
		 * Any previous occupy data on the specified tile or area will be
		 * overwritten.
		 * @param {Number} x X co-ordinate of the tile to un-occupy.
		 * @param {Number} y Y co-ordinate of the tile to un-occupy.
		 * @param {Number} width Number of tiles along the x-axis to occupy.
		 * @param {Number} height Number of tiles along the y-axis to occupy.
		 * @param {*} obj
		 * @return {*}
		 */
		occupyTile: function (x, y, width, height, obj) {
			var xi, yi;
			
			if (width === undefined) { width = 1; }
			if (height === undefined) { height = 1; }
			
			// Floor the values
			x = Math.floor(x);
			y = Math.floor(y);
			width = Math.floor(width);
			height = Math.floor(height);
			
			if (x !== undefined && y !== undefined) {
				for (xi = 0; xi < width; xi++) {
					for (yi = 0; yi < height; yi++) {
						this.map.tileData(x + xi, y + yi, obj);
					}
				}
				
				// Create an IgeRect to represent the tiles this
				// entity has just occupied
				if (obj._classId) {
					obj._occupiedRect = new IgeRect(x, y, width, height);
				}
			}
			return this;
		},
		
		/**
		 * Removes all data from the specified tile or area.
		 * @param {Number} x
		 * @param {Number} y
		 * @param {Number=} width
		 * @param {Number=} height
		 * @return {*}
		 */
		unOccupyTile: function (x, y, width, height) {
			var xi, yi, item;
			
			if (width === undefined) { width = 1; }
			if (height === undefined) { height = 1; }
			
			// Floor the values
			x = Math.floor(x);
			y = Math.floor(y);
			width = Math.floor(width);
			height = Math.floor(height);
			
			if (x !== undefined && y !== undefined) {
				for (xi = 0; xi < width; xi++) {
					for (yi = 0; yi < height; yi++) {
						item = this.map.tileData(x + xi, y + yi);
						if (item && item._occupiedRect) {
							delete item._occupiedRect;
						}
						this.map.clearData(x + xi, y + yi);
					}
				}
				
				
			}
			return this;
		},
		
		/**
		 * Returns true if the specified tile or tile area has
		 * an occupied status.
		 * @param {Number} x
		 * @param {Number} y
		 * @param {Number=} width
		 * @param {Number=} height
		 * @return {*}
		 */
		isTileOccupied: function (x, y, width, height) {
			if (width === undefined) { width = 1; }
			if (height === undefined) { height = 1; }
			
			return this.map.collision(x, y, width, height);
		},
		
		tileOccupiedBy: function (x, y) {
			return this.map.tileData(x, y);
		},
		
		/**
		 * Returns the tile co-ordinates of the tile that the point's world
		 * co-ordinates reside inside.
		 * @param {IgePoint3d} point
		 * @return {IgePoint3d} The tile co-ordinates as a point object.
		 */
		pointToTile: function (point) {
			// TODO: Could this do with some caching to check if the input values have changed and if not,
			// TODO: supply the same pre-calculated data if it already exists?
			var mx = point.x,
				my = point.y,
				dx, dy, tilePos;
			
			if (this._mountMode === 0) {
				// 2d
				dx = mx; //+ this._tileWidth / 2;
				dy = my; //+ this._tileHeight / 2;
				
				tilePos = new IgePoint3d(
					Math.floor(dx / this._tileWidth),
					Math.floor(dy / this._tileWidth),
					0
				);
			}
			
			if (this._mountMode === 1) {
				// iso
				dx = mx;
				dy = my;
				
				tilePos = new IgePoint3d(
					Math.floor(dx / this._tileWidth),
					Math.floor(dy / this._tileHeight),
					0
				);
			}
			
			return tilePos;
		},
		
		/**
		 * Returns the world co-ordinates of the tile the mouse is currently over.
		 * @return {IgePoint3d}
		 */
		mouseTilePoint: function () {
			var tilePos = this.mouseToTile()
				.thisMultiply(this._tileWidth, this._tileHeight, 1);
			
			tilePos.x += this._tileWidth / 2;
			tilePos.y += this._tileHeight / 2;
			
			return tilePos;
		},
		
		tileToPoint: function (x, y) {
			var point;
			
			if (this._mountMode === 0) {
				point = new IgePoint3d(x, y, 0)
					.thisMultiply(this._tileWidth, this._tileHeight, 1);
				
				point.x -= this._bounds2d.x2 - (this._tileWidth / 2);
				point.y -= this._bounds2d.y2 - (this._tileHeight / 2);
			}
			
			if (this._mountMode === 1) {
				point = new IgePoint3d(x * this._tileWidth + this._tileWidth / 2, y * this._tileHeight + this._tileHeight / 2, 0);
				point.x -= this._bounds2d.x2 / 2;
				point.y -= this._bounds2d.y2;
			}
			
			point.x2 = point.x / 2;
			point.y2 = point.y / 2;
			
			return point;
		},
		
		/**
		 * Returns the tile co-ordinates of the tile the mouse is currently over.
		 * @return {IgePoint3d}
		 */
		mouseToTile: function () {
			var tilePos;
			
			if (this._mountMode === 0) {
				tilePos = this.pointToTile(this.mousePos());
			} else {
				tilePos = this.pointToTile(this.mousePos().to2d());
			}
			
			return tilePos;
		},
		
		/**
		 * Scans the map data and returns an array of rectangle
		 * objects that encapsulate the map data into discrete
		 * rectangle areas.
		 * @param {Function=} callback Returns true or false for
		 * the passed map data determining if it should be included
		 * in a rectangle or not.
		 * @return {Array}
		 */
		scanRects: function (callback) {
			var x, y,
				rectArray = [],
				mapData = this.map._mapData.clone();
			
			// Loop the map data and scan for blocks that can
			// be converted into static box2d rectangle areas
			for (y in mapData) {
				if (mapData.hasOwnProperty(y)) {
					for (x in mapData[y]) {
						if (mapData[y].hasOwnProperty(x)) {
							if (mapData[y][x] && (!callback || (callback && callback(mapData[y][x], x, y)))) {
								rectArray.push(this._scanRects(mapData, parseInt(x, 10), parseInt(y, 10), callback));
							}
						}
					}
				}
			}
			
			return rectArray;
		},
		
		_scanRects: function (mapData, x, y, callback) {
			var rect = {
					x: x,
					y: y,
					width: 1,
					height: 1
				},
				nx = x + 1,
				ny = y + 1;
			
			// Clear the current x, y cell mapData
			mapData[y][x] = 0;
			
			while (mapData[y][nx] && (!callback || (callback && callback(mapData[y][nx], nx, y)))) {
				rect.width++;
				
				// Clear the mapData for this cell
				mapData[y][nx] = 0;
				
				// Next column
				nx++;
			}
			
			while (mapData[ny] && mapData[ny][x] && (!callback || (callback && callback(mapData[ny][x], x, ny)))) {
				// Check for mapData either side of the column width
				if ((mapData[ny][x - 1] && (!callback || (callback && callback(mapData[ny][x - 1], x - 1, ny)))) || (mapData[ny][x + rect.width] && (!callback || (callback && callback(mapData[ny][x + rect.width], x + rect.width, ny))))) {
					return rect;
				}
				
				// Loop the column's map data and check that there is
				// an intact column the same width as the starting column
				for (nx = x; nx < x + rect.width; nx++) {
					if (!mapData[ny][nx] || (callback && !callback(mapData[ny][nx], nx, ny))) {
						// This row has a different column width from the starting
						// column so return the rectangle as it stands
						return rect;
					}
				}
				
				// Mark the row as cleared
				for (nx = x; nx < x + rect.width; nx++) {
					mapData[ny][nx] = 0;
				}
				
				rect.height++;
				ny++;
			}
			
			return rect;
		},
		
		inGrid: function (x, y, width, height) {
			if (width === undefined) { width = 1; }
			if (height === undefined) { height = 1; }
			
			// Checks if the passed area is inside the tile map grid as defined by gridSize
			return x >= 0 && y >= 0 && x + width <= this._gridSize.x && y + height <= this._gridSize.y;
		},
		
		/**
		 * Gets / sets the mouse tile hover color used in conjunction with the
		 * drawMouse() method.
		 * @param {String=} val The hex or rbg string color definition e.g. #ff0099.
		 * @returns {*}
		 */
		hoverColor: function (val) {
			if (val !== undefined) {
				this._hoverColor = val;
				return this;
			}
			
			return this._hoverColor;
		},
		
		/**
		 * Loads map data from a saved map.
		 * @param {Object} map The map data object.
		 */
		loadMap: function (map) {
			// Just fill in the map data
			this.map.mapData(map.data, 0, 0);
			
			return this;
		},
		
		/**
		 * Returns a map JSON string that can be saved to a data file and loaded
		 * with the loadMap() method.
		 * @return {Object} The map data object.
		 */
		saveMap: function () {
			// in URL format
			var textures = [], i,
				x, y,
				dataX = 0, dataY = 0,
				mapData = this.map._mapData;
			
			// Get the lowest x, y
			for (y in mapData) {
				if (mapData.hasOwnProperty(y)) {
					for (x in mapData[y]) {
						if (mapData[y].hasOwnProperty(x)) {
							if (parseInt(x) < parseInt(dataX)) {
								dataX = parseInt(x);
							}
							
							if (parseInt(y) < parseInt(dataY)) {
								dataY = parseInt(y);
							}
						}
					}
				}
			}
			
			return JSON.stringify({
				data: this.map.sortedMapDataAsArray(),
				dataXY: [parseInt(dataX, 10), parseInt(dataY, 10)]
			});
		},
		
		isometricMounts: function (val) {
			if (val !== undefined) {
				IgeEntity.prototype.isometricMounts.call(this, val);
				
				// Re-call the methods that check iso mounts property
				this.tileWidth(this._tileWidth);
				this.tileHeight(this._tileHeight);
				this.gridSize(this._gridSize.x, this._gridSize.y);
				
				this._updateAdjustmentMatrix();
				return this;
			}
			
			return this._mountMode;
		},
		
		tileMapHitPolygon: function (mousePoint) {
			if (this._mountMode === 0) {
				return this.aabb();
			}
			
			if (this._mountMode === 1) {
				var aabb = this.aabb(),
					poly = new IgePoly2d();
				
				poly.addPoint(aabb.x + aabb.width / 2, aabb.y);
				poly.addPoint(aabb.x + aabb.width, aabb.y + aabb.height / 2);
				poly.addPoint(aabb.x + aabb.width / 2, (aabb.y + aabb.height) - 1);
				poly.addPoint(aabb.x - 1, (aabb.y + aabb.height / 2) - 1);
				
				return poly;
			}
		},
		
		_processTriggerHitTests: function () {
			// This method overrides the one in IgeEntity
			if (this._mouseEventsActive && ige._currentViewport) {
				if (!this._mouseAlwaysInside) {
					var mouseTile = this.mouseToTile();
					if (mouseTile.x >= 0 && mouseTile.y >= 0 && mouseTile.x < this._gridSize.x && mouseTile.y < this._gridSize.y) {
						return true;
					} else {
						return false;
					}
				} else {
					return true;
				}
			}
			
			return false;
		},
		
		_updateAdjustmentMatrix: function () {
			if (this._bounds2d.x2 && this._bounds2d.y2 && this._tileWidth && this._tileHeight) {
				if (this._mountMode === 0) {
					this._adjustmentMatrix.translateTo(this._bounds2d.x2, this._bounds2d.y2);
				}
				
				if (this._mountMode === 1) {
					this._adjustmentMatrix.translateTo(0, this._bounds2d.y2);
				}
			}
		},
		
		_childMounted: function (obj) {
			// We can also re-use the tile size methods since
			// they alter the same properties on the calling
			// entity anyway.
			obj.tileWidth = obj.tileWidth || this.tileWidth;
			obj.tileHeight = obj.tileHeight || this.tileHeight;
			
			// Set default values
			obj._tileWidth = obj._tileWidth || 1;
			obj._tileHeight = obj._tileHeight || 1;
			
			IgeEntity.prototype._childMounted.call(this, obj);
		}
	});
	
	return IgeTileMap2d;
});
},{"irrelon-appcore":67}],59:[function(_dereq_,module,exports){
"use strict";

var appCore = _dereq_('irrelon-appcore');

appCore.module('IgeTimeout', function (IgeInterval) {
	/**
	 * Provides an alternative to setTimeout() which works based on the engine's internal
	 * time system allowing timeouts to fire correctly, taking into account pausing the
	 * game and differences in rendering speed etc.
	 */
	var IgeTimeout = IgeInterval.extend({
		classId: 'IgeTimeout',
		
		/**
		 * Creates a new timeout that will call the passed method after the number of
		 * milliseconds specified by the timeout parameter has been reached.
		 * @param {Function} method The method to call on timeout.
		 * @param {Number} timeout The number of milliseconds before the timeout.
		 * @example #Create a timer that will call a method after 1 second of engine time
		 *     var myTimeout = new IgeTimeout(function () {
	 *     		console.log('interval fired');
	 *     }, 1000);
		 */
		init: function (method, timeout) {
			IgeInterval.prototype.init.call(this, method, timeout);
		},
		
		/**
		 * Cancels the timer, stops the timeout.
		 * @example #Cancel a timeout timer
		 *     var myTimeout = new IgeTimeout(function () {
	 *     		console.log('timeout fired');
	 *     }, 1000);
		 *
		 *     myTimeout.cancel();
		 * @returns {*}
		 */
		cancel: function () {
			return IgeInterval.prototype.cancel.call(this);
		},
		
		/**
		 * Resets the time and lets the timeout begin anew.
		 * @returns {*}
		 */
		reset: function() {
			this._time = 0;
			if (ige.time._timers.indexOf(this) == -1) {
				ige.time.addTimer(this);
			}
		},
		
		/**
		 * Checks for a timeout event to see if we should call the timeout method. This is
		 * called automatically by the IgeTimeComponent class and does not need to be
		 * called manually.
		 * @returns {*}
		 */
		update: function () {
			if (this._time > this._interval) {
				// Fire an interval
				this._method(ige._currentTime);
				ige.time.removeTimer(this);
			}
			
			return this;
		}
	});
	
	return IgeTimeout;
});
},{"irrelon-appcore":67}],60:[function(_dereq_,module,exports){
"use strict";

var appCore = _dereq_('irrelon-appcore');

appCore.module('IgeTween', function (IgeClass) {
	/**
	 * Creates a new tween instance.
	 */
	var IgeTween = IgeClass.extend({
		classId: 'IgeTween',
		
		init: function (targetObj, propertyObj, durationMs, options) {
			// Create a new tween object and return it
			// so the user can decide when to start it
			this._targetObj = targetObj;
			this._steps = [];
			this._currentStep = -1;
			if (propertyObj !== undefined) {
				this.stepTo(propertyObj);
			}
			this._durationMs = durationMs !== undefined ? durationMs : 0;
			this._started = false;
			this._stepDirection = false;
			
			// Sort out the options
			if (options && options.easing) { this.easing(options.easing); } else { this.easing('none'); }
			if (options && options.startTime !== undefined) { this.startTime(options.startTime); }
			if (options && options.beforeTween !== undefined) { this.beforeTween(options.beforeTween); }
			if (options && options.afterTween !== undefined) { this.afterTween(options.afterTween); }
		},
		
		/**
		 * Sets the object in which the properties to tween exist.
		 * @param targetObj
		 * @return {*}
		 */
		targetObj: function (targetObj) {
			if (targetObj !== undefined) {
				this._targetObj = targetObj;
			}
			
			return this;
		},
		
		/**
		 * Sets the tween's target properties to tween to.
		 * @param propertyObj
		 * @return {*}
		 */
		properties: function (propertyObj) {
			if (propertyObj !== undefined) {
				// Reset any existing steps and add this new one
				this._steps = [];
				this._currentStep = -1;
				this.stepTo(propertyObj);
			}
			
			return this;
		},
		
		/**
		 * Gets / sets the repeat mode for the tween. If the mode
		 * is set to 1 the tween will repeat from the first step.
		 * If set to 2 the tween will reverse the order of the steps
		 * each time the repeat occurs. The count determines the
		 * number of times the tween will be repeated before stopping.
		 * Setting the count to -1 will make it repeat infinitely.
		 * @param val
		 * @param count
		 * @return {*}
		 */
		repeatMode: function (val, count) {
			if (val !== undefined) {
				this._repeatMode = val;
				this.repeatCount(count);
				return this;
			}
			
			return this._repeatMode;
		},
		
		/**
		 * Gets / sets the repeat count. The count determines the
		 * number of times the tween will be repeated before stopping.
		 * Setting the count to -1 will make it repeat infinitely.
		 * This setting is used in conjunction with the repeatMode()
		 * method. If you just set a repeat count and no mode then
		 * the tween will not repeat.
		 * @param val
		 * @return {*}
		 */
		repeatCount: function (val) {
			if (val !== undefined) {
				this._repeatCount = val;
				this._repeatedCount = 0;
				return this;
			}
			
			return this._repeatCount;
		},
		
		/**
		 * DEPRECIATED, Renamed to stepTo().
		 */
		step: function (propertyObj, durationMs, easing) {
			this.log('The step method has been renamed to stepTo(). Please update your code as the step() method will soon be removed.', 'warning');
			this.stepTo(propertyObj, durationMs, easing);
			return this;
		},
		
		/**
		 * Defines a step in a multi-stage tween. Uses the properties
		 * as destination value.
		 * @param {Object} propertyObj The properties to
		 * tween during this step.
		 * @param {Number=} durationMs The number of milliseconds
		 * to spend tweening this step, or if not provided uses
		 * the current tween durationMs setting.
		 * @param {String=} easing The name of the easing method
		 * to use during this step.
		 * @param {Boolean=} delta If true will set the step to use
		 * delta values instead of absolute values as the destination.
		 * @return {*}
		 */
		stepTo: function (propertyObj, durationMs, easing, delta) {
			if (propertyObj !== undefined) {
				// Check if we have already been given a standard
				// non-staged property
				this._steps.push({
					props: propertyObj,
					durationMs: durationMs,
					easing: easing,
					isDelta: delta
				});
			}
			
			return this;
		},
		
		/**
		 * Defines a step in a multi-stage tween. Uses the properties
		 * as deltas, not as destination values
		 * @param {Object} propertyObj The properties to
		 * tween during this step.
		 * @param {Number=} durationMs The number of milliseconds
		 * to spend tweening this step, or if not provided uses
		 * the current tween durationMs setting.
		 * @param {String=} easing The name of the easing method
		 * to use during this step.
		 * @return {*}
		 */
		stepBy: function (propertyObj, durationMs, easing) {
			this.stepTo(
				propertyObj,
				durationMs,
				easing,
				true
			);
			
			return this;
		},
		
		/**
		 * Sets the duration of the tween in milliseconds.
		 * @param durationMs
		 * @return {*}
		 */
		duration: function (durationMs) {
			if (durationMs !== undefined) {
				this._durationMs = durationMs;
			}
			
			return this;
		},
		
		/**
		 * Sets the method to be called just before the tween has started.
		 * @param callback
		 * @return {*}
		 */
		beforeTween: function (callback) {
			if (callback !== undefined) {
				this._beforeTween = callback;
			}
			
			return this;
		},
		
		/**
		 * Sets the method to be called just after the tween has ended.
		 * @param callback
		 * @return {*}
		 */
		afterTween: function (callback) {
			if (callback !== undefined) {
				this._afterTween = callback;
			}
			
			return this;
		},
		
		/**
		 * Sets the method to be called just before a tween step has
		 * started.
		 * @param callback
		 * @return {*}
		 */
		beforeStep: function (callback) {
			if (callback !== undefined) {
				this._beforeStep = callback;
			}
			
			return this;
		},
		
		/**
		 * Sets the method to be called just after a tween step has
		 * ended.
		 * @param callback
		 * @return {*}
		 */
		afterStep: function (callback) {
			if (callback !== undefined) {
				this._afterStep = callback;
			}
			
			return this;
		},
		
		/**
		 * Sets the method to be called just after a tween has changed
		 * the values of the target object every update tick.
		 * @param callback
		 * @return {*}
		 */
		afterChange: function (callback) {
			if (callback !== undefined) {
				this._afterChange = callback;
			}
			
			return this;
		},
		
		/**
		 * Returns the object that this tween is modifying.
		 * @return {*}
		 */
		targetObject: function () {
			return this._targetObj;
		},
		
		/**
		 * Sets the name of the easing method to use with the tween.
		 * @param methodName
		 * @return {*}
		 */
		easing: function (methodName) {
			if (methodName !== undefined) {
				if (ige.tween.easing[methodName]) {
					this._easing = methodName;
				} else {
					this.log('The easing method you have selected does not exist, please use a valid easing method. For a list of easing methods please inspect ige.tween.easing from your console.', 'error', ige.tween.easing);
				}
			}
			
			return this;
		},
		
		/**
		 * Sets the timestamp at which the tween should start.
		 * @param timeMs
		 * @return {*}
		 */
		startTime: function (timeMs) {
			if (timeMs !== undefined) {
				this._startTime = timeMs;
			}
			
			return this;
		},
		
		/**
		 * Starts the tweening operation.
		 * @param {Number=} timeMs If set, the tween will start this
		 * many milliseconds in the future.
		 */
		start: function (timeMs) {
			if (timeMs !== undefined) {
				this.startTime(timeMs + ige._currentTime);
			}
			
			ige.tween.start(this);
			
			// Add the tween to the target object's tween array
			this._targetObj._tweenArr = this._targetObj._tweenArr || [];
			this._targetObj._tweenArr.push(this);
			
			return this;
		},
		
		/**
		 * Stops the tweening operation.
		 */
		stop: function () {
			ige.tween.stop(this);
			if (this._targetObj._tweenArr) {
				this._targetObj._tweenArr.pull(this);
			}
			
			return this;
		},
		
		/**
		 * Starts all tweens registered to an object.
		 * @private
		 */
		startAll: function () {
			if (this._targetObj._tweenArr) {
				this._targetObj._tweenArr.eachReverse(function (tweenItem) {
					tweenItem.start();
				});
			}
			
			return this;
		},
		
		/**
		 * Stops all tweens registered to an object.
		 * @private
		 */
		stopAll: function () {
			if (this._targetObj._tweenArr) {
				this._targetObj._tweenArr.eachReverse(function (tweenItem) {
					tweenItem.stop();
				});
			}
			
			return this;
		}
	});
	
	return IgeTween;
});
},{"irrelon-appcore":67}],61:[function(_dereq_,module,exports){
"use strict";

var appCore = _dereq_('irrelon-appcore');

appCore.module('IgeUiElement', function (IgeUiEntity) {
	/**
	 * Creates a new UI element. UI elements use more resources and CPU
	 * than standard IgeEntity instances but provide a rich set of extra
	 * positioning and styling methods as well as reacting to styles
	 * defined using the IgeUiManagerComponent.
	 */
	var IgeUiElement = IgeUiEntity.extend({
		classId: 'IgeUiElement',
		
		/**
		 * Constructor
		 */
		init: function () {
			var self = this;
			
			IgeUiEntity.prototype.init.call(this);
			ige.ui.registerElement(this);
			
			this._focused = false;
			this._allowHover = true;
			this._allowFocus = true;
			this._allowActive = true;
			
			var updateStyleFunc = function () {
				self._updateStyle();
			};
			
			this.on('mouseOver', function () {
				if (this._allowHover) {
					updateStyleFunc();
					ige.input.stopPropagation();
				} else {
					this._mouseStateOver = false;
				}
			});
			this.on('mouseOut', function () {
				if (this._allowHover) {
					updateStyleFunc();
					ige.input.stopPropagation();
				} else {
					this._mouseStateOver = false;
				}
			});
			this.on('mouseDown', function () {
				if (this._allowActive) {
					updateStyleFunc();
					ige.input.stopPropagation();
				} else {
					this._mouseStateDown = false;
				}
			});
			this.on('mouseUp', function () {
				if (this._allowFocus) {
					// Try to focus the entity
					if (!self.focus()) {
						updateStyleFunc();
					} else {
						ige.input.stopPropagation();
					}
				} else if (this._allowActive) {
					updateStyleFunc();
				}
			});
			
			// Enable mouse events on this entity by default
			this.mouseEventsActive(true);
		},
		
		allowHover: function (val) {
			if (val !== undefined) {
				this._allowHover = val;
				return this;
			}
			
			return this._allowHover;
		},
		
		allowFocus: function (val) {
			if (val !== undefined) {
				this._allowFocus = val;
				return this;
			}
			
			return this._allowFocus;
		},
		
		allowActive: function (val) {
			if (val !== undefined) {
				this._allowActive = val;
				return this;
			}
			
			return this._allowActive;
		},
		
		/**
		 * Gets / sets the applied style by name.
		 * @param {String=} name The style name to apply.
		 * @returns {*}
		 */
		styleClass: function (name) {
			if (name !== undefined) {
				// Add a period to the class name
				name = '.' + name;
				
				// Check for existing assigned style
				if (this._styleClass && this._styleClass !== name) {
					// Unregister this element from the style
					ige.ui.unRegisterElementStyle(this);
				}
				
				// Assign the new style
				this._styleClass = name;
				
				// Register the element for this style
				ige.ui.registerElementStyle(this);
				
				// Update the element style
				this._updateStyle();
				
				return this;
			}
			
			return this._styleClass;
		},
		
		_updateStyle: function () {
			// Apply styles in order of class, class:focus, class:hover, class:active,
			// id, id:focus, id:hover, id:active
			this._processStyle(this._classId);
			this._processStyle(this._styleClass);
			this._processStyle('#' + this._id);
			
			if (this._focused) {
				this._processStyle(this._classId, 'focus');
				this._processStyle(this._styleClass, 'focus');
				this._processStyle('#' + this._id, 'focus');
			}
			
			if (this._mouseStateOver) {
				this._processStyle(this._classId, 'hover');
				this._processStyle(this._styleClass, 'hover');
				this._processStyle('#' + this._id, 'hover');
			}
			
			if (this._mouseStateDown) {
				this._processStyle(this._classId, 'active');
				this._processStyle(this._styleClass, 'active');
				this._processStyle('#' + this._id, 'active');
			}
		},
		
		_processStyle: function (styleName, state) {
			if (styleName) {
				if (state) {
					styleName += ':' + state;
				}
				
				//this.log('Checking for styles with selector: ' + styleName);
				
				// Basic
				var styleData = ige.ui.style(styleName);
				if (styleData) {
					//this.log('Applying styles with selector "' + styleName + '"');
					this.applyStyle(styleData);
				}
			}
		},
		
		/**
		 * Apply styles from a style data object. Usually you don't want to
		 * call this method directly but rather assign a style by name using
		 * the style() method, however it is not illegal practise to apply
		 * here if you wish if you have not defined a style by name and simply
		 * wish to apply style data directly.
		 *
		 * Style property names must correspond to method names in the element
		 * class that the style is being applied to. You can see the default
		 * ui style methods available in the ./engine/extensions/IgeUi* files.
		 *
		 * In the example below showing padding, you can see how the data assigned
		 * is passed to the "padding()" method as arguments, which is the same
		 * as calling "padding(10, 10, 10, 10);".
		 *
		 * @example #Apply a background color
		 *     var elem = new IgeUiElement()
		 *         .applyStyle({
	 *             'backgroundColor': '#ffffff' // Set background color to white
	 *         });
		 *
		 * @example #Apply padding with multiple arguments
		 *     var elem = new IgeUiElement()
		 *         .applyStyle({
	 *             'padding': [10, 10, 10, 10] // Set padding using multiple values
	 *         });
		 *
		 * @param {Object} styleData The style object to apply. This object should
		 * contain key/value pairs where the key matches a method name and the value
		 * is the parameter to pass it.
		 */
		applyStyle: function (styleData) {
			var args;
			
			if (styleData !== undefined) {
				// Loop the style data and apply styles as required
				for (var i in styleData) {
					if (styleData.hasOwnProperty(i)) {
						// Check that the style method exists
						if (typeof(this[i]) === 'function') {
							// The method exists, call it with the arguments
							if (styleData[i] instanceof Array) {
								args = styleData[i];
							} else {
								args = [styleData[i]];
							}
							
							this[i].apply(this, args);
						}
					}
				}
			}
			
			return this;
		},
		
		/**
		 * Sets global UI focus to this element.
		 */
		focus: function () {
			if (ige.ui.focus(this)) {
				// Re-apply styles since the change
				this._updateStyle();
				return true;
			}
			
			return false;
		},
		
		blur: function () {
			if (ige.ui.blur(this)) {
				// Re-apply styles since the change
				this._updateStyle();
				return true;
			}
			
			return false;
		},
		
		focused: function () {
			return this._focused;
		},
		
		value: function (val) {
			if (val !== undefined) {
				this._value = val;
				return this;
			}
			
			return this._value;
		},
		
		_mounted: function () {
			this._updateStyle();
		},
		
		/**
		 * Destructor
		 */
		destroy: function () {
			ige.ui.unRegisterElement(this);
			IgeUiEntity.prototype.destroy.call(this);
		}
	});
	
	return IgeUiElement;
});
},{"irrelon-appcore":67}],62:[function(_dereq_,module,exports){
"use strict";

var appCore = _dereq_('irrelon-appcore');

appCore.module('IgeUiEntity', function (IgeEntity, IgeUiStyleExtension, IgeUiPositionExtension) {
// TODO: Implement the _stringify() method for this class
	/**
	 * Creates a new UI entity. UI entities use more resources and CPU
	 * than standard IgeEntity instances so only use them if an IgeEntity
	 * won't do the job.
	 */
	var IgeUiEntity = IgeEntity.extend([
		{extension: IgeUiStyleExtension, overwrite: true},
		{extension: IgeUiPositionExtension, overwrite: true}
	], {
		classId: 'IgeUiEntity',
		
		init: function () {
			IgeEntity.prototype.init.call(this);
			
			// Set some defaults
			this._color = '#000000';
			this._borderLeftWidth = 0;
			this._borderTopWidth = 0;
			this._borderRightWidth = 0;
			this._borderBottomWidth = 0;
			this._borderTopLeftRadius = 0;
			this._borderTopRightRadius = 0;
			this._borderBottomRightRadius = 0;
			this._borderBottomLeftRadius = 0;
			this._backgroundPosition = {x: 0, y: 0};
			this._paddingLeft = 0;
			this._paddingTop = 0;
			this._paddingRight = 0;
			this._paddingBottom = 0;
		},
		
		disabled: function (val) {
			if (val !== undefined) {
				this._disabled = val;
				return this;
			}
			
			return this._disabled;
		},
		
		overflow: function (val) {
			if (val !== undefined) {
				this._overflow = val;
				return this;
			}
			
			return this._overflow;
		},
		
		_renderBackground: function (ctx) {
			var geom = this._bounds2d,
				left, top, width, height;
			
			if (this._backgroundColor || this._patternFill) {
				left = -(geom.x / 2) | 0;
				top = -(geom.y / 2) | 0;
				width = geom.x;
				height = geom.y;
				
				ctx.save();
				ctx.beginPath();
				
				// Check for early exit if we are rendering a rectangle
				if (!this._borderTopRightRadius && !this._borderBottomRightRadius && !this._borderBottomLeftRadius && !this._borderTopLeftRadius) {
					ctx.rect(left, top, width, height);
				} else {
					// Top border
					ctx.moveTo(left + this._borderTopLeftRadius, top);
					ctx.lineTo(left + width - this._borderTopRightRadius, top);
					
					if (this._borderTopRightRadius > 0) {
						// Top-right corner
						ctx.arcTo(
							left + width,
							top,
							left + width,
							top + this._borderTopRightRadius,
							this._borderTopRightRadius
						);
					}
					
					// Right border
					ctx.lineTo(
						left + width,
						top + height - this._borderBottomRightRadius
					);
					
					if (this._borderBottomRightRadius > 0) {
						// Bottom-right corner
						ctx.arcTo(
							left + width,
							top + height,
							left + width - this._borderBottomRightRadius,
							top + height, this._borderBottomRightRadius
						);
					}
					
					// Bottom border
					ctx.lineTo(
						left + this._borderBottomLeftRadius,
						top + height
					);
					
					if (this._borderBottomLeftRadius > 0) {
						// Bottom-left corner
						ctx.arcTo(
							left,
							top + height,
							left,
							top + height - this._borderBottomLeftRadius,
							this._borderBottomLeftRadius
						);
					}
					
					// Left border
					ctx.lineTo(
						left,
						top + this._borderTopLeftRadius
					);
					
					if (this._borderTopLeftRadius > 0) {
						// Top-left corner
						ctx.arcTo(
							left,
							top,
							left + this._borderTopLeftRadius,
							top, this._borderTopLeftRadius
						);
					}
					
					ctx.clip();
				}
				
				// If there is a background colour, paint it here
				if (this._backgroundColor) {
					ctx.fillStyle = this._backgroundColor;
					ctx.fill();
				}
				
				// If there is a background image, paint it here
				if (this._patternFill) {
					ctx.translate(
						-(width / 2 | 0) + this._backgroundPosition.x,
						-(height / 2 | 0) + this._backgroundPosition.y
					);
					
					ctx.fillStyle = this._patternFill;
					ctx.fill();
				}
				ctx.restore();
			}
		},
		
		_renderBorder: function (ctx) {
			var rad,
				geom = this._bounds2d,
				left = (-(geom.x2) | 0) + 0.5,
				top = (-(geom.y2) | 0) + 0.5,
				width = geom.x - 1,
				height = geom.y - 1;
			
			// Check for early exit if we are rendering a rectangle
			if (!this._borderTopRightRadius && !this._borderBottomRightRadius && !this._borderBottomLeftRadius && !this._borderTopLeftRadius
				&& this._borderLeftWidth === this._borderWidth
				&& this._borderTopWidth === this._borderWidth
				&& this._borderRightWidth === this._borderWidth
				&& this._borderBottomWidth === this._borderWidth) {
				ctx.strokeStyle = this._borderColor;
				ctx.lineWidth = this._borderWidth;
				ctx.strokeRect(left, top, width, height);
			} else {
				var startNewStroke = function () {
					ctx.stroke();
					ctx.beginPath();
				};
				rad = Math.PI / 180;
				
				ctx.beginPath();
				if (this._borderTopWidth) {
					// Top-left corner top-half
					ctx.strokeStyle = this._borderTopColor;
					ctx.lineWidth = this._borderTopWidth;
					
					if (this._borderTopLeftRadius > 0) {
						// Top-left corner top-half
						ctx.arc(left + this._borderTopLeftRadius, top + this._borderTopLeftRadius, this._borderTopLeftRadius, 225 * rad, 270 * rad);
					}
					
					// Top border
					ctx.moveTo(left + this._borderTopLeftRadius, top);
					ctx.lineTo(left + width - this._borderTopRightRadius, top);
					
					if (this._borderTopRightRadius > 0) {
						// Top-right corner top-half
						ctx.arc(left + width - this._borderTopRightRadius, top + this._borderTopRightRadius, this._borderTopRightRadius, -90 * rad, -44 * rad); // use -44 instead of -45 to fully connect with next piece
					}
				}
				
				if (!this._borderRightWidth || this._borderTopColor != this._borderRightColor || this._borderTopWidth != this._borderRightWidth)
					startNewStroke();
				if (this._borderRightWidth) {
					// Top-right corner bottom-half
					ctx.strokeStyle = this._borderRightColor;
					ctx.lineWidth = this._borderRightWidth;
					
					if (this._borderTopRightRadius > 0) {
						ctx.arc(left + width - this._borderTopRightRadius, top + this._borderTopRightRadius, this._borderTopRightRadius, -45 * rad, 0);
					}
					
					// Right border
					ctx.moveTo(left + width, top + this._borderTopRightRadius);
					ctx.lineTo(left + width, top + height - this._borderBottomRightRadius);
					
					if (this._borderBottomRightRadius > 0) {
						// Bottom-right corner top-half
						ctx.arc(left + width - this._borderBottomRightRadius, top + height - this._borderBottomRightRadius, this._borderTopRightRadius, 0, 46 * rad); // use 46 instead of 45 to fully connect with next piece
					}
				}
				
				if (!this._borderBottomWidth || this._borderRightColor != this._borderBottomColor || this._borderRightWidth != this._borderBottomWidth)
					startNewStroke();
				if (this._borderBottomWidth) {
					// Bottom-right corner bottom-half
					ctx.strokeStyle = this._borderBottomColor;
					ctx.lineWidth = this._borderBottomWidth;
					
					if (this._borderBottomRightRadius > 0) {
						ctx.arc(left + width - this._borderBottomRightRadius, top + height - this._borderBottomRightRadius, this._borderBottomRightRadius, 45 * rad, 90 * rad);
					}
					
					// Bottom border
					ctx.moveTo(left + width - this._borderBottomRightRadius, top + height);
					ctx.lineTo(left + this._borderBottomLeftRadius, top + height);
					
					if (this._borderBottomLeftRadius > 0) {
						// Bottom-left corner bottom-half
						ctx.arc(left + this._borderBottomLeftRadius, top + height - this._borderBottomLeftRadius, this._borderBottomLeftRadius, 90 * rad, 136 * rad); // use 136 instead of 135 to fully connect with next piece
					}
				}
				
				if (!this._borderLeftWidth || this._borderBottomColor != this._borderLeftColor || this._borderBottomWidth != this._borderLeftWidth)
					startNewStroke();
				if (this._borderLeftWidth) {
					// Bottom-left corner top-half
					ctx.strokeStyle = this._borderLeftColor;
					ctx.lineWidth = this._borderLeftWidth;
					
					if (this._borderBottomLeftRadius > 0) {
						ctx.arc(left + this._borderBottomLeftRadius, top + height - this._borderBottomLeftRadius, this._borderBottomLeftRadius, 135 * rad, 180 * rad);
					}
					
					// Left border
					ctx.moveTo(left, top + height - this._borderBottomLeftRadius);
					ctx.lineTo(left, top + this._borderTopLeftRadius);
					
					if (this._borderTopLeftRadius > 0) {
						// Top-left corner bottom-half
						ctx.arc(left + this._borderTopLeftRadius, top + this._borderTopLeftRadius, this._borderTopLeftRadius, 180 * rad, 226 * rad); // use 226 instead of 225 to fully connect with next piece
					}
				}
				ctx.stroke();
			}
		},
		
		cell: function (val) {
			var ret = IgeEntity.prototype.cell.call(this, val);
			
			if (ret === this && this._patternTexture) {
				this.backgroundImage(
					this._patternTexture,
					this._patternRepeat
				);
			}
			
			return ret;
		},
		
		mount: function (obj) {
			var ret = IgeEntity.prototype.mount.call(this, obj);
			
			if (this._parent) {
				// Now we're mounted update our ui calculations since we have a parent
				// to calculate from
				if (this._updateUiPosition) {
					this._updateUiPosition();
				}
				
				// Also update any children if we have any
				if (this._children.length) {
					this.updateUiChildren();
				}
				
				if (this._updateStyle) {
					this._updateStyle();
				}
				
			}
			
			return ret;
		},
		
		tick: function (ctx, dontTransform) {
			if (!this._hidden && this._inView && (!this._parent || (this._parent._inView)) && !this._streamJustCreated) {
				if (!dontTransform) {
					this._transformContext(ctx);
				}
				// TODO: Investigate caching expensive background and border calls
				//if (!this._cache || this._cacheDirty) {
				this._renderBackground(ctx);
				this._renderBorder(ctx);
				//}
				
				if (this._overflow === 'hidden') {
					// Limit drawing of child entities to within the bounds
					// of this one
					var geom = this._bounds2d,
						left = -(geom.x / 2) + this._paddingLeft | 0,
						top = -(geom.y / 2) + (this._paddingTop) | 0,
						width = geom.x + this._paddingRight,
						height = geom.y + this._paddingBottom;
					
					ctx.rect(left, top, width, height);
					//ctx.stroke();
					ctx.clip();
				}
				
				ctx.translate(this._paddingLeft, this._paddingTop);
				IgeEntity.prototype.tick.call(this, ctx, true);
			}
		},
		
		/**
		 * Handles screen resize events.
		 * @param event
		 * @private
		 */
		_resizeEvent: function (event) {
			
			if (this._updateUiPosition) {
				this._updateUiPosition();
			} else {
				debugger;
			}
			
			if (this._updateStyle) {
				this._updateStyle();
			}
			IgeEntity.prototype._resizeEvent.call(this, event);
		}
	});
	
	return IgeUiEntity;
});
},{"irrelon-appcore":67}],63:[function(_dereq_,module,exports){
"use strict";

var appCore = _dereq_('irrelon-appcore');

appCore.module('IgeViewport', function (IgeEntity, IgePoint3d, IgeCamera, IgeUiStyleExtension, IgeUiPositionExtension, IgeRect) {
	/**
	 * Creates a new viewport.
	 */
	var IgeViewport = IgeEntity.extend([
		{extension: IgeUiStyleExtension, overwrite: true},
		{extension: IgeUiPositionExtension, overwrite: true}
	], {
		classId: 'IgeViewport',
		IgeViewport: true,
		
		init: function (options) {
			var width, height;
			
			this._alwaysInView = true;
			IgeEntity.prototype.init.call(this);
			
			this._mouseAlwaysInside = true;
			this._mousePos = new IgePoint3d(0, 0, 0);
			this._overflow = '';
			this._clipping = true;
			this._bornTime = undefined;
			
			// Set default options if not specified
			// TODO: Is this required or even used?
			if (options) {
				width = options.width;
				height = options.height;
				
				if (options && options.scaleToWidth && options.scaleToHeight) {
					// Store the w/h we want to lock to
					this._lockDimension = new IgePoint3d(options.scaleToWidth, options.scaleToHeight, 0);
				}
			}
			
			// Setup default objects
			this._bounds2d = new IgePoint3d(width || ige._bounds2d.x, height || ige._bounds2d.y, 0);
			this.camera = new IgeCamera(this);
			this.camera._entity = this;
			//this._drawMouse = true;
		},
		
		/**
		 * Sets the minimum amount of world in pixels to display in width and height.
		 * When set, if the viewport's geometry is reduced below the minimum width or
		 * height, the viewport's camera is automatically scaled to ensure that the
		 * minimum area remains visible in the viewport.
		 * @param {Integer} width Width in pixels.
		 * @param {Integer} height Height in pixels.
		 * @returns {*}
		 */
		minimumVisibleArea: function (width, height) {
			// Store the w/h we want to lock to
			this._lockDimension = new IgePoint3d(width, height, 0);
			if (ige.isClient) {
				this._resizeEvent({});
			}
			
			return this;
		},
		
		/**
		 * Gets / sets the auto-size property. If set to true, the viewport will
		 * automatically resize to fill the entire scene.
		 * @param val
		 * @return {*}
		 */
		autoSize: function (val) {
			if (typeof(val) !== 'undefined') {
				this._autoSize = val;
				return this;
			}
			
			return this._autoSize;
		},
		
		/**
		 * Gets / sets the scene that the viewport will render.
		 * @param {IgeScene2d} scene
		 * @return {*}
		 */
		scene: function (scene) {
			if (typeof(scene) !== 'undefined') {
				this._scene = scene;
				return this;
			}
			
			return this._scene;
		},
		
		/**
		 * Returns the viewport's mouse position.
		 * @return {IgePoint3d}
		 */
		mousePos: function () {
			// Viewport mouse position is calculated and assigned in the
			// IgeInputComponent class.
			return this._mousePos.clone();
		},
		
		mousePosWorld: function () {
			return this._transformPoint(this._mousePos.clone());
		},
		
		/**
		 * Gets the current rectangular area that the viewport is "looking at"
		 * in the world. The co-ordinates are in world space.
		 * @returns {IgeRect}
		 */
		viewArea: function () {
			var aabb = this.aabb(),
				camTrans = this.camera._translate,
				camScale = this.camera._scale,
				width = aabb.width * (1 / camScale.x),
				height = aabb.height * (1 / camScale.y);
			
			return new IgeRect(
				(camTrans.x - width / 2),
				(camTrans.y - height / 2),
				width,
				height
			);
		},
		
		/**
		 * Processes the updates before the render tick is called.
		 * @param ctx
		 */
		update: function (ctx, tickDelta) {
			// Check if we have a scene attached to this viewport
			if (this._scene) {
				// Store the viewport camera in the main ige so that
				// down the scenegraph we can choose to negate the camera
				// transform effects
				ige._currentCamera = this.camera;
				ige._currentViewport = this;
				
				this._scene._parent = this;
				
				this.camera.update(ctx, tickDelta);
				IgeEntity.prototype.update.call(this, ctx, tickDelta);
				
				if (this._scene.newFrame()) {
					this._scene.update(ctx, tickDelta);
				}
			}
		},
		
		/**
		 * Processes the actions required each render frame.
		 */
		tick: function (ctx, scene) {
			// Check if we have a scene attached to this viewport
			if (this._scene) {
				// Store the viewport camera in the main ige so that
				// down the scenegraph we can choose to negate the camera
				// transform effects
				ige._currentCamera = this.camera;
				ige._currentViewport = this;
				
				this._scene._parent = this;
				
				// Render our scene data
				//ctx.globalAlpha = ctx.globalAlpha * this._parent._opacity * this._opacity;
				IgeEntity.prototype.tick.call(this, ctx);
				
				// Translate to the top-left of the viewport
				ctx.translate(
					-(this._bounds2d.x * this._origin.x) | 0,
					-(this._bounds2d.y * this._origin.y) | 0
				);
				
				// Clear the rectangle area of the viewport
				ctx.clearRect(0, 0, this._bounds2d.x, this._bounds2d.y);
				
				// Clip the context so we only draw "inside" the viewport area
				if (this._clipping || this._borderColor) {
					ctx.beginPath();
					ctx.rect(0, 0, this._bounds2d.x / ige._scale.x, this._bounds2d.y / ige._scale.x);
					
					// Paint a border if required
					if (this._borderColor) {
						ctx.strokeStyle = this._borderColor;
						ctx.stroke();
					}
					
					if (this._clipping) {
						ctx.clip();
					}
				}
				
				// Translate back to the center of the viewport
				ctx.translate(((this._bounds2d.x / 2) | 0) + ige._translate.x, ((this._bounds2d.y / 2) | 0) + ige._translate.y);
				/*ctx.translate(ige._translate.x, ige._translate.y);*/
				if (ige._scale.x !== 1 || ige._scale.y !== 1) {
					ctx.scale(ige._scale.x, ige._scale.y);
				}
				
				// Transform the context to the center of the viewport
				// by processing the viewport's camera tick method
				this.camera.tick(ctx);
				
				// Draw the scene
				ctx.save();
				this._scene.tick(ctx);
				ctx.restore();
				
				// Check if we should draw guides
				if (this._drawGuides && ctx === ige._ctx) {
					ctx.save();
					ctx.translate(-this._translate.x, -this._translate.y);
					this.paintGuides(ctx);
					ctx.restore();
				}
				
				// Check if we should draw bounds on this viewport
				// (usually for debug purposes)
				if (this._drawBounds && ctx === ige._ctx) {
					// Traverse the scenegraph and draw axis-aligned
					// bounding boxes for every object
					ctx.save();
					ctx.translate(-this._translate.x, -this._translate.y);
					this.paintAabbs(ctx, this._scene, 0);
					ctx.restore();
				}
				
				// Check if we should draw the mouse position on this
				// viewport (usually for debug purposes)
				if (this._drawMouse && ctx === ige._ctx) {
					ctx.save();
					var mp = this.mousePos(),
						text,
						mx,
						my,
						textMeasurement;
					
					// Re-scale the context to ensure that output is always 1:1
					ctx.scale(1 / this.camera._scale.x, 1 / this.camera._scale.y);
					
					// Work out the re-scale mouse position
					mx = Math.floor(mp.x * this.camera._scale.x);
					my = Math.floor(mp.y * this.camera._scale.y);
					
					ctx.fillStyle = '#fc00ff';
					ctx.fillRect(mx - 5, my - 5, 10, 10);
					
					text = this.id() + ' X: ' + mx + ', Y: ' + my;
					textMeasurement = ctx.measureText(text);
					ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
					ctx.fillRect(Math.floor(mx - textMeasurement.width / 2 - 5), Math.floor(my - 25), Math.floor(textMeasurement.width + 10), 14);
					ctx.fillStyle = '#ffffff';
					ctx.fillText(text, mx - textMeasurement.width / 2, my - 15);
					ctx.restore();
				}
				
				if (this._drawViewArea) {
					ctx.save();
					var va = this.viewArea();
					ctx.rect(va.x, va.y, va.width, va.height);
					ctx.stroke();
					ctx.restore();
				}
			}
		},
		
		/**
		 * Returns the screen position of the viewport as an IgePoint3d where x is the
		 * "left" and y is the "top", useful for positioning HTML elements at the
		 * screen location of an IGE entity. The returned values indicate the center
		 * of the viewport on the screen.
		 *
		 * This method assumes that the top-left
		 * of the main canvas element is at 0, 0. If not you can adjust the values
		 * yourself to allow for offset.
		 * @example #Get the screen position of the entity
		 *     var screenPos = entity.screenPosition();
		 * @return {IgePoint3d} The screen position of the entity.
		 */
		screenPosition: function () {
			return new IgePoint3d(
				Math.floor(this._worldMatrix.matrix[2] + ige._bounds2d.x2),
				Math.floor(this._worldMatrix.matrix[5] + ige._bounds2d.y2),
				0
			);
		},
		
		drawViewArea: function (val) {
			if (val !== undefined) {
				this._drawViewArea = val;
				return this;
			}
			
			return this._drawViewArea;
		},
		
		drawBoundsLimitId: function (id) {
			if (id !== undefined) {
				this._drawBoundsLimitId = id;
				return this;
			}
			
			return this._drawBoundsLimitId;
		},
		
		drawBoundsLimitCategory: function (category) {
			if (category !== undefined) {
				this._drawBoundsLimitCategory = category;
				return this;
			}
			
			return this._drawBoundsLimitCategory;
		},
		
		drawCompositeBounds: function (val) {
			if (val !== undefined) {
				this._drawCompositeBounds = val;
				return this;
			}
			
			return this._drawCompositeBounds;
		},
		
		drawGuides: function (val) {
			if (val !== undefined) {
				this._drawGuides = val;
				return this;
			}
			
			return this._drawGuides;
		},
		
		paintGuides: function (ctx) {
			var geom = ige._bounds2d;
			
			// Check draw-guides setting
			if (this._drawGuides) {
				ctx.strokeStyle = '#ffffff';
				
				ctx.translate(0.5, 0.5);
				
				// Draw guide lines in the center
				ctx.beginPath();
				ctx.moveTo(0, -geom.y2);
				ctx.lineTo(0, geom.y);
				ctx.stroke();
				
				ctx.beginPath();
				ctx.moveTo(-geom.x2, 0);
				ctx.lineTo(geom.x, 0);
				ctx.stroke();
			}
		},
		
		/**
		 * Draws the bounding data for each entity in the scenegraph.
		 * @param ctx
		 * @param rootObject
		 * @param index
		 */
		paintAabbs: function (ctx, rootObject, index) {
			var arr = rootObject._children,
				arrCount,
				obj,
				aabb,
				aabbC,
				bounds3dPoly,
				ga,
				r3d,
				xl1, xl2, xl3, xl4, xl5, xl6,
				bf1, bf2, bf3, bf4,
				tf1, tf2, tf3, tf4;
			
			if (arr) {
				arrCount = arr.length;
				
				while (arrCount--) {
					obj = arr[arrCount];
					index++;
					
					if (obj._shouldRender !== false) {
						if (obj._classId !== 'IgeScene2d' && (!this._drawBoundsLimitId && !this._drawBoundsLimitCategory) || ((this._drawBoundsLimitId && (this._drawBoundsLimitId instanceof Array ? this._drawBoundsLimitId.indexOf(obj.id()) > -1 : this._drawBoundsLimitId === obj.id())) || (this._drawBoundsLimitCategory && this._drawBoundsLimitCategory === obj.category()))) {
							if (typeof(obj.aabb) === 'function') {
								// Grab the AABB and then draw it
								aabb = obj.aabb();
								
								if (this._drawCompositeBounds && obj._compositeCache) {
									aabbC = obj.compositeAabb();
									
									// Draw composite bounds
									ctx.strokeStyle = '#ff0000';
									ctx.strokeRect(aabbC.x, aabbC.y, aabbC.width, aabbC.height);
								}
								
								if (aabb) {
									if (obj._drawBounds || obj._drawBounds === undefined) {
										//if (!obj._parent || (obj._parent && obj._parent._mountMode !== 1)) {
										// Draw a rect around the bounds of the object transformed in world space
										/*ctx.save();
										 obj._worldMatrix.transformRenderingContext(ctx);
										 ctx.strokeStyle = '#9700ae';
										 ctx.strokeRect(-obj._bounds2d.x2, -obj._bounds2d.y2, obj._bounds2d.x, obj._bounds2d.y);
										 ctx.restore();*/
										
										// Draw individual bounds
										ctx.strokeStyle = '#00deff';
										ctx.strokeRect(aabb.x, aabb.y, aabb.width, aabb.height);
										//}
										
										// Check if the object is mounted to an isometric mount
										if (obj._parent && obj._parent._mountMode === 1) {
											bounds3dPoly = obj.bounds3dPolygon().aabb();
											ctx.save();
											ctx.strokeStyle = '#0068b8';
											ctx.strokeRect(bounds3dPoly.x, bounds3dPoly.y, bounds3dPoly.width, bounds3dPoly.height);
											ctx.restore();
											
											ctx.save();
											ctx.translate(
												bounds3dPoly.x + bounds3dPoly.width / 2,
												bounds3dPoly.y + bounds3dPoly.height / 2
											);
											//obj._transformContext(ctx);
											
											// Calculate the 3d bounds data
											r3d = obj._bounds3d;
											xl1 = new IgePoint3d(-(r3d.x / 2), 0, 0).toIso();
											xl2 = new IgePoint3d(+(r3d.x / 2), 0, 0).toIso();
											xl3 = new IgePoint3d(0, -(r3d.y / 2), 0).toIso();
											xl4 = new IgePoint3d(0, +(r3d.y / 2), 0).toIso();
											xl5 = new IgePoint3d(0, 0, -(r3d.z / 2)).toIso();
											xl6 = new IgePoint3d(0, 0, +(r3d.z / 2)).toIso();
											// Bottom face
											bf1 = new IgePoint3d(-(r3d.x / 2), -(r3d.y / 2),  -(r3d.z / 2)).toIso();
											bf2 = new IgePoint3d(+(r3d.x / 2), -(r3d.y / 2),  -(r3d.z / 2)).toIso();
											bf3 = new IgePoint3d(+(r3d.x / 2), +(r3d.y / 2),  -(r3d.z / 2)).toIso();
											bf4 = new IgePoint3d(-(r3d.x / 2), +(r3d.y / 2),  -(r3d.z / 2)).toIso();
											// Top face
											tf1 = new IgePoint3d(-(r3d.x / 2), -(r3d.y / 2),  (r3d.z / 2)).toIso();
											tf2 = new IgePoint3d(+(r3d.x / 2), -(r3d.y / 2),  (r3d.z / 2)).toIso();
											tf3 = new IgePoint3d(+(r3d.x / 2), +(r3d.y / 2),  (r3d.z / 2)).toIso();
											tf4 = new IgePoint3d(-(r3d.x / 2), +(r3d.y / 2),  (r3d.z / 2)).toIso();
											
											ga = ctx.globalAlpha;
											
											// Axis lines
											ctx.globalAlpha = 1;
											ctx.strokeStyle = '#ff0000';
											ctx.beginPath();
											ctx.moveTo(xl1.x, xl1.y);
											ctx.lineTo(xl2.x, xl2.y);
											ctx.stroke();
											ctx.strokeStyle = '#00ff00';
											ctx.beginPath();
											ctx.moveTo(xl3.x, xl3.y);
											ctx.lineTo(xl4.x, xl4.y);
											ctx.stroke();
											ctx.strokeStyle = '#fffc00';
											ctx.beginPath();
											ctx.moveTo(xl5.x, xl5.y);
											ctx.lineTo(xl6.x, xl6.y);
											ctx.stroke();
											
											ctx.strokeStyle = '#a200ff';
											
											if (obj._highlight) {
												ctx.globalAlpha = 0.9;
											} else {
												ctx.globalAlpha = 0.6;
											}
											
											// Left face
											ctx.fillStyle = '#545454';
											ctx.beginPath();
											ctx.moveTo(bf3.x, bf3.y);
											ctx.lineTo(bf4.x, bf4.y);
											ctx.lineTo(tf4.x, tf4.y);
											ctx.lineTo(tf3.x, tf3.y);
											ctx.lineTo(bf3.x, bf3.y);
											ctx.fill();
											ctx.stroke();
											
											// Right face
											ctx.fillStyle = '#282828';
											ctx.beginPath();
											ctx.moveTo(bf3.x, bf3.y);
											ctx.lineTo(bf2.x, bf2.y);
											ctx.lineTo(tf2.x, tf2.y);
											ctx.lineTo(tf3.x, tf3.y);
											ctx.lineTo(bf3.x, bf3.y);
											ctx.fill();
											ctx.stroke();
											
											// Top face
											ctx.fillStyle = '#676767';
											ctx.beginPath();
											ctx.moveTo(tf1.x, tf1.y);
											ctx.lineTo(tf2.x, tf2.y);
											ctx.lineTo(tf3.x, tf3.y);
											ctx.lineTo(tf4.x, tf4.y);
											ctx.lineTo(tf1.x, tf1.y);
											ctx.fill();
											ctx.stroke();
											
											ctx.globalAlpha = ga;
											ctx.restore();
										}
									}
									
									if (this._drawBoundsData  && (obj._drawBounds || obj._drawBoundsData === undefined)) {
										ctx.globalAlpha = 1;
										ctx.fillStyle = '#f6ff00';
										ctx.fillText('ID: ' + obj.id() + ' ' + '(' + obj.classId() + ') ' + obj.layer() + ':' + obj.depth().toFixed(0), aabb.x + aabb.width + 3, aabb.y + 10);
										ctx.fillText('X: ' + obj._translate.x.toFixed(2) + ', ' + 'Y: ' + obj._translate.y.toFixed(2) + ', ' + 'Z: ' + obj._translate.z.toFixed(2), aabb.x + aabb.width + 3, aabb.y + 20);
										ctx.fillText('Num Children: ' + obj._children.length, aabb.x + aabb.width + 3, aabb.y + 40);
									}
								}
							}
						}
						
						this.paintAabbs(ctx, obj, index);
					}
				}
			}
		},
		
		/**
		 * Handles screen resize events.
		 * @param event
		 * @private
		 */
		_resizeEvent: function (event) {
			if (this._autoSize && this._parent) {
				this._bounds2d = this._parent._bounds2d.clone();
			}
			
			this._updateUiPosition();
			
			// Resize the scene
			if (this._scene) {
				this._scene._resizeEvent(event);
			}
			
			// Process locked dimension scaling
			if (this._lockDimension) {
				// Calculate the new camera scale
				var ratio = 1,
					tmpX,
					tmpY;
				
				if (this._bounds2d.x > this._lockDimension.x && this._bounds2d.y > this._lockDimension.y) {
					// Scale using lowest ratio
					tmpX = this._bounds2d.x / this._lockDimension.x;
					tmpY = this._bounds2d.y / this._lockDimension.y;
					
					ratio = tmpX < tmpY ? tmpX : tmpY;
				} else {
					if (this._bounds2d.x > this._lockDimension.x && this._bounds2d.y < this._lockDimension.y) {
						// Scale out to show height
						ratio = this._bounds2d.y / this._lockDimension.y;
					}
					
					if (this._bounds2d.x < this._lockDimension.x && this._bounds2d.y > this._lockDimension.y) {
						// Scale out to show width
						ratio = this._bounds2d.x / this._lockDimension.x;
					}
					
					if (this._bounds2d.x < this._lockDimension.x && this._bounds2d.y < this._lockDimension.y) {
						// Scale using lowest ratio
						tmpX = this._bounds2d.x / this._lockDimension.x;
						tmpY = this._bounds2d.y / this._lockDimension.y;
						
						ratio = tmpX < tmpY ? tmpX : tmpY;
					}
				}
				
				this.camera.scaleTo(ratio, ratio, ratio);
			}
		},
		
		/**
		 * Returns a string containing a code fragment that when
		 * evaluated will reproduce this object's properties via
		 * chained commands. This method will only check for
		 * properties that are directly related to this class.
		 * Other properties are handled by their own class method.
		 * @return {String}
		 */
		_stringify: function () {
			// Get the properties for all the super-classes
			var str = IgeEntity.prototype._stringify.call(this), i;
			
			// Loop properties and add property assignment code to string
			for (i in this) {
				if (this.hasOwnProperty(i) && this[i] !== undefined) {
					switch (i) {
						case '_autoSize':
							str += ".autoSize(" + this._autoSize + ")";
							break;
						case '_scene':
							str += ".scene(ige.$('" + this.scene().id() + "'))";
							break;
					}
				}
			}
			
			return str;
		}
	});
	
	return IgeViewport;
});
},{"irrelon-appcore":67}],64:[function(_dereq_,module,exports){
"use strict";

var appCore = _dereq_('irrelon-appcore');

appCore.module('IgeUiPositionExtension', function () {
	var IgeUiPositionExtension = {
		/**
		 * Gets / sets the entity's x position relative to the left of
		 * the canvas.
		 * @param {Number} px
		 * @param {Boolean=} noUpdate
		 * @return {Number}
		 */
		left: function (px, noUpdate) {
			if (px !== undefined) {
				if (px === null) {
					// Remove all data
					delete this._uiLeft;
					delete this._uiLeftPercent;
				} else {
					delete this._uiCenter;
					delete this._uiCenterPercent;
					
					if (typeof(px) === 'string') {
						// Store the percentage value
						this._uiLeftPercent = px;
						
						// Check if we are already mounted
						var parentWidth,
							val = parseInt(px, 10),
							newVal;
						
						if (this._parent) {
							// We have a parent, use it's geometry
							parentWidth = this._parent._bounds2d.x;
						} else {
							// We don't have a parent so use the main canvas
							// as a reference
							parentWidth = ige._bounds2d.x;
						}
						
						// Calculate real width from percentage
						newVal = (parentWidth / 100 * val) | 0;
						
						this._uiLeft = newVal;
					} else {
						// The value passed is not a percentage, directly assign it
						this._uiLeft = px;
						delete this._uiLeftPercent;
					}
				}
				
				if (!noUpdate) {
					this._updateUiPosition();
				}
				return this;
			}
			
			return this._uiLeft;
		},
		
		/**
		 * Gets / sets the entity's x position relative to the right of
		 * the canvas.
		 * @param {Number} px
		 * @param {Boolean=} noUpdate
		 * @return {Number}
		 */
		right: function (px, noUpdate) {
			if (px !== undefined) {
				if (px === null) {
					// Remove all data
					delete this._uiRight;
					delete this._uiRightPercent;
				} else {
					delete this._uiCenter;
					delete this._uiCenterPercent;
					
					if (typeof(px) === 'string') {
						// Store the percentage value
						this._uiRightPercent = px;
						
						// Check if we are already mounted
						var parentWidth,
							val = parseInt(px, 10),
							newVal;
						
						if (this._parent) {
							// We have a parent, use it's geometry
							parentWidth = this._parent._bounds2d.x;
						} else {
							// We don't have a parent so use the main canvas
							// as a reference
							parentWidth = ige._bounds2d.x;
						}
						
						// Calculate real width from percentage
						newVal = (parentWidth / 100 * val) | 0;
						
						this._uiRight = newVal;
					} else {
						// The value passed is not a percentage, directly assign it
						this._uiRight = px;
						delete this._uiRightPercent;
					}
				}
				
				if (!noUpdate) {
					this._updateUiPosition();
				}
				return this;
			}
			
			return this._uiRight;
		},
		
		/**
		 * Gets / sets the viewport's x position relative to the center of
		 * the entity parent.
		 * @param {Number} px
		 * @param {Boolean=} noUpdate
		 * @return {Number}
		 */
		center: function (px, noUpdate) {
			if (px !== undefined) {
				if (px === null) {
					// Remove all data
					delete this._uiCenter;
					delete this._uiCenterPercent;
				} else {
					delete this._uiLeft;
					delete this._uiLeftPercent;
					delete this._uiRight;
					delete this._uiRightPercent;
					
					if (typeof(px) === 'string') {
						// Store the percentage value
						this._uiCenterPercent = px;
						
						// Check if we are already mounted
						var parentWidth,
							val = parseInt(px, 10),
							newVal;
						
						if (this._parent) {
							// We have a parent, use it's geometry
							parentWidth = this._parent._bounds2d.x2;
						} else {
							// We don't have a parent so use the main canvas
							// as a reference
							parentWidth = ige._bounds2d.x2;
						}
						
						// Calculate real width from percentage
						newVal = (parentWidth / 100 * val) | 0;
						
						this._uiCenter = newVal;
					} else {
						// The value passed is not a percentage, directly assign it
						this._uiCenter = px;
						delete this._uiCenterPercent;
					}
				}
				
				if (!noUpdate) {
					this._updateUiPosition();
				}
				return this;
			}
			
			return this._uiCenter;
		},
		
		/**
		 * Gets / sets the entity's y position relative to the top of
		 * the canvas.
		 * @param {Number} px
		 * @param {Boolean=} noUpdate
		 * @return {Number}
		 */
		top: function (px, noUpdate) {
			if (px !== undefined) {
				if (px === null) {
					// Remove all data
					delete this._uiTop;
					delete this._uiTopPercent;
				} else {
					delete this._uiMiddle;
					delete this._uiMiddlePercent;
					
					if (typeof(px) === 'string') {
						// Store the percentage value
						this._uiTopPercent = px;
						
						// Check if we are already mounted
						var parentHeight,
							val = parseInt(px, 10),
							newVal;
						
						if (this._parent) {
							// We have a parent, use it's geometry
							parentHeight = this._parent._bounds2d.y;
						} else {
							// We don't have a parent so use the main canvas
							// as a reference
							parentHeight = ige._bounds2d.y;
						}
						
						// Calculate real width from percentage
						newVal = (parentHeight / 100 * val) | 0;
						
						this._uiTop = newVal;
					} else {
						// The value passed is not a percentage, directly assign it
						this._uiTop = px;
						delete this._uiTopPercent;
					}
				}
				
				if (!noUpdate) {
					this._updateUiPosition();
				}
				return this;
			}
			
			return this._uiTop;
		},
		
		/**
		 * Gets / sets the entity's y position relative to the bottom of
		 * the canvas.
		 * @param {Number} px
		 * @param {Boolean=} noUpdate
		 * @return {Number}
		 */
		bottom: function (px, noUpdate) {
			if (px !== undefined) {
				if (px === null) {
					// Remove all data
					delete this._uiBottom;
					delete this._uiBottomPercent;
				} else {
					delete this._uiMiddle;
					delete this._uiMiddlePercent;
					
					if (typeof(px) === 'string') {
						// Store the percentage value
						this._uiBottomPercent = px;
						
						// Check if we are already mounted
						var parentHeight,
							val = parseInt(px, 10),
							newVal;
						
						if (this._parent) {
							// We have a parent, use it's geometry
							parentHeight = this._parent._bounds2d.y;
						} else {
							// We don't have a parent so use the main canvas
							// as a reference
							parentHeight = ige._bounds2d.y;
						}
						
						// Calculate real width from percentage
						newVal = (parentHeight / 100 * val) | 0;
						
						this._uiBottom = newVal;
					} else {
						// The value passed is not a percentage, directly assign it
						this._uiBottom = px;
						delete this._uiBottomPercent;
					}
				}
				
				if (!noUpdate) {
					this._updateUiPosition();
				}
				return this;
			}
			
			return this._uiBottom;
		},
		
		/**
		 * Gets / sets the viewport's y position relative to the middle of
		 * the canvas.
		 * @param {Number} px
		 * @param {Boolean=} noUpdate
		 * @return {Number}
		 */
		middle: function (px, noUpdate) {
			if (px !== undefined) {
				if (px === null) {
					// Remove all data
					delete this._uiMiddle;
					delete this._uiMiddlePercent;
				} else {
					delete this._uiTop;
					delete this._uiTopPercent;
					delete this._uiBottom;
					delete this._uiBottomPercent;
					
					if (typeof(px) === 'string') {
						// Store the percentage value
						this._uiMiddlePercent = px;
						
						// Check if we are already mounted
						var parentWidth,
							val = parseInt(px, 10),
							newVal;
						
						if (this._parent) {
							// We have a parent, use it's geometry
							parentWidth = this._parent._bounds2d.y2;
						} else {
							// We don't have a parent so use the main canvas
							// as a reference
							parentWidth = ige._bounds2d.y2;
						}
						
						// Calculate real width from percentage
						newVal = (parentWidth / 100 * val) | 0;
						
						this._uiMiddle = newVal;
					} else {
						// The value passed is not a percentage, directly assign it
						this._uiMiddle = px;
						delete this._uiMiddlePercent;
					}
				}
				
				if (!noUpdate) {
					this._updateUiPosition();
				}
				return this;
			}
			
			return this._uiMiddle;
		},
		
		/**
		 * Gets / sets the geometry.x in pixels.
		 * @param {Number, String=} px Either the width in pixels or a percentage
		 * @param {Boolean=} lockAspect
		 * @param {Number=} modifier A value to add to the final width. Useful when
		 * you want to alter a percentage value by a certain number of pixels after
		 * it has been calculated.
		 * @param {Boolean=} noUpdate
		 * @return {*}
		 */
		width: function (px, lockAspect, modifier, noUpdate) {
			if (px !== undefined) {
				if (px === null) {
					// Remove all data
					delete this._uiWidth;
					this._bounds2d.x = 0;
					this._bounds2d.x2 = 0;
				} else {
					this._uiWidth = px;
					this._widthModifier = modifier !== undefined ? modifier : 0;
					
					if (typeof(px) === 'string') {
						if (this._parent) {
							// Percentage
							var parentWidth = this._parent._bounds2d.x,
								val = parseInt(px, 10),
								newVal,
								ratio;
							
							// Calculate real width from percentage
							newVal = (parentWidth / 100 * val) + this._widthModifier | 0;
							
							if (lockAspect) {
								// Calculate the height from the change in width
								ratio = newVal / this._bounds2d.x;
								this.height(this._bounds2d.y / ratio, false, 0, noUpdate);
							}
							
							this._bounds2d.x = newVal;
							this._bounds2d.x2 = Math.floor(this._bounds2d.x / 2);
						} else {
							// We don't have a parent so use the main canvas
							// as a reference
							var parentWidth = ige._bounds2d.x,
								val = parseInt(px, 10);
							
							// Calculate real height from percentage
							this._bounds2d.x = (parentWidth / 100 * val) + this._widthModifier | 0;
							this._bounds2d.x2 = Math.floor(this._bounds2d.x / 2);
						}
					} else {
						if (lockAspect) {
							// Calculate the height from the change in width
							var ratio = px / this._bounds2d.x;
							this.height(this._bounds2d.y * ratio, false, 0, noUpdate);
						}
						
						this._bounds2d.x = px;
						this._bounds2d.x2 = Math.floor(this._bounds2d.x / 2);
					}
				}
				
				if (!noUpdate) {
					this._updateUiPosition();
				}
				return this;
			}
			
			return this._bounds2d.x;
		},
		
		/**
		 * Gets / sets the geometry.y in pixels.
		 * @param {Number=} px
		 * @param {Boolean=} lockAspect
		 * @param {Number=} modifier A value to add to the final height. Useful when
		 * you want to alter a percentage value by a certain number of pixels after
		 * it has been calculated.
		 * @param {Boolean=} noUpdate
		 * @return {*}
		 */
		height: function (px, lockAspect, modifier, noUpdate) {
			if (px !== undefined) {
				if (px === null) {
					// Remove all data
					delete this._uiHeight;
					this._bounds2d.y = 0;
					this._bounds2d.y2 = 0;
				} else {
					this._uiHeight = px;
					this._heightModifier = modifier !== undefined ? modifier : 0;
					
					if (typeof(px) === 'string') {
						if (this._parent) {
							// Percentage
							var parentHeight = this._parent._bounds2d.y,
								val = parseInt(px, 10),
								newVal,
								ratio;
							
							// Calculate real height from percentage
							// Calculate real width from percentage
							newVal = (parentHeight / 100 * val) + this._heightModifier | 0;
							
							if (lockAspect) {
								// Calculate the height from the change in width
								ratio = newVal / this._bounds2d.y;
								this.width(this._bounds2d.x / ratio, false, 0, noUpdate);
							}
							
							this._bounds2d.y = newVal;
							this._bounds2d.y2 = Math.floor(this._bounds2d.y / 2);
						} else {
							// We don't have a parent so use the main canvas
							// as a reference
							var parentHeight = ige._bounds2d.y,
								val = parseInt(px, 10);
							
							// Calculate real height from percentage
							this._bounds2d.y = (parentHeight / 100 * val) + this._heightModifier | 0;
							this._bounds2d.y2 = Math.floor(this._bounds2d.y / 2);
						}
					} else {
						if (lockAspect) {
							// Calculate the height from the change in width
							var ratio = px / this._bounds2d.y;
							this.width(this._bounds2d.x * ratio, false, 0, noUpdate);
						}
						
						this._bounds2d.y = px;
						this._bounds2d.y2 = Math.floor(this._bounds2d.y / 2);
					}
				}
				
				if (!noUpdate) {
					this._updateUiPosition();
				}
				return this;
			}
			
			return this._bounds2d.y;
		},
		
		autoScaleX: function (val, lockAspect) {
			if (val !== undefined) {
				this._autoScaleX = val;
				this._autoScaleLockAspect = lockAspect;
				
				this._updateUiPosition();
				return this;
			}
			
			return this._autoScaleX;
		},
		
		autoScaleY: function (val, lockAspect) {
			if (val !== undefined) {
				this._autoScaleY = val;
				this._autoScaleLockAspect = lockAspect;
				
				this._updateUiPosition();
				return this;
			}
			
			return this._autoScaleY;
		},
		
		/**
		 * Updates the UI position of every child entity down the scenegraph
		 * for this UI entity.
		 * @return {*}
		 */
		updateUiChildren: function () {
			var arr = this._children,
				arrCount,
				arrItem;
			
			if (arr) {
				arrCount = arr.length;
				
				while (arrCount--) {
					arrItem = arr[arrCount];
					if (arrItem._updateUiPosition) {
						arrItem._updateUiPosition();
					}
					
					if (typeof(arrItem.updateUiChildren) === 'function') {
						arrItem.updateUiChildren();
					}
				}
			}
			
			return this;
		},
		
		/**
		 * Sets the correct translate x and y for the viewport's left, right
		 * top and bottom co-ordinates.
		 * @private
		 */
		_updateUiPosition: function () {
			if (this._parent) {
				var parentGeom = this._parent._bounds2d,
					geomScaled = this._bounds2d.multiplyPoint(this._scale),
					percent,
					newVal,
					ratio;
				
				/*if (this._ignoreCamera && ige._currentCamera) {
				 // Handle cam ignore when calculating
				 parentGeom = parentGeom.dividePoint(ige._currentCamera._scale);
				 }*/
				
				if (this._autoScaleX) {
					// Get the percentage as an integer
					percent = parseInt(this._autoScaleX, 10);
					
					// Calculate new width from percentage
					newVal = (parentGeom.x / 100 * percent);
					
					// Calculate scale ratio
					ratio = newVal / this._bounds2d.x;
					
					// Set the new scale
					this._scale.x = ratio;
					
					if (this._autoScaleLockAspect) {
						this._scale.y = ratio;
					}
				}
				
				if (this._autoScaleY) {
					// Get the percentage as an integer
					percent = parseInt(this._autoScaleY, 10);
					
					// Calculate new height from percentage
					newVal = (parentGeom.y / 100 * percent);
					
					// Calculate scale ratio
					ratio = newVal / this._bounds2d.y;
					
					// Set the new scale
					this._scale.y = ratio;
					
					if (this._autoScaleLockAspect) {
						this._scale.x = ratio;
					}
				}
				
				if (this._uiWidth) {
					this.width(this._uiWidth, false, this._widthModifier, true);
				}
				if (this._uiHeight) {
					this.height(this._uiHeight, false, this._heightModifier, true);
				}
				
				if (this._uiCenterPercent) {
					this.center(this._uiCenterPercent, true);
				}
				if (this._uiMiddlePercent) {
					this.middle(this._uiMiddlePercent, true);
				}
				if (this._uiLeftPercent) {
					this.left(this._uiLeftPercent, true);
				}
				if (this._uiRightPercent) {
					this.right(this._uiRightPercent, true);
				}
				if (this._uiTopPercent) {
					this.top(this._uiTopPercent, true);
				}
				if (this._uiBottomPercent) {
					this.bottom(this._uiBottomPercent, true);
				}
				
				if (this._uiCenter !== undefined) {
					// The element is center-aligned
					this._translate.x = Math.floor(this._uiCenter);
				} else {
					// The element is not center-aligned, process left and right
					if (this._uiLeft !== undefined && this._uiRight !== undefined) {
						// Both left and right values are set, position left and assign width to reach right
						this.width((parentGeom.x) - this._uiLeft - this._uiRight, false, 0, true);
						
						// Update translation
						this._translate.x = Math.floor(this._uiLeft + geomScaled.x2 - (parentGeom.x2));
					} else {
						if (this._uiLeft !== undefined) {
							// Position left aligned
							this._translate.x = Math.floor(this._uiLeft + geomScaled.x2 - (parentGeom.x2));
						}
						
						if (this._uiRight !== undefined) {
							// Position right aligned
							this._translate.x = Math.floor(parentGeom.x2 - geomScaled.x2 - this._uiRight);
						}
					}
				}
				
				if (this._uiMiddle !== undefined) {
					// The element is middle-aligned
					this._translate.y = Math.floor(this._uiMiddle);
				} else {
					// The element is not middle-aligned, process top and bottom
					if (this._uiTop !== undefined && this._uiBottom !== undefined) {
						// Both top and bottom values are set, position top and assign height to reach bottom
						this.height((parentGeom.y) - this._uiTop - this._uiBottom, false, 0, true);
						
						// Update translation
						this._translate.y = Math.floor(this._uiTop + geomScaled.y2 - (parentGeom.y2));
					} else {
						if (this._uiTop !== undefined) {
							// Position top aligned
							this._translate.y = Math.floor(this._uiTop + geomScaled.y2 - (parentGeom.y2));
						}
						
						if (this._uiBottom !== undefined) {
							// Position bottom aligned
							this._translate.y = Math.floor(parentGeom.y2 - geomScaled.y2 - this._uiBottom);
						}
					}
				}
				
				this.emit('uiUpdate');
				
				this.cacheDirty(true);
			}
		}
	};
	
	return IgeUiPositionExtension;
});
},{"irrelon-appcore":67}],65:[function(_dereq_,module,exports){
"use strict";

var appCore = _dereq_('irrelon-appcore');

appCore.module('IgeUiStyleExtension', function () {
	// TODO: Add "overflow" with automatic scroll-bars
	var IgeUiStyleExtension = {
		/**
		 * Gets / sets the color to use as the font color.
		 * @param {CSSColor, CanvasGradient, CanvasPattern=} color
		 * @return {*} Returns this when setting the value or the current value if none is specified.
		 */
		color: function (color) {
			if (color !== undefined) {
				this._color = color;
				this.cacheDirty(true);
				return this;
			}
			
			return this._color;
		},
		
		/**
		 * Sets the current background texture and the repeatType
		 * to determine in which axis the image should be repeated.
		 * @param {IgeTexture=} texture
		 * @param {String=} repeatType Accepts "repeat", "repeat-x",
		 * "repeat-y" and "no-repeat".
		 * @return {*} Returns this if any parameter is specified or
		 * the current background image if no parameters are specified.
		 */
		backgroundImage: function (texture, repeatType) {
			if (texture && texture.image) {
				if (!repeatType) {
					repeatType = 'no-repeat';
				}
				
				// Store the repeatType
				this._patternRepeat = repeatType;
				
				// Store the texture
				this._patternTexture = texture;
				
				// Resize the image if required
				if (this._backgroundSize) {
					texture.resize(this._backgroundSize.x, this._backgroundSize.y);
					this._patternWidth = this._backgroundSize.x;
					this._patternHeight = this._backgroundSize.y;
				} else {
					this._patternWidth = texture.image.width;
					this._patternHeight = texture.image.height;
				}
				
				if (this._cell > 1) {
					// We are using a cell sheet, render the cell to a
					// temporary canvas and set that as the pattern image
					var canvas = document.createElement('canvas'),
						ctx = canvas.getContext('2d'),
						cellData = texture._cells[this._cell];
					
					canvas.width = cellData[2];
					canvas.height = cellData[3];
					
					ctx.drawImage(
						texture.image,
						cellData[0],
						cellData[1],
						cellData[2],
						cellData[3],
						0,
						0,
						cellData[2],
						cellData[3]
					);
					
					// Create the pattern from the texture cell
					this._patternFill = ige._ctx.createPattern(canvas, repeatType);
				} else {
					// Create the pattern from the texture
					this._patternFill = ige._ctx.createPattern(texture.image, repeatType);
				}
				
				texture.restoreOriginal();
				this.cacheDirty(true);
				return this;
			}
			
			return this._patternFill;
		},
		
		backgroundSize: function (x, y) {
			if (x !== undefined && y !== undefined) {
				
				if (typeof(x) === 'string' && x !== 'auto') {
					// Work out the actual size in pixels
					// from the percentage
					x = this._bounds2d.x / 100 * parseInt(x, 10);
				}
				
				if (typeof(y) === 'string' && y !== 'auto') {
					// Work out the actual size in pixels
					// from the percentage
					y = this._bounds2d.y / 100 * parseInt(y, 10);
				}
				
				if (x === 'auto' && y === 'auto') {
					this.log('Cannot set background x and y both to auto!', 'error');
					return this;
				} else if (x === 'auto') {
					if (this._patternTexture && this._patternTexture.image) {
						// find out y change and apply it to the x
						x = this._patternTexture.image.width * (y / this._patternTexture.image.height);
					} else {
						x = this._bounds2d.x * (y / this._bounds2d.y);
					}
				} else if (y === 'auto') {
					if (this._patternTexture && this._patternTexture.image) {
						// find out x change and apply it to the y
						y = this._patternTexture.image.height * (x / this._patternTexture.image.width);
					} else {
						y = this._bounds2d.y * (x / this._bounds2d.x);
					}
				}
				
				if (x !== 0 && y !== 0) {
					this._backgroundSize = {x: x, y: y};
					
					// Reset the background image
					if (this._patternTexture && this._patternRepeat) {
						this.backgroundImage(this._patternTexture, this._patternRepeat);
					}
					this.cacheDirty(true);
				} else {
					this.log('Cannot set background to zero-sized x or y!', 'error');
				}
				return this;
			}
			
			return this._backgroundSize;
		},
		
		/**
		 * Gets / sets the color to use as a background when
		 * rendering the UI element.
		 * @param {CSSColor, CanvasGradient, CanvasPattern=} color
		 * @return {*} Returns this when setting the value or the current value if none is specified.
		 */
		backgroundColor: function (color) {
			if (color !== undefined) {
				this._backgroundColor = color;
				this.cacheDirty(true);
				return this;
			}
			
			return this._backgroundColor;
		},
		
		/**
		 * Gets / sets the position to start rendering the background image at.
		 * @param {Number=} x
		 * @param {Number=} y
		 * @return {*} Returns this when setting the value or the current value if none is specified.
		 */
		backgroundPosition: function (x, y) {
			if (x !== undefined && y !== undefined) {
				this._backgroundPosition = {x: x, y: y};
				this.cacheDirty(true);
				return this;
			}
			
			return this._backgroundPosition;
		},
		
		borderColor: function (color) {
			if (color !== undefined) {
				this._borderColor = color;
				this._borderLeftColor = color;
				this._borderTopColor = color;
				this._borderRightColor = color;
				this._borderBottomColor = color;
				this.cacheDirty(true);
				return this;
			}
			
			return this._borderColor;
		},
		
		borderLeftColor: function (color) {
			if (color !== undefined) {
				this._borderLeftColor = color;
				this.cacheDirty(true);
				return this;
			}
			
			return this._borderLeftColor;
		},
		
		borderTopColor: function (color) {
			if (color !== undefined) {
				this._borderTopColor = color;
				this.cacheDirty(true);
				return this;
			}
			
			return this._borderTopColor;
		},
		
		borderRightColor: function (color) {
			if (color !== undefined) {
				this._borderRightColor = color;
				this.cacheDirty(true);
				return this;
			}
			
			return this._borderRightColor;
		},
		
		borderBottomColor: function (color) {
			if (color !== undefined) {
				this._borderBottomColor = color;
				this.cacheDirty(true);
				return this;
			}
			
			return this._borderBottomColor;
		},
		
		borderWidth: function (px) {
			if (px !== undefined) {
				this._borderWidth = px;
				this._borderLeftWidth = px;
				this._borderTopWidth = px;
				this._borderRightWidth = px;
				this._borderBottomWidth = px;
				this.cacheDirty(true);
				return this;
			}
			
			return this._borderWidth;
		},
		
		borderLeftWidth: function (px) {
			if (px !== undefined) {
				this._borderLeftWidth = px;
				this.cacheDirty(true);
				return this;
			}
			
			return this._borderLeftWidth;
		},
		
		borderTopWidth: function (px) {
			if (px !== undefined) {
				this._borderTopWidth = px;
				this.cacheDirty(true);
				return this;
			}
			
			return this._borderTopWidth;
		},
		
		borderRightWidth: function (px) {
			if (px !== undefined) {
				this._borderRightWidth = px;
				
				this.cacheDirty(true);
				return this;
			}
			
			return this._borderRightWidth;
		},
		
		borderBottomWidth: function (px) {
			if (px !== undefined) {
				this._borderBottomWidth = px;
				
				this.cacheDirty(true);
				return this;
			}
			
			return this._borderBottomWidth;
		},
		
		borderRadius: function (px) {
			if (px !== undefined) {
				this._borderRadius = px;
				this._borderTopLeftRadius = px;
				this._borderTopRightRadius = px;
				this._borderBottomRightRadius = px;
				this._borderBottomLeftRadius = px;
				
				this.cacheDirty(true);
				return this;
			}
			
			return this._borderRadius;
		},
		
		padding: function (left, top, right, bottom) {
			this._paddingLeft = left;
			this._paddingTop = top;
			this._paddingRight = right;
			this._paddingBottom = bottom;
			
			this.cacheDirty(true);
			return this;
		},
		
		paddingLeft: function (px) {
			if (px !== undefined) {
				this._paddingLeft = px;
				
				this.cacheDirty(true);
				return this;
			}
			
			return this._paddingLeft;
		},
		
		paddingTop: function (px) {
			if (px !== undefined) {
				this._paddingTop = px;
				
				this.cacheDirty(true);
				return this;
			}
			
			return this._paddingTop;
		},
		
		paddingRight: function (px) {
			if (px !== undefined) {
				this._paddingRight = px;
				
				this.cacheDirty(true);
				return this;
			}
			
			return this._paddingRight;
		},
		
		paddingBottom: function (px) {
			if (px !== undefined) {
				this._paddingBottom = px;
				
				this.cacheDirty(true);
				return this;
			}
			
			return this._paddingBottom;
		}
	};
	
	return IgeUiStyleExtension;
});
},{"irrelon-appcore":67}],66:[function(_dereq_,module,exports){
"use strict";

var appCore = _dereq_('irrelon-appcore');

appCore.module('ige', function (IgeEngine) {
	var ige = new IgeEngine();
	
	if (ige.isClient) {
		window.ige = ige;
	} else {
		
	}
	
	return ige;
});
},{"irrelon-appcore":67}],67:[function(_dereq_,module,exports){
/**
 * Irrelon AppCore
 *
 * A very lightweight application dependency manager for maintaining
 * clean modularised code without polluting the global namespace.
 *
 * https://github.com/Irrelon/irrelon-appcore
 * npm install irrelon-appcore
 *
 * License: MIT
 * Copyright 2016 Irrelon Software Limited
 * https://www.irrelon.com
 */
(function () {
	"use strict";
	
	var singelton;
	
	/**
	 * The main application class that ties all the application
	 * modules together and exposes the appCore to the global scope
	 * via window.appCore.
	 * @exports AppCore
	 * @constructor
	 */
	var AppCore = function () {
		// The object that holds references to all the app's
		// modules that are defined by appCore.module().
		this._modules = {};
		this._moduleDefs = {};
		
		// The object that holds a reference to callbacks that
		// are waiting for a module to become available / loaded
		this._waiting = {};
		
		this._logLevel = 2;
	};
	
	/**
	 * Executes the passed function once all it's required dependencies
	 * have loaded.
	 * @param {Function} functionDefinition The function to execute once
	 * all its dependencies have been met.
	 * @returns {AppCore} Returns "this" to allow chaining.
	 */
	AppCore.prototype.depends = function (functionDefinition) {
		var moduleDeps,
			moduleDepsArr,
			depArgumentArr = [],
			dependenciesSatisfied = 0,
			gotDependency,
			depIndex,
			depTimeout = [];
		
		if (!functionDefinition) {
			throw('You must provide a function as the first argument to appCore.depends()!');
		}
		
		// Convert dependency list to an array
		moduleDeps = this._dependencyList(functionDefinition);
		moduleDepsArr = moduleDeps.arr;
		
		// Check if the module has dependencies
		if (!moduleDepsArr.length) {
			// No dependencies were found
			return this;
		}
		
		// Grab the dependencies we need - this is a really simple way
		// to check we got our dependencies by how many times this function
		// gets called.
		gotDependency = function (dependencyName, dependency) {
			var depArgumentIndex;
			
			dependenciesSatisfied++;
			
			// Check which index this dependency should be in
			depArgumentIndex = moduleDepsArr.indexOf(dependencyName);
			
			// Clear the timeout for the dependency
			clearTimeout(depTimeout[depArgumentIndex]);
			depTimeout[depArgumentIndex] = 0;
			
			// Assign the dependency to the correct argument index
			depArgumentArr[depArgumentIndex] = dependency;
			
			// Check if we have all the dependencies we need
			if (dependenciesSatisfied === moduleDepsArr.length) {
				// We have our dependencies, load the module! YAY!
				return functionDefinition.apply(functionDefinition, depArgumentArr);
			}
		};
		
		// Register our dependency handler for each dependency
		for (depIndex = 0; depIndex < moduleDepsArr.length; depIndex++) {
			// Create a timeout that will cause a browser error if we are
			// waiting too long for a dependency to arrive
			depTimeout[depIndex] = setTimeout(this.generateDependencyTimeout(moduleDeps.func, moduleDepsArr[depIndex]), 3000);
			
			// Now ask to wait for the module
			this._waitForModule(moduleDepsArr[depIndex], gotDependency);
		}
		
		return this;
	};
	
	AppCore.prototype.sanityCheck = function () {
		var i,
			moduleDef,
			moduleDefString,
			moduleNameRegExp,
			moduleDeps,
			moduleNamesArr,
			nameIndex,
			moduleName;
		
		// Grab all module names
		moduleNamesArr = Object.keys(this._moduleDefs);
		
		// Loop the modules
		for (i in this._moduleDefs) {
			if (this._moduleDefs.hasOwnProperty(i)) {
				moduleDef = this._moduleDefs[i];
				moduleDefString = moduleDef.toString();
				
				// Clean definition
				moduleDefString = moduleDefString
					.replace(/(\/\*\*[.\s\S]*?\*\/)/g, '')
					.replace(/\/\/[.\s\S]*?$/gm, '');
				
				moduleDeps = this._dependencyList(moduleDef);
				
				// Loop the module names array
				for (nameIndex = 0; nameIndex < moduleNamesArr.length; nameIndex++) {
					moduleName = moduleNamesArr[nameIndex];
					moduleNameRegExp = new RegExp('\\b' + moduleName + '\\b');
					
					if (moduleName.toLowerCase() !== i.toLowerCase() && moduleDeps.arr.indexOf(moduleName) === -1) {
						// Check for module usage without dependency injection
						if (moduleNameRegExp.test(moduleDefString)) {
							console.warn('AppCore: Module "' + i + '" might require un-injected module "' + moduleName + '"');
						}
					}
				}
			}
		}
	};
	
	/**
	 * Gets / registers a module with the application and executes the
	 * module's function once all it's required dependencies
	 * have loaded.
	 * @param {String} moduleName The name of the module to define.
	 * @param {Function=} moduleDefinition Optional. The function that
	 * returns the module. If omitted we will return the module
	 * specified by the "name" argument if it exists.
	 * @returns {Function|AppCore} If "moduleDefinition" is provided, returns
	 * "this" to allow chaining. If "moduleDefinition" is omitted,
	 * returns the module specified by the "name" argument.
	 */
	AppCore.prototype.module = function (moduleName, moduleDefinition) {
		var self = this,
			moduleDeps,
			moduleDepsArr,
			depArgumentArr = [],
			dependenciesSatisfied = 0,
			gotDependency,
			depIndex,
			depTimeout = [];
		
		if (!moduleName) {
			throw('You must name your module!');
		}
		
		if (!moduleDefinition) {
			return this._modules[moduleName];
		}
		
		if (this._modules[moduleName] !== undefined) {
			throw('Cannot redefine module "' + moduleName + '" - it has already been defined!');
		}
		
		if (this._logLevel >= 4) { console.log('AppCore: ' + moduleName + ': Init...'); }
		
		// Convert dependency list to an array
		moduleDeps = this._dependencyList(moduleDefinition);
		moduleDepsArr = moduleDeps.arr;
		
		// Check if the module has dependencies
		if (!moduleDepsArr.length) {
			// No dependencies were found, just register the module
			if (this._logLevel >= 4) { console.log('AppCore: ' + moduleName + ': Has no dependencies'); }
			return this._registerModule(moduleName, moduleDefinition, []);
		}
		
		if (this._logLevel >= 4) { console.log('AppCore: ' + moduleName + ': Has ' + moduleDepsArr.length + ' dependenc' + (moduleDepsArr.length > 1 ? 'ies' : 'y') + ' (' + moduleDepsArr.join(', ') + ')'); }
		
		// Grab the dependencies we need - this is a really simple way
		// to check we got our dependencies by how many times this function
		// gets called. Quick and dirty - I'm writing a game of life sim
		// here rather than a dependency injection lib after all.
		gotDependency = function (dependencyName, dependency) {
			var depArgumentIndex;
			
			dependenciesSatisfied++;
			
			if (self._logLevel >= 4) { console.log('AppCore: ' + moduleName + ': Found dependency "' + dependencyName + '"'); }
			
			// Check which index this dependency should be in
			depArgumentIndex = moduleDepsArr.indexOf(dependencyName);
			
			// Clear the timeout for the dependency
			clearTimeout(depTimeout[depArgumentIndex]);
			depTimeout[depArgumentIndex] = 0;
			
			// Assign the dependency to the correct argument index
			depArgumentArr[depArgumentIndex] = dependency;
			
			// Check if we have all the dependencies we need
			if (dependenciesSatisfied === moduleDepsArr.length) {
				// We have our dependencies, load the module! YAY!
				if (self._logLevel >= 4) { console.log('AppCore: ' + moduleName + ': Has all required dependencies, loading...'); }
				return self._registerModule(moduleName, moduleDefinition, depArgumentArr);
			}
		};
		
		// Register our dependency handler for each dependency
		for (depIndex = 0; depIndex < moduleDepsArr.length; depIndex++) {
			// Create a timeout that will cause a browser error if we are
			// waiting too long for a dependency to arrive
			depTimeout[depIndex] = setTimeout(this.generateDependencyTimeout(moduleName, moduleDepsArr[depIndex]), 3000);
			
			// Now ask to wait for the module
			this._waitForModule(moduleDepsArr[depIndex], gotDependency);
		}
		
		return this;
	};
	
	/**
	 * Generates a function that will be called by a timeout when a
	 * dependency does not load in the given time.
	 * @param {String} moduleName The name of the module that is waiting
	 * for a module to load.
	 * @param {String} dependencyName The name of the dependency module
	 * that we are waiting for.
	 * @returns {Function}
	 */
	AppCore.prototype.generateDependencyTimeout = function (moduleName, dependencyName) {
		return function () {
			if (this._logLevel >= 1) { console.error('AppCore: ' + moduleName + ': Dependency failed to load in time: ' + dependencyName); }
		};
	};
	
	/**
	 * Reads a function's definition and finds argument dependencies.
	 * @param moduleDefinition
	 * @returns {Array} An array of dependency names.
	 * @private
	 */
	AppCore.prototype._dependencyList = function (moduleDefinition) {
		var moduleString,
			moduleDeps,
			moduleDepsArr,
			moduleRegExp = /^function(.*?)\((.*?)\)/gi;
		
		// Stringify the module function
		moduleString = moduleDefinition.toString();
		moduleString = moduleString
			.replace(/\n/g, '')
			.replace(/\r/g, '')
			.replace(/\t/g, '');
		
		// Scan module function string to extract dependencies
		// via the regular expression. The dependencies this module
		// has will be a string in the moduleDeps array at index 2
		// if any dependencies were provided.
		moduleDeps = moduleRegExp.exec(moduleString);
		
		// Check if the module has dependencies
		if (!moduleDeps || !moduleDeps.length || moduleDeps[2] === "") {
			// No dependencies were found
			return {
				arr: []
			};
		}
		
		// Clean the dependency list by removing whitespace
		moduleDeps[2] = moduleDeps[2].replace(/ /gi, '');
		
		// Convert dependency list to an array
		moduleDepsArr = moduleDeps[2].split(',');
		
		return {
			arr: moduleDepsArr,
			func: moduleDeps[0]
		};
	};
	
	/**
	 * Adds the passed callback function to an array that will be
	 * processed once the named module has loaded.
	 * @param {String} moduleName The name of the module to wait for.
	 * @param {Function} callback The function to call once the
	 * named module has loaded.
	 * @returns {AppCore} Returns "this" for method chaining.
	 * @private
	 */
	AppCore.prototype._waitForModule = function (moduleName, callback) {
		// Check if the module we are waiting for already exists
		if (this._modules[moduleName] !== undefined) {
			// The module is already loaded, callback now
			callback(moduleName, this._modules[moduleName]);
			return this;
		}
		
		// Add the callback to the waiting list for this module
		this._waiting[moduleName] = this._waiting[moduleName] || [];
		this._waiting[moduleName].push(callback);
		
		return this;
	};
	
	/**
	 * Called when a module has loaded and will loop the array of
	 * waiting functions that have registered to be called when the
	 * named module has loaded, telling them the module is now
	 * available to use.
	 * @param {String} moduleName The name of the module that has loaded.
	 * @private
	 */
	AppCore.prototype._moduleLoaded = function (moduleName) {
		var waitingArr,
			waitingIndex;
		
		// Tell any modules waiting for this one that we are
		// loaded and ready
		waitingArr = this._waiting[moduleName] || null;
		
		if (!waitingArr || !waitingArr.length) {
			// Nothing is waiting for us, exit
			return;
		}
		
		// Loop the waiting array and tell the receiver that
		// this module has loaded
		for (waitingIndex = 0; waitingIndex < waitingArr.length; waitingIndex++) {
			waitingArr[waitingIndex](moduleName, this._modules[moduleName]);
		}
		
		// Clear the waiting array for this module
		delete this._waiting[moduleName];
	};
	
	/**
	 * Registers a module by executing the module function and
	 * storing the result under the _modules object by name.
	 * @param {String} moduleName The name of the module to store.
	 * @param {Function} func The module function to execute and
	 * store the return value of.
	 * @param {Array} args The array of modules that this module
	 * asked for as dependencies.
	 * @private
	 */
	AppCore.prototype._registerModule = function (moduleName, func, args) {
		if (this._logLevel >= 4) { console.log('AppCore: ' + moduleName + ': Loaded'); }
		this._modules[moduleName] = func.apply(func, args) || null;
		this._moduleDefs[moduleName] = func;
		this._moduleLoaded(moduleName);
	};
	
	singelton = new AppCore();
	
	// Create the appCore instance and add to global scope
	if (typeof module  !== 'undefined' && typeof module.exports !== 'undefined') {
		module.exports = singelton;
	}
	
	if (typeof window !== 'undefined') {
		window.appCore = singelton;
	}
})();
},{}],68:[function(_dereq_,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],69:[function(_dereq_,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],70:[function(_dereq_,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],71:[function(_dereq_,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = _dereq_('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = _dereq_('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,_dereq_('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./support/isBuffer":70,"_process":68,"inherits":69}]},{},[22,23,24,25,26,27,28,29,30,31,32,33,35,36,37,34,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,1,2,3,64,65,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,66]);
