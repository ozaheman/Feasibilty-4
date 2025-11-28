import { state,setCurrentMode,setScale   } from './state.js';
import { getPolygonProperties, getPolygonBoundingBox } from './utils.js';
import { generateLinearParking } from './parkingLayoutUtils.js';
import { layoutFlatsOnPolygon, validateStaircaseDistance } from './apartmentLayout.js';
import { f,fInt,findBestFit } from './utils.js';
import {RESIDENTIAL_PROGRAM, LEVEL_ORDER, LEVEL_DEFINITIONS, PREDEFINED_COMPOSITE_BLOCKS ,AREA_STATEMENT_DATA   } from './config.js';

export function   getAreaOfBlocksByCategory(category, level, multiplier = 1) {
    if (state.scale.ratio === 0) return 0;
    const scaleSq = state.scale.ratio * state.scale.ratio;
    return state.serviceBlocks
        .filter(b => b.level === level && b.blockData && b.blockData.category === category)
        .reduce((sum, b) => sum + (b.getScaledWidth() * b.getScaledHeight() * scaleSq), 0) * multiplier;
}

export function  performCalculations() {
    const typicalFootprints = state.levels['Typical_Floor'].objects.filter(o => o.isFootprint);
    const hotelFootprints = state.levels['Hotel'].objects.filter(o => o.isFootprint);

    if (!state.plotPolygon || (typicalFootprints.length === 0 && hotelFootprints.length === 0)) {
        return null;
    }

    const inputs = {};
    document.querySelectorAll('.param-input').forEach(input => {
        if (input.type === 'number') { inputs[input.id] = parseFloat(input.value) || 0; } 
        else if (input.type === 'checkbox') { inputs[input.id] = input.checked; } 
        else { inputs[input.id] = input.value; }
    });

    const getAreaForLevel = (levelName) => 
        state.levels[levelName].objects.filter(o => o.isFootprint).reduce((sum, obj) => sum + getPolygonProperties(obj).area, 0);

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
                    name: b.blockData.name,
                    area: area,
                    level: b.level
                });
            });
        return { totalArea, details };
    };
    
    const countBlocks = (name) => state.serviceBlocks.filter(b => b.blockId && b.blockId.includes(name)).length;

    const calculateNetParkingArea = (levelName) => {
        const footprintArea = getAreaForLevel(levelName);
        if (footprintArea === 0) return 0;
        const gfaArea = getBlockDetails('gfa', levelName).totalArea;
        const servicesArea = getBlockDetails('service', levelName).totalArea;
        return Math.max(0, footprintArea - gfaArea - servicesArea);
    };

    let aptCalcs = { totalUnits: 0, totalSellableArea: 0, totalBalconyArea: 0, totalOccupancy: 0, aptMixWithCounts: [], wingBreakdown: [] };
    let hotelCalcs = null;
    let aptMixWithCounts = [];
    let corridorTotalArea = 0;
    let wingCalcs = [];
    
    const gfaAvailableForResidential = inputs.allowedGfa - inputs.allowedRetailGfa - inputs.allowedOfficeGfa;
    const isAptModeManual = document.querySelector('input[name="apt-mode"]:checked').value === 'manual';

    if (state.projectType === 'Residential' && state.currentProgram && typicalFootprints.length > 0) {
        const program = state.currentProgram;
        const calcMode = document.getElementById('apartment-calc-mode').value;
        const doubleLoaded = document.getElementById('double-loaded-corridor').checked;
        const balconyPlacement = document.getElementById('balcony-placement').value;
        const includeBalconiesInOffset = balconyPlacement === 'recessed';
        
        if (isAptModeManual) {
            aptMixWithCounts = program.unitTypes.map(apt => {
                const countInput = document.getElementById(`manual-count-${apt.key}`);
                const totalUnits = countInput ? parseInt(countInput.value) || 0 : 0;
                return { ...apt, totalUnits: totalUnits, area: apt.area, countPerFloor: inputs.numTypicalFloors > 0 ? totalUnits / inputs.numTypicalFloors : 0 };
            });
        } else if (gfaAvailableForResidential > 0) {
            const totalPerimeter = typicalFootprints.reduce((sum, poly) => sum + getPolygonProperties(poly).perimeter, 0);

            typicalFootprints.forEach((footprint, index) => {
                const wingPerimeter = getPolygonProperties(footprint).perimeter;
                const perimeterRatio = totalPerimeter > 0 ? wingPerimeter / totalPerimeter : (1 / typicalFootprints.length);
                
                const wingGfaTarget = gfaAvailableForResidential * perimeterRatio;
                const wingAptAreaPerFloor = wingGfaTarget > 0 && inputs.numTypicalFloors > 0 ? wingGfaTarget / inputs.numTypicalFloors : 0;

                const bestFit = findBestFit(wingAptAreaPerFloor, wingPerimeter, program.unitTypes);
                
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
    
    const allGfaBlocks = getBlockDetails('gfa');
    const totalCommonFromBlocks = allGfaBlocks.totalArea;

    let commonAreaDetails = allGfaBlocks.details.map(d => ({...d, name: d.name.replace(`(${d.level})`, '').trim()}));

    if (corridorTotalArea > 0) {
        commonAreaDetails.push({name: `Apartment Corridors (per floor)`, area: corridorTotalArea, level: `Typical_Floor`});
    }

    const totalCommon = totalCommonFromBlocks + (corridorTotalArea * inputs.numTypicalFloors);
    
    const areas = {
        achievedResidentialGfa: aptCalcs.totalSellableArea, achievedRetailGfa, achievedOfficeGfa, achievedHotelGfa,
        totalCommon,
        podiumCarPark: calculateNetParkingArea('Podium') * inputs.numPodiums,
        gfCarPark: calculateNetParkingArea('Ground_Floor'),
        basementCarPark: calculateNetParkingArea('Basement') * inputs.numBasements,
        roofTerrace: getBlockDetails('builtup', 'Roof').totalArea
    };
    
    const totalGfa = areas.achievedResidentialGfa + areas.achievedRetailGfa + areas.achievedOfficeGfa + areas.achievedHotelGfa + totalCommon;
    
    let totalSellable = aptCalcs.totalSellableArea;
    if (inputs['include-retail-sellable']) totalSellable += areas.achievedRetailGfa;
    if (inputs['include-office-sellable']) totalSellable += areas.achievedOfficeGfa;
    if (inputs['include-hotel-sellable']) totalSellable += areas.achievedHotelGfa;
    if (inputs['include-balcony-sellable']) totalSellable += aptCalcs.totalBalconyArea;

    const levelBreakdown = {};
    let calculatedTotalBua = 0;

    LEVEL_ORDER.forEach(levelKey => {
        const levelDef = LEVEL_DEFINITIONS[levelKey];
        const multiplier = levelDef.countKey ? (inputs[levelDef.countKey] || 0) : 1;
        if (state.levels[levelKey].objects.length > 0 || getBlockDetails('gfa', levelKey).totalArea > 0 || getBlockDetails('service', levelKey).totalArea > 0) {
            
            const item = {
                multiplier: multiplier,
                sellableGfa: 0,
                commonGfa: getAreaOfBlocksByCategory('gfa', levelKey),
                service: getAreaOfBlocksByCategory('service', levelKey),
                parking: calculateNetParkingArea(levelKey),
                balconyTerrace: 0,
                total: 0
            };

            if (levelKey === 'Typical_Floor') {
                item.sellableGfa = aptCalcs.totalSellableArea / (multiplier || 1);
                item.commonGfa += corridorTotalArea;
                item.balconyTerrace = aptCalcs.totalBalconyArea / (multiplier || 1);
            } else if (levelKey === 'Hotel') {
                item.sellableGfa = achievedHotelGfa / (multiplier || 1);
            } else if (['Retail', 'Supermarket'].includes(levelKey)) {
                item.sellableGfa = getAreaForLevel(levelKey);
            } else if (['Office', 'Commercial'].includes(levelKey)) {
                item.sellableGfa = getAreaForLevel(levelKey);
            } else if (levelKey === 'Roof') {
                item.balconyTerrace = getAreaOfBlocksByCategory('builtup', levelKey);
            }
            
            item.total = (item.sellableGfa + item.commonGfa + item.service + item.parking + item.balconyTerrace) * multiplier;
            levelBreakdown[levelKey] = item;
            calculatedTotalBua += item.total;
        }
    });

    const efficiency = (totalGfa > 0 ? (totalSellable / totalGfa * 100) : 0);

    const parkingBreakdown = [];
    
    if (state.projectType === 'Residential' && aptMixWithCounts.length > 0 && state.currentProgram.parkingRule) {
        let apartmentParkingTotalReq = 0;
        aptMixWithCounts.forEach(apt => {
            if (apt.totalUnits > 0) {
                const requiredForType = apt.totalUnits * state.currentProgram.parkingRule(apt);
                apartmentParkingTotalReq += requiredForType;
                parkingBreakdown.push({ use: apt.type, count: `${fInt(apt.totalUnits)} units`, ratio: state.currentProgram.getParkingRuleDescription(apt), required: requiredForType });
            }
        });
        if (apartmentParkingTotalReq > 0) parkingBreakdown.push({ use: 'Residential Visitors', count: '10% of Residential', ratio: '', required: Math.ceil(apartmentParkingTotalReq * 0.1) });
    }
    
    if (state.projectType === 'Hotel' && state.currentProgram && hotelFootprints.length > 0) {
        const stdKey = state.currentProgram.unitTypes.find(u => u.key === 'standard_key');
        const suiteKey = state.currentProgram.unitTypes.find(u => u.key === 'suite_key');
        const totalHotelKeysGFA = inputs.numHotelFloors * hotelFootprints.reduce((sum, poly) => sum + getPolygonProperties(poly).area, 0);

        const numStdKeys = stdKey.area > 0 ? Math.floor(totalHotelKeysGFA * (stdKey.mix / 100) / stdKey.area) : 0;
        const numSuites = suiteKey.area > 0 ? Math.floor(totalHotelKeysGFA * (suiteKey.mix / 100) / suiteKey.area) : 0;

        hotelCalcs = { numStdKeys, numSuites, totalKeys: numStdKeys + numSuites };

        parkingBreakdown.push({ use: 'Key Room', count: `${fInt(numStdKeys)} keys`, ratio: '1 per 5 rooms', required: Math.ceil(numStdKeys / 5) });
        parkingBreakdown.push({ use: 'Suite', count: `${fInt(numSuites)} suites`, ratio: '1 per 2 suites', required: Math.ceil(numSuites / 2) });
        
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
    const totalFloorsAboveGround = 1 + inputs.numPodiums + inputs.numTypicalFloors + inputs.numHotelFloors;

    const garbageBinsRequired = Math.ceil(totalOccupancy / 100);

    const liftsRequired = RESIDENTIAL_PROGRAM.calculateLifts(totalOccupancy, totalFloorsAboveGround);
    const liftsProvided = countBlocks('Lift'); 
    
    return {
        inputs, areas, aptCalcs, hotelCalcs,
        summary: { totalGfa, totalBuiltup: calculatedTotalBua, totalSellable, efficiency, commonAreaDetails },
        parking: { breakdown: parkingBreakdown, required: totalParkingReq, provided: parkingProvided, surplus: parkingProvided - totalParkingReq },
        lifts: { required: liftsRequired, provided: liftsProvided, surplus: liftsProvided - liftsRequired, totalOccupancy: totalOccupancy },
        services: { garbageBinsRequired: garbageBinsRequired },
        levelBreakdown,
    };
}