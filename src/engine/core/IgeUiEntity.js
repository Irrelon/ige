// TODO: Implement the _stringify() method for this class
import { IgeEntity } from "./IgeEntity";
import { registerClass } from "@/engine/igeClassStore";
import { ige } from "../instance";
import { PI180 } from "../utils";

/**
 * Creates a new UI entity. UI entities use more resources and CPU
 * than standard IgeEntity instances so only use them if an IgeEntity
 * won't do the job.
 */
export class IgeUiEntity extends IgeEntity {
	constructor() {
		super(...arguments);
		this.classId = "IgeUiEntity";
		this._color = "#000000";
		this._backgroundSize = { x: 1, y: 1 };
		this._backgroundPosition = { x: 0, y: 0 };
		this._borderWidth = 0;
		this._borderLeftWidth = 0;
		this._borderTopWidth = 0;
		this._borderRightWidth = 0;
		this._borderBottomWidth = 0;
		this._borderRadius = 0;
		this._borderTopLeftRadius = 0;
		this._borderTopRightRadius = 0;
		this._borderBottomRightRadius = 0;
		this._borderBottomLeftRadius = 0;
		this._paddingLeft = 0;
		this._paddingTop = 0;
		this._paddingRight = 0;
		this._paddingBottom = 0;
		this._marginLeft = 0;
		this._marginTop = 0;
		this._marginRight = 0;
		this._marginBottom = 0;
	}
	disabled(val) {
		if (val !== undefined) {
			this._disabled = val;
			return this;
		}
		return this._disabled;
	}
	display(val) {
		if (val !== undefined) {
			this._display = val;
			return this;
		}
		return this._display;
	}
	overflow(val) {
		if (val !== undefined) {
			this._overflow = val;
			return this;
		}
		return this._overflow;
	}
	_renderBackground(ctx) {
		const geom = this._bounds2d;
		if ((!this._backgroundColor && !this._patternFill) || !ctx) {
			return;
		}
		const left = -(geom.x / 2) | 0;
		const top = -(geom.y / 2) | 0;
		const width = geom.x;
		const height = geom.y;
		ctx.save();
		ctx.beginPath();
		if (
			!this._borderTopRightRadius &&
			!this._borderBottomRightRadius &&
			!this._borderBottomLeftRadius &&
			!this._borderTopLeftRadius
		) {
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
			ctx.lineTo(left + width, top + height - this._borderBottomRightRadius);
			if (this._borderBottomRightRadius > 0) {
				// Bottom-right corner
				ctx.arcTo(
					left + width,
					top + height,
					left + width - this._borderBottomRightRadius,
					top + height,
					this._borderBottomRightRadius
				);
			}
			// Bottom border
			ctx.lineTo(left + this._borderBottomLeftRadius, top + height);
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
			ctx.lineTo(left, top + this._borderTopLeftRadius);
			if (this._borderTopLeftRadius > 0) {
				// Top-left corner
				ctx.arcTo(left, top, left + this._borderTopLeftRadius, top, this._borderTopLeftRadius);
			}
			ctx.clip();
		}
		if (this._backgroundColor) {
			ctx.fillStyle = this._backgroundColor;
			ctx.fill();
		}
		if (this._patternFill) {
			ctx.translate(
				-((width / 2) | 0) + this._backgroundPosition.x,
				-((height / 2) | 0) + this._backgroundPosition.y
			);
			ctx.fillStyle = this._patternFill;
			ctx.fill();
		}
		ctx.restore();
	}
	_anyBorderColor() {
		return Boolean(
			this._borderColor ||
				this._borderLeftColor ||
				this._borderTopColor ||
				this._borderRightColor ||
				this._borderBottomColor
		);
	}
	_anyBorderWidth() {
		return Boolean(
			this._borderWidth ||
				this._borderLeftWidth ||
				this._borderTopWidth ||
				this._borderRightWidth ||
				this._borderBottomWidth
		);
	}
	_anyBorderRadius() {
		return Boolean(
			this._borderRadius ||
				this._borderTopRightRadius ||
				this._borderBottomRightRadius ||
				this._borderBottomLeftRadius ||
				this._borderTopLeftRadius
		);
	}
	_borderWidthsMatch() {
		return (
			this._borderLeftWidth === this._borderWidth &&
			this._borderTopWidth === this._borderWidth &&
			this._borderRightWidth === this._borderWidth &&
			this._borderBottomWidth === this._borderWidth
		);
	}
	_renderBorder(ctx) {
		const geom = this._bounds2d;
		const left = (-geom.x2 | 0) + 0.5;
		const top = (-geom.y2 | 0) + 0.5;
		const width = geom.x - 1;
		const height = geom.y - 1;
		if (!this._anyBorderColor()) return;
		if (!this._anyBorderWidth()) return;
		// Check for early exit if we are rendering a rectangle
		if (!this._anyBorderRadius() && this._borderWidthsMatch()) {
			ctx.strokeStyle = this._borderColor;
			ctx.lineWidth = this._borderWidth;
			ctx.strokeRect(left, top, width, height);
		} else {
			const startNewStroke = function () {
				ctx.stroke();
				ctx.beginPath();
			};
			ctx.beginPath();
			if (this._borderTopWidth) {
				// Top-left corner top-half
				ctx.strokeStyle = this._borderTopColor;
				ctx.lineWidth = this._borderTopWidth;
				if (this._borderTopLeftRadius > 0) {
					// Top-left corner top-half
					ctx.arc(
						left + this._borderTopLeftRadius,
						top + this._borderTopLeftRadius,
						this._borderTopLeftRadius,
						225 * PI180,
						270 * PI180
					);
				}
				// Top border
				ctx.moveTo(left + this._borderTopLeftRadius, top);
				ctx.lineTo(left + width - this._borderTopRightRadius, top);
				if (this._borderTopRightRadius > 0) {
					// Top-right corner top-half
					ctx.arc(
						left + width - this._borderTopRightRadius,
						top + this._borderTopRightRadius,
						this._borderTopRightRadius,
						-90 * PI180,
						-44 * PI180
					); // use -44 instead of -45 to fully connect with next piece
				}
			}
			if (
				!this._borderRightWidth ||
				this._borderTopColor !== this._borderRightColor ||
				this._borderTopWidth !== this._borderRightWidth
			)
				startNewStroke();
			if (this._borderRightWidth) {
				// Top-right corner bottom-half
				ctx.strokeStyle = this._borderRightColor;
				ctx.lineWidth = this._borderRightWidth;
				if (this._borderTopRightRadius > 0) {
					ctx.arc(
						left + width - this._borderTopRightRadius,
						top + this._borderTopRightRadius,
						this._borderTopRightRadius,
						-45 * PI180,
						0
					);
				}
				// Right border
				ctx.moveTo(left + width, top + this._borderTopRightRadius);
				ctx.lineTo(left + width, top + height - this._borderBottomRightRadius);
				if (this._borderBottomRightRadius > 0) {
					// Bottom-right corner top-half
					ctx.arc(
						left + width - this._borderBottomRightRadius,
						top + height - this._borderBottomRightRadius,
						this._borderTopRightRadius,
						0,
						46 * PI180
					); // use 46 instead of 45 to fully connect with next piece
				}
			}
			if (
				!this._borderBottomWidth ||
				this._borderRightColor !== this._borderBottomColor ||
				this._borderRightWidth !== this._borderBottomWidth
			)
				startNewStroke();
			if (this._borderBottomWidth) {
				// Bottom-right corner bottom-half
				ctx.strokeStyle = this._borderBottomColor;
				ctx.lineWidth = this._borderBottomWidth;
				if (this._borderBottomRightRadius > 0) {
					ctx.arc(
						left + width - this._borderBottomRightRadius,
						top + height - this._borderBottomRightRadius,
						this._borderBottomRightRadius,
						45 * PI180,
						90 * PI180
					);
				}
				// Bottom border
				ctx.moveTo(left + width - this._borderBottomRightRadius, top + height);
				ctx.lineTo(left + this._borderBottomLeftRadius, top + height);
				if (this._borderBottomLeftRadius > 0) {
					// Bottom-left corner bottom-half
					ctx.arc(
						left + this._borderBottomLeftRadius,
						top + height - this._borderBottomLeftRadius,
						this._borderBottomLeftRadius,
						90 * PI180,
						136 * PI180
					); // use 136 instead of 135 to fully connect with next piece
				}
			}
			if (
				!this._borderLeftWidth ||
				this._borderBottomColor !== this._borderLeftColor ||
				this._borderBottomWidth !== this._borderLeftWidth
			)
				startNewStroke();
			if (this._borderLeftWidth) {
				// Bottom-left corner top-half
				ctx.strokeStyle = this._borderLeftColor;
				ctx.lineWidth = this._borderLeftWidth;
				if (this._borderBottomLeftRadius > 0) {
					ctx.arc(
						left + this._borderBottomLeftRadius,
						top + height - this._borderBottomLeftRadius,
						this._borderBottomLeftRadius,
						135 * PI180,
						180 * PI180
					);
				}
				// Left border
				ctx.moveTo(left, top + height - this._borderBottomLeftRadius);
				ctx.lineTo(left, top + this._borderTopLeftRadius);
				if (this._borderTopLeftRadius > 0) {
					// Top-left corner bottom-half
					ctx.arc(
						left + this._borderTopLeftRadius,
						top + this._borderTopLeftRadius,
						this._borderTopLeftRadius,
						180 * PI180,
						226 * PI180
					); // use 226 instead of 225 to fully connect with next piece
				}
			}
			ctx.stroke();
		}
	}
	cell(val) {
		if (val === undefined) {
			return this._cell;
		}
		super.cell(val);
		if (this._patternTexture) {
			this.backgroundImage(this._patternTexture, this._patternRepeat);
		}
		return this;
	}
	mount(obj) {
		const ret = super.mount(obj);
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
	}
	tick(ctx, dontTransform = false) {
		if (!this._hidden && this._inView && (!this._parent || this._parent._inView) && !this._streamJustCreated) {
			if (!dontTransform) {
				this._transformContext(ctx);
			}
			// TODO: Investigate caching expensive background and border calls
			//if (!this._cache || this._cacheDirty) {
			this._renderBackground(ctx);
			this._renderBorder(ctx);
			//}
			if (this._overflow === "hidden") {
				// Limit drawing of child entities to within the bounds
				// of this one
				const geom = this._bounds2d;
				const left = (-(geom.x / 2) + this._paddingLeft) | 0;
				const top = (-(geom.y / 2) + this._paddingTop) | 0;
				const width = geom.x + this._paddingRight;
				const height = geom.y + this._paddingBottom;
				ctx.rect(left, top, width, height);
				//ctx.stroke();
				ctx.clip();
			}
			ctx.translate(this._paddingLeft, this._paddingTop);
			super.tick(ctx, true);
		}
	}
	/**
	 * Handles screen resize events.
	 * @param event
	 * @private
	 */
	_resizeEvent(event) {
		if (this._updateUiPosition) {
			this._updateUiPosition();
		} else {
			debugger;
		}
		if (this._updateStyle) {
			this._updateStyle();
		}
		super._resizeEvent(event);
	}
	_updateStyle() {}
	left(px, noUpdate = false) {
		if (px === undefined) {
			return this._uiLeft;
		}
		if (px === null) {
			// Remove all data
			delete this._uiLeft;
			delete this._uiLeftPercent;
		} else {
			delete this._uiCenter;
			delete this._uiCenterPercent;
			if (typeof px === "string") {
				// Store the percentage value
				this._uiLeftPercent = px;
				// Check if we are already mounted
				const val = parseInt(px, 10);
				let parentWidth = 0;
				if (this._parent) {
					// We have a parent, use it's geometry
					parentWidth = this._parent._bounds2d.x;
				} else if (ige.engine) {
					// We don't have a parent so use the main canvas
					// as a reference
					parentWidth = ige.engine._bounds2d.x;
				}
				// Calculate real width from percentage
				this._uiLeft = ((parentWidth / 100) * val) | 0;
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
	right(px, noUpdate = false) {
		if (px !== undefined) {
			if (px === null) {
				// Remove all data
				delete this._uiRight;
				delete this._uiRightPercent;
			} else {
				delete this._uiCenter;
				delete this._uiCenterPercent;
				if (typeof px === "string") {
					// Store the percentage value
					this._uiRightPercent = px;
					// Check if we are already mounted
					const val = parseInt(px, 10);
					let parentWidth = 0;
					if (this._parent) {
						// We have a parent, use it's geometry
						parentWidth = this._parent._bounds2d.x;
					} else if (ige.engine) {
						// We don't have a parent so use the main canvas
						// as a reference
						parentWidth = ige.engine._bounds2d.x;
					}
					// Calculate real width from percentage
					this._uiRight = ((parentWidth / 100) * val) | 0;
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
	}
	center(px, noUpdate = false) {
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
				if (typeof px === "string") {
					// Store the percentage value
					this._uiCenterPercent = px;
					// Check if we are already mounted
					const val = parseInt(px, 10);
					let parentWidth = 0;
					if (this._parent) {
						// We have a parent, use it's geometry
						parentWidth = this._parent._bounds2d.x2;
					} else if (ige.engine) {
						// We don't have a parent so use the main canvas
						// as a reference
						parentWidth = ige.engine._bounds2d.x2;
					}
					// Calculate real width from percentage
					this._uiCenter = ((parentWidth / 100) * val) | 0;
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
	}
	top(px, noUpdate = false) {
		if (px === undefined) {
			return this._uiTop;
		}
		if (px === null) {
			// Remove all data
			delete this._uiTop;
			delete this._uiTopPercent;
			return this._uiTop;
		} else {
			delete this._uiMiddle;
			delete this._uiMiddlePercent;
			if (typeof px === "string") {
				// Store the percentage value
				this._uiTopPercent = px;
				// Check if we are already mounted
				const val = parseInt(px, 10);
				let parentHeight = 0;
				if (this._parent) {
					// We have a parent, use it's geometry
					parentHeight = this._parent._bounds2d.y;
				} else if (ige.engine) {
					// We don't have a parent so use the main canvas
					// as a reference
					parentHeight = ige.engine._bounds2d.y;
				}
				// Calculate real width from percentage
				this._uiTop = ((parentHeight / 100) * val) | 0;
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
	bottom(px, noUpdate = false) {
		if (px !== undefined) {
			if (px === null) {
				// Remove all data
				delete this._uiBottom;
				delete this._uiBottomPercent;
			} else {
				delete this._uiMiddle;
				delete this._uiMiddlePercent;
				if (typeof px === "string") {
					// Store the percentage value
					this._uiBottomPercent = px;
					// Check if we are already mounted
					const val = parseInt(px, 10);
					let parentHeight = 0;
					if (this._parent) {
						// We have a parent, use it's geometry
						parentHeight = this._parent._bounds2d.y;
					} else if (ige.engine) {
						// We don't have a parent so use the main canvas
						// as a reference
						parentHeight = ige.engine._bounds2d.y;
					}
					// Calculate real width from percentage
					this._uiBottom = ((parentHeight / 100) * val) | 0;
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
	}
	middle(px, noUpdate = false) {
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
				if (typeof px === "string") {
					// Store the percentage value
					this._uiMiddlePercent = px;
					// Check if we are already mounted
					const val = parseInt(px, 10);
					let parentWidth = 0;
					if (this._parent) {
						// We have a parent, use it's geometry
						parentWidth = this._parent._bounds2d.y2;
					} else if (ige.engine) {
						// We don't have a parent so use the main canvas
						// as a reference
						parentWidth = ige.engine._bounds2d.y2;
					}
					// Calculate real width from percentage
					this._uiMiddle = ((parentWidth / 100) * val) | 0;
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
	}
	width(px, lockAspect = false, modifier, noUpdate = false) {
		if (px !== undefined) {
			if (px === null) {
				// Remove all data
				delete this._uiWidth;
				this._bounds2d.x = 0;
				this._bounds2d.x2 = 0;
			} else {
				this._uiWidth = px;
				this._widthModifier = modifier !== undefined ? modifier : 0;
				if (typeof px === "string") {
					if (this._parent) {
						// Percentage
						const parentWidth = this._parent._bounds2d.x;
						const val = parseInt(px, 10);
						// Calculate real width from percentage
						const newVal = ((parentWidth / 100) * val + this._widthModifier) | 0;
						if (lockAspect) {
							// Calculate the height from the change in width
							const ratio = newVal / this._bounds2d.x;
							this.height(this._bounds2d.y / ratio, false, 0, noUpdate);
						}
						this._bounds2d.x = newVal;
						this._bounds2d.x2 = Math.floor(this._bounds2d.x / 2);
					} else if (ige.engine) {
						// We don't have a parent so use the main canvas
						// as a reference
						const parentWidth = ige.engine._bounds2d.x;
						const val = parseInt(px, 10);
						// Calculate real height from percentage
						this._bounds2d.x = ((parentWidth / 100) * val + this._widthModifier) | 0;
						this._bounds2d.x2 = Math.floor(this._bounds2d.x / 2);
					}
				} else {
					if (lockAspect) {
						// Calculate the height from the change in width
						const ratio = px / this._bounds2d.x;
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
	}
	height(px, lockAspect = false, modifier, noUpdate = false) {
		if (px !== undefined) {
			if (px === null) {
				// Remove all data
				delete this._uiHeight;
				this._bounds2d.y = 0;
				this._bounds2d.y2 = 0;
			} else {
				this._uiHeight = px;
				this._heightModifier = modifier !== undefined ? modifier : 0;
				if (typeof px === "string") {
					if (this._parent) {
						// Percentage
						const parentHeight = this._parent._bounds2d.y;
						const val = parseInt(px, 10);
						// Calculate real height from percentage
						// Calculate real width from percentage
						const newVal = ((parentHeight / 100) * val + this._heightModifier) | 0;
						if (lockAspect) {
							// Calculate the height from the change in width
							const ratio = newVal / this._bounds2d.y;
							this.width(this._bounds2d.x / ratio, false, 0, noUpdate);
						}
						this._bounds2d.y = newVal;
						this._bounds2d.y2 = Math.floor(this._bounds2d.y / 2);
					} else if (ige.engine) {
						// We don't have a parent so use the main canvas
						// as a reference
						const parentHeight = ige.engine._bounds2d.y;
						const val = parseInt(px, 10);
						// Calculate real height from percentage
						this._bounds2d.y = ((parentHeight / 100) * val + this._heightModifier) | 0;
						this._bounds2d.y2 = Math.floor(this._bounds2d.y / 2);
					}
				} else {
					if (lockAspect) {
						// Calculate the height from the change in width
						const ratio = px / this._bounds2d.y;
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
	}
	flex(val) {
		if (val === undefined) return this._uiFlex;
		this._uiFlex = val;
		return this;
	}
	autoScaleX(val, lockAspect = false) {
		if (val !== undefined) {
			this._autoScaleX = val;
			this._autoScaleLockAspect = lockAspect;
			this._updateUiPosition();
			return this;
		}
		return this._autoScaleX;
	}
	autoScaleY(val, lockAspect = false) {
		if (val !== undefined) {
			this._autoScaleY = val;
			this._autoScaleLockAspect = lockAspect;
			this._updateUiPosition();
			return this;
		}
		return this._autoScaleY;
	}
	/**
	 * Updates the UI position of every child entity down the scenegraph
	 * for this UI entity.
	 * @return {*}
	 */
	updateUiChildren() {
		const arr = this._children || [];
		if (!arr) {
			return this;
		}
		let arrCount = arr.length;
		while (arrCount--) {
			const arrItem = arr[arrCount];
			if (arrItem._updateUiPosition) {
				arrItem._updateUiPosition();
			}
			if (arrItem.updateUiChildren) {
				arrItem.updateUiChildren();
			}
		}
		return this;
	}
	/**
	 * Sets the correct translation x and y for the viewport's left, right
	 * top and bottom co-ordinates.
	 * @private
	 */
	_updateUiPosition() {
		if (!this._parent) {
			return;
		}
		const parentGeom = this._parent._bounds2d;
		const geomScaled = this._bounds2d.multiplyPoint(this._scale);
		if (this._autoScaleX) {
			// Get the percentage as an integer
			const percent = parseInt(this._autoScaleX, 10);
			// Calculate new width from percentage
			const newVal = (parentGeom.x / 100) * percent;
			// Calculate scale ratio
			const ratio = newVal / this._bounds2d.x;
			// Set the new scale
			this._scale.x = ratio;
			if (this._autoScaleLockAspect) {
				this._scale.y = ratio;
			}
		}
		if (this._autoScaleY) {
			// Get the percentage as an integer
			const percent = parseInt(this._autoScaleY, 10);
			// Calculate new height from percentage
			const newVal = (parentGeom.y / 100) * percent;
			// Calculate scale ratio
			const ratio = newVal / this._bounds2d.y;
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
				this.width(parentGeom.x - this._uiLeft - this._uiRight, false, 0, true);
				// Update translation
				this._translate.x = Math.floor(this._uiLeft + geomScaled.x2 - parentGeom.x2);
			} else {
				if (this._uiLeft !== undefined) {
					// Position left aligned
					this._translate.x = Math.floor(this._uiLeft + geomScaled.x2 - parentGeom.x2);
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
				this.height(parentGeom.y - this._uiTop - this._uiBottom, false, 0, true);
				// Update translation
				this._translate.y = Math.floor(this._uiTop + geomScaled.y2 - parentGeom.y2);
			} else {
				if (this._uiTop !== undefined) {
					// Position top aligned
					this._translate.y = Math.floor(this._uiTop + geomScaled.y2 - parentGeom.y2);
				}
				if (this._uiBottom !== undefined) {
					// Position bottom aligned
					this._translate.y = Math.floor(parentGeom.y2 - geomScaled.y2 - this._uiBottom);
				}
			}
		}
		this.emit("uiUpdate");
		this.cacheDirty(true);
	}
	color(color) {
		if (color !== undefined) {
			this._color = color;
			this.cacheDirty(true);
			return this;
		}
		return this._color;
	}
	/**
	 * Sets the current background texture and the repeatType
	 * to determine in which axis the image should be repeated.
	 * @param {IgeTexture=} texture
	 * @param {string=} repeatType Accepts "repeat", "repeat-x",
	 * "repeat-y" and "no-repeat".
	 * @return {*} Returns this if any parameter is specified or
	 * the current background image if no parameters are specified.
	 */
	backgroundImage(texture, repeatType) {
		var _a, _b;
		if (!(texture && texture.image)) {
			return this._patternFill;
		}
		if (!repeatType) {
			repeatType = "no-repeat";
		}
		// Store the repeatType
		this._patternRepeat = repeatType;
		// Store the texture
		this._patternTexture = texture;
		// Resize the image if required
		if (
			this._backgroundSize &&
			typeof this._backgroundSize.x === "number" &&
			typeof this._backgroundSize.y === "number"
		) {
			texture.resize(this._backgroundSize.x, this._backgroundSize.y);
			this._patternWidth = this._backgroundSize.x;
			this._patternHeight = this._backgroundSize.y;
		} else {
			this._patternWidth = texture.image.width;
			this._patternHeight = texture.image.height;
		}
		if (this._cell && this._cell > 1) {
			// We are using a cell sheet, render the cell to a
			// temporary canvas and set that as the pattern image
			const canvas = new OffscreenCanvas(2, 2);
			const ctx = canvas.getContext("2d");
			if (!ctx) {
				throw new Error("Couldn't get texture canvas 2d context!");
			}
			const cellData = texture._cells[this._cell];
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
			this._patternFill =
				((_a = ige.engine._ctx) === null || _a === void 0 ? void 0 : _a.createPattern(canvas, repeatType)) ||
				undefined;
		} else {
			// Create the pattern from the texture
			this._patternFill =
				((_b = ige.engine._ctx) === null || _b === void 0
					? void 0
					: _b.createPattern(texture.image, repeatType)) || undefined;
		}
		texture.restoreOriginal();
		this.cacheDirty(true);
		return this;
	}
	backgroundSize(x, y) {
		if (!(x !== undefined && y !== undefined)) {
			return this._backgroundSize;
		}
		if (x === "auto" && y === "auto") {
			this.log("Cannot set both background x and y to auto!", "error");
			return this;
		}
		let finalX = 1;
		let finalY = 1;
		if (typeof x === "string" && x !== "auto") {
			// Work out the actual size in pixels
			// from the percentage
			x = (this._bounds2d.x / 100) * parseInt(x, 10);
			finalX = x;
		}
		if (typeof y === "string" && y !== "auto") {
			// Work out the actual size in pixels
			// from the percentage
			y = (this._bounds2d.y / 100) * parseInt(y, 10);
			finalY = y;
		}
		if (x === "auto" && typeof y === "number") {
			if (this._patternTexture && this._patternTexture.image) {
				// find out y change and apply it to the x
				x = this._patternTexture.image.width * (y / this._patternTexture.image.height);
				finalX = x;
			} else {
				x = this._bounds2d.x * (y / this._bounds2d.y);
				finalX = x;
			}
		} else if (y === "auto" && typeof x === "number") {
			if (this._patternTexture && this._patternTexture.image) {
				// find out x change and apply it to the y
				y = this._patternTexture.image.height * (x / this._patternTexture.image.width);
				finalY = y;
			} else {
				y = this._bounds2d.y * (x / this._bounds2d.x);
				finalY = y;
			}
		}
		if (x === 0 || y === 0) {
			throw new Error("Cannot set background to zero-sized x or y!");
		}
		this._backgroundSize = { x: finalX, y: finalY };
		// Reset the background image
		if (this._patternTexture && this._patternRepeat) {
			this.backgroundImage(this._patternTexture, this._patternRepeat);
		}
		this.cacheDirty(true);
		return this;
	}
	backgroundColor(color) {
		if (color !== undefined) {
			this._backgroundColor = color;
			this.cacheDirty(true);
			return this;
		}
		return this._backgroundColor;
	}
	/**
	 * Gets / sets the position to start rendering the background image at.
	 * @param {number=} x
	 * @param {number=} y
	 * @return {*} Returns this when setting the value or the current value if none is specified.
	 */
	backgroundPosition(x, y) {
		if (x !== undefined && y !== undefined) {
			this._backgroundPosition = { x, y };
			this.cacheDirty(true);
			return this;
		}
		return this._backgroundPosition;
	}
	borderColor(color) {
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
	}
	borderLeftColor(color) {
		if (color !== undefined) {
			this._borderLeftColor = color;
			this.cacheDirty(true);
			return this;
		}
		return this._borderLeftColor;
	}
	borderTopColor(color) {
		if (color !== undefined) {
			this._borderTopColor = color;
			this.cacheDirty(true);
			return this;
		}
		return this._borderTopColor;
	}
	borderRightColor(color) {
		if (color !== undefined) {
			this._borderRightColor = color;
			this.cacheDirty(true);
			return this;
		}
		return this._borderRightColor;
	}
	borderBottomColor(color) {
		if (color !== undefined) {
			this._borderBottomColor = color;
			this.cacheDirty(true);
			return this;
		}
		return this._borderBottomColor;
	}
	borderWidth(px) {
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
	}
	borderLeftWidth(px) {
		if (px !== undefined) {
			this._borderLeftWidth = px;
			this.cacheDirty(true);
			return this;
		}
		return this._borderLeftWidth;
	}
	borderTopWidth(px) {
		if (px !== undefined) {
			this._borderTopWidth = px;
			this.cacheDirty(true);
			return this;
		}
		return this._borderTopWidth;
	}
	borderRightWidth(px) {
		if (px !== undefined) {
			this._borderRightWidth = px;
			this.cacheDirty(true);
			return this;
		}
		return this._borderRightWidth;
	}
	borderBottomWidth(px) {
		if (px !== undefined) {
			this._borderBottomWidth = px;
			this.cacheDirty(true);
			return this;
		}
		return this._borderBottomWidth;
	}
	borderRadius(px) {
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
	}
	borderTopLeftRadius(px) {
		if (px !== undefined) {
			this._borderTopLeftRadius = px;
			this.cacheDirty(true);
			return this;
		}
		return this._borderTopLeftRadius;
	}
	borderTopRightRadius(px) {
		if (px !== undefined) {
			this._borderTopRightRadius = px;
			this.cacheDirty(true);
			return this;
		}
		return this._borderTopRightRadius;
	}
	borderBottomLeftRadius(px) {
		if (px !== undefined) {
			this._borderBottomLeftRadius = px;
			this.cacheDirty(true);
			return this;
		}
		return this._borderBottomLeftRadius;
	}
	borderBottomRightRadius(px) {
		if (px !== undefined) {
			this._borderBottomRightRadius = px;
			this.cacheDirty(true);
			return this;
		}
		return this._borderBottomRightRadius;
	}
	padding(...args) {
		if (args.length === 0) return this._padding;
		if (args.length === 1) {
			// Set padding proper
			this._padding = args[0];
			this.cacheDirty(true);
			return this;
		}
		// Set padding as box (left, top, right, bottom)
		this._paddingLeft = args[0];
		this._paddingTop = args[1];
		this._paddingRight = args[2];
		this._paddingBottom = args[3];
		this.cacheDirty(true);
		return this;
	}
	paddingX(px) {
		if (px !== undefined) {
			this._paddingLeft = px;
			this._paddingRight = px;
			this.cacheDirty(true);
			return this;
		}
		return this._paddingLeft;
	}
	paddingY(px) {
		if (px !== undefined) {
			this._paddingTop = px;
			this._paddingBottom = px;
			this.cacheDirty(true);
			return this;
		}
		return this._paddingTop;
	}
	paddingLeft(px) {
		if (px !== undefined) {
			this._paddingLeft = px;
			this.cacheDirty(true);
			return this;
		}
		return this._paddingLeft;
	}
	paddingTop(px) {
		if (px !== undefined) {
			this._paddingTop = px;
			this.cacheDirty(true);
			return this;
		}
		return this._paddingTop;
	}
	paddingRight(px) {
		if (px !== undefined) {
			this._paddingRight = px;
			this.cacheDirty(true);
			return this;
		}
		return this._paddingRight;
	}
	paddingBottom(px) {
		if (px !== undefined) {
			this._paddingBottom = px;
			this.cacheDirty(true);
			return this;
		}
		return this._paddingBottom;
	}
	margin(...args) {
		if (args.length === 0) return this._margin;
		if (args.length === 1) {
			// Set margin proper
			this._margin = args[0];
			this.cacheDirty(true);
			return this;
		}
		// Set margin as box (left, top, right, bottom)
		this._marginLeft = args[0];
		this._marginTop = args[1];
		this._marginRight = args[2];
		this._marginBottom = args[3];
		this.cacheDirty(true);
		return this;
	}
	marginLeft(px) {
		if (px !== undefined) {
			this._marginLeft = px;
			this.cacheDirty(true);
			return this;
		}
		return this._marginLeft !== undefined ? this._marginLeft : this._margin;
	}
	marginTop(px) {
		if (px !== undefined) {
			this._marginTop = px;
			this.cacheDirty(true);
			return this;
		}
		return this._marginTop;
	}
	marginRight(px) {
		if (px !== undefined) {
			this._marginRight = px;
			this.cacheDirty(true);
			return this;
		}
		return this._marginRight;
	}
	marginBottom(px) {
		if (px !== undefined) {
			this._marginBottom = px;
			this.cacheDirty(true);
			return this;
		}
		return this._marginBottom;
	}
}
registerClass(IgeUiEntity);
