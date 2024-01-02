"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeDummyContext = exports.nullMethod = exports.undefinedMethod = void 0;
const undefinedMethod = () => {};
exports.undefinedMethod = undefinedMethod;
const nullMethod = () => {
	return null;
};
exports.nullMethod = nullMethod;
class IgeDummyContext {
	constructor() {
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
		this.save = exports.undefinedMethod;
		this.restore = exports.undefinedMethod;
		this.translate = exports.undefinedMethod;
		this.rotate = exports.undefinedMethod;
		this.scale = exports.undefinedMethod;
		this.drawImage = exports.undefinedMethod;
		this.fillRect = exports.undefinedMethod;
		this.strokeRect = exports.undefinedMethod;
		this.stroke = exports.undefinedMethod;
		this.fill = exports.undefinedMethod;
		this.rect = exports.undefinedMethod;
		this.moveTo = exports.undefinedMethod;
		this.lineTo = exports.undefinedMethod;
		this.arc = exports.undefinedMethod;
		this.arcTo = exports.undefinedMethod;
		this.clearRect = exports.undefinedMethod;
		this.beginPath = exports.undefinedMethod;
		this.closePath = exports.undefinedMethod;
		this.clip = exports.undefinedMethod;
		this.transform = exports.undefinedMethod;
		this.setTransform = exports.undefinedMethod;
		this.fillText = exports.undefinedMethod;
		this.createImageData = exports.undefinedMethod;
		this.createPattern = exports.nullMethod;
		this.getImageData = exports.undefinedMethod;
		this.putImageData = exports.undefinedMethod;
		this.strokeText = exports.undefinedMethod;
		this.createLinearGradient = exports.undefinedMethod;
		this.measureText = () => ({ width: 0, height: 0 });
	}
}
exports.IgeDummyContext = IgeDummyContext;
