var LandingPad = IgeEntityBox2d.extend({
	classId: 'LandingPad',

	init: function () {
		IgeEntityBox2d.prototype.init.call(this);

		// Set the rectangle colour (this is read in the Rectangle.js smart texture)
		this._rectColor = '#ffc600';

		this.category('landingPad')
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