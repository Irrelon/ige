var config = {
	include: [
		{name: 'ServerNetworkEvents', path: './gameClasses/ServerNetworkEvents'},
		{name: 'Character', path: './gameClasses/Character'},
		{name: 'CharacterContainer', path: './gameClasses/CharacterContainer'},
		{name: 'PlayerComponent', path: './gameClasses/PlayerComponent'}
	]
};

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = config; }