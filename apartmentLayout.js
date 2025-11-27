import { state} from './state.js';
import { ensureCounterClockwise,getOffsetPolygon,getPolygonAreaFromPoints, getPolygonBoundingBox    } from './utils.js';
   let balconyOffsetPx = 0 ;
           let  unitOffsetPx = 0;
            let outerCorridorOffsetMeters= 0;
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
            // For 'Fit from Center', calculate the starting offset to center the block of units.
            currentDistMeters = (seg.originalLength - totalPlacedFrontage) / 2;
        } else { // calcMode === 'offset'
            // For 'Start to End', always start from the beginning of the segment.
            currentDistMeters = 0;
        }

        seg.placedUnits.forEach(unit => {
            const centerAlongSegmentPx = (currentDistMeters + unit.frontage / 2) / state.scale.ratio;
            const segVec = { x: seg.end.x - seg.start.x, y: seg.end.y - seg.start.y };
            const segLenPx = Math.hypot(segVec.x, segVec.y);
            const unitVec = { x: segVec.x / segLenPx, y: segVec.y / segLenPx };
            const centerOnLine = { x: seg.start.x + unitVec.x * centerAlongSegmentPx, y: seg.start.y + unitVec.y * centerAlongSegmentPx };
            const centerOnLinex = { x: seg.start.x + unitVec.x * 0, y: seg.start.y + unitVec.y * 0 };
            const balconyDepth = (unit.balconyMultiplier || 0);
            const unitDepth = unit.depth;
            let unitOffsetPx, balconyOffsetPx;
 balconyOffsetPx = ((balconyDepth / 2) / state.scale.ratio)*-1 ;
           
           unitOffsetPx = (0 + unitDepth / 2) / state.scale.ratio;
            if (includeBalconiesInOffset) { // Recessed
                
                balconyOffsetPx = (balconyDepth / 2) / state.scale.ratio;
                unitOffsetPx = (balconyDepth +unitDepth / 2) / state.scale.ratio;
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
    const avgUnitDepth = program.unitTypes.reduce((acc, u) => acc + u.depth, 0) / program.unitTypes.length;
    const avgBalconyDepth = includeBalconiesInOffset 
        ? program.unitTypes.reduce((acc, u) => acc + (u.balconyMultiplier || 0), 0) / program.unitTypes.length
        : 0;
 if (includeBalconiesInOffset) { // 
     outerCorridorOffsetMeters = avgBalconyDepth + avgUnitDepth;
 }else{
   outerCorridorOffsetMeters = avgUnitDepth;  
 }
    const outerCorridorOffsetPx = outerCorridorOffsetMeters / state.scale.ratio;
    const outerCorridorPolyPoints = getOffsetPolygon(ccwPolyPoints, outerCorridorOffsetPx);

    const innerCorridorOffsetMeters = outerCorridorOffsetMeters + CORRIDOR_WIDTH;
    const innerCorridorOffsetPx = innerCorridorOffsetMeters / state.scale.ratio;
    const innerCorridorPolyPoints = getOffsetPolygon(ccwPolyPoints, innerCorridorOffsetPx);

    if (doubleLoaded) {
        // Create apartments on the other side of the corridor
        const innerSegments = [];
        for (let i = 0; i < innerCorridorPolyPoints.length; i++) {
            const p1 = innerCorridorPolyPoints[i];
            const p2 = innerCorridorPolyPoints[(i + 1) % innerCorridorPolyPoints.length];
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const lengthPx = Math.hypot(dx, dy);
            const normal = { x: -dy / lengthPx, y: dx / lengthPx }; // Normal points "inward"
            innerSegments.push({
                start: p1, end: p2,
                availableLength: lengthPx * state.scale.ratio,
                placedUnits: [],
                angle: Math.atan2(dy, dx),
                normal: normal,
            });
        }
        // Simplified re-placement logic for the second side
        innerSegments.forEach(seg => {
            const unitsForSide = Math.floor(seg.availableLength / avgUnitDepth);
            // This is a simplification; a full re-run of the packing algo would be more accurate
            // For now, let's just mirror the original set for demo
             segments.find(s => s.angle.toFixed(2) === seg.angle.toFixed(2))?.placedUnits.forEach(unit => {
                finalPlacedFlats.push({ /* Similar placement logic, but offset from inner corridor */ });
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