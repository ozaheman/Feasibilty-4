window.objectToAlign = null;
window.currentLevelOp = { mode: null, object: null };
window.currentlyEditingCompositeIndex = -1;
window.tempCompositeData = null;
window.currentPdfData = null; // Manage PDF buffer here for file handling flow
window.isMeasuring = false;
window.scalePoint1 = null;

window.snapIndicators;
window.scaleLine = null;
window.edgeSnapIndicator =null;
window.currentDrawingPolygon = null;
window.guideLine = null;
window.overlayCtx=null;
window.overlayCanvas=null;

window.parkingStartPoint = null;
window.parkingLine = null;
window.selectedCompositeBlockData = null;

window.edgeSnapIndicator = null;
window.isEditingGroup = false;
window.groupBeingEdited = null;
window.snapThreshold = 15; // Pixels for snapping
window.addDrawingPoint=null;
window.measurePoint1 = null;

window.finalpolygonPoints = [];
window.polygonPoints = [];
window.isPanning =false;
window.alignmentHighlight=null,
window.lastPanPoint=null; 
window.scaleReady=null;
window.currentlyEditingUnitKey = null;
window.tempUnitData= null;
window.inputs = {};
import { initCanvas } from './canvasController.js';
import { initUI,updateUI  } from './uiController.js';
import { initDrawingTools } from './drawingTools.js';
import { init3D } from './viewer3d.js';
import { setupEventListeners } from './eventHandlers.js';
import { resetState, state } from './state.js';

document.addEventListener('DOMContentLoaded', () => {
    initCanvas('plot-canvas', 'overlay-canvas');
    initDrawingTools();
    init3D();
    initUI();
    setupEventListeners();
resetState();
updateUI();
});