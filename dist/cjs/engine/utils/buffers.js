"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMultipleOf = exports.bufferRangeData = exports.createTextureFromImage = exports.vertexBufferLayoutByFormat = exports.packArraysByFormat = void 0;
function packArraysByFormat(format, ...dataArgs) {
    // Format is in the structure of array indexes of the passed
    // dataArgs e.g. [x, y, r, g, b, a, u, v] would be expressed
    // by a call to packBuffers(
    // 	 [0, 0, 1, 1, 1, 1, 2, 2], vertexData, colorData, uvData
    // );
    // So take two from vertexData, four from colorData then two from uvData
    // then start again until all data has been depleted
    const indexTracking = new Array(dataArgs.length).fill(0);
    const data = [];
    while (dataArgs[0][indexTracking[0]] !== undefined) {
        const row = format.map((dataArgIndex) => {
            const dataValue = dataArgs[dataArgIndex][indexTracking[dataArgIndex]];
            indexTracking[dataArgIndex]++;
            return dataValue;
        });
        data.push(...row);
    }
    return data;
}
exports.packArraysByFormat = packArraysByFormat;
function vertexBufferLayoutByFormat(format) {
    const shaderLocationRanges = [];
    format.forEach((shaderLocationIndex, formatIndex) => {
        if (shaderLocationRanges[shaderLocationIndex]) {
            shaderLocationRanges[shaderLocationIndex].count++;
        }
        else {
            shaderLocationRanges[shaderLocationIndex] = shaderLocationRanges[shaderLocationIndex] || {
                startIndex: formatIndex,
                count: 1
            };
        }
    });
    /**
     * Generate attribute entries like:
     * [
     * 	{
     * 		shaderLocation: 0,
     * 		offset: 0,
     * 		format: "float32x2" // 2 floats
     * 	},
     * 	{
     * 		shaderLocation: 1,
     * 		offset: 2 * Float32Array.BYTES_PER_ELEMENT,
     * 		format: "float32x4" // 4 floats
     * 	},
     * 	{
     * 		shaderLocation: 2,
     * 		offset: 6 * Float32Array.BYTES_PER_ELEMENT,
     * 		format: "float32x2" // 2 floats
     * 	}
     * ]
     */
    const attributes = shaderLocationRanges.reduce((attrArr, { startIndex, count }, locationIndex) => {
        const previousCount = locationIndex > 0 ? shaderLocationRanges[locationIndex - 1].count : 0;
        const previousStartIndex = locationIndex > 0 ? shaderLocationRanges[locationIndex - 1].startIndex : 0;
        const attr = {
            shaderLocation: locationIndex,
            offset: (previousStartIndex + previousCount) * Float32Array.BYTES_PER_ELEMENT,
            format: `float32x${count}` // 2 floats
        };
        attrArr.push(attr);
        return attrArr;
    }, []);
    const layout = {
        arrayStride: format.length * Float32Array.BYTES_PER_ELEMENT, // floats length * 4 bytes per float
        attributes,
        stepMode: "vertex"
    };
    return layout;
}
exports.vertexBufferLayoutByFormat = vertexBufferLayoutByFormat;
function createTextureFromImage(device, image) {
    return __awaiter(this, void 0, void 0, function* () {
        const texture = device.createTexture({
            size: { width: image.width, height: image.height },
            format: "rgba8unorm",
            usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT
        });
        const data = yield createImageBitmap(image);
        device.queue.copyExternalImageToTexture({ source: data }, { texture: texture }, { width: image.width, height: image.height });
        const sampler = device.createSampler({
            magFilter: "linear",
            minFilter: "linear"
        });
        return [texture, sampler];
    });
}
exports.createTextureFromImage = createTextureFromImage;
const bufferRangeData = (bytesPerItem, ...numberOfItems) => {
    const ranges = [];
    let length = 0;
    numberOfItems.forEach((item, itemIndex) => {
        ranges[itemIndex] = [length, length + item];
        length += item;
    });
    return { byteLength: length * bytesPerItem, length, ranges };
};
exports.bufferRangeData = bufferRangeData;
const getMultipleOf = (targetMultiple, currentVal) => {
    const multiplier = Math.ceil(currentVal / targetMultiple);
    return targetMultiple * multiplier;
};
exports.getMultipleOf = getMultipleOf;
