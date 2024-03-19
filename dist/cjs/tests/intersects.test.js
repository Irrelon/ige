"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const intersections_1 = require("../engine/utils/intersections.js");
describe("polygonIntersectsPolygon", () => {
    test("should detect intersection when polygons intersect", () => {
        const polygon1 = {
            x: 0,
            y: 0,
            _poly: [
                { x: 0, y: 0 },
                { x: 10, y: 0 },
                { x: 10, y: 10 },
                { x: 0, y: 10 }
            ]
        };
        const polygon2 = {
            x: 0,
            y: 0,
            _poly: [
                { x: 5, y: 5 },
                { x: 15, y: 5 },
                { x: 15, y: 15 },
                { x: 5, y: 15 }
            ]
        };
        expect((0, intersections_1.polygonIntersectsPolygon)(polygon1, polygon2)).toBe(true);
    });
    test("should not detect intersection when polygons do not intersect", () => {
        const polygon1 = {
            x: 0,
            y: 0,
            _poly: [
                { x: 0, y: 0 },
                { x: 10, y: 0 },
                { x: 10, y: 10 },
                { x: 0, y: 10 }
            ]
        };
        const polygon2 = {
            x: 0,
            y: 0,
            _poly: [
                { x: 15, y: 15 },
                { x: 25, y: 15 },
                { x: 25, y: 25 },
                { x: 15, y: 25 }
            ]
        };
        expect((0, intersections_1.polygonIntersectsPolygon)(polygon1, polygon2)).toBe(false);
    });
    test("should detect intersection when one polygon contains the other", () => {
        const polygon1 = {
            x: 0,
            y: 0,
            _poly: [
                { x: 0, y: 0 },
                { x: 10, y: 0 },
                { x: 10, y: 10 },
                { x: 0, y: 10 }
            ]
        };
        const polygon2 = {
            x: 0,
            y: 0,
            _poly: [
                { x: 2, y: 2 },
                { x: 8, y: 2 },
                { x: 8, y: 8 },
                { x: 2, y: 8 }
            ]
        };
        expect((0, intersections_1.polygonIntersectsPolygon)(polygon1, polygon2)).toBe(true);
    });
});
