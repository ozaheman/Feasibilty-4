// --- START OF FILE hotelProgram.js ---
export const HOTEL_PROGRAM = {
    title: "Room & Suite Mix",
    unitDefsTitle: "Key Definitions",
    unitTypes: [
        { key: "standard_key", type: "Standard Key", area: 35, color: 'rgba(59, 130, 246, 0.7)', mix: 90, layout: [{ name: 'Room', x: 0, y: 0, w: 5, h: 7 }] },
        { key: "suite_key", type: "Suite Key", area: 70, color: 'rgba(16, 185, 129, 0.7)', mix: 10, layout: [{ name: 'Living', x: 0, y: 0, w: 5, h: 7 }, { name: 'Bed', x: 5, y: 0, w: 5, h: 7 }] }
    ],
    scenarios: [
        { name: "1. Standard Hotel", mix: [90, 10] },
        { name: "2. Boutique Hotel", mix: [70, 30] },
        { name: "3. Business Hotel", mix: [95, 5] }
    ],
    parkingRule: function(unit) {
        if (unit.key === 'suite_key') return 0.5; // 1 per 2 suites
        return 0.2; // 1 per 5 rooms
    },
    getParkingRuleDescription: function(unit) {
        if (unit.key === 'suite_key') return '1 per 2 suites';
        return '1 per 5 rooms';
    },
    calculateUnitDimensions: (unit) => {
        if (!unit.layout || unit.layout.length === 0) {
            unit.frontage = 0;
            unit.depth = 0;
            return;
        }
        const bounds = unit.layout.reduce((acc, room) => ({
            minX: Math.min(acc.minX, room.x), minY: Math.min(acc.minY, room.y),
            maxX: Math.max(acc.maxX, room.x + room.w), maxY: Math.max(acc.maxY, room.y + room.h)
        }), { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });
        unit.frontage = bounds.maxX - bounds.minX;
        unit.depth = bounds.maxY - bounds.minY;
    },
};
HOTEL_PROGRAM.unitTypes.forEach(unit => {
    if (unit.key === 'standard_key') { unit.frontage = 5; unit.depth = 7; }
    if (unit.key === 'suite_key') { unit.frontage = 10; unit.depth = 7; }
});
// --- END OF FILE hotelProgram.js ---