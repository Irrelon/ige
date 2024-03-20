interface BasicPoint {
    x: number;
    y: number;
}
interface BasicLine {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
}
interface BasicCircle extends BasicPoint {
    radius: number;
}
interface BasicRect extends BasicPoint {
    width: number;
    height: number;
}
interface BasicPolygon extends BasicPoint {
    _poly: BasicPoint[];
}
export declare function rectToPolygon(rect: BasicRect): BasicPolygon;
export declare function pointIntersectsRect(point: BasicPoint, rect: BasicRect): boolean;
export declare function pointIntersectsCircle(point: BasicPoint, circle: BasicCircle): boolean;
export declare function pointIntersectsPolygon(point: BasicPoint, polygon: BasicPolygon): boolean;
export declare function lineIntersectsLine(line1: BasicLine, line2: BasicLine): boolean;
export declare function lineIntersectsPolygon(line: BasicLine, polygon: BasicPolygon): boolean;
export declare function lineIntersectsCircle(line: BasicLine, circle: BasicCircle): boolean;
export declare function circleIntersectsCircle(circle1: BasicCircle, circle2: BasicCircle): boolean;
export declare function circleIntersectsRect(circle: BasicCircle, rect: BasicRect): boolean;
export declare function circleIntersectsPolygon(circle: BasicCircle, polygon: BasicPolygon): boolean;
export declare function rectIntersectsRect(rect1: BasicRect, rect2: BasicRect): boolean;
export declare function rectIntersectsPolygon(rect: BasicRect, polygon: BasicPolygon): boolean;
export declare function polygonIntersectsPolygon(polygon1: BasicPolygon, polygon2: BasicPolygon): boolean;
export {};
