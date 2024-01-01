var igeClientConfig = {
	include: [
		/* Your custom game JS scripts */
		'./gameClasses/ClientNetworkEvents.js',
		'./gameClasses/Ship.js',
		'./gameClasses/TurretMouseAim.js',

		/* Models */
		'./models/modelSpaceFrigate6.js',
		'./models/modelTurret.js',

		/* 3d filters */
		'../../engine/components/three/EffectComposer.js',
		'../../engine/components/three/RenderPass.js',
		'../../engine/components/three/ShaderExtras.js',
		'../../engine/components/three/BloomPass.js',
		'../../engine/components/three/FilmPass.js',
		'../../engine/components/three/DotScreenPass.js',
		'../../engine/components/three/TexturePass.js',
		'../../engine/components/three/ShaderPass.js',
		'../../engine/components/three/MaskPass.js',

		/* Standard game scripts */
		'./client.js',
		'./index.js'
	]
};

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = igeClientConfig; }