// --- START OF FILE utils.js ---
import { state } from './state.js';

export function f(val, dec = 2) {
    return val != null && !isNaN(val) ? val.toLocaleString(undefined, { minimumFractionDigits: dec, maximumFractionDigits: dec }) : '0.00';
}
export function fInt(val) {
    return val != null && !isNaN(val) ? val.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '0';
}
export function getLineIntersection(p1, p2, p3, p4) {
    const d = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
    if (d === 0) return null;
    const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / d;
    return { x: p1.x + t * (p2.x - p1.x), y: p1.y + t * (p2.y - p1.y) };
}
export function getPolygonProperties(fabricPolygon) {
    if (!fabricPolygon || !fabricPolygon.points || fabricPolygon.points.length < 3 || state.scale.ratio === 0) {
        return { area: 0, perimeter: 0 };
    }
    const meterPoints = fabricPolygon.points.map(p => ({ x: p.x * state.scale.ratio, y: p.y * state.scale.ratio }));
    let area = 0, perimeter = 0;
    for (let i = 0, j = meterPoints.length - 1; i < meterPoints.length; j = i++) {
        area += (meterPoints[j].x + meterPoints[i].x) * (meterPoints[j].y - meterPoints[i].y);
        perimeter += Math.hypot(meterPoints[i].x - meterPoints[j].x, meterPoints[i].y - meterPoints[j].y);
    }
    return { area: Math.abs(area / 2), perimeter: perimeter };
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
export function getOffsetPolygon(points, offset) {
    if (!points || points.length < 3) return [];

    const centroid = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
    centroid.x /= points.length;
    centroid.y /= points.length;

    const num = points.length;
    const offsetLines = [];

    for (let i = 0; i < num; i++) {
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
    for (let i = 0; i < num; i++) {
        const lineA = offsetLines[i];
        const lineB = offsetLines[(i + 1) % num];
        if (!lineA || !lineB) {
            const orig = points[(i + 1) % num];
            const vx = centroid.x - orig.x;
            const vy = centroid.y - orig.y;
            const vlen = Math.hypot(vx, vy) || 1;
            newPoints.push({
                x: orig.x + (vx / vlen) * Math.abs(offset),
                y: orig.y + (vy / vlen) * Math.abs(offset)
            });
            continue;
        }

        const inter = getLineIntersection(lineA.p1, lineA.p2, lineB.p1, lineB.p2);
        if (inter) {
            newPoints.push(inter);
        } else {
            newPoints.push({ x: lineA.p2.x, y: lineA.p2.y });
        }
    }

    if (newPoints.length < 3) return [];
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