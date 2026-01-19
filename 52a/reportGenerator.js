//--- START OF FILE reportGenerator.js ---

//--- START OF FILE reportGenerator.js ---

import{performCalculations } from './feasibilityEngine.js';
import { state, setCurrentLevel } from './state.js';
import { LEVEL_ORDER } from './config.js';
import { f,fInt, getPolygonProperties } from './utils.js';
import { applyLevelVisibility } from './uiController.js';
import { redrawApartmentPreview, clearOverlay } from './canvasController.js';
import { LOGO_BASE64 } from './logo_base64.js';
import { WM_BASE64 } from './wm_base64.js';
// Helper to wrap value in a span with source class
function formatValue(value, source, formatter = f) {
    const className = `source-${source || 'auto'}`;
    return `<span class="${className}">${formatter(value)}</span>`;
}

export function generateReport(isDetailed = false) {
    const calculatedData = performCalculations();
    if (!calculatedData) { return null; }
    // NEW: Gather cost parameters from the UI
    const costParams = {};
    document.querySelectorAll('.cost-param-input').forEach(input => {
        costParams[input.id] = parseFloat(input.value) || 0;
    });
// NEW: Check the state of the toggles
    const includeCost = document.getElementById('toggle-cost-analysis').checked;
    const includeBuying = document.getElementById('toggle-revenue-buying').checked;
    const includeRenting = document.getElementById('toggle-revenue-renting').checked;
    // --- MODIFICATION START: Check for new retail-specific toggles ---
    const includeRetailBuying = document.getElementById('toggle-revenue-buying-retail')?.checked ?? true;
    const includeOfficeBuying = document.getElementById('toggle-revenue-buying-office')?.checked ?? true;
    const includeRetailRenting = document.getElementById('toggle-revenue-renting-retail')?.checked ?? true;
    const includeOfficeRenting = document.getElementById('toggle-revenue-renting-office')?.checked ?? true;
     const reportHTML = isDetailed 
         ? generateDetailedReportHTML(calculatedData, costParams, includeCost, includeBuying, includeRenting, includeRetailBuying, includeRetailRenting, includeOfficeBuying, includeOfficeRenting) 
        : generateSummaryReportHTML(calculatedData);
    //const reportHTML = isDetailed ? generateDetailedReportHTML(calculatedData) : generateSummaryReportHTML(calculatedData);
    return { data: calculatedData, html: reportHTML };
}

export function generateSummaryReportHTML(data) {
    if (!data) return '<p>Calculation failed. Please check inputs and drawings.</p>';
    
    const { inputs, areas, aptCalcs, hotelCalcs, schoolCalcs,labourCampCalcs, summary, parking, lifts, staircases, levelBreakdown } = data;
    const gfaSurplus = inputs.allowedGfa - summary.totalGfa;

    let plotArea = 0;
    if (state.plotPolygon) {
        plotArea = getPolygonProperties(state.plotPolygon).area;
    }
    const typicalFootprintArea = state.levels['Typical_Floor'].objects.reduce((sum, obj) => sum + getPolygonProperties(obj).area, 0);
    const typicalFloorCoverage = plotArea > 0 ? (typicalFootprintArea / plotArea) * 100 : 0;


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
           if (breakdown.parking.value > 0) {
                buaComponents[levelKey].push({ name: `Parking Area (${levelKey.replace(/_/g, ' ')})`, singleArea: breakdown.parking.value, qnty: 1, level: levelKey });
            }
            if (breakdown.balconyTerrace.value > 0) {
                const name = levelKey === 'Roof' ? 'Terrace Area' : 'Balcony Area (per floor)';
                const qnty = levelKey === 'Typical_Floor' ? (inputs.numTypicalFloors || 1) : 1;
                const singleArea = breakdown.balconyTerrace.value / (levelKey === 'Typical_Floor' ? 1 : breakdown.multiplier);
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

    let schoolReportHTML = '';
    if (schoolCalcs) {
        schoolReportHTML = `
        <table class="report-table"><tr class="section-header"><td colspan="3">School Requirements Summary</td></tr>
            <tr><th>Description</th><th>Required</th><th>Provided</th></tr>
            <tr><td>Total Play Area  (sqm)</td><td>${f(schoolCalcs.playAreaRequired)}</td><td class="${schoolCalcs.playAreaProvided >= schoolCalcs.playAreaRequired ? 'surplus' : 'deficit'}">${f(schoolCalcs.playAreaProvided)}</td></tr>
            <tr><td>Covered Play Area  (sqm)</td><td>${f(schoolCalcs.coveredPlayAreaRequired)}</td><td class="${schoolCalcs.coveredPlayAreaProvided >= schoolCalcs.coveredPlayAreaRequired ? 'surplus' : 'deficit'}">${f(schoolCalcs.coveredPlayAreaProvided)}</td></tr>
            
             <tr><td>Car Parking</td><td>${fInt(schoolCalcs.parkingCarReq)}</td><td>-</td></tr>
            <tr><td>Bus Parking</td><td>${fInt(schoolCalcs.parkingBusReq)}</td><td>-</td></tr>
            <tr><td>Toilets (Students)</td><td>${fInt(schoolCalcs.toiletsStudents)}</td><td>-</td></tr>
            <tr><td>Toilets (Staff)</td><td>${fInt(schoolCalcs.toiletsStaff)}</td><td>-</td></tr>
            <tr><td>Garbage (kg)</td><td>${fInt(schoolCalcs.garbageRequiredKg)}</td><td>-</td></tr>
            <tr class="total-row"><td>Dumpsters</td><td>${fInt(schoolCalcs.garbageContainers)}</td><td>-</td></tr>
            
        
        </table>`;
    }
    
     /* </table>
        <table class="report-table"><tr class="section-header"><td colspan="2">School Garbage Calculation</td></tr>
            <tr><td>Basis</td><td>12 Kgs / 100 SQM of GFA</td></tr>
            <tr><td>Total GFA (Classroom + Admin)</td><td>${f(schoolCalcs.totalClassroomArea + schoolCalcs.adminArea)} m²</td></tr>
            <tr class="total-row"><td>Total Garbage</td><td>${f(schoolCalcs.garbageRequired.totalKg, 0)} Kgs</td></tr>
            <tr class="grand-total-row"><td>Dumpsters Required</td><td>${fInt(schoolCalcs.garbageRequired.containers)} x 2.5 CuM</td></tr>  */
    
let labourCampReportHTML = '';
    if (labourCampCalcs) {
        labourCampReportHTML = `
        <table class="report-table"><tr class="section-header"><td colspan="2">Labour Camp Requirements Summary</td></tr>
            <tr><th>Description</th><th>Value</th></tr>
            <tr><td>Total Rooms</td><td>${fInt(labourCampCalcs.numRooms)}</td></tr>
            <tr><td>Total Occupancy</td><td>${fInt(labourCampCalcs.totalOccupancy)} beds</td></tr>
            <tr class="total-row"><td>Required Water Closets</td><td>${fInt(labourCampCalcs.wcRequired)}</td></tr>
            <tr class="total-row"><td>Required Washbasins</td><td>${fInt(labourCampCalcs.washbasinsRequired)}</td></tr>
            <tr class="total-row"><td>Required Showers</td><td>${fInt(labourCampCalcs.showersRequired)}</td></tr>
        </table>`;
    }
    return `<h2>Feasibility Summary Report</h2>
   <style>
        .expander { cursor: pointer; color: var(--primary-color); font-weight: bold; margin-left: 5px; } 
        .nested-table { margin: 0; border: none; } 
        .nested-table th { background-color: #e8eaf6; color: #333; }
    .source-manual { font-style: italic; color: #007bff !important; }
        .source-online { font-weight: bold; color: #28a745 !important; }
        .source-local { color: #6f42c1 !important; }
    </style>
    <table class="report-table"><tr><th>Description</th><th>Allowed</th><th>Achieved</th><th>Surplus/Deficit</th></tr>
        <tr class="grand-total-row"><td>Total GFA (m²)</td><td>${f(inputs.allowedGfa)}</td><td>${f(summary.totalGfa)}</td><td class="${gfaSurplus >= 0 ? 'surplus' : 'deficit'}">${f(gfaSurplus)}</td></tr>
        <tr><td>&nbsp;&nbsp;&nbsp; - Residential Sellable</td><td>-</td><td>${f(areas.achievedResidentialGfa)}</td><td></td></tr>
        <tr><td>&nbsp;&nbsp;&nbsp; - Retail & Supermarket</td><td>${f(inputs.allowedRetailGfa)}</td><td>${f(areas.achievedRetailGfa)}</td><td class="${(inputs.allowedRetailGfa - areas.achievedRetailGfa) >= 0 ? 'surplus' : 'deficit'}">${f(inputs.allowedRetailGfa - areas.achievedRetailGfa)}</td></tr>
        <tr><td>&nbsp;&nbsp;&nbsp; - Office & Commercial</td><td>${f(inputs.allowedOfficeGfa)}</td><td>${f(areas.achievedOfficeGfa)}</td><td class="${(inputs.allowedOfficeGfa - areas.achievedOfficeGfa) >= 0 ? 'surplus' : 'deficit'}">${f(inputs.allowedOfficeGfa - areas.achievedOfficeGfa)}</td></tr>
        <tr><td>&nbsp;&nbsp;&nbsp; - Hotel</td><td>-</td><td>${f(areas.achievedHotelGfa)}</td><td></td></tr>
         <tr><td>&nbsp;&nbsp;&nbsp; - School</td><td>-</td><td>${f(areas.achievedSchoolGfa)}</td><td></td></tr>
        <tr><td>&nbsp;&nbsp;&nbsp; - Common Areas</td><td>-</td><td>${f(areas.totalCommon)}</td><td></td></tr>
    </table>
    <table class="report-table">
        <tr class="section-header"><td colspan="2">Area Breakdown</td></tr>
        <tr><td>Typical Floor Coverage</td><td>${f(typicalFloorCoverage, 1)}%</td></tr>
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
        <tr class="total-row"><td>Efficiency (Sellable/BUA)</td><td class="highlight-cell">${f(summary.buaEfficiency, 1)}%</td></tr>
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
    ${wingBreakdownHTML}
    ${schoolReportHTML}
    ${labourCampReportHTML}
    
    `;
}

export function generateDetailedReportHTML(data, costParams, includeCost, includeBuying, includeRenting, includeRetailBuying, includeRetailRenting, includeOfficeBuying, includeOfficeRenting) {
    if (!data) return '<p>Calculation failed. Please check inputs and drawings.</p>';
    //const { levelBreakdown, summary } = data;
    const { levelBreakdown, summary, aptCalcs, hotelCalcs, schoolCalcs, labourCampCalcs, areas } = data;
    const SQFT_CONVERSION = 10.7639;

   /*  const totals = { sellableGfa: 0, commonGfa: 0, service: 0, parking: 0, balconyTerrace: 0, total: 0 }; */

    let levelRows = '';
    // NEW: Calculate BUA for different cost zones
    let basementBua = 0;
    let groundBua = 0;
    let upperBua = 0;
    LEVEL_ORDER.forEach(levelKey => {
        const breakdown = levelBreakdown[levelKey];
        if (!breakdown) return;

        const levelName = `${levelKey.replace(/_/g, ' ')} ${breakdown.multiplier > 1 ? `(x${breakdown.multiplier})` : ''}`;
        
        /* totals.sellableGfa += breakdown.sellableGfa * breakdown.multiplier;
        totals.commonGfa += breakdown.commonGfa * breakdown.multiplier;
        totals.service += breakdown.service * breakdown.multiplier;
        totals.parking += breakdown.parking * breakdown.multiplier;
        totals.balconyTerrace += breakdown.balconyTerrace * breakdown.multiplier;
        totals.total += breakdown.total; */
        // Categorize BUA for cost calculation
        if (levelKey.includes('Basement')) {
            basementBua += breakdown.total;
        } else if (levelKey.includes('Ground_Floor')) {
            groundBua += breakdown.total;
        } else {
            // All other floors (Mezzanine, Podium, Typical, Roof etc.) count as "Upper"
            upperBua += breakdown.total;
        }

        levelRows += `<tr>
            <td><strong>${levelName}</strong></td>
            <td>${formatValue(breakdown.sellableGfa.value * breakdown.multiplier, breakdown.sellableGfa.source)}</td>
            <td>${formatValue(breakdown.commonGfa.value * breakdown.multiplier, breakdown.commonGfa.source)}</td>
            <td>${formatValue(breakdown.service.value * breakdown.multiplier, breakdown.service.source)}</td>
            <td>${formatValue(breakdown.parking.value * breakdown.multiplier, breakdown.parking.source)}</td>
            <td>${formatValue(breakdown.balconyTerrace.value * breakdown.multiplier, breakdown.balconyTerrace.source)}</td>
            <td class="sub-total-row">${f(breakdown.total)}</td>
        </tr>`;
    });
    let costTableHTML = '';
    let totalProjectCost = 0;
    if (includeCost) {
        const basementBuaSqft = basementBua * SQFT_CONVERSION;
        const groundBuaSqft = groundBua * SQFT_CONVERSION;
        const upperBuaSqft = upperBua * SQFT_CONVERSION;

        const costBasement = basementBuaSqft * costParams['cost-rate-basement'];
        const costGround = groundBuaSqft * costParams['cost-rate-ground'];
        const costUpper = upperBuaSqft * costParams['cost-rate-upper'];
        const totalConstructionCost = costBasement + costGround + costUpper;

        const consultancyFee = totalConstructionCost * (costParams['cost-fee-consultancy'] / 100);
         const plotAreaM2 = (state.plotPolygon ? getPolygonProperties(state.plotPolygon).area : 0);
        const plotAreaSqft = plotAreaM2 * SQFT_CONVERSION;
        const landCost = plotAreaSqft * SQFT_CONVERSION * costParams['cost-land'];
        //const landCost = (summary.totalGfa * SQFT_CONVERSION) * costParams['cost-land'];
        const municipalCharges = (summary.totalBuiltup * SQFT_CONVERSION) * costParams['cost-municipal'];
        const electricalCost = costParams['cost-electrical'];
        const soilCost = costParams['cost-soil'];
        
        const subTotalProjectCost = totalConstructionCost + consultancyFee + landCost + municipalCharges + electricalCost + soilCost;
        totalProjectCost = subTotalProjectCost * costParams['cost-multiplier'];
        const landCostSource = document.getElementById('cost-land').classList.contains('source-online') ? 'online' : 'manual';
        costTableHTML = `
        <table class="report-table" style="margin-top: 20px;">
            <tr class="section-header"><th colspan="3">Project Cost Analysis</th></tr>
            <tr><th>Description</th><th>Basis / Rate</th><th>Cost (AED)</th></tr>
            <tr><td>Basement Construction</td><td>${fInt(basementBuaSqft)} sqft @ ${fInt(costParams['cost-rate-basement'])}/sqft</td><td>${fInt(costBasement)}</td></tr>
            <tr><td>Ground Floor Construction</td><td>${fInt(groundBuaSqft)} sqft @ ${fInt(costParams['cost-rate-ground'])}/sqft</td><td>${fInt(costGround)}</td></tr>
            <tr><td>Upper Floors Construction</td><td>${fInt(upperBuaSqft)} sqft @ ${fInt(costParams['cost-rate-upper'])}/sqft</td><td>${fInt(costUpper)}</td></tr>
            <tr class="sub-total-row"><td><strong>Total Construction Cost</strong></td><td>-</td><td><strong>${fInt(totalConstructionCost)}</strong></td></tr>
            <tr><td>Consultancy Fee</td><td>${costParams['cost-fee-consultancy']}% of Construction</td><td>${fInt(consultancyFee)}</td></tr>
            <tr><td>Land Cost</td><td>${fInt(summary.totalGfa * SQFT_CONVERSION)} GFA sqft @ ${formatValue(costParams['cost-land'], landCostSource, fInt)}/sqft</td><td>${fInt(landCost)}</td></tr>
            <tr><td>Municipal Charges</td><td>${fInt(summary.totalBuiltup * SQFT_CONVERSION)} BUA sqft @ ${costParams['cost-municipal']}/sqft</td><td>${fInt(municipalCharges)}</td></tr>
            <tr><td>Electrical Connection</td><td>Based on ${fInt(costParams['cost-tcl-kw'])} kW TCL</td><td>${fInt(electricalCost)}</td></tr>
            <tr><td>Soil Testing</td><td>Fixed</td><td>${fInt(soilCost)}</td></tr>
            <tr class="total-row"><td><strong>Sub-Total Project Cost</strong></td><td>-</td><td><strong>${fInt(subTotalProjectCost)}</strong></td></tr>
            <tr><td>Rate Multiplier</td><td>x ${costParams['cost-multiplier']}</td><td>-</td></tr>
            <tr class="grand-total-row"><td><strong>Total Project Cost</strong></td><td>-</td><td><strong>${fInt(totalProjectCost)}</strong></td></tr>
        </table>`;
    }

    let buyingRevenueHTML = '';
    if (includeBuying) {
       if (state.lastMarketRates) {
            const { source, ...marketRates } = state.lastMarketRates;
            let totalRevenue = 0;
            let revenueRows = '';
// Residential Revenue
            if (state.projectType === 'Residential' && aptCalcs) {
                aptCalcs.aptMixWithCounts.forEach(apt => {
                   const marketData = marketRates[apt.key];
                    if (marketData && apt.totalUnits > 0) {
                        const revenue = apt.totalUnits * marketData.buy;
                        totalRevenue += revenue;
                        revenueRows += `<tr><td>${apt.type}</td><td>${fInt(apt.totalUnits)} units</td><td>${formatValue(marketData.buy, source, fInt)} /unit</td><td>${fInt(revenue)}</td></tr>`;
                    }
                });
            }

            // Office & Retail (Common)
            if (includeOfficeBuying && areas.achievedOfficeGfa > 0 && marketRates.office) {
                const officeGfaSqft = areas.achievedOfficeGfa * SQFT_CONVERSION;
                const revenue = officeGfaSqft * marketRates.office.buy;
                totalRevenue += revenue;
                revenueRows += `<tr><td>Office Space</td><td>${fInt(officeGfaSqft)} sqft</td><td>${formatValue(marketRates.office.buy, source, fInt)} /sqft</td><td>${fInt(revenue)}</td></tr>`;
            }
            // --- MODIFICATION START ---
            if (includeRetailBuying && areas.achievedRetailGfa > 0 && marketRates.retail) {
                const retailGfaSqft = areas.achievedRetailGfa * SQFT_CONVERSION;
                const revenue = retailGfaSqft * marketRates.retail.buy;
                totalRevenue += revenue;
                revenueRows += `<tr><td>Retail Space</td><td>${fInt(retailGfaSqft)} sqft</td><td>${formatValue(marketRates.retail.buy, source, fInt)} /sqft</td><td>${fInt(revenue)}</td></tr>`;
            }


            // Warehouse & Labour Camp
            if (state.projectType === 'Warehouse' && areas.achievedWarehouseGfa > 0 && marketRates.warehouse) {
                const whGfaSqft = areas.achievedWarehouseGfa * SQFT_CONVERSION;
                const revenue = whGfaSqft * marketRates.warehouse.buy;
                totalRevenue += revenue;
                revenueRows += `<tr><td>Warehouse Space</td><td>${fInt(whGfaSqft)} sqft</td><td>${fInt(marketRates.warehouse.buy)} /sqft</td><td>${fInt(revenue)}</td></tr>`;
            }
            if (state.projectType === 'LabourCamp' && aptCalcs.totalBeds > 0 && marketRates.labour_camp) {
                 const revenue = aptCalcs.totalBeds * marketRates.labour_camp.buy;
                 totalRevenue += revenue;
                 revenueRows += `<tr><td>Labour Camp</td><td>${fInt(aptCalcs.totalBeds)} beds</td><td>${fInt(marketRates.labour_camp.buy)} /bed</td><td>${fInt(revenue)}</td></tr>`;
            }


            const netProfit = totalRevenue - totalProjectCost;
            const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

            buyingRevenueHTML = `
            <table class="report-table" style="margin-top: 20px;">
                <tr class="section-header"><th colspan="4">Buying Revenue & Profit Analysis</th></tr>
                <tr><th>Component</th><th>Quantity</th><th>Est. Sale Price (AED)</th><th>Est. Revenue (AED)</th></tr>
                ${revenueRows}
                <tr class="total-row"><td><strong>Total Revenue</strong></td><td colspan="3"><strong>${fInt(totalRevenue)}</strong></td></tr>
                ${includeCost ? `<tr><td>Total Project Cost</td><td colspan="3">${fInt(totalProjectCost)}</td></tr>` : ''}
                <tr class="grand-total-row"><td><strong>Net Profit</strong></td><td colspan="3" class="${netProfit >= 0 ? 'surplus' : 'deficit'}"><strong>${fInt(netProfit)}</strong></td></tr>
                <tr class="total-row"><td><strong>Profit Margin</strong></td><td colspan="3"><strong>${f(profitMargin, 1)}%</strong></td></tr>
            </table>`;

           } else {
            buyingRevenueHTML = `<div class="report-table notice"><strong>Buying Revenue analysis not available.</strong><br>Please run or import "Market Rate Analysis" first.</div>`;
        }
    }
    
    
let rentingRevenueHTML = '';
    if (includeRenting) {
         if (state.lastMarketRates) {
            const { source, ...marketRates } = state.lastMarketRates;
            let totalAnnualRent = 0;
            let rentRows = '';
            
            // Residential
            if (state.projectType === 'Residential' && aptCalcs) {
                 aptCalcs.aptMixWithCounts.forEach(apt => {
                    const marketData = marketRates[apt.key];
                    if (marketData && apt.totalUnits > 0) {
                        const rent = apt.totalUnits * marketData.rent;
                        totalAnnualRent += rent;
                         rentRows += `<tr><td>${apt.type}</td><td>${fInt(apt.totalUnits)} units</td><td>${formatValue(marketData.rent, source, fInt)} /yr</td><td>${fInt(rent)}</td></tr>`;
                    }
                });
            }
            if (includeOfficeRenting && areas.achievedOfficeGfa > 0 && marketRates.office) {
                const officeGfaSqft = areas.achievedOfficeGfa * SQFT_CONVERSION;
                const rent = officeGfaSqft * marketRates.office.rent;
                totalAnnualRent += rent;
                rentRows += `<tr><td>Office Space</td><td>${fInt(officeGfaSqft)} sqft</td><td>${formatValue(marketRates.office.rent, source, fInt)} /sqft/yr</td><td>${fInt(rent)}</td></tr>`;
             }
            // Office & Retail
            //if (areas.achievedOfficeGfa > 0 && marketRates.office) { /* ... same logic ... */ }
            if (includeRetailRenting && areas.achievedRetailGfa > 0 && marketRates.retail) {
                const retailGfaSqft = areas.achievedRetailGfa * SQFT_CONVERSION;
                const rent = retailGfaSqft * marketRates.retail.rent;
                totalAnnualRent += rent;
                rentRows += `<tr><td>Retail Space</td><td>${fInt(retailGfaSqft)} sqft</td><td>${formatValue(marketRates.retail.rent, source, fInt)} /sqft/yr</td><td>${fInt(rent)}</td></tr>`;
            }
            
            // Warehouse & Labour Camp
            if (state.projectType === 'Warehouse' && areas.achievedWarehouseGfa > 0 && marketRates.warehouse) {
                const whGfaSqft = areas.achievedWarehouseGfa * SQFT_CONVERSION;
                const rent = whGfaSqft * marketRates.warehouse.rent;
                totalAnnualRent += rent;
                rentRows += `<tr><td>Warehouse Space</td><td>${fInt(whGfaSqft)} sqft</td><td>${fInt(marketRates.warehouse.rent)} /sqft/yr</td><td>${fInt(rent)}</td></tr>`;
            }
            if (state.projectType === 'LabourCamp' && aptCalcs.totalBeds > 0 && marketRates.labour_camp) {
                 const rent = aptCalcs.totalBeds * marketRates.labour_camp.rent;
                 totalAnnualRent += rent;
                 rentRows += `<tr><td>Labour Camp</td><td>${fInt(aptCalcs.totalBeds)} beds</td><td>${fInt(marketRates.labour_camp.rent)} /bed/yr</td><td>${fInt(rent)}</td></tr>`;
            }

            const rentalYield = (includeCost && totalProjectCost > 0) ? (totalAnnualRent / totalProjectCost) * 100 : 0;

            rentingRevenueHTML = `
            <table class="report-table" style="margin-top: 20px;">
                <tr class="section-header"><th colspan="4">Renting Revenue & Yield Analysis</th></tr>
                <tr><th>Component</th><th>Quantity</th><th>Est. Annual Rent (AED)</th><th>Total Annual Rent (AED)</th></tr>
                ${rentRows}
                <tr class="total-row"><td><strong>Total Annual Rent</strong></td><td colspan="3"><strong>${fInt(totalAnnualRent)}</strong></td></tr>
                ${includeCost ? `<tr class="grand-total-row"><td><strong>Gross Rental Yield</strong></td><td colspan="3"><strong>${f(rentalYield, 2)}%</strong></td></tr>` : ''}
            </table>`;
        } else {
             rentingRevenueHTML = `<div class="report-table notice"><strong>Renting Revenue analysis not available.</strong><br>Please run or import "Market Rate Analysis" first.</div>`;
        }
    }
    return `<h2>Feasibility Detailed Report</h2>
    <style>
       .source-manual { font-style: italic; color: #007bff !important; }
        .source-online { font-weight: bold; color: #28a745 !important; }
        .source-local { color: #6f42c1 !important; }
    </style>
    <table class="report-table" style="font-size: 0.8em;">
    <tr class="section-header">
            <th>Level</th><th>Sellable GFA (m²)</th><th>Common GFA (m²)</th><th>Service Area (m²)</th><th>Parking Area (m²)</th><th>Balcony/Terrace (m²)</th><th>Total BUA on Level (m²)</th>
        </tr>
        ${levelRows}
        <tr class="total-row">
         
            <td><strong>Totals</strong></td>
            <td><strong>${f(Object.values(levelBreakdown).reduce((s,l) => s + l.sellableGfa.value * l.multiplier, 0))}</strong></td>
            <td><strong>${f(Object.values(levelBreakdown).reduce((s,l) => s + l.commonGfa.value * l.multiplier, 0))}</strong></td>
            <td><strong>${f(Object.values(levelBreakdown).reduce((s,l) => s + l.service.value * l.multiplier, 0))}</strong></td>
            <td><strong>${f(Object.values(levelBreakdown).reduce((s,l) => s + l.parking.value * l.multiplier, 0))}</strong></td>
            <td><strong>${f(Object.values(levelBreakdown).reduce((s,l) => s + l.balconyTerrace.value * l.multiplier, 0))}</strong></td>
            <td><strong>-</strong></td>
        </tr>
    </table>
    <table class="report-table" style="margin-top: 20px;"><tr class="section-header"><td colspan="2">Overall Project Summary</td></tr>
         <tr><td>Total GFA (Sellable + Common)</td><td>${f(summary.totalGfa)} m²</td></tr>
         <tr class="grand-total-row"><td><strong>Total Built-Up Area (BUA)</strong></td><td><strong>${f(summary.totalBuiltup)} m²</strong></td></tr>
         <tr class="total-row"><td>Efficiency (Sellable/GFA)</td><td class="highlight-cell">${f(summary.efficiency, 1)}%</td></tr>
    </table>
    ${costTableHTML}
    ${buyingRevenueHTML}
    ${rentingRevenueHTML}
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
        if(state.livePreviewLayout) {
             redrawApartmentPreview(state.livePreviewLayout);
        } else if (state.currentApartmentLayout) {
             redrawApartmentPreview(state.currentApartmentLayout);
        }
    } else {
        clearOverlay();
    }

    const compositeCanvas = document.createElement('canvas');
    const targetWidth = state.canvas.width * multiplier;
    const targetHeight = state.canvas.height * multiplier;
    compositeCanvas.width = targetWidth;
    compositeCanvas.height = targetHeight;
    const ctx = compositeCanvas.getContext('2d');
    
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, targetWidth, targetHeight);
    
    ctx.drawImage(state.canvas.lowerCanvasEl, 0, 0, targetWidth, targetHeight);
    const overlayCanv = document.getElementById('overlay-canvas');
    if(overlayCanv) {
         ctx.drawImage(overlayCanv, 0, 0, targetWidth, targetHeight);
    }

    const dataUrl = compositeCanvas.toDataURL('image/jpeg', 0.9);

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

function addHeader(doc) {
    const pageWidth = doc.internal.pageSize.getWidth();
    const logoW = 180;
    const logoH = 18;
    doc.addImage(LOGO_BASE64, 'PNG', pageWidth - logoW - 10, 5, logoW, logoH);
}

function addWatermark(doc) {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const wmW = 100;
    const wmH = 100;
    const wmX = (pageWidth - wmW) / 2;
    const wmY = (pageHeight - wmH) / 2;

    try {
        doc.saveGraphicsState();
        doc.setGState(new doc.GState({ opacity: 0.1 }));
        doc.addImage(WM_BASE64, 'PNG', wmX, wmY, wmW, wmH);
        doc.restoreGraphicsState();
    } catch (e) {
        console.warn("GState error, falling back on watermark:", e);
        doc.addImage(WM_BASE64, 'PNG', wmX, wmY, wmW, wmH);
    }
}

export async function exportReportAsPDF() {
    const { jsPDF } = window.jspdf;
    const reportContainer = document.getElementById('report-container');
    const pdfMode = document.querySelector('input[name="report-detail"]:checked').value;

    if (!reportContainer.innerHTML.trim() || !state.lastCalculatedData) {
        document.getElementById('status-bar').textContent = "Please generate a report first before exporting.";
        return;
    }

    // Get new layout values from UI
    const marginTop = parseFloat(document.getElementById('pdf-margin-top').value) || 30;
    const marginBottom = parseFloat(document.getElementById('pdf-margin-bottom').value) || 20;
    const thumbCols = parseInt(document.getElementById('pdf-thumb-cols').value) || 2;
    const thumbRows = parseInt(document.getElementById('pdf-thumb-rows').value) || 3;

    // Create a clone to modify for PDF export without affecting the on-screen view
    const reportClone = reportContainer.cloneNode(true);
    
    if (pdfMode === 'brief') {
        reportClone.querySelectorAll('.expander').forEach(exp => exp.remove());
        reportClone.querySelectorAll('#common-details-table, #bua-details-table').forEach(table => table.remove());
    } else {
        reportClone.querySelectorAll('tr[style*="display: none"]').forEach(row => {
            row.style.display = 'table-row';
            const expander = row.previousElementSibling?.querySelector('.expander');
            if (expander) expander.textContent = '[-]';
        });
    }

    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    const fixedMargins = { left: 15, right: 15 };

    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.width = '700px';
    tempDiv.appendChild(reportClone);
    document.body.appendChild(tempDiv);

    await doc.html(reportClone, {
        x: fixedMargins.left,
        y: marginTop,
        width: doc.internal.pageSize.getWidth() - fixedMargins.left - fixedMargins.right,
        windowWidth: 700,
        margin: [marginTop, fixedMargins.right, marginBottom, fixedMargins.left],
        autoPaging: 'text',
        html2canvas: { scale: 0.25, useCORS: true }
    });
    
    document.body.removeChild(tempDiv);

    if (pdfMode === 'full') {
        const selectedLevels = Array.from(document.querySelectorAll('#screenshot-gallery-container input:checked')).map(cb => cb.dataset.level);
        
        if (selectedLevels.length > 0) {
            document.getElementById('status-bar').textContent = 'Generating screenshots...';
            doc.addPage();

            const pageContentWidth = doc.internal.pageSize.getWidth() - fixedMargins.left - fixedMargins.right;
            const pageContentHeight = doc.internal.pageSize.getHeight() - marginTop - marginBottom;

            const cellWidth = pageContentWidth / thumbCols;
            const cellHeight = pageContentHeight / thumbRows;
            const padding = 4;

            let currentCol = 0;
            let currentRow = 0;

            for (const level of selectedLevels) {
                if (currentRow >= thumbRows) {
                    doc.addPage();
                    currentRow = 0;
                    currentCol = 0;
                }

                const cellX = fixedMargins.left + (currentCol * cellWidth);
                const cellY = marginTop + (currentRow * cellHeight);

                const screenshotData = await captureLevelScreenshot(level);
                
                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                doc.text(level.replace(/_/g, ' '), cellX + padding, cellY + padding);
                
                const scProps = doc.getImageProperties(screenshotData);
                const availableWidth = cellWidth - (2 * padding);
                const availableHeight = cellHeight - (2 * padding) - 8;

                let imgWidth = availableWidth;
                let imgHeight = (scProps.height * imgWidth) / scProps.width;

                if (imgHeight > availableHeight) {
                    imgHeight = availableHeight;
                    imgWidth = (scProps.width * imgHeight) / scProps.height;
                }
                
                const imgX = cellX + (cellWidth - imgWidth) / 2;
                const imgY = cellY + padding + 6;

                doc.addImage(screenshotData, 'JPEG', imgX, imgY, imgWidth, imgHeight);

                currentCol++;
                if (currentCol >= thumbCols) {
                    currentCol = 0;
                    currentRow++;
                }
            }
            document.getElementById('status-bar').textContent = 'Screenshots added.';
        }
    }

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        addHeader(doc);
        addWatermark(doc);
        doc.setFontSize(8);
        doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
    }

    doc.save(`Feasibility-Report-${pdfMode}.pdf`);
}