var LandingPad = IgeEntityBox2d.extend({
	classId: 'LandingPad',

	init: function () {
		this._super();

		// Set the rectangle colour (this is read in the Rectangle.js smart texture)
		this._rectColor = '#ffc600';

		this.group('landingPad')
			.texture(ige.client.textures.rectangle)
			.width(80)
			.height(5)
			.box2dBody({
				type: 'static',
				allowSleep: true,
				fixtures: [{
					filter: {
						categoryBits: 0x0002,
						maskBits: 0xffff
					},
					shape: {
						type: 'rectangle'
					}
				}]
			});
	}
});