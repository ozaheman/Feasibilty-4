
//--- START OF FILE io.js ---

// MODULE 11: IO (io.js equivalent)
// =====================================================================
import { state, resetState, setScale,rehydrateProgram  } from './state.js';
import { handleFinishPolygon, createCompositeGroup  } from './eventHandlers.js';
import { zoomToObject, setCanvasBackground, renderPdfToBackground } from './canvasController.js';
import { updateUI } from './uiController.js';
import { PROJECT_PROGRAMS, PREDEFINED_BLOCKS, BLOCK_CATEGORY_COLORS } from './config.js';
import { f } from './utils.js';

export function downloadFile(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
}
function formatXML(xml) {
    let formatted = '', indent = '';
    const tab = '  ';
    xml.split(/>\s*</).forEach(node => {
        if (node.match( /^\/\w/ )) indent = indent.substring(tab.length);
        formatted += indent + '<' + node + '>\r\n';
        if (node.match( /^<?\w[^>]*[^\/]$/ )) indent += tab;
    });
    return formatted.substring(1, formatted.length - 3);
}

function parseAndDisplayDxf(dxfText) {
    try {
        const parser = new DxfParser();
        const dxf = parser.parseSync(dxfText);
        if (!dxf || !dxf.entities || dxf.entities.length === 0) { throw new Error("No entities found in DXF file."); }
        if (state.dxfOverlayGroup) state.canvas.remove(state.dxfOverlayGroup);

        const fabricObjects = [];
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        dxf.entities.forEach(entity => {
            if (entity.type === 'LWPOLYLINE' || entity.type === 'POLYLINE') {
                if (!entity.vertices || entity.vertices.length < 2) return;
                const points = entity.vertices.map(v => ({ x: v.x, y: -v.y })); // Invert Y
                const poly = new fabric.Polyline(points, {
                    fill: 'transparent', stroke: 'rgba(0, 255, 255, 0.8)', strokeWidth: 1, objectCaching: false, strokeUniform: true,
                });
                fabricObjects.push(poly);
                points.forEach(p => { minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y); });
            }
        });

        if (fabricObjects.length === 0) { 
            document.getElementById('status-bar').textContent = "No usable polylines found in the DXF file.";
            return;
        }

        const group = new fabric.Group(fabricObjects, { left: 0, top: 0, originX: 'left', originY: 'top', isDxfOverlay: true, });
        
        group.forEachObject(obj => { obj.left -= minX; obj.top -= minY; });
        group.set({ left: minX, top: minY }).setCoords();

        state.dxfOverlayGroup = group;
        state.canvas.add(group);
        zoomToObject(group);
        state.canvas.setActiveObject(group).renderAll();
        updateUI();
        document.getElementById('status-bar').textContent = 'DXF imported. Scale and position it over your plan.';
        
    } catch (err) {
        console.error('Error parsing DXF file:', err);
        document.getElementById('status-bar').textContent = 'Could not parse the DXF file. Please ensure it is a valid DXF format.';
    }
}

export function handleDxfUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        state.originalDxfContent = event.target.result; // Store raw text
        parseAndDisplayDxf(state.originalDxfContent);
    };
    reader.readAsText(file);
}
export function updateDxfStrokeWidth() {
    if (!state.dxfOverlayGroup) return;
    const newWidth = parseFloat(document.getElementById('dxf-stroke-width').value) || 1;
    state.dxfOverlayGroup.forEachObject(obj => { obj.set('strokeWidth', newWidth); });
    state.canvas.renderAll();
}

function calculatePolygonArea(points) {
    if (!points || points.length < 3) return 0;
    let area = 0;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        area += (points[j].x + points[i].x) * (points[j].y - points[i].y);
    }
    return Math.abs(area / 2);
}

export function assignDxfAsPlot() {
    const selected = state.canvas.getActiveObject();
    if (!selected || !selected.isDxfOverlay) { 
        document.getElementById('status-bar').textContent = 'Please select the imported DXF group first.';
        return;
    }
    const polylines = selected.getObjects().filter(o => o.type === 'polyline');
    if (polylines.length === 0) {
        document.getElementById('status-bar').textContent = 'No polylines found in the selected DXF group.';
        return;
    }

    let largestPoly = null;
    let maxArea = -1;
    polylines.forEach(poly => {
        const matrix = selected.calcTransformMatrix();
        const transformedPoints = poly.points.map(p => fabric.util.transformPoint({ x: p.x + poly.left, y: p.y + poly.top }, matrix));
        const area = calculatePolygonArea(transformedPoints);
        if (area > maxArea) { maxArea = area; largestPoly = transformedPoints; }
    });

    if (largestPoly) {
        const finalPolygon = new fabric.Polygon(largestPoly, { objectCaching: false });
        handleFinishPolygon(finalPolygon, 'drawingPlot'); // Uses drawingTools function
    }
    deleteDxf();
}
export function finalizeDxf() {
    if (!state.dxfOverlayGroup) return;
    state.dxfOverlayGroup._restoreObjectsState();
    state.canvas.remove(state.dxfOverlayGroup);
    state.dxfOverlayGroup.getObjects().forEach(item => {
        item.set({ isGuide: true, stroke: 'rgba(0, 255, 255, 0.7)', strokeWidth: 2, selectable: false, evented: false, strokeDashArray: [5, 5] });
        state.guideLines.push(item);
        state.canvas.add(item);
    });
    state.dxfOverlayGroup = null;
    updateUI();
    state.canvas.discardActiveObject();
    state.canvas.renderAll();
}
export function deleteDxf() {
    if (state.dxfOverlayGroup) {
        state.canvas.remove(state.dxfOverlayGroup);
        state.dxfOverlayGroup = null;
        state.originalDxfContent = null;
        updateUI();
        state.canvas.renderAll();
    }
}
export function exportProjectZIP(canvas) {
    const zip = new JSZip();

    // 1. Generate and add XML
    const doc = document.implementation.createDocument(null, "FeasibilityProject", null);
    const projectNode = doc.documentElement;
    const scaleNode = doc.createElement("Scale");
    scaleNode.setAttribute("pixels", state.scale.pixels);
    scaleNode.setAttribute("meters", state.scale.meters);
    projectNode.appendChild(scaleNode);
    const paramsNode = doc.createElement("Parameters");
    paramsNode.setAttribute("projectType", state.projectType);
    document.querySelectorAll('.param-input').forEach(input => {
        const paramNode = doc.createElement(input.id);
        paramNode.textContent = input.type === 'checkbox' ? input.checked : input.value;
        paramsNode.appendChild(paramNode);
    });
    projectNode.appendChild(paramsNode);
    const programNode = doc.createElement("ProgramData");
    if (state.currentProgram) { programNode.textContent = JSON.stringify(state.currentProgram); }
    projectNode.appendChild(programNode);
    const customBlocksNode = doc.createElement("UserCompositeBlocks");
    customBlocksNode.textContent = JSON.stringify(state.userCompositeBlocks);
    projectNode.appendChild(customBlocksNode);
    const plotPropsNode = doc.createElement("PlotEdgeProperties");
    plotPropsNode.textContent = JSON.stringify(state.plotEdgeProperties);
    projectNode.appendChild(plotPropsNode);
    
    // NEW: Add action history to XML
    const historyNode = doc.createElement("ActionHistory");
    historyNode.textContent = JSON.stringify(state.actionHistory);
    projectNode.appendChild(historyNode);

    const canvasNode = doc.createElement("CanvasObjects");
    const objectsToExport = canvas.getObjects().filter(obj => !obj.isSnapPoint && !obj.isEdgeHighlight && !obj.isSnapIndicator);
    objectsToExport.forEach(obj => {
        const objNode = doc.createElement("Object");
        const customProps = ['level', 'isServiceBlock', 'blockData', 'blockId', 'isPlot', 'isFootprint', 'isCompositeGroup', 'isParkingRow', 'parkingParams', 'parkingCount', 'isGuide', 'isDxfOverlay'];
        const fabricData = obj.toObject(customProps);
        objNode.textContent = JSON.stringify(fabricData);
        canvasNode.appendChild(objNode);
    });
    projectNode.appendChild(canvasNode);
    const serializer = new XMLSerializer();
    const xmlString = formatXML(serializer.serializeToString(doc));
    zip.file("project.xml", xmlString);

    // 2. Add Original Plan File
    if (state.originalPlanFile) {
        zip.file(state.originalPlanFile.name, state.originalPlanFile);
    }

    // 3. Add Original DXF Content
    if (state.originalDxfContent) {
        zip.file("overlay.dxf", state.originalDxfContent);
    }
     // 4. NEW: Generate and add Service Block Area Statement CSV
    if (state.serviceBlocks.length > 0 && state.scale.ratio > 0) {
        let csvContent = "Block ID,Block Name,Level,Category,Area (sqm)\n";
        state.serviceBlocks.forEach(block => {
            if (block.blockData) {
                const areaM2 = (block.getScaledWidth() * block.getScaledHeight()) * (state.scale.ratio * state.scale.ratio);
                const row = [
                    `"${block.blockId || 'N/A'}"`,
                    `"${block.blockData.name || 'Unnamed'}"`,
                    `"${block.level || 'Unassigned'}"`,
                    `"${(block.blockData.category || 'default').toUpperCase()}"`,
                    `${f(areaM2, 2).replace(/,/g, '')}` // Use f() but remove commas for CSV
                ].join(',');
                csvContent += row + "\n";
            }
        });
        zip.file("service_block_schedule.csv", csvContent);
    }

    // 4. Generate and Download ZIP
    zip.generateAsync({ type: "blob" })
        .then(function(content) {
            downloadFile("project.zip", content, "application/zip");
        });
}

export async function importProjectZIP(file, canvas, onComplete) {
    try {
        const zip = await JSZip.loadAsync(file);
        const xmlFile = zip.file("project.xml");
        if (!xmlFile) throw new Error("project.xml not found in the zip archive.");
        
        const xmlContent = await xmlFile.async("string");
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlContent, "application/xml");
        if (xmlDoc.getElementsByTagName("parsererror").length) throw new Error("XML parsing error.");
        
        canvas.clear();
        
        const scaleNode = xmlDoc.querySelector("Scale");
        if (scaleNode) {
            const pixels = parseFloat(scaleNode.getAttribute("pixels"));
            const meters = parseFloat(scaleNode.getAttribute("meters"));
            if (pixels > 0 && meters > 0) setScale(pixels, meters);
        }
        
        const plotPropsNode = xmlDoc.querySelector("PlotEdgeProperties");
        if (plotPropsNode && plotPropsNode.textContent) state.plotEdgeProperties = JSON.parse(plotPropsNode.textContent);
        
        let projectType = 'Residential';
        const paramsNode = xmlDoc.querySelector("Parameters");
        if (paramsNode) {
            projectType = paramsNode.getAttribute("projectType") || 'Residential';
            document.getElementById('project-type-select').value = projectType;
            paramsNode.childNodes.forEach(paramNode => {
                if (paramNode.nodeType === 1) {
                    const input = document.getElementById(paramNode.tagName);
                    if (input) {
                        if (input.type === 'checkbox') input.checked = paramNode.textContent === 'true'; 
                        else input.value = paramNode.textContent;
                    }
                }
            });
        }
        state.projectType = projectType;

        const programNode = xmlDoc.querySelector("ProgramData");
        if(programNode && programNode.textContent) {
            const plainProgramData = JSON.parse(programNode.textContent);
            const masterProgram = PROJECT_PROGRAMS[projectType];
            state.currentProgram = rehydrateProgram(plainProgramData, masterProgram);
        }
        
        const customBlocksNode = xmlDoc.querySelector("UserCompositeBlocks");
        if(customBlocksNode && customBlocksNode.textContent) state.userCompositeBlocks = JSON.parse(customBlocksNode.textContent);

        // NEW: Load action history (replay logic would go here)
        const historyNode = xmlDoc.querySelector("ActionHistory");
        if (historyNode && historyNode.textContent) {
            state.actionHistory = JSON.parse(historyNode.textContent);
            // NOTE: Full replay logic is complex and not implemented here.
            // A full implementation would iterate through actionHistory and re-apply each action.
            // For now, we will continue to load the final state of canvas objects.
        }
        
        // The `enlivenObjects` function correctly restores Fabric objects along with their custom properties
        // like `isPlot`, `isFootprint`, `level`, etc., which were saved during export.
        // The callback in `handleImportZIP` will then iterate through these restored objects
        // to repopulate the application's state variables (`state.plotPolygon`, `state.levels`, etc.).
        const objectNodes = xmlDoc.querySelectorAll("CanvasObjects > Object");
        const fabricObjects = Array.from(objectNodes).map(node => JSON.parse(node.textContent));

        fabric.util.enlivenObjects(fabricObjects, async (enlivenedObjects) => {// Re-create composite groups correctly
            const recreatedObjects = [];
            const tempGroups = {};

            canvas.clear();
            enlivenedObjects.forEach(obj => {
                if (obj.isCompositeGroup) {
                    // Ensure sub-objects are not selectable initially
                    obj.forEachObject(subObj => subObj.set({selectable: false, evented: false}));
                }
                canvas.add(obj);
            });
            
            const planFileRegex = /\.(pdf|png|jpe?g)$/i;
            const planZipObject = Object.values(zip.files).find(f => !f.dir && planFileRegex.test(f.name));
            if (planZipObject) {
                const blob = await planZipObject.async("blob");
                state.originalPlanFile = new File([blob], planZipObject.name, { type: blob.type });

                if (planZipObject.name.toLowerCase().endsWith('.pdf')) {
                    const arrayBuffer = await planZipObject.async("arraybuffer");
                    window.currentPdfData = arrayBuffer;
                    const pdfImg = await renderPdfToBackground(arrayBuffer, 1);
                    if (pdfImg) setCanvasBackground(pdfImg);
                } else {
                    const dataUrl = URL.createObjectURL(state.originalPlanFile);
                    setCanvasBackground(dataUrl);
                }
            }

            const dxfZipObject = zip.file("overlay.dxf");
            if (dxfZipObject) {
                const dxfText = await dxfZipObject.async("string");
                state.originalDxfContent = dxfText;
                parseAndDisplayDxf(dxfText);
            }
            
            canvas.renderAll();
            if (onComplete) onComplete();
        });

    } catch (error) {
        console.error("Failed to import ZIP:", error);
        document.getElementById('status-bar').textContent = `Error: ${error.message}`;
    }
}

// NEW: Function to export service blocks as a CSV file
export function exportServiceBlocksCSV() {
    if (state.serviceBlocks.length === 0 || state.scale.ratio === 0) {
        document.getElementById('status-bar').textContent = 'No service blocks to export.';
        return;
    }

    let csvContent = "ID,Name,Level,Category,Area (sqm)\n";
    const scaleSq = state.scale.ratio * state.scale.ratio;

    const allBlocks = [];
    state.serviceBlocks.forEach(block => {
        if (block.isCompositeGroup) {
            block.getObjects().forEach(subBlock => allBlocks.push(subBlock));
        } else if (block.isServiceBlock) {
            allBlocks.push(block);
        }
    });

    allBlocks.forEach(block => {
        if (block.blockData) {
            const areaM2 = (block.getScaledWidth() * block.getScaledHeight()) * scaleSq;
            const row = [
                `"${block.blockId || 'N/A'}"`,
                `"${block.blockData.name || 'Unnamed'}"`,
                `"${block.level || 'Unassigned'}"`,
                `"${block.blockData.category || 'default'}"`,
                `${areaM2.toFixed(2)}` // Keep it simple for CSV
            ].join(',');
            csvContent += row + "\n";
        }
    });

    downloadFile("service_block_schedule.csv", csvContent, "text/csv;charset=utf-8;");
    document.getElementById('status-bar').textContent = 'Service block schedule exported as CSV.';
}

// NEW: Function to import service blocks from a CSV file
export function importServiceBlocksCSV(file, onComplete) {
    if (!file) return;
    if (state.scale.ratio === 0) {
        alert('Please set the scale before importing blocks.');
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const csvText = event.target.result;
            const rows = csvText.split('\n').filter(row => row.trim() !== '');
            if (rows.length < 2) throw new Error("CSV is empty or contains only a header.");

            const header = rows.shift().toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''));

            // Find column indices
            const nameIndex = header.indexOf('name');
            const levelIndex = header.indexOf('level');
            const categoryIndex = header.indexOf('category');

            if (nameIndex === -1 || levelIndex === -1) {
                throw new Error("CSV must contain 'Name' and 'Level' columns.");
            }
            
            let blocksCreated = 0;
            const placementStart = { x: 100, y: 100 }; // Default placement position

            rows.forEach((row, rowIndex) => {
                const values = row.split(',').map(v => v.trim().replace(/"/g, ''));
                const blockName = values[nameIndex];
                const levelName = values[levelIndex];
                const categoryName = categoryIndex > -1 ? values[categoryIndex] : 'default';

                // Find the original block definition by name
                const blockKey = Object.keys(PREDEFINED_BLOCKS).find(key => PREDEFINED_BLOCKS[key].name === blockName);
                if (!blockKey) {
                    console.warn(`Could not find a predefined block named "${blockName}" from CSV row ${rowIndex + 1}. Skipping.`);
                    return;
                }

                const blockData = { ...PREDEFINED_BLOCKS[blockKey] }; // Create a copy
                blockData.category = categoryName; // Override category if specified in CSV

                // Create the block using similar logic to placeServiceBlock
                const blockWidth = blockData.width / state.scale.ratio;
                const blockHeight = blockData.height / state.scale.ratio;
                const colors = BLOCK_CATEGORY_COLORS[blockData.category || 'default'];
                const blockId = `SB-${state.serviceBlockCounter++}`;
                
                const rect = new fabric.Rect({ width: blockWidth, height: blockHeight, fill: colors.fill, stroke: colors.stroke, strokeWidth: 2, originX: 'center', originY: 'center', strokeUniform: true });
                const label = new fabric.Text(blockId, { fontSize: Math.min(blockWidth, blockHeight) * 0.2, fill: '#fff', backgroundColor: 'rgba(0,0,0,0.4)', originX: 'center', originY: 'center' });
                const lockIcon = new fabric.Text("🔒", { fontSize: Math.min(blockWidth, blockHeight) * 0.2, left: Math.min(blockWidth, blockHeight) * 0.2, originY: 'center', visible: true });
                
                const group = new fabric.Group([rect, label, lockIcon], {
                    left: placementStart.x + (blocksCreated % 10) * 15, // Stagger placement
                    top: placementStart.y + Math.floor(blocksCreated / 10) * 15,
                    originX: 'center', 
                    originY: 'center',
                    isServiceBlock: true, 
                    blockData: blockData, 
                    blockId: blockId, 
                    level: levelName, 
                    selectable: true,
                    evented: true,
                    lockScalingX: true,
                    lockScalingY: true,
                });
                
                state.serviceBlocks.push(group);
                state.canvas.add(group);
                blocksCreated++;
            });

            if (blocksCreated > 0) {
                document.getElementById('status-bar').textContent = `Successfully imported ${blocksCreated} service blocks.`;
                if (onComplete) onComplete();
            } else {
                document.getElementById('status-bar').textContent = 'Import complete, but no matching blocks were found to create.';
            }

        } catch (error) {
            console.error("CSV Import Error:", error);
            document.getElementById('status-bar').textContent = `Error importing CSV: ${error.message}`;
        }
    };
    reader.readAsText(file);
}