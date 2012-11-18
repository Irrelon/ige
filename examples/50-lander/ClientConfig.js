var igeClientConfig = {
	include: [
		/* Your custom game JS scripts */
		'./gameClasses/ClientWorld.js',
		'./gameClasses/ClientTerrain.js',
		'./gameClasses/Player.js',
		'./gameClasses/PlayerBehaviour.js',
		'./gameClasses/ThrustParticle.js',
		'./gameClasses/ExplosionParticle.js',
		'./gameClasses/LandingPad.js',
		'./gameClasses/ClientCountDown.js',
		/* Standard game scripts */
		'./client.js',
		'./index.js'
	]
};

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = igeClientConfig; }