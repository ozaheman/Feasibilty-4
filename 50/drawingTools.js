
//--- START OF FILE drawingTools.js ---

// MODULE 5: DRAWING TOOLS & SNAPPING (drawingTools.js equivalent)
// =====================================================================
import { getCanvas, getOverlayContext } from './canvasController.js';
import { resetState,state } from './state.js';
import { pointToLineSegmentDistance,getLineIntersection,allocateCountsByPercent,f,fInt ,getPolygonProperties } from './utils.js';
import { initUI, updateUI,applyLevelVisibility,updateLevelFootprintInfo , updateParkingDisplay,updateMixTotal } from './uiController.js';
import { exitAllModes, handleFinishPolygon, handleObjectModified } from './eventHandlers.js';
import { generateLinearParking } from './parkingLayoutUtils.js';
import { PREDEFINED_BLOCKS, BLOCK_CATEGORY_COLORS } from '../config.js';

import { layoutFlatsOnPolygon} from './apartmentLayout.js';
window.snapIndicators=null;

export function initDrawingTools() {
snapIndicators = new fabric.Group([], { evented: false, selectable: false, isSnapIndicator: true });
state.canvas.add(snapIndicators);
}
export function resetDrawingState() {
polygonPoints.length = 0; // Use length = 0 to clear the exported array
finalpolygonPoints = []; // Use length = 0 to clear the exported array
if (currentDrawingPolygon) state.canvas.remove(currentDrawingPolygon);
currentDrawingPolygon = null;
if (scaleLine) state.canvas.remove(scaleLine);
scaleLine = null;
if (guideLine) state.canvas.remove(guideLine);
guideLine = null;
if (alignmentHighlight) state.canvas.remove(alignmentHighlight);
alignmentHighlight = null;
snapIndicators.remove(...snapIndicators.getObjects());
clearEdgeSnapIndicator();
state.canvas.renderAll();
}
export function getOffsetPoints(points) {
if (!points || points.length < 3 || !state.scale.ratio) return [];
const offsetLines = [];
const numPoints = points.length;
for (let i = 0; i < numPoints; i++) {
const p1 = points[i];
const p2 = points[(i + 1) % numPoints];
const edgeProps = state.plotEdgeProperties[i] || { distance: 5, direction: 'inside' };
const offsetDist = (edgeProps.direction === 'inside' ? 1 : -1) * edgeProps.distance / state.scale.ratio;
const dx = p2.x - p1.x;
const dy = p2.y - p1.y;
const len = Math.hypot(dx, dy);
if (len === 0) continue;
const nx = -dy / len;
const ny = dx / len;
const op1 = { x: p1.x + offsetDist * nx, y: p1.y + offsetDist * ny };
const op2 = { x: p2.x + offsetDist * nx, y: p2.y + offsetDist * ny };
offsetLines.push({ p1: op1, p2: op2 });
}
if (offsetLines.length < 2) return [];
const newPolygonPoints = [];
const numLines = offsetLines.length;
for (let i = 0; i < numLines; i++) {
const currentLine = offsetLines[i];
const nextLine = offsetLines[(i + 1) % numLines];
const intersection = getLineIntersection(currentLine.p1, currentLine.p2, nextLine.p1, nextLine.p2);
if (intersection) {
newPolygonPoints.push(intersection);
} else {
newPolygonPoints.push(currentLine.p2);
}
}
return newPolygonPoints;
}
export function drawSetbackGuides() {
if (!state.plotPolygon) return;
clearSetbackGuides();
const points = state.plotPolygon.points;
const offsetPoints = getOffsetPoints(points);
if (offsetPoints.length < 2) return;
for (let i = 0; i < offsetPoints.length; i++) {
const p1 = offsetPoints[i];
const p2 = offsetPoints[(i + 1) % offsetPoints.length];
const guide = new fabric.Line([p1.x, p1.y, p2.x, p2.y], {
stroke: 'rgba(255, 0, 255, 0.8)', strokeWidth: 2, strokeDashArray: [5, 5],
selectable: false, evented: false, strokeUniform: true, isGuide: true, level: state.currentLevel
});
state.setbackGuides.push(guide);
state.canvas.add(guide);
}
state.canvas.renderAll();
}
export function getSetbackPolygonPoints() {
if (!state.plotPolygon || state.plotEdgeProperties.length === 0) return [];
return getOffsetPoints(state.plotPolygon.points);
}
export function clearSetbackGuides() {
state.setbackGuides.forEach(guide => state.canvas.remove(guide));
state.setbackGuides = [];
state.canvas.renderAll();
}
export function findNearestParkingEdge(pointer) {
let minDistance = Infinity;
let nearestEdge = null;
const threshold = 15 / (state.canvas?.getZoom() || 1);
const validLevels = ['Basement', 'Ground_Floor', 'Podium'];


if (!validLevels.includes(state.currentLevel)) return null;

const footprints = state.levels[state.currentLevel].objects.filter(o => o.isFootprint && o.visible);
// Include the plot polygon if it exists, as it can define edges for parking
if (state.plotPolygon) footprints.push(state.plotPolygon);

footprints.forEach(poly => {
    if (!poly.points) return;
    for (let i = 0; i < poly.points.length; i++) {
        const p1 = poly.points[i];
        const p2 = poly.points[(i + 1) % poly.points.length];
        const { distance } = pointToLineSegmentDistance(pointer, p1, p2);
        if (distance < minDistance) {
            minDistance = distance;
            nearestEdge = { p1, p2 };
        }
    }
});

return minDistance < threshold ? nearestEdge : null;

}
export function getClickedPlotEdge(pointer) {
if (!state.plotPolygon) return -1;
const threshold = 10 / state.canvas.getZoom();
const points = state.plotPolygon.points;
for (let i = 0; i < points.length; i++) {
const p1 = points[i];
const p2 = points[(i + 1) % points.length];
const { distance } = pointToLineSegmentDistance(pointer, p1, p2);
if (distance < threshold) {
return i;
}
}
return -1;
}

// NEW: Helper to get clicked edge on any polygon
export function getClickedPolygonEdge(polygon, pointer) {
if (!polygon || !polygon.points) return -1;
const threshold = 10 / (state.canvas.getZoom() * polygon.scaleX); // Adjust threshold for scaled polygons
const matrix = polygon.calcTransformMatrix();
const transformedPoints = polygon.points.map(p => fabric.util.transformPoint(p, matrix));


for (let i = 0; i < transformedPoints.length; i++) {
    const p1 = transformedPoints[i];
    const p2 = transformedPoints[(i + 1) % transformedPoints.length];
    const { distance } = pointToLineSegmentDistance(pointer, p1, p2);
    if (distance < threshold) {
        return i;
    }
}
return -1;

}

export function updateEdgeHighlight(pointer) {
if(state.edgeHighlightGroup) state.canvas.remove(state.edgeHighlightGroup);
state.edgeHighlightGroup = null;
const edgeIndex = getClickedPlotEdge(pointer);
const highlights = [];
if(edgeIndex !== -1) {
const p1 = state.plotPolygon.points[edgeIndex];
const p2 = state.plotPolygon.points[(edgeIndex + 1) % state.plotPolygon.points.length];
highlights.push(new fabric.Line([p1.x, p1.y, p2.x, p2.y], {
stroke: 'rgba(0, 255, 255, 0.5)', strokeWidth: 5, evented: false, selectable: false, isEdgeHighlight: true, strokeUniform: true
}));
}
state.selectedPlotEdges.forEach(index => {
const p1 = state.plotPolygon.points[index];
const p2 = state.plotPolygon.points[(index + 1) % state.plotPolygon.points.length];
highlights.push(new fabric.Line([p1.x, p1.y, p2.x, p2.y], {
stroke: 'rgba(255, 0, 255, 0.5)', strokeWidth: 5, evented: false, selectable: false, isEdgeHighlight: true, strokeUniform: true
}));
});
if(highlights.length > 0) {
state.edgeHighlightGroup = new fabric.Group(highlights, {evented: false, selectable: false});
state.canvas.add(state.edgeHighlightGroup);
}
state.canvas.renderAll();
}
export function clearEdgeHighlight() {
if(state.edgeHighlightGroup) state.canvas.remove(state.edgeHighlightGroup);
state.edgeHighlightGroup = null;
state.canvas.renderAll();
}
export function getNearestEdge(pointer, plotPolygon, setbackGuides) {
let minDistance = Infinity;
let nearestEdge = null;
const threshold = 30 / (state.canvas?.getZoom() || 1);
const checkEdges = (points) => {
if (!points) return;
for (let i = 0; i < points.length; i++) {
const p1 = points[i];
const p2 = points[(i + 1) % points.length];
const { distance } = pointToLineSegmentDistance(pointer, p1, p2);
if (distance < minDistance) {
minDistance = distance;
nearestEdge = { p1, p2 };
}
}
};
if (plotPolygon) checkEdges(plotPolygon.points);
setbackGuides.forEach(guide => checkEdges([{x: guide.x1, y: guide.y1}, {x: guide.x2, y: guide.y2}]));
return minDistance < threshold ? nearestEdge : null;
}
export function alignObjectToEdge(object, edge) {
const edgeDx = edge.p2.x - edge.p1.x;
const edgeDy = edge.p2.y - edge.p1.y;
const angleRad = Math.atan2(edgeDy, edgeDx);
object.set('angle', fabric.util.radiansToDegrees(angleRad)).setCoords();
const [A, B, C] = [edge.p1.y - edge.p2.y, edge.p2.x - edge.p1.x, edge.p1.x * edge.p2.y - edge.p2.x * edge.p1.y];
const lineEqDenominator = Math.sqrt(A * A + B * B);
if (lineEqDenominator === 0) return;
const corners = object.oCoords;
const signedDistances = [corners.tl, corners.tr, corners.br, corners.bl]
.map(p => (A * p.x + B * p.y + C) / lineEqDenominator);
const minSignedDist = signedDistances.reduce((min, d) => Math.abs(d) < Math.abs(min) ? d : min, Infinity);
const normalVector = { x: A / lineEqDenominator, y: B / lineEqDenominator };
const moveVector = { x: -normalVector.x * minSignedDist, y: -normalVector.y * minSignedDist };
object.set({ left: object.left + moveVector.x, top: object.top + moveVector.y }).setCoords();
}
export function updateAlignmentHighlight(edge) {
if (alignmentHighlight) state.canvas.remove(alignmentHighlight);
alignmentHighlight = null;
if (edge) {
alignmentHighlight = new fabric.Line([edge.p1.x, edge.p1.y, edge.p2.x, edge.p2.y], {
stroke: 'rgba(255, 165, 0, 0.9)', strokeWidth: 5, selectable: false, evented: false, strokeUniform: true,
});
state.canvas.add(alignmentHighlight);
}
state.canvas.renderAll();
}
export function findSnapPoint(pointer) {
const snapTypes = {
endpoint: document.getElementById('snap-endpoint').checked,
perpendicular: document.getElementById('snap-perpendicular').checked,
parallel: document.getElementById('snap-parallel').checked,
};
if (!Object.values(snapTypes).some(Boolean)) return null;


let bestSnap = null;
let minDistance = snapThreshold / state.canvas.getZoom();
const objects = state.canvas.getObjects().filter(obj => obj.visible && !obj.isSnapIndicator && !obj.isEdgeHighlight && (obj.points || obj.isGuide));

objects.forEach(obj => {
    let pointsToSnap = [];
    if (obj.points) { pointsToSnap = obj.points; } 
    else if (obj.isGuide) { pointsToSnap = [{x: obj.x1, y: obj.y1}, {x: obj.x2, y: obj.y2}]; }
    
    if (snapTypes.endpoint) {
        pointsToSnap.forEach(p => {
            const checkPoint = obj.isFootprint && state.currentMode === 'editingFootprint' ? fabric.util.transformPoint(p, obj.calcTransformMatrix()) : p;
            const dist = Math.hypot(checkPoint.x - pointer.x, checkPoint.y - pointer.y);
            if (dist < minDistance) {
                minDistance = dist;
                bestSnap = { type: 'endpoint', x: checkPoint.x, y: checkPoint.y };
            }
        });
    }
    if ((snapTypes.perpendicular || snapTypes.parallel) && polygonPoints.length > 0) {
        const lastPt = polygonPoints[polygonPoints.length - 1];
        for (let i = 0; i < pointsToSnap.length -1; i++) {
            const p1 = pointsToSnap[i];
            const p2 = pointsToSnap[i+1];
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            if (snapTypes.parallel) {
                const snapX = lastPt.x + dx;
                const snapY = lastPt.y + dy;
                const dist = Math.hypot(snapX - pointer.x, snapY - pointer.y);
                if (dist < minDistance) {
                    minDistance = dist;
                    bestSnap = { type: 'parallel', x: snapX, y: snapY };
                }
            }
            if (snapTypes.perpendicular) {
                const snapX = lastPt.x - dy;
                const snapY = lastPt.y + dx;
                 const dist = Math.hypot(snapX - pointer.x, snapY - pointer.y);
                if (dist < minDistance) {
                    minDistance = dist;
                    bestSnap = { type: 'perpendicular', x: snapX, y: snapY };
                }
            }
        }
    }
});
return bestSnap;

}
export function updateSnapIndicators(snapPoint) {
snapIndicators.remove(...snapIndicators.getObjects());
if (snapPoint) {
const indicator = new fabric.Circle({
left: snapPoint.x, top: snapPoint.y,
radius: 100 / state.canvas.getZoom(), fill: 'transparent',
stroke: 'cyan', strokeWidth: 2 / state.canvas.getZoom(),
originX: 'center', originY: 'center',
isSnapPoint: true
});
snapIndicators.add(indicator);
}
state.canvas.renderAll();
}
export function snapObjectToEdge(object) {
const objCenter = object.getCenterPoint();
const nearestEdge = getNearestEdge(objCenter, state.plotPolygon, state.setbackGuides);
clearEdgeSnapIndicator();
if (nearestEdge) {
const edgeDx = nearestEdge.p2.x - nearestEdge.p1.x;
const edgeDy = nearestEdge.p2.y - nearestEdge.p1.y;
const angleRad = Math.atan2(edgeDy, edgeDx);
object.set('angle', fabric.util.radiansToDegrees(angleRad));
const { point: closestPointOnLine } = pointToLineSegmentDistance(objCenter, nearestEdge.p1, nearestEdge.p2);
const moveVector = { x: closestPointOnLine.x - objCenter.x, y: closestPointOnLine.y - objCenter.y };
object.set({ left: object.left + moveVector.x, top: object.top + moveVector.y }).setCoords();
updateEdgeSnapIndicator(nearestEdge);
}
}
export function updateEdgeSnapIndicator(edge) {
if (edge) {
edgeSnapIndicator = new fabric.Line([edge.p1.x, edge.p1.y, edge.p2.x, edge.p2.y], {
stroke: '#00ff00', strokeWidth: 3 / state.canvas.getZoom(), strokeDashArray: [5, 5],
selectable: false, evented: false, strokeUniform: true, isSnapIndicator: true, klass: 'snap-indicator-parallel'
});
state.canvas.add(edgeSnapIndicator);
state.canvas.renderAll();
}
}
export function clearEdgeSnapIndicator() {
if (edgeSnapIndicator) {
state.canvas.remove(edgeSnapIndicator);
edgeSnapIndicator = null;
state.canvas.renderAll();
}
}

export function addDrawingPoint(point) {
    if (polygonPoints.length > 0) {
        const last = polygonPoints[polygonPoints.length - 1];
        if (Math.hypot(point.x - last.x, point.y - last.y) < 2) {
            return; 
        }
    }

    polygonPoints.push(point);
    if (!currentDrawingPolygon) {
        const newPoints = [...polygonPoints, { x: point.x, y: point.y }];
        const isClosedPreview = document.getElementById('auto-close-preview-check').checked && state.currentMode !== 'drawingLinearBuilding';
        const options = {
            stroke: '#f50057', strokeWidth: 2, fill: isClosedPreview ? 'rgba(245, 0, 87, 0.2)' : 'transparent',
            selectable: false, evented: false, objectCaching: false, strokeUniform: true,
        };
        currentDrawingPolygon = (state.currentMode === 'drawingLinearBuilding' || !isClosedPreview) ?
            new fabric.Polyline(newPoints, options) :
            new fabric.Polygon(newPoints, options);
        state.canvas.add(currentDrawingPolygon);
    }
    handleCanvasMouseMove({ e: { clientX: state.lastMousePosition.x, clientY: state.lastMousePosition.y } });
    state.canvas.requestRenderAll();
}

export function handleCanvasMouseDown(pointer) {
const activeSnap = snapIndicators.getObjects().find(o => o.isSnapPoint);
if (activeSnap) { pointer.x = activeSnap.left; pointer.y = activeSnap.top; }


switch (state.currentMode) {
    case 'scaling':
        scaleLine = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
            stroke: 'rgba(211, 47, 47, 0.8)', strokeWidth: 2, selectable: false, evented: false, strokeUniform: true,
        });
        state.canvas.add(scaleLine);
        state.canvas.renderAll();
        return null;
    case 'drawingGuide':
        guideLine = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
            stroke: 'rgba(0, 255, 255, 0.7)', strokeWidth: 2, selectable: false, evented: false, strokeDashArray: [5, 5], strokeUniform: true, isGuide: true, level: state.currentLevel
        });
        state.canvas.add(guideLine);
        break;
    case 'drawingPlot':
    case 'drawingBuilding':
    case 'drawingLinearBuilding':
        if (state.currentMode !== 'drawingLinearBuilding' && polygonPoints.length > 2 && Math.hypot(pointer.x - polygonPoints[0].x, pointer.y - polygonPoints[0].y) < 10 / state.canvas.getZoom()) {
            
            const finalPolygon = new fabric.Polygon(finalpolygonPoints, { selectable: false, evented: false, objectCaching: false });
            resetDrawingState();
            return { action: 'finishPolygon', polygon: finalPolygon };
        }
       finalpolygonPoints.push({ x: pointer.x, y: pointer.y });
        addDrawingPoint({ x: pointer.x, y: pointer.y });
        break;
}
return null;
}
export function handleCanvasMouseMove(o) {
let pointer = state.canvas.getPointer(o.e);
let liveLayoutData = null;
let liveUnitCounts = null;

state.liveDimensionLine = null;

if (['drawingPlot', 'drawingBuilding', 'drawingLinearBuilding', 'drawingGuide', 'scaling', 'measuring'].includes(state.currentMode)) {
    const snapPoint = findSnapPoint(pointer);
    updateSnapIndicators(snapPoint);
    if (snapPoint) { pointer.x = snapPoint.x; pointer.y = snapPoint.y; }
}

switch (state.currentMode) {
    case 'scaling':
        if (scaleLine) { 
            scaleLine.set({ x2: pointer.x, y2: pointer.y }); 
            state.liveDimensionLine = { p1: { x: scaleLine.x1, y: scaleLine.y1 }, p2: pointer };
        }
        break;
    case 'drawingGuide':
        if (guideLine) {
            guideLine.set({ x2: pointer.x, y2: pointer.y });
            state.liveDimensionLine = { p1: { x: guideLine.x1, y: guideLine.y1 }, p2: pointer };
        }
        break;
    case 'drawingPlot':
    case 'drawingBuilding':
    case 'drawingLinearBuilding':
        if (currentDrawingPolygon) {
            if (polygonPoints.length > 0) {
                state.liveDimensionLine = { p1: polygonPoints[polygonPoints.length - 1], p2: pointer };
            }
            const newPoints = [...polygonPoints, { x: pointer.x, y: pointer.y }];
             if (currentDrawingPolygon.type === 'polygon') {
                currentDrawingPolygon.set({ points: newPoints });
            } else {
                currentDrawingPolygon.points[currentDrawingPolygon.points.length - 1] = { x: pointer.x, y: pointer.y };
                currentDrawingPolygon.set({ points: currentDrawingPolygon.points });
            }

            const tempFabricShape = state.currentMode === 'drawingLinearBuilding' ?
                new fabric.Polyline(newPoints) : new fabric.Polygon(newPoints);
            
            const props = getPolygonProperties(tempFabricShape);
            const area = props.area;
            let statusText = `Drawing... Area: ${f(area)} m²`;
            
            const isLayoutLevel = state.currentLevel === 'Typical_Floor';

            if (isLayoutLevel) {
                const numFloors = parseInt(document.getElementById('numTypicalFloors').value) || 0;
                const achievedGfa = area * numFloors;
                const allowedGfa = parseFloat(document.getElementById('allowedGfa').value) || 0;
                statusText += ` | Total GFA: ${f(achievedGfa)} / ${f(allowedGfa)} m²`;
            }
            
            if (isLayoutLevel && newPoints.length > 1 && state.currentProgram && state.projectType === 'Residential') {
                const program = state.currentProgram;
                const totalMix = program.unitTypes.reduce((sum, t) => sum + (t.mix || 0), 0) || 1;
                const avgFrontage = program.unitTypes.reduce((acc, unit) => acc + ((unit.frontage || 0) * ((unit.mix || 0) / totalMix)), 0);
                let tempPerimeter = props.perimeter;

                if (avgFrontage > 0) {
                    const estimatedUnits = Math.floor(tempPerimeter / avgFrontage);
                    const counts = allocateCountsByPercent(estimatedUnits, program.unitTypes);
                    const calcMode = document.getElementById('apartment-calc-mode').value;
                    const doubleLoaded = document.getElementById('double-loaded-corridor').checked;
                    const balconyPlacement = document.getElementById('balcony-placement').value;
                    const includeBalconiesInOffset = balconyPlacement === 'recessed';
                    
                    liveLayoutData = layoutFlatsOnPolygon(tempFabricShape, counts, includeBalconiesInOffset, calcMode, doubleLoaded);
                    
                    if (liveLayoutData?.corridorArea > 0) {
                        statusText += ` | Est. Corridor: ${f(liveLayoutData.corridorArea)} m²`;
                    }
                    liveUnitCounts = counts;
                }
            }
            document.getElementById('status-bar').textContent = statusText;
        }
        break;
}

state.livePreviewLayout = liveLayoutData;
if (liveUnitCounts) updateParkingDisplay(liveUnitCounts);
state.canvas.requestRenderAll();
return { liveLayoutData, liveUnitCounts };

}
export function handleMouseUp(o) {
if (state.currentMode === 'drawingGuide' && guideLine) {
const finalGuide = new fabric.Line([guideLine.x1, guideLine.y1, guideLine.x2, guideLine.y2], {
stroke: guideLine.stroke, strokeWidth: guideLine.strokeWidth, strokeDashArray: guideLine.strokeDashArray,
selectable: false, evented: false, isGuide: true, level: state.currentLevel, strokeUniform: true,
});
state.canvas.add(finalGuide);
state.guideLines.push(finalGuide);
exitAllModes();
return;
}
if (state.currentMode === 'drawingParking' && parkingLine) {
generateLinearParking(parkingStartPoint, state.canvas.getPointer(o.e));
exitAllModes();
}
clearEdgeSnapIndicator();
updateDashboard();
}
export function handleDblClick(o) {
    if ((state.currentMode === 'drawingPlot' || state.currentMode === 'drawingBuilding' || state.currentMode === 'drawingLinearBuilding') && polygonPoints.length > 1) {
        const pLast = polygonPoints[polygonPoints.length - 1];
        const pPrev = polygonPoints[polygonPoints.length - 2];
        if (pLast && pPrev && Math.hypot(pLast.x - pPrev.x, pLast.y - pPrev.y) < 2) {
            polygonPoints.pop();
        }
        const finalShape = state.currentMode === 'drawingLinearBuilding' ?
            new fabric.Polyline(polygonPoints, { selectable: false, evented: false, objectCaching: false, fill: 'transparent' }) :
            new fabric.Polygon(polygonPoints, { selectable: false, evented: false, objectCaching: false });
        resetDrawingState();
        handleFinishPolygon(finalShape);
    }
}
export function finishScaling() {
if (!scaleLine) return null;
const lengthInPixels = Math.hypot(scaleLine.x2 - scaleLine.x1, scaleLine.y2 - scaleLine.y1);
const lengthInMetersStr = document.getElementById('scale-distance').value;
const lengthInMeters = parseFloat(lengthInMetersStr);
if (lengthInMetersStr && !isNaN(lengthInMeters) && lengthInMeters > 0) {
return { pixels: lengthInPixels, meters: lengthInMeters };
}
return null;
}
export function drawMeasurement(ctx, p1, endPoint) {
    if (!ctx || !p1 || !endPoint || state.scale.ratio === 0) return;

    const vpt = state.canvas.viewportTransform;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // No clearing here, handleAfterRender does that
    ctx.setTransform(vpt[0], vpt[1], vpt[2], vpt[3], vpt[4], vpt[5]);
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(endPoint.x, endPoint.y);
    ctx.strokeStyle = '#f50057';
    ctx.lineWidth = 2 / state.canvas.getZoom();
    ctx.stroke();
    const distPixels = Math.hypot(endPoint.x - p1.x, endPoint.y - p1.y);
    const distMeters = distPixels * state.scale.ratio;
    const text = `${distMeters.toFixed(3)} m`;
    const midX = (p1.x + endPoint.x) / 2;
    const midY = (p1.y + endPoint.y) / 2;
    ctx.font = `${14 / state.canvas.getZoom()}px sans-serif`;
    const textMetrics = ctx.measureText(text);
    const textWidth = textMetrics.width;
    const textHeight = 14 / state.canvas.getZoom();
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = '#333';
    ctx.fillRect(midX - textWidth/2 - 5/state.canvas.getZoom(), midY - textHeight, textWidth + 10/state.canvas.getZoom(), textHeight + 5/state.canvas.getZoom());
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, midX, midY - textHeight/2 + 2/state.canvas.getZoom());
    ctx.restore();
}

// --- NEW POLYGON EDITING LOGIC ---

// Position handler for vertex controls
function polygonPositionHandler(dim, finalMatrix, fabricObject) {
    const pointIndex = this.pointIndex;
    const point = fabricObject.points[pointIndex];
    const adjustedPoint = { x: point.x - fabricObject.pathOffset.x, y: point.y - fabricObject.pathOffset.y };
    return fabric.util.transformPoint(adjustedPoint, fabric.util.multiplyTransformMatrices(fabricObject.canvas.viewportTransform, fabricObject.calcTransformMatrix()));
}

// Position handler for midpoint controls
function midpointPositionHandler(dim, finalMatrix, fabricObject) {
    const pointIndex = this.pointIndex;
    const p1 = fabricObject.points[pointIndex];
    const p2 = fabricObject.points[(pointIndex + 1) % fabricObject.points.length];
    const midpoint = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
    const adjustedMidpoint = { x: midpoint.x - fabricObject.pathOffset.x, y: midpoint.y - fabricObject.pathOffset.y };
    return fabric.util.transformPoint(adjustedMidpoint, fabric.util.multiplyTransformMatrices(fabricObject.canvas.viewportTransform, fabricObject.calcTransformMatrix()));
}

// Position handler for remove controls
function removePositionHandler(dim, finalMatrix, fabricObject) {
    const pointIndex = this.pointIndex;
    const point = fabricObject.points[pointIndex];
    const adjustedPoint = { x: point.x - fabricObject.pathOffset.x, y: point.y - fabricObject.pathOffset.y };
    const transformedPoint = fabric.util.transformPoint(adjustedPoint, fabric.util.multiplyTransformMatrices(fabricObject.canvas.viewportTransform, fabricObject.calcTransformMatrix()));
    const offset = 15;
    const angle = fabric.util.degreesToRadians(fabricObject.angle);
    const offsetX = Math.cos(angle + Math.PI / 4) * offset;
    const offsetY = Math.sin(angle + Math.PI / 4) * offset;
    return { x: transformedPoint.x - offsetX, y: transformedPoint.y - offsetY };
}

// Action handler for moving a vertex
function actionHandler(eventData, transform, x, y) {
    const polygon = transform.target;
    const currentControl = polygon.controls[transform.corner];
    const pointIndex = currentControl.pointIndex;

    const mouseLocalPosition = polygon.toLocalPoint(new fabric.Point(x, y), 'center', 'center');
    const finalPointPosition = {
        x: mouseLocalPosition.x + polygon.pathOffset.x,
        y: mouseLocalPosition.y + polygon.pathOffset.y
    };
    polygon.points[pointIndex] = finalPointPosition;
    const props = getPolygonProperties(polygon);
    document.getElementById('status-bar').textContent = `Editing... Area: ${f(props.area)} m² | Perimeter: ${f(props.perimeter, 1)} m`;
    return true;
}

// --- CUSTOM RENDERING FOR CONTROLS ---
function renderCircleControl(ctx, left, top, styleOverride, fabricObject) {
    const size = fabricObject.cornerSize;
    ctx.save();
    ctx.translate(left, top);
    ctx.rotate(fabric.util.degreesToRadians(fabricObject.angle));
    ctx.fillStyle = styleOverride.cornerColor || fabricObject.cornerColor;
    ctx.beginPath();
    ctx.arc(0, 0, size / 2, 0, 2 * Math.PI);
    ctx.fill();
    ctx.restore();
}

function renderPlusControl(ctx, left, top, styleOverride, fabricObject) {
    const size = fabricObject.cornerSize * 0.9;
    ctx.save();
    ctx.translate(left, top);
    ctx.rotate(fabric.util.degreesToRadians(fabricObject.angle));
    ctx.fillStyle = '#1a90ff';
    ctx.fillRect(-size / 2, -size / 2, size, size);
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-size / 4, 0); ctx.lineTo(size / 4, 0);
    ctx.moveTo(0, -size / 4); ctx.lineTo(0, size / 4);
    ctx.stroke();
    ctx.restore();
}

function renderRemoveControl(ctx, left, top, styleOverride, fabricObject) {
    const size = fabricObject.cornerSize * 0.7;
    ctx.save();
    ctx.translate(left, top);
    ctx.rotate(fabric.util.degreesToRadians(fabricObject.angle));
    ctx.fillStyle = '#ff4d4d';
    ctx.beginPath();
    ctx.arc(0, 0, size / 2, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 1.5;
    const crossSize = size / 4;
    ctx.beginPath();
    ctx.moveTo(-crossSize, -crossSize); ctx.lineTo(crossSize, crossSize);
    ctx.moveTo(crossSize, -crossSize); ctx.lineTo(-crossSize, crossSize);
    ctx.stroke();
    ctx.restore();
}

export function refreshEditablePolygon(polygon) {
    const controls = {};
    polygon.points.forEach((point, index) => {
        controls[`p${index}`] = new fabric.Control({
            positionHandler: polygonPositionHandler,
            actionHandler: actionHandler,
            actionName: 'modifyPolygon',
            pointIndex: index,
            render: renderCircleControl,
        });
        controls[`m${index}`] = new fabric.Control({
            positionHandler: midpointPositionHandler,
            actionName: 'addPolygonPoint',
            pointIndex: index,
            render: renderPlusControl,
            mouseDownHandler: (eventData, transform) => {
                const poly = transform.target;
                const currentControl = poly.controls[transform.corner];
                const pointIndex = currentControl.pointIndex;
                const p1 = poly.points[pointIndex];
                const p2 = poly.points[(pointIndex + 1) % poly.points.length];
                const newPoint = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
                poly.points.splice(pointIndex + 1, 0, newPoint);
                refreshEditablePolygon(poly);
                state.canvas.requestRenderAll();
                state.canvas.fire('mouse:up'); // <-- FIX: Release the mouse
                return true;
            }
        });
        controls[`r${index}`] = new fabric.Control({
            positionHandler: removePositionHandler,
            actionName: 'removePolygonPoint',
            pointIndex: index,
            render: renderRemoveControl,
            mouseDownHandler: (eventData, transform) => {
                const poly = transform.target;
                if (poly.points.length <= 3) return false;
                const currentControl = poly.controls[transform.corner];
                const pointIndex = currentControl.pointIndex;
                poly.points.splice(pointIndex, 1);
                refreshEditablePolygon(poly);
                state.canvas.requestRenderAll();
                state.canvas.fire('mouse:up'); // <-- FIX: Release the mouse
                return true;
            },
        });
    });
    polygon.controls = controls;
    polygon.hasBorders = false;
    polygon.setCoords();
}

export function makeFootprintEditable(polygon) {
    if (!polygon || !polygon.points) return;
    polygon.set({
        objectCaching: false, transparentCorners: false, cornerColor: '#007bff', cornerSize: 16,
        lockMovementX: true, lockMovementY: true, lockScalingX: true,
        lockScalingY: true, lockRotation: true, selectable: true, evented: true
    });

    refreshEditablePolygon(polygon);

    //polygon.on('modified', () => {const { min, max } = fabric.util.getBoundsOfPoints(polygon.points);
       // polygon.set({pathOffset: { x: min.x + (max.x - min.x) / 2, y: min.y + (max.y - min.y) / 2 },width: max.x - min.x, height: max.y - min.y,}).setCoords();
        //handleObjectModified({ target: polygon });
    //});
    polygon.setCoords();
}

export function makeFootprintUneditable(polygon) {
    if (!polygon) return;
    polygon.controls = fabric.Object.prototype.controls;
    polygon.off('modified');
    polygon.set({
        hasBorders: true, objectCaching: true,
        hasControls: true, lockMovementX: false, lockMovementY: false,
        lockScalingX: false, lockScalingY: false, lockRotation: false,
        selectable: false, evented: false,
    }).setCoords();
    state.canvas.renderAll();
}

export function placeServiceBlock(pointer, blockKeyOrData, levelOverride = null) {
    let blockData;
    if (typeof blockKeyOrData === 'string') {
        blockData = PREDEFINED_BLOCKS[blockKeyOrData];
    } else {
        blockData = blockKeyOrData;
    }
    
    if (!blockData || !state.scale.ratio) return;
    const blockWidth = blockData.width / state.scale.ratio;
    const blockHeight = blockData.height / state.scale.ratio;
    const colors = BLOCK_CATEGORY_COLORS[blockData.category || 'default'];
    const blockId = `SB-${state.serviceBlockCounter++}`;
    const rect = new fabric.Rect({ width: blockWidth, height: blockHeight, fill: colors.fill, stroke: colors.stroke, strokeWidth: 2, originX: 'center', originY: 'center', strokeUniform: true });
    const label = new fabric.Text(blockId, { fontSize: Math.min(blockWidth, blockHeight) * 0.2, fill: '#fff', backgroundColor: 'rgba(0,0,0,0.4)', originX: 'center', originY: 'center' });
    const lockIcon = new fabric.Text("🔒", { fontSize: Math.min(blockWidth, blockHeight) * 0.2, left: Math.min(blockWidth, blockHeight) * 0.2, originY: 'center', visible: true });

    const group = new fabric.Group([rect, label, lockIcon], {
        left: pointer.x, 
        top: pointer.y, 
        originX: 'center', 
        originY: 'center',
        isServiceBlock: true, 
        blockData: { ...blockData }, // Use a copy
        blockId: blockId, 
        level: levelOverride || state.currentLevel, 
        selectable: true,
        evented: true,
        lockScalingX: true,
        lockScalingY: true,
    });
    state.serviceBlocks.push(group);
    state.canvas.add(group);
    return group;
}

export function createCompositeGroup(compositeData, pointer) {
    if (!compositeData || state.scale.ratio === 0) return;
    const items = [];
    const compositeLevel = compositeData.level || state.currentLevel;
    compositeData.blocks.forEach(blockDef => {
        const blockData = PREDEFINED_BLOCKS[blockDef.key];
        if (!blockData) return;
        const blockWidth = (blockDef.w ?? blockData.width) / state.scale.ratio;
        const blockHeight = (blockDef.h ?? blockData.height) / state.scale.ratio;
        const colors = BLOCK_CATEGORY_COLORS[blockData.category || 'default'];
        const blockId = `SB-${state.serviceBlockCounter++}`;
        const rect = new fabric.Rect({ width: blockWidth, height: blockHeight, fill: colors.fill, stroke: colors.stroke, strokeWidth: 2, originX: 'center', originY: 'center', strokeUniform: true });
        const label = new fabric.Text(blockId, { fontSize: Math.min(blockWidth, blockHeight) * 0.2, fill: '#fff', backgroundColor: 'rgba(0,0,0,0.4)', originX: 'center', originY: 'center' });
        
        const x_px = (blockDef.x || 0) / state.scale.ratio;
        const y_px = (blockDef.y || 0) / state.scale.ratio;

        const subGroup = new fabric.Group([rect, label], {
            isServiceBlock: true, blockData: { ...blockData }, blockId: blockId, level: compositeLevel,
            left: x_px + blockWidth / 2, top: y_px + blockHeight / 2,
            selectable: false, evented: false
        });
        
        state.serviceBlocks.push(subGroup);
        items.push(subGroup);
    });
    const compositeGroup = new fabric.Group(items, { left: pointer.x, top: pointer.y, level: compositeLevel, isCompositeGroup: true, compositeDefName: compositeData.name });
    state.canvas.add(compositeGroup);
    return compositeGroup;
}