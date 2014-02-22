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

			if (this._uiWidth) { this.width(this._uiWidth, false, this._widthModifier, true); }
			if (this._uiHeight) { this.height(this._uiHeight, false, this._heightModifier, true); }
			
			if (this._uiCenterPercent) { this.center(this._uiCenterPercent, true); }
			if (this._uiMiddlePercent) { this.middle(this._uiMiddlePercent, true); }
			if (this._uiLeftPercent) { this.left(this._uiLeftPercent, true); }
			if (this._uiRightPercent) { this.right(this._uiRightPercent, true); }
			if (this._uiTopPercent) { this.top(this._uiTopPercent, true); }
			if (this._uiBottomPercent) { this.bottom(this._uiBottomPercent, true); }
			
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

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeUiPositionExtension; }