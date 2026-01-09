//--- START OF FILE reportGenerator.js ---

import{performCalculations } from './feasibilityEngine.js';
import { state, setCurrentLevel } from './state.js';
import { LEVEL_ORDER } from './config.js';
import { f,fInt } from './utils.js';
import { applyLevelVisibility } from './uiController.js';
import { redrawApartmentPreview, clearOverlay } from './canvasController.js';
import { LOGO_BASE64 } from './logo_base64.js';
import { WM_BASE64 } from './wm_base64.js';

export function generateReport(isDetailed = false) {
const calculatedData = performCalculations();
if (!calculatedData) { return null; }
const reportHTML = isDetailed ? generateDetailedReportHTML(calculatedData) : generateSummaryReportHTML(calculatedData);
return { data: calculatedData, html: reportHTML };
}

export function generateSummaryReportHTML(data) {
if (!data) return '<p>Calculation failed. Please check inputs and drawings.</p>';


const { inputs, areas, aptCalcs, hotelCalcs, summary, parking, lifts, staircases, levelBreakdown } = data;
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
        
const levelMapping = { 'Basement': 'A. Basement', 'Ground_Floor': 'B. Ground Floor', 'Mezzanine': 'C. Mezzanine', 'Podium': 'D. Podium', 'Typical_Floor': 'E. Typical Floor', 'Roof': 'F. Roof Floor' };

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
const buaComponents = { Basement: [], Ground_Floor: [], Mezzanine: [], Podium: [], Typical_Floor: [], Roof: [] };

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
    <tr><th>Use</th><th>Basis</th><th>Ratio</th><th>Required</th></tr>
    ${parking.breakdown.map(p => `<tr><td>${p.use}</td><td>${p.count || '-'}</td><td>${p.ratio || '-'}</td><td>${fInt(p.required)}</td></tr>`).join('')}
    <tr class="total-row"><td>Total Required</td><td colspan="3">${fInt(parking.required)}</td></tr>
    <tr><td>Total Provided</td><td colspan="3">${fInt(parking.provided)}</td></tr>
    <tr class="grand-total-row"><td>Surplus / Deficit</td><td colspan="3" class="${parking.surplus >= 0 ? 'surplus' : 'deficit'}">${fInt(parking.surplus)}</td></tr>
</table>
<table class="report-table"><tr class="section-header"><td colspan="2">Egress & Vertical Transport</td></tr>
    <tr><td>Total Occupancy Load</td><td>${fInt(lifts.totalOccupancy)}</td></tr>
    <tr><td>Required Lifts</td><td>${fInt(lifts.required)}</td></tr>
    <tr><td>Provided Lifts</td><td>${fInt(lifts.provided)}</td></tr>
    <tr class="total-row"><td>Lift Surplus / Deficit</td><td class="${lifts.surplus >= 0 ? 'surplus' : 'deficit'}">${fInt(lifts.surplus)}</td></tr>
    <tr><td>Required Staircases (Exits)</td><td>${fInt(staircases.required)}</td></tr>
    <tr><td>Provided Staircases</td><td>${fInt(staircases.provided)}</td></tr>
    <tr class="grand-total-row"><td>Staircase Surplus / Deficit</td><td class="${staircases.surplus >= 0 ? 'surplus' : 'deficit'}">${fInt(staircases.surplus)}</td></tr>
</table>
${aptCalcs.aptMixWithCounts.length > 0 ? `<table class="report-table"><tr class="section-header"><td colspan="5">Apartment Mix Details</td></tr><tr><th>Type</th><th>Count per Floor</th><th>Total Units</th><th>Area/Unit (m²)</th><th>Total Sellable Area (m²)</th></tr>${aptCalcs.aptMixWithCounts.map(apt => `<tr><td>${apt.type}</td><td>${f(apt.countPerFloor, 2)}</td><td>${fInt(apt.totalUnits)}</td><td>${f(apt.area)}</td><td>${f(apt.totalUnits * apt.area)}</td></tr>`).join('')}<tr class="total-row"><td>Total</td><td>${f(aptCalcs.aptMixWithCounts.reduce((s, a) => s + a.countPerFloor, 0), 2)}</td><td>${fInt(aptCalcs.totalUnits)}</td><td>-</td><td>${f(aptCalcs.totalSellableArea)}</td></tr></table>` : ''}
${hotelCalcs ? `<table class="report-table"><tr class="section-header"><td colspan="3">Hotel Key Mix Details</td></tr><tr><th>Type</th><th>Total Units (Keys)</th><th>Assumed GFA/Unit (m²)</th></tr><tr><td>Standard Key</td><td>${fInt(hotelCalcs.numStdKeys)}</td><td>${f(state.currentProgram.unitTypes.find(u => u.key === 'standard_key').area)}</td></tr><tr><td>Suite Key</td><td>${fInt(hotelCalcs.numSuites)}</td><td>${f(state.currentProgram.unitTypes.find(u => u.key === 'suite_key').area)}</td></tr><tr class="total-row"><td>Total</td><td>${fInt(hotelCalcs.totalKeys)}</td><td>-</td></tr></table>` : ''}
${wingBreakdownHTML}`;

}

export function generateDetailedReportHTML(data) {
if (!data) return '<p>Calculation failed. Please check inputs and drawings.</p>';
const { levelBreakdown, summary } = data;


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

export async function captureLevelScreenshot(levelName, multiplier = 1.0) {
    const originalLevel = state.currentLevel;
    const originalVisibility = state.allLayersVisible;
    const originalOverlayLayout = state.currentApartmentLayout;

    setCurrentLevel(levelName);
    state.allLayersVisible = false;
    applyLevelVisibility();
    state.canvas.renderAll();

    if (levelName === 'Typical_Floor' && state.lastCalculatedData && state.lastCalculatedData.aptCalcs.wingBreakdown.length > 0) {
        if (state.livePreviewLayout) {
            redrawApartmentPreview(state.livePreviewLayout);
        } else if (state.currentApartmentLayout) {
            redrawApartmentPreview(state.currentApartmentLayout);
        }
    } else {
        clearOverlay();
    }

    await new Promise(resolve => setTimeout(resolve, 200)); // Allow canvas to render

    const compositeCanvas = document.createElement('canvas');
    const targetWidth = state.canvas.width * multiplier;
    const targetHeight = state.canvas.height * multiplier;
    compositeCanvas.width = targetWidth;
    compositeCanvas.height = targetHeight;
    const ctx = compositeCanvas.getContext('2d');

    // Draw a white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, targetWidth, targetHeight);

    // Draw all canvas layers
    const canvasElements = [
        state.canvas.lowerCanvasEl,
        state.canvas.upperCanvasEl
    ];

    canvasElements.forEach(canvas => {
        if (canvas) {
            ctx.drawImage(canvas, 0, 0, targetWidth, targetHeight);
        }
    });

    const overlayCanv = document.getElementById('overlay-canvas');
    if (overlayCanv) {
        ctx.drawImage(overlayCanv, 0, 0, targetWidth, targetHeight);
    }

    const dataUrl = compositeCanvas.toDataURL('image/jpeg', 0.9);

    // Restore original state
    setCurrentLevel(originalLevel);
    state.allLayersVisible = originalVisibility;
    applyLevelVisibility();
    if (originalOverlayLayout) {
        redrawApartmentPreview(originalOverlayLayout);
    } else {
        clearOverlay();
    }
    state.canvas.renderAll();

    return dataUrl;
}

// Function to add Header (Logo)
function addHeader(doc) {
    const pageWidth = doc.internal.pageSize.getWidth();
    const logoW = 180;
    const logoH = 18;
    try {
        doc.addImage(LOGO_BASE64, 'PNG', pageWidth - logoW - 10, 5, logoW, logoH);
    } catch (e) {
        console.warn('Could not add logo:', e);
    }
}

// Function to add Watermark to the current page
function addWatermark(doc) {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const wmW = 100;
    const wmH = 100;
    const wmX = (pageWidth - wmW) / 2;
    const wmY = (pageHeight - wmH) / 2;

    try {
        // Check if GState is available (for older jsPDF versions)
        if (doc.GState) {
            doc.saveGraphicsState();
            doc.setGState(new doc.GState({ opacity: 0.1 }));
        }
        doc.addImage(WM_BASE64, 'PNG', wmX, wmY, wmW, wmH);
        if (doc.GState) {
            doc.restoreGraphicsState();
        }
    } catch (e) {
        console.warn("Watermark error:", e);
        // Try without transparency
        try {
            doc.addImage(WM_BASE64, 'PNG', wmX, wmY, wmW, wmH);
        } catch (e2) {
            console.warn("Could not add watermark at all:", e2);
        }
    }
}

// Helper function to apply table styles for PDF
function applyPDFStyles() {
    const style = document.createElement('style');
    style.textContent = `
        /* Ensure tables maintain structure in PDF */
        .report-table {
            border-collapse: collapse !important;
            width: 100% !important;
            margin-bottom: 15px !important;
            page-break-inside: avoid !important;
            font-family: Arial, sans-serif !important;
        }
        
        .report-table th {
            background-color: #f0f0f0 !important;
            color: #000 !important;
            font-weight: bold !important;
            padding: 8px 5px !important;
            text-align: left !important;
            border: 1px solid #ccc !important;
            font-size: 9pt !important;
        }
        
        .report-table td {
            padding: 6px 5px !important;
            border: 1px solid #ccc !important;
            text-align: left !important;
            vertical-align: top !important;
            font-size: 9pt !important;
            page-break-inside: avoid !important;
            page-break-before: auto !important;
        }
        
        .section-header th, .section-header td {
            background-color: #d0e0f0 !important;
            font-weight: bold !important;
            text-align: center !important;
            font-size: 10pt !important;
        }
        
        .total-row td {
            background-color: #e8f4e8 !important;
            font-weight: bold !important;
        }
        
        .grand-total-row td {
            background-color: #d4e6f1 !important;
            font-weight: bold !important;
            border-top: 2px solid #333 !important;
        }
        
        .highlight-cell {
            background-color: #fffacd !important;
            font-weight: bold !important;
        }
        
        .surplus {
            color: #008000 !important;
            font-weight: bold !important;
        }
        
        .deficit {
            color: #ff0000 !important;
            font-weight: bold !important;
        }
        
        .nested-table {
            margin: 5px 0 !important;
            border: 1px solid #aaa !important;
        }
        
        .nested-table th {
            background-color: #e8eaf6 !important;
            font-size: 8pt !important;
            padding: 4px 3px !important;
        }
        
        .nested-table td {
            font-size: 8pt !important;
            padding: 4px 3px !important;
        }
        
        h2 {
            color: #1a237e !important;
            font-size: 14pt !important;
            margin-bottom: 15px !important;
            page-break-after: avoid !important;
        }
        
        .expander {
            font-size: 8pt !important;
        }
        
        /* Ensure no content gets cut during page breaks */
        tr {
            page-break-inside: avoid !important;
            page-break-after: auto !important;
        }
        
        /* Fix for long tables */
        table {
            page-break-inside: auto !important;
        }
        
        tr {
            page-break-inside: avoid !important;
            page-break-after: auto !important;
        }
        
        td, th {
            page-break-inside: avoid !important;
            page-break-before: auto !important;
        }
    `;
    document.head.appendChild(style);
    return style;
}

export async function exportReportAsPDF() {
    if (typeof window.jspdf === 'undefined' || typeof html2canvas === 'undefined') {
        document.getElementById('status-bar').textContent = "PDF libraries not loaded. Please check dependencies.";
        return;
    }

    const { jsPDF } = window.jspdf;
    const reportContainer = document.getElementById('report-container');

    if (!reportContainer || !reportContainer.innerHTML.trim() || !state.lastCalculatedData) {
        document.getElementById('status-bar').textContent = "Please generate a report first before exporting.";
        return;
    }

    // Apply PDF-specific styles
    const pdfStyle = applyPDFStyles();

    // Show all content including expandable sections
    const hiddenRows = reportContainer.querySelectorAll('tr[style*="display: none"]');
    const expanders = reportContainer.querySelectorAll('.expander');
    
    // Expand all sections for PDF
    hiddenRows.forEach(row => {
        row.style.display = 'table-row';
        row.setAttribute('data-pdf-visible', 'true');
    });
    
    // Update expander text
    expanders.forEach(expander => {
        const originalText = expander.textContent;
        expander.setAttribute('data-original-text', originalText);
        expander.textContent = '[+]';
    });

    try {
        document.getElementById('status-bar').textContent = "Generating PDF...";

        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
            compress: true
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margins = { top: 30, bottom: 25, left: 15, right: 15 };
        const contentWidth = pageWidth - margins.left - margins.right;

        // Create a clone of the report container for PDF generation
        const reportClone = reportContainer.cloneNode(true);
        reportClone.style.width = contentWidth + 'mm';
        reportClone.style.padding = '0';
        reportClone.style.margin = '0';
        
        // Temporarily add to DOM for proper rendering
        reportClone.style.position = 'absolute';
        reportClone.style.left = '-9999px';
        reportClone.style.top = '0';
        reportClone.style.visibility = 'hidden';
        reportClone.style.display = 'block';
        document.body.appendChild(reportClone);

        // Configure html2canvas options for better table rendering
        const html2canvasOptions = {
            scale: 0.5, // Optimal balance between quality and file size
            useCORS: true,
            backgroundColor: '#ffffff',
            logging: false,
            removeContainer: true,
            allowTaint: true,
            foreignObjectRendering: false, // Better for tables
            imageTimeout: 15000,
            onclone: function(clonedDoc) {
                // Ensure all styles are applied to the clone
                const clonedStyle = pdfStyle.cloneNode(true);
                clonedDoc.head.appendChild(clonedStyle);
                
                // Ensure all tables are visible and properly sized
                const tables = clonedDoc.querySelectorAll('.report-table');
                tables.forEach(table => {
                    table.style.width = '100%';
                    table.style.tableLayout = 'fixed';
                    table.style.wordWrap = 'break-word';
                });
            }
        };

        // Generate PDF from HTML using html2canvas
        const canvas = await html2canvas(reportClone, html2canvasOptions);
        
        // Remove clone from DOM
        document.body.removeChild(reportClone);

        const imgData = canvas.toDataURL('image/jpeg', 0.9);
        const imgProps = doc.getImageProperties(imgData);
        const imgWidth = pageWidth - margins.left - margins.right;
        const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

        // Calculate total height needed
        let totalHeight = imgHeight;
        let currentPage = 1;
        let position = 0;
        const pageHeightAvailable = pageHeight - margins.top - margins.bottom;

        // Add pages as needed
        while (totalHeight > 0) {
            if (currentPage > 1) {
                doc.addPage();
            }

            const heightOnPage = Math.min(pageHeightAvailable, totalHeight);
            doc.addImage(imgData, 'JPEG', margins.left, margins.top - position, imgWidth, imgHeight);
            
            // Add header and footer to each page
            addHeader(doc);
            addWatermark(doc);
            
            // Add page number
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.text(`Page ${currentPage}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
            
            position += pageHeightAvailable;
            totalHeight -= pageHeightAvailable;
            currentPage++;
        }

        // Add screenshot pages if requested
        const screenshotCheckboxes = document.querySelectorAll('#screenshot-gallery-container input:checked');
        if (screenshotCheckboxes.length > 0) {
            document.getElementById('status-bar').textContent = 'Adding screenshots...';

            for (const checkbox of screenshotCheckboxes) {
                const level = checkbox.dataset.level;
                if (!level) continue;

                doc.addPage();
                const currentPageNum = doc.internal.getNumberOfPages();

                try {
                    // Add level title
                    doc.setFontSize(14);
                    doc.setFont('helvetica', 'bold');
                    doc.text(`${level.replace(/_/g, ' ')} Floor Plan`, margins.left, margins.top - 5);

                    // Capture screenshot
                    const screenshotData = await captureLevelScreenshot(level, 1.5);

                    if (screenshotData) {
                        const scProps = doc.getImageProperties(screenshotData);
                        const scWidth = contentWidth;
                        const scHeight = (scProps.height * scWidth) / scProps.width;

                        // Calculate position to center
                        const availableHeight = pageHeight - margins.top - margins.bottom - 15;
                        const finalHeight = Math.min(scHeight, availableHeight);
                        const finalWidth = (scWidth * finalHeight) / scHeight;
                        const xPos = margins.left + (contentWidth - finalWidth) / 2;
                        const yPos = margins.top + 10;

                        doc.addImage(screenshotData, 'JPEG', xPos, yPos, finalWidth, finalHeight);
                    }
                } catch (error) {
                    console.warn(`Failed to capture screenshot for ${level}:`, error);
                    doc.setFontSize(10);
                    doc.text(`Failed to capture screenshot for ${level}`, margins.left, margins.top + 20);
                }

                // Add header/footer to screenshot page
                addHeader(doc);
                addWatermark(doc);
                doc.setFontSize(8);
                doc.text(`Page ${currentPageNum}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
            }
        }

        // Save the PDF
        const fileName = `Feasibility-Report-${new Date().toISOString().slice(0, 10)}.pdf`;
        doc.save(fileName);
        document.getElementById('status-bar').textContent = `PDF exported: ${fileName}`;

    } catch (error) {
        console.error('PDF export error:', error);
        document.getElementById('status-bar').textContent = "Error generating PDF: " + error.message;
    } finally {
        // Clean up: Remove PDF styles
        if (pdfStyle && pdfStyle.parentNode) {
            pdfStyle.parentNode.removeChild(pdfStyle);
        }
        
        // Restore original display state
        hiddenRows.forEach(row => {
            if (row.getAttribute('data-pdf-visible') === 'true') {
                row.style.display = 'none';
                row.removeAttribute('data-pdf-visible');
            }
        });
        
        // Restore expander text
        expanders.forEach(expander => {
            const originalText = expander.getAttribute('data-original-text');
            if (originalText) {
                expander.textContent = originalText;
                expander.removeAttribute('data-original-text');
            }
        });
    }
}