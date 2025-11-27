// MODULE 12: UI CONTROLLER (uiController.js equivalent)
// =====================================================================

import { LEVEL_ORDER, LEVEL_DEFINITIONS, PREDEFINED_COMPOSITE_BLOCKS ,AREA_STATEMENT_DATA, HOTEL_REQUIREMENTS, PREDEFINED_BLOCKS   } from './config.js';
import { f,fInt ,getPolygonProperties} from './utils.js';
import { resetState, state } from './state.js';
import { getCanvas } from './canvasController.js';
import { enterMode, handleCalculate } from './eventHandlers.js';
  
export function initUI() {
    const levelSelector = document.getElementById('level-selector');
    levelSelector.innerHTML = ''; 
    LEVEL_ORDER.forEach(levelKey => {
        const btn = document.createElement('button');
        btn.dataset.level = levelKey;
        const name = levelKey.replace(/_/g, ' ');
        btn.innerHTML = `${name}<span id="${levelKey}-count"></span>`;
        levelSelector.appendChild(btn);
    });
    document.getElementById('composite-default-level').innerHTML = LEVEL_ORDER.map(l => `<option value="${l}">${l.replace(/_/g, ' ')}</option>`).join('');
    populateServiceBlocksDropdown();
    populateCompositeBlocks();
    updateLevelCounts();
    updateProgramUI();
    updateLevelFootprintInfo();
}
export function updateUI() {
    const canvas = getCanvas();
    const scaleSet = state.scale.ratio > 0;
    const hasPlot = !!state.plotPolygon;
    
    const hasTypicalFootprint = state.levels['Typical_Floor']?.objects.length > 0;
    const hasHotelFootprint = state.levels['Hotel']?.objects.length > 0;
    const hasCalculableFootprint = hasTypicalFootprint || hasHotelFootprint;

    const hasAnyFootprint = Object.values(state.levels).some(l => l.objects.length > 0);
    const hasSelection = !!state.canvas.getActiveObject();
    const hasFootprintOnCurrentLevel = state.levels[state.currentLevel]?.objects.length > 0;
    
    const isEditingFootprint = state.currentMode === 'editingFootprint';
    const isFootprintSelected = hasSelection && canvas.getActiveObject()?.isFootprint;

    document.getElementById('edit-footprint-btn').disabled = !hasFootprintOnCurrentLevel;
    document.getElementById('edit-footprint-btn').style.display = isEditingFootprint ? 'none' : 'inline-block';
    
    document.getElementById('delete-footprint-btn').disabled = !(isFootprintSelected || (isEditingFootprint && hasSelection));
    document.getElementById('confirm-footprint-btn').style.display = isEditingFootprint ? 'block' : 'none';

    const setScaleBtn = document.getElementById('set-scale-btn');
    setScaleBtn.disabled = !scaleReady;
    setScaleBtn.classList.toggle('active', state.currentMode === 'scaling');
    setScaleBtn.textContent = state.currentMode === 'scaling' ? 'Cancel Scaling' : 'Set Scale';
    document.getElementById('scale-distance').disabled = !scaleReady;

    document.getElementById('draw-plot-btn').disabled = !scaleSet;
    document.getElementById('measure-tool-btn').disabled = !scaleSet;
    document.getElementById('draw-guide-btn').disabled = !scaleSet;
    document.getElementById('draw-building-btn').disabled = !hasPlot;
    document.getElementById('footprint-from-setbacks-btn').disabled = !hasPlot;
    document.getElementById('edit-setbacks-btn').disabled = !hasPlot;

    document.getElementById('add-block-btn').disabled = !scaleSet || !hasAnyFootprint;
    document.getElementById('place-composite-btn').disabled = !scaleSet || !hasAnyFootprint;
    document.getElementById('draw-parking-btn').disabled = !scaleSet || !hasAnyFootprint;
    document.getElementById('draw-bus-bay-btn').disabled = !scaleSet || !hasAnyFootprint;
    document.getElementById('draw-loading-bay-btn').disabled = !scaleSet || !hasAnyFootprint;

    document.getElementById('calculateBtn').disabled = !hasPlot || !hasCalculableFootprint;
    document.getElementById('generateDetailedReportBtn').disabled = !hasPlot || !hasCalculableFootprint;
    document.getElementById('export-pdf-btn').disabled = !state.lastCalculatedData;
    document.getElementById('previewLayoutBtn').disabled = !hasTypicalFootprint || !state.lastCalculatedData || state.projectType !== 'Residential';
    document.getElementById('generate3dBtn').disabled = !hasAnyFootprint;
    document.getElementById('exportScadBtn').disabled = !hasAnyFootprint;
    
    document.querySelectorAll('#level-selector button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.level === state.currentLevel);
    });

    document.getElementById('selected-object-controls').style.display = (hasSelection && !canvas.getActiveObject()?.isFootprint) ? 'block' : 'none';
    document.getElementById('dxf-controls').style.display = state.dxfOverlayGroup ? 'block' : 'none';

    const statusBar = document.getElementById('status-bar');
    if (state.currentMode === 'aligningObject') {
        statusBar.textContent = 'Mode: Align Object. Hover and click on a plot edge or setback line to align.';
    } else if (!state.currentMode) {
        statusBar.textContent = 'Ready.';
    }
    
    document.getElementById('scale-display').textContent = scaleSet ? `Scale: 1m ≈ ${(1 / state.scale.ratio).toFixed(2)}px` : 'Scale not set.';
    document.getElementById('plot-info').innerHTML = hasPlot ? `<b>Plot:</b> Area: ${f(getPolygonProperties(state.plotPolygon).area)} m² | Perim: ${f(getPolygonProperties(state.plotPolygon).perimeter)} m` : '';
}
export function updateLiveApartmentCalc() {
    const container = document.getElementById('dash-wing-details');
    if (state.projectType !== 'Residential' || !state.currentProgram) {
        container.innerHTML = '';
        return;
    }

    const typicalFootprints = state.levels['Typical_Floor'].objects.filter(o => o.isFootprint);
    if (typicalFootprints.length === 0) {
        container.innerHTML = '';
        return;
    }

    const program = state.currentProgram;
    const totalMix = program.unitTypes.reduce((sum, unit) => sum + (unit.mix || 0), 0) || 1;
    const avgFrontage = program.unitTypes.reduce((acc, unit) => acc + (unit.frontage * (unit.mix / totalMix)), 0);

    if (avgFrontage === 0) {
        container.innerHTML = '';
        return;
    }

    let html = '<div class="dash-row header">Live Unit Estimate (per Floor)</div>';
    let totalUnits = 0;

    typicalFootprints.forEach((footprint, index) => {
        const perimeter = getPolygonProperties(footprint).perimeter;
        const estimatedUnits = Math.floor(perimeter / avgFrontage);
        totalUnits += estimatedUnits;
        html += `<div class="wing-row"><span>Wing ${index + 1}:</span> <b>${estimatedUnits} units</b></div>`;
    });

    if (typicalFootprints.length > 1) {
        html += `<div class="wing-total"><span>Total Est. Units:</span> <b>${totalUnits} units</b></div>`;
    }
    
    container.innerHTML = html;
}
export function updateLevelFootprintInfo() {
    const infoDiv = document.getElementById('level-footprint-info');
    const footprints = state.levels[state.currentLevel]?.objects.filter(o => o.isFootprint);

    if (!footprints || footprints.length === 0 || state.scale.ratio === 0) {
        infoDiv.innerHTML = ''; return;
    }

    let totalArea = 0;
    let listHTML = '<h4>Footprints on this Level</h4><ul>';
    footprints.forEach((poly, index) => {
        const props = getPolygonProperties(poly);
        totalArea += props.area;
        listHTML += `<li><b>Poly ${index + 1}:</b> ${f(props.area)} m² (Perim: ${f(props.perimeter, 1)} m)</li>`;
    });
    listHTML += '</ul>';
    
    if (footprints.length > 1) {
        listHTML += `<div style="text-align:right; font-weight:bold; margin-top:5px;">Total Area: ${f(totalArea)} m²</div>`;
    }
    infoDiv.innerHTML = listHTML;
}
export function updateLevelCounts() {
    const params = {};
    document.querySelectorAll('.param-input').forEach(input => { params[input.id] = parseInt(input.value) || 0; });

    LEVEL_ORDER.forEach(levelKey => {
        const span = document.getElementById(`${levelKey}-count`);
        if (span) {
            const countKey = LEVEL_DEFINITIONS[levelKey].countKey;
            span.textContent = countKey ? ` (${params[countKey]})` : ' (1)';
        }
    });
}
export function applyLevelVisibility() {
    const canvas = getCanvas();
    if (!canvas) return;

    canvas.getObjects().forEach(obj => {
        if (obj.isSnapIndicator || obj.isEdgeHighlight) {
            obj.set('visible', true);
            return;
        }
        if (obj.isPlot || obj.isDxfOverlay) {
            obj.set('visible', true);
            return;
        }
        if (obj.level) {
            obj.set('visible', state.allLayersVisible || obj.level === state.currentLevel);
        }
    });
    
    document.getElementById('toggle-visibility-btn').textContent = state.allLayersVisible ? "Isolate Current Layer" : "Show All Layers";
    canvas.renderAll();
}
export function populateServiceBlocksDropdown() {
    const selectEl = document.getElementById('serviceBlockType');
    const addSubBlockSelect = document.getElementById('add-sub-block-select');
    selectEl.innerHTML = '';
    addSubBlockSelect.innerHTML = '';

    const filteredData = AREA_STATEMENT_DATA.filter(item => !item.projectTypes || item.projectTypes.includes(state.projectType));

    const sortedData = [...filteredData].sort((a, b) => {
        const levelIndexA = LEVEL_ORDER.indexOf(a.level);
        const levelIndexB = LEVEL_ORDER.indexOf(b.level);
        if (levelIndexA !== levelIndexB) { return levelIndexA - levelIndexB; }
        return a.name.localeCompare(b.name);
    });
    
    sortedData.forEach(item => {
        const key = `${item.name.replace(/[\s().]/g, '_')}_${item.w}_${item.h}`;
        const option = document.createElement('option');
        option.value = key;
        const levelText = item.level.replace(/_/g, ' ');
        option.textContent = `[${levelText}] ${item.name} (${item.w}x${item.h})`;
        selectEl.appendChild(option);
        addSubBlockSelect.appendChild(option.cloneNode(true));
    });
}
export function populateCompositeBlocks() {
    const select = document.getElementById('composite-block-select');
    const selectedValue = select.value;
    select.innerHTML = '';
    state.userCompositeBlocks.forEach((block, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = block.name;
        select.appendChild(option);
    });
    if (selectedValue) select.value = selectedValue;
    updateUI();
}
export function renderServiceBlockList() {
    const listEl = document.getElementById('service-block-list');
    if (state.serviceBlocks.length === 0 || state.scale.ratio === 0) {
        listEl.innerHTML = '<p style="color:#888; text-align:center;">No blocks placed.</p>';
        return;
    }

    const blocksByLevelAndCat = state.serviceBlocks.reduce((acc, block) => {
        const level = block.level || 'Unassigned';
        const category = (block.blockData?.category || 'default').toUpperCase();
        if (!acc[level]) acc[level] = {};
        if (!acc[level][category]) acc[level][category] = [];
        acc[level][category].push(block);
        return acc;
    }, {});

    let html = '';
    let grandTotalArea = 0;
    Object.keys(blocksByLevelAndCat).sort().forEach(level => {
        html += `<div style="font-weight:bold; background-color:#f4f7f9; padding: 2px 4px; margin-top: 5px;">${level.replace(/_/g, ' ')}</div>`;
        Object.keys(blocksByLevelAndCat[level]).sort().forEach(category => {
            let categoryTotalArea = 0;
            html += `<ul style="list-style-type: none; padding-left: 10px; margin: 2px 0;">`;
            blocksByLevelAndCat[level][category].forEach(block => {
                const areaM2 = (block.getScaledWidth() * block.getScaledHeight()) * (state.scale.ratio * state.scale.ratio);
                categoryTotalArea += areaM2;
                html += `<li title="${block.blockId}: ${block.blockData.name}">${block.blockId}: ${areaM2.toFixed(1)} m²</li>`;
            });
            html += `</ul>`;
            html += `<div style="text-align:right; font-weight:bold; font-size:0.9em; border-top: 1px dotted #ccc; padding: 2px 4px;">Total ${category}: ${categoryTotalArea.toFixed(1)} m²</div>`;
            grandTotalArea += categoryTotalArea;
        });
    });
    html += `<div style="font-weight:bold; background-color:var(--primary-color); color:white; padding: 4px; margin-top: 10px; text-align:right;">Grand Total: ${grandTotalArea.toFixed(1)} m²</div>`;
    listEl.innerHTML = html;
}

export function updateSelectedObjectControls(obj) {
    const wrapper = document.getElementById('selected-object-controls');
    if (!obj || obj.isFootprint) {
        wrapper.style.display = 'none';
        return;
    }
    
    wrapper.style.display = 'block';
    const isServiceBlock = obj.isServiceBlock;
    const isComposite = obj.isCompositeGroup;
    
    const canResize = isServiceBlock && !isComposite;
    document.getElementById('dimension-controls-wrapper').style.display = canResize ? 'grid' : 'none';
    
    if (canResize) {
        document.getElementById('block-width').value = (obj.getScaledWidth() * state.scale.ratio).toFixed(2);
        document.getElementById('block-height').value = (obj.getScaledHeight() * state.scale.ratio).toFixed(2);
    }
    
    document.getElementById('block-rotation').value = (obj.angle || 0).toFixed(1);
}

export function updateParkingDisplay(liveUnitCounts = null) {
    const totalEl = document.getElementById('parking-required-total');
    const provEl = document.getElementById('parking-provided');

    const params = {};
    document.querySelectorAll('.param-input').forEach(input => { params[input.id] = parseInt(input.value) || 0; });
    
    const providedParking = state.parkingRows.reduce((sum, row) => {
        let multiplier = 1;
        if (row.level === 'Basement') multiplier = params.numBasements;
        if (row.level === 'Podium') multiplier = params.numPodiums;
        return sum + (row.parkingCount || 0) * multiplier;
    }, 0);
    provEl.textContent = fInt(providedParking);

    const isHotel = state.projectType === 'Hotel';
    document.getElementById('residential-parking-breakdown').style.display = isHotel ? 'none' : 'block';
    document.getElementById('hotel-parking-breakdown').style.display = isHotel ? 'block' : 'none';
    
    document.querySelectorAll('#parking-info b').forEach(el => { 
        if(el.id !== 'parking-provided' && el.id !== 'parking-required-total') el.textContent = '0'; 
    });

    if (state.lastCalculatedData) {
        const parkingData = state.lastCalculatedData.parking;
        if (isHotel) {
            parkingData.breakdown.forEach(item => {
                if (item.use.includes('Key Room')) document.getElementById('parking-required-hotel-key').textContent = fInt(item.required);
                else if (item.use.includes('Suite')) document.getElementById('parking-required-hotel-suite').textContent = fInt(item.required);
                else if (item.use.includes('Restaurant')) document.getElementById('parking-required-hotel-restaurant').textContent = fInt(item.required);
                else if (item.use.includes('Office')) document.getElementById('parking-required-hotel-office').textContent = fInt(item.required);
                else if (item.use.includes('Ballroom')) document.getElementById('parking-required-hotel-ballroom').textContent = fInt(item.required);
                else if (item.use.includes('Meeting')) document.getElementById('parking-required-hotel-meeting').textContent = fInt(item.required);
                else if (item.use.includes('Retail')) document.getElementById('parking-required-hotel-retail').textContent = fInt(item.required);
            });
        } else { 
            let res = 0, off = 0, ret = 0;
            parkingData.breakdown.forEach(item => {
                if (item.use.includes('Residential') || item.use.includes('Studio') || item.use.includes('Bedroom') || item.use.includes('visitors')) res += item.required;
                else if (item.use.includes('Office')) off += item.required;
                else if (item.use.includes('Retail')) ret += item.required;
            });
            document.getElementById('parking-required-residential').textContent = fInt(res);
            document.getElementById('parking-required-office').textContent = fInt(off);
            document.getElementById('parking-required-retail').textContent = fInt(ret);
        }
        totalEl.textContent = fInt(parkingData.required);
    } else if (liveUnitCounts) {
        if (state.projectType === 'Residential' && state.currentProgram) {
            let resParking = 0;
            Object.keys(liveUnitCounts).forEach(key => {
                const unit = state.currentProgram.unitTypes.find(u => u.key === key);
                if (unit) resParking += (liveUnitCounts[key] || 0) * state.currentProgram.parkingRule(unit);
            });
            resParking += Math.ceil(resParking * 0.1); 
            totalEl.textContent = fInt(resParking);
            document.getElementById('parking-required-residential').textContent = fInt(resParking);
        } else { totalEl.textContent = '...'; }
    } else {
        const params = {};
        document.querySelectorAll('.param-input').forEach(input => { if (input.type === 'number') params[input.id] = parseInt(input.value) || 0; });
        const officeParkingReq = Math.ceil((params.allowedOfficeGfa || 0) / 50);
        const retailParkingReq = Math.ceil((params.allowedRetailGfa || 0) / 70);
        document.getElementById('parking-required-office').textContent = fInt(officeParkingReq);
        document.getElementById('parking-required-retail').textContent = fInt(retailParkingReq);
        totalEl.textContent = fInt(officeParkingReq + retailParkingReq);
    }
}
export function updateProgramUI() {
    const programControls = document.getElementById('program-specific-controls');
    if (state.currentProgram) {
        programControls.style.display = 'block';
        document.getElementById('mix-title').textContent = `9. ${state.currentProgram.title}`;
        document.getElementById('unit-defs-title').textContent = `10. ${state.currentProgram.unitDefsTitle}`;
        renderDistUI();
        renderUnitCards();
    } else {
        programControls.style.display = 'none';
    }
}
export function renderDistUI(){
    const distSlidersContainer = document.getElementById('dist-sliders-container');
    const manualCountsContainer = document.getElementById('manual-counts-container');
    const scenarioSelect = document.getElementById('scenarioSelect');
    distSlidersContainer.innerHTML = `<div class="dist-header"><span>Unit</span><span>Mix</span><span></span><span>Balcony %</span></div>`;
    manualCountsContainer.innerHTML = '<h4>Manual Unit Counts (Total)</h4>';
    scenarioSelect.innerHTML = state.currentProgram.scenarios.map(s => `<option value="${s.name}">${s.name}</option>`).join('');

    state.currentProgram.unitTypes.forEach(unit => {
        const sliderRow = document.createElement('div');
        sliderRow.className = 'dist-row';
        sliderRow.innerHTML = `<label for="range-${unit.key}">${unit.type}</label>
            <input type="range" id="range-${unit.key}" min="0" max="100" value="${unit.mix||0}" data-key="${unit.key}" class="mix-input">
            <input type="number" id="num-${unit.key}" min="0" max="100" value="${unit.mix||0}" data-key="${unit.key}" class="mix-input">
            <input type="number" id="balc-${unit.key}" min="0" max="100" value="${unit.balconyCoverage||80}" data-key="${unit.key}" class="balcony-coverage-input" title="Balcony Coverage %">`;
        distSlidersContainer.appendChild(sliderRow);

        const manualRow = document.createElement('div');
        manualRow.className = 'manual-count-row';
        manualRow.innerHTML = `<label for="manual-count-${unit.key}">${unit.type}</label><input type="number" id="manual-count-${unit.key}" data-key="${unit.key}" class="manual-count-input" value="0" min="0">`;
        manualCountsContainer.appendChild(manualRow);
    });
    updateMixTotal();
    document.querySelectorAll('.manual-count-input').forEach(input => { input.addEventListener('input', () => handleCalculate(true)); });
    document.querySelectorAll('.balcony-coverage-input').forEach(input => {
        input.addEventListener('input', (e) => {
            const key = e.target.dataset.key;
            const unit = state.currentProgram.unitTypes.find(a => a.key === key);
            if (unit) { unit.balconyCoverage = parseInt(e.target.value) || 0; handleCalculate(true); }
        });
    });
}
export function updateMixTotal() {
    if (!state.currentProgram) return;
    const total = state.currentProgram.unitTypes.reduce((sum, t) => sum + (t.mix || 0), 0);
    document.getElementById('mixTotal').textContent = `${total.toFixed(0)}%`;
}
export function applyScenario(name) {
    const selected = state.currentProgram.scenarios.find(s => s.name === name);
    if (selected) {
        state.currentProgram.unitTypes.forEach((unit, i) => { unit.mix = selected.mix[i] || 0; });
        renderDistUI();
        handleCalculate(true);
    }
}
export function toggleApartmentMode(mode) {
    const distSliders = document.getElementById('dist-sliders');
    const manualCounts = document.getElementById('manual-counts-container');
    if (mode === 'auto') { distSliders.style.display = 'block'; manualCounts.style.display = 'none'; } 
    else { distSliders.style.display = 'none'; manualCounts.style.display = 'block'; }
    handleCalculate(true);
}
export function renderUnitCards() {
    const container = document.getElementById('unit-cards-container');
    container.innerHTML = '';
    state.currentProgram.unitTypes.forEach(unit => {
        const card = document.createElement('div');
        card.className = 'unit-card';
        card.dataset.key = unit.key;
        
        const bounds = unit.layout.reduce((acc, room) => ({
            minX: Math.min(acc.minX, room.x), minY: Math.min(acc.minY, room.y),
            maxX: Math.max(acc.maxX, room.x + room.w), maxY: Math.max(acc.maxY, room.y + room.h)
        }), { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });
        
        const totalWidth = bounds.maxX - bounds.minX;
        const totalHeight = bounds.maxY - bounds.minY;
        let layoutSvg = '';
        
        if (totalWidth > 0 && totalHeight > 0) {
            unit.layout.forEach(room => {
                const relX = room.x - bounds.minX;
                const relY = room.y - bounds.minY;
                layoutSvg += `<g><rect x="${relX}" y="${relY}" width="${room.w}" height="${room.h}" fill="white" stroke="${unit.color}" stroke-width="0.1"/><text x="${relX + room.w / 2}" y="${relY + room.h / 2}" font-size="${Math.min(room.w, room.h) * 0.25}" fill="#333" text-anchor="middle" dominant-baseline="middle">${room.name}</text></g>`;
            });
        }
        
        const svg = `<svg viewBox="-0.5 -0.5 ${totalWidth + 1} ${totalHeight + 1}" style="width: 100%; height: auto; border-radius: 4px; background-color:${unit.color.replace('0.7', '0.2')}"><rect x="0" y="0" width="${totalWidth}" height="${totalHeight}" rx="0.2" fill="none" stroke="${unit.color}" stroke-width="0.2"/>${layoutSvg}</svg>`;

        card.innerHTML = `
            <div style="display:flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                <b style="font-size:0.9em;">${unit.type}</b>
                <span style="font-size:0.75em; background-color:#e8eaf6; color: #1a237e; padding: 2px 6px; border-radius:10px;">${unit.area.toFixed(1)} m²</span>
            </div>
            <div style="font-size:0.8em; color:#555; margin-bottom:8px;">Frontage: ${unit.frontage.toFixed(1)} m | Depth: ${unit.depth.toFixed(1)} m</div>
            ${svg}`;
        container.appendChild(card);
    });
}
export function openEditUnitModal(key) {
    const unit = state.currentProgram.unitTypes.find(t => t.key === key);
    if (!unit) return;
    
    tempUnitData = JSON.parse(JSON.stringify(unit)); 
    document.getElementById('edit-unit-title').textContent = `Edit ${unit.type}`;
    renderUnitEditorBody();
    document.getElementById('edit-unit-modal').style.display = 'flex';
}
export function renderUnitEditorBody() {
    const body = document.getElementById('edit-unit-body');
    const parkingRatio = state.currentProgram.parkingRule ? state.currentProgram.parkingRule(tempUnitData) : (tempUnitData.parkingRatio || 1);
    const propertiesHTML = `
        <div class="input-grid" style="margin-bottom: 20px;">
            <div><label for="unit-editor-type">Unit Name</label><input type="text" id="unit-editor-type" value="${tempUnitData.type}"></div>
            <div><label for="unit-editor-parking">Parking Required (bays/unit)</label><input type="number" step="0.1" id="unit-editor-parking" value="${parkingRatio}"></div>
            <div><label for="unit-editor-balcony-mult">Balcony Depth (m)</label><input type="number" step="0.1" id="unit-editor-balcony-mult" value="${tempUnitData.balconyMultiplier || 1.8}"></div>
            <div><label for="unit-editor-balcony-cov">Balcony Coverage (%)</label><input type="number" step="1" id="unit-editor-balcony-cov" value="${tempUnitData.balconyCoverage || 80}"></div>
        </div>
        <h4>Room Layout</h4>`;

    let tableHTML = `<table class="report-table"><thead><tr><th>Name</th><th>X</th><th>Y</th><th>W</th><th>H</th><th></th></tr></thead><tbody>`;
    tempUnitData.layout.forEach((room, index) => {
        tableHTML += `
            <tr>
                <td><input type="text" class="unit-editor-field" data-index="${index}" data-prop="name" value="${room.name}" style="padding:4px; margin:0;"></td>
                <td><input type="number" step="0.1" class="unit-editor-field" data-index="${index}" data-prop="x" value="${room.x}" style="padding:4px; margin:0;"></td>
                <td><input type="number" step="0.1" class="unit-editor-field" data-index="${index}" data-prop="y" value="${room.y}" style="padding:4px; margin:0;"></td>
                <td><input type="number" step="0.1" class="unit-editor-field" data-index="${index}" data-prop="w" value="${room.w}" style="padding:4px; margin:0;"></td>
                <td><input type="number" step="0.1" class="unit-editor-field" data-index="${index}" data-prop="h" value="${room.h}" style="padding:4px; margin:0;"></td>
                <td><button class="danger remove-room-btn" data-index="${index}" style="width:auto; padding: 4px 8px; font-size: 0.8em; margin:0;">X</button></td>
            </tr>`;
    });
    tableHTML += `</tbody></table><button id="add-room-btn" style="margin-top:10px;">+ Add Room</button>`;
    body.innerHTML = propertiesHTML + tableHTML;
    addUnitEditorListeners();
}
export function addUnitEditorListeners() {
    document.getElementById('unit-editor-type').addEventListener('change', e => { tempUnitData.type = e.target.value; });
    document.getElementById('unit-editor-parking').addEventListener('change', e => { tempUnitData.parkingRatio = parseFloat(e.target.value) || 0; });
    document.getElementById('unit-editor-balcony-mult').addEventListener('change', e => { tempUnitData.balconyMultiplier = parseFloat(e.target.value) || 0; });
    document.getElementById('unit-editor-balcony-cov').addEventListener('change', e => { tempUnitData.balconyCoverage = parseInt(e.target.value) || 0; });
    document.querySelectorAll('.unit-editor-field').forEach(input => {
        input.addEventListener('change', e => {
            const { index, prop } = e.target.dataset;
            tempUnitData.layout[index][prop] = prop === 'name' ? e.target.value : parseFloat(e.target.value) || 0;
        });
    });
    document.querySelectorAll('.remove-room-btn').forEach(button => {
        button.addEventListener('click', e => {
            tempUnitData.layout.splice(e.target.dataset.index, 1);
            renderUnitEditorBody();
        });
    });
    document.getElementById('add-room-btn').addEventListener('click', () => {
        tempUnitData.layout.push({ name: 'New Room', x: 0, y: 0, w: 4, h: 4 });
        renderUnitEditorBody();
    });
}
export function saveUnitChanges() {
    const program = state.currentProgram;
    if (!program || !tempUnitData) return;
    const unitToChange = program.unitTypes.find(t => t.key === currentlyEditingUnitKey);
    if (!unitToChange) return;
    Object.assign(unitToChange, tempUnitData);
    program.calculateUnitDimensions(unitToChange);
    document.getElementById('edit-unit-modal').style.display = 'none';
    currentlyEditingUnitKey = null;
    renderUnitCards();
    renderDistUI(); 
    state.lastCalculatedData = null;
    state.currentApartmentLayout = null;
    document.getElementById('report-container').innerHTML = '<p style="text-align:center; color: #888;">Unit definitions have changed. Please click "Generate Report" to see updated calculations.</p>';
    updateParkingDisplay();
    state.canvas.requestRenderAll();
    updateUI();
}
export function placeSelectedComposite() {
    const index = document.getElementById('composite-block-select').value;
    if (index !== null && state.userCompositeBlocks[index]) {
        enterMode('placingCompositeBlock');
    }
}
let currentlyEditingCompositeIndex = -1;
let tempCompositeData = null;
export function editSelectedComposite() {
    const index = document.getElementById('composite-block-select').value;
    if (index !== null && state.userCompositeBlocks[index]) {
        openCompositeEditor(index);
    }
}
export function deleteSelectedComposite() {
    const index = document.getElementById('composite-block-select').value;
    if (index !== null && state.userCompositeBlocks[index]) {
        if (confirm(`Delete "${state.userCompositeBlocks[index].name}"?`)) {
            state.userCompositeBlocks.splice(index, 1);
            populateCompositeBlocks();
        }
    }
}
export function openNewCompositeEditor() {
    currentlyEditingCompositeIndex = -1;
    tempCompositeData = { name: `New Core ${state.userCompositeBlocks.length + 1}`, level: "Typical_Floor", blocks: [] };
    document.getElementById('edit-composite-title').textContent = "Create New Core";
    document.getElementById('composite-block-name-input').value = tempCompositeData.name;
    document.getElementById('composite-default-level').value = tempCompositeData.level;
    renderCompositeEditorList();
    document.getElementById('edit-composite-modal').style.display = 'flex';
}
export function openCompositeEditor(index) {
    currentlyEditingCompositeIndex = index;
    tempCompositeData = JSON.parse(JSON.stringify(state.userCompositeBlocks[index]));
    if (!tempCompositeData.level) tempCompositeData.level = 'Typical_Floor';
    document.getElementById('edit-composite-title').textContent = `Edit: ${tempCompositeData.name}`;
    document.getElementById('composite-block-name-input').value = tempCompositeData.name;
    document.getElementById('composite-default-level').value = tempCompositeData.level;
    renderCompositeEditorList();
    document.getElementById('edit-composite-modal').style.display = 'flex';
}
export function saveCompositeChanges() {
    const newName = document.getElementById('composite-block-name-input').value.trim();
    if (!newName) { 
        document.getElementById('status-bar').textContent = 'Composite core name cannot be empty.';
        return;
    }
    tempCompositeData.name = newName;
    tempCompositeData.level = document.getElementById('composite-default-level').value;
    if (currentlyEditingCompositeIndex === -1) {
        state.userCompositeBlocks.push(tempCompositeData);
    } else {
        state.userCompositeBlocks[currentlyEditingCompositeIndex] = tempCompositeData;
    }
    populateCompositeBlocks();
    document.getElementById('edit-composite-modal').style.display = 'none';
}
export function renderCompositeEditorList() {
    const listEl = document.getElementById('composite-sub-blocks-list');
    let tableHTML = `<table><thead><tr><th>Block</th><th>W</th><th>H</th><th>X</th><th>Y</th><th></th></tr></thead><tbody>`;
    tempCompositeData.blocks.forEach((blockDef, index) => {
        const blockData = PREDEFINED_BLOCKS[blockDef.key];
        if (!blockData) { console.warn(`Composite block references non-existent block key: "${blockDef.key}". Skipping.`); return; }
        tableHTML += `<tr>
            <td>${blockData.name}</td>
            <td><input type="number" class="composite-field" step="0.1" data-index="${index}" data-axis="w" value="${blockDef.w ?? blockData.width}"></td>
            <td><input type="number" class="composite-field" step="0.1" data-index="${index}" data-axis="h" value="${blockDef.h ?? blockData.height}"></td>
            <td><input type="number" class="composite-field" step="0.1" data-index="${index}" data-axis="x" value="${blockDef.x || 0}"></td>
            <td><input type="number" class="composite-field" step="0.1" data-index="${index}" data-axis="y" value="${blockDef.y || 0}"></td>
            <td><button class="danger remove-sub-block-btn" data-index="${index}">X</button></td>
        </tr>`;
    });
    tableHTML += `</tbody></table>`;
    listEl.innerHTML = tableHTML;
    listEl.querySelectorAll('.composite-field').forEach(i => i.addEventListener('change', (e) => {
        tempCompositeData.blocks[e.target.dataset.index][e.target.dataset.axis] = parseFloat(e.target.value);
    }));
    listEl.querySelectorAll('.remove-sub-block-btn').forEach(b => b.addEventListener('click', (e) => {
        tempCompositeData.blocks.splice(e.target.dataset.index, 1);
        renderCompositeEditorList();
    }));
}
export function addSubBlockToCompositeEditor() {
    const key = document.getElementById('add-sub-block-select').value;
    const blockData = PREDEFINED_BLOCKS[key];
    if (blockData) {
        tempCompositeData.blocks.push({ key, x: 0, y: 0, w: blockData.width, h: blockData.height });
        renderCompositeEditorList();
    }
}
export function openLevelOpModal(mode) {
    const object = state.canvas.getActiveObject();
    if (!object) {
        document.getElementById('status-bar').textContent = 'Please select an object first.';
        return;
    }
    currentLevelOp = { mode, object };
    const modal = document.getElementById('level-op-modal');
    const checklist = document.getElementById('level-checklist');
    const dropdown = document.getElementById('level-select-dropdown');
    if (mode === 'copy') {
        document.getElementById('level-op-title').textContent = 'Copy Object to Levels';
        document.getElementById('copy-level-content').style.display = 'block';
        document.getElementById('move-level-content').style.display = 'none';
        checklist.innerHTML = LEVEL_ORDER.map(levelKey => {
            const isCurrent = levelKey === object.level;
            return `<label><input type="checkbox" value="${levelKey}" ${isCurrent ? 'disabled' : ''}> ${levelKey.replace(/_/g, ' ')} ${isCurrent ? '(current)' : ''}</label>`;
        }).join('');
    } else {
        document.getElementById('level-op-title').textContent = 'Move Object to Level';
        document.getElementById('copy-level-content').style.display = 'none';
        document.getElementById('move-level-content').style.display = 'block';
        dropdown.innerHTML = LEVEL_ORDER.filter(lk => lk !== object.level).map(lk => `<option value="${lk}">${lk.replace(/_/g, ' ')}</option>`).join('');
    }
    modal.style.display = 'flex';
}
export function handleConfirmLevelOp() {
    const { mode, object } = currentLevelOp;
    if (mode === 'move') {
        const newLevel = document.getElementById('level-select-dropdown').value;
        if (newLevel) {
            object.set('level', newLevel);
            renderServiceBlockList();
            applyLevelVisibility();
        }
    } else if (mode === 'copy') {
        const targetLevels = Array.from(document.querySelectorAll('#level-checklist input:checked')).map(cb => cb.value);
        targetLevels.forEach((level, index) => {
            object.clone(cloned => {
                cloned.set({ level, left: object.left + 15 * (index + 1), top: object.top + 15 * (index + 1), });
                if(cloned.isServiceBlock || cloned.isCompositeGroup) state.serviceBlocks.push(cloned);
                else if (cloned.isParkingRow) state.parkingRows.push(cloned);
                else if (cloned.isGuide) state.guideLines.push(cloned);
                state.canvas.add(cloned);
            });
        });
        setTimeout(() => { state.canvas.renderAll(); renderServiceBlockList(); updateParkingDisplay(); }, 500);
    }
    document.getElementById('level-op-modal').style.display = 'none';
}
export function displayHotelRequirements() {
    const starRating = document.getElementById('hotel-star-rating').value;
    const modal = document.getElementById('hotel-req-modal');
    const titleEl = document.getElementById('hotel-req-title');
    const bodyEl = document.getElementById('hotel-req-body');
    titleEl.textContent = `Requirements for ${starRating.replace('-', ' ')} Hotel`;
    const reqData = HOTEL_REQUIREMENTS[starRating];
    if (reqData.Message) {
        bodyEl.innerHTML = `<p>${reqData.Message}</p>`;
    } else {
        let html = '';
        for (const category in reqData) {
            html += `<h4>${category}</h4>`;
            html += '<table class="req-table"><tbody>';
            reqData[category].forEach(item => {
                html += `<tr><td style="width: 30px;"><span class="req-type req-type-${item.type}">${item.type}</span></td><td>${item.text}</td></tr>`;
            });
            html += '</tbody></table>';
        }
        bodyEl.innerHTML = html;
    }
    modal.style.display = 'flex';
}


//
// --- CORE DASHBOARD LOGIC ---
export function updateDashboard() {
   // const inputs = {
        inputs = {
        allowedGfa: parseFloat(document.getElementById('allowedGfa').value) || 0,
        retail: parseFloat(document.getElementById('allowedRetailGfa').value) || 0,
        office: parseFloat(document.getElementById('allowedOfficeGfa').value) || 0,
        nursery: parseFloat(document.getElementById('allowedNurseryGfa').value) || 0,
        basements: parseFloat(document.getElementById('numBasements').value) || 0,
        podiums: parseFloat(document.getElementById('numPodiums').value) || 0,
        floors: parseFloat(document.getElementById('numTypicalFloors').value) || 0
    };

    // 1. Plot Area
    let plotArea = 0;
    const manualArea = parseFloat(document.getElementById('manual-plot-area').value);
    if(manualArea > 0) {
        plotArea = manualArea;
        document.getElementById('plot-info').textContent = `Using Manual Area: ${manualArea} m²`;
    } else if(state.plotPolygon && state.scale.ratio > 0) {
        plotArea = getPolygonProperties(state.plotPolygon).area;
        document.getElementById('plot-info').textContent = `Calc Area: ${plotArea.toFixed(1)} m²`;
    }

    // 2. Footprint Areas
    let typFootprintArea = 0;
    state.levels['Typical_Floor'].objects.forEach(obj => { if (obj.isFootprint) typFootprintArea += getPolygonProperties(obj).area });

    // 3. GFA Calculation
    const grossTypGfa = typFootprintArea * inputs.floors;
    const resGfa = Math.max(0, grossTypGfa - (inputs.retail + inputs.office + inputs.nursery));
    const consumedGfa = resGfa + inputs.retail + inputs.office + inputs.nursery;
    const balance = inputs.allowedGfa - consumedGfa;

    // 4. BUA
    const carsReq = (resGfa/100) + (inputs.retail/50) + (inputs.office/50);
    const estParkingArea = carsReq * 35; 
    const bua = consumedGfa + estParkingArea + (inputs.basements * plotArea * 0.8) + (inputs.podiums * plotArea * 0.6);
    const efficiency = bua > 0 ? ((consumedGfa / bua) * 100).toFixed(1) : 0;

    // 5. Residential
    const sellable = resGfa * 0.85; // 85% efficiency assumption

    // 6. Utilities
    const loadKVA = ((resGfa * 0.08) + (inputs.retail * 0.15) + (inputs.office * 0.12)).toFixed(0);
    const waterReq = (resGfa / 100 * 3 * 0.25).toFixed(0);

    // Substation / RMU
    let rmuArea = 0;
    state.serviceBlocks.forEach(blk => {
        if(blk.blockData && blk.blockData.name === 'RMU Room') rmuArea += (blk.getScaledWidth() * blk.getScaledHeight() * state.scale.ratio * state.scale.ratio);
    });
    
    let subReqArea = Math.ceil(loadKVA / 1500) * 35;
    if (rmuArea > 0) subReqArea = Math.max(0, subReqArea - 10);

    // Update UI
     const totalOccupancy = (state.lastCalculatedData?.lifts?.totalOccupancy || 0);
    const garbageBins = Math.ceil(totalOccupancy / 100);
    setDashVal('dash-allowed-gfa', inputs.allowedGfa);
    setDashVal('dash-consumed-gfa', consumedGfa.toFixed(0));
    setDashVal('dash-balance-gfa', balance.toFixed(0), balance >= 0 ? 'good' : 'bad');
    setDashVal('dash-bua', bua.toFixed(0));
    setDashVal('dash-efficiency', efficiency + '%');
    
    setDashVal('dash-res-gfa', resGfa.toFixed(0));
    setDashVal('dash-retail-gfa', inputs.retail);
    setDashVal('dash-office-gfa', inputs.office);
    setDashVal('dash-nursery-gfa', inputs.nursery);
    
    setDashVal('dash-sellable', sellable.toFixed(0));
    setDashVal('dash-occupancy', totalOccupancy.toFixed(0));
    setDashVal('dash-garbage-req', garbageBins.toFixed(0));
    setDashVal('dash-elec-load', loadKVA + ' kVA');
    setDashVal('dash-water-req', waterReq + ' m³/d');
    setDashVal('dash-rmu-area', rmuArea.toFixed(1) + ' m²');
    setDashVal('dash-substation-req', subReqArea.toFixed(0) + ' m²');
    updateLiveApartmentCalc();
    
}

export function setDashVal(id, val, cls) {
    const el = document.getElementById(id);
    if(el) {
        el.textContent = val;
        el.className = 'dash-val ' + (cls||'');
    }
}
export function toggleBlockLock() {
    const obj = state.canvas.getActiveObject();
    if(!obj || !obj.isServiceBlock) return;
    
    const isLocked = obj.lockScalingX;
    obj.set({ lockScalingX: !isLocked, lockScalingY: !isLocked });
    
    const items = obj.getObjects();
    if(items[2]) items[2].set('text', !isLocked ? "🔓" : "🔒"); // Visual toggle
    
    obj.setCoords();
    state.canvas.requestRenderAll();
    updateSelectedObjectControls(obj);
}
export function toggleFloatingPanel() {
    const el = document.getElementById('floating-content');
    el.classList.toggle('minimized');
    document.getElementById('minimize-dash').textContent = el.classList.contains('minimized') ? '+' : '−';
}