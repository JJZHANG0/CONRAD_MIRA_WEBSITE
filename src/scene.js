import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import './styles.css';

const SEED = 20261116;
const DURATION = 24;
const SURFACE_Y = 2.2;
const BOTTOM_Y = -7.25;
const WATER_W = 18;
const WATER_D = 12;
const PALETTE = {
  sky: 0x06131d,
  ice: 0xd8f3f6,
  cyan: 0x62d8e8,
  blue: 0x3478ef,
  teal: 0x39d5c9,
  yellow: 0xf0ca59,
  red: 0xf36d61,
};

function mulberry32(a) {
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(SEED);
const clamp = THREE.MathUtils.clamp;
const tempV = new THREE.Vector3();
const tempV2 = new THREE.Vector3();
const tempColor = new THREE.Color();
const dummy = new THREE.Object3D();

function init() {
  const mount = document.getElementById('scene');
  const shell = mount.closest('.scene-shell');
  const mode = shell.dataset.sceneMode;
  const isProduct = mode === 'product';
  const isExplore = mode === 'explore';
  const zh = document.documentElement.lang === 'zh-CN';
  const tr = (en, cn) => zh ? cn : en;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let width = mount.clientWidth;
  let height = mount.clientHeight;
  const pointer = new THREE.Vector2();
  const smoothPointer = new THREE.Vector2();
  const cameraOffset = new THREE.Vector3();
  let userInteracting = false;
  let viewTransition = null;
  let cameraView = 'overview';
  let inViewport = true;

  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setSize(width, height);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  mount.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.sky);
  scene.fog = new THREE.Fog(PALETTE.sky, 31, 82);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  scene.environment = pmrem.fromScene(room, 0.04).texture;
  scene.environmentIntensity = 0.52;
  room.dispose();
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 240);
  const desktopCamera = isProduct ? new THREE.Vector3(8, 7.3, 10.5) : new THREE.Vector3(20.5, 8.5, 25.5);
  const mobileCamera = isProduct ? new THREE.Vector3(13, 11, 17) : mode === 'home' ? new THREE.Vector3(24, 10, 30) : new THREE.Vector3(35, 14, 43);
  camera.position.copy(width < 760 ? mobileCamera : desktopCamera);
  const controls = new OrbitControls(camera, renderer.domElement);
  function defaultTarget() {
    return isProduct ? new THREE.Vector3(0, 4.7, 0) : new THREE.Vector3(width < 760 ? -0.2 : -3.1, width < 760 && mode !== 'home' ? 3.8 : -1.6, 0);
  }
  controls.target.copy(defaultTarget());
  controls.enableDamping = true;
  controls.dampingFactor = 0.055;
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.minPolarAngle = 0.55;
  controls.maxPolarAngle = 1.47;
  controls.rotateSpeed = 0.42;
  controls.saveState();
  controls.addEventListener('start', () => { userInteracting = true; viewTransition = null; });
  controls.addEventListener('end', () => { userInteracting = false; });
  mount.addEventListener('pointermove', e => {
    const rect = mount.getBoundingClientRect();
    pointer.set(((e.clientX - rect.left) / rect.width - .5) * 2, ((e.clientY - rect.top) / rect.height - .5) * 2);
  });
  mount.addEventListener('pointerleave', () => pointer.set(0, 0));
  new IntersectionObserver(entries => { inViewport = entries[0].isIntersecting; }, { threshold: 0 }).observe(shell);

  const world = new THREE.Group();
  scene.add(world);
  const dataWorld = new THREE.Group();
  world.add(dataWorld);

  const hemi = new THREE.HemisphereLight(0xa8dded, 0x07131e, 1.55);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xe8f6f3, 3.3);
  key.position.set(-8, 18, 12);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -14;
  key.shadow.camera.right = 14;
  key.shadow.camera.top = 14;
  key.shadow.camera.bottom = -14;
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 48;
  key.shadow.normalBias = 0.035;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x2d8fca, 2.0);
  fill.position.set(12, 3, -10);
  scene.add(fill);
  const bounce = new THREE.PointLight(0x2fd5dc, 16, 24, 2);
  bounce.position.set(2, -5, 2);
  scene.add(bounce);

  const materials = {
    hull: new THREE.MeshPhysicalMaterial({ color: 0x6a858e, metalness: 0.62, roughness: 0.3, clearcoat: 0.55, clearcoatRoughness: 0.24, envMapIntensity: 0.85 }),
    deck: new THREE.MeshPhysicalMaterial({ color: 0x536d78, metalness: 0.56, roughness: 0.34, clearcoat: 0.35, envMapIntensity: 0.75 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x081219, metalness: 0.75, roughness: 0.26 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x8fa8ae, metalness: 0.92, roughness: 0.2 }),
    solar: new THREE.MeshPhysicalMaterial({ color: 0x0b3156, metalness: 0.45, roughness: 0.18, clearcoat: 0.85, clearcoatRoughness: 0.12 }),
    cyan: new THREE.MeshBasicMaterial({ color: PALETTE.cyan, toneMapped: false }),
  };

  function mesh(geometry, material, parent, position = [0, 0, 0]) {
    const item = new THREE.Mesh(geometry, material);
    item.position.set(...position);
    item.castShadow = true;
    item.receiveShadow = true;
    parent.add(item);
    return item;
  }

  function rounded(parent, size, position, material, radius = 0.08) {
    return mesh(new RoundedBoxGeometry(size[0], size[1], size[2], 3, radius), material, parent, position);
  }

  function createHullGeometry(length = 4.8, width = 0.72, height = 0.62) {
    const rings = 15;
    const sides = 10;
    const positions = [];
    const indices = [];
    for (let r = 0; r < rings; r++) {
      const t = r / (rings - 1);
      const taper = Math.pow(Math.sin(Math.PI * t), 0.36) * 0.88 + 0.12;
      const bowLift = Math.pow(Math.abs(t - 0.5) * 2, 3) * 0.22;
      for (let s = 0; s < sides; s++) {
        const a = (s / sides) * Math.PI * 2;
        positions.push(Math.cos(a) * width * taper, Math.sin(a) * height * taper + bowLift, (t - 0.5) * length);
      }
    }
    for (let r = 0; r < rings - 1; r++) {
      for (let s = 0; s < sides; s++) {
        const n = (s + 1) % sides;
        const a = r * sides + s;
        const b = r * sides + n;
        const c = (r + 1) * sides + n;
        const d = (r + 1) * sides + s;
        indices.push(a, b, d, b, c, d);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  }

  function createRobot() {
    const robot = new THREE.Group();
    const hullGeometry = createHullGeometry();
    [-1.36, 1.36].forEach((x) => {
      const hull = mesh(hullGeometry, materials.hull, robot, [x, 0, 0]);
      hull.castShadow = true;
      rounded(robot, [0.12, 0.05, 3.5], [x, 0.44, 0], materials.metal, 0.025);
      const ring = mesh(new THREE.TorusGeometry(0.53, 0.105, 10, 32), materials.dark, robot, [x, 0.03, 2.33]);
      ring.castShadow = false;
      const hub = mesh(new THREE.CylinderGeometry(0.13, 0.16, 0.32, 16), materials.metal, robot, [x, 0.03, 2.36]);
      hub.rotation.x = Math.PI / 2;
      for (let b = 0; b < 5; b++) {
        const a = (b / 5) * Math.PI * 2;
        const blade = rounded(robot, [0.12, 0.42, 0.06], [x + Math.cos(a) * 0.23, 0.03 + Math.sin(a) * 0.23, 2.34], materials.hull, 0.025);
        blade.rotation.z = a - 0.35;
      }
    });
    rounded(robot, [3.7, 0.32, 3.9], [0, 0.5, 0], materials.deck, 0.15);
    rounded(robot, [4.45, 0.12, 4.15], [0, 0.77, 0], materials.dark, 0.1);
    rounded(robot, [4.18, 0.055, 3.87], [0, 0.845, 0], materials.metal, 0.055);
    rounded(robot, [4.05, 0.065, 3.74], [0, 0.885, 0], materials.solar, 0.04);

    const cellGeometry = new RoundedBoxGeometry(0.49, 0.022, 0.65, 2, 0.025);
    const cells = new THREE.InstancedMesh(cellGeometry, materials.solar, 42);
    let cellIndex = 0;
    for (let z = 0; z < 6; z++) {
      for (let x = 0; x < 7; x++) {
        dummy.position.set((x - 3) * 0.55, 0.932, (z - 2.5) * 0.61);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        cells.setMatrixAt(cellIndex++, dummy.matrix);
      }
    }
    cells.castShadow = true;
    robot.add(cells);
    const panelLines = [];
    for (let x=0; x<8; x++) {
      const px=(x-3.5)*.55;
      panelLines.push(new THREE.Vector3(px,.947,-1.82),new THREE.Vector3(px,.947,1.82));
    }
    for (let z=0; z<7; z++) {
      const pz=(z-3)*.61;
      panelLines.push(new THREE.Vector3(-1.94,.947,pz),new THREE.Vector3(1.94,.947,pz));
    }
    robot.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(panelLines),new THREE.LineBasicMaterial({color:0x9ab7d1,transparent:true,opacity:.42})));


    const mast = new THREE.Group();
    mast.position.set(0.72, 0.95, -0.2);
    robot.add(mast);
    mesh(new THREE.CylinderGeometry(0.055, 0.075, 1.55, 12), materials.metal, mast, [0, 0.77, 0]);
    mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.13, 24), materials.dark, mast, [0, 1.58, 0]);
    mesh(new THREE.CylinderGeometry(0.21, 0.24, 0.12, 24), materials.cyan, mast, [0, 1.7, 0]);
    const cap = mesh(new THREE.SphereGeometry(0.21, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: 0xd5e5e6, metalness: 0.3, roughness: 0.18, clearcoat: 0.8 }), mast, [0, 1.76, 0]);
    cap.scale.y = 0.55;
    mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.8, 8), materials.dark, mast, [-0.32, 0.9, 0]);
    const weather = mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.34, 16), materials.metal, mast, [-0.32, 1.32, 0]);
    weather.material = materials.metal;
    for (let i = 0; i < 5; i++) {
      mesh(new THREE.TorusGeometry(0.13, 0.014, 6, 18), materials.dark, mast, [-0.32, 1.2 + i * 0.06, 0]).rotation.x = Math.PI / 2;
    }

    [-1, 1].forEach((side) => {
      rounded(robot, [0.75, 0.32, 0.85], [side * 1.75, 0.6, 1.18], materials.hull, 0.08);
      const lamp = rounded(robot, [0.42, 0.08, 0.04], [side * 1.75, 0.67, 1.62], materials.cyan, 0.025);
      lamp.castShadow = false;
    });

    const cable = mesh(new THREE.CylinderGeometry(0.012, 0.012, 1, 8), materials.metal, robot, [0, 0, 0]);
    cable.castShadow = false;
    const probe = new THREE.Group();
    robot.add(probe);
    mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.85, 20), materials.hull, probe, [0, -0.25, 0]);
    mesh(new THREE.CylinderGeometry(0.145, 0.145, 0.07, 20), materials.cyan, probe, [0, 0.02, 0]);
    mesh(new THREE.CylinderGeometry(0.11, 0.08, 0.35, 16), materials.metal, probe, [0, -0.84, 0]);
    mesh(new THREE.SphereGeometry(0.09, 16, 10), materials.dark, probe, [0, -1.03, 0]);
    const beamMaterial = new THREE.MeshBasicMaterial({ color: 0x5be1eb, transparent: true, opacity: 0.075, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const beam = mesh(new THREE.CylinderGeometry(0.05, 0.58, 1, 24, 1, true), beamMaterial, probe, [0, -1.5, 0]);
    beam.castShadow = false;
    robot.userData = { cable, probe, beam };
    return robot;
  }

  const robot = createRobot();
  robot.scale.setScalar(0.86);
  world.add(robot);

  const pathPoints = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    pathPoints.push(new THREE.Vector3(Math.cos(a) * 3.6 - 0.4, SURFACE_Y + 0.035, Math.sin(a) * 2.25));
  }
  const path = new THREE.CatmullRomCurve3(pathPoints, true, 'catmullrom', 0.35);
  const pathMesh = new THREE.Mesh(
    new THREE.TubeGeometry(path, 180, 0.018, 5, true),
    new THREE.MeshBasicMaterial({ color: 0x65dceb, transparent: true, opacity: 0.52, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
  );
  dataWorld.add(pathMesh);

  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = shadowCanvas.height = 128;
  const shadowCtx = shadowCanvas.getContext('2d');
  const gradient = shadowCtx.createRadialGradient(64, 64, 3, 64, 64, 62);
  gradient.addColorStop(0, 'rgba(0,5,10,0.65)');
  gradient.addColorStop(0.55, 'rgba(0,5,10,0.24)');
  gradient.addColorStop(1, 'rgba(0,5,10,0)');
  shadowCtx.fillStyle = gradient;
  shadowCtx.fillRect(0, 0, 128, 128);
  const robotShadow = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 5.6), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shadowCanvas), transparent: true, depthWrite: false, opacity: 0.62 }));
  robotShadow.rotation.x = -Math.PI / 2;
  robotShadow.position.y = SURFACE_Y + 0.025;
  world.add(robotShadow);

  const pathParticleCount = 100;
  const pathParticlePositions = new Float32Array(pathParticleCount * 3);
  const pathParticleGeometry = new THREE.BufferGeometry();
  pathParticleGeometry.setAttribute('position', new THREE.BufferAttribute(pathParticlePositions, 3));
  const pathParticles = new THREE.Points(pathParticleGeometry, new THREE.PointsMaterial({ color: 0x8af1f4, size: 0.065, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  dataWorld.add(pathParticles);

  const waterSurfaceMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(0x1c7c98) },
      uGrid: { value: new THREE.Color(0x6ac6d7) },
    },
    vertexShader: `
      uniform float uTime;
      varying vec2 vUv;
      varying vec3 vWorld;
      void main() {
        vUv = uv;
        vec3 p = position;
        p.z += sin(p.x * 0.72 + uTime) * 0.035 + cos(p.y * 0.91 - uTime) * 0.026;
        vec4 world = modelMatrix * vec4(p, 1.0);
        vWorld = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform vec3 uGrid;
      varying vec2 vUv;
      varying vec3 vWorld;
      float gridLine(vec2 p, float scale) {
        vec2 q = abs(fract(p * scale - 0.5) - 0.5) / fwidth(p * scale);
        return 1.0 - min(min(q.x, q.y), 1.0);
      }
      void main() {
        float edge = smoothstep(0.0, 0.12, vUv.x) * smoothstep(0.0, 0.12, vUv.y) * smoothstep(0.0, 0.12, 1.0-vUv.x) * smoothstep(0.0, 0.12, 1.0-vUv.y);
        float grid = gridLine(vUv, 18.0) * 0.12 + gridLine(vUv, 6.0) * 0.15;
        float sweep = pow(max(0.0, sin(vWorld.x * 0.18 + vWorld.z * 0.22)), 18.0) * 0.08;
        vec3 color = mix(uColor, uGrid, grid + sweep);
        gl_FragColor = vec4(color, (0.12 + grid + sweep) * edge);
      }
    `,
  });
  const waterSurface = new THREE.Mesh(new THREE.PlaneGeometry(WATER_W, WATER_D, 90, 60), waterSurfaceMaterial);
  waterSurface.rotation.x = -Math.PI / 2;
  waterSurface.position.y = SURFACE_Y;
  waterSurface.renderOrder = 4;
  world.add(waterSurface);

  const waterSkin = new THREE.Mesh(
    new THREE.BoxGeometry(WATER_W, SURFACE_Y - BOTTOM_Y, WATER_D),
    new THREE.MeshPhysicalMaterial({ color: 0x0b5470, transparent: true, opacity: 0.025, roughness: 0.18, metalness: 0.05, depthWrite: false, side: THREE.BackSide }),
  );
  waterSkin.position.y = (SURFACE_Y + BOTTOM_Y) / 2;
  waterSkin.renderOrder = -2;
  world.add(waterSkin);
  const bounds = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(WATER_W, SURFACE_Y - BOTTOM_Y, WATER_D)),
    new THREE.LineBasicMaterial({ color: 0x70c7d9, transparent: true, opacity: 0.15 }),
  );
  bounds.position.y = (SURFACE_Y + BOTTOM_Y) / 2;
  dataWorld.add(bounds);

  const layerMaterials = [];
  function createLayer(y, index) {
    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: {
        uColor: { value: new THREE.Color(index === 2 ? 0x4b9fc3 : 0x54d4dd) },
        uAlpha: { value: 0.12 },
        uActive: { value: 0 },
      },
      vertexShader: `varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragmentShader: `
        varying vec2 vUv; uniform vec3 uColor; uniform float uAlpha; uniform float uActive;
        void main(){
          vec2 p=(vUv-.5)*vec2(18.,12.);
          float grid=1.-min(min(abs(fract(p.x)-.5),abs(fract(p.y)-.5))*38.,1.);
          float r=length(p-vec2(2.8,-.8));
          float contour=1.-smoothstep(.0,.09,abs(fract(r*.42)-.5));
          float edge=smoothstep(0.,.08,vUv.x)*smoothstep(0.,.08,vUv.y)*smoothstep(0.,.08,1.-vUv.x)*smoothstep(0.,.08,1.-vUv.y);
          float alpha=(grid*.16+contour*.12+.018+uActive*.045)*edge*uAlpha*5.;
          gl_FragColor=vec4(uColor,alpha);
        }
      `,
    });
    layerMaterials.push(material);
    const layer = new THREE.Mesh(new THREE.PlaneGeometry(WATER_W - 0.25, WATER_D - 0.25), material);
    layer.rotation.x = -Math.PI / 2;
    layer.position.y = y;
    layer.renderOrder = 2 + index;
    dataWorld.add(layer);
    const outline = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(WATER_W - 0.25, WATER_D - 0.25)), new THREE.LineBasicMaterial({ color: 0x6fcbdc, transparent: true, opacity: 0.1 }));
    outline.rotation.x = -Math.PI / 2;
    outline.position.y = y;
    dataWorld.add(outline);
  }
  [0.55, -2.05, -4.65].forEach(createLayer);

  const scanPlaneMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: { uColor: { value: new THREE.Color(0x76e5ed) }, uAlpha: { value: 0.22 } },
    vertexShader: `varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: `varying vec2 vUv; uniform vec3 uColor; uniform float uAlpha; void main(){vec2 p=abs(vUv-.5)*2.; float edge=1.-smoothstep(.72,1.,max(p.x,p.y)); float ring=1.-smoothstep(0.,.035,abs(length((vUv-.5)*vec2(1.5,1.))-.25)); gl_FragColor=vec4(uColor,(edge*.035+ring*.12)*uAlpha);}`,
  });
  const scanPlane = new THREE.Mesh(new THREE.PlaneGeometry(WATER_W + 0.3, WATER_D + 0.3), scanPlaneMaterial);
  scanPlane.rotation.x = -Math.PI / 2;
  scanPlane.position.y = 0;
  dataWorld.add(scanPlane);

  const fieldFunctions = {
    do(x, z) {
      const main = Math.exp(-((x - 3.2) ** 2 / 11 + (z + 0.7) ** 2 / 7));
      const side = Math.exp(-((x + 4.8) ** 2 / 7 + (z - 2.4) ** 2 / 5)) * 0.55;
      return clamp(0.1 + main * 0.9 + side + Math.sin(x * 0.55 + z * 0.4) * 0.045, 0, 1);
    },
    temp(x, z) {
      return clamp(0.12 + Math.exp(-((x + 1.8) ** 2 / 25 + (z - 1.5) ** 2 / 12)) * 0.62 + Math.cos(z * 0.6) * 0.06, 0, 1);
    },
    ph(x, z) {
      return clamp(0.12 + Math.exp(-((x - 4.5) ** 2 / 16 + (z - 2.8) ** 2 / 8)) * 0.66 + Math.sin(x * 0.38) * 0.05, 0, 1);
    },
  };

  function fieldColor(value, target = new THREE.Color()) {
    const stops = [new THREE.Color(PALETTE.blue), new THREE.Color(PALETTE.teal), new THREE.Color(PALETTE.yellow), new THREE.Color(PALETTE.red)];
    if (value < 0.34) return target.copy(stops[0]).lerp(stops[1], value / 0.34);
    if (value < 0.68) return target.copy(stops[1]).lerp(stops[2], (value - 0.34) / 0.34);
    return target.copy(stops[2]).lerp(stops[3], (value - 0.68) / 0.32);
  }

  const terrainGeometry = new THREE.PlaneGeometry(WATER_W - 0.35, WATER_D - 0.35, 82, 56);
  terrainGeometry.rotateX(-Math.PI / 2);
  const terrainPositions = terrainGeometry.attributes.position;
  const terrainColors = new Float32Array(terrainPositions.count * 3);
  terrainGeometry.setAttribute('color', new THREE.BufferAttribute(terrainColors, 3));
  const terrainMaterial = new THREE.MeshStandardMaterial({ color: 0x617786, vertexColors: true, transparent: true, opacity: 0.9, roughness: 0.72, metalness: 0.12, emissive: 0x010407, emissiveIntensity: 0.25, envMapIntensity: 0.12, side: THREE.DoubleSide });
  const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
  terrain.receiveShadow = true;
  dataWorld.add(terrain);
  const terrainWire = new THREE.Mesh(terrainGeometry, new THREE.MeshBasicMaterial({ color: 0xb7eef1, wireframe: true, transparent: true, opacity: 0.055, depthWrite: false }));
  terrainWire.position.y = 0.018;
  dataWorld.add(terrainWire);

  const base = rounded(world, [WATER_W + 0.3, 0.28, WATER_D + 0.3], [0, BOTTOM_Y - 0.35, 0], new THREE.MeshStandardMaterial({ color: 0x091923, metalness: 0.65, roughness: 0.48 }), 0.09);
  base.castShadow = false;
  const baseEdges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(WATER_W + 0.32, 0.3, WATER_D + 0.32)), new THREE.LineBasicMaterial({ color: 0x508ca2, transparent: true, opacity: 0.2 }));
  baseEdges.position.set(0, BOTTOM_Y - 0.35, 0);
  world.add(baseEdges);

  const columnCount = 320;
  const columnGeometry = new THREE.CylinderGeometry(0.035, 0.1, 1, 6, 1, true);
  const columnMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.14, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const columns = new THREE.InstancedMesh(columnGeometry, columnMaterial, columnCount);
  columns.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  dataWorld.add(columns);

  const volumeCount = 1900;
  const volumePositions = new Float32Array(volumeCount * 3);
  const volumeColors = new Float32Array(volumeCount * 3);
  const volumeSeeds = [];
  for (let i = 0; i < volumeCount; i++) {
    const x = (rand() - 0.5) * (WATER_W - 0.6);
    const z = (rand() - 0.5) * (WATER_D - 0.6);
    const h = 0.15 + rand() * 2.6;
    volumeSeeds.push({ x, z, h });
  }
  const volumeGeometry = new THREE.BufferGeometry();
  volumeGeometry.setAttribute('position', new THREE.BufferAttribute(volumePositions, 3));
  volumeGeometry.setAttribute('color', new THREE.BufferAttribute(volumeColors, 3));
  const volumePoints = new THREE.Points(volumeGeometry, new THREE.PointsMaterial({ size: 0.035, vertexColors: true, transparent: true, opacity: 0.34, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true }));
  dataWorld.add(volumePoints);

  const columnSeeds = Array.from({ length: columnCount }, (_, i) => {
    const gx = i % 20;
    const gz = Math.floor(i / 20);
    return {
      x: -8.45 + gx * (16.9 / 19) + (rand() - 0.5) * 0.15,
      z: -5.45 + gz * (10.9 / 15) + (rand() - 0.5) * 0.15,
    };
  });

  let activeMetric = 'do';
  function updateTerrain(metric = activeMetric) {
    activeMetric = metric;
    const field = fieldFunctions[metric];
    for (let i = 0; i < terrainPositions.count; i++) {
      const x = terrainPositions.getX(i);
      const z = terrainPositions.getZ(i);
      const risk = field(x, z);
      const micro = Math.sin(x * 1.5 + z * 0.8) * Math.cos(z * 1.3) * 0.045;
      const y = BOTTOM_Y + 0.18 + risk * 2.25 + micro;
      terrainPositions.setY(i, y);
      fieldColor(risk, tempColor);
      terrainColors[i * 3] = tempColor.r;
      terrainColors[i * 3 + 1] = tempColor.g;
      terrainColors[i * 3 + 2] = tempColor.b;
    }
    terrainPositions.needsUpdate = true;
    terrainGeometry.attributes.color.needsUpdate = true;
    terrainGeometry.computeVertexNormals();

    for (let i = 0; i < columnCount; i++) {
      const { x, z } = columnSeeds[i];
      const risk = field(x, z);
      const h = 0.12 + risk * risk * 2.65;
      dummy.position.set(x, BOTTOM_Y + 0.25 + risk * 2.25 + h / 2, z);
      dummy.scale.set(1, h, 1);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      columns.setMatrixAt(i, dummy.matrix);
      columns.setColorAt(i, fieldColor(risk, tempColor));
    }
    columns.instanceMatrix.needsUpdate = true;
    if (columns.instanceColor) columns.instanceColor.needsUpdate = true;

    for (let i = 0; i < volumeCount; i++) {
      const seed = volumeSeeds[i];
      const risk = field(seed.x, seed.z);
      volumePositions[i * 3] = seed.x;
      volumePositions[i * 3 + 1] = BOTTOM_Y + 0.3 + risk * 2.25 + seed.h * (0.3 + risk * 0.7);
      volumePositions[i * 3 + 2] = seed.z;
      fieldColor(risk, tempColor);
      volumeColors[i * 3] = tempColor.r;
      volumeColors[i * 3 + 1] = tempColor.g;
      volumeColors[i * 3 + 2] = tempColor.b;
    }
    volumeGeometry.attributes.position.needsUpdate = true;
    volumeGeometry.attributes.color.needsUpdate = true;
  }
  updateTerrain();

  const moteCount = 1050;
  const motePositions = new Float32Array(moteCount * 3);
  const moteColors = new Float32Array(moteCount * 3);
  for (let i = 0; i < moteCount; i++) {
    motePositions[i * 3] = (rand() - 0.5) * WATER_W;
    motePositions[i * 3 + 1] = BOTTOM_Y + rand() * (SURFACE_Y - BOTTOM_Y);
    motePositions[i * 3 + 2] = (rand() - 0.5) * WATER_D;
    const c = new THREE.Color().setHSL(0.51 + rand() * 0.05, 0.45, 0.42 + rand() * 0.28);
    moteColors[i * 3] = c.r;
    moteColors[i * 3 + 1] = c.g;
    moteColors[i * 3 + 2] = c.b;
  }
  const moteGeometry = new THREE.BufferGeometry();
  moteGeometry.setAttribute('position', new THREE.BufferAttribute(motePositions, 3));
  moteGeometry.setAttribute('color', new THREE.BufferAttribute(moteColors, 3));
  const motes = new THREE.Points(moteGeometry, new THREE.PointsMaterial({ size: 0.026, vertexColors: true, transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending }));
  dataWorld.add(motes);

  const streamGroup = new THREE.Group();
  dataWorld.add(streamGroup);
  const streamCurves = [];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const x = Math.cos(a) * (4.2 + (i % 2) * 1.4);
    const z = Math.sin(a) * 3.2;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(x, SURFACE_Y - 0.1, z),
      new THREE.Vector3(x + Math.sin(a) * 0.4, -0.8, z + Math.cos(a) * 0.3),
      new THREE.Vector3(x - Math.sin(a) * 0.25, -3.8, z),
      new THREE.Vector3(x, BOTTOM_Y + 0.8, z),
    ]);
    streamCurves.push(curve);
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(curve.getPoints(48)),
      new THREE.LineDashedMaterial({ color: i % 3 === 0 ? 0x6ccfdc : 0x347e9c, transparent: true, opacity: i % 3 === 0 ? 0.22 : 0.12, dashSize: 0.12, gapSize: 0.2 }),
    );
    line.computeLineDistances();
    streamGroup.add(line);
  }
  const streamParticleCount = 126;
  const streamPositions = new Float32Array(streamParticleCount * 3);
  const streamGeometry = new THREE.BufferGeometry();
  streamGeometry.setAttribute('position', new THREE.BufferAttribute(streamPositions, 3));
  const streamParticles = new THREE.Points(streamGeometry, new THREE.PointsMaterial({ color: 0x83edf1, size: 0.055, transparent: true, opacity: 0.68, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  streamGroup.add(streamParticles);

  const shaftMaterial = new THREE.MeshBasicMaterial({ color: 0x2b93b3, transparent: true, opacity: 0.024, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  for (let i = 0; i < 4; i++) {
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 2.2, 10, 24, 1, true), shaftMaterial);
    shaft.position.set(-5 + i * 3.6, -2.6, -2.5 + (i % 2) * 3);
    shaft.rotation.z = 0.08 + i * 0.015;
    shaft.visible = !isProduct;
    world.add(shaft);
  }

  const farField = new THREE.Group();
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const radius = 48 + rand() * 22;
    const ridge = new THREE.Mesh(new THREE.ConeGeometry(4 + rand() * 5, 5 + rand() * 7, 7), new THREE.MeshStandardMaterial({ color: 0x071923, roughness: 1, flatShading: true }));
    ridge.position.set(Math.cos(a) * radius, BOTTOM_Y - 5 + rand() * 2, Math.sin(a) * radius);
    farField.add(ridge);
  }
  world.add(farField);

  const cornerMaterial = new THREE.LineBasicMaterial({ color: 0x74d9e5, transparent: true, opacity: 0.45 });
  for (let i = 0; i < 4; i++) {
    const sx = i < 2 ? -1 : 1;
    const sz = i % 2 === 0 ? -1 : 1;
    const points = [
      new THREE.Vector3(sx * (WATER_W / 2 - 0.65), SURFACE_Y + 0.07, sz * WATER_D / 2),
      new THREE.Vector3(sx * WATER_W / 2, SURFACE_Y + 0.07, sz * WATER_D / 2),
      new THREE.Vector3(sx * WATER_W / 2, SURFACE_Y + 0.07, sz * (WATER_D / 2 - 0.65)),
    ];
    dataWorld.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), cornerMaterial));
  }

  // Aquatic life is illustrative, independent of the simulated sensor field.
  const life = new THREE.Group();
  world.add(life);
  const fishBodyGeometry = new THREE.SphereGeometry(1, 14, 10);
  const eyeGeometry = new THREE.SphereGeometry(.035, 7, 5);
  const fishMaterials = [0x9cbfc5, 0x6da3b2, 0xa8cdd0].map(color => new THREE.MeshStandardMaterial({ color, metalness: .4, roughness: .32, emissive: 0x153e49, emissiveIntensity: .28 }));
  const finMaterial = new THREE.MeshStandardMaterial({ color: 0x88bdca, metalness: .2, roughness: .45, side: THREE.DoubleSide, transparent: true, opacity: .8 });
  const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x020b13 });
  const finGeometry = new THREE.BufferGeometry();
  finGeometry.setAttribute('position', new THREE.Float32BufferAttribute([0,0,0, -.42,.27,0, -.42,-.27,0], 3));
  finGeometry.computeVertexNormals();
  const fishSchool = [];
  for (let i = 0; i < 18; i++) {
    const fish = new THREE.Group();
    const body = new THREE.Mesh(fishBodyGeometry, fishMaterials[i % 3]);
    body.scale.set(.43, .145, .105); fish.add(body);
    const tail = new THREE.Mesh(finGeometry, finMaterial); tail.position.x = -.36; fish.add(tail);
    const dorsal = new THREE.Mesh(finGeometry, finMaterial); dorsal.position.set(.12,.11,0); dorsal.scale.set(.55,.55,.55); dorsal.rotation.z = -1.1; fish.add(dorsal);
    [-1,1].forEach(side => { const eye = new THREE.Mesh(eyeGeometry, eyeMaterial); eye.position.set(.29,.045,side*.075); fish.add(eye); });
    const scale = .7 + rand() * .55;
    fish.scale.setScalar(scale);
    const school = i < 10 ? 0 : 1;
    fish.userData = { phase: rand() * Math.PI * 2, school, radius: 3 + rand() * 2.6, y: school ? -3.8 + rand() * .9 : -.35 - rand() * 1.4, tail, offset: rand() * .6 };
    life.add(fish); fishSchool.push(fish);
  }
  const shrimpMaterial = new THREE.MeshPhysicalMaterial({ color: 0xd7ac90, metalness: .12, roughness: .43, clearcoat: .65, transparent: true, opacity: .87, emissive: 0x6a3827, emissiveIntensity: .12 });
  const shrimpLineMaterial = new THREE.LineBasicMaterial({ color: 0xd6c4a6, transparent: true, opacity: .7 });
  const shrimps = [];
  for (let i = 0; i < 9; i++) {
    const shrimp = new THREE.Group();
    const head = new THREE.Mesh(fishBodyGeometry, shrimpMaterial); head.scale.set(.23,.12,.12); shrimp.add(head);
    const abdomen = new THREE.Group(); shrimp.add(abdomen);
    for (let j = 0; j < 5; j++) { const segment = new THREE.Mesh(fishBodyGeometry, shrimpMaterial); segment.scale.set(.1-j*.01,.105-j*.012,.11-j*.013); segment.position.set(-.2-j*.12, -.015-j*j*.006,0); abdomen.add(segment); }
    const tail = new THREE.Mesh(finGeometry, finMaterial); tail.position.set(-.67,-.13,0); tail.rotation.x = Math.PI / 2; tail.scale.set(.6,.65,.65); abdomen.add(tail);
    [-1,1].forEach(side => {
      const eye = new THREE.Mesh(eyeGeometry, eyeMaterial); eye.position.set(.18,.075,side*.08); shrimp.add(eye);
      const antenna = new THREE.CatmullRomCurve3([new THREE.Vector3(.2,.03,side*.04), new THREE.Vector3(.48,.13,side*.12), new THREE.Vector3(.85,.16,side*.29), new THREE.Vector3(1.03,.08,side*.4)]);
      shrimp.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(antenna.getPoints(12)), shrimpLineMaterial));
      const legPoints = [];
      for (let j=0;j<4;j++) { const x=.12-j*.13; legPoints.push(new THREE.Vector3(x,-.06,side*.07),new THREE.Vector3(x+.08,-.27,side*.22),new THREE.Vector3(x+.08,-.27,side*.22),new THREE.Vector3(x+.21,-.3,side*.29)); }
      shrimp.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(legPoints),shrimpLineMaterial));
    });
    shrimp.scale.setScalar(.8 + rand() * .4);
    shrimp.userData = { phase: rand() * Math.PI * 2, radius: 3.5 + rand() * 2.5, y: -4.3 - rand() * .6, abdomen };
    life.add(shrimp); shrimps.push(shrimp);
  }
  function animateLife(t) {
    fishSchool.forEach(fish => {
      const d = fish.userData; const a = t * (d.school ? -.16 : .19) + d.phase;
      const rx = d.radius, rz = 1.6 + d.offset;
      fish.position.set(Math.cos(a)*rx, d.y+Math.sin(t*1.1+d.phase)*.13, Math.sin(a)*rz + (d.school ? 1.7 : -.7));
      const direction = d.school ? -1 : 1;
      fish.rotation.y = Math.atan2(-Math.cos(a)*rz*direction,-Math.sin(a)*rx*direction);
      fish.rotation.z = Math.sin(t*1.8+d.phase)*.035;
      d.tail.rotation.y = Math.sin(t*7+d.phase)*.45;
    });
    shrimps.forEach(shrimp => { const d=shrimp.userData; const a=t*.065+d.phase; shrimp.position.set(Math.cos(a)*d.radius,d.y+Math.sin(t*1.5+d.phase)*.08,Math.sin(a)*2.9); shrimp.rotation.y=Math.atan2(-Math.cos(a)*2.9,-Math.sin(a)*d.radius); d.abdomen.rotation.z=Math.sin(t*4+d.phase)*.07; });
  }
  const wakes = [];
  for (let i=0;i<3;i++) {
    const wake = new THREE.Mesh(new THREE.RingGeometry(2.5,2.52,60,1,Math.PI*.1,Math.PI*.8),new THREE.MeshBasicMaterial({color:0x9ad9dd,transparent:true,opacity:.1,side:THREE.DoubleSide,depthWrite:false}));
    wake.rotation.x=-Math.PI/2; world.add(wake); wakes.push(wake);
  }
  if (isProduct) {
    dataWorld.visible = false; life.visible = false;
    [waterSurface, waterSkin, base, baseEdges, robotShadow, farField, ...wakes].forEach(object => object.visible = false);
    robot.userData.probe.visible = false; robot.userData.cable.visible = false;
    scene.fog = null;
    // Soft platform lighting keeps the concept readable without obscuring hardware.
    const productLight = new THREE.DirectionalLight(0x96e3eb, 3);
    productLight.position.set(-5, 4, 5); scene.add(productLight);
  }

  const labels = [
    { el: document.getElementById('labelDO'), anchor: new THREE.Vector3(4.7, 0.5, 2.6), offset: [22, -20] },
    { el: document.getElementById('labelTemp'), anchor: new THREE.Vector3(5.4, -2.6, 0.4), offset: [24, -12] },
    { el: document.getElementById('labelPh'), anchor: new THREE.Vector3(3.8, -5.0, 2.1), offset: [25, -10] },
  ];
  const depthSlider = document.getElementById('depthSlider');
  const depthOutput = document.getElementById('depthOutput');
  const motionToggle = document.getElementById('motionToggle');
  const motionLabel = document.getElementById('motionLabel');
  const layerToggle = document.getElementById('layerToggle');
  let depth = Number(depthSlider.value);
  let layersVisible = true;
  let scrollProgress = 0;
  let paused = reducedMotion;
  let simT = 3.2;
  let acc = 0;
  const clock = new THREE.Clock();
  const STEP = 1 / 60;
  let frameEMA = 16.7;
  let frameCount = 0;
  let qualityTier = 0;

  function metricValues() {
    const d = depth / 24;
    return {
      do: (8.7 - d * 3.2 + Math.sin(d * Math.PI) * 0.35).toFixed(2),
      temp: (22.4 - d * 9.5).toFixed(1),
      ph: (7.72 + Math.sin(d * 2.4) * 0.17).toFixed(2),
    };
  }

  function updateProbe() {
    const targetY = SURFACE_Y - 0.3 - (depth / 24) * (SURFACE_Y - BOTTOM_Y - 0.65);
    const localTarget = (targetY - robot.position.y) / robot.scale.y;
    const cableTop = 0.45;
    const length = Math.max(0.2, cableTop - localTarget);
    robot.userData.cable.scale.y = length;
    robot.userData.cable.position.y = cableTop - length / 2;
    robot.userData.probe.position.y = localTarget;
    const beamLength = Math.max(0.3, (targetY - (BOTTOM_Y + 1.2)) / robot.scale.y);
    robot.userData.beam.scale.y = beamLength;
    robot.userData.beam.position.y = -1.0 - beamLength / 2;
    scanPlane.position.y = targetY;
  }

  function updateDepth(value) {
    depth = clamp(Number(value), 0, 24);
    depthSlider.value = depth.toFixed(1);
    depthOutput.querySelector('strong').textContent = depth.toFixed(1).padStart(4, '0');
    depthOutput.style.top = `${(depth / 24) * 88 + 2}%`;
    layerMaterials.forEach((material, i) => {
      const layerDepth = [4, 10, 17][i];
      material.uniforms.uActive.value = Math.max(0, 1 - Math.abs(depth - layerDepth) / 7);
      material.uniforms.uAlpha.value = 0.1 + material.uniforms.uActive.value * 0.16;
    });
    const values = metricValues();
    document.getElementById('doValue').textContent = values.do;
    document.getElementById('tempValue').textContent = values.temp;
    document.getElementById('phValue').textContent = values.ph;
    document.getElementById('doDepth').textContent = `${tr('DEPTH', '深度')} ${depth.toFixed(1).padStart(4, '0')} M`;
    document.getElementById('tempDepth').textContent = `${tr('DEPTH', '深度')} ${depth.toFixed(1).padStart(4, '0')} M`;
    document.getElementById('phDepth').textContent = `${tr('DEPTH', '深度')} ${depth.toFixed(1).padStart(4, '0')} M`;
    updateProbe();
  }

  function updateLabels() {
    if (!isExplore) return;
    labels.forEach((label) => {
      if (width < 760) {
        const visible = layersVisible && label.el.classList.contains(`label-${activeMetric}`);
        label.el.style.opacity = visible ? '1' : '0';
        label.el.setAttribute('aria-hidden', String(!visible));
        label.el.style.left = '6%'; label.el.style.top = '255px';
        return;
      }
      tempV.copy(label.anchor).applyMatrix4(world.matrixWorld).project(camera);
      const x = (tempV.x * 0.5 + 0.5) * width + label.offset[0];
      const y = (-tempV.y * 0.5 + 0.5) * height + label.offset[1];
      const visible = layersVisible && tempV.z < 1 && x > width * 0.28 && x < width - (width < 760 ? 130 : 210) && y > (width < 760 ? 245 : 110) && y < height - 150;
      label.el.style.opacity = visible ? '1' : '0';
      label.el.setAttribute('aria-hidden', String(!visible));
      label.el.style.left = `${x}px`;
      label.el.style.top = `${y}px`;
    });
  }

  depthSlider.addEventListener('input', (event) => updateDepth(event.target.value));
  document.querySelectorAll('.metric').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.metric').forEach((item) => {
        const selected = item === button;
        item.classList.toggle('active', selected);
        item.setAttribute('aria-pressed', String(selected));
      });
      updateTerrain(button.dataset.metric);
      const names = { do: tr('DISSOLVED OXYGEN','溶解氧'), temp: tr('TEMPERATURE','温度'), ph: tr('pH LEVEL','酸碱度') };
      document.getElementById('legendMetric').textContent = names[activeMetric];
      document.querySelector('.legend-labels').innerHTML = activeMetric === 'do' ? `<span>${tr('Higher','较高')}</span><span>${tr('Lower','较低')}</span>` : `<span>${tr('Lower','较低')}</span><span>${tr('Higher','较高')}</span>`;
    });
  });

  layerToggle.addEventListener('click', () => {
    layersVisible = !layersVisible;
    dataWorld.visible = layersVisible;
    layerToggle.setAttribute('aria-pressed', String(layersVisible));
    layerToggle.querySelector('b').textContent = layersVisible ? 'ON' : 'OFF';
  });

  function setPaused(value) {
    paused = value;
    motionToggle.setAttribute('aria-pressed', String(paused));
    motionLabel.textContent = paused ? tr('Resume motion','继续动画') : tr('Pause motion','暂停动画');
    clock.getDelta();
  }
  motionToggle.addEventListener('click', () => setPaused(!paused));
  function setView(view, instant = false) {
    cameraView = view;
    const mobile = width < 760;
    const configs = {
      overview: { position: mobile ? mobileCamera : desktopCamera, target: defaultTarget() },
      surface: { position: new THREE.Vector3(mobile ? 24 : 15, mobile ? 23 : 19, mobile ? 27 : 19), target: new THREE.Vector3(0, mobile ? 5 : 1.7, 0) },
      underwater: { position: new THREE.Vector3(mobile ? 27 : 20, mobile ? 0 : -2.2, mobile ? 31 : 24), target: new THREE.Vector3(mobile ? 0 : -1.7, mobile ? .5 : -3, 0) },
    };
    const config = configs[view];
    document.querySelectorAll('[data-view]').forEach(b => { b.classList.toggle('active', b.dataset.view === view); b.setAttribute('aria-pressed', String(b.dataset.view === view)); });
    if (instant || reducedMotion) { camera.position.copy(config.position); controls.target.copy(config.target); controls.update(); viewTransition = null; }
    else viewTransition = { start: performance.now(), from: camera.position.clone(), fromTarget: controls.target.clone(), to: config.position.clone(), target: config.target.clone() };
  }
  document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => setView(button.dataset.view)));
  document.getElementById('resetView').addEventListener('click', () => {
    pointer.set(0, 0); smoothPointer.set(0, 0);
    setView('overview'); updateDepth(8);
  });
  document.getElementById('lifeToggle').addEventListener('click', e => {
    life.visible = !life.visible;
    e.currentTarget.setAttribute('aria-pressed', String(life.visible));
    e.currentTarget.querySelector('b').textContent = life.visible ? 'ON' : 'OFF';
  });
  function updateScroll() {
    const story = document.querySelector('.home-story');
    if (story && !reducedMotion) scrollProgress = clamp(-story.getBoundingClientRect().top / Math.max(1, story.offsetHeight - innerHeight), 0, 1);
  }
  addEventListener('scroll', updateScroll, { passive: true });
  updateScroll();

  function sample(t) {
    const loopT = ((t % DURATION) + DURATION) % DURATION;
    const phase = (loopT / DURATION) * Math.PI * 2;
    const progress = loopT / DURATION;
    path.getPointAt(progress, tempV);
    path.getTangentAt(progress, tempV2);
    robot.position.set(tempV.x, SURFACE_Y + 0.58 + Math.sin(phase * 2) * 0.035, tempV.z);
    robot.rotation.y = Math.atan2(tempV2.x, tempV2.z);
    robot.rotation.z = Math.sin(phase * 2) * 0.008;
    if (isProduct) { robot.position.set(0, SURFACE_Y + .58 + Math.sin(t * .6) * .025, 0); robot.rotation.y = -.35; }
    animateLife(t);
    wakes.forEach((wake, i) => {
      wake.position.set(robot.position.x, SURFACE_Y + .025, robot.position.z);
      wake.rotation.z = -robot.rotation.y;
      wake.material.opacity = .13 + Math.sin(t * 1.7 - i) * .03;
      const scale = 1 + ((t * .22 + i * .33) % 1) * .6;
      wake.scale.set(scale, scale, 1);
    });
    robotShadow.position.x = tempV.x;
    robotShadow.position.z = tempV.z;
    waterSurfaceMaterial.uniforms.uTime.value = Math.sin(phase) * 1.2;
    motes.position.y = Math.sin(phase) * 0.07;
    streamGroup.children.forEach((child) => {
      if (child.isLine) child.material.dashOffset = -progress * 0.64;
    });
    for (let i = 0; i < pathParticleCount; i++) {
      const u = (progress * 0.18 + i / pathParticleCount) % 1;
      path.getPointAt(u, tempV);
      pathParticlePositions[i * 3] = tempV.x;
      pathParticlePositions[i * 3 + 1] = tempV.y + 0.035;
      pathParticlePositions[i * 3 + 2] = tempV.z;
    }
    pathParticleGeometry.attributes.position.needsUpdate = true;
    for (let i = 0; i < streamParticleCount; i++) {
      const curveIndex = i % streamCurves.length;
      const u = (progress * 2 + Math.floor(i / streamCurves.length) / 14) % 1;
      streamCurves[curveIndex].getPointAt(u, tempV);
      streamPositions[i * 3] = tempV.x;
      streamPositions[i * 3 + 1] = tempV.y;
      streamPositions[i * 3 + 2] = tempV.z;
    }
    streamGeometry.attributes.position.needsUpdate = true;
    updateProbe();
  }

  let smoothScroll = scrollProgress;
  function draw() {
    if (viewTransition) {
      const progress = clamp((performance.now() - viewTransition.start) / 1100, 0, 1);
      const eased = progress * progress * (3 - 2 * progress);
      camera.position.lerpVectors(viewTransition.from, viewTransition.to, eased);
      controls.target.lerpVectors(viewTransition.fromTarget, viewTransition.target, eased);
      if (progress === 1) viewTransition = null;
    }
    controls.update();
    const motionAllowed = !reducedMotion && !paused;
    smoothScroll = THREE.MathUtils.lerp(smoothScroll, scrollProgress, .045);
    if (mode === 'home') {
      world.rotation.y = smoothScroll * .5;
      world.rotation.x = -smoothScroll * .11;
      world.position.y = smoothScroll * .65;
      camera.fov = 38 - smoothScroll * 2;
      const narrativeDepth = 3 + smoothScroll * 16;
      if (Math.abs(depth - narrativeDepth) > .08) updateDepth(narrativeDepth);
    }
    if (motionAllowed && !userInteracting) smoothPointer.lerp(pointer, .025);
    else smoothPointer.lerp(new THREE.Vector2(), .06);
    cameraOffset.set(smoothPointer.x * .33, -smoothPointer.y * .2, 0);
    camera.position.add(cameraOffset);
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
    updateLabels();
    camera.position.sub(cameraOffset);
  }

  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.1);
    if (!inViewport || document.hidden) return;
    if (!paused) {
      acc += dt;
      while (acc >= STEP) { acc -= STEP; simT += STEP; }
      sample(simT);
    }
    draw();
    frameEMA = frameEMA * 0.94 + Math.min(dt * 1000, 100) * 0.06;
    frameCount++;
    if (frameCount % 90 === 0 && frameEMA > 30 && qualityTier === 0) {
      qualityTier = 1;
      renderer.setPixelRatio(Math.min(devicePixelRatio, 1));
      renderer.setSize(width, height);
    } else if (frameCount % 90 === 0 && frameEMA > 38 && qualityTier === 1) {
      qualityTier = 2;
      renderer.shadowMap.enabled = false;
      key.castShadow = false;
      moteGeometry.setDrawRange(0, 650);
    }
  });

  window.__seek = (t) => {
    const value = Number(t);
    setPaused(true);
    acc = 0;
    simT = Number.isFinite(value) && value > 0 ? value : 0;
    sample(simT);
    draw();
  };
  window.__play = () => setPaused(false);
  window.__SCENE_STATS__ = () => ({ calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, points: moteCount + volumeCount + streamParticleCount + pathParticleCount, pixelRatio: renderer.getPixelRatio(), qualityTier });

  let mobileLayout = width < 760;
  const resizeObserver = new ResizeObserver(() => {
    width = mount.clientWidth; height = mount.clientHeight;
    const nextMobileLayout = width < 760;
    if (nextMobileLayout !== mobileLayout) {
      mobileLayout = nextMobileLayout;
      setView(cameraView, true);
      controls.saveState();
    }
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    updateScroll();
  });
  resizeObserver.observe(mount);
  renderer.domElement.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    renderer.setAnimationLoop(null);
    document.getElementById('webglFallback').hidden = false;
  });
  addEventListener('pagehide', () => { renderer.setAnimationLoop(null); controls.dispose(); resizeObserver.disconnect(); renderer.dispose(); });
  addEventListener('pageshow', event => { if(event.persisted) location.reload(); });

  sample(simT);
  updateDepth(depth);
  setPaused(paused);
  draw();
  document.getElementById('loadingScreen').classList.add('loaded');
  const timeParam = new URLSearchParams(location.search).get('t');
  if (timeParam !== null) window.__seek(timeParam);
  window.__SCENE_READY__ = true;
}

try {
  init();
} catch (error) {
  document.getElementById('loadingScreen').classList.add('loaded');
  document.getElementById('webglFallback').hidden = false;
  console.error('3D scene initialization failed', error);
}
