var igeClientConfig = {
	include: [
		/* Your custom game JS scripts */
		'./gameClasses/ClientWorld.js',
		'./gameClasses/ClientTerrain.js',
		'./gameClasses/Orb.js',
		'./gameClasses/Player.js',
		'./gameClasses/PlayerBehaviour.js',
		'./gameClasses/ThrustParticle.js',
		'./gameClasses/ExplosionParticle.js',
		'./gameClasses/LandingPad.js',
		'./gameClasses/ClientCountDown.js',
		'./gameClasses/ClientScore.js',
		/* Standard game scripts */
		'./client.js',
		'./index.js'
	]
};

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = igeClientConfig; }