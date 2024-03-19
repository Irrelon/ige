"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.polygonIntersectsPolygon = exports.rectIntersectsPolygon = exports.rectIntersectsRect = exports.circleIntersectsPolygon = exports.circleIntersectsRect = exports.circleIntersectsCircle = exports.lineIntersectsCircle = exports.lineIntersectsPolygon = exports.lineIntersectsLine = exports.pointIntersectsPolygon = exports.pointIntersectsCircle = void 0;
const maths_1 = require("./maths.js");
//////////////////////////////////////////////////////////////////////
// Source is point
//////////////////////////////////////////////////////////////////////
function pointIntersectsCircle(point, circle) {
    const dist = (0, maths_1.distance)(circle.x, circle.y, point.x, point.y);
    return dist < circle.radius;
}
exports.pointIntersectsCircle = pointIntersectsCircle;
function pointIntersectsPolygon(point, polygon) {
    const polyPoints = polygon._poly;
    const pointCount = polyPoints.length;
    let oldPointIndex = pointCount - 1;
    let c = false;
    for (let pointIndex = 0; pointIndex < pointCount; oldPointIndex = pointIndex++) {
        if (polyPoints[pointIndex].y > point.y !== polyPoints[oldPointIndex].y > point.y
            && point.x < ((polyPoints[oldPointIndex].x - polyPoints[pointIndex].x) * (point.y - polyPoints[pointIndex].y)) / (polyPoints[oldPointIndex].y - polyPoints[pointIndex].y) + polyPoints[pointIndex].x) {
            c = !c;
        }
    }
    return c;
}
exports.pointIntersectsPolygon = pointIntersectsPolygon;
//////////////////////////////////////////////////////////////////////
// Source is line
//////////////////////////////////////////////////////////////////////
function lineIntersectsLine(line1, line2) {
    // Calculate the direction vectors
    const dx1 = line1.x2 - line1.x1;
    const dy1 = line1.y2 - line1.y1;
    const dx2 = line2.x2 - line2.x1;
    const dy2 = line2.y2 - line2.y1;
    // Calculate the determinants
    const determinant = dx1 * dy2 - dy1 * dx2;
    const delta_x_13 = line1.x1 - line2.x1;
    const delta_y_13 = line1.y1 - line2.y1;
    // Check if the lines are parallel or coincident
    if (determinant === 0) {
        return false;
    }
    // Calculate the parameters for the intersection point
    const s = (delta_x_13 * dy2 - delta_y_13 * dx2) / determinant;
    const t = (delta_x_13 * dy1 - delta_y_13 * dx1) / determinant;
    // Check if the intersection point lies within the line segments
    return (s >= 0 && s <= 1 && t >= 0 && t <= 1);
}
exports.lineIntersectsLine = lineIntersectsLine;
function lineIntersectsPolygon(line, polygon) {
    const numVertices = polygon._poly.length;
    // Iterate through each edge of the polygon
    for (let i = 0; i < numVertices; i++) {
        const vertex1 = polygon._poly[i];
        const vertex2 = polygon._poly[(i + 1) % numVertices];
        // Check if the edge intersects the line
        if (lineIntersectsLine({ x1: vertex1.x, y1: vertex1.y, x2: vertex2.x, y2: vertex2.y }, line)) {
            return true;
        }
    }
    return false;
}
exports.lineIntersectsPolygon = lineIntersectsPolygon;
function lineIntersectsCircle(line, circle) {
    const dx = line.x2 - line.x1;
    const dy = line.y2 - line.y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    const dot = ((circle.x - line.x1) * dx + (circle.y - line.y1) * dy) / (len * len);
    const closestX = line.x1 + dot * dx;
    const closestY = line.y1 + dot * dy;
    if (closestX < Math.min(line.x1, line.x2) || closestX > Math.max(line.x1, line.x2) || closestY < Math.min(line.y1, line.y2) || closestY > Math.max(line.y1, line.y2)) {
        return false;
    }
    const dist = Math.sqrt((closestX - circle.x) * (closestX - circle.x) + (closestY - circle.y) * (closestY - circle.y));
    return dist <= circle.radius;
}
exports.lineIntersectsCircle = lineIntersectsCircle;
//////////////////////////////////////////////////////////////////////
// Source is circle
//////////////////////////////////////////////////////////////////////
function circleIntersectsCircle(circle1, circle2) {
    return (0, maths_1.distance)(circle1.x, circle1.y, circle2.x, circle2.y) < (circle2.radius + circle1.radius);
}
exports.circleIntersectsCircle = circleIntersectsCircle;
function circleIntersectsRect(circle, rect) {
    // Calculate the distance from the circle center to the closest point on the rectangle
    const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.width));
    const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.height));
    // Calculate the distance between the circle center and the closest point on the rectangle
    const distanceX = circle.x - closestX;
    const distanceY = circle.y - closestY;
    const distanceSquared = (distanceX * distanceX) + (distanceY * distanceY);
    // Check if the distance is less than or equal to the radius
    return distanceSquared <= (circle.radius * circle.radius);
}
exports.circleIntersectsRect = circleIntersectsRect;
function circleIntersectsPolygon(circle, polygon) {
    // Check if the circle's center lies inside the polygon
    if (pointIntersectsPolygon(circle, polygon))
        return true;
    // Check if any line segment of the polygon intersects the circle
    for (let i = 0; i < polygon._poly.length; i++) {
        const p1 = polygon._poly[i];
        const p2 = polygon._poly[(i + 1) % polygon._poly.length];
        if (lineIntersectsCircle({
            x1: p1.x, // * polygon._scale.x,
            y1: p1.y, // * polygon._scale.y,
            x2: p2.x, // * polygon._scale.x,
            y2: p2.y // * polygon._scale.y
        }, circle)) {
            return true;
        }
    }
    return false;
}
exports.circleIntersectsPolygon = circleIntersectsPolygon;
//////////////////////////////////////////////////////////////////////
// Source is rect
//////////////////////////////////////////////////////////////////////
function rectIntersectsRect(rect1, rect2) {
    if (!rect1 || !rect2) {
        return false;
    }
    const sX1 = rect1.x, sY1 = rect1.y, sW = rect1.width, sH = rect1.height, dX1 = rect2.x, dY1 = rect2.y, dW = rect2.width, dH = rect2.height, sX2 = sX1 + sW, sY2 = sY1 + sH, dX2 = dX1 + dW, dY2 = dY1 + dH;
    return sX1 < dX2 && sX2 > dX1 && sY1 < dY2 && sY2 > dY1;
}
exports.rectIntersectsRect = rectIntersectsRect;
function rectIntersectsPolygon(rect, polygon) {
    return polygonIntersectsPolygon({
        x: 0, y: 0, _poly: [
            { x: rect.x, y: rect.y },
            { x: rect.x + rect.width, y: rect.y },
            { x: rect.x + rect.width, y: rect.y + rect.height },
            { x: rect.x, y: rect.y + rect.height }
        ]
    }, polygon);
}
exports.rectIntersectsPolygon = rectIntersectsPolygon;
//////////////////////////////////////////////////////////////////////
// Source is polygon
//////////////////////////////////////////////////////////////////////
function polygonIntersectsPolygon(polygon1, polygon2) {
    // Check if any edge of polygon1 intersects with any edge of polygon2
    for (let i = 0; i < polygon1._poly.length; i++) {
        const edge1Vertex1 = polygon1._poly[i];
        const edge1Vertex2 = polygon1._poly[(i + 1) % polygon1._poly.length];
        // Check if any vertex of one polygon is inside the other polygon
        if (pointIntersectsPolygon(polygon1._poly[i], polygon2)) {
            return true;
        }
        for (let j = 0; j < polygon2._poly.length; j++) {
            const edge2Vertex1 = polygon2._poly[j];
            const edge2Vertex2 = polygon2._poly[(j + 1) % polygon2._poly.length];
            // Check if any vertex of one polygon is inside the other polygon
            if (pointIntersectsPolygon(polygon2._poly[j], polygon1)) {
                return true;
            }
            if (lineIntersectsLine({
                x1: edge1Vertex1.x,
                y1: edge1Vertex1.y,
                x2: edge1Vertex2.x,
                y2: edge1Vertex2.y
            }, {
                x1: edge2Vertex1.x,
                y1: edge2Vertex1.y,
                x2: edge2Vertex2.x,
                y2: edge2Vertex2.y
            })) {
                return true;
            }
        }
    }
    return false;
}
exports.polygonIntersectsPolygon = polygonIntersectsPolygon;
