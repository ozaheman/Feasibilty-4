
// MODULE 7: PARKING LAYOUT (parkingLayout.js equivalent)
// =====================================================================
 import { state } from './state.js';
import { getCanvas } from './canvasController.js';
import { updateParkingDisplay   } from './uiController.js';

export function calculateBaysForLength(lineLengthMeters, parkingType) {
    const BAY_W = 2.5, END_BAY_W = 2.8, BAY_L = 5.5, COL_W = 0.4;
    let stallAngleDeg = 90;
    if (parkingType === 'angle60') stallAngleDeg = 60;
    if (parkingType === 'angle45') stallAngleDeg = 45;
    if (parkingType === 'angle30') stallAngleDeg = 30;
    let currentDist = 0;
    let bayCount = 0;
    while (currentDist < lineLengthMeters) {
        const isFirstOrLast = bayCount === 0;
        let currentBayW_meters;
        if (parkingType === 'parallel') {
            currentBayW_meters = BAY_L;
        } else {
            const angleRad = stallAngleDeg * Math.PI / 180;
            currentBayW_meters = (isFirstOrLast ? END_BAY_W : BAY_W) / Math.sin(angleRad);
        }
        if (currentDist + currentBayW_meters > lineLengthMeters) break;
        currentDist += currentBayW_meters;
        bayCount++;
        if (bayCount > 0 && bayCount % 3 === 0 && parkingType !== 'parallel') {
            if (currentDist + COL_W > lineLengthMeters) break;
            currentDist += COL_W;
        }
    }
    return bayCount;
}

export function createParkingGeometry(lineLengthMeters, parkingType, rowType, totalBayCount, scaleRatio) {
    const BAY_W = 2.5, END_BAY_W = 2.8, BAY_L = 5.5, COL_W = 0.4, COL_L = 0.9, LANE_W = 6.0;
    let objectsInRow = [];
    const createBaysForSide = () => {
        let stallAngleDeg = 90, stallL = BAY_L;
        if (parkingType === 'parallel') {
            stallAngleDeg = 0;
            stallL = BAY_W;
        } else {
            if (parkingType === 'angle60') stallAngleDeg = 60;
            if (parkingType === 'angle45') stallAngleDeg = 45;
            if (parkingType === 'angle30') stallAngleDeg = 30;
            const angleRad = stallAngleDeg * Math.PI / 180;
            stallL = (BAY_L * Math.sin(angleRad) + BAY_W * Math.cos(angleRad));
        }
        let bayObjects = [];
        let currentDist = 0;
        let bayCount = 0;
        const numBays = (rowType === 'double') ? Math.ceil(totalBayCount / 2) : totalBayCount;
        while (bayCount < numBays && currentDist < lineLengthMeters) {
            const isFirst = bayCount === 0;
            let currentBayW_meters;
             if (parkingType === 'parallel') {
                currentBayW_meters = BAY_L;
            } else {
                const angleRad = stallAngleDeg * Math.PI / 180;
                currentBayW_meters = (isFirst ? END_BAY_W : BAY_W) / Math.sin(angleRad);
            }
            if (currentDist + currentBayW_meters > lineLengthMeters) break;
            const bay = new fabric.Rect({
                width: currentBayW_meters / scaleRatio, height: stallL / scaleRatio,
                fill: 'rgba(0, 100, 255, 0.4)', stroke: '#00f', strokeWidth: 1,
                angle: 90 - stallAngleDeg,
                left: (currentDist + currentBayW_meters / 2) / scaleRatio, top: (stallL / 2) / scaleRatio,
                originX: 'center', originY: 'center',
                strokeUniform: true
            });
            bayObjects.push(bay);
            currentDist += currentBayW_meters;
            bayCount++;
        }
        return { bays: bayObjects, depth: stallL };
    };
    const side1Data = createBaysForSide();
    objectsInRow.push(...side1Data.bays);
    const lane_top_px = side1Data.depth / scaleRatio;
    const driveLane = new fabric.Rect({
        width: lineLengthMeters / scaleRatio, height: LANE_W / scaleRatio,
        fill: 'rgba(100, 100, 100, 0.3)', left: 0, top: lane_top_px, originX: 'left', originY: 'top'
    });
    objectsInRow.push(driveLane);
    if (rowType === 'double') {
        const side2Data = createBaysForSide();
        const second_row_top_px = lane_top_px + (LANE_W / scaleRatio);
        side2Data.bays.forEach(obj => {
            obj.top += second_row_top_px;
            obj.angle = -obj.angle;
        });
        objectsInRow.push(...side2Data.bays);
    }
    const bayCountText = new fabric.Text(String(totalBayCount), {
        left: (lineLengthMeters / 2) / scaleRatio, top: lane_top_px + (LANE_W / 2 / scaleRatio),
        originX: 'center', originY: 'center', fontSize: 16, fill: 'black', backgroundColor: 'rgba(255,255,255,0.7)'
    });
    objectsInRow.push(bayCountText);
    return objectsInRow;
}

export function generateLinearParking(startPt, endPt) {
    const parkingType = document.getElementById('parking-type').value;
    const rowType = document.getElementById('row-type').value;
    const dx = endPt.x - startPt.x;
    const dy = endPt.y - startPt.y;
    const lineLengthMeters = Math.hypot(dx, dy) * state.scale.ratio;
    if (lineLengthMeters === 0) return;
    const singleSideCount = calculateBaysForLength(lineLengthMeters, parkingType);
    const totalBayCount = singleSideCount * (rowType === 'double' ? 2 : 1);
    const objectsInRow = createParkingGeometry(lineLengthMeters, parkingType, rowType, totalBayCount, state.scale.ratio);
    
    if (objectsInRow.length > 0) {
        const group = new fabric.Group(objectsInRow, {
            left: startPt.x, top: startPt.y,
            angle: Math.atan2(dy, dx) * 180 / Math.PI,
            originX: 'left', originY: 'top',
            isParkingRow: true, level: state.currentLevel,
            parkingCount: totalBayCount, parkingParams: { parkingType, rowType },
            lockScalingY: true, lockUniScaling: true,
        });
        state.parkingRows.push(group);
        state.canvas.add(group);
        state.canvas.setActiveObject(group).renderAll();
        updateParkingDisplay();
    }
}

export function regenerateParkingInGroup(group, scaleRatio) {
    const params = group.parkingParams;
    const newWidthPixels = group.getScaledWidth();
    const newLineLengthMeters = newWidthPixels * scaleRatio;
    const newBayCount = calculateBaysForLength(newLineLengthMeters, params.parkingType) * (params.rowType === 'double' ? 2 : 1);
    const objectsToRemove = group.getObjects().slice();
    objectsToRemove.forEach(obj => group.remove(obj));
    const newObjects = createParkingGeometry(newLineLengthMeters, params.parkingType, params.rowType, newBayCount, scaleRatio);
    newObjects.forEach(obj => group.addWithUpdate(obj));
    group.set({ width: newWidthPixels, scaleX: 1, parkingCount: newBayCount });
    group.setCoords();
}