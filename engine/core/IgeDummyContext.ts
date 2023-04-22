export const undefinedMethod = () => {
};

export const nullMethod = (): null => {
	return null;
};

export class IgeDummyContext {
	dummy = true;
	imageSmoothingEnabled = false;
	globalAlpha = 1;
	fillStyle: CanvasRenderingContext2D["fillStyle"] = "";
	strokeStyle?: CanvasRenderingContext2D["strokeStyle"] = "";
	shadowColor?: CanvasRenderingContext2D["shadowColor"] = "";
	shadowBlur?: CanvasRenderingContext2D["shadowBlur"] = 0;
	shadowOffsetX?: CanvasRenderingContext2D["shadowOffsetX"] = 0;
	shadowOffsetY?: CanvasRenderingContext2D["shadowOffsetY"] = 0;
	lineWidth?: CanvasRenderingContext2D["lineWidth"] = 1;
	textAlign?: CanvasRenderingContext2D["textAlign"] = "left";
	textBaseline?: CanvasRenderingContext2D["textBaseline"] = "middle";
	font?: CanvasRenderingContext2D["font"];
	globalCompositeOperation?: string;
	lineCap?: CanvasRenderingContext2D["lineCap"] = "square";
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
	arcTo = undefinedMethod;
	clearRect = undefinedMethod;
	beginPath = undefinedMethod;
	closePath = undefinedMethod;
	clip = undefinedMethod;
	transform = undefinedMethod;
	setTransform = undefinedMethod;
	fillText = undefinedMethod;
	createImageData = undefinedMethod;
	createPattern = nullMethod;
	getImageData = undefinedMethod;
	putImageData = undefinedMethod;
	strokeText = undefinedMethod;
	createLinearGradient = undefinedMethod;
	measureText = () => ({width: 0, height: 0});
}
