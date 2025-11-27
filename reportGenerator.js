import{performCalculations } from './feasibilityEngine.js'; 
import { resetState,setCurrentLevel,state,setCurrentMode,setScale, toggleAllLayersVisibility   } from './state.js';
import {RESIDENTIAL_PROGRAM, LEVEL_ORDER, LEVEL_DEFINITIONS, PREDEFINED_COMPOSITE_BLOCKS ,AREA_STATEMENT_DATA    } from './config.js';
import { f,fInt,findBestFit } from './utils.js';
import { applyLevelVisibility } from './uiController.js';

export function  generateReport(isDetailed = false) {
    const calculatedData = performCalculations();
    if (!calculatedData) { return null; }
    const reportHTML = isDetailed ? generateDetailedReportHTML(calculatedData) : generateSummaryReportHTML(calculatedData);
    return { data: calculatedData, html: reportHTML };
}

export function  generateSummaryReportHTML(data) {
    if (!data) return '<p>Calculation failed. Please check inputs and drawings.</p>';
    
    const { inputs, areas, aptCalcs, hotelCalcs, summary, parking, lifts } = data;
    const gfaSurplus = inputs.allowedGfa - summary.totalGfa;

    let commonAreaDetailsHTML = summary.commonAreaDetails.map(item => `
        <tr class="sub-total-row">
            <td>&nbsp;&nbsp;&nbsp; - ${item.name} (${item.level})</td>
            <td>${f(item.area)} m²</td>
        </tr>`).join('');

    let wingBreakdownHTML = '';
    if (aptCalcs.wingBreakdown && aptCalcs.wingBreakdown.length > 0) {
        const unitTypes = aptCalcs.wingBreakdown[0].counts.map(c => c.type);
        
        wingBreakdownHTML = `
        <table class="report-table">
            <tr class="section-header"><td colspan="${unitTypes.length + 2}">Apartment Wing Breakdown (Units per Floor)</td></tr>
            <tr>
                <th>Wing</th>
                ${unitTypes.map(type => `<th>${type}</th>`).join('')}
                <th>Total</th>
            </tr>`;

        aptCalcs.wingBreakdown.forEach(wing => {
            wingBreakdownHTML += `
                <tr>
                    <td>Wing ${wing.wingIndex}</td>
                    ${wing.counts.map(apt => `<td>${f(apt.countPerFloor, 2)}</td>`).join('')}
                    <td><b>${f(wing.totalUnitsPerFloor, 2)}</b></td>
                </tr>`;
        });

        wingBreakdownHTML += `
            <tr class="total-row">
                <td>Total</td>
                ${unitTypes.map(type => {
                    const totalForType = aptCalcs.wingBreakdown.reduce((sum, wing) => {
                        const apt = wing.counts.find(a => a.type === type);
                        return sum + (apt ? apt.countPerFloor : 0);
                    }, 0);
                    return `<td>${f(totalForType, 2)}</td>`;
                }).join('')}
                <td><b>${f(aptCalcs.wingBreakdown.reduce((s, w) => s + w.totalUnitsPerFloor, 0), 2)}</b></td>
            </tr>
        </table>`;
    }

    return `<h2>Feasibility Summary Report</h2>
    <table class="report-table"><tr><th>Description</th><th>Allowed</th><th>Achieved</th><th>Surplus/Deficit</th></tr>
        <tr class="grand-total-row">
             <td>Total GFA (m²)</td><td>${f(inputs.allowedGfa)}</td><td>${f(summary.totalGfa)}</td><td class="${gfaSurplus >= 0 ? 'surplus' : 'deficit'}">${f(gfaSurplus)}</td>
        </tr>
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
        <tr><td>Total Common Area</td><td>${f(areas.totalCommon)} m²</td></tr>
        ${commonAreaDetailsHTML}
        <tr class="total-row"><td>Total GFA</td><td class="highlight-cell">${f(summary.totalGfa)} m²</td></tr>
        <tr class="grand-total-row"><td>Total Built-Up Area (BUA)</td><td>${f(summary.totalBuiltup)} m²</td></tr>
        <tr class="total-row"><td>Efficiency (Sellable/GFA)</td><td class="highlight-cell">${f(summary.efficiency, 1)}%</td></tr>
    </table>
    <table class="report-table">
        <tr class="section-header"><th colspan="4">Parking Requirement</th></tr>
        <tr><th>Use</th><th>Basis</th><th>Ratio</th><th>Required</th></tr>
        ${parking.breakdown.map(p => `<tr><td>${p.use}</td><td>${p.count || '-'}</td><td>${p.ratio || '-'}</td><td>${fInt(p.required)}</td></tr>`).join('')}
        <tr class="total-row"><td>Total Required</td><td colspan="3">${fInt(parking.required)}</td></tr>
        <tr><td>Total Provided</td><td colspan="3">${fInt(parking.provided)}</td></tr>
        <tr class="grand-total-row"><td>Surplus / Deficit</td><td colspan="3" class="${parking.surplus >= 0 ? 'surplus' : 'deficit'}">${fInt(parking.surplus)}</td></tr>
    </table>
    <table class="report-table">
        <tr class="section-header"><td colspan="2">Lift Calculation (All Uses)</td></tr>
        <tr><td>Total Occupancy Load</td><td>${fInt(lifts.totalOccupancy)}</td></tr>
        <tr><td>Required Lifts</td><td>${fInt(lifts.required)}</td></tr>
        <tr><td>Provided Lifts</td><td>${fInt(lifts.provided)}</td></tr>
        <tr class="grand-total-row"><td>Surplus / Deficit</td><td class="${lifts.surplus >= 0 ? 'surplus' : 'deficit'}">${fInt(lifts.surplus)}</td></tr>
    </table>
    ${aptCalcs.aptMixWithCounts.length > 0 ? `
    <table class="report-table">
        <tr class="section-header"><td colspan="5">Apartment Mix Details</td></tr>
        <tr><th>Type</th><th>Count per Floor</th><th>Total Units</th><th>Area/Unit (m²)</th><th>Total Sellable Area (m²)</th></tr>
        ${aptCalcs.aptMixWithCounts.map(apt => `
            <tr>
                <td>${apt.type}</td><td>${f(apt.countPerFloor, 2)}</td><td>${fInt(apt.totalUnits)}</td><td>${f(apt.area)}</td><td>${f(apt.totalUnits * apt.area)}</td>
            </tr>
        `).join('')}
        <tr class="total-row">
            <td>Total</td><td>${f(aptCalcs.aptMixWithCounts.reduce((s, a) => s + a.countPerFloor, 0), 2)}</td><td>${fInt(aptCalcs.totalUnits)}</td><td>-</td><td>${f(aptCalcs.totalSellableArea)}</td>
        </tr>
    </table>` : ''}
    ${hotelCalcs ? `
    <table class="report-table"><tr class="section-header"><td colspan="3">Hotel Key Mix Details</td></tr>
        <tr><th>Type</th><th>Total Units (Keys)</th><th>Assumed GFA/Unit (m²)</th></tr>
        <tr><td>Standard Key</td><td>${fInt(hotelCalcs.numStdKeys)}</td><td>${f(state.currentProgram.unitTypes.find(u => u.key === 'standard_key').area)}</td></tr>
        <tr><td>Suite Key</td><td>${fInt(hotelCalcs.numSuites)}</td><td>${f(state.currentProgram.unitTypes.find(u => u.key === 'suite_key').area)}</td></tr>
        <tr class="total-row"><td>Total</td><td>${fInt(hotelCalcs.totalKeys)}</td><td>-</td></tr>
    </table>` : ''}
    ${wingBreakdownHTML}`;
}

export function  generateDetailedReportHTML(data) {
    if (!data) return '<p>Calculation failed. Please check inputs and drawings.</p>';
    const { inputs, levelBreakdown, aptCalcs, areas } = data;

    let totalGfaBlocks = 0;
    let totalServiceBlocks = 0;

    const levelRows = LEVEL_ORDER.map(levelKey => {
        const breakdown = levelBreakdown[levelKey];
        if (!breakdown) return '';
        
        totalGfaBlocks += breakdown.gfa;
        totalServiceBlocks += breakdown.service;

        return `<tr>
            <td>${levelKey.replace(/_/g, ' ')}</td>
            <td>${f(breakdown.gfa)}</td>
            <td>${f(breakdown.service)}</td>
        </tr>`;
    }).join('');

    const totalCalculatedGfa = areas.achievedResidentialGfa + areas.achievedRetailGfa + areas.achievedOfficeGfa + areas.achievedHotelGfa + totalGfaBlocks;
    const totalBuiltUp = totalCalculatedGfa + areas.podiumCarPark + areas.gfCarPark + areas.basementCarPark + totalServiceBlocks + aptCalcs.totalBalconyArea + areas.roofTerrace;

    return `<h2>Feasibility Detailed Report (${state.projectType})</h2>
    <table class="report-table">
        <tr class="grand-total-row"><td colspan="2">Allowed GFA</td><td colspan="2">${f(inputs.allowedGfa)} m²</td></tr>
        <tr class="section-header"><th>Level</th><th>GFA Blocks Area (m²)</th><th>Service Blocks Area (m²)</th></tr>
        ${levelRows}
        <tr class="sub-total-row"><td><strong>Sub-Total Blocks</strong></td><td><strong>${f(totalGfaBlocks)}</strong></td><td><strong>${f(totalServiceBlocks)}</strong></td></tr>
        <tr><td>Total Residential Sellable Area</td><td>${f(areas.achievedResidentialGfa)}</td><td></td></tr>
        <tr><td>Total Retail GFA</td><td>${f(areas.achievedRetailGfa)}</td><td></td></tr>
        <tr><td>Total Office GFA</td><td>${f(areas.achievedOfficeGfa)}</td><td></td></tr>
        <tr><td>Total Hotel GFA</td><td>${f(areas.achievedHotelGfa)}</td><td></td></tr>
        <tr class="total-row"><td><strong>Total GFA</strong></td><td colspan="2"><strong>${f(totalCalculatedGfa)} m²</strong></td></tr>
    </table>
    <table class="report-table" style="margin-top: 20px;">
        <tr class="section-header"><td colspan="2">Built-Up Area (BUA) Calculation</td></tr>
        <tr><td>Total GFA</td><td>${f(totalCalculatedGfa)} m²</td></tr>
        <tr><td>Total Service Block Area</td><td>${f(totalServiceBlocks)} m²</td></tr>
        <tr><td>Total Parking Area</td><td>${f(areas.basementCarPark + areas.gfCarPark + areas.podiumCarPark)} m²</td></tr>
        <tr><td>Total Balcony Area</td><td>${f(aptCalcs.totalBalconyArea)} m²</td></tr>
        <tr><td>Roof Terrace Area</td><td>${f(areas.roofTerrace)} m²</td></tr>
        <tr class="grand-total-row"><td><strong>Total BUA</strong></td><td><strong>${f(totalBuiltUp)} m²</strong></td></tr>
    </table>`;
}

async function captureLevelScreenshot(levelName) {
    const originalLevel = state.currentLevel;
    setCurrentLevel(levelName);
    applyLevelVisibility();
    
    // Create a temporary container for rendering
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.width = state.canvas.width + 'px';
    tempContainer.style.height = state.canvas.height + 'px';
    document.body.appendChild(tempContainer);
    
    const tempCanvas = document.createElement('canvas');
    tempContainer.appendChild(tempCanvas);

    const canvasEl = new fabric.StaticCanvas(tempCanvas, {
        width: state.canvas.width,
        height: state.canvas.height,
        backgroundColor: state.canvas.backgroundColor,
    });
    
    // Clone objects for the static canvas
    const objects = state.canvas.getObjects().filter(obj => obj.visible);
    const objectJSON = state.canvas.toObject(objects).objects;
    
    canvasEl.loadFromJSON({ objects: objectJSON }, () => {
        canvasEl.renderAll();
    });

    // Wait for render
    await new Promise(resolve => setTimeout(resolve, 500));

    const dataUrl = canvasEl.toDataURL({ format: 'png', quality: 0.8 });
    
    // Cleanup
    canvasEl.dispose();
    document.body.removeChild(tempContainer);
    setCurrentLevel(originalLevel);
    applyLevelVisibility();
    
    return dataUrl;
}

export async function exportReportAsPDF() {
    const { jsPDF } = window.jspdf;
    const reportContainer = document.getElementById('report-container');
    if (!reportContainer.innerHTML.trim() || !state.lastCalculatedData) {
        document.getElementById('status-bar').textContent = "Please generate a report first before exporting.";
        return;
    }
    const includeScreenshots = document.getElementById('include-screenshots-in-report').checked;

    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    const canvas = await html2canvas(reportContainer, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const imgProps = doc.getImageProperties(imgData);
    const pdfWidth = doc.internal.pageSize.getWidth() - 20;
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    let heightLeft = pdfHeight;
    let position = 10;

    doc.addImage(imgData, 'PNG', 10, position, pdfWidth, pdfHeight);
    heightLeft -= (doc.internal.pageSize.getHeight() - 20);

    while (heightLeft > 0) {
        position = heightLeft - pdfHeight + 10;
        doc.addPage();
        doc.addImage(imgData, 'PNG', 10, position, pdfWidth, pdfHeight);
        heightLeft -= (doc.internal.pageSize.getHeight() - 20);
    }

    if (includeScreenshots) {
        const levelsToCapture = ['Ground_Floor', 'Typical_Floor', 'Podium', 'Basement', 'Roof'];
        for (const level of levelsToCapture) {
            if (state.levels[level].objects.length > 0) {
                doc.addPage();
                doc.setFontSize(16);
                doc.text(`${level.replace(/_/g, ' ')} Plan`, 10, 20);
                const screenshotData = await captureLevelScreenshot(level);
                doc.addImage(screenshotData, 'PNG', 10, 30, pdfWidth, (pdfWidth / state.canvas.width) * state.canvas.height);
            }
        }
    }

    doc.save('Feasibility-Report.pdf');
}