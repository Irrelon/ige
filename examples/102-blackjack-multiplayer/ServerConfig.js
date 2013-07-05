var igeConfig = {
	include: [
		{name: 'ServerNetworkEvents', path: './gameClasses/ServerNetworkEvents'},
		{name: 'Card', path: './gameClasses/Card'},
		{name: 'Player', path: './gameClasses/Player'},
		{name: 'Seat', path: './gameClasses/Seat'},
		{name: 'BlackJackBackground', path: './gameClasses/BlackJackBackground'},
		{name: 'BlackJackTable', path: './gameClasses/BlackJackTable'},
		{name: 'Casino', path: './gameClasses/Casino'},
		
		{name: 'Scene', path: './gameClasses/Scene'}
	]
};

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = igeConfig; }