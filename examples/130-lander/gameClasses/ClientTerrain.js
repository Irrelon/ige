var ClientTerrain = {
	createTerrain: function () {
		// Create starting landing pad
		this.landingPads = [];
		this.landingPads.push(new LandingPad()
			.mount(ige.client.objectScene));
	}
};