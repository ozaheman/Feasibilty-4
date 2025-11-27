
// --- START OF FILE labourCampProgram.js ---
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

export const LABOUR_CAMP_PROGRAM = {
    title: "Room Mix",
    unitDefsTitle: "Room Definitions",
    unitTypes: [
        {key:"labor_room", type:"Labor Room (4p)", layout:[{name:'Room', x:0, y:0, w:4, h:5}], color:'rgba(251, 191, 36, 0.7)', mix:70},
        {key:"supervisor_room", type:"Supervisor Room", layout:[{name:'Room', x:0, y:0, w:5, h:5}], color:'rgba(59, 130, 246, 0.7)', mix:10},
    ],
    scenarios: [ {name:"Standard Camp",mix:[90,10]} ],
    parkingRule: (unit) => 0.5, // Placeholder rule
    getParkingRuleDescription: (unit) => '0.5 bays/unit',
    calculateLifts: () => 0, // Not applicable for this context
    calculateUnitDimensions,
};
LABOUR_CAMP_PROGRAM.unitTypes.forEach(calculateUnitDimensions);
// --- END OF FILE labourCampProgram.js ---