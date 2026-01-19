
//--- START OF FILE config.js ---

// MODULE 1: CONFIG & PROGRAM DATA (config.js equivalent)
// =====================================================================
import { VILLA_PROGRAM } from './villaProgram.js';
// --- MODIFICATION START: Added setback rules based on the provided table ---
export const SETBACK_RULES = [
    // Based on total number of floors ABOVE ground level.
    { minFloors: 0, maxFloors: 0, neighbor: 0, road: 0 },    // Basement only
    { minFloors: 1, maxFloors: 4, neighbor: 3, road: 0 },    // G, G+1, G+2, G+3
    { minFloors: 5, maxFloors: 5, neighbor: 3.75, road: 0 }, // G+4
    { minFloors: 6, maxFloors: 6, neighbor: 4.50, road: 0 }, // G+5
    { minFloors: 7, maxFloors: 7, neighbor: 5.25, road: 0 }, // G+6
    { minFloors: 8, maxFloors: 8, neighbor: 6.00, road: 0 }, // G+7
    { minFloors: 9, maxFloors: 9, neighbor: 6.75, road: 0 }, // G+8
    { minFloors: 10, maxFloors: 10, neighbor: 7.50, road: 0 }, // G+9
    { minFloors: 11, maxFloors: Infinity, neighbor: 7.50, road: 0 } // G+10 and above
];
// --- MODIFICATION END ---
export function calculateUnitDimensions(unit) {
    if (!unit.layout || unit.layout.length === 0) {
        unit.frontage = 0; unit.depth = 0; unit.area = 0; return;
    }
    const bounds = unit.layout.reduce((acc, room) => ({
        minX: Math.min(acc.minX, room.x), minY: Math.min(acc.minY, room.y),
        maxX: Math.max(acc.maxX, room.x + room.w), maxY: Math.max(acc.maxY, room.y + room.h)
    }), { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });
    unit.frontage = bounds.maxX - bounds.minX;
    unit.depth = bounds.maxY - bounds.minY;
    unit.area = unit.layout.reduce((sum, room) => sum + (room.w * room.h), 0);
}

export const LEVEL_DEFINITIONS = {
    'Basement': { objects: [], color: 'rgba(128, 128, 128, 0.4)', countKey: 'numBasements' },
    'Basement_Last': { objects: [], color: 'rgba(100, 100, 100, 0.4)', countKey: null },
    'Ground_Floor': { objects: [], color: 'rgba(156, 39, 176, 0.4)', countKey: null },
    'Mezzanine': { objects: [], color: 'rgba(126, 87, 194, 0.4)', countKey: 'numMezzanines' },
    'Retail': { objects: [], color: 'rgba(255, 152, 0, 0.8)', countKey: null },
    'Supermarket': { objects: [], color: 'rgba(205, 220, 57, 0.4)', countKey: null },
    'Podium': { objects: [], color: 'rgba(76, 175, 80, 0.4)', countKey: 'numPodiums' },
    'Podium_Last': { objects: [], color: 'rgba(66, 155, 70, 0.4)', countKey: null },
    'Office': { objects: [], color: 'rgba(3, 169, 244, 0.4)', countKey: null },
    'Commercial': { objects: [], color: 'rgba(233, 30, 99, 0.4)', countKey: null },
    'Typical_Floor': { objects: [], color: 'rgba(255, 255, 0, 0.4)', countKey: 'numTypicalFloors' },
    'Hotel': { objects: [], color: 'rgba(159, 100, 255, 0.4)', countKey: 'numHotelFloors' },
    'LabourCamp': { objects: [], color: 'rgba(255, 87, 34, 0.4)', countKey: null },
    'Warehouse': { objects: [], color: 'rgba(96, 125, 139, 0.4)', countKey: null },
    'School': { objects: [], color: 'rgba(0, 150, 136, 0.4)', countKey: null },
    'Roof': { objects: [], color: 'rgba(63, 81, 181, 0.4)', countKey: null }
};
export const LEVEL_ORDER = [
    'Basement', 'Basement_Last', 'Ground_Floor', 'Mezzanine', 'Retail', 'Supermarket', 
    'Podium', 'Podium_Last', 'Office', 'Commercial', 'Typical_Floor', 'Hotel', 'LabourCamp', 'Warehouse', 'School', 'Roof'
];
export const LEVEL_HEIGHTS = {
    Basement: 3.5, Basement_Last: 3.5, Ground_Floor: 8.5, Mezzanine: 3.0, Retail: 4.5, Supermarket: 5.0,
    Podium: 3.2, Podium_Last: 3.5, Office: 3.5, Commercial: 4.0, Typical_Floor: 3.5, Hotel: 3.5,  LabourCamp: 3.5, Warehouse: 10.0, School: 4.0, Roof: 1.0, default: 3.5
};
export const BLOCK_CATEGORY_COLORS = {
    gfa: { fill: 'rgba(0, 200, 83, 0.5)', stroke: '#00c853' },
    service: { fill: 'rgba(213, 0, 0, 0.5)', stroke: '#d50000' },
    builtup: { fill: 'rgba(41, 121, 255, 0.5)', stroke: '#2979ff' },
    void_area: { fill: 'rgba(0, 121, 255, 0.5)', stroke: '#2979ff' },
    default: { fill: 'rgba(128, 0, 128, 0.5)', stroke: '#800080' }
};

export const HOTEL_PROGRAM = {
    title: "Room & Suite Mix", unitDefsTitle: "Key Definitions",
    unitTypes: [
        { key: "standard_key", type: "Standard Key", area: 35, color: 'rgba(59, 130, 246, 0.7)', mix: 90, layout: [{ name: 'Room', x: 0, y: 0, w: 5, h: 7 }] },
        { key: "suite_key", type: "Suite Key", area: 70, color: 'rgba(16, 185, 129, 0.7)', mix: 10, layout: [{ name: 'Living', x: 0, y: 0, w: 5, h: 7 }, { name: 'Bed', x: 5, y: 0, w: 5, h: 7 }] }
    ],
    scenarios: [ { name: "1. Standard Hotel", mix: [90, 10] }, { name: "2. Boutique Hotel", mix: [70, 30] }, { name: "3. Business Hotel", mix: [95, 5] } ],
    parkingRule: function(unit) { if (unit.key === 'suite_key') return 0.5; return 0.2; },
    getParkingRuleDescription: function(unit) { if (unit.key === 'suite_key') return '1 per 2 suites'; return '1 per 5 rooms'; },
    calculateUnitDimensions,
};
HOTEL_PROGRAM.unitTypes.forEach(unit => {
    if (unit.key === 'standard_key') { unit.frontage = 5; unit.depth = 7; }
    if (unit.key === 'suite_key') { unit.frontage = 10; unit.depth = 7; }
});

export const RESIDENTIAL_PROGRAM = {
    title: "Apartment Mix", unitDefsTitle: "Unit Definitions",
    unitTypes: [
        {key:"studio", type:"Studio", balconyMultiplier:1.8, balconyCoverage: 80, layout:[{name:'Living/Bed', x:0, y:0, w:4, h:8}], color:'rgba(251, 191, 36, 0.7)', mix:10, occupancyLoad:1.5 },
        {key:"1bhk", type:"1 Bedroom", balconyMultiplier:1.8, balconyCoverage: 80, layout:[{name:'Living', x:0, y:0, w:4, h:8},{name:'Bed', x:4, y:0, w:4, h:8}], color:'rgba(59, 130, 246, 0.7)', mix:40, occupancyLoad:1.8 },
        {key:"1bhk_study", type:"1 Bed + Study", balconyMultiplier:1.8, balconyCoverage: 80, layout:[ { name: 'Living', x: 0, y: 0, w: 4.5, h: 8 }, { name: 'Bed', x: 4.5, y: 0, w: 4, h: 8 }, { name: 'Study', x: 8.5, y: 0, w: 3, h: 5 }, ], color: 'rgba(23, 162, 184, 0.7)', mix: 0, occupancyLoad: 2 },
        {key:"2bhk", type:"2 Bedroom", balconyMultiplier:1.8, balconyCoverage: 80, layout:[{name:'Living', x:0, y:0, w:4, h:8},{name:'Bed 1', x:4, y:0, w:4, h:8},{name:'Bed 2', x:8, y:0, w:4, h:8}], color:'rgba(16, 185, 129, 0.7)', mix:40, occupancyLoad:3 },
        {key:"3bhk", type:"3 Bedroom", balconyMultiplier:1.8, balconyCoverage: 80, layout:[{name:'Living', x:0, y:0, w:5.5, h:8},{name:'Bed 1', x:5.5, y:0, w:4, h:8},{name:'Bed 2', x:9.5, y:0, w:4, h:8},{name:'Bed 3', x:13.5, y:0, w:5, h:8}], color:'rgba(239, 68, 68, 0.7)', mix:10, occupancyLoad:4 },
        {key:"4bhk", type:"4 Bedroom", balconyMultiplier:1.8, balconyCoverage: 80, layout:[{name:'Living', x:0, y:0, w:6, h:8},{name:'Bed 1', x:6, y:0, w:4.5, h:8},{name:'Bed 2', x:10.5, y:0, w:4.5, h:8}, {name:'Bed 3', x:15, y:0, w:4, h:8}, {name:'Bed 4', x:19, y:0, w:3.5, h:8}], color:'rgba(139, 92, 246, 0.7)', mix:0, occupancyLoad:5 },
        {key:"5bhk", type:"5 Bedroom", balconyMultiplier:1.8, balconyCoverage: 80, layout:[{name:'Living', x:0, y:0, w:7, h:8},{name:'Bed 1', x:7, y:0, w:5, h:8},{name:'Bed 2', x:12, y:0, w:4.5, h:8},{name:'Bed 3', x:16.5, y:0, w:4, h:8},{name:'Bed 4', x:20.5, y:0, w:3.5, h:8}, {name:'Bed 5', x:24, y:0, w:2.5, h:8}], color:'rgba(236, 72, 153, 0.7)', mix:0, occupancyLoad:6 },
        {key:"duplex_3bhk", type:"Duplex (3 Bed)", balconyMultiplier:2.0, balconyCoverage: 90, layout:[ { name: 'Living', x: 0, y: 0, w: 6, h: 10 }, { name: 'Kitchen', x: 6, y: 6, w: 4, h: 4 }, { name: 'Bed 1', x: 6, y: 0, w: 4, h: 6 }, { name: 'Bed 2', x: 10, y: 0, w: 5, h: 5 }, { name: 'Bed 3', x: 10, y: 5, w: 5, h: 5 }, { name: 'Stair', x: 0, y: 8, w: 2, h: 2 }, ], color: 'rgba(108, 117, 125, 0.7)', mix: 0, occupancyLoad: 4.5 },
        {key:"penthouse_4bhk", type:"Penthouse (4 Bed)", balconyMultiplier:2.5, balconyCoverage: 100, layout:[ { name: 'Living', x: 0, y: 0, w: 8, h: 12 }, { name: 'M. Bed', x: 8, y: 0, w: 6, h: 8 }, { name: 'Bed 2', x: 14, y: 0, w: 5, h: 6 }, { name: 'Bed 3', x: 14, y: 6, w: 5, h: 6 }, { name: 'Terrace', x: 19, y: 0, w: 4, h: 12 }, { name: 'Kitchen', x: 8, y: 8, w: 6, h: 4 }, ], color: 'rgba(253, 126, 20, 0.7)', mix: 0, occupancyLoad: 6 }
    ],
    scenarios: [
        {name:"1. Balanced Mix",mix:[10,40,0,40,10,0,0,0,0]},
        {name:"2. Budget Friendly",mix:[40,40,0,15,5,0,0,0,0]},
        {name:"3. Family Oriented",mix:[5,15,0,50,30,0,0,0,0]},
        {name:"4. Luxury Focus",mix:[0,5,0,20,40,25,0,10,0]},
        {name:"5. Compact Living",mix:[50,30,10,10,0,0,0,0,0]},
        {name:"6. Luxury High-End", mix:[0,0,5,10,20,25,10,10,20]}
    ],
    parkingRule: function(unit) {
        if (unit.key.includes('penthouse') || unit.key.includes('5bhk')) return 3;
        if (unit.key.includes('duplex') || unit.key.includes('4bhk') || unit.key.includes('3bhk')) return 2;
        if (unit.key.includes('2bhk') && unit.area > 140) return 2;
        return 1;
    },
    getParkingRuleDescription: function(unit) {
        const bays = this.parkingRule(unit);
        let reason = `${bays} per unit`;
        if (unit.key.includes('2bhk') && unit.area > 140) { reason += ' (>140m²)'; }
        return reason;
    },
    liftOccupancyRanges: [0, 201, 301, 401, 501, 601, 701, 801, 901, 1001],
    liftMatrix: [[1,5,1,1,2,2,0,0,0,0,0,0],[6,10,2,2,2,2,3,3,3,0,0,0],[11,15,2,2,2,3,3,3,4,4,4,5],[16,20,2,2,3,3,3,4,4,4,5,5],[21,25,2,3,3,3,4,4,4,5,5,6],[26,30,3,3,3,3,4,4,5,5,5,6],[31,35,3,3,3,4,4,5,5,5,6,6]],
    calculateLifts: function(totalOccupancyLoad, numFloors) { if (numFloors <= 0 || totalOccupancyLoad <= 0) return 0; let floorConfigRow = this.liftMatrix.find(row => numFloors >= row[0] && numFloors <= row[1]); if (!floorConfigRow) { floorConfigRow = this.liftMatrix[this.liftMatrix.length - 1]; } let occupancyColIndex = 0; for (let i = this.liftOccupancyRanges.length - 1; i >= 0; i--) { if (totalOccupancyLoad >= this.liftOccupancyRanges[i]) { occupancyColIndex = i; break; } } const liftCountIndex = occupancyColIndex + 2; return floorConfigRow[liftCountIndex] || floorConfigRow[floorConfigRow.length - 1]; },
    
    // NEW: Staircase requirement data from PDF
    staircaseOccupancyRules: [
        { min: 0, max: 499, exits: 2 },
        { min: 500, max: 1000, exits: 3 },
        { min: 1001, max: Infinity, exits: 4 }
    ],
    calculateStaircases: function(totalOccupancyLoad) {
        if (totalOccupancyLoad <= 0) return 2; // Baseline for any building
        const rule = this.staircaseOccupancyRules.find(range => 
            totalOccupancyLoad >= range.min && totalOccupancyLoad <= range.max
        );
        return rule ? rule.exits : 2; // Default to 2 if something goes wrong
    },
    
    calculateUnitDimensions,
};
RESIDENTIAL_PROGRAM.unitTypes.forEach(calculateUnitDimensions);

export const SCHOOL_PROGRAM = {
    title: "School Program", unitDefsTitle: "Room Definitions",
    unitTypes: [ // These are representations, not for layout mix. `num` is from the image.
        { key: "classroom_g7_12", type: "Classroom (G7-12)", area: 60, color: 'rgba(59, 130, 246, 0.7)', num: 26, layout: [{ name: 'Class', x: 0, y: 0, w: 7.5, h: 8 }] },
        { key: "classroom_g13", type: "Classroom (G13)", area: 65, color: 'rgba(16, 185, 129, 0.7)', num: 6, layout: [{ name: 'Class', x: 0, y: 0, w: 8, h: 8.125 }] },
    ],
    scenarios: [ { name: "Standard School", mix: [] } ], // Mix not applicable here
    parkingRules: {
        carPerClassroom: 1,
        carPerAdminSqm: 50, // Corrected from image typo: 900sqm / 18 cars = 50sqm/car
        busPerClassroom: 1/3,
        accessibleRatio: 1/50, // 1 for every 50 -> 2 required for 50+50 parking
    },
    playAreaMultiplier: 2.0, // 2 x Classroom Area
    coveredPlayAreaRatio: 0.5, // 50% of total
    garbageKgPer100Sqm: 12,
    getParkingRuleDescription: () => 'School Specific Rules', // Placeholder
    calculateUnitDimensions,
};
SCHOOL_PROGRAM.unitTypes.forEach(calculateUnitDimensions);


export const LABOUR_CAMP_PROGRAM = {
    title: "Room Mix", unitDefsTitle: "Room Definitions",
    unitTypes: [
        {key:"labor_room", type:"Labor Room (4p)", layout:[{name:'Room', x:0, y:0, w:4, h:5}], color:'rgba(251, 191, 36, 0.7)', mix:70},
        {key:"supervisor_room", type:"Supervisor Room", layout:[{name:'Room', x:0, y:0, w:5, h:5}], color:'rgba(59, 130, 246, 0.7)', mix:10},
    ],
    scenarios: [ {name:"Standard Camp",mix:[90,10]} ],
    calculateUnitDimensions,
};
LABOUR_CAMP_PROGRAM.unitTypes.forEach(calculateUnitDimensions);

export const PROJECT_PROGRAMS = {
    'Residential': RESIDENTIAL_PROGRAM, 
    'Hotel': HOTEL_PROGRAM, 
    'School': SCHOOL_PROGRAM, 
    'LabourCamp': LABOUR_CAMP_PROGRAM,
    'Villa': VILLA_PROGRAM,
    'Warehouse': null
};

export const AREA_STATEMENT_DATA = [
    { name: "Comm. Staircase (Basement)", key: "Comm_Staircase_Basement_6_3", level: "Basement", type: "gfa", w: 6, h: 3, role: 'staircase' },
    { name: "Corridor (Basement)", key: "Corridor_Basement_2.4_2.4", level: "Basement", type: "gfa", w: 2.4, h: 2.4 },
    { name: "Lift (Basement)", key: "Lift_Basement_2.4_2.4", level: "Basement", type: "gfa", w: 2.4, h: 2.4 },
    { name: "Pump Room for ETS", key: "Pump_Room_for_ETS_5_5", level: "Basement", type: "service", w: 5, h: 5 },
    { name: "Water Tank", key: "Water_Tank_3_10", level: "Basement", type: "service", w: 3, h: 10 },
    { name: "BTU Meter Room", key: "BTU_Meter_Room_2.5_2.5", level: "Ground_Floor", type: "service", w: 2.5, h: 2.5 },
    { name: "Comm_Staircase_GF", key: "Comm_Staircase_GF_6_3", level: "Ground_Floor", type: "gfa", w: 6, h: 3, role: 'staircase' },
    { name: "Control Room", key: "Control_Room_19_1", level: "Ground_Floor", type: "service", w: 19, h: 1 },
    { name: "Corridor (GF)", key: "Corridor_GF_6.5_1.8", level: "Ground_Floor", type: "gfa", w: 6.5, h: 1.8 },
    { name: "ETS Room", key: "ETS_Room_9_9", level: "Ground_Floor", type: "service", w: 9, h: 9 },
    { name: "Electrical Room", key: "Electrical_Room_3_3", level: "Ground_Floor", type: "service", w: 3, h: 3 },
    { name: "Entrance Lobby", key: "Entrance_Lobby_8_12", level: "Ground_Floor", type: "gfa", w: 8, h: 12 },
    { name: "GSM Room", key: "GSM_Room_3_3", level: "Ground_Floor", type: "service", w: 3, h: 3 },
    { name: "Garbage Room", key: "Garbage_Room_8_1", level: "Ground_Floor", type: "service", w: 8, h: 1 },
    { name: "Generator Room", key: "Generator_Room_7_8", level: "Ground_Floor", type: "service", w: 7, h: 8 },
    { name: "LV Room", key: "LV_Room_5.1_8.6", level: "Ground_Floor", type: "service", w: 5.1, h: 8.6 },
    { name: "Lift (GF)", key: "Lift_GF_2.4_2.4", level: "Ground_Floor", type: "gfa", w: 2.4, h: 2.4 },
    { name: "Lift Corridor (GF)", key: "Lift_Corridor_GF_10_2.4", level: "Ground_Floor", type: "gfa", w: 10, h: 2.4 },
    { name: "Pump Room", key: "Pump_Room_8.5_8", level: "Ground_Floor", type: "service", w: 8.5, h: 8 },
    { name: "RMU Room", key: "RMU_Room_3_3.2", level: "Ground_Floor", type: "service", w: 3, h: 3.2 },
    { name: "Substation", key: "Substation_6.5_5", level: "Ground_Floor", type: "service", w: 6.5, h: 5, role: 'substation', tcl: 1500, numTx: 1 },
    { name: "Telephone Room", key: "Telephone_Room_5.1_4", level: "Ground_Floor", type: "service", w: 5.1, h: 4 },
    { name: "Retail Toilet", key: "Retail_Toilet_2.4_1.5", level: "Ground_Floor", type: "gfa", w: 2.4, h: 1.5 },
    { name: "Retail Accessible Toilet", key: "Retail_Accessible_Toilet_2.4_1.5", level: "Ground_Floor", type: "gfa", w: 2.4, h: 1.5 },
    { name: "Restaurant", key: "Restaurant_15_10", level: "Ground_Floor", type: "gfa", w: 15, h: 10, projectTypes: ['Hotel'] },
    { name: "Ballroom", key: "Ballroom_30_20", level: "Ground_Floor", type: "gfa", w: 30, h: 20, projectTypes: ['Hotel'] },
    { name: "Meeting Room", key: "Meeting_Room_10_8", level: "Podium", type: "gfa", w: 10, h: 8, projectTypes: ['Hotel'] },
    { name: "Swimming Pool", key: "Swimming_Pool_15_7", level: "Podium", type: "builtup", w: 15, h: 7 },
    { name: "Comm_Staircase_Podium", key: "Comm_Staircase_Podium_6_3", level: "Podium", type: "gfa", w: 6, h: 3, role: 'staircase' },
    { name: "Corridor (Podium)", key: "Corridor_Podium_12.8_2.4", level: "Podium", type: "gfa", w: 12.8, h: 2.4 },
    { name: "Electrical Room (Podium)", key: "Electrical_Room_Podium_4_3.5", level: "Podium", type: "service", w: 4, h: 3.5 },
    { name: "Lift (Podium)", key: "Lift_Podium_2.4_2.4", level: "Podium", type: "gfa", w: 2.4, h: 2.4 },
    { name: "Water Meter (Podium)", key: "Water_Meter_Podium_1.7_1.7", level: "Podium", type: "service", w: 1.7, h: 1.7 },
    { name: "Meeting Room", key: "Meeting_Room_10_8", level: "Mezzanine", type: "gfa", w: 10, h: 8, projectTypes: ['Hotel'] },
    { name: "Swimming Pool", key: "Swimming_Pool_15_7", level: "Mezzanine", type: "builtup", w: 15, h: 7 },
    { name: "Comm_Staircase_Mezzanine", key: "Comm_Staircase_Mezzanine_6_3", level: "Mezzanine", type: "gfa", w: 6, h: 3, role: 'staircase' },
    { name: "Corridor (Mezzanine)", key: "Corridor_Mezzanine_12.8_2.4", level: "Mezzanine", type: "gfa", w: 12.8, h: 2.4 },
    { name: "Electrical Room (Mezzanine)", key: "Electrical_Room_Mezzanine_4_3.5", level: "Mezzanine", type: "service", w: 4, h: 3.5 },
    { name: "Lift_Mezzanine", key: "Lift_Mezzanine_2.4_2.4", level: "Mezzanine", type: "gfa", w: 2.4, h: 2.4 },
    { name: "Water Meter (Mezzanine)", key: "Water_Meter_Mezzanine_1.7_1.7", level: "Mezzanine", type: "service", w: 1.7, h: 1.7 },
    { name: "Comm. Corridor (Typical)", key: "Comm_Corridor_Typical_21_1.8", level: "Typical_Floor", type: "gfa", w: 21, h: 1.8 },
    { name: "Comm. Electrical Room", key: "Comm_Electrical_Room_10_1", level: "Typical_Floor", type: "service", w: 10, h: 1 },
    { name: "Comm. Garbage Chute", key: "Comm_Garbage_Chute_2.7_1.5", level: "Typical_Floor", type: "service", w: 2.7, h: 1.5 },
    { name: "Comm. Lift Corridor", key: "Comm_Lift_Corridor_6.6_2.4", level: "Typical_Floor", type: "gfa", w: 6.6, h: 2.4 },
    { name: "Comm_Staircase_Typical", key: "Comm_Staircase_Typical_6_3", level: "Typical_Floor", type: "gfa", w: 6, h: 3, role: 'staircase' },
    { name: "Comm. Tele Room", key: "Comm_Tele_Room_2.4_3.5", level: "Typical_Floor", type: "service", w: 2.4, h: 3.5 },
    { name: "Comm. Water Meter", key: "Comm_Water_Meter_1.7_1.7", level: "Typical_Floor", type: "service", w: 1.7, h: 1.7 },
    { name: "Comm. Water Meter", key: "Comm_Water_Meter_4_1", level: "Typical_Floor", type: "service", w: 4, h: 1 },
    { name: "Lift_Typical", key: "Lift_Typical_2.4_2.4", level: "Typical_Floor", type: "gfa", w: 2.4, h: 2.4},
    { name: "Shaft", key: "Shaft_2_2", level: "Typical_Floor", type: "service", w: 2.0, h: 2.0},
    { name: "Comm. Gym", key: "Comm_Gym_583_1", level: "Roof", type: "service", w: 583, h: 1 },
    { name: "Comm. Service (Roof)", key: "Comm_Service_Roof_124_1", level: "Roof", type: "service", w: 124, h: 1 },
    { name: "Electrical Room", key: "Electrical_Room_3_3.2", level: "Roof", type: "service", w: 3, h: 3.2 },
    { name: "Garbage Chute", key: "Garbage_Chute_2.7_1.5", level: "Roof", type: "service", w: 2.7, h: 1.5 },
    { name: "GSM room", key: "GSM_room_2.7_1.5", level: "Roof", type: "service", w: 2.7, h: 1.5 },
    { name: "Comm_Staircase_Roof", key: "Comm_Staircase_Roof_6_3", level: "Roof", type: "gfa", w: 6, h: 3, role: 'staircase' },
    { name: "Corridor (Roof)", key: "Corridor_Roof_6.6_2.4", level: "Roof", type: "gfa", w: 6.6, h: 2.4 },
    { name: "Lift (Roof)", key: "Lift_Roof_2.4_2.4", level: "Roof", type: "gfa", w: 2.4, h: 2.4 },
    { name: "Terrace Area", key: "Terrace_Area_0.5_1166", level: "Roof", type: "builtup", w: 0.5, h: 1166 },
    // NEW School Blocks
    { name: "Admin Office", key: "Admin_Office_30_30", level: "Ground_Floor", type: "gfa", w: 30, h: 30, role: 'admin_area', projectTypes: ['School'] },
    { name: "School Library", key: "School_Library_15_20", level: "Ground_Floor", type: "gfa", w: 15, h: 20, projectTypes: ['School'] },
    { name: "School Clinic", key: "School_Clinic_6_8", level: "Ground_Floor", type: "gfa", w: 6, h: 8, projectTypes: ['School'] },
    { name: "Auditorium", key: "Auditorium_25_35", level: "Ground_Floor", type: "gfa", w: 25, h: 35, projectTypes: ['School'] },
    { name: "Play Area", key: "Play_Area_10_10", level: "Ground_Floor", type: "builtup", w: 10, h: 10, projectTypes: ['School'] },
    { name: "Covered Play Area", key: "Covered_Play_Area_20_20", level: "Ground_Floor", type: "builtup", w: 20, h: 20, projectTypes: ['School'] },
    // NEW Labour Camp Blocks
    { name: "Mess Hall", key: "Mess_Hall_20_30", level: "Ground_Floor", type: "gfa", w: 20, h: 30, projectTypes: ['LabourCamp'] },
    { name: "Camp Kitchen", key: "Camp_Kitchen_15_15", level: "Ground_Floor", type: "service", w: 15, h: 15, projectTypes: ['LabourCamp'] },
    { name: "Recreation Room", key: "Recreation_Room_10_15", level: "Ground_Floor", type: "gfa", w: 10, h: 15, projectTypes: ['LabourCamp'] }
];

export const PREDEFINED_COMPOSITE_BLOCKS = [
    { name: "Residential Core 1", level: "Typical_Floor", blocks: [ { key: "Comm_Staircase_Typical_6_3", x: 0, y: 0 }, { key: "Comm_Staircase_Typical_6_3", x: 8.8, y: 0 }, { key: "Lift_Typical_2.4_2.4", x: 6.2, y: 0 }, { key: "Lift_Typical_2.4_2.4", x: 6.2, y: 2.6 }, { key: "Shaft_2_2", x: 6.3, y: 5.2 } ] },
    { name: "Ground Floor Core", level: "Ground_Floor", blocks: [ { key: "Comm_Staircase_GF_6_3", x: 0, y: 8 }, { key: "Comm_Staircase_GF_6_3", x: 23, y: 8 }, { key: "Lift_(GF)_2.4_2.4", x: 7, y: 8.3 }, { key: "Lift_(GF)_2.4_2.4", x: 9.6, y: 8.3 }, { key: "Shaft_2_2", x: 8.8, y: 2.9 }, { key: "Comm._Garbage_Chute_2.7_1.5", x: 6, y: 2.9 }, { key: "Electrical_Room_3_3", x: 0, y: 3.2 }, { key: "Substation_6.5_5", x: 20.5, y: 11.5 }, { key: "LV_Room_5.1_8.6", x: 15.2, y: 12 }, { key: "ETS_Room_9_9", x: 0, y: 11.5 }, { key: "Pump_Room_8.5_8", x: 9.2, y: 12 }, { key: "Garbage_Room_8_1", x: 0, y: 20.7 }, { key: "Telephone_Room_5.1_4", x: 20.5, y: 22.2 }, { key: "Electrical_Room_3_3", x: 25.8, y: 22.2 }, { key: "Water_Meter_(Podium)_1.7_1.7", x: 29, y: 24.5 }, { key: "Control_Room_19_1", x: 0, y: 0 },{ key: "Entrance_Lobby_8_12", x: 0, y: 0 }  ] },
    { name: "Podium Floor Core", level: "Podium", blocks: [ { key: "Comm_Staircase_Podium_6_3", x: 0, y: 0 }, { key: "Comm_Staircase_Podium_6_3", x: 14.8, y: 0 }, { key: "Lift_(Podium)_2.4_2.4", x: 6.2, y: 0.3 }, { key: "Lift_(Podium)_2.4_2.4", x: 8.8, y: 0.3 }, { key: "Corridor_(Podium)_12.8_2.4", x: 1.8, y: 3 }, { key: "Electrical_Room_(Podium)_4_3.5", x: 0, y: 3.2 }, { key: "Telephone_Room_5.1_4", x: 4.2, y: 5.6 }, { key: "Garbage_Room_8_1", x: 9.5, y: 5.6 }, { key: "Water_Meter_(Podium)_1.7_1.7", x: 17.7, y: 5.6 } ] },
    { name: "Mezzanine Floor Core", level: "Mezzanine", blocks: [ { key: "Comm_Staircase_Mezzanine_6_3", x: 0, y: 0 }, { key: "Comm_Staircase_Mezzanine_6_3", x: 14.8, y: 0 }, { key: "Lift_Mezzanine_2.4_2.4", x: 6.2, y: 0.3 }, { key: "Lift_Mezzanine_2.4_2.4", x: 8.8, y: 0.3 }, { key: "Corridor_(Mezzanine)_12.8_2.4", x: 1.8, y: 3 }, { key: "Electrical_Room_(Mezzanine)_4_3.5", x: 0, y: 3.2 }, { key: "Telephone_Room_5.1_4", x: 4.2, y: 5.6 }, { key: "Garbage_Room_8_1", x: 9.5, y: 5.6 }, { key: "Water_Meter_(Mezzanine)_1.7_1.7", x: 17.7, y: 5.6 } ] },
    { name: "Basement Floor Core", level: "Basement", blocks: [ { key: "Comm._Staircase_(Basement)_6_3", x: 0, y: 0 }, { key: "Comm._Staircase_(Basement)_6_3", x: 14.8, y: 0 }, { key: "Lift_(Basement)_2.4_2.4", x: 6.2, y: 0.3 }, { key: "Lift_(Basement)_2.4_2.4", x: 8.8, y: 0.3 }, { key: "Lift_(Basement)_2.4_2.4", x: 6.2, y: 2.9 }, { key: "Lift_(Basement)_2.4_2.4", x: 8.8, y: 2.9 }, { key: "Lift_Corridor_(GF)_10_2.4", x: 3.5, y: 5.5 }, { key: "Electrical_Room_3_3", x: 0, y: 3.2 }, { key: "Telephone_Room_5.1_4", x: 3.2, y: 8.1 }, { key: "Garbage_Room_8_1", x: 8.5, y: 8.1 }, { key: "Water_Meter_(Podium)_1.7_1.7", x: 16.7, y: 8.1 }, { key: "GSM_Room_3_3", x: 17, y: 3.2 } ] },
    { name: "Typical Floor Core", level: "Typical_Floor", blocks: [ { key: "Comm_Staircase_Typical_6_3", x: 0, y: 0 }, { key: "Comm_Staircase_Typical_6_3", x: 14.8, y: 0 }, { key: "Lift_Typical_2.4_2.4", x: 6.2, y: 0.3 }, { key: "Lift_Typical_2.4_2.4", x: 8.8, y: 0.3 }, { key: "Lift_Typical_2.4_2.4", x: 6.2, y: 2.9 }, { key: "Lift_Typical_2.4_2.4", x: 8.8, y: 2.9 }, { key: "Comm._Lift_Corridor_6.6_2.4", x: 5.1, y: 5.5 }, { key: "Comm._Electrical_Room_10_1", x: 0, y: 3.2 }, { key: "Comm._Tele_Room_2.4_3.5", x: 12.2, y: 3.2 }, { key: "Comm._Garbage_Chute_2.7_1.5", x: 11.9, y: 6.9 }, { key: "Comm._Water_Meter_1.7_1.7", x: 14.8, y: 6.9 } ] },
    { name: "Roof Floor Core", level: "Roof", blocks: [ { key: "Comm_Staircase_Roof_6_3", x: 0, y: 0 }, { key: "Comm_Staircase_Roof_6_3", x: 14.8, y: 0 }, { key: "Lift_(Roof)_2.4_2.4", x: 6.2, y: 0.3 }, { key: "Lift_(Roof)_2.4_2.4", x: 8.8, y: 0.3 }, { key: "Lift_(Roof)_2.4_2.4", x: 6.2, y: 2.9 }, { key: "Lift_(Roof)_2.4_2.4", x: 8.8, y: 2.9 }, { key: "Corridor_(Roof)_6.6_2.4", x: 5.1, y: 5.5 }, { key: "Electrical_Room_(Podium)_4_3.5", x: 0, y: 3.2 }, { key: "Comm._Tele_Room_2.4_3.5", x: 12.2, y: 3.2 }, { key: "Garbage_Room_8_1", x: 4.8, y: 8.1 }, { key: "Comm._Water_Meter_1.7_1.7", x: 13, y: 8.1 }, { key: "GSM_Room_3_3", x: 17.2, y: 3.2 } ] }
];

export const HOTEL_REQUIREMENTS = {
    "1-star": {
        "Public Areas": [
            { code: "1.1.1.02", type: "O", text: "Clear exterior signage, visible from main road, with Arabic & English names at 50% each." },
            { code: "1.1.1.02", type: "L", text: "Hotel entrance clearly identifiable and illuminated at night." },
            { code: "1.1.2.03", type: "L", text: "All entrance areas have access for disabled guests." },
            { code: "1.1.2.04", type: "O", text: "Lobby and reception area with seating provided." },
            { code: "1.1.2.04", type: "O", text: "Free wireless in all areas and rooms (512 Kbps upload / 1 Mbps download)." },
            { code: "1.1.2.13", type: "L", text: "1 set of public toilets for gents & ladies on the same floor as outlets." },
            { code: "1.1.2.13", type: "L", text: "**At least 1 independent toilet for disabled guests." },
            { code: "1.1.2.09", type: "L", text: "**If 2 levels or more, guest lift is present and travels to all floors." },
        ],
        "Food & Beverage": [
            { code: "2.2.1.06", type: "L", text: "**Minimum of 1 restaurant available for all day dining." },
            { code: "2.2.1.06", type: "L", text: "Seating provided for at least 50% of keys." },
            { code: "2.3.1.12", type: "O", text: "Breakfast, lunch, and dinner available." },
            { code: "2.3.1.14", type: "O", text: "At least Continental breakfast offered." },
        ],
        "Bedroom": [
            { code: "6.1.1.01", type: "L", text: "Minimum 10 rooms." },
            { code: "6.1.1.01", type: "L", text: "Minimum 1 room with disabled facilities (scales with total room count)." },
            { code: "6.1.1.01", type: "L", text: "Minimum room size of 13 sqm (including bathroom)." },
            { code: "6.1.1.01", type: "L", text: "**Bathroom with shower only, minimum 3.5 sqm." },
            { code: "6.1.2.03", type: "L", text: "Individual switches for lighting and in-room A/C controls." },
            { code: "6.1.2.02", type: "L", text: "Each room has an entrance door with spy hole and automatic/secondary locking." },
            { code: "6.2.1.08", type: "O", text: "Double bed size minimum 150cm x 190cm." },
            { code: "6.2.2.10", type: "L", text: "**Wardrobe dimensions at least 60cm deep, with minimum 5 hangers." },
            { code: "6.4.1.15", type: "O", text: "Colour TV, free of charge, with local channels." },
        ],
         "Bathroom": [
            { code: "7.1.1.01", type: "L", text: "En-suite bathroom in each room." },
            { code: "7.1.1.02", type: "L", text: "Shower or shower over bath present." },
            { code: "7.1.1.04", type: "L", text: "Hot and cold water available with strong flow." },
            { code: "7.2.1.06", type: "O", text: "One set of towels per person (1 hand, 1 bath)." },
        ],
    },
    "2-star": {
        "Message": "Data for 2-Star hotels is not available in the provided documents."
    },
    "3-star": {
        "Public Areas": [
            { code: "1.1.2.04", type: "L", text: "Clearly designated lobby / reception area." },
            { code: "1.1.2.04", type: "O", text: "Seating for at least 5% of keys." },
            { code: "1.1.2.09", type: "L", text: "**Main building: If 2 levels or more, guest lift present." },
            { code: "1.1.2.13", type: "L", text: "**1 set of public toilets for gents and ladies near outlets." },
            { code: "1.1.2.14", type: "L", text: "**Prayer area on site (16 sqm min) or a Masjid is available within 500m."}
        ],
        "Food & Beverage": [
             { code: "2.2.1.06", type: "L", text: "**Minimum of 1 restaurant available for all day dining." },
             { code: "2.3.1.13", type: "O", text: "Buffet items are consistently replenished and correctly labelled." },
             { code: "2.4.1.19", type: "O", text: "Food & Beverage room service available from 6am to 11pm."}
        ],
        "Bedroom": [
            { code: "6.1.1.01", type: "L", text: "Minimum 10 rooms." },
            { code: "6.1.1.01", type: "L", text: "Minimum room size of 16 sqm (including bathroom)." },
            { code: "6.1.1.01", type: "L", text: "**Bathroom: 3.8 sqm with tub/shower, 3.5 sqm with shower only." },
            { code: "6.1.2.03", type: "L", text: "Lighting master switch, or power shut off at door (e.g. key card)." },
            { code: "6.2.2.10", type: "L", text: "**Wardrobe dimensions at least: 60cm deep, 30cm wide per person." },
            { code: "6.2.3.12", type: "O", text: "Safety Deposit Box provided in 50% of all bedrooms." },
        ],
        "Bathroom": [
            { code: "7.1.1.02", type: "E", text: "At least 25% of all rooms have a bathtub." },
            { code: "7.1.1.05", type: "L", text: "Conveniently located electric shaver point." },
            { code: "7.2.1.07", type: "O", text: "Individually packaged soap, shower gel, and shampoo provided." },
        ]
    },
    "4-star": {
        "Public Areas": [
            { code: "1.1.1.01", type: "L", text: "Car parking spaces available and approved by Dubai Municipality." },
            { code: "1.1.2.04", type: "E", text: "1 ATM Machine may be available for guest use." },
            { code: "1.1.2.09", type: "L", text: "**Main Building: 2+ levels, guest lift. External Building: 3+ levels, guest lift." },
            { code: "1.1.2.11", type: "L", text: "Separate service/delivery and staff entrances." },
            { code: "4.9.1.13", type: "L", text: "Business centre services or a dedicated facility exists." },
        ],
        "Food & Beverage": [
            { code: "2.2.1.06", type: "L", text: "**At least 2 restaurant facilities available, one with all day dining." },
            { code: "2.2.1.06", type: "L", text: "Seating provided equivalent to not less than 70% of keys." },
            { code: "2.4.1.19", type: "O", text: "Food & Beverage service provided 24 hours." },
            { code: "2.5.1.22", type: "O", text: "Selection of lounge, arm chairs and bar stools available in Bar/Lounge." }
        ],
        "Leisure": [
            { code: "5.1.3.06", type: "L", text: "Gymnasium present." },
            { code: "5.1.6.10", type: "L", text: "Hotel has at least one pool, indoors or outdoors. All pools temperature controlled." },
        ],
        "Bedroom": [
            { code: "6.1.1.01", type: "L", text: "Minimum room size of 22 sqm (including bathroom)." },
            { code: "6.1.1.01", type: "L", text: "**Bathroom: 3.8 sqm with tub/shower, 3.5 sqm with shower only." },
            { code: "6.2.1.08", type: "O", text: "Single Bed size minimum 120cm x 200cm. Double bed size minimum 180cm x 200cm." },
            { code: "6.2.3.11", type: "O", text: "Minibar stocked with snacks and soft beverages." },
            { code: "6.3.1.14", type: "L", text: "At least 3 available sockets for guest use." },
        ],
        "Suite": [
            { code: "8.3.2.01", type: "L", text: "5% of total inventory must be suites (2 separate rooms)." },
            { code: "8.3.2.01", type: "L", text: "**Minimum suite size 42 sqm." }
        ]
    },
    "5-star": {
        "Public Areas": [
            { code: "1.1.2.10", type: "L", text: "**Separate lift for hotel services (luggage, laundry)." },
            { code: "4.7.1.11", type: "O", text: "24 hour concierge service is provided." },
            { code: "4.7.1.11", type: "O", text: "Valet parking service available 24 hours." },
            { code: "4.9.1.17", type: "L", text: "**At least 1 Retail Shop and 1 Gift Shop provided." },
        ],
        "Leisure": [
            { code: "5.1.1.02", type: "L", text: "If Spa exists, minimum of 3 treatment rooms." },
            { code: "5.1.4.07", type: "L", text: "Kids club in a specially built facility." },
            { code: "5.1.6.10", type: "L", text: "At least one certified Lifeguard on duty during stated hours of operation." },
        ],
        "Bedroom": [
            { code: "6.1.1.01", type: "L", text: "Minimum 30 sqm (including bathroom)." },
            { code: "6.1.1.01", type: "L", text: "**Bathroom: Minimum 4.5 sqm." },
            { code: "6.1.2.07", type: "E", text: "Room features include cornices, artwork, artefacts, framed mirrors." },
            { code: "6.2.1.08", type: "O", text: "**Double bed size minimum 200cm x 200cm." },
            { code: "6.2.3.12", type: "O", text: "**Safety Deposit Box Provided to fit 17\" laptop." },
        ],
         "Suite": [
            { code: "8.3.2.01", type: "L", "text": "5% of total inventory must have 2 separate rooms (i.e. separate Lounge divided by a wall)." },
            { code: "8.3.2.01", type: "L", "text": "**Minimum 54 sqm (including Master bedroom and master bathroom, living areas)." },
            { code: "8.3.2.01", type: "L", "text": "Kitchenette / Butlers Pantry provided in highest category suite." }
        ],
        "Housekeeping": [
            { code: "9.1.1.01", type: "O", text: "Room Cleaning service provided daily between 6am-10pm." },
            { code: "9.1.1.01", type: "O", text: "Turn down service provided 6-10pm." },
            { code: "9.1.1.03", type: "O", text: "Same day Laundry & Dry Cleaning service provided 7 days of week." },
            { code: "9.1.1.05", type: "O", text: "24 hour shoe cleaning service available free of charge." },
        ]
    },
    "6-star": {
        "Message": "Data for 6-Star hotels is not available. Please refer to official documentation."
    },
    "7-star": {
        "Message": "Data for 7-Star hotels is not available. Please refer to official documentation."
    }
};


// --- Helper Setup ---


export const PREDEFINED_BLOCKS = {};
AREA_STATEMENT_DATA.forEach(item => {
    const key = `${item.name.replace(/[\s()./]/g, '_')}_${item.w}_${item.h}`;
    PREDEFINED_BLOCKS[key] = {
         key: key, // Add the key to the data object itself for easier lookup
        name: item.name,
        width: parseFloat(item.w),
        height: parseFloat(item.h),
        level: item.level,
        category: item.type,
        role: item.role, // e.g., 'staircase', 'substation'
        tcl: item.tcl, // default TCL for substation
        numTx: item.numTx, // default # of transformers for substation
        projectTypes: item.projectTypes // Keep this property
    };
});
// ******************************************************************
// ***** NEW DATA FOR MARKET RATE CALCULATOR *****
// ******************************************************************

export const DUBAI_LOCATIONS = [
    // Historic Core & North Dubai
    { id: 'al_ras', name: 'Al Ras', lat: 25.2648, lng: 55.2963 },
    { id: 'naif', name: 'Naif', lat: 25.2715, lng: 55.3092 },
    { id: 'al_rigga', name: 'Al Rigga', lat: 25.2683, lng: 55.3207 },
    { id: 'al_muraqqabat', name: 'Al Muraqqabat', lat: 25.2652, lng: 55.3259 },
    { id: 'al_buteen', name: 'Al Buteen', lat: 25.2701, lng: 55.3328 },
    { id: 'abu_hail', name: 'Abu Hail', lat: 25.2753, lng: 55.3419 },
    { id: 'hor_al_anz', name: 'Hor Al Anz', lat: 25.2815, lng: 55.3294 },
    { id: 'al_baraha', name: 'Al Baraha', lat: 25.2768, lng: 55.3197 },
    { id: 'al_murar', name: 'Al Murar', lat: 25.2739, lng: 55.3068 },
    { id: 'port_saeed', name: 'Port Saeed', lat: 25.2567, lng: 55.3408 },
    { id: 'al_hamriya_port', name: 'Al Hamriya Port', lat: 25.2519, lng: 55.3492 },
    { id: 'corniche_deira', name: 'Corniche Deira', lat: 25.2598, lng: 55.3456 },
    { id: 'al_fahidi', name: 'Al Fahidi Historical District', lat: 25.2635, lng: 55.2972 },
    { id: 'al_kifaf', name: 'Al Kifaf', lat: 25.2423, lng: 55.2956 },
    { id: 'shindagha', name: 'Shindagha', lat: 25.2667, lng: 55.2889 },
    
    // Central Business & Luxury Corridor
    { id: 'trade_centre_1', name: 'Trade Centre 1', lat: 25.2269, lng: 55.2886 },
    { id: 'trade_centre_2', name: 'Trade Centre 2', lat: 25.2198, lng: 55.2845 },
    { id: 'al_wasl', name: 'Al Wasl', lat: 25.2145, lng: 55.2578 },
    { id: 'al_badaa', name: 'Al Bada\'a', lat: 25.2189, lng: 55.2639 },
    { id: 'umm_al_sheif', name: 'Umm Al Sheif', lat: 25.1975, lng: 55.2461 },
    
    // Coastal Strip
    { id: 'jumeirah_2', name: 'Jumeirah 2', lat: 25.2215, lng: 55.2467 },
    { id: 'jumeirah_3', name: 'Jumeirah 3', lat: 25.2078, lng: 55.2372 },
    { id: 'jumeirah_bay', name: 'Jumeirah Bay', lat: 25.0842, lng: 55.1392 },
    { id: 'jumeirah_garden', name: 'Jumeirah Garden', lat: 25.0580, lng: 55.2080 },
    { id: 'bulqarees', name: 'Bulqarees', lat: 25.2289, lng: 55.2514 },
    { id: 'sunshine', name: 'Sunshine', lat: 25.2345, lng: 55.2556 },
    { id: 'beach', name: 'Beach', lat: 25.2301, lng: 55.2533 },
    { id: 'islands', name: 'Islands', lat: 25.2278, lng: 55.2500 },
    
    // New Dubai - Marina & Waterfront
    { id: 'the_beach', name: 'The Beach', lat: 25.0772, lng: 55.1314 },
    
    // New Dubai - Lakes & Towers
    { id: 'jumeirah_islands', name: 'Jumeirah Islands', lat: 25.0708, lng: 55.1650 },
    
    // New Dubai - Al Barsha Sector
    { id: 'al_barsha_1', name: 'Al Barsha 1', lat: 25.1189, lng: 55.2061 },
    { id: 'al_barsha_2', name: 'Al Barsha 2', lat: 25.1067, lng: 55.1933 },
    { id: 'al_barsha_3', name: 'Al Barsha 3', lat: 25.0933, lng: 55.1800 },
    { id: 'al_barsha_south', name: 'Al Barsha South', lat: 25.0844, lng: 55.1706 },
    
    // New Dubai - Desert-Leisure Communities
    { id: 'arabian_ranches_3', name: 'Arabian Ranches 3', lat: 25.0350, lng: 55.2900 },
    { id: 'the_springs_2', name: 'The Springs 2', lat: 25.0583, lng: 55.1811 },
    { id: 'the_springs_3', name: 'The Springs 3', lat: 25.0639, lng: 55.1847 },
    { id: 'the_meadows_2', name: 'The Meadows 2', lat: 25.0650, lng: 55.1783 },
    { id: 'the_meadows_3', name: 'The Meadows 3', lat: 25.0678, lng: 55.1806 },
    { id: 'the_lakes_2', name: 'The Lakes 2', lat: 25.0819, lng: 55.1772 },
    { id: 'the_lakes_3', name: 'The Lakes 3', lat: 25.0764, lng: 55.1725 },
    { id: 'hattan', name: 'Hattan', lat: 25.0825, lng: 55.1694 },
    { id: 'mirador', name: 'Mirador', lat: 25.0742, lng: 55.1664 },
    
    // Eastern Suburbs
    { id: 'al_twar_1', name: 'Al Twar 1', lat: 25.2511, lng: 55.4014 },
    { id: 'al_twar_2', name: 'Al Twar 2', lat: 25.2456, lng: 55.3967 },
    { id: 'al_twar_3', name: 'Al Twar 3', lat: 25.2400, lng: 55.3919 },
    { id: 'al_qusais_1', name: 'Al Qusais 1', lat: 25.2850, lng: 55.3789 },
    { id: 'al_qusais_2', name: 'Al Qusais 2', lat: 25.2789, lng: 55.3714 },
    { id: 'al_qusais_3', name: 'Al Qusais 3', lat: 25.2728, lng: 55.3650 },
    { id: 'al_nahda_dubai', name: 'Al Nahda (Dubai)', lat: 25.2939, lng: 55.3681 },
    { id: 'al_muhaisnah_1', name: 'Al Muhaisnah 1', lat: 25.2772, lng: 55.4039 },
    { id: 'al_muhaisnah_2', name: 'Al Muhaisnah 2', lat: 25.2711, lng: 55.3978 },
    { id: 'al_muhaisnah_3', name: 'Al Muhaisnah 3', lat: 25.2650, lng: 55.3917 },
    { id: 'al_muhaisnah_4', name: 'Al Muhaisnah 4', lat: 25.2592, lng: 55.3856 },
    { id: 'umm_ramool', name: 'Umm Ramool', lat: 25.2408, lng: 55.3769 },
    { id: 'riyadh_city', name: 'Riyadh City', lat: 25.2289, lng: 55.4017 },
    
    // North-Eastern Districts
    { id: 'al_warqaa_1', name: 'Al Warqaa 1', lat: 25.2261, lng: 55.4244 },
    { id: 'al_warqaa_2', name: 'Al Warqaa 2', lat: 25.2206, lng: 55.4189 },
    { id: 'al_warqaa_3', name: 'Al Warqaa 3', lat: 25.2150, lng: 55.4133 },
    { id: 'al_warqaa_4', name: 'Al Warqaa 4', lat: 25.2094, lng: 55.4078 },
    { id: 'al_warqaa_5', name: 'Al Warqaa 5', lat: 25.2039, lng: 55.4022 },
    { id: 'nad_al_hammar', name: 'Nad Al Hammar', lat: 25.1933, lng: 55.4350 },
    { id: 'al_khawaneej_1', name: 'Al Khawaneej 1', lat: 25.1889, lng: 55.4639 },
    { id: 'al_khawaneej_2', name: 'Al Khawaneej 2', lat: 25.1833, lng: 55.4583 },
    { id: 'warsan', name: 'Warsan', lat: 25.1739, lng: 55.4450 },
    { id: 'al_aweer', name: 'Al Aweer', lat: 25.1567, lng: 55.4667 },
    { id: 'al_mizhar', name: 'Al Mizhar', lat: 25.2611, lng: 55.4250 },
    { id: 'nad_al_sheba_1', name: 'Nad Al Sheba 1', lat: 25.1556, lng: 55.3611 },
    { id: 'nad_al_sheba_2', name: 'Nad Al Sheba 2', lat: 25.1489, lng: 55.3556 },
    { id: 'nad_al_sheba_3', name: 'Nad Al Sheba 3', lat: 25.1422, lng: 55.3500 },
    { id: 'nad_al_sheba_4', name: 'Nad Al Sheba 4', lat: 25.1356, lng: 55.3444 },
    
    // Industrial & Logistics Hubs
    { id: 'al_quoz_industrial_1', name: 'Al Quoz Industrial Area 1', lat: 25.1467, lng: 55.2411 },
    { id: 'al_quoz_industrial_2', name: 'Al Quoz Industrial Area 2', lat: 25.1400, lng: 55.2333 },
    { id: 'al_quoz_industrial_3', name: 'Al Quoz Industrial Area 3', lat: 25.1333, lng: 55.2256 },
    { id: 'al_quoz_industrial_4', name: 'Al Quoz Industrial Area 4', lat: 25.1267, lng: 55.2178 },
    { id: 'al_quoz_creative_zone', name: 'Al Quoz Creative Zone', lat: 25.1361, lng: 55.2139 },
    { id: 'ras_al_khor_industrial', name: 'Ras Al Khor Industrial Area', lat: 25.1800, lng: 55.3689 },
    { id: 'jebel_ali_industrial', name: 'Jebel Ali Industrial Area', lat: 24.9897, lng: 55.1235 },
    
    // Knowledge & Innovation Corridors
    { id: 'dubai_science_park', name: 'Dubai Science Park', lat: 25.0917, lng: 55.3667 },
    { id: 'dubai_production_city', name: 'Dubai Production City (IMPZ)', lat: 25.0567, lng: 55.2333 },
    { id: 'dubai_biotechnology_park', name: 'Dubai Biotechnology Park', lat: 25.0850, lng: 55.3750 },
    
    // TECOM Business Parks
    { id: 'dubai_internet_city', name: 'Dubai Internet City', lat: 25.1000, lng: 55.1667 },
    { id: 'dubai_media_city', name: 'Dubai Media City', lat: 25.0917, lng: 55.1583 },
    { id: 'dubai_studio_city', name: 'Dubai Studio City', lat: 25.0769, lng: 55.3250 },
    { id: 'dubai_knowledge_park', name: 'Dubai Knowledge Park', lat: 25.0833, lng: 55.1750 },
    { id: 'dubai_international_academic_city', name: 'Dubai International Academic City', lat: 25.1115, lng: 55.4116 },
    { id: 'dubai_outsource_city', name: 'Dubai Outsource City', lat: 25.0683, lng: 55.2417 },
    
    // Mega Development Zones & Future Cities
    { id: 'district_one', name: 'District One', lat: 25.1350, lng: 55.2900 },
    { id: 'sobha_hartland', name: 'Sobha Hartland', lat: 25.1289, lng: 55.2833 },
    { id: 'the_gardens_mbr', name: 'The Gardens (MBR City)', lat: 25.1233, lng: 55.2767 },
    { id: 'the_fields', name: 'The Fields', lat: 25.1178, lng: 55.2700 },
    { id: 'the_sustainable_city', name: 'The Sustainable City', lat: 25.0589, lng: 55.3000 },
    { id: 'expo_city_dubai', name: 'Expo City Dubai', lat: 24.9333, lng: 55.1667 },
    { id: 'the_lagoons', name: 'The Lagoons', lat: 25.2100, lng: 55.3470 },
    
    // Dubai Land Sub-communities
    { id: 'legoland_dubai', name: 'Legoland Dubai', lat: 24.9500, lng: 55.1833 },
    { id: 'riverland_dubai', name: 'Riverland Dubai', lat: 24.9550, lng: 55.1883 },
    { id: 'six_flags_dubai', name: 'Six Flags Dubai', lat: 24.9600, lng: 55.1933 },
    
    // Palm Jumeirah Sub-areas
    { id: 'palm_trunk', name: 'Palm Jumeirah Trunk', lat: 25.1189, lng: 55.1393 },
    { id: 'palm_fronds', name: 'Palm Jumeirah Fronds', lat: 25.1250, lng: 55.1450 },
    { id: 'palm_crescent', name: 'Palm Jumeirah Crescent', lat: 25.1311, lng: 55.1506 },
    
    // Special Economic Zones & Key Areas
    { id: 'dubai_healthcare_city', name: 'Dubai Healthcare City', lat: 25.2306, lng: 55.3239 },
    { id: 'dubai_multi_commodities_centre', name: 'Dubai Multi Commodities Centre', lat: 25.0664, lng: 55.1413 },
    { id: 'dubai_gold_diamond_park', name: 'Dubai Gold & Diamond Park', lat: 25.1156, lng: 55.2000 },
    { id: 'dubai_textile_city', name: 'Dubai Textile City', lat: 25.2800, lng: 55.3500 },
    
    // Free Zones
    { id: 'jebel_ali_free_zone', name: 'Jebel Ali Free Zone (JAFZA)', lat: 24.9800, lng: 55.1167 },
    { id: 'dubai_airport_freezone', name: 'Dubai Airport Freezone (DAFZA)', lat: 25.2500, lng: 55.3667 },
    { id: 'dubai_world_trade_centre_freezone', name: 'Dubai World Trade Centre Free Zone', lat: 25.2267, lng: 55.2889 },
    
    // Wadi Al Safa Area
    { id: 'wadi_al_safa_1', name: 'Wadi Al Safa 1', lat: 25.0500, lng: 55.3200 },
    { id: 'wadi_al_safa_2', name: 'Wadi Al Safa 2', lat: 25.0450, lng: 55.3300 },
    { id: 'wadi_al_safa_3', name: 'Wadi Al Safa 3', lat: 25.0400, lng: 55.3400 },
    { id: 'wadi_al_safa_4', name: 'Wadi Al Safa 4', lat: 25.0350, lng: 55.3500 },
    { id: 'wadi_al_safa_5', name: 'Wadi Al Safa 5', lat: 25.0300, lng: 55.3600 },
    
    // Additional Notable Areas
    { id: 'al_jaffiliya', name: 'Al Jaffiliya', lat: 25.2350, lng: 55.2900 },
    { id: 'al_sofouh', name: 'Al Sofouh', lat: 25.1083, lng: 55.1750 },
    { id: 'al_manara', name: 'Al Manara', lat: 25.2000, lng: 55.2583 },
    { id: 'al_safa', name: 'Al Safa', lat: 25.2083, lng: 55.2500 },
    { id: 'al_hudaiba', name: 'Al Hudaiba', lat: 25.2400, lng: 55.2800 },
    { id: 'al_mankhool', name: 'Al Mankhool', lat: 25.2500, lng: 55.2950 },
    { id: 'al_raffa', name: 'Al Raffa', lat: 25.2650, lng: 55.3100 },
    { id: 'al_sabkha', name: 'Al Sabkha', lat: 25.2700, lng: 55.3050 },
    { id: 'al_waheda', name: 'Al Waheda', lat: 25.2750, lng: 55.3350 },
    { id: 'al_qouz', name: 'Al Qouz', lat: 25.1450, lng: 55.2200 },
    { id: 'al_yalayis', name: 'Al Yalayis', lat: 24.9700, lng: 55.0800 },
    { id: 'al_ghusais', name: 'Al Ghusais', lat: 25.2850, lng: 55.3850 },
    { id: 'al_rasheed', name: 'Al Rasheed', lat: 25.2900, lng: 55.3900 },
    { id: 'al_tay', name: 'Al Tay', lat: 25.2950, lng: 55.3950 },
    { id: 'al_wahaida', name: 'Al Wahaida', lat: 25.3000, lng: 55.4000 },
    { id: 'al_kheeran', name: 'Al Kheeran', lat: 25.3050, lng: 55.4050 },
    { id: 'al_awir', name: 'Al Awir', lat: 25.1600, lng: 55.4700 },
    { id: 'al_lehbab', name: 'Al Lehbab', lat: 24.8500, lng: 55.6000 },
    { id: 'al_lisaili', name: 'Al Lisaili', lat: 24.9000, lng: 55.5500 },
    { id: 'al_marmoom', name: 'Al Marmoom', lat: 24.9500, lng: 55.5000 },
    { id: 'al_quaa', name: 'Al Quaa', lat: 24.8000, lng: 55.7000 },
    { id: 'al_shiweib', name: 'Al Shiweib', lat: 24.7500, lng: 55.8000 },
    
    // The World Islands
    { id: 'the_world_islands', name: 'The World Islands', lat: 25.2333, lng: 55.1667 },
    
    // Deira Islands
    { id: 'deira_islands', name: 'Deira Islands', lat: 25.3000, lng: 55.3667 },
    
    // Dubai Square
    { id: 'dubai_square', name: 'Dubai Square', lat: 25.2100, lng: 55.3470 },
    
    // Al Habtoor City
    { id: 'al_habtoor_city', name: 'Al Habtoor City', lat: 25.0800, lng: 55.1450 },
    
    // Dubai Residence Complex
    { id: 'dubai_residence_complex', name: 'Dubai Residence Complex', lat: 24.9200, lng: 55.1500 },
    
    // Akoya Oxygen
    { id: 'akoya_oxygen', name: 'Akoya Oxygen', lat: 25.0200, lng: 55.4000 },
    
    // Liwan
    { id: 'liwan', name: 'Liwan', lat: 25.0050, lng: 55.3500 },
    
    // Jumeirah Golf Estates Sub-communities
    { id: 'jge_fire', name: 'JGE Fire', lat: 25.0350, lng: 55.2150 },
    { id: 'jge_earth', name: 'JGE Earth', lat: 25.0300, lng: 55.2100 },
    { id: 'jge_water', name: 'JGE Water', lat: 25.0250, lng: 55.2050 },
    { id: 'jge_wind', name: 'JGE Wind', lat: 25.0200, lng: 55.2000 },
    
    // Jumeirah Village Circle Clusters
    { id: 'jvc_cluster_a', name: 'JVC Cluster A', lat: 25.0580, lng: 55.2080 },
    { id: 'jvc_cluster_b', name: 'JVC Cluster B', lat: 25.0530, lng: 55.2030 },
    { id: 'jvc_cluster_c', name: 'JVC Cluster C', lat: 25.0480, lng: 55.1980 },
    { id: 'jvc_cluster_d', name: 'JVC Cluster D', lat: 25.0430, lng: 55.1930 },
    { id: 'jvc_cluster_e', name: 'JVC Cluster E', lat: 25.0380, lng: 55.1880 },
    { id: 'jvc_cluster_f', name: 'JVC Cluster F', lat: 25.0330, lng: 55.1830 },
    { id: 'jvc_cluster_g', name: 'JVC Cluster G', lat: 25.0280, lng: 55.1780 },
    { id: 'jvc_cluster_h', name: 'JVC Cluster H', lat: 25.0230, lng: 55.1730 },
    { id: 'jvc_cluster_i', name: 'JVC Cluster I', lat: 25.0180, lng: 55.1680 },
    { id: 'jvc_cluster_j', name: 'JVC Cluster J', lat: 25.0130, lng: 55.1630 },
    { id: 'jvc_cluster_k', name: 'JVC Cluster K', lat: 25.0080, lng: 55.1580 },
    { id: 'jvc_cluster_l', name: 'JVC Cluster L', lat: 25.0030, lng: 55.1530 },
    { id: 'jvc_cluster_m', name: 'JVC Cluster M', lat: 24.9980, lng: 55.1480 },
    { id: 'jvc_cluster_n', name: 'JVC Cluster N', lat: 24.9930, lng: 55.1430 },
    { id: 'jvc_cluster_o', name: 'JVC Cluster O', lat: 24.9880, lng: 55.1380 },
    { id: 'jvc_cluster_p', name: 'JVC Cluster P', lat: 24.9830, lng: 55.1330 },
    { id: 'jvc_cluster_q', name: 'JVC Cluster Q', lat: 24.9780, lng: 55.1280 },
    { id: 'jvc_cluster_r', name: 'JVC Cluster R', lat: 24.9730, lng: 55.1230 },
    { id: 'jvc_cluster_s', name: 'JVC Cluster S', lat: 24.9680, lng: 55.1180 },
    { id: 'jvc_cluster_t', name: 'JVC Cluster T', lat: 24.9630, lng: 55.1130 },
    { id: 'jvc_cluster_u', name: 'JVC Cluster U', lat: 24.9580, lng: 55.1080 },
    { id: 'jvc_cluster_v', name: 'JVC Cluster V', lat: 24.9530, lng: 55.1030 },
    { id: 'jvc_cluster_w', name: 'JVC Cluster W', lat: 24.9480, lng: 55.0980 },
    { id: 'jvc_cluster_x', name: 'JVC Cluster X', lat: 24.9430, lng: 55.0930 },
    { id: 'jvc_cluster_y', name: 'JVC Cluster Y', lat: 24.9380, lng: 55.0880 },
    { id: 'jvc_cluster_z', name: 'JVC Cluster Z', lat: 24.9330, lng: 55.0830 },
    
    // Dubai Hills Estate Communities
    { id: 'dhe_golf_apartments', name: 'DHE Golf Apartments', lat: 25.1169, lng: 55.2667 },
    { id: 'dhe_golf_villas', name: 'DHE Golf Villas', lat: 25.1119, lng: 55.2618 },
    { id: 'dhe_park_views', name: 'DHE Park Views', lat: 25.1069, lng: 55.2569 },
    { id: 'dhe_apartments', name: 'DHE Apartments', lat: 25.1019, lng: 55.2520 },
    { id: 'dhe_townhouses', name: 'DHE Townhouses', lat: 25.0969, lng: 55.2471 },
    { id: 'dhe_villas', name: 'DHE Villas', lat: 25.0919, lng: 55.2422 },
    
    // Mohammed Bin Rashid City (MBR City) Communities
    { id: 'mbr_city_district_1', name: 'MBR City District 1', lat: 25.1350, lng: 55.2900 },
    { id: 'mbr_city_district_2', name: 'MBR City District 2', lat: 25.1300, lng: 55.2850 },
    { id: 'mbr_city_district_3', name: 'MBR City District 3', lat: 25.1250, lng: 55.2800 },
    { id: 'mbr_city_district_4', name: 'MBR City District 4', lat: 25.1200, lng: 55.2750 },
    { id: 'mbr_city_district_5', name: 'MBR City District 5', lat: 25.1150, lng: 55.2700 },
    { id: 'mbr_city_district_6', name: 'MBR City District 6', lat: 25.1100, lng: 55.2650 },
    { id: 'mbr_city_district_7', name: 'MBR City District 7', lat: 25.1050, lng: 55.2600 },
    { id: 'mbr_city_district_8', name: 'MBR City District 8', lat: 25.1000, lng: 55.2550 },
    { id: 'mbr_city_district_9', name: 'MBR City District 9', lat: 25.0950, lng: 55.2500 },
    { id: 'mbr_city_district_10', name: 'MBR City District 10', lat: 25.0900, lng: 55.2450 },
    { id: 'mbr_city_district_11', name: 'MBR City District 11', lat: 25.0850, lng: 55.2400 },
    { id: 'mbr_city_district_12', name: 'MBR City District 12', lat: 25.0800, lng: 55.2350 },
    { id: 'mbr_city_district_13', name: 'MBR City District 13', lat: 25.0750, lng: 55.2300 },
    { id: 'mbr_city_district_14', name: 'MBR City District 14', lat: 25.0700, lng: 55.2250 },
    { id: 'mbr_city_district_15', name: 'MBR City District 15', lat: 25.0650, lng: 55.2200 },
    { id: 'mbr_city_district_16', name: 'MBR City District 16', lat: 25.0600, lng: 55.2150 },
    { id: 'mbr_city_district_17', name: 'MBR City District 17', lat: 25.0550, lng: 55.2100 },
    { id: 'mbr_city_district_18', name: 'MBR City District 18', lat: 25.0500, lng: 55.2050 },
    { id: 'mbr_city_district_19', name: 'MBR City District 19', lat: 25.0450, lng: 55.2000 },
    { id: 'mbr_city_district_20', name: 'MBR City District 20', lat: 25.0400, lng: 55.1950 },
    
    // Al Khawaneej Walk
    { id: 'al_khawaneej_walk', name: 'Al Khawaneej Walk', lat: 25.1833, lng: 55.4639 },
    
    // Umm Suqeim Areas
    { id: 'umm_suqeim_1', name: 'Umm Suqeim 1', lat: 25.1583, lng: 55.2078 },
    { id: 'umm_suqeim_2', name: 'Umm Suqeim 2', lat: 25.1533, lng: 55.2022 },
    { id: 'umm_suqeim_3', name: 'Umm Suqeim 3', lat: 25.1483, lng: 55.1967 },
    
    // Original list entries (kept for compatibility)
    { id: 'al_barari', name: 'Al Barari', lat: 25.0934, lng: 55.3341 },
    { id: 'al_barsha', name: 'Al Barsha', lat: 25.1165, lng: 55.2069 },
    { id: 'al_furjan', name: 'Al Furjan', lat: 25.0311, lng: 55.1506 },
    { id: 'al_garhoud', name: 'Al Garhoud', lat: 25.2458, lng: 55.3456 },
    { id: 'al_jaddaf', name: 'Al Jaddaf', lat: 25.2227, lng: 55.3318 },
    { id: 'al_karama', name: 'Al Karama', lat: 25.2471, lng: 55.3055 },
    { id: 'al_satwa', name: 'Al Satwa', lat: 25.2155, lng: 55.2709 },
    { id: 'arabian_ranches', name: 'Arabian Ranches', lat: 25.0503, lng: 55.2526 },
    { id: 'arabian_ranches_2', name: 'Arabian Ranches 2', lat: 25.0431, lng: 55.2758 },
    { id: 'arjan', name: 'Arjan', lat: 25.0682, lng: 55.2250 },
    { id: 'barsha_heights', name: 'Barsha Heights (TECOM)', lat: 25.0945, lng: 55.1735 },
    { id: 'bluewaters', name: 'Bluewaters Island', lat: 25.0805, lng: 55.1235 },
    { id: 'bur_dubai', name: 'Bur Dubai', lat: 25.2593, lng: 55.2974 },
    { id: 'business_bay', name: 'Business Bay', lat: 25.1852, lng: 55.2676 },
    { id: 'city_walk', name: 'City Walk', lat: 25.2078, lng: 55.2644 },
    { id: 'damac_hills', name: 'DAMAC Hills', lat: 25.0450, lng: 55.2442 },
    { id: 'damac_hills_2', name: 'DAMAC Hills 2', lat: 25.0401, lng: 55.4217 },
    { id: 'deira', name: 'Deira', lat: 25.2631, lng: 55.3377 },
    { id: 'difc', name: 'DIFC', lat: 25.2131, lng: 55.2818 },
    { id: 'discovery_gardens', name: 'Discovery Gardens', lat: 25.0416, lng: 55.1408 },
    { id: 'downtown_dubai', name: 'Downtown Dubai', lat: 25.1972, lng: 55.2744 },
    { id: 'dubai_creek_harbour', name: 'Dubai Creek Harbour', lat: 25.2100, lng: 55.3470 },
    { id: 'dubai_hills_estate', name: 'Dubai Hills Estate', lat: 25.1119, lng: 55.2618 },
    { id: 'dubai_investment_park', name: 'Dubai Investment Park (DIP)', lat: 24.9818, lng: 55.1923 },
    { id: 'dubai_marina', name: 'Dubai Marina', lat: 25.0783, lng: 55.1399 },
    { id: 'dubai_silicon_oasis', name: 'Dubai Silicon Oasis', lat: 25.1215, lng: 55.3884 },
    { id: 'dubai_south', name: 'Dubai South', lat: 24.9123, lng: 55.2023 },
    { id: 'dubai_sports_city', name: 'Dubai Sports City', lat: 25.0503, lng: 55.2205 },
    { id: 'emaar_beachfront', name: 'Emaar Beachfront', lat: 25.0933, lng: 55.1481 },
    { id: 'emirates_hills', name: 'Emirates Hills', lat: 25.0772, lng: 55.1819 },
    { id: 'international_city', name: 'International City', lat: 25.1685, lng: 55.4093 },
    { id: 'jbr', name: 'Jumeirah Beach Residence (JBR)', lat: 25.0768, lng: 55.1328 },
    { id: 'jge', name: 'Jumeirah Golf Estates (JGE)', lat: 25.0305, lng: 55.2118 },
    { id: 'jlt', name: 'Jumeirah Lake Towers (JLT)', lat: 25.0664, lng: 55.1413 },
    { id: 'jumeirah_1', name: 'Jumeirah 1', lat: 25.2312, lng: 55.2589 },
    { id: 'jvc', name: 'Jumeirah Village Circle (JVC)', lat: 25.0531, lng: 55.2038 },
    { id: 'jvt', name: 'Jumeirah Village Triangle (JVT)', lat: 25.0518, lng: 55.1834 },
    { id: 'meydan_city', name: 'Meydan City', lat: 25.1667, lng: 55.3000 },
    { id: 'mira', name: 'Mira', lat: 25.0117, lng: 55.2936 },
    { id: 'mirdif', name: 'Mirdif', lat: 25.2136, lng: 55.4192 },
    { id: 'motor_city', name: 'Motor City', lat: 25.0505, lng: 55.2393 },
    { id: 'mudon', name: 'Mudon', lat: 25.0342, lng: 55.2639 },
    { id: 'oud_metha', name: 'Oud Metha', lat: 25.2378, lng: 55.3134 },
    { id: 'palm_jumeirah', name: 'Palm Jumeirah', lat: 25.1189, lng: 55.1393 },
    { id: 'al_quoz', name: 'Al Quoz (Industrial/Warehouse)', lat: 25.1389, lng: 55.2286 },
    { id: 'dip', name: 'Dubai Investment Park (DIP)', lat: 24.9818, lng: 55.1923 },
    { id: 'jebel_ali', name: 'Jebel Ali (Industrial/Camp)', lat: 24.9897, lng: 55.1235 },
    { id: 'nad_al_sheba', name: 'Nad Al Sheba (School/Residential)', lat: 25.1333, lng: 55.3500 },
    { id: 'dubai_academic_city', name: 'Dubai Academic City (School)', lat: 25.1115, lng: 55.4116 },
    { id: 'port_de_la_mer', name: 'Port de La Mer', lat: 25.2536, lng: 55.2655 },
    { id: 'ras_al_khor', name: 'Ras Al Khor', lat: 25.1900, lng: 55.3567 },
    { id: 'remraam', name: 'Remraam', lat: 25.0210, lng: 55.2345 },
    { id: 'the_greens', name: 'The Greens', lat: 25.0883, lng: 55.1764 },
    { id: 'the_lakes', name: 'The Lakes', lat: 25.0792, lng: 55.1747 },
    { id: 'the_meadows', name: 'The Meadows', lat: 25.0617, lng: 55.1736 },
    { id: 'the_springs', name: 'The Springs', lat: 25.0569, lng: 55.1764 },
    { id: 'the_villa', name: 'The Villa', lat: 25.1053, lng: 55.3533 },
    { id: 'town_square', name: 'Town Square', lat: 25.0069, lng: 55.2789 },
    { id: 'umm_suqeim', name: 'Umm Suqeim', lat: 25.1583, lng: 55.2078 },
    { id: 'villanova', name: 'Villanova', lat: 25.0526, lng: 55.3341 },
    { id: 'world_trade_centre', name: 'World Trade Centre', lat: 25.2267, lng: 55.2889 },
    { id: 'dubai_industrial_city', name: 'Dubai Industrial City', lat: 24.8785, lng: 55.0854 },

    // ========== NEW PREMIUM DEVELOPMENTS ADDED HERE ==========
    
    // Premium Waterfront & Island Developments
    { id: 'cavalli_tower', name: 'Cavalli Tower', lat: 25.0900, lng: 55.1475 },
    { id: 'six_senses_residences', name: 'Six Senses Residences', lat: 25.0830, lng: 55.1400 },
    { id: 'bulgari_residences', name: 'Bulgari Residences', lat: 25.0955, lng: 55.1505 },
    { id: 'marsa_al_arab', name: 'Marsa Al Arab', lat: 25.0867, lng: 55.1367 },
    { id: 'jumeirah_living_marina_gate', name: 'Jumeirah Living Marina Gate', lat: 25.0825, lng: 55.1425 },
    { id: 'st_regis_dubai', name: 'St. Regis Dubai', lat: 25.0875, lng: 55.1450 },
    { id: 'dorchester_collection_dubai', name: 'Dorchester Collection Dubai', lat: 25.0920, lng: 55.1480 },
    { id: 'dubai_islands', name: 'Dubai Islands (formerly Deira Islands)', lat: 25.3000, lng: 55.3667 },
    { id: 'pearl_island', name: 'Pearl Island (Dubai Islands)', lat: 25.3050, lng: 55.3700 },
    { id: 'dubai_island_beach', name: 'Dubai Island Beach', lat: 25.3100, lng: 55.3750 },
    { id: 'central_dubai_island', name: 'Central Dubai Island', lat: 25.3150, lng: 55.3800 },
    { id: 'south_dubai_island', name: 'South Dubai Island', lat: 25.3200, lng: 55.3850 },

    // Mohammed Bin Rashid City Expansions
    { id: 'wadi_residences', name: 'Wadi Residences', lat: 25.1305, lng: 55.2855 },
    { id: 'urban_oasis', name: 'Urban Oasis', lat: 25.1280, lng: 55.2820 },
    { id: 'creek_waters', name: 'Creek Waters', lat: 25.1255, lng: 55.2795 },
    { id: 'mbr_city_park_views', name: 'MBR City Park Views', lat: 25.1230, lng: 55.2770 },
    { id: 'mbr_creek_views', name: 'MBR Creek Views', lat: 25.1205, lng: 55.2745 },
    { id: 'mbr_gateway', name: 'MBR Gateway', lat: 25.1180, lng: 55.2720 },

    // Palm Jumeirah New Projects
    { id: 'palm_beach_towers', name: 'Palm Beach Towers', lat: 25.1165, lng: 55.1365 },
    { id: 'palm_360', name: 'Palm 360', lat: 25.1140, lng: 55.1340 },
    { id: 'palm_vista', name: 'Palm Vista', lat: 25.1115, lng: 55.1315 },
    { id: 'palm_grandeur', name: 'Palm Grandeur', lat: 25.1090, lng: 55.1290 },
    { id: 'palm_estates', name: 'Palm Estates', lat: 25.1065, lng: 55.1265 },

    // Dubai Creek Harbour Premium
    { id: 'creek_beach', name: 'Creek Beach', lat: 25.2125, lng: 55.3495 },
    { id: 'creek_beach_residences', name: 'Creek Beach Residences', lat: 25.2150, lng: 55.3520 },
    { id: 'creek_beach_grand', name: 'Creek Beach Grand', lat: 25.2175, lng: 55.3545 },
    { id: 'the_creek_penthouses', name: 'The Creek Penthouses', lat: 25.2200, lng: 55.3570 },
    { id: 'creek_edge', name: 'Creek Edge', lat: 25.2225, lng: 55.3595 },

    // Dubai Hills Estate Premium
    { id: 'dhe_grand_views', name: 'DHE Grand Views', lat: 25.1149, lng: 55.2667 },
    { id: 'dhe_signature_villas', name: 'DHE Signature Villas', lat: 25.1129, lng: 55.2647 },
    { id: 'dhe_golf_mansions', name: 'DHE Golf Mansions', lat: 25.1109, lng: 55.2627 },
    { id: 'dhe_park_mansions', name: 'DHE Park Mansions', lat: 25.1089, lng: 55.2607 },
    { id: 'dhe_royal_estate', name: 'DHE Royal Estate', lat: 25.1069, lng: 55.2587 },

    // Downtown Dubai New Premium
    { id: 'downtown_views_ii', name: 'Downtown Views II', lat: 25.2002, lng: 55.2794 },
    { id: 'burj_vista', name: 'Burj Vista', lat: 25.1982, lng: 55.2774 },
    { id: 'downtown_place', name: 'Downtown Place', lat: 25.1962, lng: 55.2754 },
    { id: 'opera_grand', name: 'Opera Grand', lat: 25.1942, lng: 55.2734 },
    { id: 'downtown_creek', name: 'Downtown Creek', lat: 25.1922, lng: 55.2714 },

    // Jumeirah New Premium
    { id: 'jumeirah_estates', name: 'Jumeirah Estates', lat: 25.2350, lng: 55.2620 },
    { id: 'jumeirah_bay_island', name: 'Jumeirah Bay Island', lat: 25.2380, lng: 55.2650 },
    { id: 'jumeirah_grand', name: 'Jumeirah Grand', lat: 25.2410, lng: 55.2680 },
    { id: 'jumeirah_park_estate', name: 'Jumeirah Park Estate', lat: 25.2440, lng: 55.2710 },

    // Business Bay Premium
    { id: 'business_bay_plus', name: 'Business Bay Plus', lat: 25.1882, lng: 55.2726 },
    { id: 'bay_square', name: 'Bay Square', lat: 25.1912, lng: 55.2756 },
    { id: 'bay_gate', name: 'Bay Gate', lat: 25.1942, lng: 55.2786 },
    { id: 'business_bay_towers', name: 'Business Bay Towers', lat: 25.1972, lng: 55.2816 },

    // Ultra-Luxury Developments
    { id: 'palm_flora', name: 'Palm Flora', lat: 25.1035, lng: 55.1235 },
    { id: 'creek_royale', name: 'Creek Royale', lat: 25.2250, lng: 55.3620 },
    { id: 'emirates_hills_estates', name: 'Emirates Hills Estates', lat: 25.0822, lng: 55.1869 },
    { id: 'al_barari_royal', name: 'Al Barari Royal', lat: 25.0984, lng: 55.3391 },
    { id: 'nad_al_sheba_gardens', name: 'Nad Al Sheba Gardens', lat: 25.1383, lng: 55.3550 },
    { id: 'meydan_heights', name: 'Meydan Heights', lat: 25.1717, lng: 55.3050 },

    // Waterfront Mansions
    { id: 'palm_mansion', name: 'Palm Mansion', lat: 25.1010, lng: 55.1210 },
    { id: 'marina_mansion', name: 'Marina Mansion', lat: 25.0793, lng: 55.1449 },
    { id: 'creek_mansion', name: 'Creek Mansion', lat: 25.2280, lng: 55.3650 },
    { id: 'jumeirah_mansion', name: 'Jumeirah Mansion', lat: 25.2470, lng: 55.2750 },

    // New Community Developments
    { id: 'dubai_south_residences', name: 'Dubai South Residences', lat: 24.9153, lng: 55.2073 },
    { id: 'south_bay', name: 'South Bay', lat: 24.9183, lng: 55.2103 },
    { id: 'expo_village', name: 'Expo Village', lat: 24.9213, lng: 55.2133 },
    { id: 'south_estates', name: 'South Estates', lat: 24.9243, lng: 55.2163 },

    // Town Square New Phases
    { id: 'town_square_residences', name: 'Town Square Residences', lat: 25.0099, lng: 55.2839 },
    { id: 'town_square_villas', name: 'Town Square Villas', lat: 25.0129, lng: 55.2869 },
    { id: 'town_square_gardens', name: 'Town Square Gardens', lat: 25.0159, lng: 55.2899 },
    { id: 'town_square_park', name: 'Town Square Park', lat: 25.0189, lng: 55.2929 },

    // Mira Community Expansions
    { id: 'mira_oasis', name: 'Mira Oasis', lat: 25.0147, lng: 55.2986 },
    { id: 'mira_gardens', name: 'Mira Gardens', lat: 25.0177, lng: 55.3016 },
    { id: 'mira_park', name: 'Mira Park', lat: 25.0207, lng: 55.3046 },
    { id: 'mira_residences', name: 'Mira Residences', lat: 25.0237, lng: 55.3076 },

    // Al Furjan New Phases
    { id: 'al_furjan_gardens', name: 'Al Furjan Gardens', lat: 25.0341, lng: 55.1556 },
    { id: 'al_furjan_residences', name: 'Al Furjan Residences', lat: 25.0371, lng: 55.1586 },
    { id: 'al_furjan_villas', name: 'Al Furjan Villas', lat: 25.0401, lng: 55.1616 },
    { id: 'al_furjan_park', name: 'Al Furjan Park', lat: 25.0431, lng: 55.1646 },

    // Dubai Silicon Oasis New
    { id: 'dso_residences', name: 'DSO Residences', lat: 25.1245, lng: 55.3934 },
    { id: 'dso_gardens', name: 'DSO Gardens', lat: 25.1275, lng: 55.3964 },
    { id: 'dso_park', name: 'DSO Park', lat: 25.1305, lng: 55.3994 },
    { id: 'dso_villas', name: 'DSO Villas', lat: 25.1335, lng: 55.4024 },

    // Lifestyle & Mixed-Use Developments
    { id: 'd3_residences', name: 'D3 Residences', lat: 25.2350, lng: 55.3350 },
    { id: 'd3_creative_hub', name: 'D3 Creative Hub', lat: 25.2380, lng: 55.3380 },
    { id: 'd3_art_villas', name: 'D3 Art Villas', lat: 25.2410, lng: 55.3410 },
    { id: 'd3_design_residences', name: 'D3 Design Residences', lat: 25.2440, lng: 55.3440 },

    // Dubai Healthcare City Phase 2
    { id: 'dhcc_residences', name: 'DHCC Residences', lat: 25.2336, lng: 55.3289 },
    { id: 'dhcc_medical_towers', name: 'DHCC Medical Towers', lat: 25.2366, lng: 55.3319 },
    { id: 'dhcc_wellness_villas', name: 'DHCC Wellness Villas', lat: 25.2396, lng: 55.3349 },

    // Academic City New
    { id: 'academic_city_residences', name: 'Academic City Residences', lat: 25.1145, lng: 55.4166 },
    { id: 'student_city', name: 'Student City', lat: 25.1175, lng: 55.4196 },
    { id: 'campus_villas', name: 'Campus Villas', lat: 25.1205, lng: 55.4226 },

    // Dubai Hills Mall Area
    { id: 'dubai_hills_mall_residences', name: 'Dubai Hills Mall Residences', lat: 25.1049, lng: 55.2567 },
    { id: 'mall_view_villas', name: 'Mall View Villas', lat: 25.1079, lng: 55.2597 },
    { id: 'hills_mall_towers', name: 'Hills Mall Towers', lat: 25.1109, lng: 55.2627 },

    // Upcoming Mega Projects
    { id: 'dubai_urban_tech', name: 'Dubai Urban Tech District', lat: 25.1500, lng: 55.2500 },
    { id: 'al_jaddaf_waterfront', name: 'Al Jaddaf Waterfront', lat: 25.2257, lng: 55.3368 },
    { id: 'jaddaf_marina', name: 'Jaddaf Marina', lat: 25.2287, lng: 55.3398 },
    { id: 'dubai_square_mall', name: 'Dubai Square Mall', lat: 25.2130, lng: 55.3500 },
    { id: 'dubai_rainforest', name: 'Dubai Rainforest', lat: 25.1600, lng: 55.2800 },
    { id: 'the_universe_islands', name: 'The Universe Islands', lat: 25.1900, lng: 55.1200 },

    // Premium Hotel Residences
    { id: 'onezabeel', name: 'One&Only Zabeel', lat: 25.2080, lng: 55.2700 },
    { id: 'versace_dubai', name: 'Versace Dubai Residences', lat: 25.2050, lng: 55.2670 },
    { id: 'arni_dubai', name: 'Armani Dubai Residences', lat: 25.1975, lng: 55.2745 },
    { id: 'fendi_dubai', name: 'Fendi Dubai Residences', lat: 25.1950, lng: 55.2720 },
    { id: 'gucci_dubai', name: 'Gucci Dubai Residences', lat: 25.1925, lng: 55.2695 },
    { id: 'prada_dubai', name: 'Prada Dubai Residences', lat: 25.1900, lng: 55.2670 },

    // Missing Premium Golf Communities
    { id: 'dhe_golf_course_villas', name: 'DHE Golf Course Villas', lat: 25.1139, lng: 55.2648 },
    { id: 'emirates_golf_villas', name: 'Emirates Golf Villas', lat: 25.0742, lng: 55.1849 },
    { id: 'address_golf_residences', name: 'Address Golf Residences', lat: 25.0680, lng: 55.2150 },
    { id: 'montgomerie_residences', name: 'Montgomerie Golf Residences', lat: 25.0750, lng: 55.1900 },

    // Industrial & Logistics Premium
    { id: 'dic_logistics_hub', name: 'DIC Logistics Hub', lat: 24.8815, lng: 55.0904 },
    { id: 'dic_premium_warehouses', name: 'DIC Premium Warehouses', lat: 24.8845, lng: 55.0934 },
    { id: 'dwc_logistics_city', name: 'DWC Logistics City', lat: 24.9083, lng: 55.1923 },
    { id: 'dwc_aviation_district', name: 'DWC Aviation District', lat: 24.9113, lng: 55.1953 },
    { id: 'jafza_premium_zone', name: 'JAFZA Premium Zone', lat: 24.9830, lng: 55.1217 },
    { id: 'jafza_business_park', name: 'JAFZA Business Park', lat: 24.9860, lng: 55.1247 }
].sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically

export const MARKET_RATE_PROPERTY_TYPES = [
    { key: 'studio',       name: 'Studio',              baseBuy: 600000,   baseRent: 45000 },
    { key: '1bhk',         name: '1-Bedroom Apt',       baseBuy: 1000000,  baseRent: 75000 },
    { key: '1bhk_study',   name: '1-Bed + Study Apt',   baseBuy: 1200000,  baseRent: 90000 },
    { key: '2bhk',         name: '2-Bedroom Apt',       baseBuy: 1800000,  baseRent: 120000 },
    { key: '3bhk',         name: '3-Bedroom Apt',       baseBuy: 3000000,  baseRent: 180000 },
    { key: '4bhk',         name: '4-Bedroom Apt',       baseBuy: 5000000,  baseRent: 250000 },
    { key: 'townhouse',    name: 'Townhouse',           baseBuy: 2500000,  baseRent: 160000 },
    { key: 'villa',        name: 'Villa',               baseBuy: 4500000,  baseRent: 250000 },
     { key: 'office',       name: 'Office (per sqft)',   baseBuy: 1200,     baseRent: 100 },
    { key: 'retail',       name: 'Retail (per sqft)',   baseBuy: 2000,     baseRent: 180 },
    { key: 'warehouse',    name: 'Warehouse (per sqft)',baseBuy: 400,      baseRent: 35 },
    { key: 'labour_camp',  name: 'Labour Camp (per bed/yr)', baseBuy: 25000, baseRent: 4500 } // Note: Rate is per bed
];
// NEW: Simulated land rates per sqft of GFA for different areas
export const DUBAI_LAND_RATES = {
    'al_barari': 450,
    'al_barsha': 350,
    'al_furjan': 300,
    'business_bay': 550,
    'downtown_dubai': 800,
    'dubai_hills_estate': 500,
    'dubai_marina': 650,
    'jbr': 600,
    'jlt': 400,
    'jvc': 250,
    'palm_jumeirah': 900,
    'al_quoz': 150,
    'dip': 120,
    'jebel_ali': 100,
    'nad_al_sheba': 280,
    'dubai_academic_city': 200,
    'dubai_industrial_city': 90,
    // Add defaults for any other locations
    'default': 300 
};