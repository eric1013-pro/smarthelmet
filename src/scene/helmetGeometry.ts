import * as THREE from 'three';
import type { AssemblyStage } from '../engineering/cinematicTimeline';
import type {
  CadDisplayMode,
  ImpactDirection,
  ShellCoverMode,
} from '../engineering/helmetEngine';

export interface ExplodablePart {
  group: THREE.Object3D;
  basePos: THREE.Vector3;
  explodeOffset: THREE.Vector3;
  stage: AssemblyStage;
  isOuterCover?: boolean;
}

export interface InspectablePartMeta {
  partId: string;
  labelKo: string;
  sublabel: string;
  category: 'shell' | 'cover' | 'sensor' | 'mcu' | 'actuator';
}

export interface SmartHelmetRig {
  root: THREE.Group;
  helmetAssembly: THREE.Group;
  explodableParts: ExplodablePart[];
  interactables: THREE.Object3D[];
  polygonCoverGroup: THREE.Group;
  cadEdgeLines: THREE.LineSegments[];
  shellMaterials: THREE.Material[];
  ultrasonicConeTop: THREE.Mesh;
  ultrasonicConeRear: THREE.Mesh;
  fallingObjectMesh: THREE.Group;
  redLedMaterials: THREE.MeshStandardMaterial[];
  greenLedMaterials: THREE.MeshStandardMaterial[];
  buzzerRingMat: THREE.MeshStandardMaterial;
  sonarWaveMesh: THREE.Mesh;
  sonarWaveMat: THREE.MeshBasicMaterial;
  tactSwitchCaps: Record<
    Exclude<ImpactDirection, 'NONE'>,
    { mesh: THREE.Mesh; baseLocalPos: THREE.Vector3; mat: THREE.MeshStandardMaterial }
  >;
  optionalGroups: {
    dht11: THREE.Group;
    mq2: THREE.Group;
    ky037: THREE.Group;
  };
  mountGuideRing: THREE.Mesh;
  mountGuideMat: THREE.MeshBasicMaterial;
  applyCadModes: (displayMode: CadDisplayMode, coverMode: ShellCoverMode) => void;
  setStudioTheme: (isCinematic: boolean) => void;
  applyCinematicCoverOpacity: (opacity: number) => void;
  dispose: () => void;
}

/**
 * Generates an authentic 2V Geodesic Triangular Polygon Dome geometry
 * matching the user's reference cardboard polygon dome (IMG_6117_2237fc66.jpeg).
 * Non-indexed triangles ensure razor-sharp flat facets and crisp seam lines.
 */
function createGeodesicPolygonCoverGeometry(): THREE.BufferGeometry {
  const ico = new THREE.IcosahedronGeometry(1.0, 2);
  const posAttr = ico.attributes.position;
  const keptPositions: number[] = [];
  const keptUvs: number[] = [];

  const v0 = new THREE.Vector3();
  const v1 = new THREE.Vector3();
  const v2 = new THREE.Vector3();

  // Map a unit-sphere vertex onto the helmet-enclosing ovoid polygon dome shell
  const deformVertex = (v: THREE.Vector3): THREE.Vector3 => {
    const out = v.clone();
    // Clamp lower vertices cleanly onto the flat polygon base rim (y = -0.02)
    if (out.y < 0.04) {
      out.y = 0.0;
      const horizLen = Math.hypot(out.x, out.z) || 1;
      out.x /= horizLen;
      out.z /= horizLen;
    }

    // Tight tailored geodesic dome enclosing the helmet, Arduino Uno R3, battery, wires, and 5 inter-shell tactiles
    // while allowing only essential external modules (Front 2× LED, HC-SR04 #1/#2, Buzzer) to protrude cleanly
    const x = out.x * 1.32;
    const z = out.z * 1.71 - 0.14;
    const y = out.y * 1.65 - 0.02;
    return new THREE.Vector3(x, y, z);
  };

  for (let i = 0; i < posAttr.count; i += 3) {
    v0.fromBufferAttribute(posAttr, i);
    v1.fromBufferAttribute(posAttr, i + 1);
    v2.fromBufferAttribute(posAttr, i + 2);

    const avgY = (v0.y + v1.y + v2.y) / 3;
    // Keep upper hemisphere + first rim skirt ring so the polygon dome sits flush down to helmet rim
    if (avgY < -0.1) continue;

    const p0 = deformVertex(v0);
    const p1 = deformVertex(v1);
    const p2 = deformVertex(v2);

    // Reject degenerate flat rim slivers
    const e1 = new THREE.Vector3().subVectors(p1, p0);
    const e2 = new THREE.Vector3().subVectors(p2, p0);
    if (e1.cross(e2).lengthSq() < 1e-6) continue;

    keptPositions.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
    // Clean per-triangle planar UVs for subtle kraft corrugated paper grain
    keptUvs.push(0, 0, 1, 0, 0.5, 0.866);
  }

  ico.dispose();

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(keptPositions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(keptUvs, 2));
  geo.computeVertexNormals();
  return geo;
}

/**
 * Procedural corrugated kraft-paper cardboard texture matching IMG_6117_2237fc66.jpeg.
 */
function createKraftCardboardTexture(maxAniso: number): {
  colorMap: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = 256;
  colorCanvas.height = 256;
  const ctx = colorCanvas.getContext('2d')!;

  // Warm natural kraft tan base matching the attached photo
  ctx.fillStyle = '#b9936c';
  ctx.fillRect(0, 0, 256, 256);

  // Fine corrugated flute lines
  for (let y = 0; y < 256; y += 4) {
    ctx.fillStyle = y % 8 === 0 ? 'rgba(92, 64, 38, 0.08)' : 'rgba(255, 240, 220, 0.06)';
    ctx.fillRect(0, y, 256, 2);
  }

  // Organic kraft paper fiber speckles
  for (let i = 0; i < 2400; i++) {
    const x = (i * 97) % 256;
    const y = (i * 53) % 256;
    const dark = i % 3 === 0;
    ctx.fillStyle = dark ? 'rgba(72, 48, 28, 0.12)' : 'rgba(235, 212, 184, 0.10)';
    ctx.fillRect(x, y, 2, 1);
  }

  const colorMap = new THREE.CanvasTexture(colorCanvas);
  colorMap.colorSpace = THREE.SRGBColorSpace;
  colorMap.wrapS = THREE.RepeatWrapping;
  colorMap.wrapT = THREE.RepeatWrapping;
  colorMap.anisotropy = maxAniso;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = 256;
  bumpCanvas.height = 256;
  const bctx = bumpCanvas.getContext('2d')!;
  bctx.fillStyle = '#808080';
  bctx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 4) {
    bctx.fillStyle = y % 8 === 0 ? '#6e6e6e' : '#909090';
    bctx.fillRect(0, y, 256, 2);
  }
  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;

  return { colorMap, bumpMap };
}

function createMicroBumpTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 1600; i++) {
    const x = (i * 73) % 128;
    const y = (i * 41) % 128;
    const v = 115 + ((i * 29) % 26);
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(x, y, 2, 2);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  return tex;
}

function createMeshGrillTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#18212f';
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2.6;
  for (let i = -128; i < 256; i += 9) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 128, 128);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(i + 128, 0);
    ctx.lineTo(i, 128);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createDht11GrillTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 160;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#0ea5e9';
  ctx.fillRect(0, 0, 128, 160);
  ctx.fillStyle = '#075985';
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 4; col++) {
      ctx.fillRect(14 + col * 26, 16 + row * 26, 18, 18);
    }
  }
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 3;
  ctx.strokeRect(4, 4, 120, 152);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createFrontLedPcbTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  // FR-4 dark green solder mask
  ctx.fillStyle = '#0f5132';
  ctx.fillRect(0, 0, 256, 128);

  // Subtle fiberglass grid sheen
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  for (let x = 0; x < 256; x += 16) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 128);
    ctx.stroke();
  }
  for (let y = 0; y < 128; y += 16) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y);
    ctx.stroke();
  }

  // White silkscreen border
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2;
  ctx.strokeRect(6, 6, 244, 116);

  // Copper PCB traces (D11 -> R1 -> RED LED, D12 -> R2 -> GREEN LED, common GND)
  ctx.strokeStyle = '#eab308';
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // D11 red signal path
  ctx.beginPath();
  ctx.moveTo(108, 110);
  ctx.lineTo(108, 92);
  ctx.lineTo(66, 92);
  ctx.lineTo(66, 60);
  ctx.lineTo(44, 60);
  ctx.stroke();

  // D12 green signal path
  ctx.beginPath();
  ctx.moveTo(148, 110);
  ctx.lineTo(148, 92);
  ctx.lineTo(190, 92);
  ctx.lineTo(190, 60);
  ctx.lineTo(212, 60);
  ctx.stroke();

  // Common GND bus
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(128, 110);
  ctx.lineTo(128, 32);
  ctx.moveTo(44, 32);
  ctx.lineTo(212, 32);
  ctx.stroke();

  // Gold solder pads
  const pads = [
    [44, 32],
    [44, 60],
    [212, 32],
    [212, 60],
    [88, 92],
    [168, 92],
    [108, 110],
    [128, 110],
    [148, 110],
  ];
  for (const [px, py] of pads) {
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#facc15';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(px, py, 2.2, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
  }

  // Crisp silkscreen circuit callouts
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('LED-DRV PCB v2', 128, 22);
  ctx.font = 'bold 10px monospace';
  ctx.fillText('R1 220Ω', 84, 80);
  ctx.fillText('R2 150Ω', 172, 80);
  ctx.fillStyle = '#fca5a5';
  ctx.fillText('D11', 95, 118);
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText('GND', 128, 118);
  ctx.fillStyle = '#86efac';
  ctx.fillText('D12', 161, 118);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createBuzzerTopTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#111827';
  ctx.fillRect(0, 0, 128, 128);
  ctx.beginPath();
  ctx.arc(64, 64, 54, 0, Math.PI * 2);
  ctx.fillStyle = '#f8fafc';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(64, 64, 18, 0, Math.PI * 2);
  ctx.fillStyle = '#1e293b';
  ctx.fill();
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('+', 22, 69);
  ctx.font = 'bold 11px monospace';
  ctx.fillText('5V ACTIVE', 34, 34);
  ctx.fillText('BUZZER', 40, 102);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createHcSr04SilkscreenTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#0f4c81';
  ctx.fillRect(0, 0, 256, 128);
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineWidth = 2;
  ctx.strokeRect(6, 6, 244, 116);
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 14px monospace';
  ctx.fillText('T', 26, 28);
  ctx.fillText('R', 218, 28);
  ctx.font = 'bold 13px monospace';
  ctx.fillText('HC-SR04', 98, 24);
  ctx.font = '11px monospace';
  ctx.fillText('VCC TRIG ECHO GND', 72, 116);
  ctx.fillStyle = '#eab308';
  for (const [cx, cy] of [
    [16, 16],
    [240, 16],
    [16, 112],
    [240, 112],
  ]) {
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createWorkbenchGridTexture(maxAniso: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#e7edf5';
  ctx.fillRect(0, 0, 512, 512);

  ctx.strokeStyle = '#d3dce8';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 512; i += 32) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();
  }

  ctx.strokeStyle = '#b4c3d6';
  ctx.lineWidth = 1.6;
  for (let i = 0; i <= 512; i += 128) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(10, 10);
  tex.anisotropy = maxAniso;
  return tex;
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(128, 128, 20, 128, 128, 124);
  grad.addColorStop(0, 'rgba(15, 23, 42, 0.34)');
  grad.addColorStop(0.55, 'rgba(15, 23, 42, 0.14)');
  grad.addColorStop(1, 'rgba(15, 23, 42, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createArduinoSilkscreenTexture(maxAniso: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 384;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#08677a';
  ctx.fillRect(0, 0, 512, 384);

  ctx.strokeStyle = 'rgba(20, 148, 170, 0.45)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 12; i++) {
    ctx.beginPath();
    ctx.moveTo(150 + i * 24, 52);
    ctx.lineTo(150 + i * 24, 120);
    ctx.lineTo(185 + i * 16, 170);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(255,255,255,0.88)';
  ctx.lineWidth = 3.5;
  ctx.strokeRect(10, 10, 492, 364);

  ctx.fillStyle = '#e2e8f0';
  for (const [mx, my] of [
    [102, 26],
    [478, 90],
    [478, 294],
    [114, 358],
  ]) {
    ctx.beginPath();
    ctx.arc(mx, my, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(mx, my, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e2e8f0';
  }

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 34px sans-serif';
  ctx.fillText('UNO', 252, 134);
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('R3', 340, 134);
  ctx.font = 'bold 14px monospace';
  ctx.fillText('DIGITAL (PWM~)', 200, 62);
  ctx.fillText('POWER', 180, 326);
  ctx.fillText('ANALOG IN', 330, 326);
  ctx.font = '12px monospace';
  ctx.fillText('D13 D12 ~11 ~10 ~9  8   7  ~6 ~5  4  ~3  2  TX RX', 120, 40);
  ctx.fillText('3.3V 5V GND Vin   A0 A1 A2 A3 A4 A5', 165, 356);
  ctx.fillText('ON', 415, 118);
  ctx.fillText('L', 202, 118);
  ctx.fillText('ICSP', 446, 198);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

function tagInspectable(
  obj: THREE.Object3D,
  meta: InspectablePartMeta,
  interactables: THREE.Object3D[],
) {
  obj.userData.inspectMeta = meta;
  obj.traverse((child) => {
    child.userData.inspectMeta = meta;
  });
  interactables.push(obj);
}

function attachCadEdges(
  mesh: THREE.Mesh,
  edgeMat: THREE.LineBasicMaterial,
  cadEdgeLines: THREE.LineSegments[],
  track: <T extends { dispose: () => void }>(item: T) => T,
  thresholdAngle = 24,
) {
  const edgesGeo = track(new THREE.EdgesGeometry(mesh.geometry, thresholdAngle));
  const line = new THREE.LineSegments(edgesGeo, edgeMat);
  mesh.add(line);
  cadEdgeLines.push(line);
}

/**
 * Photo-realistic HC-SR04 Ultrasonic Sensor (local +Y = sensing direction).
 */
function buildRealisticHcSr04(
  meshGrillTex: THREE.CanvasTexture,
  hcSilkTex: THREE.CanvasTexture,
  metalMat: THREE.MeshStandardMaterial,
  darkMat: THREE.MeshStandardMaterial,
  copperPinMat: THREE.MeshStandardMaterial,
  track: <T extends { dispose: () => void }>(item: T) => T,
): THREE.Group {
  const group = new THREE.Group();

  const pcbMat = track(
    new THREE.MeshStandardMaterial({
      map: hcSilkTex,
      color: 0xffffff,
      roughness: 0.34,
      metalness: 0.12,
    }),
  );
  const pcb = new THREE.Mesh(track(new THREE.BoxGeometry(0.45, 0.022, 0.21)), pcbMat);
  pcb.castShadow = true;
  pcb.receiveShadow = true;
  group.add(pcb);

  const cylGeo = track(new THREE.CylinderGeometry(0.08, 0.08, 0.128, 24));
  const rimGeo = track(new THREE.TorusGeometry(0.078, 0.008, 8, 24));
  const capGeo = track(new THREE.CylinderGeometry(0.068, 0.068, 0.012, 24));
  const meshCapMat = track(
    new THREE.MeshStandardMaterial({
      map: meshGrillTex,
      color: 0xffffff,
      roughness: 0.42,
      metalness: 0.65,
    }),
  );

  for (const xOff of [-0.125, 0.125]) {
    const can = new THREE.Mesh(cylGeo, metalMat);
    can.position.set(xOff, 0.072, 0);
    can.castShadow = true;
    group.add(can);

    const lip = new THREE.Mesh(rimGeo, metalMat);
    lip.rotation.x = Math.PI / 2;
    lip.position.set(xOff, 0.134, 0);
    group.add(lip);

    const grill = new THREE.Mesh(capGeo, meshCapMat);
    grill.position.set(xOff, 0.132, 0);
    group.add(grill);
  }

  const crystal = new THREE.Mesh(track(new THREE.BoxGeometry(0.044, 0.036, 0.105)), metalMat);
  crystal.position.set(0, 0.028, 0.01);
  group.add(crystal);

  const headerHousing = new THREE.Mesh(track(new THREE.BoxGeometry(0.11, 0.026, 0.032)), darkMat);
  headerHousing.position.set(0, -0.004, -0.115);
  group.add(headerHousing);

  const pinGeo = track(new THREE.BoxGeometry(0.008, 0.008, 0.045));
  for (let p = 0; p < 4; p++) {
    const pin = new THREE.Mesh(pinGeo, copperPinMat);
    pin.position.set(-0.036 + p * 0.024, -0.004, -0.135);
    group.add(pin);
  }

  return group;
}

/**
 * Photo-realistic 12x12mm Tactile Switch on mini carrier PCB with round blue cap (IMG_7181 & IMG_6101).
 */
function buildRealisticTactileSwitch(
  pcbMat: THREE.MeshStandardMaterial,
  metalMat: THREE.MeshStandardMaterial,
  darkMat: THREE.MeshStandardMaterial,
  track: <T extends { dispose: () => void }>(item: T) => T,
  capColor = 0x2563eb,
): { group: THREE.Group; capMesh: THREE.Mesh; capMat: THREE.MeshStandardMaterial } {
  const group = new THREE.Group();

  const carrier = new THREE.Mesh(track(new THREE.BoxGeometry(0.175, 0.024, 0.175)), pcbMat);
  carrier.castShadow = true;
  group.add(carrier);

  const body = new THREE.Mesh(track(new THREE.BoxGeometry(0.125, 0.048, 0.125)), darkMat);
  body.position.y = 0.036;
  body.castShadow = true;
  group.add(body);

  const topPlate = new THREE.Mesh(track(new THREE.BoxGeometry(0.112, 0.008, 0.112)), metalMat);
  topPlate.position.y = 0.062;
  group.add(topPlate);

  const rivetGeo = track(new THREE.CylinderGeometry(0.009, 0.009, 0.018, 8));
  for (const sx of [-0.048, 0.048]) {
    for (const sz of [-0.048, 0.048]) {
      const r = new THREE.Mesh(rivetGeo, metalMat);
      r.position.set(sx, 0.065, sz);
      group.add(r);
    }
  }

  const capMat = track(
    new THREE.MeshStandardMaterial({
      color: capColor,
      roughness: 0.34,
      metalness: 0.08,
      emissive: 0x000000,
      emissiveIntensity: 0,
    }),
  );
  const capMesh = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.052, 0.058, 0.052, 20)),
    capMat,
  );
  capMesh.position.y = 0.094;
  capMesh.castShadow = true;
  group.add(capMesh);

  return { group, capMesh, capMat };
}

/**
 * Photo-realistic Arduino Uno R3 (CH340) board with female pin headers, DIP-28 ATmega328P,
 * USB-B connector, 2.1mm DC jack, capacitors, crystal, reset switch & SMD LEDs.
 */
function buildRealisticArduinoUno(
  unoTex: THREE.CanvasTexture,
  metalMat: THREE.MeshStandardMaterial,
  darkMat: THREE.MeshStandardMaterial,
  copperPinMat: THREE.MeshStandardMaterial,
  track: <T extends { dispose: () => void }>(item: T) => T,
): THREE.Group {
  const uno = new THREE.Group();

  const pcbMat = track(
    new THREE.MeshStandardMaterial({
      map: unoTex,
      color: 0xffffff,
      roughness: 0.32,
      metalness: 0.14,
    }),
  );
  const pcb = new THREE.Mesh(track(new THREE.BoxGeometry(0.69, 0.535, 0.022)), pcbMat);
  pcb.castShadow = true;
  uno.add(pcb);

  const usbShell = new THREE.Mesh(track(new THREE.BoxGeometry(0.155, 0.118, 0.105)), metalMat);
  usbShell.position.set(-0.275, 0.145, -0.062);
  usbShell.castShadow = true;
  uno.add(usbShell);

  const usbInner = new THREE.Mesh(track(new THREE.BoxGeometry(0.02, 0.075, 0.075)), darkMat);
  usbInner.position.set(-0.348, 0.145, -0.062);
  uno.add(usbInner);

  const dcJack = new THREE.Mesh(track(new THREE.BoxGeometry(0.135, 0.095, 0.105)), darkMat);
  dcJack.position.set(-0.275, -0.175, -0.062);
  dcJack.castShadow = true;
  uno.add(dcJack);

  const headerTopA = new THREE.Mesh(track(new THREE.BoxGeometry(0.24, 0.032, 0.082)), darkMat);
  headerTopA.position.set(0.02, 0.235, -0.05);
  const headerTopB = new THREE.Mesh(track(new THREE.BoxGeometry(0.21, 0.032, 0.082)), darkMat);
  headerTopB.position.set(0.26, 0.235, -0.05);

  const headerBotA = new THREE.Mesh(track(new THREE.BoxGeometry(0.21, 0.032, 0.082)), darkMat);
  headerBotA.position.set(0.02, -0.235, -0.05);
  const headerBotB = new THREE.Mesh(track(new THREE.BoxGeometry(0.17, 0.032, 0.082)), darkMat);
  headerBotB.position.set(0.24, -0.235, -0.05);
  uno.add(headerTopA, headerTopB, headerBotA, headerBotB);

  const dipChip = new THREE.Mesh(track(new THREE.BoxGeometry(0.32, 0.078, 0.038)), darkMat);
  dipChip.position.set(0.14, -0.115, -0.028);
  uno.add(dipChip);

  const legBarGeo = track(new THREE.BoxGeometry(0.3, 0.008, 0.026));
  const topLegs = new THREE.Mesh(legBarGeo, metalMat);
  topLegs.position.set(0.14, -0.072, -0.022);
  const botLegs = new THREE.Mesh(legBarGeo, metalMat);
  botLegs.position.set(0.14, -0.158, -0.022);
  uno.add(topLegs, botLegs);

  const ch340 = new THREE.Mesh(track(new THREE.BoxGeometry(0.095, 0.052, 0.022)), darkMat);
  ch340.position.set(-0.09, 0.105, -0.02);
  const xtal = new THREE.Mesh(track(new THREE.BoxGeometry(0.082, 0.032, 0.028)), metalMat);
  xtal.position.set(-0.08, -0.015, -0.024);
  uno.add(ch340, xtal);

  const capGeo = track(new THREE.CylinderGeometry(0.03, 0.03, 0.062, 16));
  for (const cx of [-0.14, -0.07]) {
    const cap = new THREE.Mesh(capGeo, metalMat);
    cap.rotation.x = Math.PI / 2;
    cap.position.set(cx, -0.145, -0.042);
    uno.add(cap);
  }

  const icspPinGeo = track(new THREE.BoxGeometry(0.008, 0.008, 0.048));
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 3; c++) {
      const pin = new THREE.Mesh(icspPinGeo, copperPinMat);
      pin.position.set(0.305 + r * 0.018, -0.02 + c * 0.018, -0.032);
      uno.add(pin);
    }
  }

  const resetBase = new THREE.Mesh(track(new THREE.BoxGeometry(0.048, 0.048, 0.026)), metalMat);
  resetBase.position.set(-0.26, 0.228, -0.024);
  const resetBtn = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.016, 0.016, 0.024, 12)),
    track(new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4 })),
  );
  resetBtn.rotation.x = Math.PI / 2;
  resetBtn.position.set(-0.26, 0.228, -0.04);
  uno.add(resetBase, resetBtn);

  const onLed = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.022, 0.014, 0.014)),
    track(
      new THREE.MeshStandardMaterial({
        color: 0x22c55e,
        emissive: 0x22c55e,
        emissiveIntensity: 1.5,
      }),
    ),
  );
  onLed.position.set(0.24, 0.08, -0.018);
  const lLed = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.022, 0.014, 0.014)),
    track(
      new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.9,
      }),
    ),
  );
  lLed.position.set(-0.04, 0.145, -0.018);
  uno.add(onLed, lLed);

  return uno;
}

/**
 * Builds the clean original white KCs Smart Safety Helmet with exposed photo-realistic
 * Arduino hardware & wiring, plus a single removable Geodesic Faceted Polygon Box
 * Finishing Cover (matching IMG_6117_2237fc66.jpeg) that slips cleanly over the entire helmet.
 * Scale: 1 unit = 100 mm.
 */
export function buildSmartHelmetScene(maxAniso: number): SmartHelmetRig {
  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };

  const root = new THREE.Group();
  const explodableParts: ExplodablePart[] = [];
  const interactables: THREE.Object3D[] = [];
  const cadEdgeLines: THREE.LineSegments[] = [];
  const shellMaterials: THREE.Material[] = [];

  const microBump = track(createMicroBumpTexture());
  const meshGrillTex = track(createMeshGrillTexture());
  const dhtGrillTex = track(createDht11GrillTexture());
  const buzzerTopTex = track(createBuzzerTopTexture());
  const hcSilkTex = track(createHcSr04SilkscreenTexture());
  const gridTex = track(createWorkbenchGridTexture(maxAniso));
  const shadowTex = track(createContactShadowTexture());
  const unoTex = track(createArduinoSilkscreenTexture(maxAniso));
  const kraftMaps = createKraftCardboardTexture(maxAniso);
  track(kraftMaps.colorMap);
  track(kraftMaps.bumpMap);

  const cadEdgeMat = track(
    new THREE.LineBasicMaterial({
      color: 0x0f172a,
      transparent: true,
      opacity: 0.35,
    }),
  );

  // Crisp dark fold/seam lines between triangular facets of the kraft polygon dome
  const polygonSeamMat = track(
    new THREE.LineBasicMaterial({
      color: 0x261a10,
      transparent: true,
      opacity: 0.85,
    }),
  );

  // =========================================================
  // SHARED PBR MATERIALS
  // =========================================================
  const helmetShellMat = track(
    new THREE.MeshPhysicalMaterial({
      color: 0xf6e59a,
      roughness: 0.22,
      metalness: 0.02,
      clearcoat: 0.85,
      clearcoatRoughness: 0.16,
      side: THREE.DoubleSide,
    }),
  );
  shellMaterials.push(helmetShellMat);

  // Kraft Cardboard Geodesic Polygon Box Cover Material (IMG_6117_2237fc66.jpeg)
  const polygonKraftMat = track(
    new THREE.MeshStandardMaterial({
      map: kraftMaps.colorMap,
      bumpMap: kraftMaps.bumpMap,
      bumpScale: 0.008,
      color: 0xffffff,
      roughness: 0.84,
      metalness: 0.02,
      flatShading: true,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: 2,
      polygonOffsetUnits: 2,
      transparent: false,
      opacity: 1.0,
    }),
  );
  shellMaterials.push(polygonKraftMat);

  const mattePolymerMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x273244,
      roughness: 0.72,
      metalness: 0.08,
      bumpMap: microBump,
      bumpScale: 0.004,
    }),
  );
  shellMaterials.push(mattePolymerMat);

  const accentBracketMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.6,
      metalness: 0.18,
    }),
  );
  shellMaterials.push(accentBracketMat);

  const suspensionMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.86,
      metalness: 0.04,
    }),
  );
  shellMaterials.push(suspensionMat);

  const brushedMetalMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xdbe2ea,
      roughness: 0.22,
      metalness: 0.88,
    }),
  );
  shellMaterials.push(brushedMetalMat);

  const copperPinMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xe2c06b,
      roughness: 0.26,
      metalness: 0.86,
    }),
  );

  const pcbBlueMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x124e96,
      roughness: 0.36,
      metalness: 0.14,
    }),
  );
  shellMaterials.push(pcbBlueMat);

  const pcbGreenMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x15803d,
      roughness: 0.38,
      metalness: 0.14,
    }),
  );

  const pcbRedMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xb91c1c,
      roughness: 0.36,
      metalness: 0.14,
    }),
  );

  const darkHeaderMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.62,
      metalness: 0.1,
    }),
  );

  const resistorTanMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xd6b889,
      roughness: 0.5,
      metalness: 0.05,
    }),
  );

  const wireRedMat = track(new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.55 }));
  const wireBlackMat = track(new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6 }));
  const wireYellowMat = track(new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.52 }));
  const wireBlueMat = track(new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.52 }));
  const wireGreenMat = track(new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.52 }));

  // =========================================================
  // 0. CAD WORKBENCH GRID, XYZ ORIGIN TRIAD & CONTACT SHADOW
  // =========================================================
  const floorMat = track(
    new THREE.MeshStandardMaterial({
      map: gridTex,
      color: 0xffffff,
      roughness: 0.9,
      metalness: 0.02,
    }),
  );
  const workbench = new THREE.Mesh(track(new THREE.PlaneGeometry(26, 26)), floorMat);
  workbench.rotation.x = -Math.PI / 2;
  workbench.position.y = 0;
  workbench.receiveShadow = true;
  root.add(workbench);

  // World-origin XYZ CAD triad
  const triadGroup = new THREE.Group();
  triadGroup.position.set(-1.95, 0.025, 1.75);
  const axisGeo = track(new THREE.CylinderGeometry(0.012, 0.012, 0.42, 10));
  const tipGeo = track(new THREE.ConeGeometry(0.028, 0.08, 12));
  const xMat = track(new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4 }));
  const yMat = track(new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.4 }));
  const zMat = track(new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.4 }));

  const xAxis = new THREE.Mesh(axisGeo, xMat);
  xAxis.rotation.z = -Math.PI / 2;
  xAxis.position.x = 0.21;
  const xTip = new THREE.Mesh(tipGeo, xMat);
  xTip.rotation.z = -Math.PI / 2;
  xTip.position.x = 0.45;
  const yAxis = new THREE.Mesh(axisGeo, yMat);
  yAxis.position.y = 0.21;
  const yTip = new THREE.Mesh(tipGeo, yMat);
  yTip.position.y = 0.45;
  const zAxis = new THREE.Mesh(axisGeo, zMat);
  zAxis.rotation.x = Math.PI / 2;
  zAxis.position.z = 0.21;
  const zTip = new THREE.Mesh(tipGeo, zMat);
  zTip.rotation.x = Math.PI / 2;
  zTip.position.z = 0.45;
  const originSphere = new THREE.Mesh(
    track(new THREE.SphereGeometry(0.024, 12, 12)),
    darkHeaderMat,
  );
  triadGroup.add(xAxis, xTip, yAxis, yTip, zAxis, zTip, originSphere);
  root.add(triadGroup);

  const shadowMat = track(
    new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.82,
    }),
  );
  const helmetShadow = new THREE.Mesh(track(new THREE.CircleGeometry(2.1, 32)), shadowMat);
  helmetShadow.rotation.x = -Math.PI / 2;
  helmetShadow.position.set(0, 0.015, 0);
  root.add(helmetShadow);

  // =========================================================
  // 1. CENTERED HERO SMART HELMET ASSEMBLY (ORIGINAL CLEAN FORM)
  // =========================================================
  const helmetAssembly = new THREE.Group();
  helmetAssembly.position.set(0, 0.38, 0);
  root.add(helmetAssembly);

  // CAD inspection pedestal
  const standGroup = new THREE.Group();
  const standBase = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.66, 0.76, 0.055, 36)),
    accentBracketMat,
  );
  standBase.position.y = -0.352;
  standBase.receiveShadow = true;
  const standRing = new THREE.Mesh(
    track(new THREE.TorusGeometry(0.68, 0.014, 10, 44)),
    brushedMetalMat,
  );
  standRing.rotation.x = Math.PI / 2;
  standRing.position.y = -0.324;
  const standStem = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.075, 0.095, 0.52, 20)),
    brushedMetalMat,
  );
  standStem.position.y = -0.07;
  standGroup.add(standBase, standRing, standStem);
  helmetAssembly.add(standGroup);

  // --- 1A. WHITE KCs ABE SAFETY HELMET BASE SHELL ---
  const shellGroup = new THREE.Group();
  helmetAssembly.add(shellGroup);

  const domeGeo = track(new THREE.SphereGeometry(1.06, 44, 30, 0, Math.PI * 2, 0, Math.PI * 0.56));
  const posAttr = domeGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    let x = posAttr.getX(i);
    let y = posAttr.getY(i);
    let z = posAttr.getZ(i);

    x *= 1.03;
    z *= 1.24;
    y *= 1.26;

    if (y < 0.25) {
      const flare = (0.25 - y) * 0.16;
      x *= 1 + flare;
      z *= 1 + flare;
    }

    if (z < -0.4 && y < 0.35) {
      y -= (-z - 0.4) * 0.08;
    }

    posAttr.setXYZ(i, x, y, z);
  }
  domeGeo.computeVertexNormals();
  const domeMesh = new THREE.Mesh(domeGeo, helmetShellMat);
  domeMesh.position.y = 0.08;
  domeMesh.castShadow = true;
  domeMesh.receiveShadow = true;
  shellGroup.add(domeMesh);

  const ribCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.22, -1.26),
    new THREE.Vector3(0, 1.05, -0.94),
    new THREE.Vector3(0, 1.44, -0.2),
    new THREE.Vector3(0, 1.43, 0.48),
    new THREE.Vector3(0, 0.96, 1.08),
    new THREE.Vector3(0, 0.26, 1.28),
  ]);
  const ribGeo = track(new THREE.TubeGeometry(ribCurve, 36, 0.105, 12, false));
  ribGeo.scale(0.85, 0.62, 1.0);
  const ribMesh = new THREE.Mesh(ribGeo, helmetShellMat);
  ribMesh.castShadow = true;
  shellGroup.add(ribMesh);

  const rimCurvePoints: THREE.Vector3[] = [];
  for (let i = 0; i <= 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    const rx = Math.sin(a) * 1.13;
    const rz = Math.cos(a) * 1.34;
    const ry = 0.02 - (rz < -0.5 ? (-rz - 0.5) * 0.07 : 0);
    rimCurvePoints.push(new THREE.Vector3(rx, ry, rz));
  }
  const rimCurve = new THREE.CatmullRomCurve3(rimCurvePoints, true);
  const rimMesh = new THREE.Mesh(
    track(new THREE.TubeGeometry(rimCurve, 64, 0.042, 10, true)),
    helmetShellMat,
  );
  rimMesh.castShadow = true;
  shellGroup.add(rimMesh);

  const brimShape = new THREE.Shape();
  brimShape.moveTo(-0.88, 0);
  brimShape.quadraticCurveTo(-0.76, 0.46, 0, 0.56);
  brimShape.quadraticCurveTo(0.76, 0.46, 0.88, 0);
  brimShape.quadraticCurveTo(0, 0.18, -0.88, 0);
  const brimGeo = track(
    new THREE.ExtrudeGeometry(brimShape, {
      depth: 0.045,
      bevelEnabled: true,
      bevelThickness: 0.015,
      bevelSize: 0.015,
      bevelSegments: 3,
    }),
  );
  brimGeo.rotateX(Math.PI / 2 + 0.14);
  const brimMesh = new THREE.Mesh(brimGeo, helmetShellMat);
  brimMesh.position.set(0, 0.05, 1.16);
  brimMesh.castShadow = true;
  brimMesh.receiveShadow = true;
  shellGroup.add(brimMesh);

  tagInspectable(
    shellGroup,
    {
      partId: 'helmet-shell',
      labelKo: 'KCs 인증 산업용 안전모 모체 (ABE종)',
      sublabel: '285×222×162mm · 무천공 원형 유지 (AC 20kV 절연 보존)',
      category: 'shell',
    },
    interactables,
  );

  // --- 1B. INTERNAL SUSPENSION & RATCHET HEADBAND ---
  const suspensionGroup = new THREE.Group();
  const headband = new THREE.Mesh(
    track(new THREE.TorusGeometry(0.95, 0.044, 10, 40)),
    suspensionMat,
  );
  headband.rotation.x = Math.PI / 2;
  headband.scale.set(0.96, 1.12, 1);
  headband.position.y = -0.02;
  suspensionGroup.add(headband);

  const napeStrap = new THREE.Mesh(
    track(new THREE.TorusGeometry(0.76, 0.036, 10, 28, Math.PI * 0.85)),
    suspensionMat,
  );
  napeStrap.rotation.x = Math.PI / 2 + 0.55;
  napeStrap.rotation.z = Math.PI * 0.58;
  napeStrap.position.set(0, -0.15, -0.35);
  suspensionGroup.add(napeStrap);

  const ratchetDial = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.14, 0.14, 0.08, 16)),
    darkHeaderMat,
  );
  ratchetDial.rotation.x = Math.PI / 2 + 0.25;
  ratchetDial.position.set(0, -0.2, -1.18);
  suspensionGroup.add(ratchetDial);

  helmetAssembly.add(suspensionGroup);
  explodableParts.push({
    group: suspensionGroup,
    basePos: suspensionGroup.position.clone(),
    explodeOffset: new THREE.Vector3(0, -0.5, 0),
    stage: 'base',
  });

  // --- 1C. ORIGINAL SLIM NON-DESTRUCTIVE CLIP-ON FRAME & 5-COLOR DUPONT WIRE HARNESS ---
  const clipFrameGroup = new THREE.Group();

  const bandPoints: THREE.Vector3[] = [];
  for (let i = 0; i <= 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    const rx = Math.sin(a) * 1.175;
    const rz = Math.cos(a) * 1.385;
    const ry = 0.06 - (rz < -0.5 ? (-rz - 0.5) * 0.06 : 0);
    bandPoints.push(new THREE.Vector3(rx, ry, rz));
  }
  const clipBand = new THREE.Mesh(
    track(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(bandPoints, true), 64, 0.032, 10, true)),
    mattePolymerMat,
  );
  clipBand.castShadow = true;
  clipFrameGroup.add(clipBand);

  // 4 U-shaped non-destructive rim clamp jaws
  for (const ang of [0.66, -0.66, Math.PI - 0.66, -Math.PI + 0.66]) {
    const jaw = new THREE.Mesh(track(new THREE.BoxGeometry(0.135, 0.15, 0.11)), accentBracketMat);
    jaw.position.set(Math.sin(ang) * 1.16, 0.03, Math.cos(ang) * 1.36);
    jaw.rotation.y = ang;
    jaw.castShadow = true;
    attachCadEdges(jaw, cadEdgeMat, cadEdgeLines, track, 28);
    clipFrameGroup.add(jaw);
  }

  // Twin slim overhead arch rails carrying crown sensor tray (original clean silhouette!)
  for (const sideSign of [-1, 1]) {
    const archCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(sideSign * 1.16, 0.08, 0.0),
      new THREE.Vector3(sideSign * 1.05, 0.72, 0.0),
      new THREE.Vector3(sideSign * 0.65, 1.24, 0.0),
      new THREE.Vector3(sideSign * 0.22, 1.46, 0.0),
    ]);
    const archMesh = new THREE.Mesh(
      track(new THREE.TubeGeometry(archCurve, 24, 0.026, 8, false)),
      mattePolymerMat,
    );
    archMesh.castShadow = true;
    clipFrameGroup.add(archMesh);
  }

  // Real 3D color-coded Dupont jumper wire harness (routed cleanly along crest & rim)
  const wireBundles: Array<{ mat: THREE.Material; xOff: number; zShift: number }> = [
    { mat: wireRedMat, xOff: -0.04, zShift: 0 },
    { mat: wireBlackMat, xOff: -0.02, zShift: 0.004 },
    { mat: wireYellowMat, xOff: 0.0, zShift: 0.006 },
    { mat: wireBlueMat, xOff: 0.02, zShift: 0.004 },
    { mat: wireGreenMat, xOff: 0.04, zShift: 0 },
  ];
  for (const wb of wireBundles) {
    const spineCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(wb.xOff, 1.46, -0.14),
      new THREE.Vector3(wb.xOff, 1.31, -0.74),
      new THREE.Vector3(wb.xOff, 0.92, -1.14),
      new THREE.Vector3(wb.xOff, 0.56, -1.36 + wb.zShift),
      new THREE.Vector3(wb.xOff, 0.42, -1.44),
    ]);
    const wireMesh = new THREE.Mesh(
      track(new THREE.TubeGeometry(spineCurve, 22, 0.0085, 6, false)),
      wb.mat,
    );
    clipFrameGroup.add(wireMesh);
  }

  for (const side of [-1, 1]) {
    for (const [wIdx, wMat] of [wireRedMat, wireBlackMat, wireGreenMat, wireBlueMat].entries()) {
      const yLift = 0.095 + wIdx * 0.018;
      const sideWireCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.34, 0.22 + wIdx * 0.022, -1.42),
        new THREE.Vector3(side * 0.92, 0.14 + wIdx * 0.018, -1.04),
        new THREE.Vector3(side * 1.18, yLift, -0.35),
        new THREE.Vector3(side * 1.17, yLift + 0.04, 0.48),
        new THREE.Vector3(side * 0.62, yLift + 0.06, 1.18),
        new THREE.Vector3(side * 0.14, yLift + 0.07, 1.34),
      ]);
      const sideWire = new THREE.Mesh(
        track(new THREE.TubeGeometry(sideWireCurve, 26, 0.007, 6, false)),
        wMat,
      );
      clipFrameGroup.add(sideWire);
    }
  }

  helmetAssembly.add(clipFrameGroup);
  explodableParts.push({
    group: clipFrameGroup,
    basePos: clipFrameGroup.position.clone(),
    explodeOffset: new THREE.Vector3(0, 0.24, 0),
    stage: 'frame',
  });
  tagInspectable(
    clipFrameGroup,
    {
      partId: 'clip-frame',
      labelKo: 'KCs 무천공 클립 프레임 및 5색 점퍼 배선',
      sublabel: '4점 비파괴 림 클램프 · 아치 레일 · 아두이노 점퍼 케이블 하네스',
      category: 'shell',
    },
    interactables,
  );

  // =========================================================
  // 2. EXPOSED PHOTO-REALISTIC ARDUINO SENSORS & ELECTRONICS
  // =========================================================

  // --- 2A. CROWN SENSOR MODULE (HC-SR04 #1 + Active Buzzer + Crown Switch #5) ---
  const crownInnerGroup = new THREE.Group();
  crownInnerGroup.position.set(0, 1.46, 0.06);

  const crownTray = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.64, 0.048, 0.42)),
    mattePolymerMat,
  );
  crownTray.position.set(0, -0.005, -0.02);
  crownTray.castShadow = true;
  attachCadEdges(crownTray, cadEdgeMat, cadEdgeLines, track, 26);
  crownInnerGroup.add(crownTray);

  // Crown riser pillar for HC-SR04 #1 so twin ultrasonic cans protrude cleanly outside polygon dome
  const hcTopRiser = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.46, 0.095, 0.22)),
    accentBracketMat,
  );
  hcTopRiser.position.set(-0.1, 0.072, -0.02);
  hcTopRiser.castShadow = true;
  crownInnerGroup.add(hcTopRiser);

  const hcTop = buildRealisticHcSr04(
    meshGrillTex,
    hcSilkTex,
    brushedMetalMat,
    darkHeaderMat,
    copperPinMat,
    track,
  );
  hcTop.position.set(-0.1, 0.128, -0.02);
  crownInnerGroup.add(hcTop);

  const coneGeo = track(new THREE.ConeGeometry(0.84, 2.0, 32, 1, true));
  const coneMat = track(
    new THREE.MeshBasicMaterial({
      color: 0x0ea5e9,
      transparent: true,
      opacity: 0.14,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  const ultrasonicConeTop = new THREE.Mesh(coneGeo, coneMat);
  ultrasonicConeTop.rotation.x = Math.PI;
  ultrasonicConeTop.position.set(-0.1, 1.26, -0.02);
  crownInnerGroup.add(ultrasonicConeTop);

  // Realistic 5V Active Piezo Buzzer + 2N2222 driver PCB on acoustic riser port
  const buzzerPcb = new THREE.Mesh(track(new THREE.BoxGeometry(0.24, 0.02, 0.24)), pcbGreenMat);
  buzzerPcb.position.set(0.23, 0.04, -0.02);
  crownInnerGroup.add(buzzerPcb);

  const buzzerRiser = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.106, 0.112, 0.08, 24)),
    accentBracketMat,
  );
  buzzerRiser.position.set(0.23, 0.09, -0.02);
  crownInnerGroup.add(buzzerRiser);

  const buzzerBody = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.095, 0.095, 0.12, 24)),
    darkHeaderMat,
  );
  buzzerBody.position.set(0.23, 0.175, -0.02);
  buzzerBody.castShadow = true;
  crownInnerGroup.add(buzzerBody);

  const buzzerTopCap = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.092, 0.092, 0.008, 24)),
    track(
      new THREE.MeshStandardMaterial({
        map: buzzerTopTex,
        color: 0xffffff,
        roughness: 0.45,
      }),
    ),
  );
  buzzerTopCap.position.set(0.23, 0.237, -0.02);
  crownInnerGroup.add(buzzerTopCap);

  const transistor = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.018, 0.018, 0.045, 10, 1, false, 0, Math.PI)),
    darkHeaderMat,
  );
  transistor.position.set(0.23, 0.068, -0.11);
  crownInnerGroup.add(transistor);

  const buzzerRingMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.0,
      roughness: 0.3,
    }),
  );
  const buzzerRing = new THREE.Mesh(
    track(new THREE.TorusGeometry(0.102, 0.012, 10, 24)),
    buzzerRingMat,
  );
  buzzerRing.rotation.x = Math.PI / 2;
  buzzerRing.position.set(0.23, 0.235, -0.02);
  crownInnerGroup.add(buzzerRing);

  // Glowing acoustic sonar wave ring for cinematic & live hazard buzzer visualization
  const sonarWaveMat = track(
    new THREE.MeshBasicMaterial({
      color: 0xf97316,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  const sonarWaveMesh = new THREE.Mesh(
    track(new THREE.RingGeometry(0.14, 0.19, 36)),
    sonarWaveMat,
  );
  sonarWaveMesh.rotation.x = -Math.PI / 2;
  sonarWaveMesh.position.set(0.23, 0.255, -0.02);
  sonarWaveMesh.visible = false;
  crownInnerGroup.add(sonarWaveMesh);

  // Crown Tactile Switch (#5) seated inside the ~15mm inter-shell gap between yellow helmet dome & polygon cover
  const crownTactPad = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.175, 0.024, 0.175)),
    accentBracketMat,
  );
  crownTactPad.position.set(0.0, -0.056, 0.21);
  crownInnerGroup.add(crownTactPad);

  const crownTact = buildRealisticTactileSwitch(
    pcbGreenMat,
    brushedMetalMat,
    darkHeaderMat,
    track,
    0x2563eb,
  );
  crownTact.group.position.set(0.0, -0.044, 0.21);
  crownInnerGroup.add(crownTact.group);

  helmetAssembly.add(crownInnerGroup);
  explodableParts.push({
    group: crownInnerGroup,
    basePos: crownInnerGroup.position.clone(),
    explodeOffset: new THREE.Vector3(0, 0.45, 0),
    stage: 'crown',
  });
  tagInspectable(
    crownInnerGroup,
    {
      partId: 'crown-pod',
      labelKo: '정수리 상단 모듈 (HC-SR04 #1 · 능동 부저 · 틈새 정수리 택트)',
      sublabel: '상향 30° 낙하물 감지 · 2N2222 95dB 부저 · 외피-모체 틈새 연동 택트 #5',
      category: 'sensor',
    },
    interactables,
  );

  // --- 2B. FALLING OBJECT SIMULATION PROP ---
  const fallingObjectMesh = new THREE.Group();
  const brickMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xea580c,
      roughness: 0.65,
      metalness: 0.12,
    }),
  );
  const brickMain = new THREE.Mesh(track(new THREE.BoxGeometry(0.34, 0.17, 0.21)), brickMat);
  brickMain.castShadow = true;
  const brickStripe = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.35, 0.04, 0.22)),
    track(new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 })),
  );
  fallingObjectMesh.add(brickMain, brickStripe);
  fallingObjectMesh.position.set(-0.1, 3.65, 0.04);
  fallingObjectMesh.visible = false;
  helmetAssembly.add(fallingObjectMesh);

  // --- 2C. REAR MCU & BATTERY CARRIER (Arduino Uno R3 + Li-ion + HC-SR04 #2 + S Switch) ---
  const rearInnerGroup = new THREE.Group();
  rearInnerGroup.position.set(0, 0.34, -1.46);

  const rearPlate = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.76, 0.62, 0.06)),
    mattePolymerMat,
  );
  rearPlate.position.set(0, 0.02, 0.05);
  rearPlate.castShadow = true;
  attachCadEdges(rearPlate, cadEdgeMat, cadEdgeLines, track, 26);
  rearInnerGroup.add(rearPlate);

  const batteryPouch = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.56, 0.38, 0.055)),
    brushedMetalMat,
  );
  batteryPouch.position.set(0, -0.02, -0.005);
  const kaptonTape = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.565, 0.045, 0.058)),
    track(new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.3, metalness: 0.1 })),
  );
  kaptonTape.position.set(0, 0.145, -0.005);
  rearInnerGroup.add(batteryPouch, kaptonTape);

  const unoBoard = buildRealisticArduinoUno(
    unoTex,
    brushedMetalMat,
    darkHeaderMat,
    copperPinMat,
    track,
  );
  unoBoard.position.set(0, -0.04, -0.068);
  rearInnerGroup.add(unoBoard);

  const standoffGeo = track(new THREE.CylinderGeometry(0.014, 0.014, 0.06, 8));
  for (const [sx, sy] of [
    [-0.29, 0.2],
    [0.29, 0.2],
    [-0.29, -0.26],
    [0.29, -0.26],
  ]) {
    const st = new THREE.Mesh(standoffGeo, copperPinMat);
    st.rotation.x = Math.PI / 2;
    st.position.set(sx, sy, -0.032);
    rearInnerGroup.add(st);
  }

  // Dual standoff rails extending HC-SR04 #2 rearward so ultrasonic cans protrude outside polygon cover
  // while Arduino Uno R3 (including USB-B port) & battery stay 100% enclosed inside the rear cavity
  for (const armX of [-0.18, 0.18]) {
    const hcRearArm = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.045, 0.055, 0.28)),
      accentBracketMat,
    );
    hcRearArm.position.set(armX, 0.26, -0.115);
    rearInnerGroup.add(hcRearArm);
  }

  const hcRear = buildRealisticHcSr04(
    meshGrillTex,
    hcSilkTex,
    brushedMetalMat,
    darkHeaderMat,
    copperPinMat,
    track,
  );
  hcRear.rotation.x = -Math.PI / 2;
  hcRear.position.set(0, 0.26, -0.245);
  rearInnerGroup.add(hcRear);

  const rearConeGeo = track(new THREE.ConeGeometry(0.42, 1.15, 24, 1, true));
  const rearConeMat = track(
    new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.1,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  const ultrasonicConeRear = new THREE.Mesh(rearConeGeo, rearConeMat);
  ultrasonicConeRear.rotation.x = Math.PI / 2;
  ultrasonicConeRear.position.set(0, 0.26, -0.92);
  rearInnerGroup.add(ultrasonicConeRear);

  // Rear South Tactile Switch seated cleanly inside the inter-shell gap (helmet <-> rear polygon cover)
  const southTactPost = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.14, 0.14, 0.14)),
    accentBracketMat,
  );
  southTactPost.position.set(0, -0.22, -0.09);
  rearInnerGroup.add(southTactPost);

  const southTact = buildRealisticTactileSwitch(
    pcbGreenMat,
    brushedMetalMat,
    darkHeaderMat,
    track,
    0x2563eb,
  );
  southTact.group.rotation.x = -Math.PI / 2;
  southTact.group.position.set(0, -0.22, -0.17);
  rearInnerGroup.add(southTact.group);

  helmetAssembly.add(rearInnerGroup);
  explodableParts.push({
    group: rearInnerGroup,
    basePos: rearInnerGroup.position.clone(),
    explodeOffset: new THREE.Vector3(0, 0.08, -0.68),
    stage: 'rear',
  });
  tagInspectable(
    rearInnerGroup,
    {
      partId: 'rear-pod',
      labelKo: '후면 제어기 모듈 (Arduino Uno R3 · 2500mAh · HC-SR04 #2)',
      sublabel: '전후 CoG 균형 배치 · 상부 사각지대 초음파 #2 · 틈새 연동 후면 택트(SW2)',
      category: 'mcu',
    },
    interactables,
  );

  // --- 2D. 3-DIRECTION PERIMETER TACTILE SWITCHES (N / E / W) IN INTER-SHELL GAP ---
  // Seated directly in the ~15mm gap between the yellow helmet shell and outer polygon cover so
  // external shell deflection triggers both the primary switch and adjacent neighbor switches.
  const tactPadGeo = track(new THREE.BoxGeometry(0.15, 0.036, 0.15));

  const northTact = buildRealisticTactileSwitch(
    pcbGreenMat,
    brushedMetalMat,
    darkHeaderMat,
    track,
    0x2563eb,
  );
  const northPad = new THREE.Mesh(tactPadGeo, accentBracketMat);
  northPad.position.y = -0.024;
  northTact.group.add(northPad);
  northTact.group.position.set(0, 0.21, 1.405);
  northTact.group.rotation.x = Math.PI / 2;
  helmetAssembly.add(northTact.group);
  explodableParts.push({
    group: northTact.group,
    basePos: northTact.group.position.clone(),
    explodeOffset: new THREE.Vector3(0, 0.08, 0.48),
    stage: 'perimeter',
  });
  tagInspectable(
    northTact.group,
    {
      partId: 'tact-north',
      labelKo: '전면(북) 틈새 연동 택트 스위치 (SW1)',
      sublabel: 'Arduino D6 · 안전모↔폴리곤 케이스 틈새 배치 · 전면 눌림 시 인접 택트 동시 연동',
      category: 'sensor',
    },
    interactables,
  );

  const eastTact = buildRealisticTactileSwitch(
    pcbGreenMat,
    brushedMetalMat,
    darkHeaderMat,
    track,
    0x2563eb,
  );
  const eastPad = new THREE.Mesh(tactPadGeo, accentBracketMat);
  eastPad.position.y = -0.024;
  eastTact.group.add(eastPad);
  eastTact.group.position.set(1.105, 0.22, 0.04);
  eastTact.group.rotation.z = -Math.PI / 2;
  helmetAssembly.add(eastTact.group);
  explodableParts.push({
    group: eastTact.group,
    basePos: eastTact.group.position.clone(),
    explodeOffset: new THREE.Vector3(0.52, 0.08, 0),
    stage: 'perimeter',
  });
  tagInspectable(
    eastTact.group,
    {
      partId: 'tact-east',
      labelKo: '우측(동) 틈새 연동 택트 스위치 (SW3)',
      sublabel: 'Arduino D8 · 안전모↔폴리곤 케이스 틈새 배치 · 우측 눌림 시 인접 택트 연동',
      category: 'sensor',
    },
    interactables,
  );

  const westTact = buildRealisticTactileSwitch(
    pcbGreenMat,
    brushedMetalMat,
    darkHeaderMat,
    track,
    0x2563eb,
  );
  const westPad = new THREE.Mesh(tactPadGeo, accentBracketMat);
  westPad.position.y = -0.024;
  westTact.group.add(westPad);
  westTact.group.position.set(-1.105, 0.22, 0.04);
  westTact.group.rotation.z = Math.PI / 2;
  helmetAssembly.add(westTact.group);
  explodableParts.push({
    group: westTact.group,
    basePos: westTact.group.position.clone(),
    explodeOffset: new THREE.Vector3(-0.52, 0.08, 0),
    stage: 'perimeter',
  });
  tagInspectable(
    westTact.group,
    {
      partId: 'tact-west',
      labelKo: '좌측(서) 틈새 연동 택트 스위치 (SW4)',
      sublabel: 'Arduino D9 · 안전모↔폴리곤 케이스 틈새 배치 · 좌측 눌림 시 인접 택트 연동',
      category: 'sensor',
    },
    interactables,
  );

  // --- 2E. FLUSH-MOUNTED FRONT FOREHEAD DUAL-LED MODULE + CIRCUIT PCB & 3D WIRING ---
  // Mathematically seated flush on the yellow helmet forehead ridge (x=0, y=0.40, z=1.295, pitch -0.25 rad)
  // with a curved saddle mount, vertical rim-anchor rail clasping the clip-on band, 220Ω/150Ω axial
  // current-limiting resistors, silkscreened LED-DRV PCB, 3-pin header, and 3 dedicated jumper wires
  // (D11 Red, GND Black, D12 Green) routed neatly down into the rim harness.
  const redLedMaterials: THREE.MeshStandardMaterial[] = [];
  const greenLedMaterials: THREE.MeshStandardMaterial[] = [];
  const frontLedPcbTex = track(createFrontLedPcbTexture());
  const frontLedPcbMat = track(
    new THREE.MeshStandardMaterial({
      map: frontLedPcbTex,
      roughness: 0.36,
      metalness: 0.18,
    }),
  );

  const ledPodConfigs = [
    {
      name: '전면 이마 밀착 경고 LED 모듈 (적1·녹1 · 220Ω/150Ω 회로)',
      pos: new THREE.Vector3(0, 0.445, 1.272),
      rotX: -0.27,
      rotY: 0,
      spacingX: 0.145,
      explode: new THREE.Vector3(0, 0.16, 0.46),
    },
  ];

  const ledDomeGeo = track(new THREE.SphereGeometry(0.044, 16, 12));
  const ledCylGeo = track(new THREE.CylinderGeometry(0.044, 0.048, 0.068, 16));
  const ledCollarGeo = track(new THREE.CylinderGeometry(0.056, 0.062, 0.044, 16));
  const resistorGeo = track(new THREE.CylinderGeometry(0.013, 0.013, 0.058, 10));
  const bandRingGeo = track(new THREE.CylinderGeometry(0.014, 0.014, 0.007, 10));
  const leadWireGeo = track(new THREE.CylinderGeometry(0.0038, 0.0038, 0.03, 6));

  const bandRedMat = track(new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.4 }));
  const bandBrownMat = track(new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.45 }));
  const bandGreenMat = track(new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.4 }));
  const bandGoldMat = track(
    new THREE.MeshStandardMaterial({ color: 0xeab308, metalness: 0.78, roughness: 0.24 }),
  );

  for (const cfg of ledPodConfigs) {
    const pod = new THREE.Group();
    pod.position.copy(cfg.pos);
    pod.rotation.set(cfg.rotX, cfg.rotY, 0);

    const pcbWidth = cfg.spacingX * 2 + 0.16;

    // 1) Contoured forehead saddle cradle embedded seamlessly against helmet dome curve (zero gap)
    const saddleCore = new THREE.Mesh(
      track(new THREE.BoxGeometry(pcbWidth + 0.045, 0.165, 0.092)),
      accentBracketMat,
    );
    saddleCore.position.set(0, -0.005, -0.044);
    saddleCore.castShadow = true;
    attachCadEdges(saddleCore, cadEdgeMat, cadEdgeLines, track, 28);
    pod.add(saddleCore);

    // Side curved silicone hugger wings pressing smoothly into the yellow shell forehead
    for (const side of [-1, 1]) {
      const wing = new THREE.Mesh(
        track(new THREE.BoxGeometry(0.065, 0.135, 0.088)),
        mattePolymerMat,
      );
      wing.position.set(side * (pcbWidth * 0.5 + 0.036), -0.005, -0.062);
      wing.rotation.y = side * -0.28;
      pod.add(wing);

      const screw = new THREE.Mesh(
        track(new THREE.CylinderGeometry(0.013, 0.013, 0.014, 6)),
        brushedMetalMat,
      );
      screw.rotation.x = Math.PI / 2;
      screw.position.set(side * (pcbWidth * 0.5 + 0.04), -0.005, -0.014);
      pod.add(screw);
    }

    // 2) Slim curved drop anchor rail tucked cleanly against the forehead behind the front tactile switch
    const dropRail = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.068, 0.305, 0.026)),
      mattePolymerMat,
    );
    dropRail.position.set(0, -0.23, -0.026);
    dropRail.castShadow = true;
    pod.add(dropRail);

    // Lower C-clamp jaw clasping the front clipBand cleanly at world (0, 0.06, 1.385)
    const rimClamp = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.115, 0.056, 0.072)),
      accentBracketMat,
    );
    rimClamp.position.set(0, -0.39, -0.008);
    attachCadEdges(rimClamp, cadEdgeMat, cadEdgeLines, track, 28);
    pod.add(rimClamp);

    // 3) Silkscreened FR-4 LED Driver Circuit PCB seated in saddle recess
    const ledPcb = new THREE.Mesh(
      track(new THREE.BoxGeometry(pcbWidth, 0.138, 0.022)),
      [
        pcbGreenMat,
        pcbGreenMat,
        pcbGreenMat,
        pcbGreenMat,
        frontLedPcbMat,
        pcbGreenMat,
      ],
    );
    ledPcb.position.set(0, 0, 0.01);
    pod.add(ledPcb);

    // 4) Axial current-limiting resistors with authentic color bands & bent metal leads
    //    Left: R1 220Ω (Red-Red-Brown-Gold) for Red LED (D11)
    //    Right: R2 150Ω (Brown-Green-Brown-Gold) for Green LED (D12)
    const resistorSpecs = [
      {
        x: -cfg.spacingX * 0.44,
        bands: [bandRedMat, bandRedMat, bandBrownMat, bandGoldMat],
      },
      {
        x: cfg.spacingX * 0.44,
        bands: [bandBrownMat, bandGreenMat, bandBrownMat, bandGoldMat],
      },
    ];
    for (const spec of resistorSpecs) {
      const rGroup = new THREE.Group();
      rGroup.position.set(spec.x, -0.026, 0.03);
      const body = new THREE.Mesh(resistorGeo, resistorTanMat);
      body.rotation.z = Math.PI / 2;
      rGroup.add(body);
      const bandOffsets = [-0.018, -0.006, 0.006, 0.018];
      spec.bands.forEach((bMat, idx) => {
        const band = new THREE.Mesh(bandRingGeo, bMat);
        band.rotation.z = Math.PI / 2;
        band.position.x = bandOffsets[idx];
        rGroup.add(band);
      });
      for (const endSign of [-1, 1]) {
        const leadHoriz = new THREE.Mesh(leadWireGeo, brushedMetalMat);
        leadHoriz.rotation.z = Math.PI / 2;
        leadHoriz.position.set(endSign * 0.036, 0, 0);
        const leadPin = new THREE.Mesh(
          track(new THREE.CylinderGeometry(0.0038, 0.0038, 0.02, 6)),
          brushedMetalMat,
        );
        leadPin.rotation.x = Math.PI / 2;
        leadPin.position.set(endSign * 0.048, 0, -0.009);
        rGroup.add(leadHoriz, leadPin);
      }
      pod.add(rGroup);
    }

    // 5) 3-Pin JST/Dupont circuit header at PCB bottom edge (D11 / GND / D12)
    const headerHousing = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.088, 0.036, 0.034)),
      darkHeaderMat,
    );
    headerHousing.position.set(0, -0.068, 0.022);
    pod.add(headerHousing);
    for (const pinX of [-0.024, 0, 0.024]) {
      const pin = new THREE.Mesh(
        track(new THREE.BoxGeometry(0.007, 0.022, 0.007)),
        copperPinMat,
      );
      pin.position.set(pinX, -0.088, 0.022);
      pod.add(pin);
    }

    // 6) Dedicated 3-wire insulated jumper bundle (D11 Red, GND Black, D12 Green)
    //    routed smoothly left & right around the front tactile switch into the rim harness
    const ledWireSpecs: Array<{
      x0: number;
      midX: number;
      sideTarget: number;
      yEnd: number;
      mat: THREE.Material;
    }> = [
      { x0: -0.024, midX: -0.115, sideTarget: -0.22, yEnd: -0.285, mat: wireRedMat },
      { x0: 0.0, midX: 0.11, sideTarget: 0.2, yEnd: -0.305, mat: wireBlackMat },
      { x0: 0.024, midX: 0.135, sideTarget: 0.23, yEnd: -0.27, mat: wireGreenMat },
    ];
    for (const lw of ledWireSpecs) {
      const wireCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(lw.x0, -0.084, 0.022),
        new THREE.Vector3(lw.x0 * 1.4, -0.13, 0.015),
        new THREE.Vector3(lw.midX, -0.175, 0.004),
        new THREE.Vector3(lw.sideTarget * 0.85, lw.yEnd + 0.03, 0.0),
        new THREE.Vector3(lw.sideTarget, lw.yEnd, -0.004),
      ]);
      const wireMesh = new THREE.Mesh(
        track(new THREE.TubeGeometry(wireCurve, 18, 0.0068, 6, false)),
        lw.mat,
      );
      pod.add(wireMesh);
    }

    // Cable-tie clip neatly securing the wiring below the PCB header
    const wireTie = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.082, 0.016, 0.038)),
      darkHeaderMat,
    );
    wireTie.position.set(0, -0.125, -0.008);
    pod.add(wireTie);

    // 7) Protective bezel collars + 5mm High-Brightness Dual LEDs (Red D11 / Green D12)
    for (const xOff of [-cfg.spacingX, cfg.spacingX]) {
      const collar = new THREE.Mesh(ledCollarGeo, darkHeaderMat);
      collar.rotation.x = Math.PI / 2;
      collar.position.set(xOff, 0.018, 0.036);
      pod.add(collar);
    }

    const redMat = track(
      new THREE.MeshStandardMaterial({
        color: 0xdc2626,
        emissive: 0xef4444,
        emissiveIntensity: 0.12,
        roughness: 0.18,
      }),
    );
    redLedMaterials.push(redMat);
    const redStem = new THREE.Mesh(ledCylGeo, redMat);
    redStem.rotation.x = Math.PI / 2;
    redStem.position.set(-cfg.spacingX, 0.018, 0.068);
    const redBulb = new THREE.Mesh(ledDomeGeo, redMat);
    redBulb.position.set(-cfg.spacingX, 0.018, 0.102);
    pod.add(redStem, redBulb);

    const greenMat = track(
      new THREE.MeshStandardMaterial({
        color: 0x16a34a,
        emissive: 0x22c55e,
        emissiveIntensity: 1.25,
        roughness: 0.18,
      }),
    );
    greenLedMaterials.push(greenMat);
    const greenStem = new THREE.Mesh(ledCylGeo, greenMat);
    greenStem.rotation.x = Math.PI / 2;
    greenStem.position.set(cfg.spacingX, 0.018, 0.068);
    const greenBulb = new THREE.Mesh(ledDomeGeo, greenMat);
    greenBulb.position.set(cfg.spacingX, 0.018, 0.102);
    pod.add(greenStem, greenBulb);

    helmetAssembly.add(pod);
    explodableParts.push({
      group: pod,
      basePos: pod.position.clone(),
      explodeOffset: cfg.explode,
      stage: 'perimeter',
    });
    tagInspectable(
      pod,
      {
        partId: 'led-pod-front-optimal',
        labelKo: cfg.name,
        sublabel: '헬멧 이마 곡면 밀착 거치 + 림 클램프 고정 · D11(적·220Ω)/D12(녹·150Ω)/GND 3선 직결 회로',
        category: 'actuator',
      },
      interactables,
    );
  }

  // --- 2F. INTERIOR HEAD DHT11 (FLUSH ON INNER HELMET WALL) + OPTIONAL SNAP-IN KIT SENSORS ---
  // Mathematically anchored flush against the inner right-forehead dome wall (above inner headband,
  // inside head ventilation air pocket) so it never floats in mid-air and never clips outside the shell.
  const dhtTheta = 0.38;
  const dhtPhi = 0.48;
  const domeRx = 1.06 * 1.03;
  const domeRy = 1.06 * 1.26;
  const domeRz = 1.06 * 1.24;
  const dhtWallPt = new THREE.Vector3(
    domeRx * Math.sin(dhtTheta) * Math.cos(dhtPhi),
    0.08 + domeRy * Math.sin(dhtPhi),
    domeRz * Math.cos(dhtTheta) * Math.cos(dhtPhi),
  );
  const dhtInwardNormal = new THREE.Vector3(
    -(dhtWallPt.x / (domeRx * domeRx)),
    -((dhtWallPt.y - 0.08) / (domeRy * domeRy)),
    -(dhtWallPt.z / (domeRz * domeRz)),
  ).normalize();
  const dhtBasisX = new THREE.Vector3()
    .crossVectors(new THREE.Vector3(0, 1, 0), dhtInwardNormal)
    .normalize();
  const dhtBasisY = new THREE.Vector3()
    .crossVectors(dhtInwardNormal, dhtBasisX)
    .normalize();
  const dhtOrientation = new THREE.Matrix4().makeBasis(dhtBasisX, dhtBasisY, dhtInwardNormal);

  const dht11Group = new THREE.Group();
  // Inset 0.072 inward along normal so all 4 corners of the flat mounting pad clear the curved dome
  // sagitta (zero outer shell poke-through!) while the center adhesive boss seats directly onto the inner wall.
  dht11Group.position.copy(dhtWallPt).addScaledVector(dhtInwardNormal, 0.072);
  dht11Group.quaternion.setFromRotationMatrix(dhtOrientation);

  // Center silicone adhesive boss pressing directly into the inner yellow helmet wall (zero outer bleed)
  const dhtWallBoss = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.052, 0.058, 0.042, 16)),
    accentBracketMat,
  );
  dhtWallBoss.rotation.x = Math.PI / 2;
  dhtWallBoss.position.set(0, 0, -0.042);

  // Inner backing cradle plate (safely inside inner dome curvature)
  const dhtWallPad = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.175, 0.295, 0.022)),
    accentBracketMat,
  );
  dhtWallPad.position.set(0, 0, -0.012);
  // Retaining clip rails holding the DHT11 PCB firmly to the inner adhesive cradle
  const dhtTopClip = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.185, 0.024, 0.042)),
    mattePolymerMat,
  );
  dhtTopClip.position.set(0, 0.142, 0.0);
  const dhtBotClip = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.185, 0.024, 0.042)),
    mattePolymerMat,
  );
  dhtBotClip.position.set(0, -0.142, 0.0);

  const dhtPcb = new THREE.Mesh(track(new THREE.BoxGeometry(0.15, 0.27, 0.022)), pcbBlueMat);
  dhtPcb.position.set(0, 0, 0.01);
  const dhtCage = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.128, 0.165, 0.076)),
    track(new THREE.MeshStandardMaterial({ map: dhtGrillTex, color: 0xffffff, roughness: 0.4 })),
  );
  dhtCage.position.set(0, 0.038, 0.058);
  const dhtPins = new THREE.Mesh(track(new THREE.BoxGeometry(0.086, 0.034, 0.028)), darkHeaderMat);
  dhtPins.position.set(0, -0.112, 0.028);
  dht11Group.add(dhtWallBoss, dhtWallPad, dhtTopClip, dhtBotClip, dhtPcb, dhtCage, dhtPins);

  // 3-wire internal ribbon harness (5V Red, A0 Green, GND Black) hugging the inner shell wall
  // cleanly inside the yellow dome down to the inner right helmet rim seam toward Arduino Uno A0
  const invDhtQuat = dht11Group.quaternion.clone().invert();
  const toDhtLocal = (worldPt: THREE.Vector3) =>
    worldPt.clone().sub(dht11Group.position).applyQuaternion(invDhtQuat);

  const dhtInnerWires: Array<{ xPin: number; thetaShift: number; mat: THREE.Material }> = [
    { xPin: -0.024, thetaShift: -0.015, mat: wireRedMat },
    { xPin: 0.0, thetaShift: 0.0, mat: wireGreenMat },
    { xPin: 0.024, thetaShift: 0.015, mat: wireBlackMat },
  ];
  for (const dw of dhtInnerWires) {
    const innerPtAt = (th: number, ph: number, inset: number) => {
      const p = new THREE.Vector3(
        domeRx * Math.sin(th) * Math.cos(ph),
        0.08 + domeRy * Math.sin(ph),
        domeRz * Math.cos(th) * Math.cos(ph),
      );
      const nIn = new THREE.Vector3(
        -(p.x / (domeRx * domeRx)),
        -((p.y - 0.08) / (domeRy * domeRy)),
        -(p.z / (domeRz * domeRz)),
      ).normalize();
      return p.addScaledVector(nIn, inset);
    };
    const ribbonCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(dw.xPin, -0.125, 0.028),
      toDhtLocal(innerPtAt(dhtTheta + 0.04 + dw.thetaShift, 0.34, 0.056)),
      toDhtLocal(innerPtAt(dhtTheta + 0.14 + dw.thetaShift, 0.18, 0.052)),
      toDhtLocal(innerPtAt(dhtTheta + 0.24 + dw.thetaShift, 0.04, 0.048)),
      toDhtLocal(new THREE.Vector3(0.74 + dw.xPin, 0.08, 1.02)),
    ]);
    const ribbonMesh = new THREE.Mesh(
      track(new THREE.TubeGeometry(ribbonCurve, 18, 0.0058, 6, false)),
      dw.mat,
    );
    dht11Group.add(ribbonMesh);
  }

  helmetAssembly.add(dht11Group);
  explodableParts.push({
    group: dht11Group,
    basePos: dht11Group.position.clone(),
    explodeOffset: new THREE.Vector3(0.42, -0.28, 0.56),
    stage: 'optional',
  });
  tagInspectable(
    dht11Group,
    {
      partId: 'dht11',
      labelKo: 'DHT11 헬멧 내부 벽면 밀착 두부 온습도 센서',
      sublabel: '안전모 안쪽 이마 상단 내벽 밀착 거치 · 내부 3선 리본 배선(5V/A0/GND) · 두부 열스트레스 측정',
      category: 'sensor',
    },
    interactables,
  );

  const mq2Group = new THREE.Group();
  mq2Group.position.set(0.87, 0.28, 1.07);
  mq2Group.rotation.y = 0.62;
  const mqBackMount = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.2, 0.15, 0.14)),
    accentBracketMat,
  );
  mqBackMount.position.set(0, 0, -0.08);
  const mqPcb = new THREE.Mesh(track(new THREE.BoxGeometry(0.24, 0.18, 0.026)), pcbBlueMat);
  const mqMeshCyl = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.074, 0.074, 0.125, 20)),
    track(
      new THREE.MeshStandardMaterial({
        map: meshGrillTex,
        color: 0xffffff,
        metalness: 0.72,
        roughness: 0.34,
      }),
    ),
  );
  mqMeshCyl.rotation.x = Math.PI / 2;
  mqMeshCyl.position.set(0.02, 0.01, 0.076);
  const mqRing = new THREE.Mesh(track(new THREE.TorusGeometry(0.075, 0.008, 8, 20)), copperPinMat);
  mqRing.position.set(0.02, 0.01, 0.136);
  const mqPot = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.055, 0.055, 0.042)),
    track(new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.4 })),
  );
  mqPot.position.set(-0.075, -0.02, 0.032);
  mq2Group.add(mqBackMount, mqPcb, mqMeshCyl, mqRing, mqPot);
  helmetAssembly.add(mq2Group);
  explodableParts.push({
    group: mq2Group,
    basePos: mq2Group.position.clone(),
    explodeOffset: new THREE.Vector3(0.42, 0.16, 0.48),
    stage: 'optional',
  });
  tagInspectable(
    mq2Group,
    {
      partId: 'mq2',
      labelKo: 'MQ-2 유해가스·연기 센서 (전면 우측 외피 노출 포트)',
      sublabel: '호흡면 전방 외기 노출 · LPG/메탄/연기 조기경보 (Arduino A1)',
      category: 'sensor',
    },
    interactables,
  );

  const ky037Group = new THREE.Group();
  ky037Group.position.set(-1.2, 0.34, -0.58);
  ky037Group.rotation.y = -Math.PI * 0.62;
  const kyBackMount = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.14, 0.24, 0.12)),
    accentBracketMat,
  );
  kyBackMount.position.set(0, 0, -0.07);
  const kyPcb = new THREE.Mesh(track(new THREE.BoxGeometry(0.16, 0.32, 0.024)), pcbRedMat);
  const kyMic = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.046, 0.046, 0.088, 16)),
    brushedMetalMat,
  );
  kyMic.rotation.x = Math.PI / 2;
  kyMic.position.set(0, 0.125, 0.054);
  const kyFelt = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.038, 0.038, 0.012, 16)),
    darkHeaderMat,
  );
  kyFelt.rotation.x = Math.PI / 2;
  kyFelt.position.set(0, 0.125, 0.098);
  const kyPot = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.072, 0.088, 0.052)),
    track(new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.4 })),
  );
  kyPot.position.set(0, -0.01, 0.036);
  const kyScrew = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.012, 0.012, 0.012, 10)),
    copperPinMat,
  );
  kyScrew.rotation.x = Math.PI / 2;
  kyScrew.position.set(0, 0.018, 0.064);
  ky037Group.add(kyBackMount, kyPcb, kyMic, kyFelt, kyPot, kyScrew);
  helmetAssembly.add(ky037Group);
  explodableParts.push({
    group: ky037Group,
    basePos: ky037Group.position.clone(),
    explodeOffset: new THREE.Vector3(-0.45, 0.14, -0.28),
    stage: 'optional',
  });
  tagInspectable(
    ky037Group,
    {
      partId: 'ky037',
      labelKo: 'KY-037 소음 감지 센서 (좌측 후면 외피 노출 마이크 포트)',
      sublabel: '외부 소음 직접 수음 · 85dBA 초과 건설소음 판별 (Arduino A2)',
      category: 'sensor',
    },
    interactables,
  );

  // =========================================================
  // 3. REMOVABLE GEODESIC FACETED POLYGON BOX FINISHING COVER
  //    ("폴리곤 박스 형식으로 케이스 덮듯이 맨마지막에 마감용 — 3D에서 제거 가능")
  // =========================================================
  const polygonCoverGroup = new THREE.Group();

  const polyGeo = track(createGeodesicPolygonCoverGeometry());
  const polyMesh = new THREE.Mesh(polyGeo, polygonKraftMat);
  polyMesh.castShadow = true;
  polyMesh.receiveShadow = true;
  polygonCoverGroup.add(polyMesh);

  // Crisp dark crease/fold lines between every triangular kraft panel (exact IMG_6117 look!)
  const polySeamsGeo = track(new THREE.EdgesGeometry(polyGeo, 4));
  const polySeams = new THREE.LineSegments(polySeamsGeo, polygonSeamMat);
  polySeams.scale.set(1.0025, 1.0025, 1.0025);
  polygonCoverGroup.add(polySeams);

  // Precision dark polymer cutout bezels seated flush on geodesic polygon cover
  // ONLY for essential external modules (HC-SR04 #1/#2, Buzzer, Front Minimal 2× LED pod).
  // All 5 tactile switches sit cleanly inside the inter-shell gap, and DHT11 sits inside the helmet interior!
  const apertureMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.52,
      metalness: 0.28,
    }),
  );
  const apertureRingGeo = track(new THREE.TorusGeometry(0.092, 0.016, 10, 22));

  // Crown HC-SR04 #1 twin ultrasonic bezels + Buzzer bezel
  for (const xOff of [-0.225, 0.025]) {
    const topPort = new THREE.Mesh(apertureRingGeo, apertureMat);
    topPort.rotation.x = Math.PI / 2;
    topPort.position.set(xOff, 1.622, 0.04);
    polygonCoverGroup.add(topPort);
  }
  const buzzerBezel = new THREE.Mesh(
    track(new THREE.TorusGeometry(0.112, 0.016, 10, 24)),
    apertureMat,
  );
  buzzerBezel.rotation.x = Math.PI / 2;
  buzzerBezel.position.set(0.23, 1.612, 0.04);
  polygonCoverGroup.add(buzzerBezel);

  // Rear HC-SR04 #2 twin ultrasonic bezels
  for (const xOff of [-0.125, 0.125]) {
    const rearPort = new THREE.Mesh(apertureRingGeo, apertureMat);
    rearPort.position.set(xOff, 0.6, -1.73);
    polygonCoverGroup.add(rearPort);
  }

  // Single Front-Upper Forehead Dual-LED rectangular cutout bezel aligned with forehead pitch
  const frontLedBezel = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.48, 0.155, 0.055)),
    apertureMat,
  );
  frontLedBezel.position.set(0, 0.43, 1.485);
  frontLedBezel.rotation.x = -0.25;
  polygonCoverGroup.add(frontLedBezel);

  helmetAssembly.add(polygonCoverGroup);
  explodableParts.push({
    group: polygonCoverGroup,
    basePos: polygonCoverGroup.position.clone(),
    explodeOffset: new THREE.Vector3(0, 1.15, 0),
    stage: 'cover',
    isOuterCover: true,
  });
  tagInspectable(
    polygonCoverGroup,
    {
      partId: 'polygon-finishing-cover',
      labelKo: '폴리곤 박스 외장 마감 케이스 (틈새 택트 연동형)',
      sublabel: '전면 2×LED·초음파 2조·부저만 외부 노출 · 5방향 택트는 외피-모체 틈새 연동 · DHT11 내부 배치',
      category: 'cover',
    },
    interactables,
  );

  // Glowing Cyan Mounting Alignment Guide Ring (visible during interactive Sensor Mounting Visualization)
  const mountGuideMat = track(
    new THREE.MeshBasicMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  const mountGuideRing = new THREE.Mesh(
    track(new THREE.RingGeometry(0.38, 0.43, 40)),
    mountGuideMat,
  );
  mountGuideRing.rotation.x = -Math.PI / 2;
  mountGuideRing.position.set(0, 1.56, 0.04);
  mountGuideRing.visible = false;
  helmetAssembly.add(mountGuideRing);

  // =========================================================
  // 4. TACTILE CAP MAP & CAD DISPLAY / POLYGON COVER MODES
  // =========================================================
  const tactSwitchCaps: SmartHelmetRig['tactSwitchCaps'] = {
    NORTH: {
      mesh: northTact.capMesh,
      baseLocalPos: northTact.capMesh.position.clone(),
      mat: northTact.capMat,
    },
    SOUTH: {
      mesh: southTact.capMesh,
      baseLocalPos: southTact.capMesh.position.clone(),
      mat: southTact.capMat,
    },
    EAST: {
      mesh: eastTact.capMesh,
      baseLocalPos: eastTact.capMesh.position.clone(),
      mat: eastTact.capMat,
    },
    WEST: {
      mesh: westTact.capMesh,
      baseLocalPos: westTact.capMesh.position.clone(),
      mat: westTact.capMat,
    },
    CROWN: {
      mesh: crownTact.capMesh,
      baseLocalPos: crownTact.capMesh.position.clone(),
      mat: crownTact.capMat,
    },
  };

  const applyCadModes = (displayMode: CadDisplayMode, coverMode: ShellCoverMode) => {
    const showEdges = displayMode === 'shaded-edges' || displayMode === 'xray';
    for (const edge of cadEdgeLines) {
      edge.visible = showEdges;
    }

    const isWire = displayMode === 'wireframe';
    const isXray = displayMode === 'xray';

    for (const mat of shellMaterials) {
      if ('wireframe' in mat) {
        (mat as THREE.MeshStandardMaterial).wireframe = isWire;
      }
    }

    // Polygon Finishing Cover toggle: closed (씌우기) | translucent (반투명) | open (제거)
    const coverRemoved = coverMode === 'open';
    const coverTranslucent = coverMode === 'translucent' || isXray;

    polygonCoverGroup.visible = !coverRemoved;
    polygonKraftMat.transparent = coverTranslucent;
    polygonKraftMat.opacity = isXray ? 0.24 : coverMode === 'translucent' ? 0.36 : 1.0;
    polygonKraftMat.depthWrite = !coverTranslucent;
    polygonKraftMat.needsUpdate = true;

    polygonSeamMat.opacity = coverTranslucent ? 0.55 : 0.85;
    polygonSeamMat.needsUpdate = true;

    // Slight ghosting on white base helmet only in full X-Ray CAD mode
    helmetShellMat.transparent = isXray;
    helmetShellMat.opacity = isXray ? 0.52 : 1.0;
    helmetShellMat.depthWrite = !isXray;
    helmetShellMat.needsUpdate = true;
  };

  const setStudioTheme = (isCinematic: boolean) => {
    triadGroup.visible = !isCinematic;
    if (isCinematic) {
      floorMat.color.setHex(0x1e293b);
      floorMat.roughness = 0.36;
      floorMat.metalness = 0.24;
      shadowMat.opacity = 0.92;
    } else {
      floorMat.color.setHex(0xffffff);
      floorMat.roughness = 0.9;
      floorMat.metalness = 0.02;
      shadowMat.opacity = 0.82;
    }
    floorMat.needsUpdate = true;
  };

  const applyCinematicCoverOpacity = (opacity: number) => {
    const visible = opacity > 0.01;
    const isTranslucent = opacity < 0.98;
    polygonCoverGroup.visible = visible;
    polygonKraftMat.transparent = isTranslucent;
    polygonKraftMat.opacity = opacity;
    polygonKraftMat.depthWrite = !isTranslucent;
    polygonKraftMat.needsUpdate = true;

    polygonSeamMat.opacity = Math.min(0.88, opacity * 0.95);
    polygonSeamMat.needsUpdate = true;
  };

  applyCadModes('shaded-edges', 'open');

  return {
    root,
    helmetAssembly,
    explodableParts,
    interactables,
    polygonCoverGroup,
    cadEdgeLines,
    shellMaterials,
    ultrasonicConeTop,
    ultrasonicConeRear,
    fallingObjectMesh,
    redLedMaterials,
    greenLedMaterials,
    buzzerRingMat,
    sonarWaveMesh,
    sonarWaveMat,
    tactSwitchCaps,
    optionalGroups: {
      dht11: dht11Group,
      mq2: mq2Group,
      ky037: ky037Group,
    },
    mountGuideRing,
    mountGuideMat,
    applyCadModes,
    setStudioTheme,
    applyCinematicCoverOpacity,
    dispose: () => {
      for (const d of disposables) {
        d.dispose();
      }
    },
  };
}
