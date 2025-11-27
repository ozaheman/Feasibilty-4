import { PROJECT_PROGRAMS } from './config.js';
import { RESIDENTIAL_PROGRAM } from './residentialProgram.js';
import { LEVEL_DEFINITIONS, PREDEFINED_COMPOSITE_BLOCKS } from './config.js';

function rehydrateProgram(plainProgram, masterProgram) {
    if (!plainProgram || !masterProgram) return null;
    Object.assign(plainProgram, {
        parkingRule: masterProgram.parkingRule,
        getParkingRuleDescription: masterProgram.getParkingRuleDescription,
        calculateLifts: masterProgram.calculateLifts,
        calculateUnitDimensions: masterProgram.calculateUnitDimensions
    });
    return plainProgram;
}

const _state = {
    canvas: null,
    overlayCanvas:null,
    overlayCtx:null,
    currentMode: null,
    scale: { pixels: 0, meters: 0, ratio: 0 },
    currentLevel: 'Typical_Floor',
    allLayersVisible: false,
    levels: JSON.parse(JSON.stringify(LEVEL_DEFINITIONS)),
    serviceBlocks: [],
    wingCounter: 0,
    parkingRows: [],
    guideLines: [],
    plotPolygon: null,
    lastCalculatedData: null,
    currentApartmentLayout: null,
    livePreviewLayout: null,
    userCompositeBlocks: JSON.parse(JSON.stringify(PREDEFINED_COMPOSITE_BLOCKS)),
    serviceBlockCounter: 1,
    plotEdgeProperties: [],
    setbackGuides: [],
    projectType: 'Residential',
    currentProgram: rehydrateProgram(JSON.parse(JSON.stringify(RESIDENTIAL_PROGRAM)), RESIDENTIAL_PROGRAM),
    selectedPlotEdges: [],
    edgeHighlightGroup: null, 
    isFootprint: false,
    dxfOverlayGroup: null,
    scaleLine: null,
    scaleStart: null
};

export const state = _state;

export function setCurrentMode(mode) {
    _state.currentMode = mode;
}
export function setScale(pixels, meters) {
    _state.scale = { pixels, meters, ratio: meters > 0 && pixels > 0 ? meters / pixels : 0 };
}
export function setCurrentLevel(levelName) {
    if (_state.levels[levelName]) {
        _state.currentLevel = levelName;
    }
}
export function toggleAllLayersVisibility() {
    _state.allLayersVisible = !_state.allLayersVisible;
}

export function resetState(keepObjects = false) {
    const projectType = document.getElementById('project-type-select')?.value || 'Residential';
    const program = PROJECT_PROGRAMS[projectType];
    Object.assign(_state, {
        currentMode: null,
        scale: { pixels: 0, meters: 0, ratio: 0 },
        currentLevel: 'Typical_Floor',
        allLayersVisible: false,
        levels: JSON.parse(JSON.stringify(LEVEL_DEFINITIONS)),
        serviceBlocks: [],
        parkingRows: [],
        guideLines: [],
        plotPolygon: null,
        lastCalculatedData: null,
        currentApartmentLayout: null,
        livePreviewLayout: null,
        serviceBlockCounter: 1,
        userCompositeBlocks: JSON.parse(JSON.stringify(PREDEFINED_COMPOSITE_BLOCKS)),
        projectType: projectType,
        currentProgram: program ? rehydrateProgram(JSON.parse(JSON.stringify(program)), program) : null,
        plotEdgeProperties: [],
        setbackGuides: [],
        selectedPlotEdges: [],
        edgeHighlightGroup: null,
        dxfOverlayGroup: null,
    });
    if (!keepObjects) {
        if(_state.canvas) {
            _state.canvas.clear();
             _state.canvas.setBackgroundImage(null, _state.canvas.renderAll.bind(_state.canvas));
             _state.canvas.setWidth(800).setHeight(600);
        }
    }
}