import { state} from './state.js';
import { ensureCounterClockwise,getOffsetPolygon,getPolygonAreaFromPoints, getPolygonBoundingBox    } from './utils.js';
import { updateDashboard } from './uiController.js';

export function  layoutFlatsOnPolygon(poly, counts, includeBalconiesInOffset = true, calcMode = 'center', doubleLoaded = false) {
    if (!counts || !poly || !poly.points || poly.points.length < 3 || state.scale.ratio === 0) {
        return { placedFlats: [], outerCorridorPolyPoints: [], innerCorridorPolyPoints: [], corridorArea: 0 };
    }
    const program = state.currentProgram;
    if (!program || !program.unitTypes) {
        console.error("Layout failed: No current program or unit types are defined in the state.");
        return { placedFlats: [], outerCorridorPolyPoints: [], innerCorridorPolyPoints: [], corridorArea: 0 };
    }

    const ccwPolyPoints = ensureCounterClockwise(poly.points);

    const allUnitsToPlace = [];
    program.unitTypes.forEach(t => {
        for (let i = 0; i < (counts[t.key] || 0); i++) {
            allUnitsToPlace.push(t);
        }
    });
    allUnitsToPlace.sort((a, b) => a.frontage - b.frontage);

    const segments = [];
    for (let i = 0; i < ccwPolyPoints.length; i++) {
        const p1 = ccwPolyPoints[i];
        const p2 = ccwPolyPoints[(i + 1) % ccwPolyPoints.length];
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const lengthPx = Math.hypot(dx, dy);
        const normal = { x: -dy / lengthPx, y: dx / lengthPx };
        let availableLength = lengthPx * state.scale.ratio;
        if (calcMode === 'offset') {
            availableLength += 8.0; // Add 8m extension for 'Start to End' mode
        }
        segments.push({
            start: p1, end: p2,
            originalLength: lengthPx * state.scale.ratio,
            availableLength: availableLength,
            placedUnits: [],
            angle: Math.atan2(dy, dx),
            normal: normal,
        });
    }

    let placedInPass = true;
    while (allUnitsToPlace.length > 0 && placedInPass) {
        placedInPass = false;
        segments.sort((a, b) => b.availableLength - a.availableLength);
        if (segments[0].availableLength > 0) {
            let bestFitIndex = -1;
            for (let i = allUnitsToPlace.length - 1; i >= 0; i--) {
                if (allUnitsToPlace[i].frontage <= segments[0].availableLength) {
                    bestFitIndex = i;
                    break;
                }
            }
            if (bestFitIndex !== -1) {
                const unitToPlace = allUnitsToPlace.splice(bestFitIndex, 1)[0];
                segments[0].placedUnits.push(unitToPlace);
                segments[0].availableLength -= unitToPlace.frontage;
                placedInPass = true;
            }
        }
    }

    const finalPlacedFlats = [];
    segments.forEach((seg, index) => {
        const totalPlacedFrontage = seg.placedUnits.reduce((sum, unit) => sum + unit.frontage, 0);
        let currentDistMeters;

        if (calcMode === 'center') {
            currentDistMeters = (seg.originalLength - totalPlacedFrontage) / 2;
        } else { 
            currentDistMeters = 0;
        }

        seg.placedUnits.forEach(unit => {
            const centerAlongSegmentPx = (currentDistMeters + unit.frontage / 2) / state.scale.ratio;
            const segVec = { x: seg.end.x - seg.start.x, y: seg.end.y - seg.start.y };
            const segLenPx = Math.hypot(segVec.x, segVec.y);
            const unitVec = { x: segVec.x / segLenPx, y: segVec.y / segLenPx };
            const centerOnLine = { x: seg.start.x + unitVec.x * centerAlongSegmentPx, y: seg.start.y + unitVec.y * centerAlongSegmentPx };
            
            const balconyDepth = (unit.balconyMultiplier || 0);
            const unitDepth = unit.depth;
            let unitOffsetPx, balconyOffsetPx;

            if (includeBalconiesInOffset) { // Recessed
                balconyOffsetPx = (balconyDepth / 2) / state.scale.ratio;
                unitOffsetPx = (balconyDepth + unitDepth / 2) / state.scale.ratio;
            } else { // Projecting
                balconyOffsetPx = (-balconyDepth / 2) / state.scale.ratio;
                unitOffsetPx = (unitDepth / 2) / state.scale.ratio;
            }
            
            finalPlacedFlats.push({
                type: unit,
                center: { x: centerOnLine.x + seg.normal.x * unitOffsetPx, y: centerOnLine.y + seg.normal.y * unitOffsetPx },
                balconyCenter: { x: centerOnLine.x + seg.normal.x * balconyOffsetPx, y: centerOnLine.y + seg.normal.y * balconyOffsetPx },
                angle: seg.angle
            });
            currentDistMeters += unit.frontage;
        });
    });

    const CORRIDOR_WIDTH = doubleLoaded ? 2.0 : 1.8;
    const avgUnitDepth = program.unitTypes.length > 0 ? program.unitTypes.reduce((acc, u) => acc + u.depth, 0) / program.unitTypes.length : 0;
    const avgBalconyDepth = includeBalconiesInOffset && program.unitTypes.length > 0 
        ? program.unitTypes.reduce((acc, u) => acc + (u.balconyMultiplier || 0), 0) / program.unitTypes.length
        : 0;

    const outerCorridorOffsetMeters = avgBalconyDepth + avgUnitDepth;
    const outerCorridorOffsetPx = outerCorridorOffsetMeters / state.scale.ratio;
    const outerCorridorPolyPoints = getOffsetPolygon(ccwPolyPoints, outerCorridorOffsetPx);

    const innerCorridorOffsetMeters = outerCorridorOffsetMeters + CORRIDOR_WIDTH;
    const innerCorridorOffsetPx = innerCorridorOffsetMeters / state.scale.ratio;
    const innerCorridorPolyPoints = getOffsetPolygon(ccwPolyPoints, innerCorridorOffsetPx);

    if (doubleLoaded) {
        const innerSegments = [];
        const ccwInnerPoly = ensureCounterClockwise(innerCorridorPolyPoints);
        for (let i = 0; i < ccwInnerPoly.length; i++) {
            const p1 = ccwInnerPoly[i];
            const p2 = ccwInnerPoly[(i + 1) % ccwInnerPoly.length];
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const lengthPx = Math.hypot(dx, dy);
            const normal = { x: -dy / lengthPx, y: dx / lengthPx };
            innerSegments.push({
                start: p1, end: p2,
                originalLength: lengthPx * state.scale.ratio,
                angle: Math.atan2(dy, dx),
                normal: normal,
            });
        }

        segments.forEach(outerSeg => {
            if (outerSeg.placedUnits.length === 0) return;
            const innerSeg = innerSegments.reduce((best, current) => {
                 const angleDiff = Math.abs(current.angle - outerSeg.angle);
                 const bestAngleDiff = Math.abs(best.angle - outerSeg.angle);
                 return angleDiff < bestAngleDiff ? current : best;
            }, innerSegments[0]);

            const cornerBufferMeters = 8.0;
            let currentDistMeters = cornerBufferMeters;
            
            const reversedUnits = [...outerSeg.placedUnits].reverse();

            reversedUnits.forEach(unit => {
                 if (currentDistMeters + unit.frontage <= innerSeg.originalLength - cornerBufferMeters) {
                    const centerAlongSegmentPx = (currentDistMeters + unit.frontage / 2) / state.scale.ratio;
                    const segVec = { x: innerSeg.end.x - innerSeg.start.x, y: innerSeg.end.y - innerSeg.start.y };
                    const segLenPx = Math.hypot(segVec.x, segVec.y);
                    const unitVec = { x: segVec.x / segLenPx, y: segVec.y / segLenPx };
                    const centerOnLine = { x: innerSeg.start.x + unitVec.x * centerAlongSegmentPx, y: innerSeg.start.y + unitVec.y * centerAlongSegmentPx };
                    
                    const balconyDepth = (unit.balconyMultiplier || 0);
                    const unitDepth = unit.depth;
                    
                    let unitOffsetPx, balconyOffsetPx;
                    
                    if (includeBalconiesInOffset) { // Recessed logic for the inner side
                        balconyOffsetPx = (balconyDepth / 2) / state.scale.ratio;
                        unitOffsetPx = (balconyDepth + unitDepth / 2) / state.scale.ratio;
                    } else { // Projecting logic for the inner side
                        balconyOffsetPx = (-balconyDepth / 2) / state.scale.ratio;
                        unitOffsetPx = (unitDepth / 2) / state.scale.ratio;
                    }

                    finalPlacedFlats.push({
                        type: unit,
                        center: { x: centerOnLine.x + innerSeg.normal.x * unitOffsetPx, y: centerOnLine.y + innerSeg.normal.y * unitOffsetPx },
                        balconyCenter: { x: centerOnLine.x + innerSeg.normal.x * balconyOffsetPx, y: centerOnLine.y + innerSeg.normal.y * balconyOffsetPx },
                        angle: innerSeg.angle 
                    });
                    currentDistMeters += unit.frontage;
                }
            });
        });
    }

    const outerArea = getPolygonAreaFromPoints(outerCorridorPolyPoints);
    const innerArea = getPolygonAreaFromPoints(innerCorridorPolyPoints);
    const corridorArea = Math.max(0, outerArea - innerArea);
    const staircaseValidation = validateStaircaseDistance(finalPlacedFlats);
    
    return { 
        placedFlats: finalPlacedFlats, 
        outerCorridorPolyPoints, innerCorridorPolyPoints, corridorArea, staircaseValidation
    };
    
}

export function validateStaircaseDistance(placedFlats) {
    const stairs = state.serviceBlocks.filter(b => b.level === 'Typical_Floor' && b.blockData.name.toLowerCase().includes('staircase'));
    if (stairs.length < 2) {
        return { valid: true, message: "Not enough staircases to validate." };
    }

    const allUnitPoints = placedFlats.flatMap(flat => {
        const w = flat.type.frontage / state.scale.ratio;
        const h = flat.type.depth / state.scale.ratio;
        const cos = Math.cos(flat.angle);
        const sin = Math.sin(flat.angle);
        const center = flat.center;
        return [
            { x: center.x + (-w/2)*cos - (-h/2)*sin, y: center.y + (-w/2)*sin + (-h/2)*cos },
            { x: center.x + (w/2)*cos - (-h/2)*sin, y: center.y + (w/2)*sin + (-h/2)*cos },
            { x: center.x + (w/2)*cos - (h/2)*sin, y: center.y + (w/2)*sin + (h/2)*cos },
            { x: center.x + (-w/2)*cos - (h/2)*sin, y: center.y + (-w/2)*sin + (h/2)*cos },
        ];
    });

    if (allUnitPoints.length === 0) {
        return { valid: true, message: "No apartments placed to form a bounding box."};
    }

    const bbox = getPolygonBoundingBox(allUnitPoints);
    const diagonal = Math.hypot(bbox.width, bbox.height) * state.scale.ratio;
    const requiredMinDistance = diagonal / 3;

    for (let i = 0; i < stairs.length; i++) {
        for (let j = i + 1; j < stairs.length; j++) {
            const dist = Math.hypot(stairs[i].left - stairs[j].left, stairs[i].top - stairs[j].top) * state.scale.ratio;
            if (dist < requiredMinDistance) {
                return {
                    valid: false,
                    message: `Staircase distance violation (${dist.toFixed(1)}m < ${requiredMinDistance.toFixed(1)}m)`
                };
            }
        }
    }
    
    return { valid: true, message: `Staircase distance OK (min required: ${requiredMinDistance.toFixed(1)}m)` };
}