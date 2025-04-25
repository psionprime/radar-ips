import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.152.2/examples/jsm/controls/OrbitControls.js';

// Scene, camera, renderer
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x20232a);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 100);
camera.position.set(0, 8, 12);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Lights
scene.add(new THREE.AmbientLight(0x404040));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(5, 10, 7.5);
scene.add(dirLight);

// Ground plane (20m x 20m)
const planeGeo = new THREE.PlaneGeometry(20, 20);
const planeMat = new THREE.MeshStandardMaterial({ color: 0x808080, side: THREE.DoubleSide, transparent: true, opacity: 0.5 });
const plane = new THREE.Mesh(planeGeo, planeMat);
plane.rotation.x = -Math.PI/2;
scene.add(plane);
// Add a visible grid to the ground plane (20x20m, 5m spacing)
const gridHelper = new THREE.GridHelper(20, 4, 0xffffff, 0x888888); // 20m, 4 divisions = 5m spacing, white lines
// Adjust grid to sit just above the plane
gridHelper.position.y = 0.025;
scene.add(gridHelper);

// Anchor positions (corners of 10x10)
const anchorPositions = [
  new THREE.Vector3(-10, 0, -10),
  new THREE.Vector3(10, 0, -10),
  new THREE.Vector3(10, 0, 10),
  new THREE.Vector3(-10, 0, 10),
];
const anchorGeo = new THREE.SphereGeometry(0.1, 16, 16);
const anchorMat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
const anchorLabels = ['1', '2', '3', '4'];

// --- IMU Import and Instantiation ---
import { IMU } from './autoMode.js';
let imu = null;

anchorPositions.forEach((pos, i) => {
  const m = new THREE.Mesh(anchorGeo, anchorMat);
  m.position.copy(pos);
  scene.add(m);
  // Add anchor number label
  const canvas = document.createElement('canvas');
  canvas.width = 64; canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.font = 'bold 36px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 4;
  ctx.strokeText(anchorLabels[i], 32, 32);
  ctx.fillText(anchorLabels[i], 32, 32);
  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(0.6, 0.6, 1);
  sprite.position.copy(pos);
  sprite.position.y += 0.35;
  scene.add(sprite);
});

// Mobile device as a 3D diamond (octahedron)
const mobileGeo = new THREE.SphereGeometry(0.18, 32, 32);
const mobileMat = new THREE.MeshPhysicalMaterial({ color: 0xe75480, emissive: 0xe75480, emissiveIntensity: 0.75, metalness: 0.7, roughness: 0.1, transmission: 1, thickness: 0.15, ior: 2.4, reflectivity: 1, clearcoat: 1, clearcoatRoughness: 0.05, opacity: 0.95, transparent: true });
const mobile = new THREE.Mesh(mobileGeo, mobileMat);
mobile.castShadow = true;
mobile.position.set(0, 0, 0);
scene.add(mobile);

// Instantiate IMU after mobile is created
imu = new IMU(scene, mobile);

// Range lines
const lines = anchorPositions.map(pos => {
  const geo = new THREE.BufferGeometry().setFromPoints([mobile.position, pos]);
  const mat = new THREE.LineBasicMaterial({ color: 0xffffff });
  const l = new THREE.Line(geo, mat);
  scene.add(l);
  return { line: l, target: pos };
});

// Range circles for ToF simulation
const segmentCount = 64;
const circleLines = anchorPositions.map(pos => {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array((segmentCount + 1) * 3);
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.LineBasicMaterial({ color: 0x00ffff });
  const circle = new THREE.LineLoop(geometry, material);
  circle.position.y = 0.02;
  scene.add(circle);
  return { circle, pos };
});

// IMU simulation variables
let prevPosition = mobile.position.clone();
let prevVelocity = new THREE.Vector3();
let velocity = new THREE.Vector3();
let acceleration = new THREE.Vector3();
const imuArrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), mobile.position.clone(), 1, 0x00ff00);
scene.add(imuArrow);

// HTML info element
const info = document.getElementById('info');

// Keyboard controls
const speed = 0.1;
const keys = {};
let followPath = false;
document.getElementById('follow-path-checkbox').addEventListener('change', function(e) {
  followPath = this.checked;
  if (followPath && svgOverlayGroup && svgOverlayGroup.children.length > 0) {
    // Find closest point on overlay to anchor 1
    const anchor = anchorPositions[0];
    let closest = null, minDist = Infinity;
    svgOverlayGroup.children.forEach(child => {
      const positions = child.geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const y = positions.getY(i);
        const z = positions.getZ(i);
        const pt = new THREE.Vector3(x, y, z);
        const dist = pt.distanceTo(anchor);
        if (dist < minDist) { minDist = dist; closest = pt; }
      }
    });
    if (closest) {
      mobile.position.copy(closest);
    }
  }
});
window.addEventListener('keydown', e => {
  if (followPath) return;
  keys[e.key] = true;
  // Home key resets mobile to origin
  if (e.key === 'Home') {
    mobile.position.set(0, 0, 0);
  }
});
window.addEventListener('keyup', e => { if (!followPath) keys[e.key] = false; });

function updateMobile() {
  if (!followPath) {
    // Ctrl+Up/Down moves in y (depth)
    if ((keys['Control'] || keys['ControlLeft'] || keys['ControlRight']) && keys['ArrowUp']) {
      mobile.position.y += speed;
    }
    if ((keys['Control'] || keys['ControlLeft'] || keys['ControlRight']) && keys['ArrowDown']) {
      mobile.position.y -= speed;
    }
    // Up/Down (without Ctrl) move in z (vertical)
    if (!keys['Control'] && !keys['ControlLeft'] && !keys['ControlRight']) {
      if (keys['ArrowUp']) mobile.position.z -= speed;
      if (keys['ArrowDown']) mobile.position.z += speed;
    }
    if (keys['ArrowLeft'])  mobile.position.x -= speed;
    if (keys['ArrowRight']) mobile.position.x += speed;
  }
  lines.forEach(({line, target}) => {
    line.geometry.setFromPoints([mobile.position, target]);
  });

  // update range circles
  circleLines.forEach(({ circle, pos }) => {
    const r = mobile.position.distanceTo(pos);
    const positions = circle.geometry.attributes.position.array;
    for (let i = 0; i <= segmentCount; i++) {
      const theta = (i / segmentCount) * Math.PI * 2;
      positions[3 * i] = pos.x + r * Math.cos(theta);
      positions[3 * i + 1] = 0.02;
      positions[3 * i + 2] = pos.z + r * Math.sin(theta);
    }
    circle.geometry.attributes.position.needsUpdate = true;
  });

  // IMU simulation
  prevVelocity.copy(velocity);
  velocity.copy(mobile.position).sub(prevPosition);
  acceleration.copy(velocity).sub(prevVelocity);
  prevPosition.copy(mobile.position);
  if (velocity.length() > 0.001) {
    imuArrow.setDirection(velocity.clone().normalize());
  }
  imuArrow.position.copy(mobile.position);
  // update info display
  const pos = mobile.position;
  info.innerHTML = `Use arrow keys to move.<br>Speed: ${(velocity.length()*1000).toFixed(1)} mm/s<br>Accel: ${(acceleration.length()*1000).toFixed(1)} mm/s²<br>` +
    `Triangulated Position: x=${(pos.x).toFixed(3)}, y=${(pos.z).toFixed(3)}, z=${(pos.y).toFixed(3)} m` +
    '<br>' +
    (imu ? `IMU Position: x=${imu.getLocalPosition().x.toFixed(3)}, y=${imu.getLocalPosition().z.toFixed(3)}, z=${imu.getLocalPosition().y.toFixed(3)} m, heading=${imu.getHeading().toFixed(1)}°` : '');

}

// Resize
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
});

// --- SVG Overlay Logic ---
let svgOverlayGroup = null;
const svgInput = document.getElementById('svg-file-selector');
svgInput.addEventListener('change', function(e) {
  if (svgOverlayGroup) {
    scene.remove(svgOverlayGroup);
    svgOverlayGroup = null;
  }
  if (!this.files || this.files.length === 0) return;
  const file = this.files[0];
  const reader = new FileReader();
  reader.onload = function(evt) {
    const text = evt.target.result;
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(text, 'image/svg+xml');
    const vb = svgDoc.documentElement.getAttribute('viewBox')?.split(/\s+/).map(Number) || [0,0,10,10];
    const vbX = vb[0], vbY = vb[1], vbW = vb[2], vbH = vb[3];
    svgOverlayGroup = new THREE.Group();
    // Handle <circle>
    svgDoc.querySelectorAll('circle').forEach(circle => {
      const cx = parseFloat(circle.getAttribute('cx'));
      const cy = parseFloat(circle.getAttribute('cy'));
      const r = parseFloat(circle.getAttribute('r'));
      const segments = 128;
      const points = [];
      for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * 2 * Math.PI;
        points.push(new THREE.Vector3(
          cx + r * Math.cos(theta) - vbW/2,
          0.05, // y slightly above grid
          cy + r * Math.sin(theta) - vbH/2
        ));
      }
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const mat = new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 2 });
      const mesh = new THREE.LineLoop(geometry, mat);
      svgOverlayGroup.add(mesh);
      console.log('SVG <circle> overlayed:', {cx, cy, r});
    });
    // Handle <path>
    svgDoc.querySelectorAll('path').forEach(pathEl => {
      const d = pathEl.getAttribute('d');
      if (!d) return;
      const shape = parseSVGPathToShape(d);
      if (!shape) return;
      const points = shape.getPoints(256).map(p => new THREE.Vector3(p.x - vbW/2, 0.05, p.y - vbH/2));
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const mat = new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 2 });
      const mesh = new THREE.Line(geometry, mat);
      svgOverlayGroup.add(mesh);
      console.log('SVG <path> overlayed:', {d});
    });
    svgOverlayGroup.name = 'svgOverlayGroup';
    scene.add(svgOverlayGroup);
  };
  reader.readAsText(file);
});

// Minimal SVG path parser for M/L/C/Z (absolute only)
function parseSVGPathToShape(d) {
  try {
    const shape = new THREE.Shape();
    const cmd = /([MLCZmlcz])([^MLCZmlcz]*)/g;
    let match, pen = {x:0, y:0}, start={x:0,y:0};
    while ((match = cmd.exec(d))) {
      const [_, op, params] = match;
      const nums = params.trim().split(/[,\s]+/).map(Number).filter(n=>!isNaN(n));
      if (op === 'M' || op === 'm') {
        pen.x = (op==='M'?nums[0]:pen.x+nums[0]);
        pen.y = (op==='M'?nums[1]:pen.y+nums[1]);
        shape.moveTo(pen.x, pen.y);
        start = {x: pen.x, y: pen.y};
        nums.splice(0,2);
        for (let i=0; i<nums.length; i+=2) {
          pen.x = (op==='M'?nums[i]:pen.x+nums[i]);
          pen.y = (op==='M'?nums[i+1]:pen.y+nums[i+1]);
          shape.lineTo(pen.x, pen.y);
        }
      } else if (op === 'L' || op === 'l') {
        for (let i=0; i<nums.length; i+=2) {
          pen.x = (op==='L'?nums[i]:pen.x+nums[i]);
          pen.y = (op==='L'?nums[i+1]:pen.y+nums[i+1]);
          shape.lineTo(pen.x, pen.y);
        }
      } else if (op === 'C' || op === 'c') {
        for (let i=0; i<nums.length; i+=6) {
          const x1 = (op==='C'?nums[i]:pen.x+nums[i]);
          const y1 = (op==='C'?nums[i+1]:pen.y+nums[i+1]);
          const x2 = (op==='C'?nums[i+2]:pen.x+nums[i+2]);
          const y2 = (op==='C'?nums[i+3]:pen.y+nums[i+3]);
          const x = (op==='C'?nums[i+4]:pen.x+nums[i+4]);
          const y = (op==='C'?nums[i+5]:pen.y+nums[i+5]);
          shape.bezierCurveTo(x1, y1, x2, y2, x, y);
          pen.x = x; pen.y = y;
        }
      } else if (op === 'Z' || op === 'z') {
        shape.lineTo(start.x, start.y);
      }
    }
    return shape;
  } catch(e) { return null; }
}

// Animate
function animate() {
  requestAnimationFrame(animate);
  updateMobile();
  if (imu) imu.update();
  controls.update();
  renderer.render(scene, camera);
}
animate();
