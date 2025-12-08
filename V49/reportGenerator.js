import{performCalculations } from './feasibilityEngine.js'; 
import { resetState,setCurrentLevel,state,setCurrentMode,setScale, toggleAllLayersVisibility   } from './state.js';
import {RESIDENTIAL_PROGRAM, LEVEL_ORDER, LEVEL_DEFINITIONS, PREDEFINED_COMPOSITE_BLOCKS ,AREA_STATEMENT_DATA    } from './config.js';
import { f,fInt,findBestFit } from './utils.js';
import { applyLevelVisibility } from './uiController.js';
import { redrawApartmentPreview, clearOverlay, getCanvas } from './canvasController.js';
import { LOGO_BASE64 } from './logo_base64.js';
import { WM_BASE64 } from './wm_base64.js';

export function  generateReport(isDetailed = false) {
    const calculatedData = performCalculations();
    if (!calculatedData) { return null; }
    const reportHTML = isDetailed ? generateDetailedReportHTML(calculatedData) : generateSummaryReportHTML(calculatedData);
    return { data: calculatedData, html: reportHTML };
}

export function  generateSummaryReportHTML(data) {
    if (!data) return '<p>Calculation failed. Please check inputs and drawings.</p>';
    
    const { inputs, areas, aptCalcs, hotelCalcs, summary, parking, lifts, levelBreakdown } = data;
    const gfaSurplus = inputs.allowedGfa - summary.totalGfa;

    // --- Logic for expandable common area (GFA) breakdown ---
    const aggregatedGFAItems = {};
    summary.commonAreaDetails.forEach(item => {
        const key = `${item.name}_${item.level}_${item.area.toFixed(2)}`;
        if (aggregatedGFAItems[key]) {
            aggregatedGFAItems[key].qnty++;
        } else {
            aggregatedGFAItems[key] = { name: item.name, level: item.level, singleArea: item.area, qnty: 1 };
        }
    });

    const gfaGroupedByLevel = {};
    Object.values(aggregatedGFAItems).forEach(item => {
        if (!gfaGroupedByLevel[item.level]) gfaGroupedByLevel[item.level] = [];
        gfaGroupedByLevel[item.level].push(item);
    });

    let commonAreaDetailsHTML = `<tr id="common-details-table" style="display: none;"><td colspan="2" style="padding: 0;">
        <table class="report-table nested-table">
            <thead><tr><th>Item</th><th>Area of Single Item (m²)</th><th>Qnty</th><th>Total Area (m²)</th><th>Total Area (ft²)</th></tr></thead>
            <tbody>`;
            
    const levelMapping = { 'Basement': 'A. Basement', 'Ground_Floor': 'B. Ground Floor', 'Podium': 'C. Podium', 'Typical_Floor': 'D. Typical Floor', 'Roof': 'E. Roof Floor' };

    Object.keys(levelMapping).forEach(levelKey => {
        const items = gfaGroupedByLevel[levelKey];
        commonAreaDetailsHTML += `<tr class="section-header"><td colspan="5">${levelMapping[levelKey]}</td></tr>`;
        if (items && items.length > 0) {
            items.forEach(item => {
                const totalArea = item.singleArea * item.qnty;
                const totalAreaFt2 = totalArea * 10.7639;
                commonAreaDetailsHTML += `<tr><td>&nbsp;&nbsp;&nbsp;- ${item.name} (${item.level.replace(/_/g, ' ')})</td><td>${f(item.singleArea)}</td><td>${fInt(item.qnty)}</td><td>${f(totalArea)}</td><td>${f(totalAreaFt2)}</td></tr>`;
            });
        } else if (levelKey === 'Basement' && inputs.numBasements === 0) {
            commonAreaDetailsHTML += `<tr><td colspan="5" style="text-align:center; color:#888;">[No Basements]</td></tr>`;
        }
    });
    commonAreaDetailsHTML += `</tbody></table></td></tr>`;

    // --- Logic for expandable Built-Up Area (BUA) breakdown ---
    const buaComponents = { Basement: [], Ground_Floor: [], Podium: [], Typical_Floor: [], Roof: [] };

    // 1. Aggregate Service Blocks
    const serviceBlocksAggregated = {};
    state.serviceBlocks.filter(b => b.blockData.category === 'service').forEach(block => {
        const area = (block.getScaledWidth() * block.getScaledHeight()) * (state.scale.ratio * state.scale.ratio);
        const key = `${block.blockData.name}_${block.level}_${area.toFixed(2)}`;
        if (serviceBlocksAggregated[key]) {
            serviceBlocksAggregated[key].qnty++;
        } else {
            serviceBlocksAggregated[key] = { name: block.blockData.name, level: block.level, singleArea: area, qnty: 1 };
        }
    });
    Object.values(serviceBlocksAggregated).forEach(item => {
        if (buaComponents[item.level]) buaComponents[item.level].push(item);
    });

    // 2. Add Parking, Balconies, and Terraces from levelBreakdown
    Object.keys(levelBreakdown).forEach(levelKey => {
        const breakdown = levelBreakdown[levelKey];
        if (buaComponents[levelKey]) {
            if (breakdown.parking > 0) {
                buaComponents[levelKey].push({ name: `Parking Area (${levelKey.replace(/_/g, ' ')})`, singleArea: breakdown.parking, qnty: 1, level: levelKey });
            }
            if (breakdown.balconyTerrace > 0) {
                const name = levelKey === 'Roof' ? 'Terrace Area' : 'Balcony Area (per floor)';
                const qnty = levelKey === 'Typical_Floor' ? (inputs.numTypicalFloors || 1) : 1;
                const singleArea = breakdown.balconyTerrace / (levelKey === 'Typical_Floor' ? 1 : breakdown.multiplier);
                buaComponents[levelKey].push({ name, singleArea, qnty, level: levelKey });
            }
        }
    });

    let buaDetailsHTML = `<tr id="bua-details-table" style="display: none;"><td colspan="2" style="padding: 0;">
        <table class="report-table nested-table">
            <thead><tr><th>Item</th><th>Area of Single Item (m²)</th><th>Qnty</th><th>Total Area (m²)</th><th>Total Area (ft²)</th></tr></thead>
            <tbody>`;

    Object.keys(levelMapping).forEach(levelKey => {
        const items = buaComponents[levelKey];
        const breakdown = levelBreakdown[levelKey];
        const multiplier = breakdown ? breakdown.multiplier : 1;

        buaDetailsHTML += `<tr class="section-header"><td colspan="5">${levelMapping[levelKey]}</td></tr>`;
        if (items && items.length > 0) {
            items.forEach(item => {
                let qnty = item.qnty;
                // For per-level items like parking, the quantity is the floor multiplier
                if (item.name.startsWith('Parking Area')) {
                    qnty = multiplier;
                }
                const totalArea = item.singleArea * qnty;
                const totalAreaFt2 = totalArea * 10.7639;
                buaDetailsHTML += `<tr><td>&nbsp;&nbsp;&nbsp;- ${item.name}</td><td>${f(item.singleArea)}</td><td>${fInt(qnty)}</td><td>${f(totalArea)}</td><td>${f(totalAreaFt2)}</td></tr>`;
            });
        } else if (levelKey === 'Basement' && inputs.numBasements === 0) {
             buaDetailsHTML += `<tr><td colspan="5" style="text-align:center; color:#888;">[No Basements]</td></tr>`;
        }
    });
    buaDetailsHTML += `</tbody></table></td></tr>`;
    // --- End of BUA logic ---
    
    // --- Logic for expandable Parking breakdown ---
    let parkingDetailsHTML = `<tr id="parking-details-table" style="display: none;"><td colspan="4" style="padding: 0;">
        <table class="report-table nested-table">
            <thead><tr><th>Use</th><th>Basis</th><th>Ratio</th><th>Required</th></tr></thead>
            <tbody>`;
            
    parking.breakdown.forEach(p => {
        parkingDetailsHTML += `<tr><td>${p.use}</td><td>${p.count || '-'}</td><td>${p.ratio || '-'}</td><td>${fInt(p.required)}</td></tr>`;
    });
    parkingDetailsHTML += `</tbody></table></td></tr>`;
    // --- End of Parking Breakdown Logic ---

    let wingBreakdownHTML = '';
    if (aptCalcs.wingBreakdown && aptCalcs.wingBreakdown.length > 0) {
        const unitTypes = aptCalcs.wingBreakdown[0].counts.map(c => c.type);
        
        wingBreakdownHTML = `
        <table class="report-table">
            <tr class="section-header"><td colspan="${unitTypes.length + 2}">Apartment Wing Breakdown (Units per Floor)</td></tr>
            <tr><th>Wing</th>${unitTypes.map(type => `<th>${type}</th>`).join('')}<th>Total</th></tr>`;

        aptCalcs.wingBreakdown.forEach(wing => {
            wingBreakdownHTML += `<tr><td>Wing ${wing.wingIndex}</td>${wing.counts.map(apt => `<td>${f(apt.countPerFloor, 2)}</td>`).join('')}<td><b>${f(wing.totalUnitsPerFloor, 2)}</b></td></tr>`;
        });

        wingBreakdownHTML += `<tr class="total-row"><td>Total</td>${unitTypes.map(type => { const totalForType = aptCalcs.wingBreakdown.reduce((sum, wing) => { const apt = wing.counts.find(a => a.type === type); return sum + (apt ? apt.countPerFloor : 0); }, 0); return `<td>${f(totalForType, 2)}</td>`; }).join('')}<td><b>${f(aptCalcs.wingBreakdown.reduce((s, w) => s + w.totalUnitsPerFloor, 0), 2)}</b></td></tr></table>`;
    }

    return `<h2>Feasibility Summary Report</h2>
    <style>.expander { cursor: pointer; color: var(--primary-color); font-weight: bold; margin-left: 5px; } .nested-table { margin: 0; border: none; } .nested-table th { background-color: #e8eaf6; color: #333; } </style>
    <table class="report-table"><tr><th>Description</th><th>Allowed</th><th>Achieved</th><th>Surplus/Deficit</th></tr>
        <tr class="grand-total-row"><td>Total GFA (m²)</td><td>${f(inputs.allowedGfa)}</td><td>${f(summary.totalGfa)}</td><td class="${gfaSurplus >= 0 ? 'surplus' : 'deficit'}">${f(gfaSurplus)}</td></tr>
        <tr><td>&nbsp;&nbsp;&nbsp; - Residential Sellable</td><td>-</td><td>${f(areas.achievedResidentialGfa)}</td><td></td></tr>
        <tr><td>&nbsp;&nbsp;&nbsp; - Retail & Supermarket</td><td>${f(inputs.allowedRetailGfa)}</td><td>${f(areas.achievedRetailGfa)}</td><td class="${(inputs.allowedRetailGfa - areas.achievedRetailGfa) >= 0 ? 'surplus' : 'deficit'}">${f(inputs.allowedRetailGfa - areas.achievedRetailGfa)}</td></tr>
        <tr><td>&nbsp;&nbsp;&nbsp; - Office & Commercial</td><td>${f(inputs.allowedOfficeGfa)}</td><td>${f(areas.achievedOfficeGfa)}</td><td class="${(inputs.allowedOfficeGfa - areas.achievedOfficeGfa) >= 0 ? 'surplus' : 'deficit'}">${f(inputs.allowedOfficeGfa - areas.achievedOfficeGfa)}</td></tr>
        <tr><td>&nbsp;&nbsp;&nbsp; - Hotel</td><td>-</td><td>${f(areas.achievedHotelGfa)}</td><td></td></tr>
        <tr><td>&nbsp;&nbsp;&nbsp; - Common Areas</td><td>-</td><td>${f(areas.totalCommon)}</td><td></td></tr>
    </table>
    <table class="report-table">
        <tr class="section-header"><td colspan="2">Area Breakdown</td></tr>
        <tr><td>Total Sellable Apartment Area</td><td>${f(aptCalcs.totalSellableArea)} m²</td></tr>
        <tr><td>Total Balcony Area</td><td>${f(aptCalcs.totalBalconyArea)} m²</td></tr>
        <tr><td>Total Common Area (GFA)<span class="expander" data-target="common-details-table">[+]</span></td><td>${f(areas.totalCommon)} m²</td></tr>
        ${commonAreaDetailsHTML}
        <tr class="total-row"><td>Total GFA</td><td class="highlight-cell">${f(summary.totalGfa)} m²</td></tr>
        <tr class="grand-total-row">
            <td>Total Built-Up Area (BUA)<span class="expander" data-target="bua-details-table">[+]</span></td>
            <td>${f(summary.totalBuiltup)} m²</td>
        </tr>
        ${buaDetailsHTML}
        <tr class="total-row"><td>Efficiency (Sellable/GFA)</td><td class="highlight-cell">${f(summary.efficiency, 1)}%</td></tr>
    </table>
    <table class="report-table"><tr class="section-header"><th colspan="4">Parking Requirement</th></tr>
        <tr class="total-row"><td>Total Required<span class="expander" data-target="parking-details-table">[+]</span></td><td colspan="3">${fInt(parking.required)}</td></tr>
        ${parkingDetailsHTML}
        <tr><td>Total Provided</td><td colspan="3">${fInt(parking.provided)}</td></tr>
        <tr class="grand-total-row"><td>Surplus / Deficit</td><td colspan="3" class="${parking.surplus >= 0 ? 'surplus' : 'deficit'}">${fInt(parking.surplus)}</td></tr>
    </table>
    <table class="report-table"><tr class="section-header"><td colspan="2">Lift Calculation (All Uses)</td></tr>
        <tr><td>Total Occupancy Load</td><td>${fInt(lifts.totalOccupancy)}</td></tr>
        <tr><td>Required Lifts</td><td>${fInt(lifts.required)}</td></tr>
        <tr><td>Provided Lifts</td><td>${fInt(lifts.provided)}</td></tr>
        <tr class="grand-total-row"><td>Surplus / Deficit</td><td class="${lifts.surplus >= 0 ? 'surplus' : 'deficit'}">${fInt(lifts.surplus)}</td></tr>
    </table>
    ${aptCalcs.aptMixWithCounts.length > 0 ? `<table class="report-table"><tr class="section-header"><td colspan="5">Apartment Mix Details</td></tr><tr><th>Type</th><th>Count per Floor</th><th>Total Units</th><th>Area/Unit (m²)</th><th>Total Sellable Area (m²)</th></tr>${aptCalcs.aptMixWithCounts.map(apt => `<tr><td>${apt.type}</td><td>${f(apt.countPerFloor, 2)}</td><td>${fInt(apt.totalUnits)}</td><td>${f(apt.area)}</td><td>${f(apt.totalUnits * apt.area)}</td></tr>`).join('')}<tr class="total-row"><td>Total</td><td>${f(aptCalcs.aptMixWithCounts.reduce((s, a) => s + a.countPerFloor, 0), 2)}</td><td>${fInt(aptCalcs.totalUnits)}</td><td>-</td><td>${f(aptCalcs.totalSellableArea)}</td></tr></table>` : ''}
    ${hotelCalcs ? `<table class="report-table"><tr class="section-header"><td colspan="3">Hotel Key Mix Details</td></tr><tr><th>Type</th><th>Total Units (Keys)</th><th>Assumed GFA/Unit (m²)</th></tr><tr><td>Standard Key</td><td>${fInt(hotelCalcs.numStdKeys)}</td><td>${f(state.currentProgram.unitTypes.find(u => u.key === 'standard_key').area)}</td></tr><tr><td>Suite Key</td><td>${fInt(hotelCalcs.numSuites)}</td><td>${f(state.currentProgram.unitTypes.find(u => u.key === 'suite_key').area)}</td></tr><tr class="total-row"><td>Total</td><td>${fInt(hotelCalcs.totalKeys)}</td><td>-</td></tr></table>` : ''}
    ${wingBreakdownHTML}`;
}

export function  generateDetailedReportHTML(data) {
    if (!data) return '<p>Calculation failed. Please check inputs and drawings.</p>';
    const { inputs, levelBreakdown, summary } = data;

    const totals = { sellableGfa: 0, commonGfa: 0, service: 0, parking: 0, balconyTerrace: 0, total: 0 };
    
    let levelRows = '';
    LEVEL_ORDER.forEach(levelKey => {
        const breakdown = levelBreakdown[levelKey];
        if (!breakdown) return;

        const levelName = `${levelKey.replace(/_/g, ' ')} ${breakdown.multiplier > 1 ? `(x${breakdown.multiplier})` : ''}`;
        
        totals.sellableGfa += breakdown.sellableGfa * breakdown.multiplier;
        totals.commonGfa += breakdown.commonGfa * breakdown.multiplier;
        totals.service += breakdown.service * breakdown.multiplier;
        totals.parking += breakdown.parking * breakdown.multiplier;
        totals.balconyTerrace += breakdown.balconyTerrace * breakdown.multiplier;
        totals.total += breakdown.total;

        levelRows += `<tr>
            <td><strong>${levelName}</strong></td>
            <td>${f(breakdown.sellableGfa * breakdown.multiplier)}</td>
            <td>${f(breakdown.commonGfa * breakdown.multiplier)}</td>
            <td>${f(breakdown.service * breakdown.multiplier)}</td>
            <td>${f(breakdown.parking * breakdown.multiplier)}</td>
            <td>${f(breakdown.balconyTerrace * breakdown.multiplier)}</td>
            <td class="sub-total-row">${f(breakdown.total)}</td>
        </tr>`;
    });

    return `<h2>Feasibility Detailed Report</h2>
    <table class="report-table" style="font-size: 0.8em;">
        <tr class="section-header">
            <th>Level</th>
            <th>Sellable GFA (m²)</th>
            <th>Common GFA (m²)</th>
            <th>Service Area (m²)</th>
            <th>Parking Area (m²)</th>
            <th>Balcony/Terrace (m²)</th>
            <th>Total BUA on Level (m²)</th>
        </tr>
        ${levelRows}
        <tr class="total-row">
            <td><strong>Totals</strong></td>
            <td><strong>${f(totals.sellableGfa)}</strong></td>
            <td><strong>${f(totals.commonGfa)}</strong></td>
            <td><strong>${f(totals.service)}</strong></td>
            <td><strong>${f(totals.parking)}</strong></td>
            <td><strong>${f(totals.balconyTerrace)}</strong></td>
            <td><strong>-</strong></td>
        </tr>
    </table>
    <table class="report-table" style="margin-top: 20px;">
         <tr class="section-header"><td colspan="2">Overall Project Summary</td></tr>
         <tr><td>Total GFA (Sellable + Common)</td><td>${f(summary.totalGfa)} m²</td></tr>
         <tr class="grand-total-row"><td><strong>Total Built-Up Area (BUA)</strong></td><td><strong>${f(summary.totalBuiltup)} m²</strong></td></tr>
         <tr class="total-row"><td>Efficiency (Sellable/GFA)</td><td class="highlight-cell">${f(summary.efficiency, 1)}%</td></tr>
    </table>
    `;
}

async function captureLevelScreenshot(levelName) {
    const originalLevel = state.currentLevel;
    const originalVisibility = state.allLayersVisible;
    const originalOverlayLayout = state.currentApartmentLayout;

    // 1. Switch to Target Level
    setCurrentLevel(levelName);
    state.allLayersVisible = false; // Isolate level
    applyLevelVisibility();
    
    // 2. Render Main Canvas (Background + Fabric Objects)
    state.canvas.renderAll();
    
    // 3. Render Overlay (Apartment Layout) for Typical Floor
    if (levelName === 'Typical_Floor' && state.lastCalculatedData && state.lastCalculatedData.aptCalcs.wingBreakdown.length > 0) {
        if(!originalOverlayLayout) {
             if(state.livePreviewLayout) {
                 redrawApartmentPreview(state.livePreviewLayout);
             } else if (state.currentApartmentLayout) {
                 redrawApartmentPreview(state.currentApartmentLayout);
             }
        }
    } else {
        clearOverlay();
    }

    // 4. Composite both canvases into one image
    const compositeCanvas = document.createElement('canvas');
    compositeCanvas.width = state.canvas.width;
    compositeCanvas.height = state.canvas.height;
    const ctx = compositeCanvas.getContext('2d');

    // Draw Lower Canvas (Background + Objects)
    ctx.drawImage(state.canvas.lowerCanvasEl, 0, 0);
    
    // Draw Upper Canvas (Selection/Drawing UI - usually skip for PDF)
    // ctx.drawImage(state.canvas.upperCanvasEl, 0, 0);

    // Draw Overlay Canvas (Apartment Units/Corridors)
    const overlayCanv = document.getElementById('overlay-canvas');
    if(overlayCanv) {
        ctx.drawImage(overlayCanv, 0, 0);
    }

    const dataUrl = compositeCanvas.toDataURL({ format: 'png', quality: 0.8 });

    // 5. Restore State
    setCurrentLevel(originalLevel);
    state.allLayersVisible = originalVisibility;
    applyLevelVisibility();
    if(originalOverlayLayout) {
        redrawApartmentPreview(originalOverlayLayout);
    } else {
        clearOverlay();
    }
    
    return dataUrl;
}

// Function to add Header (Logo)
function addHeader(doc, width) {
    const logoW = doc.internal.pageSize.getWidth()-30;
    const logoH = 10; 
    // Top Right
    doc.addImage(LOGO_BASE64, 'PNG', (width - logoW - 10), 10, logoW, logoH);
}

// Function to add Watermark (Used AFTER content is drawn)
function addWatermark(doc, width, height) {
    const wmW = 100;
    const wmH = 100;
    const wmX = (width - wmW) / 2;
    const wmY = (height - wmH) / 2;
    
    try {
        if (doc.GState) {
            const gState = new doc.GState({ opacity: 0.15 }); // 15% opacity
            doc.setGState(gState);
            doc.addImage(WM_BASE64, 'PNG', wmX, wmY, wmW, wmH);
            doc.setGState(new doc.GState({ opacity: 1.0 })); 
        } else {
             // Fallback
             doc.addImage(WM_BASE64, 'PNG', wmX, wmY, wmW, wmH);
        }
    } catch (e) {
         console.warn("GState error:", e);
         doc.addImage(WM_BASE64, 'PNG', wmX, wmY, wmW, wmH);
    }
}

export async function exportReportAsPDF() {
    const { jsPDF } = window.jspdf;
    const reportContainer = document.getElementById('report-container');
    
    // Force expand all details for PDF capture so everything is visible
    const hiddenRows = reportContainer.querySelectorAll('tr[style*="display: none"]');
    hiddenRows.forEach(row => row.style.display = 'table-row');

    if (!reportContainer.innerHTML.trim() || !state.lastCalculatedData) {
        document.getElementById('status-bar').textContent = "Please generate a report first before exporting.";
        return;
    }
    const includeScreenshots = document.getElementById('include-screenshots-in-report').checked;

    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    const pdfWidth = doc.internal.pageSize.getWidth();
    const pdfHeight = doc.internal.pageSize.getHeight();
    
    // Margins (Top 25mm to clear logo, Bottom 15mm)
    const marginTop = 25;
    const marginBottom = 15;
    const marginLeft = 10;
    const marginRight = 10;
    const contentWidth = pdfWidth - marginLeft - marginRight;
    const maxContentHeight = pdfHeight - marginTop - marginBottom;

    // Scroll to top
    window.scrollTo(0,0);
    
    // Capture the entire report as a canvas with high resolution
    const canvas = await html2canvas(reportContainer, { scale: 2, useCORS: true });
    
    // Calculate mapping between HTML pixels and PDF dimensions
    // contentWidth (mm) / canvas.width (px)
    const mmToPxRatio = contentWidth / canvas.width;
    const totalCanvasHeightPx = canvas.height;
    const pageHeightCanvasPx = maxContentHeight / mmToPxRatio;

    // Determine safe cut points based on HTML elements (Tr, Headers) to avoid cutting text
    const possibleBreaks = Array.from(reportContainer.querySelectorAll('tr, h2, h3, .section-header'));
    const breakPoints = possibleBreaks.map(el => el.offsetTop * 2).sort((a,b) => a-b); // Scale 2 for html2canvas
    
    let currentY = 0; // Current position in the source canvas (px)
    
    while (currentY < totalCanvasHeightPx) {
        // Create a new page if not the first iteration
        if (currentY > 0) doc.addPage();

        // 1. Add Header (Logo) - Top layer is fine, usually outside content area
        addHeader(doc, pdfWidth);

        // Calculate how much we can fit on this page
        let heightToPrintPx = Math.min(pageHeightCanvasPx, totalCanvasHeightPx - currentY);
        
        // If we are not at the end, find a safe break point
        if (currentY + heightToPrintPx < totalCanvasHeightPx) {
            const targetBottom = currentY + heightToPrintPx;
            let safeBreak = targetBottom;
            for (let i = 0; i < breakPoints.length; i++) {
                if (breakPoints[i] > currentY && breakPoints[i] < targetBottom) {
                    safeBreak = breakPoints[i];
                } else if (breakPoints[i] >= targetBottom) {
                    break;
                }
            }
            if (safeBreak > currentY + (heightToPrintPx * 0.5)) {
                heightToPrintPx = safeBreak - currentY;
            }
        }

        // Create a temporary canvas for the sliced part
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = heightToPrintPx;
        const tempCtx = tempCanvas.getContext('2d');
        
        // Draw the slice
        tempCtx.drawImage(canvas, 0, currentY, canvas.width, heightToPrintPx, 0, 0, canvas.width, heightToPrintPx);

        // 2. Add Content (The Report Image)
        const sliceHeightMM = heightToPrintPx * mmToPxRatio;
        doc.addImage(tempCanvas.toDataURL('image/png'), 'PNG', marginLeft, marginTop, contentWidth, sliceHeightMM);

        // 3. Add Watermark (AFTER Content to be visible on top)
        addWatermark(doc, pdfWidth, pdfHeight);

        currentY += heightToPrintPx;
    }

    if (includeScreenshots) {
        const levelsToCapture = LEVEL_ORDER.filter(level => 
            state.levels[level].objects.length > 0 || 
            state.serviceBlocks.some(b => b.level === level)
        );
        for (const level of levelsToCapture) {
            doc.addPage();
            
            // 1. Add Header
            addHeader(doc, pdfWidth);

            doc.setFontSize(16);
            doc.text(`${level.replace(/_/g, ' ')} Plan`, marginLeft, marginTop + 5);
            
            const screenshotData = await captureLevelScreenshot(level);
            
            const scProps = doc.getImageProperties(screenshotData);
            let scHeight = (scProps.height * contentWidth) / scProps.width;
            
            // Fit to page if too tall
            const maxImgHeight = pdfHeight - marginTop - 20 - marginBottom;
            if(scHeight > maxImgHeight) {
                const ratio = maxImgHeight / scHeight;
                scHeight = maxImgHeight;
                 doc.addImage(screenshotData, 'PNG', marginLeft, marginTop + 15, contentWidth * ratio, scHeight);
            } else {
                 doc.addImage(screenshotData, 'PNG', marginLeft, marginTop + 15, contentWidth, scHeight);
            }

            // 3. Add Watermark (AFTER Screenshot)
            addWatermark(doc, pdfWidth, pdfHeight);
        }
    }

    doc.save('Feasibility-Report.pdf');
    
    // Optionally restore UI state
    // hiddenRows.forEach(row => row.style.display = 'none');
}