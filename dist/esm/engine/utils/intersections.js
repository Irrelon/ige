import { distance } from "./maths.js"
export function rectToPolygon(rect) {
    const rectW2 = rect.width * (rect._origin?.x || 0);
    const rectH2 = rect.height * (rect._origin?.y || 0);
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
//////////////////////////////////////////////////////////////////////
// Source is point
//////////////////////////////////////////////////////////////////////
export function pointIntersectsRect(point, rect) {
    const rectOriginX = rect.width * (rect._origin?.x || 0);
    const rectOriginY = rect.height * (rect._origin?.y || 0);
    const rectLeft = rect.x - rectOriginX;
    const rectRight = rect.x + rect.width - rectOriginX;
    const rectTop = rect.y - rectOriginY;
    const rectBottom = rect.y + rect.height - rectOriginY;
    return (point.x >= rectLeft &&
        point.x <= rectRight &&
        point.y >= rectTop &&
        point.y <= rectBottom);
}
export function pointIntersectsCircle(point, circle) {
    const dist = distance(circle.x, circle.y, point.x, point.y);
    return dist < circle.radius;
}
export function pointIntersectsPolygon(point, polygon) {
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
//////////////////////////////////////////////////////////////////////
// Source is line
//////////////////////////////////////////////////////////////////////
export function lineIntersectsLine(line1, line2) {
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
export function lineIntersectsPolygon(line, polygon) {
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
export function lineIntersectsCircle(line, circle) {
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
//////////////////////////////////////////////////////////////////////
// Source is circle
//////////////////////////////////////////////////////////////////////
export function circleIntersectsCircle(circle1, circle2) {
    return distance(circle1.x, circle1.y, circle2.x, circle2.y) < (circle2.radius + circle1.radius);
}
export function circleIntersectsRect(circle, rect) {
    if (pointIntersectsRect(circle, rect))
        return true;
    // Calculate the half-width and half-height of the rectangle
    const halfWidth = rect.width * (rect._origin?.x || 0);
    const halfHeight = rect.height * (rect._origin?.y || 0);
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
export function circleIntersectsPolygon(circle, polygon) {
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
//////////////////////////////////////////////////////////////////////
// Source is rect
//////////////////////////////////////////////////////////////////////
export function rectIntersectsRect(rect1, rect2) {
    if (!rect1 || !rect2) {
        return false;
    }
    const sX1 = rect1.x - (rect1.width * (rect1._origin?.x || 0)), sY1 = rect1.y - (rect1.height * (rect1._origin?.x || 0)), sW = rect1.width, sH = rect1.height, dX1 = rect2.x - (rect2.width * (rect2._origin?.x || 0)), dY1 = rect2.y - (rect2.height * (rect2._origin?.x || 0)), dW = rect2.width, dH = rect2.height, sX2 = sX1 + sW, sY2 = sY1 + sH, dX2 = dX1 + dW, dY2 = dY1 + dH;
    return sX1 < dX2 && sX2 > dX1 && sY1 < dY2 && sY2 > dY1;
}
export function rectIntersectsPolygon(rect, polygon) {
    return polygonIntersectsPolygon(rectToPolygon(rect), polygon);
}
//////////////////////////////////////////////////////////////////////
// Source is polygon
//////////////////////////////////////////////////////////////////////
export function polygonIntersectsPolygon(polygon1, polygon2) {
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
