var LandingPad = IgeEntityBox2d.extend({
	classId: 'LandingPad',

	init: function () {
		this._super();

		// Set the rectangle colour (this is read in the Rectangle.js smart texture)
		this._rectColor = '#7ac1ea';

		this.group('floor')
			.texture(ige.client.textures.rectangle)
			.translateTo(0, 50, 0)
			.width(100)
			.height(50)
			.box2dBody({
				type: 'static',
				allowSleep: true,
				fixtures: [{
					filter: {
						categoryBits: 0x0001,
						maskBits: 0xffff
					},
					shape: {
						type: 'rectangle'
					}
				}]
			});
	}
});