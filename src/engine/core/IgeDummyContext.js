export const undefinedMethod = () => {};
export const nullMethod = () => {
	return null;
};
export class IgeDummyContext {
	constructor () {
		this.dummy = true;
		this.imageSmoothingEnabled = false;
		this.globalAlpha = 1;
		this.fillStyle = "";
		this.strokeStyle = "";
		this.shadowColor = "";
		this.shadowBlur = 0;
		this.shadowOffsetX = 0;
		this.shadowOffsetY = 0;
		this.lineWidth = 1;
		this.textAlign = "left";
		this.textBaseline = "middle";
		this.lineCap = "square";
		this.save = undefinedMethod;
		this.restore = undefinedMethod;
		this.translate = undefinedMethod;
		this.rotate = undefinedMethod;
		this.scale = undefinedMethod;
		this.drawImage = undefinedMethod;
		this.fillRect = undefinedMethod;
		this.strokeRect = undefinedMethod;
		this.stroke = undefinedMethod;
		this.fill = undefinedMethod;
		this.rect = undefinedMethod;
		this.moveTo = undefinedMethod;
		this.lineTo = undefinedMethod;
		this.arc = undefinedMethod;
		this.arcTo = undefinedMethod;
		this.clearRect = undefinedMethod;
		this.beginPath = undefinedMethod;
		this.closePath = undefinedMethod;
		this.clip = undefinedMethod;
		this.transform = undefinedMethod;
		this.setTransform = undefinedMethod;
		this.fillText = undefinedMethod;
		this.createImageData = undefinedMethod;
		this.createPattern = nullMethod;
		this.getImageData = undefinedMethod;
		this.putImageData = undefinedMethod;
		this.strokeText = undefinedMethod;
		this.createLinearGradient = undefinedMethod;
		this.measureText = () => ({ width: 0, height: 0 });
	}
}
