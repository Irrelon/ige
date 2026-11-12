/**
 * Whether a capped render loop draws now (IgeEngine.maxRenderRate): always
 * uncapped (0), else once at least a frame's time (less a little slack, so
 * 60 Hz ticks land on 20 fps evenly) has passed since the last draw.
 */
export function renderDue (maxRate: number, lastAt: number, now: number): boolean {
	return !maxRate || now - lastAt >= 1000 / maxRate - 2;
}
