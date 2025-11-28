// MODULE 1: CONFIG & PROGRAM DATA (config.js equivalent)
// =====================================================================

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
    'Ground_Floor': { objects: [], color: 'rgba(156, 39, 176, 0.8)', countKey: null },
    'Retail': { objects: [], color: 'rgba(255, 152, 0, 0.8)', countKey: null },
    'Supermarket': { objects: [], color: 'rgba(205, 220, 57, 0.4)', countKey: null },
    'Podium': { objects: [], color: 'rgba(76, 175, 80, 0.4)', countKey: 'numPodiums' },
    'Podium_Last': { objects: [], color: 'rgba(66, 155, 70, 0.4)', countKey: null },
    'Office': { objects: [], color: 'rgba(3, 169, 244, 0.4)', countKey: null },
    'Commercial': { objects: [], color: 'rgba(233, 30, 99, 0.4)', countKey: null },
    'Typical_Floor': { objects: [], color: 'rgba(255, 255, 0, 0.4)', countKey: 'numTypicalFloors' },
    'Hotel': { objects: [], color: 'rgba(159, 100, 255, 0.4)', countKey: 'numHotelFloors' },
    'Roof': { objects: [], color: 'rgba(63, 81, 181, 0.4)', countKey: null }
};
export const LEVEL_ORDER = [
    'Basement', 'Basement_Last', 'Ground_Floor', 'Retail', 'Supermarket', 
    'Podium', 'Podium_Last', 'Office', 'Commercial', 'Typical_Floor', 'Hotel', 'Roof'
];
export const LEVEL_HEIGHTS = {
    Basement: 3.5, Basement_Last: 3.5, Ground_Floor: 8.5, Retail: 4.5, Supermarket: 5.0,
    Podium: 3.2, Podium_Last: 3.5, Office: 3.5, Commercial: 4.0, Typical_Floor: 3.5, Hotel: 3.5, Roof: 1.0, default: 3.5
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
    calculateUnitDimensions,
};
RESIDENTIAL_PROGRAM.unitTypes.forEach(calculateUnitDimensions);

export const SCHOOL_PROGRAM = {
    title: "Room Mix", unitDefsTitle: "Room Definitions",
    unitTypes: [
        {key:"classroom", type:"Classroom", layout:[{name:'Class', x:0, y:0, w:8, h:10}], color:'rgba(59, 130, 246, 0.7)', mix:60},
        {key:"lab_small", type:"Small Lab", layout:[{name:'Lab', x:0, y:0, w:8, h:12}], color:'rgba(16, 185, 129, 0.7)', mix:20},
        {key:"office", type:"Office", layout:[{name:'Office', x:0, y:0, w:4, h:5}], color:'rgba(251, 191, 36, 0.7)', mix:20},
    ],
    scenarios: [ {name:"Standard School",mix:[60,20,20]} ],
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
    'Residential': RESIDENTIAL_PROGRAM, 'Hotel': HOTEL_PROGRAM, 
    'School': SCHOOL_PROGRAM, 'LabourCamp': LABOUR_CAMP_PROGRAM, 'Warehouse': null,'Villa': null,
};

export const AREA_STATEMENT_DATA = [
    { name: "Comm. Staircase (Basement)", level: "Basement", type: "gfa", w: 6, h: 3, ID: "000001" },
    { name: "Corridor (Basement)", level: "Basement", type: "gfa", w: 2.4, h: 2.4, ID: "000002" },
    { name: "Lift (Basement)", level: "Basement", type: "gfa", w: 2.4, h: 2.4, ID: "000003" },
    { name: "Pump Room for ETS", level: "Basement", type: "service", w: 5, h: 5, ID: "000004" },
    { name: "Water Tank", level: "Basement", type: "service", w: 3, h: 10, ID: "000005" },
    { name: "BTU Meter Room", level: "Ground_Floor", type: "service", w: 2.5, h: 2.5, ID: "100001" },
    { name: "Comm_Staircase_GF", level: "Ground_Floor", type: "gfa", w: 6, h: 3, ID: "100002" },
    { name: "Control Room", level: "Ground_Floor", type: "service", w: 19, h: 1, ID: "100003" },
    { name: "Corridor (GF)", level: "Ground_Floor", type: "gfa", w: 6.5, h: 1.8, ID: "100004" },
    { name: "ETS Room", level: "Ground_Floor", type: "service", w: 9, h: 9, ID: "100005" },
    { name: "Electrical Room", level: "Ground_Floor", type: "service", w: 3, h: 3, ID: "100006" },
    { name: "Entrance Lobby", level: "Ground_Floor", type: "gfa", w: 8, h: 12, ID: "100007" },
    { name: "GSM Room", level: "Ground_Floor", type: "service", w: 3, h: 3, ID: "100008" },
    { name: "Garbage Room", level: "Ground_Floor", type: "service", w: 8, h: 1, ID: "100009" },
    { name: "Generator Room", level: "Ground_Floor", type: "service", w: 7, h: 8, ID: "100010" },
    { name: "LV Room", level: "Ground_Floor", type: "service", w: 5.1, h: 8.6, ID: "100011" },
    { name: "Lift_GF", level: "Ground_Floor", type: "gfa", w: 2.4, h: 2.4, ID: "100012" },
    { name: "Lift Corridor (GF)", level: "Ground_Floor", type: "gfa", w: 10, h: 2.4, ID: "100013" },
    { name: "Pump Room", level: "Ground_Floor", type: "service", w: 8.5, h: 8, ID: "100014" },
    { name: "RMU Room", level: "Ground_Floor", type: "service", w: 3, h: 3.2, ID: "100015" },
    { name: "Substation", level: "Ground_Floor", type: "service", w: 5.1, h: 10.5, ID: "100016" },
    { name: "Telephone Room", level: "Ground_Floor", type: "service", w: 5.1, h: 4, ID: "100017" },
    { name: "Restaurant", level: "Ground_Floor", type: "gfa", w: 15, h: 10, projectTypes: ['Hotel'], ID: "100018" },
    { name: "Ballroom", level: "Ground_Floor", type: "gfa", w: 30, h: 20, projectTypes: ['Hotel'], ID: "100019" },
    { name: "Meeting Room", level: "Podium", type: "gfa", w: 10, h: 8, projectTypes: ['Hotel'], ID: "200001" },
    { name: "Swimming Pool", level: "Podium", type: "builtup", w: 15, h: 7, ID: "200002" },
    { name: "Comm_Staircase_Podium", level: "Podium", type: "gfa", w: 6, h: 3, ID: "200003" },
    { name: "Corridor (Podium)", level: "Podium", type: "gfa", w: 12.8, h: 2.4, ID: "200004" },
    { name: "Electrical Room (Podium)", level: "Podium", type: "service", w: 4, h: 3.5, ID: "200005" },
    { name: "Lift (Podium)", level: "Podium", type: "gfa", w: 2.4, h: 2.4, ID: "200006" },
    { name: "Water Meter (Podium)", level: "Podium", type: "service", w: 1.7, h: 1.7, ID: "200007" },
    { name: "Comm. Corridor (Typical)", level: "Typical_Floor", type: "gfa", w: 21, h: 1.8, ID: "300001" },
    { name: "Comm. Electrical Room", level: "Typical_Floor", type: "service", w: 10, h: 1, ID: "300002" },
    { name: "Comm. Garbage Chute", level: "Typical_Floor", type: "service", w: 2.7, h: 1.5, ID: "300003" },
    { name: "Comm. Lift Corridor", level: "Typical_Floor", type: "gfa", w: 6.6, h: 2.4, ID: "300004" },
    { name: "Comm_Staircase_Typical", level: "Typical_Floor", type: "gfa", w: 6, h: 3, ID: "300005" },
    { name: "Comm. Tele Room", level: "Typical_Floor", type: "service", w: 2.4, h: 3.5, ID: "300006" },
    { name: "Comm. Water Meter", level: "Typical_Floor", type: "service", w: 1.7, h: 1.7, ID: "300007" },
    { name: "Comm. Water Meter", level: "Typical_Floor", type: "service", w: 4, h: 1, ID: "300008" },
    { name: "Lift_Typical", level: "Typical_Floor", type: "gfa", w: 2.4, h: 2.4, ID: "300009" },
    { name: "Shaft", level: "Typical_Floor", type: "service", w: 2, h: 2, ID: "300010" },
    { name: "Comm. Gym", level: "Roof", type: "service", w: 583, h: 1, ID: "400001" },
    { name: "Comm. Service (Roof)", level: "Roof", type: "service", w: 124, h: 1, ID: "400002" },
    { name: "Comm_Staircase_Roof", level: "Roof", type: "gfa", w: 6, h: 3, ID: "400003" },
    { name: "Corridor (Roof)", level: "Roof", type: "gfa", w: 6.6, h: 2.4, ID: "400004" },
    { name: "Lift (Roof)", level: "Roof", type: "gfa", w: 2.4, h: 2.4, ID: "400005" },
    { name: "Terrace Area", level: "Roof", type: "builtup", w: 0.5, h: 1166, ID: "400006" }
];

export const PREDEFINED_COMPOSITE_BLOCKS = [
    { name: "Residential Core 1", level: "Typical_Floor", blocks: [ { key: "Comm_Staircase_Typical_6_3", ID: "300005", x: 0, y: 0 }, { key: "Comm_Staircase_Typical_6_3", ID: "300005", x: 8.8, y: 0 }, { key: "Lift_Typical_2.4_2.4", ID: "300009", x: 6.2, y: 0 }, { key: "Lift_Typical_2.4_2.4", ID: "300009", x: 6.2, y: 2.6 }, { key: "Shaft_2_2", ID: "300010", x: 6.3, y: 5.2 } ] },
    { name: "Ground Floor Core", level: "Ground_Floor", blocks: [ { key: "Comm_Staircase_GF_6_3", ID: "100002", x: 0, y: 8 }, { key: "Comm_Staircase_GF_6_3", ID: "100002", x: 23, y: 8 }, { key: "Lift_GF_2.4_2.4", ID: "100012", x: 7, y: 8.3 }, { key: "Lift_GF_2.4_2.4", ID: "100012", x: 9.6, y: 8.3 }, { key: "Shaft_2_2", ID: "300010", x: 8.8, y: 2.9 }, { key: "Comm_Garbage_Chute_2.7_1.5", ID: "300003", x: 6, y: 2.9 }, { key: "Electrical_Room_3_3", ID: "100006", x: 0, y: 3.2 }, { key: "Substation_5.1_10.5", ID: "100016", x: 20.5, y: 11.5 }, { key: "LV_Room_5.1_8.6", ID: "100011", x: 15.2, y: 12 }, { key: "ETS_Room_9_9", ID: "100005", x: 0, y: 11.5 }, { key: "Pump_Room_8.5_8", ID: "100014", x: 9.2, y: 12 }, { key: "Garbage_Room_8_1", ID: "100009", x: 0, y: 20.7 }, { key: "Telephone_Room_5.1_4", ID: "100017", x: 20.5, y: 22.2 }, { key: "Electrical_Room_3_3", ID: "100006", x: 25.8, y: 22.2 }, { key: "Water_Meter_Podium_1.7_1.7", ID: "200007", x: 29, y: 24.5 }, { key: "Control_Room_19_1", ID: "100003", x: 0, y: 0 },{ key: "Entrance_Lobby_8_12", ID: "100007", x: 0, y: 0 }  ] },
    { name: "Podium Floor Core", level: "Podium", blocks: [ { key: "Comm_Staircase_Podium_6_3", ID: "200003", x: 0, y: 0 }, { key: "Comm_Staircase_Podium_6_3", ID: "200003", x: 14.8, y: 0 }, { key: "Lift_Podium_2.4_2.4", ID: "200006", x: 6.2, y: 0.3 }, { key: "Lift_Podium_2.4_2.4", ID: "200006", x: 8.8, y: 0.3 }, { key: "Lift_Corridor_Podium_12.8_2.4", ID: "200004", x: 1.8, y: 3 }, { key: "Electrical_Room_Podium_4_3.5", ID: "200005", x: 0, y: 3.2 }, { key: "Telephone_Room_5.1_4", ID: "100017", x: 4.2, y: 5.6 }, { key: "Garbage_Room_8_1", ID: "100009", x: 9.5, y: 5.6 }, { key: "Water_Meter_Podium_1.7_1.7", ID: "200007", x: 17.7, y: 5.6 } ] },
    { name: "Basement Floor Core", level: "Basement", blocks: [ { key: "Comm_Staircase_Basement_6_3", ID: "000001", x: 0, y: 0 }, { key: "Comm_Staircase_Basement_6_3", ID: "000001", x: 14.8, y: 0 }, { key: "Lift_Basement_2.4_2.4", ID: "000003", x: 6.2, y: 0.3 }, { key: "Lift_Basement_2.4_2.4", ID: "000003", x: 8.8, y: 0.3 }, { key: "Lift_Basement_2.4_2.4", ID: "000003", x: 6.2, y: 2.9 }, { key: "Lift_Basement_2.4_2.4", ID: "000003", x: 8.8, y: 2.9 }, { key: "Lift_Corridor_GF_10_2.4", ID: "100013", x: 3.5, y: 5.5 }, { key: "Electrical_Room_3_3", ID: "100006", x: 0, y: 3.2 }, { key: "Telephone_Room_5.1_4", ID: "100017", x: 3.2, y: 8.1 }, { key: "Garbage_Room_8_1", ID: "100009", x: 8.5, y: 8.1 }, { key: "Water_Meter_Podium_1.7_1.7", ID: "200007", x: 16.7, y: 8.1 }, { key: "GSM_Room_3_3", ID: "100008", x: 17, y: 3.2 } ] },
    { name: "Typical Floor Core", level: "Typical_Floor", blocks: [ { key: "Comm_Staircase_Typical_6_3", ID: "300005", x: 0, y: 0 }, { key: "Comm_Staircase_Typical_6_3", ID: "300005", x: 14.8, y: 0 }, { key: "Lift_Typical_2.4_2.4", ID: "300009", x: 6.2, y: 0.3 }, { key: "Lift_Typical_2.4_2.4", ID: "300009", x: 8.8, y: 0.3 }, { key: "Lift_Typical_2.4_2.4", ID: "300009", x: 6.2, y: 2.9 }, { key: "Lift_Typical_2.4_2.4", ID: "300009", x: 8.8, y: 2.9 }, { key: "Comm_Lift_Corridor_6.6_2.4", ID: "300004", x: 5.1, y: 5.5 }, { key: "Comm_Electrical_Room_10_1", ID: "300002", x: 0, y: 3.2 }, { key: "Comm_Tele_Room_2.4_3.5", ID: "300006", x: 12.2, y: 3.2 }, { key: "Comm_Garbage_Chute_2.7_1.5", ID: "300003", x: 11.9, y: 6.9 }, { key: "Comm_Water_Meter_1.7_1.7", ID: "300007", x: 14.8, y: 6.9 } ] },
    { name: "Roof Floor Core", level: "Roof", blocks: [ { key: "Comm_Staircase_Roof_6_3", ID: "400003", x: 0, y: 0 }, { key: "Comm_Staircase_Roof_6_3", ID: "400003", x: 14.8, y: 0 }, { key: "Lift_Roof_2.4_2.4", ID: "400005", x: 6.2, y: 0.3 }, { key: "Lift_Roof_2.4_2.4", ID: "400005", x: 8.8, y: 0.3 }, { key: "Lift_Roof_2.4_2.4", ID: "400005", x: 6.2, y: 2.9 }, { key: "Lift_Roof_2.4_2.4", ID: "400005", x: 8.8, y: 2.9 }, { key: "Corridor_Roof_6.6_2.4", ID: "400004", x: 5.1, y: 5.5 }, { key: "Electrical_Room_Podium_4_3.5", ID: "200005", x: 0, y: 3.2 }, { key: "Comm_Tele_Room_2.4_3.5", ID: "300006", x: 12.2, y: 3.2 }, { key: "Garbage_Room_8_1", ID: "100009", x: 4.8, y: 8.1 }, { key: "Comm_Water_Meter_1.7_1.7", ID: "300007", x: 13, y: 8.1 }, { key: "GSM_Room_3_3", ID: "100008", x: 17.2, y: 3.2 } ] }
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
    const key = `${item.name.replace(/[\s().]/g, '_')}_${item.w}_${item.h}`;
    PREDEFINED_BLOCKS[key] = {
        name: item.name,
        width: parseFloat(item.w),
        height: parseFloat(item.h),
        level: item.level,
        category: item.type,
        projectTypes: item.projectTypes // Keep this property
    };
});