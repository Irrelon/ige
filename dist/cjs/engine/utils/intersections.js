"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.polygonIntersectsPolygon = exports.rectIntersectsPolygon = exports.rectIntersectsRect = exports.circleIntersectsPolygon = exports.circleIntersectsRect = exports.circleIntersectsCircle = exports.lineIntersectsCircle = exports.lineIntersectsPolygon = exports.lineIntersectsLine = exports.pointIntersectsPolygon = exports.pointIntersectsCircle = exports.pointIntersectsRect = exports.rectToPolygon = void 0;
const maths_1 = require("./maths.js");
function rectToPolygon(rect) {
    var _a, _b;
    const rectW2 = rect.width * (((_a = rect._origin) === null || _a === void 0 ? void 0 : _a.x) || 0);
    const rectH2 = rect.height * (((_b = rect._origin) === null || _b === void 0 ? void 0 : _b.y) || 0);
    return {
        x: rect.x,
        y: rect.y,
        _poly: [
            { x: rect.x - rectW2, y: rect.y - rectH2 },
            { x: rect.x + rectW2, y: rect.y - rectH2 },
            { x: rect.x + rectW2, y: rect.y + rectH2 },
            { x: rect.x - rectW2, y: rect.y + rectH2 }
        ]
    };
}
exports.rectToPolygon = rectToPolygon;
//////////////////////////////////////////////////////////////////////
// Source is point
//////////////////////////////////////////////////////////////////////
function pointIntersectsRect(point, rect) {
    var _a, _b;
    const rectOriginX = rect.width * (((_a = rect._origin) === null || _a === void 0 ? void 0 : _a.x) || 0);
    const rectOriginY = rect.height * (((_b = rect._origin) === null || _b === void 0 ? void 0 : _b.y) || 0);
    const rectLeft = rect.x - rectOriginX;
    const rectRight = rect.x + rect.width - rectOriginX;
    const rectTop = rect.y - rectOriginY;
    const rectBottom = rect.y + rect.height - rectOriginY;
    return (point.x >= rectLeft &&
        point.x <= rectRight &&
        point.y >= rectTop &&
        point.y <= rectBottom);
}
exports.pointIntersectsRect = pointIntersectsRect;
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
    var _a, _b;
    if (pointIntersectsRect(circle, rect))
        return true;
    // Calculate the half-width and half-height of the rectangle
    const halfWidth = rect.width * (((_a = rect._origin) === null || _a === void 0 ? void 0 : _a.x) || 0);
    const halfHeight = rect.height * (((_b = rect._origin) === null || _b === void 0 ? void 0 : _b.y) || 0);
    // Calculate the center coordinates of the rectangle
    const rectCenterX = rect.x;
    const rectCenterY = rect.y;
    // Calculate the closest point on the rectangle to the circle
    const closestX = Math.max(rectCenterX - halfWidth, Math.min(circle.x, rectCenterX + halfWidth));
    const closestY = Math.max(rectCenterY - halfHeight, Math.min(circle.y, rectCenterY + halfHeight));
    // Calculate the distance between the closest point and the circle center
    const distanceX = circle.x - closestX;
    const distanceY = circle.y - closestY;
    const distanceSquared = distanceX * distanceX + distanceY * distanceY;
    // Check if the distance is less than or equal to the square of the circle's radius
    return distanceSquared <= circle.radius * circle.radius;
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
    var _a, _b, _c, _d;
    if (!rect1 || !rect2) {
        return false;
    }
    const sX1 = rect1.x - (rect1.width * (((_a = rect1._origin) === null || _a === void 0 ? void 0 : _a.x) || 0)), sY1 = rect1.y - (rect1.height * (((_b = rect1._origin) === null || _b === void 0 ? void 0 : _b.x) || 0)), sW = rect1.width, sH = rect1.height, dX1 = rect2.x - (rect2.width * (((_c = rect2._origin) === null || _c === void 0 ? void 0 : _c.x) || 0)), dY1 = rect2.y - (rect2.height * (((_d = rect2._origin) === null || _d === void 0 ? void 0 : _d.x) || 0)), dW = rect2.width, dH = rect2.height, sX2 = sX1 + sW, sY2 = sY1 + sH, dX2 = dX1 + dW, dY2 = dY1 + dH;
    return sX1 < dX2 && sX2 > dX1 && sY1 < dY2 && sY2 > dY1;
}
exports.rectIntersectsRect = rectIntersectsRect;
function rectIntersectsPolygon(rect, polygon) {
    return polygonIntersectsPolygon(rectToPolygon(rect), polygon);
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
