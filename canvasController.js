// MODULE 4: CANVAS CONTROLLER (canvasController.js equivalent)
// =====================================================================
import { resetState,state,setCurrentMode,setScale   } from './state.js';
import { updateDashboard, updateSelectedObjectControls, updateLevelFootprintInfo } from './uiController.js';
import { handleMouseDown,handleMouseMove } from './eventHandlers.js';
 import { handleDblClick } from './drawingTools.js';
let overlayCanvas,overlayCtx;

export function initCanvas(canvasId,overlayId) {
    const wrapper = document.querySelector('.canvas-container-wrapper');
    const canvasEl = document.getElementById(canvasId);
    canvasEl.width = wrapper.clientWidth * 2;
    canvasEl.height = (wrapper.clientWidth / 1.64) * 2;
  
    state.canvas = new fabric.Canvas(canvasId, {
        selection: true,
        preserveObjectStacking: true
    });
    overlayCanvas = document.getElementById(overlayId);
    overlayCtx = overlayCanvas.getContext('2d');
    state.canvas.setWidth(800).setHeight(600);
    syncOverlayCanvasSize();

    const upperCanvas = state.canvas.upperCanvasEl;
    upperCanvas.addEventListener('wheel', (event) => {
        const opt = { e: event };
        handleMouseWheelZoom(opt);
    }, { passive: false });
}

export function syncOverlayCanvasSize() {
    if (!state.canvas || !overlayCanvas) return;
    overlayCanvas.width = state.canvas.getWidth();
    overlayCanvas.height = state.canvas.getHeight();
    state.canvas.calcOffset();
}

export function clearOverlay() {
    if (!overlayCtx) return;
    const vpt = state.canvas.viewportTransform;
    overlayCtx.save();
    overlayCtx.setTransform(1, 0, 0, 1, 0, 0);
    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    overlayCtx.restore();
}
export function getOverlayContext() { return overlayCtx; }
export function clearCanvasBackground() {
     state.canvas.setBackgroundImage(null, state.canvas.renderAll.bind(state.canvas));
     state.canvas.setWidth(800).setHeight(600);
     syncOverlayCanvasSize();
}
export function setCanvasBackground(source) {
    if (typeof source === 'string') {
        fabric.Image.fromURL(source, (img) => {
            fitAndSetBg(img);
        });
    } else {
        fitAndSetBg(source);
    }
}

function fitAndSetBg(fabricImage) {
    const mainContent = document.querySelector('.main-content');
    const maxWidth = mainContent.clientWidth * 0.95;
    const maxHeight = (window.innerHeight - 150) * 0.9;
    const scaleFactor = Math.min(maxWidth / fabricImage.width, maxHeight / fabricImage.height, 1);

    state.canvas.setWidth(fabricImage.width * scaleFactor);
    state.canvas.setHeight(fabricImage.height * scaleFactor);
    syncOverlayCanvasSize();
    
    fabricImage.set({
        scaleX: scaleFactor,
        scaleY: scaleFactor
    });

    state.canvas.setBackgroundImage(fabricImage, state.canvas.renderAll.bind(state.canvas));
}

export async function renderPdfToBackground(pdfData, pageNum, renderScale = 2.0) {
    try {
        const pdf = await pdfjsLib.getDocument(pdfData).promise;
        if (pageNum > pdf.numPages || pageNum < 1) {
            document.getElementById('status-bar').textContent = `Error: Page ${pageNum} does not exist.`;
            return null;
        }
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: renderScale });
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = viewport.width;
        tempCanvas.height = viewport.height;

        await page.render({ canvasContext: tempCanvas.getContext('2d'), viewport: viewport }).promise;
        
        return new Promise(resolve => {
            fabric.Image.fromURL(tempCanvas.toDataURL(), (img) => {
                img.isPdf = true;
                img.renderingScale = renderScale;
                resolve(img);
            });
        });

    } catch (error) {
        console.error('Error rendering PDF:', error);
        document.getElementById('status-bar').textContent = 'Error: Could not render PDF file.';
        return null;
    }
}
export function zoomCanvas(zoomFactor) {
    const newZoom =  state.canvas.getZoom() * zoomFactor;
     state.canvas.zoomToPoint(new fabric.Point( state.canvas.width / 2,  state.canvas.height / 2), newZoom);
}
export function zoomToObject(targetObject) {
    if (!targetObject) return;
    const br = targetObject.getBoundingRect();
    const zoomX =  state.canvas.width / br.width * 0.9;
    const zoomY =  state.canvas.height / br.height * 0.9;
    const newZoom = Math.min(zoomX, zoomY);
     state.canvas.setZoom(newZoom);
    const center = targetObject.getCenterPoint();
    const vpt =  state.canvas.viewportTransform;
    vpt[4] = ( state.canvas.width / 2) - center.x * newZoom;
    vpt[5] = ( state.canvas.height / 2) - center.y * newZoom;
     state.canvas.requestRenderAll();
}
export function resetZoom() {
     state.canvas.setZoom(1);
     state.canvas.viewportTransform[4] = 0;
     state.canvas.viewportTransform[5] = 0;
     state.canvas.requestRenderAll();
}
export function handleMouseWheelZoom(opt) {
    opt.e.preventDefault();
    opt.e.stopPropagation();
    const delta = opt.e.deltaY;
    let zoom = state.canvas.getZoom();
    zoom *= 0.999 ** delta;
    if (zoom > 20) zoom = 20;
    if (zoom < 0.1) zoom = 0.1;
     state.canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
}
export function getCanvas() { return state.canvas; }


export function redrawApartmentPreview(layoutData) {
    const vpt =  state.canvas.viewportTransform;
    overlayCtx.save();
    overlayCtx.setTransform(vpt[0], vpt[1], vpt[2], vpt[3], vpt[4], vpt[5]);
    const { placedFlats, innerCorridorPolyPoints, outerCorridorPolyPoints } = layoutData;
    const showBalconies = document.getElementById('show-balconies-check').checked;
    const showCorridor = document.getElementById('show-corridor-check').checked;

    const drawDashedPoly = (points, color) => {
        if (!points || points.length < 2) return;
        overlayCtx.beginPath();
        overlayCtx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            overlayCtx.lineTo(points[i].x, points[i].y);
        }
        overlayCtx.closePath();
        overlayCtx.strokeStyle = color;
        overlayCtx.lineWidth = 1.5 / state.canvas.getZoom();
        overlayCtx.setLineDash([5 / state.canvas.getZoom(), 5 / state.canvas.getZoom()]);
        overlayCtx.stroke();
    };
    
    if (showCorridor) {
        drawDashedPoly(innerCorridorPolyPoints, '#8B4513'); // Brown for inner wall
        drawDashedPoly(outerCorridorPolyPoints, '#D2691E'); // Lighter brown for outer wall
    }
    overlayCtx.setLineDash([]); // Reset line dash

    for (const flat of placedFlats) {
        // Draw the main unit
        overlayCtx.save();
        overlayCtx.translate(flat.center.x, flat.center.y);
        overlayCtx.rotate(flat.angle);
        const widthPx = flat.type.frontage / state.scale.ratio;
        const depthPx = flat.type.depth / state.scale.ratio;
        overlayCtx.fillStyle = flat.type.color;
        overlayCtx.strokeStyle = 'black';
        overlayCtx.lineWidth = 0.5;
        overlayCtx.fillRect(-widthPx / 2, -depthPx / 2, widthPx, depthPx);
        overlayCtx.strokeRect(-widthPx / 2, -depthPx / 2, widthPx, depthPx);
        overlayCtx.restore();

        // Draw the balcony
        if (showBalconies && flat.type.balconyMultiplier > 0) {
            overlayCtx.save();
            overlayCtx.translate(flat.balconyCenter.x, flat.balconyCenter.y);
            overlayCtx.rotate(flat.angle);
            const balconyDepthPx = (flat.type.balconyMultiplier || 0) / state.scale.ratio;
            const balconyWidthPx = widthPx * ((flat.type.balconyCoverage || 80) / 100);
            overlayCtx.fillStyle = 'rgba(0,0,0,0.15)';
            overlayCtx.fillRect(-balconyWidthPx / 2, -balconyDepthPx / 2, balconyWidthPx, balconyDepthPx);
            overlayCtx.strokeRect(-balconyWidthPx / 2, -balconyDepthPx / 2, balconyWidthPx, balconyDepthPx);
            overlayCtx.restore();
        }
    }
    overlayCtx.restore();
}