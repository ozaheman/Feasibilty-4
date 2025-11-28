// MODULE 5: DRAWING TOOLS & SNAPPING (drawingTools.js equivalent)
// =====================================================================
import { getCanvas  } from './canvasController.js';
import { resetState,state } from './state.js';
import { pointToLineSegmentDistance,getLineIntersection,allocateCountsByPercent,f,fInt  ,getPolygonProperties } from './utils.js';
import { initUI, updateUI,applyLevelVisibility,updateLevelFootprintInfo , updateParkingDisplay,updateMixTotal   } from './uiController.js';
import { exitAllModes, handleFinishPolygon } from './eventHandlers.js';
import { generateLinearParking } from './parkingLayoutUtils.js';

import { layoutFlatsOnPolygon} from './apartmentLayout.js';
window.snapIndicators=null;

export function initDrawingTools() {
    snapIndicators = new fabric.Group([], { evented: false, selectable: false, isSnapIndicator: true });
    state.canvas.add(snapIndicators);
}
export function resetDrawingState() {
    polygonPoints = [];
    if (currentDrawingPolygon) state.canvas.remove(currentDrawingPolygon);
    currentDrawingPolygon = null;
    if (scaleLine)  state.canvas.remove(scaleLine);
    scaleLine = null;
    if (guideLine)  state.canvas.remove(guideLine);
    guideLine = null;
    if (alignmentHighlight)  state.canvas.remove(alignmentHighlight);
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
            radius: 10 / state.canvas.getZoom(), fill: 'transparent',
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
            if (polygonPoints.length > 2 && Math.hypot(pointer.x - polygonPoints[0].x, pointer.y - polygonPoints[0].y) < 10 / state.canvas.getZoom()) {
                const finalPolygon = new fabric.Polygon(polygonPoints, { selectable: false, evented: false, objectCaching: false });
                resetDrawingState();
                return { action: 'finishPolygon', polygon: finalPolygon };
            }
            polygonPoints.push({ x: pointer.x, y: pointer.y });
            if (!currentDrawingPolygon) {
                 const newPoints = [...polygonPoints, { x: pointer.x, y: pointer.y }];
                 const isClosedPreview = document.getElementById('auto-close-preview-check').checked;
                 const options = {
                    stroke: '#f50057', strokeWidth: 2, fill: isClosedPreview ? 'rgba(245, 0, 87, 0.2)' : 'transparent', 
                    selectable: false, evented: false, objectCaching: false, strokeUniform: true,
                 };
                currentDrawingPolygon = isClosedPreview ? new fabric.Polygon(newPoints, options) : new fabric.Polyline(newPoints, options);
                state.canvas.add(currentDrawingPolygon);
            }
            break;
    }
    return null;
}
export function handleCanvasMouseMove(o) {
   
    let pointer = state.canvas.getPointer(o.e);
    let liveLayoutData = null;
    let liveUnitCounts = null;

    if (['drawingPlot', 'drawingBuilding', 'drawingGuide', 'scaling', 'measuring'].includes(state.currentMode)) {
        const snapPoint = findSnapPoint(pointer);
        updateSnapIndicators(snapPoint);
        if (snapPoint) { pointer.x = snapPoint.x; pointer.y = snapPoint.y; }
    }

    switch (state.currentMode) {
        case 'scaling':
       
            if (scaleLine) { scaleLine.set({ x2: pointer.x, y2: pointer.y }); }
            break;
        case 'drawingPlot':
        case 'drawingBuilding':
            if (currentDrawingPolygon) {
                const newPoints = [...polygonPoints, { x: pointer.x, y: pointer.y }];
                 if (currentDrawingPolygon.type === 'polygon') {
                    currentDrawingPolygon.set({ points: newPoints });
                } else {
                    currentDrawingPolygon.points[currentDrawingPolygon.points.length - 1] = { x: pointer.x, y: pointer.y };
                }

                const isLayoutLevel = state.currentLevel === 'Typical_Floor' || state.currentLevel === 'Hotel';
                
                if (state.currentMode === 'drawingBuilding' && isLayoutLevel && newPoints.length > 2 && state.currentProgram) {
                    const tempFabricPoly = new fabric.Polygon(newPoints);
                    const tempPerimeter = getPolygonProperties(tempFabricPoly).perimeter;
                    const program = state.currentProgram;
                    const totalMix = program.unitTypes.reduce((sum, t) => sum + (t.mix || 0), 0) || 1;
                    
                    const avgFrontage = program.unitTypes.reduce((acc, unit) => {
                        return acc + ((unit.frontage || 0) * ((unit.mix || 0) / totalMix));
                    }, 0);

                    if (avgFrontage > 0) {
                        const estimatedUnits = Math.floor(tempPerimeter / avgFrontage);
                        const counts = allocateCountsByPercent(estimatedUnits, program.unitTypes);
                        const includeBalconies = document.getElementById('show-balconies-check').checked;
                        const calcMode = document.getElementById('apartment-calc-mode').value;
                        const doubleLoaded = document.getElementById('double-loaded-corridor').checked;
                        liveLayoutData = layoutFlatsOnPolygon(tempFabricPoly, counts, includeBalconies, calcMode, doubleLoaded);
                        
                        if (liveLayoutData?.corridorArea > 0) {
                            document.getElementById('status-bar').textContent = `Drawing... Corridor Area: ${f(liveLayoutData.corridorArea)} m²`;
                        }
                        liveUnitCounts = counts; // Pass counts back up for parking update
                    }
                }
            }
            break;
    }
    
    state.livePreviewLayout = liveLayoutData;
    if (liveUnitCounts) updateParkingDisplay(liveUnitCounts);
    state.canvas.renderAll();
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
    if ((state.currentMode === 'drawingPlot' || state.currentMode === 'drawingBuilding') && polygonPoints.length > 2) {
        const finalPolygon = new fabric.Polygon(polygonPoints, { selectable: false, evented: false, objectCaching: false });
        resetDrawingState();
        handleFinishPolygon(finalPolygon);
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
export function drawMeasurement(ctx, p1, o) {
    if (!ctx || !p1 || !o || state.scale.ratio === 0) return;

    const pointer = state.canvas.getPointer(o);
    const snapPoint = findSnapPoint(pointer);
    const endPoint = snapPoint ? snapPoint : pointer;

    const vpt = state.canvas.viewportTransform;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
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