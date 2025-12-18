// --- START OF FILE villaProgram.js ---

// Helper function to calculate initial dimensions from layout
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

export const VILLA_PROGRAM = {
    title: "Villa Room Mix",
    unitDefsTitle: "Room & Area Definitions",
    // These 'unitTypes' will be treated as individual blocks to be placed on the plot.
    // They are categorized as 'gfa' or 'service' for area calculations.
    unitTypes: [
        // --- GFA Components ---
        { key: "majlis", type: "Majlis", category: "gfa", color: 'rgba(59, 130, 246, 0.7)', mix: 10, layout: [{ name: 'Majlis', x: 0, y: 0, w: 6, h: 8 }] },
        { key: "living_dining", type: "Living / Dining", category: "gfa", color: 'rgba(16, 185, 129, 0.7)', mix: 15, layout: [{ name: 'Living/Dining', x: 0, y: 0, w: 8, h: 10 }] },
        { key: "master_bedroom", type: "Master Bedroom", category: "gfa", color: 'rgba(239, 68, 68, 0.7)', mix: 10, layout: [{ name: 'M. Bed', x: 0, y: 0, w: 5, h: 6 }] },
        { key: "bedroom", type: "Bedroom", category: "gfa", color: 'rgba(251, 191, 36, 0.7)', mix: 30, layout: [{ name: 'Bed', x: 0, y: 0, w: 4, h: 5 }] },
        { key: "guest_bedroom", type: "Guest Bedroom", category: "gfa", color: 'rgba(139, 92, 246, 0.7)', mix: 5, layout: [{ name: 'Guest', x: 0, y: 0, w: 4, h: 5 }] },
        { key: "kitchen", type: "Kitchen", category: "gfa", color: 'rgba(23, 162, 184, 0.7)', mix: 5, layout: [{ name: 'Kitchen', x: 0, y: 0, w: 4, h: 4 }] },
        { key: "office", type: "Office / Study", category: "gfa", color: 'rgba(253, 126, 20, 0.7)', mix: 5, layout: [{ name: 'Office', x: 0, y: 0, w: 3, h: 4 }] },

        // --- Service / Non-GFA BUA Components ---
        { key: "maids_room", type: "Maid's Room", category: "service", color: 'rgba(108, 117, 125, 0.7)', mix: 5, layout: [{ name: 'Maid', x: 0, y: 0, w: 3, h: 3 }] },
        { key: "drivers_room", type: "Driver's Room", category: "service", color: 'rgba(108, 117, 125, 0.7)', mix: 2, layout: [{ name: 'Driver', x: 0, y: 0, w: 3, h: 3 }] },
        { key: "garage", type: "Garage", category: "service", color: 'rgba(150, 150, 150, 0.7)', mix: 5, layout: [{ name: 'Garage', x: 0, y: 0, w: 6, h: 6 }] },
        { key: "laundry", type: "Laundry", category: "service", color: 'rgba(150, 150, 150, 0.7)', mix: 2, layout: [{ name: 'Laundry', x: 0, y: 0, w: 2, h: 3 }] },
        { key: "store", type: "Store", category: "service", color: 'rgba(150, 150, 150, 0.7)', mix: 1, layout: [{ name: 'Store', x: 0, y: 0, w: 2, h: 2 }] },
        { key: "pergola", type: "Pergola", category: "service", color: 'rgba(188, 170, 164, 0.7)', mix: 0, layout: [{ name: 'Pergola', x: 0, y: 0, w: 5, h: 5 }] },
        { key: "ramp", type: "Ramp (Car Park)", category: "service", color: 'rgba(80, 80, 80, 0.7)', mix: 0, layout: [{ name: 'Ramp', x: 0, y: 0, w: 4, h: 10 }] }
    ],
    // Scenarios aren't applicable in the same way, as users will place blocks manually.
    scenarios: [
        { name: "Default View", mix: [] }
    ],
    // Parking rule is not relevant for individual blocks.
    parkingRule: () => 0,
    getParkingRuleDescription: () => 'N/A',
    calculateLifts: () => 0,
    calculateUnitDimensions,
};

// Initialize dimensions for all villa components
VILLA_PROGRAM.unitTypes.forEach(calculateUnitDimensions);