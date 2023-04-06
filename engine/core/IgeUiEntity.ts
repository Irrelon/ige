// TODO: Implement the _stringify() method for this class
import { ige } from "../instance";
import { IgeEntity } from "./IgeEntity";
import { IgeCanvasRenderingContext2d } from "@/types/IgeCanvasRenderingContext2d";
import { IgeTexture } from "./IgeTexture";
import { IgeRepeatType } from "../mixins/IgeUiStyleMixin";
import { IgeObject } from "./IgeObject";
import { PI180 } from "../utils";
import { IgePointXY } from "@/types/IgePointXY";
import { registerClass } from "@/engine/igeClassStore";

/**
 * Creates a new UI entity. UI entities use more resources and CPU
 * than standard IgeEntity instances so only use them if an IgeEntity
 * won't do the job.
 */
export class IgeUiEntity extends IgeEntity {
	classId = "IgeUiEntity";

	_color: string | CanvasGradient | CanvasPattern = "#000000";
	_patternRepeat?: IgeRepeatType;
	_patternTexture?: IgeTexture;
	_backgroundSize: IgePointXY = { x: 1, y: 1 };
	_backgroundPosition: IgePointXY = { x: 0, y: 0 };
	_patternWidth?: number;
	_patternHeight?: number;
	_patternFill?: CanvasPattern;
	_backgroundColor?: string | CanvasGradient | CanvasPattern;
	_borderColor?: string;
	_borderLeftColor?: string;
	_borderTopColor?: string;
	_borderRightColor?: string;
	_borderBottomColor?: string;
	_borderWidth: number = 0;
	_borderLeftWidth: number = 0;
	_borderTopWidth: number = 0;
	_borderRightWidth: number = 0;
	_borderBottomWidth: number = 0;
	_borderRadius: number = 0;
	_borderTopLeftRadius: number = 0;
	_borderTopRightRadius: number = 0;
	_borderBottomRightRadius: number = 0;
	_borderBottomLeftRadius: number = 0;
	_padding?: number;
	_paddingLeft: number = 0;
	_paddingTop: number = 0;
	_paddingRight: number = 0;
	_paddingBottom: number = 0;
	_margin?: number;
	_marginLeft: number = 0;
	_marginTop: number = 0;
	_marginRight: number = 0;
	_marginBottom: number = 0;

	_uiLeft?: number;
	_uiLeftPercent?: string;
	_uiCenter?: number;
	_uiCenterPercent?: string;
	_uiRight?: number;
	_uiRightPercent?: string;
	_uiTop?: number;
	_uiTopPercent?: string;
	_uiMiddle?: number;
	_uiMiddlePercent?: string;
	_uiBottom?: number;
	_uiBottomPercent?: string;

	_uiWidth?: number | string;
	_widthModifier?: number;
	_uiHeight?: number | string;
	_heightModifier?: number;

	_autoScaleX?: string;
	_autoScaleY?: string;
	_autoScaleLockAspect?: boolean;

	_uiFlex?: number;

	_disabled?: boolean;
	_display?: string;
	_overflow?: string;

	disabled (val?: boolean) {
		if (val !== undefined) {
			this._disabled = val;
			return this;
		}

		return this._disabled;
	}

	display (val?: string) {
		if (val !== undefined) {
			this._display = val;
			return this;
		}

		return this._display;
	}

	overflow (val?: string) {
		if (val !== undefined) {
			this._overflow = val;
			return this;
		}

		return this._overflow;
	}

	_renderBackground (ctx?: IgeCanvasRenderingContext2d) {
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
		if (this._backgroundColor) {
			ctx.fillStyle = this._backgroundColor;
			ctx.fill();
		}
		if (this._patternFill) {
			ctx.translate(-(width / 2 | 0) + this._backgroundPosition.x, -(height / 2 | 0) + this._backgroundPosition.y);

			ctx.fillStyle = this._patternFill;
			ctx.fill();
		}
		ctx.restore();
	}

	_anyBorderColor (): boolean {
		return Boolean(this._borderColor || this._borderLeftColor || this._borderTopColor || this._borderRightColor || this._borderBottomColor);
	}

	_anyBorderWidth (): boolean {
		return Boolean(this._borderWidth || this._borderLeftWidth || this._borderTopWidth || this._borderRightWidth || this._borderBottomWidth);
	}

	_anyBorderRadius (): boolean {
		return Boolean(this._borderRadius || this._borderTopRightRadius || this._borderBottomRightRadius || this._borderBottomLeftRadius || this._borderTopLeftRadius);
	}

	_borderWidthsMatch (): boolean {
		return this._borderLeftWidth === this._borderWidth
			&& this._borderTopWidth === this._borderWidth
			&& this._borderRightWidth === this._borderWidth
			&& this._borderBottomWidth === this._borderWidth;
	}

	_renderBorder (ctx: IgeCanvasRenderingContext2d) {
		const geom = this._bounds2d;
		const left = (-(geom.x2) | 0) + 0.5;
		const top = (-(geom.y2) | 0) + 0.5;
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
					ctx.arc(left + this._borderTopLeftRadius, top + this._borderTopLeftRadius, this._borderTopLeftRadius, 225 * PI180, 270 * PI180);
				}

				// Top border
				ctx.moveTo(left + this._borderTopLeftRadius, top);
				ctx.lineTo(left + width - this._borderTopRightRadius, top);

				if (this._borderTopRightRadius > 0) {
					// Top-right corner top-half
					ctx.arc(left + width - this._borderTopRightRadius, top + this._borderTopRightRadius, this._borderTopRightRadius, -90 * PI180, -44 * PI180); // use -44 instead of -45 to fully connect with next piece
				}
			}

			if (!this._borderRightWidth || this._borderTopColor !== this._borderRightColor || this._borderTopWidth !== this._borderRightWidth)
				startNewStroke();
			if (this._borderRightWidth) {
				// Top-right corner bottom-half
				ctx.strokeStyle = this._borderRightColor;
				ctx.lineWidth = this._borderRightWidth;

				if (this._borderTopRightRadius > 0) {
					ctx.arc(left + width - this._borderTopRightRadius, top + this._borderTopRightRadius, this._borderTopRightRadius, -45 * PI180, 0);
				}

				// Right border
				ctx.moveTo(left + width, top + this._borderTopRightRadius);
				ctx.lineTo(left + width, top + height - this._borderBottomRightRadius);

				if (this._borderBottomRightRadius > 0) {
					// Bottom-right corner top-half
					ctx.arc(left + width - this._borderBottomRightRadius, top + height - this._borderBottomRightRadius, this._borderTopRightRadius, 0, 46 * PI180); // use 46 instead of 45 to fully connect with next piece
				}
			}

			if (!this._borderBottomWidth || this._borderRightColor !== this._borderBottomColor || this._borderRightWidth !== this._borderBottomWidth)
				startNewStroke();
			if (this._borderBottomWidth) {
				// Bottom-right corner bottom-half
				ctx.strokeStyle = this._borderBottomColor;
				ctx.lineWidth = this._borderBottomWidth;

				if (this._borderBottomRightRadius > 0) {
					ctx.arc(left + width - this._borderBottomRightRadius, top + height - this._borderBottomRightRadius, this._borderBottomRightRadius, 45 * PI180, 90 * PI180);
				}

				// Bottom border
				ctx.moveTo(left + width - this._borderBottomRightRadius, top + height);
				ctx.lineTo(left + this._borderBottomLeftRadius, top + height);

				if (this._borderBottomLeftRadius > 0) {
					// Bottom-left corner bottom-half
					ctx.arc(left + this._borderBottomLeftRadius, top + height - this._borderBottomLeftRadius, this._borderBottomLeftRadius, 90 * PI180, 136 * PI180); // use 136 instead of 135 to fully connect with next piece
				}
			}

			if (!this._borderLeftWidth || this._borderBottomColor !== this._borderLeftColor || this._borderBottomWidth !== this._borderLeftWidth)
				startNewStroke();
			if (this._borderLeftWidth) {
				// Bottom-left corner top-half
				ctx.strokeStyle = this._borderLeftColor;
				ctx.lineWidth = this._borderLeftWidth;

				if (this._borderBottomLeftRadius > 0) {
					ctx.arc(left + this._borderBottomLeftRadius, top + height - this._borderBottomLeftRadius, this._borderBottomLeftRadius, 135 * PI180, 180 * PI180);
				}

				// Left border
				ctx.moveTo(left, top + height - this._borderBottomLeftRadius);
				ctx.lineTo(left, top + this._borderTopLeftRadius);

				if (this._borderTopLeftRadius > 0) {
					// Top-left corner bottom-half
					ctx.arc(left + this._borderTopLeftRadius, top + this._borderTopLeftRadius, this._borderTopLeftRadius, 180 * PI180, 226 * PI180); // use 226 instead of 225 to fully connect with next piece
				}
			}
			ctx.stroke();
		}
	}

	cell (val: number | null): this;
	cell (): number | null;
	cell (val?: number | null) {
		if (val === undefined) {
			return this._cell;
		}

		super.cell(val);

		if (this._patternTexture) {
			this.backgroundImage(
				this._patternTexture,
				this._patternRepeat
			);
		}

		return this;
	}

	mount (obj: IgeObject) {
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

	tick (ctx: IgeCanvasRenderingContext2d, dontTransform = false) {
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
				const left = -(geom.x / 2) + this._paddingLeft | 0;
				const top = -(geom.y / 2) + (this._paddingTop) | 0;
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
	_resizeEvent (event?: Event) {
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

	_updateStyle () {

	}

	/**
	 * Gets / sets the entity's x position relative to the left of
	 * the canvas.
	 * @param {number} px
	 * @param {Boolean=} noUpdate
	 * @return {number}
	 */
	left (px: number | string, noUpdate?: boolean): this;
	left (): number;
	left (px?: number | string, noUpdate: boolean = false) {
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
				this._uiLeft = (parentWidth / 100 * val) | 0;
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

	/**
	 * Gets / sets the entity's x position relative to the right of
	 * the canvas.
	 * @param {number} px
	 * @param {Boolean=} noUpdate
	 * @return {number}
	 */
	right (px: number | string, noUpdate?: boolean): this;
	right (): number;
	right (px?: number | string, noUpdate = false) {
		if (px !== undefined) {
			if (px === null) {
				// Remove all data
				delete this._uiRight;
				delete this._uiRightPercent;
			} else {
				delete this._uiCenter;
				delete this._uiCenterPercent;

				if (typeof (px) === "string") {
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
					this._uiRight = (parentWidth / 100 * val) | 0;
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

	/**
	 * Gets / sets the viewport's x position relative to the center of
	 * the entity parent.
	 * @param {number} px
	 * @param {Boolean=} noUpdate
	 * @return {number}
	 */
	center (px: number | string, noUpdate?: boolean): this;
	center (): number;
	center (px?: number | string, noUpdate = false) {
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

				if (typeof (px) === "string") {
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
					this._uiCenter = (parentWidth / 100 * val) | 0;
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

	/**
	 * Gets / sets the entity's y position relative to the top of
	 * the canvas.
	 * @param {number} px
	 * @param {Boolean=} noUpdate
	 * @return {number}
	 */
	top (px: number | string, noUpdate?: boolean): this;
	top (): number;
	top (px?: number | string, noUpdate: boolean = false) {
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
				this._uiTop = (parentHeight / 100 * val) | 0;
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

	/**
	 * Gets / sets the entity's y position relative to the bottom of
	 * the canvas.
	 * @param {number} px
	 * @param {Boolean=} noUpdate
	 * @return {number}
	 */
	bottom (px: number | string, noUpdate?: boolean): this;
	bottom (): number;
	bottom (px?: number | string, noUpdate: boolean = false) {
		if (px !== undefined) {
			if (px === null) {
				// Remove all data
				delete this._uiBottom;
				delete this._uiBottomPercent;
			} else {
				delete this._uiMiddle;
				delete this._uiMiddlePercent;

				if (typeof (px) === "string") {
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
					this._uiBottom = (parentHeight / 100 * val) | 0;
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

	/**
	 * Gets / sets the viewport's y position relative to the middle of
	 * the canvas.
	 * @param {number} px
	 * @param {Boolean=} noUpdate
	 * @return {number}
	 */
	middle (px: number | string, noUpdate?: boolean): this;
	middle (): number;
	middle (px?: number | string, noUpdate: boolean = false) {
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

				if (typeof (px) === "string") {
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
					this._uiMiddle = (parentWidth / 100 * val) | 0;
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

	/**
	 * Gets / sets the geometry.x in pixels.
	 * @param {number, String=} px Either the width in pixels or a percentage
	 * @param {Boolean=} lockAspect
	 * @param {number=} modifier A value to add to the final width. Useful when
	 * you want to alter a percentage value by a certain number of pixels after
	 * it has been calculated.
	 * @param {Boolean=} noUpdate
	 * @return {*}
	 */
	width (px: number | string, lockAspect?: boolean, modifier?: number, noUpdate?: boolean): this;
	width (): number;
	width (px?: number | string, lockAspect = false, modifier?: number, noUpdate = false) {
		if (px !== undefined) {
			if (px === null) {
				// Remove all data
				delete this._uiWidth;
				this._bounds2d.x = 0;
				this._bounds2d.x2 = 0;
			} else {
				this._uiWidth = px;
				this._widthModifier = modifier !== undefined ? modifier : 0;

				if (typeof (px) === "string") {
					if (this._parent) {
						// Percentage
						const parentWidth = this._parent._bounds2d.x;
						const val = parseInt(px, 10);

						// Calculate real width from percentage
						const newVal = (parentWidth / 100 * val) + this._widthModifier | 0;

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
						this._bounds2d.x = (parentWidth / 100 * val) + this._widthModifier | 0;
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

	/**
	 * Gets / sets the geometry.y in pixels.
	 * @param {number=} px
	 * @param {Boolean=} lockAspect
	 * @param {number=} modifier A value to add to the final height. Useful when
	 * you want to alter a percentage value by a certain number of pixels after
	 * it has been calculated.
	 * @param {Boolean=} noUpdate If passed, will not recalculate AABB etc. from
	 * this call. Useful for performance if you intend to make subsequent calls
	 * to other functions that will also cause a re-calculation, meaning we can
	 * reduce the overall re-calculations to only one at the end. You must manually
	 * call ._updateUiPosition() when you have made your changes.
	 *
	 * @return {*}
	 */
	height (px: number | string, lockAspect?: boolean, modifier?: number, noUpdate?: boolean): this;
	height (): number;
	height (px?: number | string, lockAspect: boolean = false, modifier?: number, noUpdate: boolean = false) {
		if (px !== undefined) {
			if (px === null) {
				// Remove all data
				delete this._uiHeight;
				this._bounds2d.y = 0;
				this._bounds2d.y2 = 0;
			} else {
				this._uiHeight = px;
				this._heightModifier = modifier !== undefined ? modifier : 0;

				if (typeof (px) === "string") {
					if (this._parent) {
						// Percentage
						const parentHeight = this._parent._bounds2d.y;
						const val = parseInt(px, 10);

						// Calculate real height from percentage
						// Calculate real width from percentage
						const newVal = (parentHeight / 100 * val) + this._heightModifier | 0;

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
						this._bounds2d.y = (parentHeight / 100 * val) + this._heightModifier | 0;
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

	flex (val?: number) {
		if (val === undefined) return this._uiFlex;

		this._uiFlex = val;
		return this;
	}

	autoScaleX (val?: string, lockAspect = false) {
		if (val !== undefined) {
			this._autoScaleX = val;
			this._autoScaleLockAspect = lockAspect;

			this._updateUiPosition();
			return this;
		}

		return this._autoScaleX;
	}

	autoScaleY (val?: string, lockAspect = false) {
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
	updateUiChildren () {
		const arr = (this._children || []) as IgeUiEntity[];

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
	_updateUiPosition () {
		if (!this._parent) {
			return;
		}

		const parentGeom = this._parent._bounds2d;
		const geomScaled = this._bounds2d.multiplyPoint(this._scale);

		if (this._autoScaleX) {
			// Get the percentage as an integer
			const percent = parseInt(this._autoScaleX, 10);

			// Calculate new width from percentage
			const newVal = (parentGeom.x / 100 * percent);

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
			const newVal = (parentGeom.y / 100 * percent);

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

		this.emit("uiUpdate");
		this.cacheDirty(true);
	}

	/**
	 * Gets / sets the color to use as the font color.
	 * @param {string | CanvasGradient | CanvasPattern=} color
	 * @return {*} Returns this when setting the value or the current value if none is specified.
	 */
	color (color?: string | CanvasGradient | CanvasPattern): this;
	color (): string | CanvasGradient | CanvasPattern;
	color (color?: string | CanvasGradient | CanvasPattern) {
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
	backgroundImage (texture?: IgeTexture, repeatType?: IgeRepeatType) {
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
		if (this._backgroundSize && typeof this._backgroundSize.x === "number" && typeof this._backgroundSize.y === "number") {
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
			const ctx = canvas.getContext("2d") as OffscreenCanvasRenderingContext2D;

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
			this._patternFill = ige.engine._ctx?.createPattern(canvas, repeatType) || undefined;
		} else {
			// Create the pattern from the texture
			this._patternFill = ige.engine._ctx?.createPattern(texture.image, repeatType) || undefined;
		}

		texture.restoreOriginal();
		this.cacheDirty(true);
		return this;
	}

	backgroundSize (x?: number | string, y?: number | string) {
		if (!(x !== undefined && y !== undefined)) {
			return this._backgroundSize;
		}

		if (x === "auto" && y === "auto") {
			this.log("Cannot set both background x and y to auto!", "error");
			return this;
		}

		let finalX: number = 1;
		let finalY: number = 1;

		if (typeof x === "string" && x !== "auto") {
			// Work out the actual size in pixels
			// from the percentage
			x = this._bounds2d.x / 100 * parseInt(x, 10);
			finalX = x;
		}

		if (typeof y === "string" && y !== "auto") {
			// Work out the actual size in pixels
			// from the percentage
			y = this._bounds2d.y / 100 * parseInt(y, 10);
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

	/**
	 * Gets / sets the color to use as a background when
	 * rendering the UI element.
	 * @param {CSSColor, CanvasGradient, CanvasPattern=} color
	 * @return {*} Returns this when setting the value or the current value if none is specified.
	 */
	backgroundColor (color: string | CanvasGradient | CanvasPattern): this;
	backgroundColor (): string | CanvasGradient | CanvasPattern;
	backgroundColor (color?: string | CanvasGradient | CanvasPattern) {
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
	backgroundPosition (x: number, y: number) {
		if (x !== undefined && y !== undefined) {
			this._backgroundPosition = { x, y };
			this.cacheDirty(true);
			return this;
		}

		return this._backgroundPosition;
	}

	borderColor (color: string): this;
	borderColor (): string;
	borderColor (color?: string) {
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

	borderLeftColor (color: string) {
		if (color !== undefined) {
			this._borderLeftColor = color;
			this.cacheDirty(true);
			return this;
		}

		return this._borderLeftColor;
	}

	borderTopColor (color: string) {
		if (color !== undefined) {
			this._borderTopColor = color;
			this.cacheDirty(true);
			return this;
		}

		return this._borderTopColor;
	}

	borderRightColor (color: string) {
		if (color !== undefined) {
			this._borderRightColor = color;
			this.cacheDirty(true);
			return this;
		}

		return this._borderRightColor;
	}

	borderBottomColor (color: string) {
		if (color !== undefined) {
			this._borderBottomColor = color;
			this.cacheDirty(true);
			return this;
		}

		return this._borderBottomColor;
	}

	borderWidth (px: number): this;
	borderWidth (): number;
	borderWidth (px?: number) {
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

	borderLeftWidth (px?: number) {
		if (px !== undefined) {
			this._borderLeftWidth = px;
			this.cacheDirty(true);
			return this;
		}

		return this._borderLeftWidth;
	}

	borderTopWidth (px?: number) {
		if (px !== undefined) {
			this._borderTopWidth = px;
			this.cacheDirty(true);
			return this;
		}

		return this._borderTopWidth;
	}

	borderRightWidth (px?: number) {
		if (px !== undefined) {
			this._borderRightWidth = px;

			this.cacheDirty(true);
			return this;
		}

		return this._borderRightWidth;
	}

	borderBottomWidth (px?: number) {
		if (px !== undefined) {
			this._borderBottomWidth = px;

			this.cacheDirty(true);
			return this;
		}

		return this._borderBottomWidth;
	}

	borderRadius (px: number): this;
	borderRadius (): number;
	borderRadius (px?: number) {
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

	borderTopLeftRadius (px?: number) {
		if (px !== undefined) {
			this._borderTopLeftRadius = px;

			this.cacheDirty(true);
			return this;
		}

		return this._borderTopLeftRadius;
	}

	borderTopRightRadius (px?: number) {
		if (px !== undefined) {
			this._borderTopRightRadius = px;

			this.cacheDirty(true);
			return this;
		}

		return this._borderTopRightRadius;
	}

	borderBottomLeftRadius (px?: number) {
		if (px !== undefined) {
			this._borderBottomLeftRadius = px;

			this.cacheDirty(true);
			return this;
		}

		return this._borderBottomLeftRadius;
	}

	borderBottomRightRadius (px?: number) {
		if (px !== undefined) {
			this._borderBottomRightRadius = px;

			this.cacheDirty(true);
			return this;
		}

		return this._borderBottomRightRadius;
	}

	padding (...args: [number]): this;
	padding (...args: [number, number, number, number]): this;
	padding (...args: number[]) {
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

	paddingX (px: number): this;
	paddingX (): number;
	paddingX (px?: number) {
		if (px !== undefined) {
			this._paddingLeft = px;
			this._paddingRight = px;

			this.cacheDirty(true);
			return this;
		}

		return this._paddingLeft;
	}

	paddingY (px: number): this;
	paddingY (): number;
	paddingY (px?: number) {
		if (px !== undefined) {
			this._paddingTop = px;
			this._paddingBottom = px;

			this.cacheDirty(true);
			return this;
		}

		return this._paddingTop;
	}

	paddingLeft (px: number): this;
	paddingLeft (): number;
	paddingLeft (px?: number) {
		if (px !== undefined) {
			this._paddingLeft = px;

			this.cacheDirty(true);
			return this;
		}

		return this._paddingLeft;
	}

	paddingTop (px: number): this;
	paddingTop (): number;
	paddingTop (px?: number) {
		if (px !== undefined) {
			this._paddingTop = px;

			this.cacheDirty(true);
			return this;
		}

		return this._paddingTop;
	}

	paddingRight (px: number): this;
	paddingRight (): number;
	paddingRight (px?: number) {
		if (px !== undefined) {
			this._paddingRight = px;

			this.cacheDirty(true);
			return this;
		}

		return this._paddingRight;
	}

	paddingBottom (px: number): this;
	paddingBottom (): number;
	paddingBottom (px?: number) {
		if (px !== undefined) {
			this._paddingBottom = px;

			this.cacheDirty(true);
			return this;
		}

		return this._paddingBottom;
	}

	margin (...args: [number]): this;
	margin (...args: [number, number, number, number]): this;
	margin (...args: number[]) {
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

	marginLeft (px?: number) {
		if (px !== undefined) {
			this._marginLeft = px;

			this.cacheDirty(true);
			return this;
		}

		return this._marginLeft !== undefined ? this._marginLeft : this._margin;
	}

	marginTop (px?: number) {
		if (px !== undefined) {
			this._marginTop = px;

			this.cacheDirty(true);
			return this;
		}

		return this._marginTop;
	}

	marginRight (px?: number) {
		if (px !== undefined) {
			this._marginRight = px;

			this.cacheDirty(true);
			return this;
		}

		return this._marginRight;
	}

	marginBottom (px?: number) {
		if (px !== undefined) {
			this._marginBottom = px;

			this.cacheDirty(true);
			return this;
		}

		return this._marginBottom;
	}
}

registerClass(IgeUiEntity);
