//--- START OF FILE feasibilityEngine.js ---

import { state,setCurrentMode,setScale } from './state.js';
import { getPolygonProperties, getPolygonBoundingBox, allocateCountsByPercent } from './utils.js';
import { generateLinearParking } from './parkingLayoutUtils.js';
import { layoutFlatsOnPolygon, validateStaircaseDistance } from './apartmentLayout.js';
import { f,fInt,findBestFit } from './utils.js';
import {RESIDENTIAL_PROGRAM, LEVEL_ORDER, LEVEL_DEFINITIONS, PREDEFINED_COMPOSITE_BLOCKS ,AREA_STATEMENT_DATA } from './config.js';

export function getAreaOfBlocksByCategory(category, level, multiplier = 1, blockName = null) {
    if (state.scale.ratio === 0) return 0;
    const scaleSq = state.scale.ratio * state.scale.ratio;
    return state.serviceBlocks
        .filter(b => 
            b.level === level && 
            b.blockData && 
            b.blockData.category === category &&
            (!blockName || b.blockData.name.toLowerCase().includes(blockName.toLowerCase()))
        )
        .reduce((sum, b) => sum + (b.getScaledWidth() * b.getScaledHeight() * scaleSq), 0) * multiplier;
}

export function performCalculations() {
const typicalFootprints = state.levels['Typical_Floor'].objects.filter(o => o.isFootprint);
const hotelFootprints = state.levels['Hotel'].objects.filter(o => o.isFootprint);

 const schoolFootprints = state.levels['School']?.objects.filter(o => o.isFootprint);
    const warehouseFootprints = state.levels['Warehouse']?.objects.filter(o => o.isFootprint);
    const labourCampFootprints = state.levels['LabourCamp']?.objects.filter(o => o.isFootprint);
if (!state.plotPolygon || (typicalFootprints.length === 0 && hotelFootprints.length === 0 && schoolFootprints.length === 0 && warehouseFootprints.length === 0 && labourCampFootprints.length === 0)) {
        return null;
    }

const inputs = {};
document.querySelectorAll('.param-input').forEach(input => {
    if (input.type === 'number') { inputs[input.id] = parseFloat(input.value) || 0; } 
    else if (input.type === 'checkbox') { inputs[input.id] = input.checked; } 
    else { inputs[input.id] = input.value; }
});

  const getAreaForLevel = (levelName) => 
        state.levels[levelName]?.objects.filter(o => o.isFootprint).reduce((sum, obj) => sum + getPolygonProperties(obj).area, 0) || 0;

const achievedRetailGfa = getAreaForLevel('Retail') + getAreaForLevel('Supermarket');
const achievedOfficeGfa = getAreaForLevel('Office') + getAreaForLevel('Commercial');
const achievedHotelGfa = getAreaForLevel('Hotel') * inputs.numHotelFloors;

const getBlockDetails = (category, level = null) => {
    let totalArea = 0;
    const details = [];
    state.serviceBlocks
        .filter(b => b.blockData && b.blockData.category === category && (!level || b.level === level))
        .forEach(b => {
            const area = (b.getScaledWidth() * b.getScaledHeight()) * (state.scale.ratio * state.scale.ratio);
            totalArea += area;
            details.push({
                name: b.blockData.name,area: area,level: b.level});
        });
    return { totalArea, details };
};

const calculateNetParkingArea = (levelName) => {
    // Only calculate parking for these specific levels
    const validParkingLevels = ['Basement', 'Ground_Floor', 'Podium'];
    if (!validParkingLevels.includes(levelName)) {return 0;}

    const footprintArea = getAreaForLevel(levelName);
     const achievedSchoolGfa = getAreaForLevel('School');
    const achievedWarehouseGfa = getAreaForLevel('Warehouse');
    const achievedLabourCampGfa = getAreaForLevel('LabourCamp');
    if (footprintArea === 0) return 0;
    const gfaArea = getBlockDetails('gfa', levelName).totalArea;
    const servicesArea = getBlockDetails('service', levelName).totalArea;
    return Math.max(0, footprintArea - gfaArea - servicesArea);
};

let aptCalcs = { totalUnits: 0, totalSellableArea: 0, totalBalconyArea: 0, totalOccupancy: 0, aptMixWithCounts: [], wingBreakdown: [] };
let hotelCalcs = null;
let schoolCalcs = null;
    let labourCampCalcs = null;
let aptMixWithCounts = [];
let corridorTotalArea = 0;
let wingCalcs = [];

// NEW School Calculation Logic
    if (state.projectType === 'School' && schoolFootprints.length > 0) {
        const totalClassroomArea = getAreaOfBlocksByCategory('gfa', 'School', 1, 'classroom');
        const numClassrooms = inputs['num-classrooms'];
        const adminArea = inputs['admin-area'];
        
        const playAreaRequired = totalClassroomArea * 2;
        const coveredPlayAreaRequired = playAreaRequired / 2;

        const playAreaProvided = getAreaOfBlocksByCategory('builtup', 'Ground_Floor', 1, 'play area') 
                                + getAreaOfBlocksByCategory('builtup', 'Podium', 1, 'play area') 
                                + getAreaOfBlocksByCategory('builtup', 'Roof', 1, 'play area');
        const coveredPlayAreaProvided = 0; // This needs a specific block or manual input

        const parkingCarReq = numClassrooms + Math.ceil(adminArea / 45);
        const parkingBusReq = Math.ceil(numClassrooms / 3);
        const parkingAccessibleReq = Math.ceil(parkingCarReq / 50);

        const garbageRequiredKg = (totalClassroomArea + adminArea) / 100 * 12;
        const garbageContainers = Math.ceil(garbageRequiredKg / 500); // Assuming 500kg per 2.5cum container

        const toiletsStudents = Math.ceil(numClassrooms);
        const toiletsStaff = Math.max(2, Math.ceil(numClassrooms / 10));

        schoolCalcs = {
            totalClassroomArea, adminArea,
            playAreaRequired, playAreaProvided,
            coveredPlayAreaRequired, coveredPlayAreaProvided,
            parkingCarReq, parkingBusReq, parkingAccessibleReq,
            garbageRequiredKg, garbageContainers,
            toiletsStudents, toiletsStaff
        };
    }

    // NEW Labour Camp Calculation Logic
    if (state.projectType === 'LabourCamp' && labourCampFootprints.length > 0) {
        const laboursPerRoom = inputs['labours-per-room'];
        const numRooms = Math.floor(achievedLabourCampGfa / (state.currentProgram.unitTypes.find(u => u.key === 'labor_room')?.area || 20));
        const totalOccupancy = numRooms * laboursPerRoom;

        const wcRequired = Math.ceil(totalOccupancy / 10);
        const showersRequired = Math.ceil(totalOccupancy / 10);
        const washbasinsRequired = Math.ceil(totalOccupancy / 10);

        labourCampCalcs = {
            numRooms, totalOccupancy,
            wcRequired, showersRequired, washbasinsRequired
        };
        // Override aptCalcs for Labour Camp
        aptCalcs.totalUnits = numRooms;
        aptCalcs.totalBeds = totalOccupancy;
    }

if (state.projectType === 'Residential' && state.currentProgram && typicalFootprints.length > 0) {
    const program = state.currentProgram;
    const calcMode = document.getElementById('apartment-calc-mode').value;
    const doubleLoaded = document.getElementById('double-loaded-corridor').checked;
    const balconyPlacement = document.getElementById('balcony-placement').value;
    const includeBalconiesInOffset = balconyPlacement === 'recessed';
      const aptModeInput = document.querySelector('input[name="apt-mode"]:checked');
    const isAptModeManual = aptModeInput ? aptModeInput.value === 'manual' : false;
    const gfaAvailableForResidential = inputs.allowedGfa - inputs.allowedRetailGfa - inputs.allowedOfficeGfa;
    
    if (isAptModeManual) {
        aptMixWithCounts = program.unitTypes.map(apt => {
            const countInput = document.getElementById(`manual-count-${apt.key}`);
            const totalUnits = countInput ? parseInt(countInput.value) || 0 : 0;
            return { ...apt, totalUnits: totalUnits, area: apt.area, countPerFloor: inputs.numTypicalFloors > 0 ? totalUnits / inputs.numTypicalFloors : 0 };
        });
        // Calculate corridor area in manual mode by running layout on each wing
        const manualCountsPerFloor = aptMixWithCounts.reduce((acc, apt) => ({ ...acc, [apt.key]: apt.countPerFloor }), {});
        if (Object.values(manualCountsPerFloor).some(c => c > 0)) {
             typicalFootprints.forEach((footprint) => {
                const layoutResult = layoutFlatsOnPolygon(footprint, manualCountsPerFloor, includeBalconiesInOffset, calcMode, doubleLoaded);if (layoutResult.corridorArea > 0) {corridorTotalArea += layoutResult.corridorArea;}
            });
        }
    } else if (gfaAvailableForResidential > 0) {
        const totalPerimeter = typicalFootprints.reduce((sum, poly) =>{
            //sum + getPolygonProperties(poly).perimeter, 0);
          let p = getPolygonProperties(poly).perimeter;
            if (poly.isLinearFootprint) p /= 2;
            return sum + p;
        }, 0);

        typicalFootprints.forEach((footprint, index) => {
            //const wingPerimeter = getPolygonProperties(footprint).perimeter;
             const footprintProps = getPolygonProperties(footprint);
            let wingPerimeter = footprint.isLinearFootprint ? footprintProps.perimeter / 2 : footprintProps.perimeter;
            const perimeterRatio = totalPerimeter > 0 ? wingPerimeter / totalPerimeter : (1 / typicalFootprints.length);
            
            const wingGfaTarget = gfaAvailableForResidential * perimeterRatio;
            const wingAptAreaPerFloor = wingGfaTarget > 0 && inputs.numTypicalFloors > 0 ? wingGfaTarget / inputs.numTypicalFloors : 0;

            //const bestFit = findBestFit(wingAptAreaPerFloor, wingPerimeter, program.unitTypes);
            const bestFit = findBestFit(wingAptAreaPerFloor, wingPerimeter, program.unitTypes, doubleLoaded);
            
            const wingCounts = program.unitTypes.map(apt => ({
                key: apt.key, type: apt.type,
                countPerFloor: bestFit.counts[apt.key] || 0,
                totalUnits: (bestFit.counts[apt.key] || 0) * inputs.numTypicalFloors,
                area: apt.area
            }));
            
            wingCalcs.push({
                wingIndex: index + 1,
                counts: wingCounts,
                totalUnitsPerFloor: wingCounts.reduce((sum, apt) => sum + apt.countPerFloor, 0),
                totalUnits: wingCounts.reduce((sum, apt) => sum + apt.totalUnits, 0),
            });

            const layoutResult = layoutFlatsOnPolygon(footprint, bestFit.counts, includeBalconiesInOffset, calcMode, doubleLoaded);
            if (layoutResult.corridorArea > 0) {
                corridorTotalArea += layoutResult.corridorArea; // Per floor
            }
        });

        aptMixWithCounts = program.unitTypes.map(apt => {
            let totalUnits = 0;
            let countPerFloor = 0;
            wingCalcs.forEach(wing => {
                const aptInWing = wing.counts.find(a => a.key === apt.key);
                if (aptInWing) {
                    totalUnits += aptInWing.totalUnits;
                    countPerFloor += aptInWing.countPerFloor;
                }
            });
            return { ...apt, totalUnits, countPerFloor };
        });
    }
    aptCalcs.totalUnits = aptMixWithCounts.reduce((sum, apt) => sum + apt.totalUnits, 0);
    aptCalcs.totalSellableArea = aptMixWithCounts.reduce((sum, apt) => sum + (apt.totalUnits * apt.area), 0);
    aptCalcs.totalBalconyArea = aptMixWithCounts.reduce((sum, apt) => sum + (apt.totalUnits * apt.frontage * ((apt.balconyCoverage || 80) / 100) * (apt.balconyMultiplier || 0)), 0);
    aptCalcs.totalOccupancy = aptMixWithCounts.reduce((sum, apt) => sum + (apt.totalUnits * (apt.occupancyLoad || 0)), 0);
    aptCalcs.aptMixWithCounts = aptMixWithCounts;
    aptCalcs.wingBreakdown = wingCalcs;
}

const allLifts = state.serviceBlocks.filter(b => b.blockData && b.blockData.name.toLowerCase().includes('lift'));
let lowestGfaLiftLevel = null;
const gfaCheckOrder = ['Basement_Last', 'Ground_Floor'];
for (const level of gfaCheckOrder) {
    if (allLifts.some(l => l.level === level)) { lowestGfaLiftLevel = level; break; }
}
if (!lowestGfaLiftLevel && allLifts.length > 0) {
    for (const level of LEVEL_ORDER) {
        if (allLifts.some(l => l.level === level)) { lowestGfaLiftLevel = level; break; }
    }
}

const levelBreakdown = {};
let calculatedTotalBua = 0;

LEVEL_ORDER.forEach(levelKey => {
    const levelDef = LEVEL_DEFINITIONS[levelKey];
    const multiplier = levelDef.countKey ? (inputs[levelDef.countKey] || 0) : 1;
    if (multiplier > 0 && (state.levels[levelKey].objects.length > 0 || getBlockDetails('gfa', levelKey).totalArea > 0 || getBlockDetails('service', levelKey).totalArea > 0)) {
        
        const nonLiftGfaArea = state.serviceBlocks
            .filter(b => b.level === levelKey && b.blockData && b.blockData.category === 'gfa' && !b.blockData.name.toLowerCase().includes('lift'))
            .reduce((sum, b) => sum + (b.getScaledWidth() * b.getScaledHeight() * (state.scale.ratio ** 2)), 0);

        let commonGfaForLevel = nonLiftGfaArea;
        if (levelKey === lowestGfaLiftLevel) {
            const liftAreaOnLevel = allLifts
                .filter(l => l.level === levelKey)
                .reduce((sum, l) => sum + (l.getScaledWidth() * l.getScaledHeight() * (state.scale.ratio ** 2)), 0);
            commonGfaForLevel += liftAreaOnLevel;
        }

        const item = {
            multiplier: multiplier,
            sellableGfa: 0,
            commonGfa: commonGfaForLevel,
            service: getAreaOfBlocksByCategory('service', levelKey),
            parking: calculateNetParkingArea(levelKey),
            balconyTerrace: 0,
            total: 0
        };

        if (levelKey === 'Typical_Floor') {
            const numFloors = multiplier || 1;
            item.sellableGfa = aptCalcs.totalSellableArea / numFloors;
            item.commonGfa += corridorTotalArea; // This is per floor
            item.balconyTerrace = aptCalcs.totalBalconyArea / numFloors;
        } else if (levelKey === 'Hotel') {
            item.sellableGfa = achievedHotelGfa / (multiplier || 1);
        } else if (['Retail', 'Supermarket', 'Office', 'Commercial', 'Mezzanine'].includes(levelKey)) {
            item.sellableGfa = getAreaForLevel(levelKey);
        } else if (levelKey === 'Roof') {
            const roofFootprintArea = getAreaForLevel(levelKey);
            const roofGfa = getAreaOfBlocksByCategory('gfa', levelKey);
            const roofServices = getAreaOfBlocksByCategory('service', levelKey);
            item.balconyTerrace = Math.max(0, roofFootprintArea - roofGfa - roofServices) + getAreaOfBlocksByCategory('builtup', levelKey);
        }
        
        item.total = (item.sellableGfa + item.commonGfa + item.service + item.parking + item.balconyTerrace) * multiplier;
        levelBreakdown[levelKey] = item;
        calculatedTotalBua += item.total;
    }
});

const totalCommon = Object.values(levelBreakdown).reduce((sum, level) => sum + (level.commonGfa * level.multiplier), 0);
const areas = {
    achievedResidentialGfa: aptCalcs.totalSellableArea, achievedRetailGfa, achievedOfficeGfa, achievedHotelGfa,
    totalCommon,
    podiumCarPark: calculateNetParkingArea('Podium') * inputs.numPodiums,
    gfCarPark: calculateNetParkingArea('Ground_Floor'),
    basementCarPark: calculateNetParkingArea('Basement') * inputs.numBasements,
    roofTerrace: getBlockDetails('builtup', 'Roof').totalArea
};

const totalGfa = Object.values(levelBreakdown).reduce((sum, level) => sum + ((level.sellableGfa + level.commonGfa) * level.multiplier), 0);

let totalSellable = aptCalcs.totalSellableArea;
if (inputs['include-retail-sellable']) totalSellable += areas.achievedRetailGfa;
if (inputs['include-office-sellable']) totalSellable += areas.achievedOfficeGfa;
if (inputs['include-hotel-sellable']) totalSellable += areas.achievedHotelGfa;
if (inputs['include-balcony-sellable']) totalSellable += aptCalcs.totalBalconyArea;

const efficiency = (totalGfa > 0 ? (totalSellable / totalGfa * 100) : 0);
const buaEfficiency = (calculatedTotalBua > 0 ? (totalSellable / calculatedTotalBua * 100) : 0);


let commonAreaDetailsForReport = [];
const allGfaBlockDetails = getBlockDetails('gfa').details;
allGfaBlockDetails.forEach(d => {
    if (d.name.toLowerCase().includes('lift')) {
        if (d.level === lowestGfaLiftLevel) { commonAreaDetailsForReport.push(d); }
    } else { commonAreaDetailsForReport.push(d); }
});
if (corridorTotalArea > 0) {
    commonAreaDetailsForReport.push({name: `Apartment Corridors (per floor)`, area: corridorTotalArea, level: `Typical_Floor`});
}
commonAreaDetailsForReport = commonAreaDetailsForReport.map(d => ({...d, name: d.name.replace(`(${d.level})`, '').trim()}));

 // --- PARKING CALCULATIONS ---
const parkingBreakdown = [];

// 1. Residential Logic
if (state.projectType === 'Residential' && aptMixWithCounts.length > 0 && state.currentProgram.parkingRule) {
    let apartmentParkingTotalReq = 0;
    aptMixWithCounts.forEach(apt => {
        if (apt.totalUnits > 0) {
            const requiredForType = apt.totalUnits * state.currentProgram.parkingRule(apt);
            apartmentParkingTotalReq += requiredForType;
            parkingBreakdown.push({ use: apt.type, count: `${fInt(apt.totalUnits)} units`, ratio: state.currentProgram.getParkingRuleDescription(apt), required: requiredForType });
        }
    });
        // Visitors
    if (apartmentParkingTotalReq > 0) parkingBreakdown.push({ use: 'Residential Visitors', count: '10% of Residential', ratio: '', required: Math.ceil(apartmentParkingTotalReq * 0.1) });
    
      if (areas.achievedRetailGfa > 0) {
    const retailReq = Math.ceil(areas.achievedRetailGfa / 70); // Typical 1 per 70 or 1 per 50
    parkingBreakdown.push({ 
        use: 'Retail & Supermarket', 
        count: `${f(areas.achievedRetailGfa)} m²`, 
        ratio: '1 per 70m²', 
        required: retailReq 
    });
}

// 4. Office & Commercial (Applies to ALL Project Types)
if (areas.achievedOfficeGfa > 0) {
    const officeReq = Math.ceil(areas.achievedOfficeGfa / 50);
    parkingBreakdown.push({ 
        use: 'Office & Commercial', 
        count: `${f(areas.achievedOfficeGfa)} m²`, 
        ratio: '1 per 50m²', 
        required: officeReq 
    });
}
}
// 2. Hotel Logic (If Primary Project is Hotel - Key Based)
if (state.projectType === 'Hotel' && state.currentProgram && hotelFootprints.length > 0) {
    const stdKey = state.currentProgram.unitTypes.find(u => u.key === 'standard_key');
    const suiteKey = state.currentProgram.unitTypes.find(u => u.key === 'suite_key');
    const totalHotelKeysGFA = inputs.numHotelFloors * hotelFootprints.reduce((sum, poly) => sum + getPolygonProperties(poly).area, 0);

    const numStdKeys = stdKey.area > 0 ? Math.floor(totalHotelKeysGFA * (stdKey.mix / 100) / stdKey.area) : 0;
    const numSuites = suiteKey.area > 0 ? Math.floor(totalHotelKeysGFA * (suiteKey.mix / 100) / suiteKey.area) : 0;

    hotelCalcs = { numStdKeys, numSuites, totalKeys: numStdKeys + numSuites };

    parkingBreakdown.push({ use: 'Key Room', count: `${fInt(numStdKeys)} keys`, ratio: '1 per 5 rooms', required: Math.ceil(numStdKeys / 5) });
    parkingBreakdown.push({ use: 'Suite', count: `${fInt(numSuites)} suites`, ratio: '1 per 2 suites', required: Math.ceil(numSuites / 2) });
    // 3. Retail & Supermarket (Applies to ALL Project Types)


// 5. Hotel Component (Mixed Use Fallback - if Hotel GFA exists but Project is NOT Hotel)
if (state.projectType !== 'Hotel' && areas.achievedHotelGfa > 0) {
     const hotelMixReq = Math.ceil(areas.achievedHotelGfa / 50); // General approximation if keys unknown
     parkingBreakdown.push({
        use: 'Hotel Component (GFA)',
        count: `${f(areas.achievedHotelGfa)} m²`,
        ratio: '1 per 50m²',
        required: hotelMixReq
     });
}

// 6. Specific Hotel Amenities (If Project Type is Hotel, check for special blocks)
 if (state.projectType === 'Hotel') {
    const getBlockAreaByName = (name) => state.serviceBlocks
        .filter(b => b.blockData && b.blockData.name.toLowerCase().includes(name.toLowerCase()))
        .reduce((sum, b) => sum + (b.getScaledWidth() * b.getScaledHeight() * (state.scale.ratio**2)), 0);

    const retailArea = achievedRetailGfa + getBlockAreaByName('Retail');
    const officeArea = achievedOfficeGfa + getBlockAreaByName('Office');
    const restaurantArea = getBlockAreaByName('Restaurant');
    const ballroomArea = getBlockAreaByName('Ballroom');
    const meetingArea = getBlockAreaByName('Meeting');
    
    if (retailArea > 0) parkingBreakdown.push({ use: 'Retail', count: `${f(retailArea)} m²`, ratio: '1 per 50m²', required: Math.ceil(retailArea / 50) });
    if (officeArea > 0) parkingBreakdown.push({ use: 'Office', count: `${f(officeArea)} m²`, ratio: '1 per 50m²', required: Math.ceil(officeArea / 50) });
    if (restaurantArea > 0) parkingBreakdown.push({ use: 'Restaurant', count: `${f(restaurantArea)} m²`, ratio: '1 per 50m²', required: Math.ceil(restaurantArea / 50) });
    if (ballroomArea > 0) parkingBreakdown.push({ use: 'Ballroom', count: `${f(ballroomArea)} m²`, ratio: '1 per 20m²', required: Math.ceil(ballroomArea / 20) });
    if (meetingArea > 0) parkingBreakdown.push({ use: 'Meeting Room', count: `${f(meetingArea)} m²`, ratio: '1 per 20m²', required: Math.ceil(meetingArea / 20) });

} else {
    if (areas.achievedOfficeGfa > 0) parkingBreakdown.push({ use: 'Office & Commercial', count: `${f(areas.achievedOfficeGfa)} m²`, ratio: '1 per 50m²', required: Math.ceil(areas.achievedOfficeGfa / 50) });
    if (areas.achievedRetailGfa > 0) parkingBreakdown.push({ use: 'Retail & Supermarket', count: `${f(areas.achievedRetailGfa)} m²`, ratio: '1 per 70m²', required: Math.ceil(areas.achievedRetailGfa / 70) });
}
}
let totalParkingReq = parkingBreakdown.reduce((sum, item) => sum + item.required, 0);
if (document.getElementById('parking-override-check').checked) {
    totalParkingReq = parseInt(document.getElementById('parking-override-value').value) || 0;
}

let parkingProvided = state.parkingRows.reduce((sum, row) => {
    let multiplier = 1;
    if (row.level === 'Basement') multiplier = inputs.numBasements;
    if (row.level === 'Podium') multiplier = inputs.numPodiums;
    return sum + (row.parkingCount || 0) * multiplier;
}, 0);

const officeOccupancy = Math.floor(areas.achievedOfficeGfa / 10);
const hotelOccupancy = areas.achievedHotelGfa > 0 ? Math.floor(areas.achievedHotelGfa / 35) * 1.5 : 0;
const totalOccupancy = aptCalcs.totalOccupancy + officeOccupancy + hotelOccupancy;
const totalFloorsAboveGround = 1 + inputs.numMezzanines + inputs.numPodiums + inputs.numTypicalFloors + inputs.numHotelFloors;

const garbageBinsRequired = Math.ceil(totalOccupancy / 100);

const liftsRequired = RESIDENTIAL_PROGRAM.calculateLifts(totalOccupancy, totalFloorsAboveGround);
const liftsProvided = state.serviceBlocks.filter(b => b.blockData && b.blockData.name.toLowerCase().includes('lift') &&
    !b.blockData.name.toLowerCase().includes("lift corridor") &&

 (b.level === lowestGfaLiftLevel)).length;

// NEW: Staircase Calculation
const stairsRequired = state.currentProgram?.calculateStaircases ? state.currentProgram.calculateStaircases(totalOccupancy) : 2;
const stairsProvided = state.serviceBlocks.filter(b => b.level === 'Typical_Floor' && b.blockData?.role === 'staircase').length;

return {
    inputs, areas, aptCalcs, hotelCalcs,schoolCalcs, labourCampCalcs,
    summary: { totalGfa, totalBuiltup: calculatedTotalBua, totalSellable, efficiency, buaEfficiency, commonAreaDetails: commonAreaDetailsForReport },
    parking: { breakdown: parkingBreakdown, required: totalParkingReq, provided: parkingProvided, surplus: parkingProvided - totalParkingReq },
    lifts: { required: liftsRequired, provided: liftsProvided, surplus: liftsProvided - liftsRequired, totalOccupancy: totalOccupancy , gfaLevel: lowestGfaLiftLevel},
    staircases: { required: stairsRequired, provided: stairsProvided, surplus: stairsProvided - stairsRequired },
    services: { garbageBinsRequired: garbageBinsRequired },
    levelBreakdown,
};

}

// --- SUBSTATION SIZING LOGIC ---
export function updateSubstationSize(block) {
if (!block || !block.isServiceBlock || block.blockData.role !== 'substation') return;


const tcl = parseFloat(document.getElementById('substation-tcl').value) || 1500;
const numTx = parseInt(document.getElementById('substation-num-tx').value) || 1;

// Store the dynamic properties in the block's data
block.blockData.tcl = tcl;
block.blockData.numTx = numTx;

let width = 6.5; // Default width
let height = 5.0; // Default height

// Simplified logic from code (40).html for GF single room
if (numTx === 1) {
    width = 6.54;
    height = 5.00;
} else if (numTx === 2) {
    width = 9.00;
    height = 6.00;
} else if (numTx > 2) {
    // Area = 55 (for 2) + 25 for each additional
    const totalArea = 55 + (numTx - 2) * 25;
    width = 9.00; // Keep width constant
    height = totalArea / width;
}

// Update the fabric object
if (state.scale.ratio > 0) {
    const rect = block.getObjects('rect')[0];
    if (rect) {
        block.set({
            scaleX: (width / state.scale.ratio) / rect.width,
            scaleY: (height / state.scale.ratio) / rect.height,
        });
        block.setCoords();
        state.canvas.requestRenderAll();
        handleObjectModified({ target: block });
    }
}

}