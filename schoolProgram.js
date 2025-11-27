// --- START OF FILE schoolProgram.js ---
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

export const SCHOOL_PROGRAM = {
    title: "Room Mix",
    unitDefsTitle: "Room Definitions",
    unitTypes: [
        {key:"classroom", type:"Classroom", layout:[{name:'Class', x:0, y:0, w:8, h:10}], color:'rgba(59, 130, 246, 0.7)', mix:60},
        {key:"lab_small", type:"Small Lab", layout:[{name:'Lab', x:0, y:0, w:8, h:12}], color:'rgba(16, 185, 129, 0.7)', mix:20},
        {key:"office", type:"Office", layout:[{name:'Office', x:0, y:0, w:4, h:5}], color:'rgba(251, 191, 36, 0.7)', mix:20},
    ],
    scenarios: [ {name:"Standard School",mix:[60,20,20]} ],
    parkingRule: () => 0, // Placeholder for school parking rule
    getParkingRuleDescription: () => 'N/A',
    calculateLifts: () => 0, // Placeholder
    calculateUnitDimensions,
};
SCHOOL_PROGRAM.unitTypes.forEach(calculateUnitDimensions);
// --- END OF FILE schoolProgram.js ---