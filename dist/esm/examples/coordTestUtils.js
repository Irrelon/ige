/**
 * Check if a pixel at (x, y) in the given pixel buffer matches the expected color.
 * @param pixels Raw pixel buffer from gl.readPixels (bottom-left origin) or getImageData
 * @param x Screen X (0 = left)
 * @param y Screen Y (0 = top, DOM convention)
 * @param canvasWidth Canvas width in pixels
 * @param canvasHeight Canvas height in pixels
 * @param expectedR Expected red (0-255)
 * @param expectedG Expected green (0-255)
 * @param expectedB Expected blue (0-255)
 * @param tolerance Per-channel tolerance (default 40)
 * @param isWebGl If true, pixel buffer is in WebGL bottom-left origin format
 */
export function assertPixelColor(pixels, x, y, canvasWidth, canvasHeight, expectedR, expectedG, expectedB, tolerance = 40, isWebGl = true) {
    const px = Math.round(x);
    const py = Math.round(y);
    // WebGL readPixels buffer uses bottom-left origin
    const bufferY = isWebGl ? (canvasHeight - py - 1) : py;
    const idx = (bufferY * canvasWidth + px) * 4;
    const actualR = pixels[idx];
    const actualG = pixels[idx + 1];
    const actualB = pixels[idx + 2];
    const rOk = Math.abs(actualR - expectedR) <= tolerance;
    const gOk = Math.abs(actualG - expectedG) <= tolerance;
    const bOk = Math.abs(actualB - expectedB) <= tolerance;
    return {
        name: `pixel(${px},${py})`,
        passed: rOk && gOk && bOk,
        expected: `rgb(${expectedR},${expectedG},${expectedB})`,
        actual: `rgb(${actualR},${actualG},${actualB})`
    };
}
/**
 * Read all pixels from a WebGL context.
 */
export function readAllPixels(gl, width, height) {
    const pixels = new Uint8Array(width * height * 4);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    return pixels;
}
/**
 * Project a world-space point through view and projection matrices to screen coordinates.
 * Returns screen position with (0,0) at top-left (DOM convention).
 */
export function worldToScreen(worldPoint, viewMatrix, projMatrix, canvasWidth, canvasHeight) {
    const mvp = projMatrix.clone();
    mvp.multiply(viewMatrix);
    const p = worldPoint.clone();
    mvp.transformPoint(p);
    // NDC to screen: NDC range [-1,1] maps to [0, canvasSize]
    // Y is flipped: NDC +Y is up, screen +Y is down
    return {
        x: (p.x + 1) / 2 * canvasWidth,
        y: (1 - p.y) / 2 * canvasHeight
    };
}
/**
 * Display test results in a DOM element and log to console.
 */
export function displayResults(results, containerId = "results") {
    // Console log with parseable prefix
    const summary = {
        total: results.length,
        passed: results.filter(r => r.passed).length,
        failed: results.filter(r => !r.passed).length,
        results: results
    };
    console.log("[COORD_TEST_RESULT]", JSON.stringify(summary));
    // DOM display
    const container = document.getElementById(containerId);
    if (!container)
        return;
    const allPassed = summary.failed === 0;
    container.innerHTML = `
		<div style="font-weight:bold;font-size:16px;margin-bottom:8px;color:${allPassed ? "#4f4" : "#f44"}">
			${allPassed ? "ALL PASSED" : `${summary.failed} FAILED`} (${summary.passed}/${summary.total})
		</div>
		<table style="border-collapse:collapse;font-size:12px;width:100%">
			<tr style="border-bottom:1px solid #555">
				<th style="text-align:left;padding:4px">Test</th>
				<th style="text-align:left;padding:4px">Status</th>
				<th style="text-align:left;padding:4px">Expected</th>
				<th style="text-align:left;padding:4px">Actual</th>
			</tr>
			${results.map(r => `
				<tr style="border-bottom:1px solid #333;color:${r.passed ? "#8f8" : "#f88"}">
					<td style="padding:4px">${r.name}</td>
					<td style="padding:4px">${r.passed ? "PASS" : "FAIL"}</td>
					<td style="padding:4px">${r.expected}</td>
					<td style="padding:4px">${r.actual}</td>
				</tr>
			`).join("")}
		</table>
	`;
}
