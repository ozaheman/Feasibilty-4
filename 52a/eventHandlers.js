//--- START OF FILE eventHandlers.js ---

// MAIN EXECUTION & INITIALIZATION
// =====================================================================
import { initCanvas, resetZoom,renderPdfToBackground,zoomCanvas ,getCanvas ,clearOverlay ,setCanvasBackground ,getOverlayContext ,redrawApartmentPreview, zoomToObject, drawLiveDimension  } from './canvasController.js';
import { resetState,setCurrentLevel,state,setCurrentMode,setScale, toggleAllLayersVisibility ,rehydrateProgram  } from './state.js';
import { initDrawingTools,handleDblClick, getSetbackPolygonPoints,handleCanvasMouseMove,clearSetbackGuides,clearEdgeHighlight,updateAlignmentHighlight,resetDrawingState,handleCanvasMouseDown,clearEdgeSnapIndicator ,finishScaling,drawSetbackGuides,findSnapPoint ,updateSnapIndicators,drawMeasurement, getClickedPlotEdge, findNearestParkingEdge, getNearestEdge, snapObjectToEdge, alignObjectToEdge , updateEdgeHighlight, getClickedPolygonEdge, makeFootprintEditable, makeFootprintUneditable, refreshEditablePolygon, addDrawingPoint            } from './drawingTools.js'; 
import { regenerateParkingInGroup, generateLinearParking   } from './parkingLayoutUtils.js';
import { init3D,generate3DBuilding , generateOpenScadScript  } from './viewer3d.js';
import { initUI, updateUI,displayHotelRequirements ,placeSelectedComposite, handleConfirmLevelOp  ,applyLevelVisibility ,updateLevelFootprintInfo ,renderServiceBlockList,updateSelectedObjectControls , openLevelOpModal,updateParkingDisplay,toggleFloatingPanel,updateDashboard,toggleBlockLock, saveUnitChanges, openNewCompositeEditor, editSelectedComposite, deleteSelectedComposite, saveCompositeChanges, addSubBlockToCompositeEditor, applyScenario, toggleApartmentMode, openEditUnitModal,updateLevelCounts, populateServiceBlocksDropdown, updateProgramUI ,updateMixTotal, updateScreenshotGallery, openAreaStatementModal     } from './uiController.js';
import { exportReportAsPDF,generateReport  } from './reportGenerator.js';
import { PROJECT_PROGRAMS, AREA_STATEMENT_DATA ,PREDEFINED_BLOCKS , BLOCK_CATEGORY_COLORS, LEVEL_ORDER , SETBACK_RULES} from './config.js';
import { allocateCountsByPercent, getPolygonProperties, getOffsetPolygon, isPointInRotatedRect, getPolygonFromPolyline } from './utils.js';
import { layoutFlatsOnPolygon } from './apartmentLayout.js';
import { handleDxfUpload, assignDxfAsPlot,finalizeDxf,deleteDxf,updateDxfStrokeWidth, exportProjectZIP, importProjectZIP, exportServiceBlocksCSV, importServiceBlocksCSV  } from './io.js';
import { recordAction } from './actionRecorder.js'; // NEW: for action recorder
import { updateSubstationSize } from './feasibilityEngine.js';

let dimensionInputEl = null;
// --- MODIFICATION START: New function for automatic setbacks ---
export function calculateAndApplySetbacks() {
    if (!state.plotPolygon || !document.getElementById('auto-setback-toggle').checked) {
        return;
    }

    const params = {};
    document.querySelectorAll('.param-input').forEach(input => {
        if (input.type === 'number') params[input.id] = parseInt(input.value) || 0;
    });

    // Calculate total floors above ground. G = 1, G+1 = 2, etc.
    const totalFloorsAboveGround = 1 + (params.numMezzanines || 0) + (params.numPodiums || 0) + (params.numTypicalFloors || 0) + (params.numHotelFloors || 0);

    let neighborSetback = 0;
    let roadSetback = 0;

    const rule = SETBACK_RULES.find(r => totalFloorsAboveGround >= r.minFloors && totalFloorsAboveGround <= r.maxFloors);
    
    if (rule) {
        neighborSetback = rule.neighbor;
        roadSetback = rule.road;
    }

    if (state.plotEdgeProperties.length > 0) {
        state.plotEdgeProperties.forEach(prop => {
            if (prop.type === 'neighbor') {
                prop.distance = neighborSetback;
            } else if (prop.type === 'road') {
                prop.distance = roadSetback;
            }
        });
        
        drawSetbackGuides();

        if (state.currentMode === 'editingSetback' && state.selectedPlotEdges.length > 0) {
            const firstSelectedProps = state.plotEdgeProperties[state.selectedPlotEdges[0]];
            document.getElementById('individual-setback-dist').value = firstSelectedProps.distance;
            const typeRadio = document.getElementById(`edge-type-${firstSelectedProps.type}`);
            if (typeRadio) typeRadio.checked = true;
        }

        document.getElementById('status-bar').textContent = `Auto-setbacks applied: Neighbor=${neighborSetback}m, Road=${roadSetback}m.`;
    }
}
// --- MODIFICATION END ---
function removeDimensionInput() {
    if (dimensionInputEl) {
        document.body.removeChild(dimensionInputEl);
        dimensionInputEl = null;
        state.canvas.defaultCursor = 'crosshair';
    }
}

function commitDimensionInput() {
    if (!dimensionInputEl) return;
    const distMeters = parseFloat(dimensionInputEl.value);
    removeDimensionInput(); 
    if (isNaN(distMeters) || distMeters <= 0 || state.scale.ratio === 0) return;

    const distPixels = distMeters / state.scale.ratio;
    const lastPt = polygonPoints[polygonPoints.length - 1];
    const mousePt = state.lastMousePointer;

    if (!lastPt || !mousePt) return;
    
    const dx = mousePt.x - lastPt.x;
    const dy = mousePt.y - lastPt.y;
    const currentDist = Math.hypot(dx, dy);

    if (currentDist === 0) return;

    const unitVec = { x: dx / currentDist, y: dy / currentDist };
    const newPoint = {
        x: lastPt.x + unitVec.x * distPixels,
        y: lastPt.y + unitVec.y * distPixels
    };

    addDrawingPoint(newPoint);
}

function showDimensionInput() {
    removeDimensionInput();
    const point = state.lastMousePointer;
    if (!point) return;

    const vpt = state.canvas.viewportTransform;
    const canvasRect = state.canvas.getElement().getBoundingClientRect();
    const screenX = point.x * vpt[0] + vpt[4] + canvasRect.left;
    const screenY = point.y * vpt[3] + vpt[5] + canvasRect.top;

    dimensionInputEl = document.createElement('input');
    dimensionInputEl.type = 'text';
    dimensionInputEl.style.position = 'absolute';
    dimensionInputEl.style.left = `${screenX + 15}px`;
    dimensionInputEl.style.top = `${screenY + 15}px`;
    dimensionInputEl.style.zIndex = '10001';
    dimensionInputEl.style.padding = '5px';
    dimensionInputEl.style.border = '2px solid var(--primary-color)';
    dimensionInputEl.style.borderRadius = '4px';
    dimensionInputEl.style.boxShadow = '0 2px 10px rgba(0,0,0,0.3)';
    dimensionInputEl.placeholder = "Enter distance (m)";

    dimensionInputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); commitDimensionInput(); } 
        else if (e.key === 'Escape') { e.preventDefault(); removeDimensionInput(); }
    });

    document.body.appendChild(dimensionInputEl);
    dimensionInputEl.focus();
}

function handleGlobalKeyDown(e) {
    const isDrawingPoly = ['drawingPlot', 'drawingBuilding', 'drawingLinearBuilding', 'drawingCorridor'].includes(state.currentMode) && polygonPoints.length > 0;
    
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
        return;
    }
    
    if (e.key === 'Escape' && state.currentMode) {
        e.preventDefault();
        exitAllModes();
    }


    if (isDrawingPoly && ((e.key >= '0' && e.key <= '9') || e.key === '.')) {
        e.preventDefault();
        showDimensionInput();
        dimensionInputEl.value = e.key;
    }
}

export function setupEventListeners() {
     if (!state.canvas) {
        console.error("Canvas not initialized when setting up listeners");
        return;
    }
    state.canvas.on('mouse:down', handleMouseDown);
    state.canvas.on('mouse:move', handleMouseMove);
    state.canvas.on('mouse:up', handleMouseUp);
    state.canvas.on('mouse:dblclick', handleDblClick);
    state.canvas.on('after:render', handleAfterRender);
    state.canvas.on('selection:created', (e) => updateSelectedObjectControls(e.target));
    state.canvas.on('selection:updated', (e) => updateSelectedObjectControls(e.target));
    state.canvas.on('selection:cleared', () => updateSelectedObjectControls(null));
    state.canvas.on('object:modified', (e) => {
        updateSelectedObjectControls(e.target);
        handleObjectModified(e);
        updateDashboard();
        if(e.target.isFootprint) updateLevelFootprintInfo();
    });
    state.canvas.on('object:scaling',handleObjectScaling);
    state.canvas.on('object:moving', handleObjectMoving);
    
    document.getElementById('floating-header').addEventListener('click', toggleFloatingPanel);
   // --- MODIFICATION START: Update param-input listener ---
    document.querySelectorAll('.param-input').forEach(inp => {
        const eventType = inp.type === 'checkbox' ? 'change' : 'input';
        inp.addEventListener(eventType, () => { 
            updateLevelCounts(); 
            calculateAndApplySetbacks(); // This is the new call
            handleCalculate(true); 
            updateDashboard(); // updateDashboard was missing, re-added it
        });
    });
    // --- MODIFICATION END ---
    document.getElementById('toggle-lock-btn').addEventListener('click', toggleBlockLock);
    document.getElementById('zip-upload').addEventListener('change', handleImportZIP);
    document.getElementById('export-zip-btn').addEventListener('click', async () => {
        document.getElementById('status-bar').textContent = 'Generating project zip... Please wait.';
        try {
            await exportProjectZIP(state.canvas);
            document.getElementById('status-bar').textContent = 'Project exported successfully.';
        } catch (error) {
            console.error("Failed to export ZIP:", error);
            document.getElementById('status-bar').textContent = `Error exporting project: ${error.message}`;
        }
    });
    document.getElementById('dxf-upload').addEventListener('change', handleDxfUpload);
    document.getElementById('assign-dxf-plot-btn').addEventListener('click', assignDxfAsPlot);
    document.getElementById('zoom-to-dxf-btn').addEventListener('click', () => zoomToObject(state.dxfOverlayGroup));
    document.getElementById('finalize-dxf-btn').addEventListener('click', finalizeDxf);
    document.getElementById('delete-dxf-btn').addEventListener('click', deleteDxf);
    document.getElementById('dxf-stroke-width').addEventListener('input', updateDxfStrokeWidth);
    document.getElementById('edit-footprint-btn').addEventListener('click', () => enterMode('editingFootprint'));
    document.getElementById('confirm-footprint-btn').addEventListener('click', confirmFootprintEdit);
    document.getElementById('delete-footprint-btn').addEventListener('click', deleteSelectedObject);
    document.getElementById('plan-upload').addEventListener('change', handlePlanUpload);

    const uploadLabel = document.querySelector('label[for="plan-upload"]');
    if (uploadLabel) {
        // Prevent default browser behavior to allow drop
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadLabel.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            }, false);
        });

        // Add visual feedback for drag-over
        ['dragenter', 'dragover'].forEach(eventName => {
            uploadLabel.addEventListener(eventName, () => {
                uploadLabel.style.backgroundColor = '#f50057'; // Use accent color
                uploadLabel.style.border = '2px dashed white';
            }, false);
        });

        // Remove visual feedback
        ['dragleave', 'drop'].forEach(eventName => {
            uploadLabel.addEventListener(eventName, () => {
                uploadLabel.style.backgroundColor = ''; // Revert to default
                uploadLabel.style.border = '';
            }, false);
        });

        // Handle the file drop
        uploadLabel.addEventListener('drop', (e) => {
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                // Pass the dropped files to the existing upload handler
                handlePlanUpload({ target: { files: e.dataTransfer.files } });
            }
        });
    }

    document.getElementById('pdf-page').addEventListener('change', handlePdfPageChange);
    document.getElementById('set-scale-btn').addEventListener('click', () => {
        if (state.currentMode === 'scaling') {
            exitAllModes();
        } 
        else { 
            enterMode('scaling'); 
            document.getElementById('status-bar').textContent = 'Click the start point of a known distance.'; 
        }
    });
   document.getElementById('measure-tool-btn').addEventListener('click', () => {
        if (state.currentMode === 'measuring') {
            exitAllModes();
        } else {
            enterMode('measuring');
        }
    });
    document.getElementById('level-selector').addEventListener('click', handleLevelSelect);
    document.getElementById('toggle-visibility-btn').addEventListener('click', handleToggleVisibility);
    document.getElementById('draw-plot-btn').addEventListener('click', () => enterMode('drawingPlot'));
    document.getElementById('draw-guide-btn').addEventListener('click', () => enterMode('drawingGuide'));
    document.getElementById('draw-building-btn').addEventListener('click', () => enterMode('drawingBuilding'));
    // New Button Listener
    document.getElementById('draw-linear-btn').addEventListener('click', () => enterMode('drawingLinearBuilding'));
     document.getElementById('draw-corridor-btn').addEventListener('click', () => enterMode('drawingCorridor'));
    
    document.getElementById('footprint-from-setbacks-btn').addEventListener('click', createFootprintFromSetbacks);
    document.getElementById('footprint-from-plot-btn').addEventListener('click', createFootprintFromPlot);
    document.getElementById('draw-parking-btn').addEventListener('click', () => enterMode('drawingParking'));
    document.getElementById('draw-parking-on-edge-btn').addEventListener('click', () => enterMode('drawingParkingOnEdge'));
    document.getElementById('draw-bus-bay-btn').addEventListener('click', () => enterMode('drawingBusBay'));
    document.getElementById('draw-loading-bay-btn').addEventListener('click', () => enterMode('drawingLoadingBay'));
    document.getElementById('edit-setbacks-btn').addEventListener('click', () => enterMode('editingSetback'));
    document.getElementById('apply-individual-setback-btn').addEventListener('click', applyIndividualSetbacks);
    document.getElementById('clear-setback-selection-btn').addEventListener('click', clearSetbackSelection);
    document.getElementById('project-type-select').addEventListener('change', handleProjectTypeChange);
    
    document.getElementById('view-hotel-reqs-btn').addEventListener('click', displayHotelRequirements);
    document.getElementById('close-hotel-req-btn').addEventListener('click', () => { document.getElementById('hotel-req-modal').style.display = 'none'; });
    
    document.querySelectorAll('.param-input').forEach(input => {
        const eventType = input.type === 'checkbox' ? 'change' : 'input';
        input.addEventListener(eventType, () => { updateLevelCounts(); handleCalculate(true); });
    });
    document.getElementById('calculateBtn').addEventListener('click', () => handleCalculate(false, false));
    document.getElementById('generateDetailedReportBtn').addEventListener('click', () => handleCalculate(false, true));
    document.getElementById('add-block-btn').addEventListener('click', () => enterMode('placingBlock'));
    document.getElementById('serviceBlockType').addEventListener('change', handleBlockTypeChange);
    document.getElementById('delete-block-btn').addEventListener('click', deleteSelectedObject);
    document.getElementById('flip-h-btn').addEventListener('click', () => flipSelectedObject('X'));
    document.getElementById('flip-v-btn').addEventListener('click', () => flipSelectedObject('Y'));
    document.getElementById('rotate-90-btn').addEventListener('click', rotateSelectedObject90);
    document.getElementById('align-block-btn').addEventListener('click', startAlignment);
    document.getElementById('move-level-btn').addEventListener('click', () => openLevelOpModal('move'));
    document.getElementById('copy-to-levels-btn').addEventListener('click', () => openLevelOpModal('copy'));
    document.getElementById('block-rotation').addEventListener('change', rotateSelectedObject);
    document.getElementById('block-width').addEventListener('change', () => updateBlockDimension('width'));
    document.getElementById('block-height').addEventListener('change', () => updateBlockDimension('height'));
    
    // Substation listeners
    document.getElementById('substation-tcl').addEventListener('input', () => updateSubstationSize(state.canvas.getActiveObject()));
    document.getElementById('substation-num-tx').addEventListener('input', () => updateSubstationSize(state.canvas.getActiveObject()));


    document.getElementById('place-composite-btn').addEventListener('click', placeSelectedComposite);
    document.getElementById('edit-composite-btn').addEventListener('click', editSelectedComposite);
    document.getElementById('new-composite-btn').addEventListener('click', openNewCompositeEditor);
    document.getElementById('delete-composite-btn').addEventListener('click', deleteSelectedComposite);
    document.getElementById('save-composite-btn').addEventListener('click', saveCompositeChanges);
    document.getElementById('cancel-composite-btn').addEventListener('click', () => document.getElementById('edit-composite-modal').style.display = 'none');
    document.getElementById('add-sub-block-btn').addEventListener('click', addSubBlockToCompositeEditor);
    document.getElementById('scenarioSelect').addEventListener('change', (e) => applyScenario(e.target.value));
    document.getElementById('dist-sliders').addEventListener('input', handleMixerInputChange);
    document.querySelectorAll('input[name="apt-mode"]').forEach(radio => { radio.addEventListener('change', (e) => toggleApartmentMode(e.target.value)); });
     document.getElementById('double-loaded-corridor').addEventListener('change', handlePreviewLayout);
    document.getElementById('apartment-calc-mode').addEventListener('change', handlePreviewLayout);
     document.getElementById('balcony-placement').addEventListener('change', handlePreviewLayout);
    const parkingOverrideCheck = document.getElementById('parking-override-check');
    const parkingOverrideValue = document.getElementById('parking-override-value');
    parkingOverrideCheck.addEventListener('change', () => { parkingOverrideValue.disabled = !parkingOverrideCheck.checked; handleCalculate(true); });
    parkingOverrideValue.addEventListener('input', () => handleCalculate(true));
    
    document.getElementById('unit-cards-container').addEventListener('click', handleUnitCardClick);
    document.getElementById('save-unit-btn').addEventListener('click', saveUnitChanges);
    document.getElementById('cancel-unit-btn').addEventListener('click', () => { document.getElementById('edit-unit-modal').style.display = 'none'; currentlyEditingUnitKey = null; });
    document.getElementById('confirm-level-op-btn').addEventListener('click', handleConfirmLevelOp);
    document.getElementById('cancel-level-op-btn').addEventListener('click', () => document.getElementById('level-op-modal').style.display = 'none');
    document.getElementById('export-pdf-btn').addEventListener('click', exportReportAsPDF);
    document.getElementById('generate3dBtn').addEventListener('click', generate3DBuilding);
    document.getElementById('exportScadBtn').addEventListener('click', generateOpenScadScript);
    document.getElementById('align-core-btn').addEventListener('click', alignCoreElements);
    document.getElementById('previewLayoutBtn').addEventListener('click', handlePreviewLayout);
    document.getElementById('show-balconies-check').addEventListener('change', handlePreviewLayout);
    document.getElementById('show-corridor-check').addEventListener('change', handlePreviewLayout);
    document.getElementById('zoom-in-btn').addEventListener('click', () => zoomCanvas(1.2));
    document.getElementById('zoom-out-btn').addEventListener('click', () => zoomCanvas(1 / 1.2));
    document.getElementById('zoom-reset-btn').addEventListener('click', resetZoom);
    document.getElementById('pan-btn').addEventListener('click', () => enterMode('panning'));
    document.getElementById('edit-group-btn').addEventListener('click', enterGroupEditMode);
    document.getElementById('confirm-group-edit-btn').addEventListener('click', exitGroupEditMode);
    
    // NEW CSV LISTENERS
    document.getElementById('export-blocks-csv-btn').addEventListener('click', exportServiceBlocksCSV);
    document.getElementById('import-blocks-csv-upload').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            importServiceBlocksCSV(file, () => {
                // Callback after import completes
                renderServiceBlockList();
                applyLevelVisibility();
                state.canvas.renderAll();
            });
        }
        e.target.value = ''; // Reset file input
    });

    document.getElementById('area-statement-btn').addEventListener('click', openAreaStatementModal);
    document.getElementById('close-area-statement-btn').addEventListener('click', () => document.getElementById('area-statement-modal').style.display = 'none');
    document.getElementById('save-area-statement-btn').addEventListener('click', saveAreaStatementChanges);
    document.getElementById('reset-area-overrides-btn').addEventListener('click', resetAreaOverrides);
    document.getElementById('add-manual-area-btn').addEventListener('click', addManualAreaEntry);
    document.getElementById('select-tool-btn').addEventListener('click', () => exitAllModes());
    document.getElementById('block-category-select').addEventListener('change', handleCategoryChange);

    // NEW: Listener for PDF detail toggle
    document.querySelectorAll('input[name="report-detail"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const showGallery = e.target.value === 'full';
            document.getElementById('screenshot-gallery-wrapper').style.display = showGallery ? 'block' : 'none';
        });
    });
    // NEW: Listener for clicks within the report to trigger overrides
    document.getElementById('report-container').addEventListener('click', handleReportClick);

    window.addEventListener('keydown', e => {
        if (e.code === 'Space' && !state.currentMode && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement)) {
            e.preventDefault(); enterMode('panning');
        }
        handleGlobalKeyDown(e);
    });
    window.addEventListener('keyup', e => {
        if (e.code === 'Space' && state.currentMode === 'panning') { exitAllModes(); }
    });
}
function handleReportClick(e) {
    // Check if the clicked element or its parent is an editable value
    const editableTarget = e.target.closest('.editable-value');
    if (editableTarget) {
        // If an editable value is clicked, open the area statement modal
        openAreaStatementModal();
    }
}
function handleBalconyClick(pointer) {
    if (!state.currentApartmentLayout || !state.scale.ratio) return false;

    for (const flat of state.currentApartmentLayout.placedFlats) {
        if (!flat.type.balconyMultiplier || flat.type.balconyMultiplier <= 0) continue;

        const balconyWidthPx = (flat.type.frontage / state.scale.ratio) * ((flat.type.balconyCoverage || 80) / 100);
        const balconyDepthPx = flat.type.balconyMultiplier / state.scale.ratio;

        if (isPointInRotatedRect(pointer, flat.balconyCenter, balconyWidthPx, balconyDepthPx, flat.angle)) {
            flat.hasBalcony = !flat.hasBalcony;
            state.canvas.requestRenderAll();
            return true; // Click was handled
        }
    }
    return false;
}
export function handleBlockTypeChange(e) {
    const key = e.target.options[e.target.selectedIndex]?.value;
    if(key && PREDEFINED_BLOCKS[key]?.level) {
        setCurrentLevel(PREDEFINED_BLOCKS[key].level);
        applyLevelVisibility();
        updateUI();
    }
}
export function placeServiceBlock(pointer) {
    const selectEl = document.getElementById('serviceBlockType');
    Array.from(selectEl.selectedOptions).forEach(option => {
        const blockData = PREDEFINED_BLOCKS[option.value];
        if (!blockData || !state.scale.ratio) return;
        const blockWidth = blockData.width / state.scale.ratio;
        const blockHeight = blockData.height / state.scale.ratio;
        const colors = BLOCK_CATEGORY_COLORS[blockData.category || 'default'];
        const blockId = `SB-${state.serviceBlockCounter++}`;
        const rect = new fabric.Rect({ width: blockWidth, height: blockHeight, fill: colors.fill, stroke: colors.stroke, strokeWidth: 2, originX: 'center', originY: 'center', strokeUniform: true });
        rect.setCoords();
        const label = new fabric.Text(blockId, { fontSize: Math.min(blockWidth, blockHeight) * 0.2, fill: '#fff', backgroundColor: 'rgba(0,0,0,0.4)', originX: 'center', originY: 'center' });
          const lockIcon = new fabric.Text("🔒", { fontSize: Math.min(blockWidth, blockHeight) * 0.2, left:Math.min(blockWidth, blockHeight) * 0.2, originY: 'center', visible: true }); // Default Locked
        const group = new fabric.Group([rect, label,lockIcon], {
            left: pointer.x, 
            top: pointer.y, 
            originX: 'center', 
            originY: 'center',
            isServiceBlock: true, 
            blockData:blockData, 
            blockId: blockId, 
            level: state.currentLevel, 
            selectable: true,
            evented: true,
            lockScalingX: true, // Default Locked
            lockScalingY: true,
        });
        state.serviceBlocks.push(group);
        state.canvas.add(group);
        state.canvas.setActiveObject(group);
        
        group.setCoords();
    });
    setCurrentMode(null);
    renderServiceBlockList();
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
            isServiceBlock: true, blockData, blockId: blockId, level: compositeLevel,
            left: x_px + blockWidth / 2, top: y_px + blockHeight / 2,
            selectable: false, evented: false
        });
        
        state.serviceBlocks.push(subGroup);
        items.push(subGroup);
    });
    const compositeGroup = new fabric.Group(items, { left: pointer.x, top: pointer.y, level: compositeLevel, isCompositeGroup: true });
    state.canvas.add(compositeGroup);
    applyLevelVisibility();
    renderServiceBlockList();
}

export function deleteSelectedFootprint() {
    const selected = state.canvas.getActiveObject();
    if (!selected || !selected.isFootprint) return;

    if (state.currentMode === 'editingFootprint') { confirmFootprintEdit(); }

    const levelObjects = state.levels[selected.level].objects;
    const index = levelObjects.indexOf(selected);
    if (index > -1) { levelObjects.splice(index, 1); }
    state.canvas.remove(selected);
    state.canvas.discardActiveObject().renderAll();
    updateLevelFootprintInfo();
    updateUI();
}
export function deleteSelectedObject() {
    const selected = state.canvas.getActiveObject();
    if (!selected) return;
     
    // NEW: Handle sub-object deletion during group edit
    if (window.isEditingGroup && window.groupBeingEdited && selected.isServiceBlock) {
        const items = window.groupBeingEdited.getObjects();
        const index = items.indexOf(selected);
        if (index > -1) {
            items.splice(index, 1);
        }
    }
    if (selected.isDxfOverlay) { deleteDxf(); return; }
    if (selected.isFootprint) { deleteSelectedFootprint(); return; }
    if (selected.isServiceBlock) state.serviceBlocks = state.serviceBlocks.filter(b => b !== selected);
    else if (selected.isCompositeGroup) state.serviceBlocks = state.serviceBlocks.filter(b => !selected.getObjects().includes(b));
    else if (selected.isParkingRow) state.parkingRows = state.parkingRows.filter(r => r !== selected);
    state.canvas.remove(selected);
    state.canvas.discardActiveObject().renderAll();
    renderServiceBlockList();
    updateParkingDisplay();
}
export function flipSelectedObject(axis) {
    const selected = state.canvas.getActiveObject();
    if (selected) { selected.toggle(axis === 'X' ? 'flipX' : 'flipY'); state.canvas.renderAll(); }
}
export function rotateSelectedObject() {
    const selected = state.canvas.getActiveObject();
    if (selected) { selected.set('angle', parseFloat(document.getElementById('block-rotation').value) || 0).setCoords(); state.canvas.renderAll(); }
}
export function rotateSelectedObject90() {
    const selected = state.canvas.getActiveObject();
    if (selected) {
        const currentAngle = selected.get('angle');
        selected.set('angle', (currentAngle + 90) % 360).setCoords();
        document.getElementById('block-rotation').value = selected.angle.toFixed(1);
        state.canvas.renderAll();
    }
}
export function updateBlockDimension(dimension) {
    const selected = state.canvas.getActiveObject();
    if (!selected || !selected.isServiceBlock || state.scale.ratio === 0) return;
    const rect = selected.getObjects('rect')[0];
    if (!rect) return;
    const input = document.getElementById(dimension === 'width' ? 'block-width' : 'block-height');
    const newMeters = parseFloat(input.value);
    if (isNaN(newMeters) || newMeters <= 0) return;
    const newPixels = newMeters / state.scale.ratio;
    selected.set(dimension === 'width' ? 'scaleX' : 'scaleY', newPixels / rect[dimension]);
    selected.setCoords();
    handleObjectModified({target: selected});
}

function handleImportZIP(e) {
    const file = e.target.files[0];
    if (!file) return;
    importProjectZIP(file, state.canvas, () => {
        // This callback runs after all assets are loaded from the zip and enlivened.
        // We now repopulate the application's state based on the restored objects.
        resetState(true); // true = keep objects that were just loaded but clear state pointers

        let maxId = 0;
        state.canvas.getObjects().forEach(obj => {
            // Restore Plot Polygon state
            if (obj.isPlot) {
                state.plotPolygon = obj;
            }
            // Restore Footprint Polygons state by adding them to the correct level
            else if (obj.isFootprint && obj.level && state.levels[obj.level]) {
                state.levels[obj.level].objects.push(obj);
            }
            // Restore Service Blocks state
            else if (obj.isServiceBlock || obj.isCompositeGroup) {
                state.serviceBlocks.push(obj);
                // Find max service block ID to prevent future ID collisions
                const blocksToCheck = obj.isServiceBlock ? [obj] : obj.getObjects();
                blocksToCheck.forEach(subBlock => {
                     if (subBlock.blockId && subBlock.blockId.startsWith('SB-')) {
                        const idNum = parseInt(subBlock.blockId.split('-')[1]);
                        if (!isNaN(idNum) && idNum > maxId) {
                            maxId = idNum;
                        }
                    }
                });
            }
            // Restore Parking Rows state
            else if (obj.isParkingRow) {
                state.parkingRows.push(obj);
            }
            // Restore Guide Lines state
            else if (obj.isGuide) {
                state.guideLines.push(obj);
            }
            // Restore DXF Overlay state
            else if (obj.isDxfOverlay) {
                state.dxfOverlayGroup = obj;
            }
        });

        // Update the global counter to the next available ID
        state.serviceBlockCounter = maxId + 1;

        document.getElementById('status-bar').textContent = 'Project Imported Successfully.';
        
        // Refresh all UI components that depend on the restored state
        renderServiceBlockList();
        updateParkingDisplay();
        applyLevelVisibility();
        updateLevelFootprintInfo();
        updateUI();
        updateDashboard();
    });
}
export async function handlePlanUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    state.originalPlanFile = file; // Store the original file object
    resetState();
  
    const reader = new FileReader();
    if (file.type.includes('pdf')) {
        document.getElementById('pdf-controls').style.display = 'block';
        reader.onload = async (event) => {
            currentPdfData = event.target.result;
            await handlePdfPageChange();
            enterMode('scaling'); 
        };
        reader.readAsArrayBuffer(file);
    } else {
        document.getElementById('pdf-controls').style.display = 'none';
        currentPdfData = null;
        reader.onload = (event) => {
            setCanvasBackground(event.target.result);
            enterMode('scaling');
        };
        reader.readAsDataURL(file);
    }
}
export async function handlePdfPageChange() {
    if (currentPdfData) {
        const pageNum = parseInt(document.getElementById('pdf-page').value) || 1;
        const img = await renderPdfToBackground(currentPdfData, pageNum);
        if (img) {
            setCanvasBackground(img);
        }
    }
}
export function createFootprintFromSetbacks() {
    const setbackPoints = getSetbackPolygonPoints();
    if (setbackPoints.length < 3) { 
        document.getElementById('status-bar').textContent = "Could not generate footprint. Ensure setbacks are properly defined.";
        return;
    }
    const footprintPolygon = new fabric.Polygon(setbackPoints, { objectCaching: false, });
    handleFinishPolygon(footprintPolygon, 'drawingBuilding');
}

export function createFootprintFromPlot() {
    if (!state.plotPolygon || !state.plotPolygon.points) {
        document.getElementById('status-bar').textContent = "No plot boundary drawn to create a footprint from.";
        return;
    }
    let points = state.plotPolygon.points;

    // Apply 1m offset for basements
    if (state.currentLevel.startsWith('Basement') && state.scale.ratio > 0) {
        const offsetDist = 1 / state.scale.ratio; // 1 meter offset in pixels
        points = getOffsetPolygon(points, offsetDist);
    }

    if (points.length < 3) {
        document.getElementById('status-bar').textContent = "Could not generate footprint from plot boundary.";
        return;
    }

    const footprintPolygon = new fabric.Polygon(points, { objectCaching: false });
    handleFinishPolygon(footprintPolygon, 'drawingBuilding');
}

export function handleLevelSelect(e) {
    const btn = e.target.closest('button');
    if (btn?.dataset.level) {
        if (state.currentMode === 'editingFootprint') { confirmFootprintEdit(); }
        setCurrentLevel(btn.dataset.level);
        applyLevelVisibility();
        updateUI();
        updateLevelFootprintInfo(); 
    }
}

export function handleToggleVisibility() {
    toggleAllLayersVisibility();
    applyLevelVisibility();
}

export function  handleCalculate(isLiveUpdate = false, isDetailed = false) {
    const reportResult = generateReport(isDetailed);
    if (reportResult) {
        state.lastCalculatedData = reportResult.data;
        document.getElementById('report-container').innerHTML = reportResult.html;
        updateParkingDisplay();
         updateScreenshotGallery();

        // Attach event listeners to ALL expander elements
        const expanders = document.querySelectorAll('#report-container .expander');
        expanders.forEach(expander => {
            expander.addEventListener('click', (e) => {
                const targetId = e.currentTarget.getAttribute('data-target');
                const targetElement = document.getElementById(targetId);
                if (targetElement) {
                    const isHidden = targetElement.style.display === 'none' || !targetElement.style.display;
                    targetElement.style.display = isHidden ? 'table-row' : 'none';
                    e.currentTarget.textContent = isHidden ? '[-]' : '[+]';
                }
            });
        });
    } else {
        if (!isLiveUpdate) { 
            document.getElementById('status-bar').textContent = "Could not generate report. Ensure a plot and at least one typical/hotel floor footprint are drawn.";
        }
        document.getElementById('report-container').innerHTML = '';
        state.lastCalculatedData = null;
        updateParkingDisplay();
    }
    updateUI();
}

export function  handlePreviewLayout(event) {
    const btn = document.getElementById('previewLayoutBtn');
    const calcMode = document.getElementById('apartment-calc-mode').value;
    const balconyPlacement = document.getElementById('balcony-placement').value;
    const includeBalconiesInOffset = balconyPlacement === 'recessed';
    const doubleLoaded = document.getElementById('double-loaded-corridor').checked;

    if (btn.classList.contains('active') && event?.target.id === 'previewLayoutBtn') {
        btn.textContent = 'Preview Layout';
        btn.classList.remove('active');
        state.currentApartmentLayout = null;
        state.canvas.getObjects().filter(o => o.isCorridor).forEach(o => state.canvas.remove(o));
        state.canvas.requestRenderAll();
        return;
    }

    const polys = state.levels['Typical_Floor']?.objects.filter(o => o.isFootprint);
    if (!polys || polys.length === 0 || !state.lastCalculatedData) {
        if (event?.target.id === 'previewLayoutBtn') 
            document.getElementById('status-bar').textContent = "Please draw a Typical Floor and generate a report first.";
        return;
    }
    if (state.projectType !== 'Residential') {
        if (event?.target.id === 'previewLayoutBtn') 
            document.getElementById('status-bar').textContent = "Layout preview is currently only available for Residential projects.";
        return;
    }

    const poly = polys[polys.length - 1]; // Use the last added footprint
    const counts = state.lastCalculatedData.aptCalcs.aptMixWithCounts.reduce((acc, apt) => ({ ...acc, [apt.key]: apt.countPerFloor }), {});
    state.currentApartmentLayout = layoutFlatsOnPolygon(poly, counts, includeBalconiesInOffset, calcMode, doubleLoaded);

    btn.textContent = 'Hide Preview';
    btn.classList.add('active');
    state.canvas.requestRenderAll();
}

async function checkAndRescalePdf() {
    const bg = state.canvas.backgroundImage;
    const pageNum = parseInt(document.getElementById('pdf-page').value) || 1;

    // Check if the background is a PDF we can re-render and if a scale has been set
    if (currentPdfData && bg && bg.isPdf && bg.renderingScale && state.scale.ratio > 0) {
        const pixelsPerMeter = 1 / state.scale.ratio;
        const targetPixelsPerMeter = 100; // Target resolution: 100px per meter (1cm on screen = 1px)

        // Only rescale if current resolution is lower than target
        if (pixelsPerMeter < targetPixelsPerMeter) {
            document.getElementById('status-bar').textContent = 'Optimizing plan resolution... Please wait.';
            const scaleFactor = targetPixelsPerMeter / pixelsPerMeter;
            const newRenderingScale = bg.renderingScale * scaleFactor;
            // Cap the rendering scale to avoid creating enormous textures (e.g., max 8x)
            const finalRenderingScale = Math.min(newRenderingScale, 8.0);

            // Re-render the PDF with the new, higher resolution
            const newBgImage = await renderPdfToBackground(currentPdfData, pageNum, finalRenderingScale);

            if (newBgImage) {
                // Calculate a correction factor based on the change in pixel dimensions
                const correctionFactor = newBgImage.width / bg.width;

                // Apply the new background image
                setCanvasBackground(newBgImage);
                
                // IMPORTANT: Update the application's scale to match the new background resolution
                const newPixelDistance = state.scale.pixelDistance * correctionFactor;
                setScale(newPixelDistance, state.scale.realDistance);
            }
        }
    }
}


export function handleMouseDown(o) {
    const pointer = state.canvas.getPointer(o.e);

    if (state.currentMode === 'editingFootprint') {
        // Prevent starting a drag on the main polygon body
        if (o.target && o.target.isFootprint && !o.transform) {
            return;
        }
    }

    if (state.currentApartmentLayout && o.e.button === 0) { // Left click
            if (handleBalconyClick(pointer)) {
                return; // Prevent other mouse down actions if a balcony was clicked
            }
        }
    if (isMeasuring) {
        document.getElementById('status-bar').textContent='Start measuring';
        const snapPoint = findSnapPoint(pointer);
        const clickPoint = snapPoint ? { x: snapPoint.x, y: snapPoint.y } : pointer;
       
        if (!measurePoint1) {
            measurePoint1 = clickPoint;
            document.getElementById('status-bar').textContent = 'Mode: Measure. Click end point.';
        } else {
            const distPixels = Math.hypot(clickPoint.x - measurePoint1.x, clickPoint.y - measurePoint1.y);
            const distMeters = distPixels * state.scale.ratio;
            document.getElementById('status-bar').textContent = `Final Measurement: ${distMeters.toFixed(3)} m`;
            exitAllModes();
             setCurrentMode(null);
        }
        return;
    }

    if (state.currentMode === 'aligningObject' && objectToAlign) {
        const targetEdge = getNearestEdge(pointer, state.plotPolygon, state.setbackGuides);
        if (targetEdge) {
            alignObjectToEdge(objectToAlign, targetEdge);
            state.canvas.renderAll();
        }
        exitAllModes();
        return;
    }
    if (state.currentMode === 'editingSetback') {
        handleEdgeSelection(pointer);
        return;
    }
    if (state.currentMode === 'scaling') {
        if (!scalePoint1) {
            scalePoint1 = pointer;
            handleCanvasMouseDown(pointer); 
            document.getElementById('status-bar').textContent = 'Click the end point of the known distance.';
        } else {
            const scaleData = finishScaling();
            if (scaleData) {
                setScale(scaleData.pixels, scaleData.meters);
                checkAndRescalePdf();
            } else {
                 document.getElementById('status-bar').textContent = "Invalid length provided. Please enter a number in the 'Known Distance' field.";
            }
            exitAllModes();
        }
        return;
    }
       if (state.currentMode === 'drawingParkingOnEdge') {
        const nearestEdge = findNearestParkingEdge(pointer);
        if (nearestEdge) {
            generateLinearParking(nearestEdge.p1, nearestEdge.p2);
        }
        exitAllModes();
        return;
    }
    if (state.currentMode === 'drawingLoadingBay') {
        const bay = new fabric.Rect({ width: 4 / state.scale.ratio, height: 16 / state.scale.ratio, fill: 'rgba(255, 100, 0, 0.5)', stroke: 'orange', left: pointer.x, top: pointer.y, originX: 'center', originY: 'center', isLoadingBay: true, level: state.currentLevel});
        state.canvas.add(bay);
        exitAllModes();
        return;
    }
     if (state.currentMode === 'drawingBusBay') {
        const bay = new fabric.Rect({ width: 4 / state.scale.ratio, height: 13 / state.scale.ratio, fill: 'rgba(255, 200, 0, 0.5)', stroke: 'yellow', left: pointer.x, top: pointer.y, originX: 'center', originY: 'center', isBusBay: true, level: state.currentLevel});
        state.canvas.add(bay);
        exitAllModes();
        return;
    }
    const result = handleCanvasMouseDown(pointer);
    if (result?.action === 'finishPolygon') {
        alert('finish Polygon');
        handleFinishPolygon(result.polygon);
    }
     if (result?.action === 'finishPolyline') {
        alert('finish Polyline');
        handleFinishPolyline(result.polyline);
    }
    if (state.currentMode === 'placingBlock') placeServiceBlock(pointer);
    if (state.currentMode === 'placingCompositeBlock') {
        const index = document.getElementById('composite-block-select').value;
        const data = state.userCompositeBlocks[index];
        if(data) {
            createCompositeGroup(data, pointer);
        }
        exitAllModes();
    }
    if (state.currentMode === 'drawingParking') {
        parkingStartPoint = pointer;
        parkingLine = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
            stroke: '#f50057', strokeWidth: 2, strokeDashArray: [5, 5], selectable: false, evented: false, strokeUniform: true
        });
        state.canvas.add(parkingLine);
    }
}
export function handleMouseMove(o) {
    const pointer = state.canvas.getPointer(o.e);
    state.lastMousePointer = pointer;
    state.lastMousePosition = { x: o.e.clientX, y: o.e.clientY };

    if (state.currentMode === 'measuring') {
        state.canvas.requestRenderAll();
        return;
    }
    if (state.currentMode === 'aligningObject') {
        const targetEdge = getNearestEdge(pointer, state.plotPolygon, state.setbackGuides);
        updateAlignmentHighlight(targetEdge);
        return;
    }
      if (state.currentMode === 'drawingParkingOnEdge') {
        const nearestEdge = findNearestParkingEdge(pointer);
        updateAlignmentHighlight(nearestEdge); // Reuse alignment highlighter
        return;
    }
    if (state.currentMode === 'editingSetback') {
        updateEdgeHighlight(pointer);
        return;
    }
    const moveResult = handleCanvasMouseMove(o) || {};
    state.livePreviewLayout = moveResult.liveLayoutData;
    if (moveResult.liveUnitCounts) updateParkingDisplay(moveUnitCounts);
    if (state.currentMode === 'drawingParking' && parkingLine) {
        parkingLine.set({ x2: pointer.x, y2: pointer.y });
        state.canvas.renderAll();
    }
}


export function  handleMouseUp(o) {
    if (state.currentMode === 'drawingGuide' && guideLine) {
        const finalGuide = new fabric.Line([guideLine.x1, guideLine.y1, guideLine.x2, guideLine.y2], {
            stroke: guideLine.stroke, strokeWidth: guideLine.strokeWidth, strokeDashArray: guideLine.strokeDashArray,
            selectable: false, evented: false, isGuide: true, level: state.currentLevel, strokeUniform: true,
        });
        
        state.guideLines.push(finalGuide);
        state.canvas.add(finalGuide);
        exitAllModes();
        return;
    }
    if (state.currentMode === 'drawingParking' && parkingLine) {
        generateLinearParking(parkingStartPoint, state.canvas.getPointer(o.e));
        exitAllModes();
    }
    clearEdgeSnapIndicator();
}
export function  handleAfterRender() {
    clearOverlay();
    
    const layoutToDraw = state.livePreviewLayout || state.currentApartmentLayout;
    if (layoutToDraw) {
        redrawApartmentPreview(layoutToDraw);
    }

    if (state.liveDimensionLine) {
        drawLiveDimension(state.liveDimensionLine.p1, state.liveDimensionLine.p2);
    }

    if (isMeasuring && measurePoint1 && state.lastMousePointer) {
        const snapPoint = findSnapPoint(state.lastMousePointer);
        const endPoint = snapPoint ? snapPoint : state.lastMousePointer;
        drawMeasurement(getOverlayContext(), measurePoint1, endPoint);
    }
}
export function  handleObjectModified(e) {
    const target = e.target;
    if (!target) return;
        recordAction('OBJECT_MODIFIED', { 
        object: target.toObject(['blockId', 'level', 'isFootprint']),
        transform: target.calcTransformMatrix()
    });
    clearEdgeSnapIndicator();
    if (target.isServiceBlock || target.isCompositeGroup) renderServiceBlockList();
    if (target.isParkingRow){ updateParkingDisplay(); }
    if (target.isFootprint) {
        updateLevelFootprintInfo();
    }
    if (target.isFootprint && state.currentLevel === 'Typical_Floor' && state.projectType === 'Residential' && state.currentProgram) {
        const program = state.currentProgram;
        
        let tempPerimeter = 0;
        const props = getPolygonProperties(target);

        if (target.isLinearFootprint) {
            // A linear footprint is a thin polygon. Its "length" is roughly half its perimeter.
            tempPerimeter = props.perimeter / 2;
        } else {
            // A standard closed footprint or a polyline (during drawing). Use its perimeter/length directly.
            tempPerimeter = props.perimeter;
        }

        const totalMix = program.unitTypes.reduce((sum, unit) => sum + unit.mix, 0) || 1;
        const avgFrontage = program.unitTypes.reduce((acc, unit) => acc + (unit.frontage * (unit.mix / totalMix)), 0);
        if (avgFrontage > 0) {
            const calcMode = document.getElementById('apartment-calc-mode').value;
            const balconyPlacement = document.getElementById('balcony-placement').value;
            const includeBalconiesInOffset = balconyPlacement === 'recessed';
            const doubleLoaded = document.getElementById('double-loaded-corridor').checked;

            const estimatedUnits = Math.floor(tempPerimeter / avgFrontage);
            const counts = allocateCountsByPercent(estimatedUnits, program.unitTypes);
            state.livePreviewLayout = layoutFlatsOnPolygon(target, counts, includeBalconiesInOffset, calcMode, doubleLoaded);
            updateParkingDisplay(counts);
        }
    }
    updateSelectedObjectControls(target);
    state.canvas.requestRenderAll();
}
export function  handleObjectMoving(e) {
    if (e.target.isVertex) return;
    if (document.getElementById('snap-auto-align').checked) { snapObjectToEdge(e.target); } 
    else { clearEdgeSnapIndicator(); }
}
export function  handleObjectScaling(e) {
    if (e.target?.isParkingRow) { regenerateParkingInGroup(e.target, state.scale.ratio); updateParkingDisplay(); }
    if (e.target?.isFootprint) { updateLevelFootprintInfo(); }
}

export function  handleProjectTypeChange(e) {
    state.projectType = e.target.value;
    populateServiceBlocksDropdown();
    const newProgramMaster = PROJECT_PROGRAMS[state.projectType];
    if (newProgramMaster) {
        const newProgramData = JSON.parse(JSON.stringify(newProgramMaster));
        state.currentProgram = rehydrateProgram(newProgramData, newProgramMaster);
    } else { state.currentProgram = null; }
    document.getElementById('hotel-classification-wrapper').style.display = (state.projectType === 'Hotel') ? 'block' : 'none';
    document.getElementById('labour-camp-settings').style.display = (state.projectType === 'LabourCamp') ? 'block' : 'none';
    updateProgramUI();
    updateParkingDisplay();
    updateUI();
}
export function  handleMixerInputChange(e) {
    const input = e.target;
    if (input.classList.contains('mix-input')) {
        const key = input.dataset.key;
        const value = Math.max(0, Math.min(100, parseInt(input.value) || 0));
        const unit = state.currentProgram.unitTypes.find(a => a.key === key);
        if (unit) unit.mix = value;
        document.getElementById(`range-${key}`).value = value;
        document.getElementById(`num-${key}`).value = value;
        updateMixTotal();
    }
}
export function  handleUnitCardClick(e) {
    const card = e.target.closest('.unit-card');
    if (card?.dataset.key) {
        currentlyEditingUnitKey = card.dataset.key;
        openEditUnitModal(card.dataset.key);
    }
}

export function  startAlignment() {
    const selectedObject = state.canvas.getActiveObject();
    if (selectedObject) {
        objectToAlign = selectedObject;
        enterMode('aligningObject');
    }
}
export function  handleEdgeSelection(pointer) {
    const edgeIndex = getClickedPlotEdge(pointer);
    if (edgeIndex === -1) return;
    const selectionIndex = state.selectedPlotEdges.indexOf(edgeIndex);
    if (selectionIndex > -1) state.selectedPlotEdges.splice(selectionIndex, 1);
    else state.selectedPlotEdges.push(edgeIndex);
    updateEdgeHighlight(pointer);
    // --- MODIFICATION START: Update UI on edge selection ---
    if (state.selectedPlotEdges.length > 0) {
        const firstEdgeIndex = state.selectedPlotEdges[0];
        const edgeProps = state.plotEdgeProperties[firstEdgeIndex];
        if (edgeProps) {
            document.getElementById('individual-setback-dist').value = edgeProps.distance;
            document.getElementById('individual-setback-dir').value = edgeProps.direction;
            const typeRadio = document.getElementById(`edge-type-${edgeProps.type}`);
            if (typeRadio) typeRadio.checked = true;
        }
    }
    // --- MODIFICATION END ---
}
export function  applyIndividualSetbacks() {
    const distance= parseFloat(document.getElementById('individual-setback-dist').value);
    const direction = document.getElementById('individual-setback-dir').value;
    // --- MODIFICATION START: Read edge type ---
    const edgeType = document.querySelector('input[name="edge-type"]:checked').value;
    // --- MODIFICATION END ---
    if (isNaN(distance) || state.selectedPlotEdges.length === 0) {
        document.getElementById('status-bar').textContent = "Please select one or more plot edges and enter a valid distance.";
        return;
    }
    // --- MODIFICATION START: Disable auto-setbacks on manual change ---
    const autoToggle = document.getElementById('auto-setback-toggle');
    if (autoToggle.checked) {
        autoToggle.checked = false;
        document.getElementById('status-bar').textContent = "Auto-setbacks disabled due to manual override.";
    }
    // --- MODIFICATION END ---
    state.selectedPlotEdges.forEach(index => { 
        state.plotEdgeProperties[index] = { distance, direction, type: edgeType }; // Save type
    });
    drawSetbackGuides();
}
export function  clearSetbackSelection() {
    state.selectedPlotEdges = [];
    clearEdgeHighlight();
}
function enterGroupEditMode() {
    const group = state.canvas.getActiveObject();
    if (!group || !group.isCompositeGroup) return;

    window.isEditingGroup = true;
    window.groupBeingEdited = group; // Store the original group
    
    // Explode the group into an active selection of its children
    group.toActiveSelection();
    // Discard the active selection to make items individually selectable
    state.canvas.discardActiveObject();
    
    state.canvas.renderAll();
    updateUI();
    updateSelectedObjectControls(null);
}
function exitGroupEditMode() {
    if (!window.isEditingGroup || !window.groupBeingEdited) return;

    const originalGroup = window.groupBeingEdited;
    
    // Filter to get only the items that were part of the group AND are still on canvas
    const originalItems = originalGroup.getObjects();
    const itemsToGroup = originalItems.filter(item => state.canvas.getObjects().includes(item));


    // Remove the individual items from the canvas before re-grouping
    itemsToGroup.forEach(item => state.canvas.remove(item));

    // Create a new group from the (potentially modified) items
    const newGroup = new fabric.Group(itemsToGroup, {
        left: originalGroup.left,
        top: originalGroup.top,
        angle: originalGroup.angle,
        originX: 'center',
        originY: 'center',
        level: originalGroup.level,
        isCompositeGroup: true
    });

    // Clean up and add the new group
    state.canvas.add(newGroup);
    window.isEditingGroup = false;
    window.groupBeingEdited = null;
    
    state.canvas.setActiveObject(newGroup);
    state.canvas.renderAll();
    updateUI();
}
// NEW: Handle category change for selected block/group
export function handleCategoryChange(e) {
    const newCategory = e.target.value;
    const activeObject = state.canvas.getActiveObject();
    if (!activeObject || !(activeObject.isServiceBlock || activeObject.isCompositeGroup)) return;

    const colors = BLOCK_CATEGORY_COLORS[newCategory];
    if (!colors) return;

    const updateObjectCategory = (obj) => {
        if (obj.blockData) {
            obj.blockData.category = newCategory;
        }
        const rect = obj._objects ? obj._objects[0] : null; // Access rect inside group
        if (rect) {
            rect.set({ fill: colors.fill, stroke: colors.stroke });
        }
    };

    if (activeObject.isCompositeGroup) {
        activeObject.forEachObject(subObj => {
            updateObjectCategory(subObj);
        });
    } else { // isServiceBlock
        updateObjectCategory(activeObject);
    }
    
    recordAction('CHANGE_CATEGORY', { objectId: activeObject.blockId, newCategory });
    state.canvas.renderAll();
    renderServiceBlockList();
    handleCalculate(true); // Recalculate areas
}


// NEW: Handlers for editable area statement
function saveAreaStatementChanges() {
    const form = document.getElementById('area-statement-form');
    form.querySelectorAll('input[type="number"]').forEach(input => {
        const { level, type } = input.dataset;
        const value = parseFloat(input.value);
        if (!isNaN(value)) {
            if (!state.manualAreaOverrides[level]) {
                state.manualAreaOverrides[level] = {};
            }
            state.manualAreaOverrides[level][type] = value;
        }
    });
    recordAction('SAVE_AREA_OVERRIDES', { overrides: state.manualAreaOverrides });
    document.getElementById('area-statement-modal').style.display = 'none';
    handleCalculate(true); // Force a live update of the report
}

function resetAreaOverrides() {
    if (confirm('Are you sure you want to remove all manual area overrides?')) {
        state.manualAreaOverrides = {};
        recordAction('RESET_AREA_OVERRIDES', {});
        openAreaStatementModal(); // Re-open/refresh the modal to show calculated values
        handleCalculate(true);
    }
}

function addManualAreaEntry() {
    const level = document.getElementById('manual-area-level').value;
    const type = document.getElementById('manual-area-type').value;
    const value = parseFloat(document.getElementById('manual-area-value').value);

    if (level && type && !isNaN(value)) {
        if (!state.manualAreaOverrides[level]) {
            state.manualAreaOverrides[level] = {};
        }
       if (type === 'corridor') {
            // Add to the commonGfa override, creating it if it doesn't exist.
            const existingCommon = state.manualAreaOverrides[level].commonGfa || 0;
            state.manualAreaOverrides[level].commonGfa = existingCommon + value;
        } else {
            state.manualAreaOverrides[level][type] = value;
        }
        openAreaStatementModal(); // Refresh modal to show the new entry
    } else {
        alert('Please fill all fields for the manual entry.');
    }
}

export function alignCoreElements() {
    const referenceLevel = 'Typical_Floor';
    
    const getCoreBlocks = (level) => {
        return state.serviceBlocks.filter(b => 
            b.level === level && 
            b.blockData && 
            (b.blockData.name.toLowerCase().includes('lift') || b.blockData.role === 'staircase')
        );
    };

    const calculateCentroid = (blocks) => {
        if (!blocks || blocks.length === 0) return null;
        const center = blocks.reduce((acc, block) => {
            const blockCenter = block.getCenterPoint();
            acc.x += blockCenter.x;
            acc.y += blockCenter.y;
            return acc;
        }, { x: 0, y: 0 });
        
        center.x /= blocks.length;
        center.y /= blocks.length;
        return center;
    };

    const referenceCoreBlocks = getCoreBlocks(referenceLevel);
    if (referenceCoreBlocks.length === 0) {
        document.getElementById('status-bar').textContent = `No core elements (lifts/stairs) found on the reference level '${referenceLevel.replace(/_/g, ' ')}' to align to.`;
        return;
    }
    
    const referenceCentroid = calculateCentroid(referenceCoreBlocks);

    let alignedLevels = 0;
    LEVEL_ORDER.forEach(levelKey => {
        if (levelKey === referenceLevel) return;

        const levelCoreBlocks = getCoreBlocks(levelKey);
        if (levelCoreBlocks.length === 0) return;

        const levelCentroid = calculateCentroid(levelCoreBlocks);
        if (!levelCentroid) return;

        const dx = referenceCentroid.x - levelCentroid.x;
        const dy = referenceCentroid.y - levelCentroid.y;

        if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) return; // Already aligned, skip

        levelCoreBlocks.forEach(block => {
            block.set({
                left: block.left + dx,
                top: block.top + dy
            });
            block.setCoords();
        });
        alignedLevels++;
    });

    if (alignedLevels > 0) {
        state.canvas.renderAll();
        recordAction('ALIGN_CORE', { referenceLevel });
        document.getElementById('status-bar').textContent = `Successfully aligned cores on ${alignedLevels} level(s).`;
    } else {
        document.getElementById('status-bar').textContent = 'All cores are already aligned.';
    }
}
// --- Mode Entry/Exit ---
export function enterMode(mode, data = null) {
    if (state.currentMode === 'editingFootprint') {
        confirmFootprintEdit();
    }
    exitAllModes();
    setCurrentMode(mode);
    state.canvas.selection = false;
    state.canvas.discardActiveObject().renderAll();

    if ((mode === 'drawingBuilding' || mode === 'drawingLinearBuilding' || mode === 'drawingCorridor') && state.plotPolygon) drawSetbackGuides();
    if (mode === 'placingCompositeBlock') selectedCompositeBlockData = data;
     if (mode === 'drawingParkingOnEdge') {
        document.getElementById('status-bar').textContent = 'Select a building edge on a valid level (Basement, Ground, Podium) to place parking.';
    }
    if (mode === 'editingSetback') document.getElementById('individual-setback-controls').style.display = 'block';
    if (mode === 'editingFootprint') {
        const selected = state.canvas.getActiveObject();
        const footprintToEdit = (selected && selected.isFootprint) ? selected : state.levels[state.currentLevel]?.objects.find(o => o.isFootprint);
        
        if (footprintToEdit) {
            makeFootprintEditable(footprintToEdit);
            state.canvas.setActiveObject(footprintToEdit);
            state.canvas.renderAll();
        } else {
            document.getElementById('status-bar').textContent = 'No footprint on this level to edit. Please select one or draw one.';
            exitAllModes();
        }
    }
    if (mode === 'aligningObject') {
        if (objectToAlign) objectToAlign.set({ evented: false });
        state.canvas.hoverCursor = 'move';
    }
    if (mode === 'measuring') {
        isMeasuring = true;
        measurePoint1 = null;
        state.canvas.selection = false;
        state.canvas.hoverCursor = 'crosshair';
        document.getElementById('status-bar').textContent = 'Mode: Measure. Click start point.';
        document.getElementById('measure-tool-btn').classList.add('active');
        document.getElementById('measure-tool-btn').textContent = 'Cancel Measure';
    }

    if (!['measuring', 'editingFootprint'].includes(mode)) {
        state.canvas.selection = true;
    }
    updateUI();
}

export function exitAllModes() {
    if (state.currentMode === 'editingFootprint') {
        const activeObject = state.canvas.getActiveObject();
        if (activeObject && activeObject.isFootprint) {
            makeFootprintUneditable(activeObject);
        }
    }
    if (state.currentMode === 'measuring') {
       isMeasuring = false;
       measurePoint1 = null;
       clearOverlay();
       document.getElementById('measure-tool-btn').classList.remove('active');
       document.getElementById('measure-tool-btn').textContent = 'Measure Distance';
    }

    document.getElementById('individual-setback-controls').style.display = 'none';
    clearSetbackGuides();
    clearEdgeHighlight();
    state.selectedPlotEdges = [];
    updateAlignmentHighlight(null);
    resetDrawingState();
    if (objectToAlign) {
        objectToAlign.set({ evented: true, selectable: true });
        objectToAlign = null;
    }
    state.canvas.hoverCursor = 'move';
    if (parkingLine) state.canvas.remove(parkingLine);
    parkingLine = null;
    parkingStartPoint = null;
    state.livePreviewLayout = null;
    scalePoint1 = null;
    setCurrentMode(null);
    selectedCompositeBlockData = null;
    state.canvas.selection = true;
    updateUI();
    state.canvas.requestRenderAll();
}

export function  confirmFootprintEdit() {
    const activeObject = state.canvas.getActiveObject();
    if (activeObject && activeObject.isFootprint) { makeFootprintUneditable(activeObject); }
    state.canvas.discardActiveObject().renderAll();
    exitAllModes();
}

export function  handleFinishPolygon(shape, modeOverride = null) {
    let finalShape = shape;
    const currentMode = modeOverride || state.currentMode;
    const isLinearFootprint = currentMode === 'drawingLinearBuilding';
    const isCorridor = currentMode === 'drawingCorridor';
    
    if (isLinearFootprint || isCorridor) {
        let thickness;
        if (isLinearFootprint) {
            const avgUnitDepth = state.currentProgram?.unitTypes.reduce((acc, u) => acc + u.depth, 0) / state.currentProgram.unitTypes.length || 14;
            thickness = (avgUnitDepth / state.scale.ratio);
        } else { // isCorridor
            const widthMeters = parseFloat(document.getElementById('corridor-width-input').value) || 1.8;
            thickness = widthMeters / state.scale.ratio;
        }
        const polyPoints = getPolygonFromPolyline(shape.points, thickness);
        finalShape = new fabric.Polygon(polyPoints, { selectable: false, evented: false, objectCaching: false });
    }

    // For linear footprints, we want to immediately trigger the preview
    if (isLinearFootprint && state.livePreviewLayout) {
        state.currentApartmentLayout = state.livePreviewLayout;
    }
    state.livePreviewLayout = null;

    recordAction('FINISH_POLYGON', { shape: finalShape.toObject(), mode: currentMode, level: state.currentLevel });

    if (currentMode === 'drawingPlot') {
        if (state.plotPolygon) state.canvas.remove(state.plotPolygon);
        state.plotPolygon = finalShape;
        finalShape.set({ fill: 'rgba(0, 0, 255, 0.1)', stroke: 'rgba(0, 0, 255, 0.6)', strokeWidth: 1.5, level: 'Plot', selectable: false, evented: false, isPlot: true, strokeUniform: true });
       // --- MODIFICATION START: Add default 'type' property ---
        state.plotEdgeProperties = finalShape.points.map(() => ({ distance: 5, direction: 'inside', type: 'neighbor' }));
        calculateAndApplySetbacks(); // Apply auto-setbacks immediately
        // --- MODIFICATION END ---
    } else if (currentMode === 'drawingBuilding' || isLinearFootprint || isCorridor) {
        const levelData = state.levels[state.currentLevel];
        const footprintProps = {
           fill: isCorridor ? 'rgba(139, 69, 19, 0.4)' : levelData.color,
            stroke: isCorridor ? '#8B4513' : 'red',
            level: state.currentLevel,
            selectable: false,
            evented: true,
            isFootprint: true,
            strokeUniform: true,
             isLinearFootprint: isLinearFootprint, // Add the flag here
            isCorridorFootprint: isCorridor
        };
        finalShape.set(footprintProps);
        levelData.objects.push(finalShape);
        updateLevelFootprintInfo();
        
        if (finalShape.type === 'polygon' && document.getElementById('auto-place-core-check').checked) {
            const coreForLevel = state.userCompositeBlocks.find(core => core.level === state.currentLevel || core.name.toLowerCase().includes(state.currentLevel.toLowerCase().replace('_', ' ')));
            if (coreForLevel) {
                const coreIndex = state.userCompositeBlocks.indexOf(coreForLevel);
                document.getElementById('composite-block-select').value = coreIndex;
                createCompositeGroup(coreForLevel, finalShape.getCenterPoint());
            } else {
                const selectedIndex = document.getElementById('composite-block-select').value;
                const selectedData = state.userCompositeBlocks[selectedIndex];
                if (selectedData) { createCompositeGroup(selectedData, finalShape.getCenterPoint()); }
            }
        }
    }
    state.canvas.add(finalShape);
    
    if (isLinearFootprint) {
        document.getElementById('previewLayoutBtn').classList.add('active');
        document.getElementById('previewLayoutBtn').textContent = 'Hide Preview';
        state.canvas.requestRenderAll();
        exitAllModes(); 
    } else {
        state.canvas.renderAll();
        exitAllModes();
    }
}
export function  handleFinishPolyline(shape, modeOverride = null) {
    let finalShape = shape;
    const currentMode = modeOverride || state.currentMode;
    const isLinearFootprint = currentMode === 'drawingLinearBuilding';
    
   /*  if (isLinearFootprint) {
        const avgUnitDepth = state.currentProgram?.unitTypes.reduce((acc, u) => acc + u.depth, 0) / state.currentProgram.unitTypes.length || 14;
        const thickness = (avgUnitDepth / state.scale.ratio);
        const polyPoints = getPolygonFromPolyline(shape.points, thickness);
        finalShape = new fabric.Polyline(polyPoints, { selectable: false, evented: false, objectCaching: false });
    } */

    // For linear footprints, we want to immediately trigger the preview
    if (isLinearFootprint && state.livePreviewLayout) {
        state.currentApartmentLayout = state.livePreviewLayout;
    }
    state.livePreviewLayout = null;

    recordAction('FINISH_POLYLINE', { shape: finalShape.toObject(), mode: currentMode, level: state.currentLevel });

    if (currentMode === 'drawingPlot') {
        if (state.plotPolygon) state.canvas.remove(state.plotPolygon);
        state.plotPolygon = finalShape;
        finalShape.set({ fill: 'rgba(0, 0, 255, 0.1)', stroke: 'rgba(0, 0, 255, 0.6)', strokeWidth: 1.5, level: 'Plot', selectable: false, evented: false, isPlot: true, strokeUniform: true });
        state.plotEdgeProperties = finalShape.points.map(() => ({ distance: 5, direction: 'inside' }));
    } else if (currentMode === 'drawingBuilding' || isLinearFootprint) {
        const levelData = state.levels[state.currentLevel];
        const footprintProps = {
            fill: levelData.color,
            stroke: 'red',
            level: state.currentLevel,
            selectable: false,
            evented: true,
            isFootprint: true,
            strokeUniform: true,
            isLinearFootprint: isLinearFootprint // Add the flag here
        };
        finalShape.set(footprintProps);
        levelData.objects.push(finalShape);
        updateLevelFootprintInfo();
        
        if (finalShape.type === 'polygon' && document.getElementById('auto-place-core-check').checked) {
            const coreForLevel = state.userCompositeBlocks.find(core => core.level === state.currentLevel || core.name.toLowerCase().includes(state.currentLevel.toLowerCase().replace('_', ' ')));
            if (coreForLevel) {
                const coreIndex = state.userCompositeBlocks.indexOf(coreForLevel);
                document.getElementById('composite-block-select').value = coreIndex;
                createCompositeGroup(coreForLevel, finalShape.getCenterPoint());
            } else {
                const selectedIndex = document.getElementById('composite-block-select').value;
                const selectedData = state.userCompositeBlocks[selectedIndex];
                if (selectedData) { createCompositeGroup(selectedData, finalShape.getCenterPoint()); }
            }
        }
    }
    state.canvas.add(finalShape);
    
    if (isLinearFootprint) {
        document.getElementById('previewLayoutBtn').classList.add('active');
        document.getElementById('previewLayoutBtn').textContent = 'Hide Preview';
        state.canvas.requestRenderAll();
        exitAllModes(); 
    } else {
        state.canvas.renderAll();
        exitAllModes();
    }
}