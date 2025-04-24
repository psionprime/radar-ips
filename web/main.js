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
const planeMat = new THREE.MeshStandardMaterial({ color: 0x808080, side: THREE.DoubleSide });
const plane = new THREE.Mesh(planeGeo, planeMat);
plane.rotation.x = -Math.PI/2;
scene.add(plane);

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
const mobileGeo = new THREE.OctahedronGeometry(0.18);
const mobileMat = new THREE.MeshPhysicalMaterial({
  color: 0x00ffff,
  emissive: 0x00ffff,
  emissiveIntensity: 0.75,
  metalness: 0.7,
  roughness: 0.10,
  transmission: 1.0,
  thickness: 0.15,
  ior: 2.4,
  reflectivity: 1.0,
  clearcoat: 1.0,
  clearcoatRoughness: 0.05,
  opacity: 0.95,
  transparent: true
});
const mobile = new THREE.Mesh(mobileGeo, mobileMat);
mobile.castShadow = true;
mobile.position.set(0, 0, 0);
scene.add(mobile);

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
window.addEventListener('keydown', e => {
  keys[e.key] = true;
  // Home key resets mobile to origin
  if (e.key === 'Home') {
    mobile.position.set(0, 0, 0);
  }
});
window.addEventListener('keyup', e => { keys[e.key] = false; });

function updateMobile() {
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
    `Position: x=${(pos.x).toFixed(3)}, y=${(pos.z).toFixed(3)}, z=${(pos.y).toFixed(3)} m`;

}

// Resize
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
});

// Animate
function animate() {
  requestAnimationFrame(animate);
  updateMobile();
  controls.update();
  renderer.render(scene, camera);
}
animate();
