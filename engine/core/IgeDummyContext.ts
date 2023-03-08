export const undefinedMethod = () => {
};

export const nullMethod = () => {
	return null;
};

class IgeDummyContext {
	dummy = true;
	imageSmoothingEnabled = false;
	globalAlpha = 1;
	fillStyle: CanvasRenderingContext2D["fillStyle"] = "";
	globalCompositeOperation?: string;
	save = undefinedMethod;
	restore = undefinedMethod;
	translate = undefinedMethod;
	rotate = undefinedMethod;
	scale = undefinedMethod;
	drawImage = undefinedMethod;
	fillRect = undefinedMethod;
	strokeRect = undefinedMethod;
	stroke = undefinedMethod;
	fill = undefinedMethod;
	rect = undefinedMethod;
	moveTo = undefinedMethod;
	lineTo = undefinedMethod;
	arc = undefinedMethod;
	clearRect = undefinedMethod;
	beginPath = undefinedMethod;
	clip = undefinedMethod;
	transform = undefinedMethod;
	setTransform = undefinedMethod;
	fillText = undefinedMethod;
	createImageData = undefinedMethod;
	createPattern = nullMethod;
	getImageData = undefinedMethod;
	putImageData = undefinedMethod;
}

export default IgeDummyContext;
