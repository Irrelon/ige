var igeConfig = {
	include: [
		{name: 'ServerNetworkEvents', path: './gameClasses/ServerNetworkEvents'},
		{name: 'Seat', path: './gameClasses/Seat'},
		{name: 'BlackJackTable', path: './gameClasses/BlackJackTable'},
		{name: 'Player', path: './gameClasses/Player'},
		{name: 'Casino', path: './gameClasses/Casino'}
	]
};

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = igeConfig; }