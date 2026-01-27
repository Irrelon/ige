import { IgeMatrix4 } from "../engine/core/IgeMatrix4.js"
import { IgePoint3d } from "../engine/core/IgePoint3d.js"
/**
 * Coordinate system verification tests.
 *
 * IGE uses a right-handed coordinate system:
 *   +X = right
 *   +Y = up
 *   +Z = toward viewer (out of screen)
 *
 * Matrices are stored column-major (WebGL/OpenGL convention).
 */
describe("Coordinate System", () => {
    describe("lookAt basis vectors (right-handed)", () => {
        it("produces correct basis vectors for camera on +Z axis", () => {
            const m = new IgeMatrix4();
            m.lookAt(new IgePoint3d(0, 0, 5), new IgePoint3d(0, 0, 0), new IgePoint3d(0, 1, 0));
            // Column-major layout of view matrix:
            //   Column 0: [Right.x, Up.x, Fwd.x, 0]
            //   Column 1: [Right.y, Up.y, Fwd.y, 0]
            //   Column 2: [Right.z, Up.z, Fwd.z, 0]
            //   Column 3: [-dot(R,eye), -dot(U,eye), -dot(F,eye), 1]
            //
            // Row 0 across columns = Right vector:  m[0], m[4], m[8]
            // Row 1 across columns = Up vector:     m[1], m[5], m[9]
            // Row 2 across columns = Forward vector: m[2], m[6], m[10]
            //   (Forward = normalize(eye - target), points toward eye)
            // Right vector should be +X
            expect(m.matrix[0]).toBeCloseTo(1, 5);
            expect(m.matrix[4]).toBeCloseTo(0, 5);
            expect(m.matrix[8]).toBeCloseTo(0, 5);
            // Up vector should be +Y
            expect(m.matrix[1]).toBeCloseTo(0, 5);
            expect(m.matrix[5]).toBeCloseTo(1, 5);
            expect(m.matrix[9]).toBeCloseTo(0, 5);
            // Forward vector should be +Z (eye - target = (0,0,5) normalized = (0,0,1))
            expect(m.matrix[2]).toBeCloseTo(0, 5);
            expect(m.matrix[6]).toBeCloseTo(0, 5);
            expect(m.matrix[10]).toBeCloseTo(1, 5);
        });
        it("transforms origin to (0, 0, -distance) in view space", () => {
            const m = new IgeMatrix4();
            m.lookAt(new IgePoint3d(0, 0, 5), new IgePoint3d(0, 0, 0), new IgePoint3d(0, 1, 0));
            const origin = new IgePoint3d(0, 0, 0);
            m.transformPoint(origin);
            // Origin should be at -5 on the Z axis in view space
            // (objects in front of camera have negative Z in view space)
            expect(origin.x).toBeCloseTo(0, 5);
            expect(origin.y).toBeCloseTo(0, 5);
            expect(origin.z).toBeCloseTo(-5, 5);
        });
        it("preserves right-handedness for off-axis camera", () => {
            const m = new IgeMatrix4();
            m.lookAt(new IgePoint3d(10, 10, 10), new IgePoint3d(0, 0, 0), new IgePoint3d(0, 1, 0));
            // Extract basis vectors from view matrix rows
            const right = new IgePoint3d(m.matrix[0], m.matrix[4], m.matrix[8]);
            const up = new IgePoint3d(m.matrix[1], m.matrix[5], m.matrix[9]);
            const forward = new IgePoint3d(m.matrix[2], m.matrix[6], m.matrix[10]);
            // Right-hand rule: right × up should equal forward
            // (cross product of rows 0 and 1 should give row 2)
            const cross = new IgePoint3d(right.y * up.z - right.z * up.y, right.z * up.x - right.x * up.z, right.x * up.y - right.y * up.x);
            expect(cross.x).toBeCloseTo(forward.x, 4);
            expect(cross.y).toBeCloseTo(forward.y, 4);
            expect(cross.z).toBeCloseTo(forward.z, 4);
        });
    });
    describe("orthographic projection mapping", () => {
        it("maps +X world to +X NDC", () => {
            const proj = new IgeMatrix4();
            proj.orthographic(-100, 100, -100, 100, -100, 100);
            const point = new IgePoint3d(50, 0, 0);
            proj.transformPoint(point);
            // World (50,0,0) with view range [-100,100] should map to NDC (0.5, 0, 0)
            expect(point.x).toBeCloseTo(0.5, 5);
            expect(point.y).toBeCloseTo(0, 5);
        });
        it("maps +Y world to +Y NDC", () => {
            const proj = new IgeMatrix4();
            proj.orthographic(-100, 100, -100, 100, -100, 100);
            const point = new IgePoint3d(0, 50, 0);
            proj.transformPoint(point);
            // World (0,50,0) should map to NDC (0, 0.5, 0)
            expect(point.x).toBeCloseTo(0, 5);
            expect(point.y).toBeCloseTo(0.5, 5);
        });
        it("maps corners correctly", () => {
            const proj = new IgeMatrix4();
            proj.orthographic(-10, 10, -10, 10, -10, 10);
            // Left edge -> NDC -1
            const left = new IgePoint3d(-10, 0, 0);
            proj.transformPoint(left);
            expect(left.x).toBeCloseTo(-1, 5);
            // Right edge -> NDC +1
            const right = new IgePoint3d(10, 0, 0);
            proj.transformPoint(right);
            expect(right.x).toBeCloseTo(1, 5);
            // Bottom edge -> NDC -1
            const bottom = new IgePoint3d(0, -10, 0);
            proj.transformPoint(bottom);
            expect(bottom.y).toBeCloseTo(-1, 5);
            // Top edge -> NDC +1
            const top = new IgePoint3d(0, 10, 0);
            proj.transformPoint(top);
            expect(top.y).toBeCloseTo(1, 5);
        });
    });
    describe("full MVP pipeline", () => {
        it("maps world point through view and projection to correct NDC", () => {
            // Camera at (0,0,10) looking at origin, orthographic view
            const view = new IgeMatrix4();
            view.lookAt(new IgePoint3d(0, 0, 10), new IgePoint3d(0, 0, 0), new IgePoint3d(0, 1, 0));
            const proj = new IgeMatrix4();
            proj.orthographic(-10, 10, -10, 10, 0.1, 100);
            // Combined: MVP = proj * view
            const mvp = proj.clone();
            mvp.multiply(view);
            // World point at (5, 3, 0)
            const point = new IgePoint3d(5, 3, 0);
            mvp.transformPoint(point);
            // Expected NDC:
            //   x: 5 / 10 = 0.5  (5 units right out of 10 half-width)
            //   y: 3 / 10 = 0.3  (3 units up out of 10 half-height)
            expect(point.x).toBeCloseTo(0.5, 3);
            expect(point.y).toBeCloseTo(0.3, 3);
        });
        it("+X in world maps to right on screen", () => {
            const view = new IgeMatrix4();
            view.lookAt(new IgePoint3d(0, 0, 10), new IgePoint3d(0, 0, 0), new IgePoint3d(0, 1, 0));
            const proj = new IgeMatrix4();
            proj.orthographic(-10, 10, -10, 10, 0.1, 100);
            const mvp = proj.clone();
            mvp.multiply(view);
            const pointLeft = new IgePoint3d(-5, 0, 0);
            const pointRight = new IgePoint3d(5, 0, 0);
            mvp.transformPoint(pointLeft);
            mvp.transformPoint(pointRight);
            // +X world should have higher NDC x (further right)
            expect(pointRight.x).toBeGreaterThan(pointLeft.x);
        });
        it("+Y in world maps to up on screen (higher NDC y)", () => {
            const view = new IgeMatrix4();
            view.lookAt(new IgePoint3d(0, 0, 10), new IgePoint3d(0, 0, 0), new IgePoint3d(0, 1, 0));
            const proj = new IgeMatrix4();
            proj.orthographic(-10, 10, -10, 10, 0.1, 100);
            const mvp = proj.clone();
            mvp.multiply(view);
            const pointDown = new IgePoint3d(0, -5, 0);
            const pointUp = new IgePoint3d(0, 5, 0);
            mvp.transformPoint(pointDown);
            mvp.transformPoint(pointUp);
            // +Y world should have higher NDC y (up on screen)
            expect(pointUp.y).toBeGreaterThan(pointDown.y);
        });
        it("objects further from camera have more negative Z in view space", () => {
            const view = new IgeMatrix4();
            view.lookAt(new IgePoint3d(0, 0, 10), new IgePoint3d(0, 0, 0), new IgePoint3d(0, 1, 0));
            // Object close to camera (z=5, camera at z=10)
            const near = new IgePoint3d(0, 0, 5);
            view.transformPoint(near);
            // Object far from camera (z=-5, camera at z=10)
            const far = new IgePoint3d(0, 0, -5);
            view.transformPoint(far);
            // Both should have negative view-space Z (in front of camera)
            expect(near.z).toBeLessThan(0);
            expect(far.z).toBeLessThan(0);
            // Far object should have more negative Z
            expect(far.z).toBeLessThan(near.z);
        });
    });
    describe("rotation direction (right-hand rule)", () => {
        it("+X rotation: +Y rotates toward +Z", () => {
            const m = new IgeMatrix4();
            m.rotateXTo(Math.PI / 2);
            const p = new IgePoint3d(0, 1, 0);
            m.transformVector(p);
            expect(p.x).toBeCloseTo(0, 5);
            expect(p.y).toBeCloseTo(0, 5);
            expect(p.z).toBeCloseTo(1, 5);
        });
        it("+Y rotation: +Z rotates toward +X", () => {
            const m = new IgeMatrix4();
            m.rotateYTo(Math.PI / 2);
            const p = new IgePoint3d(0, 0, 1);
            m.transformVector(p);
            expect(p.x).toBeCloseTo(1, 5);
            expect(p.y).toBeCloseTo(0, 5);
            expect(p.z).toBeCloseTo(0, 5);
        });
        it("+Z rotation: +X rotates toward +Y", () => {
            const m = new IgeMatrix4();
            m.rotateZTo(Math.PI / 2);
            const p = new IgePoint3d(1, 0, 0);
            m.transformVector(p);
            expect(p.x).toBeCloseTo(0, 5);
            expect(p.y).toBeCloseTo(1, 5);
            expect(p.z).toBeCloseTo(0, 5);
        });
        it("negative rotation reverses direction", () => {
            // -Z rotation: +X should rotate toward -Y
            const m = new IgeMatrix4();
            m.rotateZTo(-Math.PI / 2);
            const p = new IgePoint3d(1, 0, 0);
            m.transformVector(p);
            expect(p.x).toBeCloseTo(0, 5);
            expect(p.y).toBeCloseTo(-1, 5);
            expect(p.z).toBeCloseTo(0, 5);
        });
    });
    describe("perspective projection", () => {
        it("preserves +X right, +Y up convention", () => {
            const proj = new IgeMatrix4();
            proj.perspective(Math.PI / 4, 1, 0.1, 1000);
            // Point at (1, 0, -5): to the right, at z=-5 (in front of camera in view space)
            const right = new IgePoint3d(1, 0, -5);
            proj.transformPoint(right);
            // Point at (-1, 0, -5): to the left
            const left = new IgePoint3d(-1, 0, -5);
            proj.transformPoint(left);
            // Right should have higher x in NDC
            expect(right.x).toBeGreaterThan(left.x);
            // Point above should have higher y in NDC
            const up = new IgePoint3d(0, 1, -5);
            proj.transformPoint(up);
            const down = new IgePoint3d(0, -1, -5);
            proj.transformPoint(down);
            expect(up.y).toBeGreaterThan(down.y);
        });
        it("has correct perspective divide (w = -z for standard projection)", () => {
            const proj = new IgeMatrix4();
            proj.perspective(Math.PI / 4, 1, 0.1, 1000);
            // m[11] should be -1 for standard perspective (w' = -z)
            expect(proj.matrix[11]).toBe(-1);
            expect(proj.matrix[15]).toBe(0);
        });
    });
    describe("isometric projection formula (IgePoint3d.toIso)", () => {
        it("maps +X world to screen-right", () => {
            const p = new IgePoint3d(1, 0, 0);
            const iso = p.toIso();
            // toIso: (x - y, -z * 1.2247 + (x + y) * 0.5)
            expect(iso.x).toBe(1); // x - y = 1 - 0 = 1 (positive = right)
            expect(iso.y).toBeCloseTo(0.5, 4); // (1+0)*0.5 = 0.5
        });
        it("maps +Y world to screen-left", () => {
            const p = new IgePoint3d(0, 1, 0);
            const iso = p.toIso();
            expect(iso.x).toBe(-1); // x - y = 0 - 1 = -1 (negative = left)
            expect(iso.y).toBeCloseTo(0.5, 4); // (0+1)*0.5 = 0.5
        });
        it("maps +Z world to screen-up (negative screen-Y in Y-down canvas)", () => {
            const p = new IgePoint3d(0, 0, 1);
            const iso = p.toIso();
            expect(iso.x).toBe(0);
            // -1 * 1.2247 + 0 = -1.2247 (negative = up in Y-down screen space)
            expect(iso.y).toBeCloseTo(-1.2247, 3);
        });
        it("is consistent: X and Y both move screen-down equally", () => {
            const px = new IgePoint3d(1, 0, 0).toIso();
            const py = new IgePoint3d(0, 1, 0).toIso();
            // Both +X and +Y world should produce the same screen-Y offset
            expect(px.y).toBeCloseTo(py.y, 5);
        });
    });
    describe("NDC to screen coordinate mapping", () => {
        /**
         * Standard WebGL NDC to screen mapping:
         *   screenX = (ndc.x + 1) / 2 * canvasWidth
         *   screenY = (1 - ndc.y) / 2 * canvasHeight  (flip Y: NDC +Y is up, screen +Y is down)
         */
        function ndcToScreen(ndcX, ndcY, width, height) {
            return {
                x: (ndcX + 1) / 2 * width,
                y: (1 - ndcY) / 2 * height
            };
        }
        it("NDC (0,0) maps to screen center", () => {
            const screen = ndcToScreen(0, 0, 400, 400);
            expect(screen.x).toBe(200);
            expect(screen.y).toBe(200);
        });
        it("NDC (+1,+1) maps to top-right (screen top-right)", () => {
            const screen = ndcToScreen(1, 1, 400, 400);
            expect(screen.x).toBe(400);
            expect(screen.y).toBe(0); // Top of screen in DOM coordinates
        });
        it("NDC (-1,-1) maps to bottom-left (screen bottom-left)", () => {
            const screen = ndcToScreen(-1, -1, 400, 400);
            expect(screen.x).toBe(0);
            expect(screen.y).toBe(400); // Bottom of screen in DOM coordinates
        });
        it("positive world Y -> lower screen Y (higher on screen)", () => {
            // Camera at (0,0,10) looking at origin, ortho [-200,200]
            const view = new IgeMatrix4();
            view.lookAt(new IgePoint3d(0, 0, 10), new IgePoint3d(0, 0, 0), new IgePoint3d(0, 1, 0));
            const proj = new IgeMatrix4();
            proj.orthographic(-200, 200, -200, 200, 0.1, 100);
            const mvp = proj.clone();
            mvp.multiply(view);
            // Point at world Y=+80
            const point = new IgePoint3d(0, 80, 0);
            mvp.transformPoint(point);
            const screen = ndcToScreen(point.x, point.y, 400, 400);
            // Y=+80 world should be ABOVE center (screen Y < 200)
            expect(screen.y).toBeLessThan(200);
            expect(screen.x).toBeCloseTo(200, 0); // centered horizontally
        });
    });
});
