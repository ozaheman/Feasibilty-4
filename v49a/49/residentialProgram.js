// --- START OF FILE residentialProgram.js ---
function calculateUnitDimensions(unit) {
    if (!unit.layout || unit.layout.length === 0) {
        unit.frontage = 0;
        unit.depth = 0;
        unit.area = 0;
        return;
    }
    const bounds = unit.layout.reduce((acc, room) => ({
        minX: Math.min(acc.minX, room.x),
        minY: Math.min(acc.minY, room.y),
        maxX: Math.max(acc.maxX, room.x + room.w),
        maxY: Math.max(acc.maxY, room.y + room.h)
    }), { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });
    unit.frontage = bounds.maxX - bounds.minX;
    unit.depth = bounds.maxY - bounds.minY;
    unit.area = unit.layout.reduce((sum, room) => sum + (room.w * room.h), 0);
}

export const RESIDENTIAL_PROGRAM = {
    title: "Apartment Mix",
    unitDefsTitle: "Unit Definitions",
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
        if (unit.key.includes('2bhk') && unit.area > 140) {
            reason += ' (>140m²)';
        }
        return reason;
    },
    liftOccupancyRanges: [0, 201, 301, 401, 501, 601, 701, 801, 901, 1001],
    liftMatrix: [[1,5,1,1,2,2,0,0,0,0,0,0],[6,10,2,2,2,2,3,3,3,0,0,0],[11,15,2,2,2,3,3,3,4,4,4,5],[16,20,2,2,3,3,3,4,4,4,5,5],[21,25,2,3,3,3,4,4,4,5,5,6],[26,30,3,3,3,3,4,4,5,5,5,6],[31,35,3,3,3,4,4,5,5,5,6,6]],
    calculateLifts: function(totalOccupancyLoad, numFloors) { if (numFloors <= 0 || totalOccupancyLoad <= 0) return 0; let floorConfigRow = this.liftMatrix.find(row => numFloors >= row[0] && numFloors <= row[1]); if (!floorConfigRow) { floorConfigRow = this.liftMatrix[this.liftMatrix.length - 1]; } let occupancyColIndex = 0; for (let i = this.liftOccupancyRanges.length - 1; i >= 0; i--) { if (totalOccupancyLoad >= this.liftOccupancyRanges[i]) { occupancyColIndex = i; break; } } const liftCountIndex = occupancyColIndex + 2; return floorConfigRow[liftCountIndex] || floorConfigRow[floorConfigRow.length - 1]; },
    calculateUnitDimensions,
};
RESIDENTIAL_PROGRAM.unitTypes.forEach(calculateUnitDimensions);
// --- END OF FILE residentialProgram.js ---