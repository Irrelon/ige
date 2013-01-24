/**
 * Provides a UI tooltip. Change properties (textBox, fonts, backgroundcolor)
 * at free will.
 */
var IgeUiTooltip = IgeUiEntity.extend({
	classId: 'IgeUiTooltip',

	/**
	 * @constructor
	 * @param parent Where the mousemove is captured i.e. on which element the tooltip should appear
	 * @param mountEntity Where the tooltip should be mounted. A scene is suggested.
	 * @param width Width of the tooltip
	 * @param height Height of the tooltip
	 * @param content The content which is set with public method "setContent". Can be string, array(2) or an entity
	 */
	init: function (parent, mountEntity, width, height, content) {
		IgeUiEntity.prototype.init.call(this);

		var self = this;
		this.titleBox = new IgeUiEntity()
			.left(0)
			.top(0)
			.width(width)
			.height(30)
			.mount(this);
		this.titleBox.borderBottomColor('#ffffff');
		this.titleBox.borderBottomWidth(1);
		
		this.textBox = new IgeUiEntity()
			.left(0)
			.top(30)
			.width(width)
			.height(height - 30)
			.mount(this);
		
		this.fontEntityTitle = new IgeFontEntity()
			.left(5)
			.top(-4)
			.textAlignX(0)
			.textAlignY(0)
			.nativeFont('10pt Arial')
			.textLineSpacing(-5)
			.mount(this.titleBox);
			
		this.fontEntityText = new IgeFontEntity()
			.left(5)
			.top(0)
			.textAlignX(0)
			.textAlignY(0)
			.nativeFont('10pt Arial')
			.textLineSpacing(-5)
			.mount(this.textBox);
			
		this.setContent(content);
		this.hide();
		this._mountEntity = mountEntity;
		this.mount(mountEntity);
		this.backgroundColor('#53B2F3');
		this.depth(10000);
		this.translateTo(parent._translate.x, parent._translate.y, parent._translate.z);
		this.width(width);
		this.height(height);
		
		parent._tooltip = this;

		// Listen for keyboard events to capture text input
		parent._mouseEventsActive = true;
		parent.on('mouseMove', self._mousemove);
		parent.on('mouseOut', self._mouseout);
		
		return this;
	},

	/**
	 * Extended method to auto-update the width of the child
	 * font entity automatically to fill the text box.
	 * @param px
	 * @param lockAspect
	 * @param modifier
	 * @param noUpdate
	 * @return {*}
	 */
	width: function (px, lockAspect, modifier, noUpdate) {
		var val;

		// Call the main super class method
		val = IgeUiEntity.prototype.width.call(this, px, lockAspect, modifier, noUpdate);

		// Update the font entity width
		this.fontEntityTitle.width(px, lockAspect, modifier, noUpdate);
		this.fontEntityText.width(px, lockAspect, modifier, noUpdate);

		return val;
	},

	/**
	 * Extended method to auto-update the height of the child
	 * font entity automatically to fill the text box.
	 * @param px
	 * @param lockAspect
	 * @param modifier
	 * @param noUpdate
	 * @return {*}
	 */
	height: function (px, lockAspect, modifier, noUpdate) {
		var val;

		// Call the main super class method
		val = IgeUiEntity.prototype.height.call(this, px, lockAspect, modifier, noUpdate);

		// Update the font entity height
		this.fontEntityTitle.width(px, lockAspect, modifier, noUpdate);
		this.fontEntityText.width(px, lockAspect, modifier, noUpdate);

		return val;
	},

	/**
	 * Sets the content of the tooltip. Can be a string for
	 * simple text, an array with two strings for text and title
	 * or a whole entity
	 * @param val The content, be it string, array(2) or an entity
	 * @return {*}
	 */
	setContent: function (val) {
		if (val !== undefined) {
			this.titleBox.unMount();
			this.textBox.unMount();
			this._children.forEach(function(child) {
				child.unMount();
				child.destroy();
			});
			if (typeof(val) == 'string') {
				this.textBox.mount(this);
				this.textBox.height(this._height);
				this.textBox.top(0);
				// Set the text of the font entity to the value
				this.fontEntityText.text(this._value);
			}
			else if (typeof(val) == 'object' && typeof(val[0] == 'string') && typeof(val[1] == 'string')) {
				this.titleBox.mount(this);
				this.textBox.mount(this);
				this.textBox.height(this._height - this.titleBox._height);
				this.textBox.top(this.titleBox._height);
				//title + text
				this.fontEntityTitle.text(val[0]);
				this.fontEntityText.text(val[1]);
			}
			else if (typeof(val) == 'object') {
				val.mount(this);
			}
			this.updateUiChildren();
		}

		return this;
	},

	/**
	 * Gets / sets the font sheet (texture) that the text box will
	 * use when rendering text inside the box.
	 * @param fontSheet
	 * @return {*}
	 */
	fontSheet: function (fontSheet) {
		if (fontSheet !== undefined) {
			// Set the font sheet as the texture for our font entity
			this.fontEntityTitle.texture(fontSheet);
			this.fontEntityText.texture(fontSheet);
		}
		return this;
	},

	/**
	 * Handles mousemove event to show the textbox and adjust its
	 * position according to the mouse position
	 * @param event
	 * @private
	 */
	_mousemove: function (event) {
		var tt = this._tooltip;
		if (tt._hidden) tt.show();
		var mountPos = tt._mountEntity.worldPosition();
		tt.translateTo(event.igeBaseX - mountPos.x + tt._width / 2 + 10, event.igeBaseY - mountPos.y + tt._height / 2, 0);
		tt.updateUiChildren();
	},

	/**
	 * Handles mouseout event to hide the tooltip
	 * @param event
	 * @private
	 */
	_mouseout: function (event) {
		this._tooltip.hide();
	}
});