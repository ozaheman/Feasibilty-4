import * as THREE from "three";
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { state } from './state.js';
import { LEVEL_ORDER, LEVEL_DEFINITIONS, LEVEL_HEIGHTS, BLOCK_CATEGORY_COLORS } from './config.js';
import { orthogonalizePolygon } from './utils.js';
import { layoutFlatsOnPolygon } from "./apartmentLayout.js";

let scene, camera, renderer, controls, buildingGroup, animationFrameId;

export function  init3D() {
    const threedCanvas = document.getElementById('threed-canvas');
    if (!threedCanvas) return;
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x282c34);
    camera = new THREE.PerspectiveCamera(75, 1, 0.1, 2000);
    camera.position.set(50, 50, 50);
    renderer = new THREE.WebGLRenderer({ canvas: threedCanvas, antialias: true });
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 100, 25);
    scene.add(directionalLight);
    controls = new OrbitControls(camera, renderer.domElement);
    buildingGroup = new THREE.Group();
    scene.add(buildingGroup);
    document.getElementById('close-threed-modal').addEventListener('click', hide3DModal);
    window.addEventListener('resize', onWindowResize);
}
export function  onWindowResize() {
    if (document.getElementById('threed-modal').style.display !== 'flex') return;
    const canvasContainer = document.getElementById('threed-modal-content');
    if (canvasContainer.clientWidth > 0 && canvasContainer.clientHeight > 0) {
        renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
        camera.aspect = canvasContainer.clientWidth / canvasContainer.clientHeight;
        camera.updateProjectionMatrix();
    }
}
export function  animate3D() {
    animationFrameId = requestAnimationFrame(animate3D);
    controls.update();
    renderer.render(scene, camera);
}
export function  show3DModal() {
    document.getElementById('threed-modal').style.display = 'flex';
    onWindowResize();
    animate3D();
}
export function  hide3DModal() {
    document.getElementById('threed-modal').style.display = 'none';
    if (animationFrameId) { cancelAnimationFrame(animationFrameId); }
}
export function  getUIParams() {
    const params = {};
    document.querySelectorAll('.param-input').forEach(input => { params[input.id] = parseInt(input.value) || 0; });
    return params;
}
export function  calculateCenterOffset(points) {
    if (points.length === 0) return { x: 0, y: 0 };
    const bounds = points.reduce((acc, p) => ({
        minX: Math.min(acc.minX, p.x), minY: Math.min(acc.minY, p.y),
        maxX: Math.max(acc.maxX, p.x), maxY: Math.max(acc.maxY, p.y)
    }), { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });
    return { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2 };
}
export function  createExtrudedMesh(pointsArray, height, color, centerOffset) {
    const shapePoints = pointsArray.map(p => new THREE.Vector2(
        (p.x - centerOffset.x) * state.scale.ratio,
        -(p.y - centerOffset.y) * state.scale.ratio
    ));
    const shape = new THREE.Shape(shapePoints);
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false });
    const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(color.replace(/, 0\.\d+\)/, ')')),
        transparent: true, opacity: 0.7, side: THREE.DoubleSide
    });
    return new THREE.Mesh(geometry, material);
}

export function  generate3DBuilding() {
    if (state.scale.ratio === 0) {
        document.getElementById('status-bar').textContent = "Please set the scale before generating a 3D model.";
        return;
    }
    while (buildingGroup.children.length > 0) buildingGroup.remove(buildingGroup.children[0]);
    
    const allFootprints = Object.values(state.levels).flatMap(level => level.objects.filter(o => o.isFootprint));
    if (allFootprints.length === 0) {
        document.getElementById('status-bar').textContent = "No building footprints drawn to generate a 3D model.";
        return;
    }

    const showApts = document.getElementById('show-apartments-3d').checked;
    const showBalconies = document.getElementById('show-balconies-3d').checked;
    const showServiceBlocks = document.getElementById('show-service-blocks-3d').checked;
    const showAffectionPlan = document.getElementById('show-affection-plan-3d').checked;
    const showTypicalPolygon = document.getElementById('show-typical-polygon-3d').checked;
    
    const allPoints = allFootprints.flatMap(f => f.points);
    const centerOffset = calculateCenterOffset(allPoints);
    const uiParams = getUIParams();

    let currentZ = 0;
    
    // Basements
    if (uiParams.numBasements > 0) {
        const height = LEVEL_HEIGHTS['Basement'] || LEVEL_HEIGHTS.default;
        for (let i = 0; i < uiParams.numBasements; i++) {
            currentZ -= height;
            state.levels['Basement'].objects.filter(o => o.isFootprint).forEach(footprint => {
                const mesh = createExtrudedMesh(footprint.points, height, LEVEL_DEFINITIONS['Basement'].color, centerOffset);
                mesh.position.z = currentZ;
                buildingGroup.add(mesh);
            });
        }
    }
    currentZ = 0; // Reset for above ground

    // Standard Levels
    const standardLevels = LEVEL_ORDER.filter(l => !l.startsWith('Basement'));
    standardLevels.forEach(levelName => {
        const levelDef = LEVEL_DEFINITIONS[levelName];
        const numFloors = levelDef.countKey ? (uiParams[levelDef.countKey] || (levelName.includes('Last') ? 0 : 1)) : 1;
        const height = LEVEL_HEIGHTS[levelName] || LEVEL_HEIGHTS.default;
        
        for (let i = 0; i < numFloors; i++) {
            // Footprint
            state.levels[levelName].objects.filter(o => o.isFootprint).forEach(footprint => {
                const isTypical = levelName === 'Typical_Floor' || levelName === 'Hotel';
                if (!isTypical || (isTypical && showTypicalPolygon) || (isTypical && !showApts)) {
                    const mesh = createExtrudedMesh(footprint.points, height, levelDef.color, centerOffset);
                    mesh.position.z = currentZ;
                    buildingGroup.add(mesh);
                }

                // Apartments
                if (showApts && state.lastCalculatedData && (levelName === 'Typical_Floor' || levelName === 'Hotel')) {
                    const layout = layoutFlatsOnPolygon(footprint, state.lastCalculatedData.aptCalcs.aptMixWithCounts.reduce((acc, apt) => ({...acc, [apt.key]: apt.countPerFloor}), {}));
                    layout.placedFlats.forEach(flat => {
                        const aptGeo = new THREE.BoxGeometry(flat.type.frontage, flat.type.depth, height * 0.95);
                        const aptMat = new THREE.MeshStandardMaterial({ color: flat.type.color });
                        const aptMesh = new THREE.Mesh(aptGeo, aptMat);
                        
                        aptMesh.position.set(
                            (flat.center.x - centerOffset.x) * state.scale.ratio,
                            -(flat.center.y - centerOffset.y) * state.scale.ratio,
                            currentZ + height / 2
                        );
                        aptMesh.rotation.z = -flat.angle;
                        buildingGroup.add(aptMesh);

                        if(showBalconies && flat.type.balconyMultiplier > 0) {
                             const balconyGeo = new THREE.BoxGeometry(flat.type.frontage * (flat.type.balconyCoverage/100), flat.type.balconyMultiplier, height * 0.95);
                             const balconyMat = new THREE.MeshStandardMaterial({ color: 0x888888, transparent: true, opacity: 0.5 });
                             const balconyMesh = new THREE.Mesh(balconyGeo, balconyMat);
                             balconyMesh.position.set(
                                (flat.balconyCenter.x - centerOffset.x) * state.scale.ratio,
                                -(flat.balconyCenter.y - centerOffset.y) * state.scale.ratio,
                                currentZ + height / 2
                            );
                            balconyMesh.rotation.z = -flat.angle;
                            buildingGroup.add(balconyMesh);
                        }
                    });
                }
            });

             // Service Blocks
            if (showServiceBlocks) {
                state.serviceBlocks.filter(b => b.level === levelName).forEach(block => {
                    const width = block.getScaledWidth() * state.scale.ratio;
                    const depth = block.getScaledHeight() * state.scale.ratio;
                    const blockGeo = new THREE.BoxGeometry(width, depth, height);
                    const color = BLOCK_CATEGORY_COLORS[block.blockData.category]?.fill || '#800080';
                    const blockMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(color) });
                    const blockMesh = new THREE.Mesh(blockGeo, blockMat);
                    blockMesh.position.set(
                        (block.left - centerOffset.x) * state.scale.ratio,
                        -(block.top - centerOffset.y) * state.scale.ratio,
                        currentZ + height / 2
                    );
                    blockMesh.rotation.z = -fabric.util.degreesToRadians(block.angle);
                    buildingGroup.add(blockMesh);
                });
            }

            currentZ += height;
        }
    });

    if (showAffectionPlan && state.canvas.backgroundImage) {
        const bg = state.canvas.backgroundImage;
        const planeGeo = new THREE.PlaneGeometry(bg.width * state.scale.ratio, bg.height * state.scale.ratio);
        const texture = new THREE.TextureLoader().load(bg.getSrc());
        const planeMat = new THREE.MeshStandardMaterial({ map: texture });
        const planeMesh = new THREE.Mesh(planeGeo, planeMat);
        planeMesh.position.set(0, 0, -1); // Slightly below the building
        buildingGroup.add(planeMesh);
    }
    
    show3DModal();
}
export function  generateOpenScadScript() { 
    document.getElementById('status-bar').textContent = "OpenSCAD export functionality is pending implementation.";
}