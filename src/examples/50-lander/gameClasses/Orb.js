var Orb = IgeEntityBox2d.extend({
	classId: 'Orb',

	init: function () {
		IgeEntityBox2d.prototype.init.call(this);

		// Set the rectangle colour (this is read in the Rectangle.js smart texture)
		this._rectColor = '#ffc600';

		this.category('orb')
			.texture(ige.client.textures.orb)
			.width(10)
			.height(10)
			.box2dBody({
				type: 'dynamic',
				linearDamping: 0.0,
				angularDamping: 0.05,
				allowSleep: true,
				bullet: false,
				gravitic: true,
				fixedRotation: false,
				fixtures: [{
					density: 1,
					filter: {
						categoryBits: 0x0100,
						maskBits: 0xffff
					},
					shape: {
						type: 'circle'
					}
				}]
			});
	},

	originalStart: function (translate) {
		this._originalStart = translate.clone();
	},

	scoreValue: function (val) {
		if (val !== undefined) {
			this._scoreValue = val;
			return this;
		}

		return this._scoreValue;
	},

	distanceBonus: function (landingPad) {
		var distX = (landingPad._translate.x - this._originalStart.x),
			distY = (landingPad._translate.y - this._originalStart.y),
			dist = Math.sqrt(distX * distX + distY * distY);

		return Math.floor(dist / 10);
	},

	deposit: function (beingCarried, landingPad) {
		if (beingCarried) {
			ige.client.player.dropOrb();
		}

		var distScore = this.distanceBonus(landingPad);

		// Create a score text anim
		new ClientScore('+' + this._scoreValue + ' for orb')
			.translateTo(this._translate.x, this._translate.y, 0)
			.mount(ige.client.objectScene)
			.start();

		new ClientScore('+' + distScore + ' for distance')
			.translateTo(this._translate.x, this._translate.y - 30, 0)
			.mount(ige.client.objectScene)
			.start(500);

		new ClientScore('+' + (this._scoreValue + distScore) + ' total')
			.translateTo(this._translate.x, this._translate.y - 15, 0)
			.mount(ige.client.objectScene)
			.start(3000);

		ige.client.player._score += this._scoreValue + distScore;

		this.destroy();
	}
});