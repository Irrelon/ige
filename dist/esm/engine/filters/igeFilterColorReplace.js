import { igeFilters } from "../utils/igeFilters.js"
export const igeFilterColorReplace = function (canvas, ctx, originalImage, texture, data) {
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    if (!imgData) {
        texture.log("Failed to get image data from canvas", "warning");
        return;
    }
    const imgDataArr = imgData.data;
    // Iterate through each pixel
    for (let i = 0; i < imgDataArr.length; i += 4) {
        const [r, g, b, a] = [imgDataArr[i], imgDataArr[i + 1], imgDataArr[i + 2], imgDataArr[i + 3]];
        for (let colorIndex = 0; colorIndex < data.length; colorIndex++) {
            const { sourceColor, targetColor } = data[colorIndex];
            // Check if pixel matches the target color
            if (r === sourceColor[0] &&
                g === sourceColor[1] &&
                b === sourceColor[2] &&
                a === sourceColor[3]) {
                // Replace with new color
                imgDataArr[i] = targetColor[0];
                imgDataArr[i + 1] = targetColor[1];
                imgDataArr[i + 2] = targetColor[2];
                imgDataArr[i + 3] = targetColor[3];
            }
        }
    }
    // Put modified data back on canvas
    ctx.putImageData(imgData, 0, 0);
};
igeFilters.registerFilter("igeFilterColorReplace", igeFilterColorReplace);
