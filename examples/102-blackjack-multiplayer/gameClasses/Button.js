var Button = IgeUiEntity.extend({
	classId: 'Button',
	
	init: function (texture, cell) {
		IgeUiEntity.prototype.init.call(this);
		
		this.texture(texture);
		this.cell(cell);
		this.dimensionsFromCell();
		
		this.mouseEventsActive(true);
		
		this.on('mouseDown', function () {
			this.cell(cell + 1);
		});
		
		this.on('mouseUp', function () {
			this.cell(cell);
		});
	},
	
	text: function (val) {
		if (val !== undefined) {
			this._text = val;
			
			this._fontEntity = new IgeFontEntity()
				.nativeFont('16pt Verdana')
				.colorOverlay('#ffffff')
				.width(200)
				.text(val)
				.mount(this);
			
			return this;
		}
		
		return this._text;
	}
});