var nullMethod = function () {},
	IgeDummyContext = {
		dummy: true,
		save: nullMethod,
		restore: nullMethod,
		translate: nullMethod,
		rotate: nullMethod,
		scale: nullMethod,
		drawImage: nullMethod,
		fillRect: nullMethod,
		strokeRect: nullMethod,
		stroke: nullMethod,
		fill: nullMethod,
		rect: nullMethod,
		moveTo: nullMethod,
		lineTo: nullMethod,
		arc: nullMethod,
		clearRect: nullMethod,
		beginPath: nullMethod,
		clip: nullMethod,
		transform: nullMethod,
		setTransform: nullMethod,
		fillText: nullMethod
	};

if (typeof(module) !== 'undefined' && typeof(module.exports) !== 'undefined') { module.exports = IgeDummyContext; }