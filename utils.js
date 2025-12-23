import { state } from './state.js';

export function f(val, dec = 2) {
    return val != null && !isNaN(val) ? val.toLocaleString(undefined, { minimumFractionDigits: dec, maximumFractionDigits: dec }) : '0.00';
}
export function fInt(val) {
    return val != null && !isNaN(val) ? val.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '0';
}
export function isPointInRotatedRect(point, center, width, height, angle) {
    const cos = Math.cos(-angle);
    const sin = Math.sin(-angle);

    const dx = point.x - center.x;
    const dy = point.y - center.y;

    const rotatedX = dx * cos - dy * sin;
    const rotatedY = dx * sin + dy * cos;

    return Math.abs(rotatedX) <= width / 2 && Math.abs(rotatedY) <= height / 2;
}
export function getLineIntersection(p1, p2, p3, p4) {
    const d = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
    if (d === 0) return null;
    const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / d;
    return { x: p1.x + t * (p2.x - p1.x), y: p1.y + t * (p2.y - p1.y) };
}
export function getPolygonProperties(fabricPolygon) {
    if (!fabricPolygon || !fabricPolygon.points || fabricPolygon.points.length < 2 || state.scale.ratio === 0) {
        return { area: 0, perimeter: 0 };
    }
    const meterPoints = fabricPolygon.points.map(p => ({ x: p.x * state.scale.ratio, y: p.y * state.scale.ratio }));
    let area = 0, perimeter = 0;
    
    // Closed Polygon Logic
    if (fabricPolygon.type === 'polygon') {
        for (let i = 0; i < meterPoints.length; i++) {
            const j = (i + 1) % meterPoints.length;
            area += (meterPoints[j].x + meterPoints[i].x) * (meterPoints[j].y - meterPoints[i].y);
            perimeter += Math.hypot(meterPoints[i].x - meterPoints[j].x, meterPoints[i].y - meterPoints[j].y);
        }
        area = Math.abs(area / 2);
    } else {
        // Polyline (Linear) Logic
        for (let i = 0; i < meterPoints.length - 1; i++) {
            perimeter += Math.hypot(meterPoints[i+1].x - meterPoints[i].x, meterPoints[i+1].y - meterPoints[i].y);
        }
        area = 0; 
    }
    
    return { area: area, perimeter: perimeter };
}
export function getPolygonAreaFromPoints(points) {
    if (!points || points.length < 3 || state.scale.ratio === 0) return 0;
    const meterPoints = points.map(p => ({ x: p.x * state.scale.ratio, y: p.y * state.scale.ratio }));
    let area = 0;
    for (let i = 0, j = meterPoints.length - 1; i < meterPoints.length; j = i++) {
        area += (meterPoints[j].x + meterPoints[i].x) * (meterPoints[j].y - meterPoints[i].y);
    }
    return Math.abs(area / 2);
}
export function getPolygonBoundingBox(points) {
    if (!points || points.length === 0) {
        return { x: 0, y: 0, width: 0, height: 0 };
    }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    points.forEach(p => {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
    });
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}
export function orthogonalizePolygon(points) {
    if (!points || points.length < 3) return points;
    let longestEdge = { length: 0, angle: 0 };
    for (let i = 0; i < points.length; i++) {
        const p1 = points[i];
        const p2 = points[(i + 1) % points.length];
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const length = Math.hypot(dx, dy);
        if (length > longestEdge.length) {
            longestEdge = { length, angle: Math.atan2(dy, dx) };
        }
    }
    const dominantAngle = longestEdge.angle;
    const rotate = (p, angle, center) => {
        const cos = Math.cos(angle), sin = Math.sin(angle);
        const px = p.x - center.x, py = p.y - center.y;
        return { x: px * cos - py * sin + center.x, y: px * sin + py * cos + center.y };
    };
    const center = points.reduce((acc, p) => ({ x: acc.x + p.x / points.length, y: acc.y + p.y / points.length }), {x: 0, y: 0});
    const rotatedPoints = points.map(p => rotate(p, -dominantAngle, center));
    const orthoPoints = rotatedPoints.reduce((acc, curr) => {
        const prev = acc[acc.length - 1];
        if (Math.abs(curr.x - prev.x) > Math.abs(curr.y - prev.y)) {
            acc.push({ x: curr.x, y: prev.y });
        } else {
            acc.push({ x: prev.x, y: curr.y });
        }
        return acc;
    }, [rotatedPoints[0]]);
    return orthoPoints.map(p => rotate(p, dominantAngle, center));
}
export function findBestFit(targetArea, targetPerimeter, types) {
    let bestFit = { units: 0, counts: {}, area: 0, frontage: 0 };
    for (let n = 200; n > 0; n--) {
        const counts = allocateCountsByPercent(n, types);
        let usedArea = 0, usedFrontage = 0;
        types.forEach(t => {
            usedArea += (t.area || 0) * (counts[t.key] || 0);
            usedFrontage += (t.frontage || 0) * (counts[t.key] || 0);
        });
        if (usedArea <= targetArea && usedFrontage <= targetPerimeter) {
            bestFit = { units: n, counts, area: usedArea, frontage: usedFrontage };
            break;
        }
    }
    return bestFit;
}
export function allocateCountsByPercent(n, types) {
    if (!types || types.length === 0) return {};
    const totalMix = types.reduce((sum, t) => sum + (t.mix || 0), 0) || 1;
    let counts = {};
    let assigned = 0;
    types.forEach(t => {
        const raw = (t.mix / totalMix) * n;
        counts[t.key] = Math.floor(raw);
        assigned += counts[t.key];
    });
    const fracs = types.map(t => ({ key: t.key, frac: ((t.mix / totalMix) * n) - (counts[t.key] || 0) }))
        .sort((a, b) => b.frac - a.frac);
    let i = 0;
    while (assigned < n && fracs.length > 0) {
        counts[fracs[i % fracs.length].key]++;
        assigned++;
        i++;
    }
    return counts;
}
export function getOffsetPolygon(points, offset, isClosed = true) {
    if (!points || points.length < 2) return [];

    const centroid = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
    centroid.x /= points.length;
    centroid.y /= points.length;

    const num = points.length;
    const offsetLines = [];
    
    // For closed poly, loop last to first. For open, stop at length - 1.
    const loopLimit = isClosed ? num : num - 1;

    for (let i = 0; i < loopLimit; i++) {
        const p1 = points[i];
        const p2 = points[(i + 1) % num];
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const len = Math.hypot(dx, dy);
        if (len === 0) {
            offsetLines.push(null);
            continue;
        }

        let nx = -dy / len;
        let ny = dx / len;

        const toCentroidX = centroid.x - p1.x;
        const toCentroidY = centroid.y - p1.y;
        const dot = toCentroidX * nx + toCentroidY * ny;
        if (dot < 0) {
            nx = -nx;
            ny = -ny;
        }

        const ox = nx * offset;
        const oy = ny * offset;

        const op1 = { x: p1.x + ox, y: p1.y + oy };
        const op2 = { x: p2.x + ox, y: p2.y + oy };

        offsetLines.push({ p1: op1, p2: op2 });
    }

    const newPoints = [];
    // Reconstruct intersections
    for (let i = 0; i < offsetLines.length; i++) {
        const lineA = offsetLines[i];
        if(!lineA) continue; 

        if (!isClosed) {
            // Linear case handling
            if (i === 0) {
                newPoints.push(lineA.p1); // Start of first segment
            }
            if (i < offsetLines.length - 1) {
                const lineB = offsetLines[i+1];
                if(lineB) {
                    const inter = getLineIntersection(lineA.p1, lineA.p2, lineB.p1, lineB.p2);
                    if (inter) newPoints.push(inter);
                    else newPoints.push(lineA.p2);
                }
            } else {
                newPoints.push(lineA.p2); // End of last segment
            }
        } else {
            // Closed polygon case
            const nextIdx = (i + 1) % offsetLines.length;
            const lineB = offsetLines[nextIdx];
            if (!lineB) {
                newPoints.push(lineA.p2); 
                continue;
            }
            const inter = getLineIntersection(lineA.p1, lineA.p2, lineB.p1, lineB.p2);
            if (inter) {
                newPoints.push(inter);
            } else {
                newPoints.push({ x: lineA.p2.x, y: lineA.p2.y });
            }
        }
    }

    if (newPoints.length < 2) return [];
    return newPoints;
}
export function pointToLineSegmentDistance(p, v, w) {
    const l2 = (v.x - w.x)**2 + (v.y - w.y)**2;
    if (l2 === 0) return { distance: Math.hypot(p.x - v.x, p.y - v.y), point: v };
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    const closestPoint = { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) };
    const distance = Math.hypot(p.x - closestPoint.x, p.y - closestPoint.y);
    return { distance, point: closestPoint };
}
export function ensureCounterClockwise(points) {
    let area = 0;
    for (let i = 0; i < points.length; i++) {
        const p1 = points[i];
        const p2 = points[(i + 1) % points.length];
        area += (p2.x - p1.x) * (p2.y + p1.y);
    }
    if (area > 0) {
        return [...points].reverse();
    }
    return points;
}

// --- OBB ALGORITHMS (from ai_studio_code (28).html) ---

function crossProduct(p1, p2, p3) {
    return (p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x);
}

export function getConvexHull(points) {
    if (points.length < 3) return [...points];
    
    const sortedPoints = [...points].sort((a, b) => a.x - b.x || a.y - b.y);

    const lower = [];
    for (const p of sortedPoints) {
        while (lower.length >= 2 && crossProduct(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
            lower.pop();
        }
        lower.push(p);
    }

    const upper = [];
    for (let i = sortedPoints.length - 1; i >= 0; i--) {
        const p = sortedPoints[i];
        while (upper.length >= 2 && crossProduct(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
            upper.pop();
        }
        upper.push(p);
    }

    upper.pop();
    lower.pop();
    
    return lower.concat(upper);
}

export function getOBB(points) {
    if (!points || points.length < 2) return null;
    
    const hull = getConvexHull(points);

    if (hull.length < 2) {
        const p = hull[0] || points[0];
        return { angle: 0, corners: [p, p, p, p], width: 0, height: 0 };
    }
    
    let minArea = Infinity;
    let bestOBB = null;

    for (let i = 0; i < hull.length; i++) {
        const p1 = hull[i];
        const p2 = hull[(i + 1) % hull.length];
        
        const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);

        const rotatedHull = hull.map(p => {
            const dx = p.x;
            const dy = p.y;
            return {
                x: dx * Math.cos(-angle) - dy * Math.sin(-angle),
                y: dx * Math.sin(-angle) + dy * Math.cos(-angle)
            };
        });

        const aabb = getPolygonBoundingBox(rotatedHull);
        const area = aabb.width * aabb.height;
        
        if (area < minArea) {
            minArea = area;
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            
            const corners = [
                { x: aabb.x, y: aabb.y },
                { x: aabb.x + aabb.width, y: aabb.y },
                { x: aabb.x + aabb.width, y: aabb.y + aabb.height },
                { x: aabb.x, y: aabb.y + aabb.height }
            ].map(p => ({
                x: p.x * cos - p.y * sin,
                y: p.x * sin + p.y * cos
            }));

            bestOBB = {
                angle: angle, corners: corners, width: aabb.width, height: aabb.height
            };
        }
    }
    return bestOBB;
}