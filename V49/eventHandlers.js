// MAIN EXECUTION & INITIALIZATION
// =====================================================================
import { initCanvas, resetZoom,renderPdfToBackground,zoomCanvas ,getCanvas ,clearOverlay ,setCanvasBackground ,getOverlayContext ,redrawApartmentPreview, zoomToObject  } from './canvasController.js';
import { resetState,setCurrentLevel,state,setCurrentMode,setScale, toggleAllLayersVisibility ,rehydrateProgram  } from './state.js';
import { initDrawingTools,handleDblClick, getSetbackPolygonPoints,handleCanvasMouseMove,clearSetbackGuides,clearEdgeHighlight,updateAlignmentHighlight,resetDrawingState,handleCanvasMouseDown,clearEdgeSnapIndicator ,finishScaling,drawSetbackGuides,findSnapPoint ,updateSnapIndicators,drawMeasurement, getClickedPlotEdge, getNearestEdge, snapObjectToEdge, alignObjectToEdge , updateEdgeHighlight           } from './drawingTools.js'; 
import { regenerateParkingInGroup, generateLinearParking   } from './parkingLayoutUtils.js';
import { init3D,generate3DBuilding , generateOpenScadScript  } from './viewer3d.js';
import { initUI, updateUI,displayHotelRequirements ,placeSelectedComposite, handleConfirmLevelOp  ,applyLevelVisibility ,updateLevelFootprintInfo ,renderServiceBlockList,updateSelectedObjectControls , openLevelOpModal,updateParkingDisplay,toggleFloatingPanel,updateDashboard,toggleBlockLock, saveUnitChanges, openNewCompositeEditor, editSelectedComposite, deleteSelectedComposite, saveCompositeChanges, addSubBlockToCompositeEditor, applyScenario, toggleApartmentMode, openEditUnitModal,updateLevelCounts, populateServiceBlocksDropdown, updateProgramUI ,updateMixTotal    } from './uiController.js';
import { exportReportAsPDF,generateReport  } from './reportGenerator.js';
import { PROJECT_PROGRAMS, AREA_STATEMENT_DATA ,PREDEFINED_BLOCKS , BLOCK_CATEGORY_COLORS } from './config.js';
import { allocateCountsByPercent, getPolygonProperties, getOffsetPolygon } from './utils.js';
import { layoutFlatsOnPolygon } from './apartmentLayout.js';
import { handleDxfUpload, assignDxfAsPlot,finalizeDxf,deleteDxf,updateDxfStrokeWidth, exportProjectZIP, importProjectZIP  } from './io.js';

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
    document.querySelectorAll('.param-input').forEach(inp => inp.addEventListener('input', updateDashboard));
    document.getElementById('toggle-lock-btn').addEventListener('click', toggleBlockLock);
    document.getElementById('zip-upload').addEventListener('change', handleImportZIP);
    document.getElementById('export-zip-btn').addEventListener('click', () => exportProjectZIP(state.canvas));
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
    
    document.getElementById('footprint-from-setbacks-btn').addEventListener('click', createFootprintFromSetbacks);
    document.getElementById('footprint-from-plot-btn').addEventListener('click', createFootprintFromPlot);
    document.getElementById('draw-parking-btn').addEventListener('click', () => enterMode('drawingParking'));
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
    document.getElementById('previewLayoutBtn').addEventListener('click', handlePreviewLayout);
    document.getElementById('show-balconies-check').addEventListener('change', handlePreviewLayout);
    document.getElementById('show-corridor-check').addEventListener('change', handlePreviewLayout);
    document.getElementById('zoom-in-btn').addEventListener('click', () => zoomCanvas(1.2));
    document.getElementById('zoom-out-btn').addEventListener('click', () => zoomCanvas(1 / 1.2));
    document.getElementById('zoom-reset-btn').addEventListener('click', resetZoom);
    document.getElementById('pan-btn').addEventListener('click', () => enterMode('panning'));
    window.addEventListener('keydown', e => {
        if (e.code === 'Space' && !state.currentMode && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement)) {
            e.preventDefault(); enterMode('panning');
        }
    });
    window.addEventListener('keyup', e => {
        if (e.code === 'Space' && state.currentMode === 'panning') { exitAllModes(); }
    });
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
         const lockIcon = new fabric.Text("🔒", { fontSize: 5, left:2, top:2, visible: true }); // Default Locked
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
            left: x_px + blockWidth / 2, top: y_px + blockHeight / 2
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
        // This callback runs after all assets are loaded from the zip
        resetState (true); // true = keep objects that were just loaded
        state.canvas.getObjects().forEach(obj => {
            if (obj.isPlot) state.plotPolygon = obj;
            else if (obj.isFootprint && obj.level && state.levels[obj.level]) state.levels[obj.level].objects.push(obj);
            else if (obj.isServiceBlock || obj.isCompositeGroup) state.serviceBlocks.push(obj);
            else if (obj.isParkingRow) state.parkingRows.push(obj);
            else if (obj.isGuide) state.guideLines.push(cloned);
            else if (obj.isDxfOverlay) state.dxfOverlayGroup = obj;
        });
        document.getElementById('status-bar').textContent = 'Project Imported Successfully.';
        renderServiceBlockList();
        updateParkingDisplay();
        applyLevelVisibility();
        updateLevelFootprintInfo();
        updateUI();
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

    const poly = polys[0]; 
    const counts = state.lastCalculatedData.aptCalcs.aptMixWithCounts.reduce((acc, apt) => ({ ...acc, [apt.key]: apt.countPerFloor }), {});
    state.currentApartmentLayout = layoutFlatsOnPolygon(poly, counts, includeBalconiesInOffset, calcMode);

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
                // After setting scale, check if the PDF background needs higher resolution
                checkAndRescalePdf();
            } else {
                 document.getElementById('status-bar').textContent = "Invalid length provided. Please enter a number in the 'Known Distance' field.";
            }
            exitAllModes();
        }
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
        handleFinishPolygon(result.polygon);
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
    let pointer = state.canvas.getPointer(o.e);
    if (state.currentMode === 'measuring') {
        document.getElementById('status-bar').textContent='Start measuring ..';
        if(measurePoint1) drawMeasurement(getOverlayContext(), measurePoint1, o.e);
        const snapPoint = findSnapPoint(pointer);
        updateSnapIndicators(snapPoint); // Show snap indicators while measuring
        return;
    }
    if (state.currentMode === 'aligningObject') {
        const targetEdge = getNearestEdge(pointer, state.plotPolygon, state.setbackGuides);
        updateAlignmentHighlight(targetEdge);
        return;
    }
    if (state.currentMode === 'editingSetback') {
        updateEdgeHighlight(pointer);
        return;
    }
    const moveResult = handleCanvasMouseMove(o) || {};
    state.livePreviewLayout = moveResult.liveLayoutData;
    if (moveResult.liveUnitCounts) updateParkingDisplay(moveResult.liveUnitCounts);
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
}
export function  handleAfterRender() {
    if(isMeasuring && measurePoint1) return;
    clearOverlay();
    const layoutToDraw = state.livePreviewLayout || state.currentApartmentLayout;
    if (layoutToDraw) redrawApartmentPreview(layoutToDraw);
}
export function  handleObjectModified(e) {
    const target = e.target;
    if (!target) return;
    clearEdgeSnapIndicator();
    if (target.isServiceBlock || target.isCompositeGroup) renderServiceBlockList();
    if (target.isParkingRow){ updateParkingDisplay(); }
    if (target.isFootprint) {
        updateLevelFootprintInfo();
    }
    if (target.isFootprint && state.currentLevel === 'Typical_Floor' && state.projectType === 'Residential' && state.currentProgram) {
        const program = state.currentProgram;
        
        // Handle perimeter for both Polygon and Polyline (Linear)
        let tempPerimeter = 0;
        if (target.points) {
            if (target.type === 'polyline') {
                // Manually calc length for polyline
                for (let i = 0; i < target.points.length - 1; i++) {
                    const p1 = target.points[i];
                    const p2 = target.points[i+1];
                    tempPerimeter += Math.hypot(p2.x - p1.x, p2.y - p1.y);
                }
                tempPerimeter *= state.scale.ratio; // Scale
            } else {
                tempPerimeter = getPolygonProperties(target).perimeter;
            }
        }

        const totalMix = program.unitTypes.reduce((sum, unit) => sum + unit.mix, 0) || 1;
        const avgFrontage = program.unitTypes.reduce((acc, unit) => acc + (unit.frontage * (unit.mix / totalMix)), 0);
        if (avgFrontage > 0) {
            const calcMode = document.getElementById('apartment-calc-mode').value;
            const balconyPlacement = document.getElementById('balcony-placement').value;
            const includeBalconiesInOffset = balconyPlacement === 'recessed';

            const estimatedUnits = Math.floor(tempPerimeter / avgFrontage);
            const counts = allocateCountsByPercent(estimatedUnits, program.unitTypes);
            state.livePreviewLayout = layoutFlatsOnPolygon(target, counts, includeBalconiesInOffset, calcMode);
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
}
export function  applyIndividualSetbacks() {
    const distance= parseFloat(document.getElementById('individual-setback-dist').value);
    const direction = document.getElementById('individual-setback-dir').value;
    if (isNaN(distance) || state.selectedPlotEdges.length === 0) {
        document.getElementById('status-bar').textContent = "Please select one or more plot edges and enter a valid distance.";
        return;
    }
    state.selectedPlotEdges.forEach(index => { state.plotEdgeProperties[index] = { distance, direction }; });
    drawSetbackGuides();
}
export function  clearSetbackSelection() {
    state.selectedPlotEdges = [];
    clearEdgeHighlight();
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

    if ((mode === 'drawingBuilding' || mode === 'drawingLinearBuilding') && state.plotPolygon) drawSetbackGuides();
    if (mode === 'placingCompositeBlock') selectedCompositeBlockData = data;
    if (mode === 'editingSetback') document.getElementById('individual-setback-controls').style.display = 'block';
    if (mode === 'editingFootprint') {
        const footprints = state.levels[state.currentLevel]?.objects;
        if (footprints && footprints.length > 0) {
            const footprintToEdit = footprints[0]; // Simple: edit the first one
            makeFootprintEditable(footprintToEdit);
            state.canvas.setActiveObject(footprintToEdit);
            state.canvas.renderAll();
        } else {
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
export function  makeFootprintEditable(polygon) {
    if (!polygon || !polygon.points) return;
    polygon.originalControls = polygon.controls;
    polygon.controls = {};
    polygon.set({ hasControls: true, cornerColor: 'rgba(255,0,0,0.7)', cornerStyle: 'circle', transparentCorners: false, cornerSize: 12, lockMovementX: true, lockMovementY: true, lockScalingX: true, lockScalingY: true, lockRotation: true, });

    polygon.points.forEach((point, index) => {
        polygon.controls['p' + index] = new fabric.Control({
            positionHandler: (dim, finalMatrix, fabricObject) => fabric.util.transformPoint(fabricObject.points[index], fabricObject.calcTransformMatrix()),
            actionHandler: (eventData, transform, x, y) => {
                const poly = transform.target;
                const mouseLocalPosition = fabric.util.transformPoint({ x: x, y: y }, fabric.util.invertTransform(poly.calcTransformMatrix()));
                poly.points[index].x = mouseLocalPosition.x;
                poly.points[index].y = mouseLocalPosition.y;
                return true;
            },
            actionName: 'modifyPolygon',
            render: (ctx, left, top, styleOverride, fabricObject) => {
                ctx.save(); ctx.translate(left, top); ctx.fillStyle = 'rgba(0,0,255,0.7)'; ctx.beginPath(); ctx.arc(0, 0, 6, 0, 2 * Math.PI, false); ctx.fill(); ctx.restore();
            },
        });
    });

    polygon.on('modified', () => {
        const { min, max } = fabric.util.getBoundsOfPoints(polygon.points);
        polygon.set({
            pathOffset: { x: min.x + (max.x - min.x) / 2, y: min.y + (max.y - min.y) / 2 },
            width: max.x - min.x, height: max.y - min.y,
        }).setCoords();
        handleObjectModified({ target: polygon });
    });
    polygon.setCoords();
}
export function  makeFootprintUneditable(polygon) {
    if (!polygon) return;
    polygon.controls = polygon.originalControls || fabric.Object.prototype.controls;
    polygon.off('modified');
    polygon.set({ hasControls: false, selectable: false, evented: false, stroke: 'red', lockMovementX: false, lockMovementY: false, lockScalingX: false, lockScalingY: false, lockRotation: false, }).setCoords();
    state.canvas.renderAll();
}

export function  handleFinishPolygon(shape, modeOverride = null) {
    state.livePreviewLayout = null;
    const currentMode = modeOverride || state.currentMode;
    
    // If it's a closed polygon (not linear/polyline)
    const isClosed = shape.type === 'polygon';

    if (currentMode === 'drawingPlot') {
        if (state.plotPolygon) state.canvas.remove(state.plotPolygon);
        state.plotPolygon = shape;
        shape.set({ fill: 'rgba(0, 0, 255, 0.1)', stroke: 'rgba(0, 0, 255, 0.6)', strokeWidth: 1.5, level: 'Plot', selectable: false, evented: false, isPlot: true, strokeUniform: true });
        state.plotEdgeProperties = shape.points.map(() => ({ distance: 5, direction: 'inside' }));
    } else if (currentMode === 'drawingBuilding' || currentMode === 'drawingLinearBuilding') {
        const levelData = state.levels[state.currentLevel];
        
        // For linear building (Polyline), allow stroke but transparent fill
        if(!isClosed) {
             shape.set({ fill: 'transparent', stroke: 'red', strokeWidth: 3 });
        } else {
             shape.set({ fill: levelData.color, stroke: 'red' });
        }

        shape.set({ level: state.currentLevel, selectable: false, evented: false, isFootprint: true, strokeUniform: true });
        levelData.objects.push(shape);
        updateLevelFootprintInfo();
        
        // Auto-place core logic applies to Closed polygons mainly
        if (isClosed && document.getElementById('auto-place-core-check').checked) {
            const coreForLevel = state.userCompositeBlocks.find(core => core.level === state.currentLevel || core.name.toLowerCase().includes(state.currentLevel.toLowerCase().replace('_', ' ')));
            if (coreForLevel) {
                const coreIndex = state.userCompositeBlocks.indexOf(coreForLevel);
                document.getElementById('composite-block-select').value = coreIndex;
                createCompositeGroup(coreForLevel, shape.getCenterPoint());
            } else {
                const selectedIndex = document.getElementById('composite-block-select').value;
                const selectedData = state.userCompositeBlocks[selectedIndex];
                if (selectedData) { createCompositeGroup(selectedData, shape.getCenterPoint()); }
            }
        }
    }
    state.canvas.add(shape);
    state.canvas.renderAll();
    exitAllModes();
}