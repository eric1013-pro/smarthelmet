import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  buildSmartHelmetScene,
  type InspectablePartMeta,
  type SmartHelmetRig,
} from './helmetGeometry';
import type { CinematicFrameState } from '../engineering/cinematicTimeline';
import type {
  CadDisplayMode,
  CameraPresetId,
  HazardOutput,
  ImpactDirection,
  ModularConfig,
  ShellCoverMode,
} from '../engineering/helmetEngine';

export interface SmartHelmetViewportHandle {
  canvas: HTMLCanvasElement;
  renderCinematicFrameNow: (frame: CinematicFrameState) => void;
}

interface SmartHelmetViewportProps {
  explodeFactor: number; // 0..1
  cameraPreset: CameraPresetId;
  cameraPresetTrigger: number;
  displayMode: CadDisplayMode;
  coverMode: ShellCoverMode;
  showCones: boolean;
  modularConfig: ModularConfig;
  hazard: HazardOutput;
  impactDirection: ImpactDirection;
  fallingProgress: number | null; // null when idle, 0..1 while object drops into crown cone
  cinematicActive?: boolean;
  cinematicFrame?: CinematicFrameState | null;
  onInspectPart: (meta: InspectablePartMeta | null) => void;
  onViewportHandle?: (handle: SmartHelmetViewportHandle | null) => void;
}

const CAMERA_PRESETS: Record<
  CameraPresetId,
  { pos: [number, number, number]; target: [number, number, number] }
> = {
  overview: { pos: [3.65, 2.72, 5.35], target: [0, 0.68, 0.02] },
  front: { pos: [0.0, 1.48, 5.25], target: [0, 0.65, 0.08] },
  crown: { pos: [1.05, 3.85, 2.75], target: [0, 1.32, 0.04] },
  rear: { pos: [-1.55, 1.78, -5.45], target: [0, 0.65, -0.22] },
  side: { pos: [5.35, 1.48, 0.15], target: [0, 0.65, 0.0] },
  left: { pos: [-5.35, 1.48, 0.15], target: [0, 0.65, 0.0] },
};

const BG_CAD = new THREE.Color(0xeef2f7);
const BG_CINEMA = new THREE.Color(0x0b1019);

const _vecTargetPos = new THREE.Vector3();
const _vecTargetLook = new THREE.Vector3();
const _raycaster = new THREE.Raycaster();
const _pointer = new THREE.Vector2();

function detectSoftwareGl(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export function SmartHelmetViewport({
  explodeFactor,
  cameraPreset,
  cameraPresetTrigger,
  displayMode,
  coverMode,
  showCones,
  modularConfig,
  hazard,
  impactDirection,
  fallingProgress,
  cinematicActive = false,
  cinematicFrame = null,
  onInspectPart,
  onViewportHandle,
}: SmartHelmetViewportProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [webglError, setWebglError] = useState<string | null>(null);

  // Store latest props in refs so WebGLRenderer mounts ONCE and never resets
  const stateRef = useRef({
    explodeFactor,
    displayMode,
    coverMode,
    showCones,
    modularConfig,
    hazard,
    impactDirection,
    fallingProgress,
    cinematicActive,
    cinematicFrame,
  });
  stateRef.current = {
    explodeFactor,
    displayMode,
    coverMode,
    showCones,
    modularConfig,
    hazard,
    impactDirection,
    fallingProgress,
    cinematicActive,
    cinematicFrame,
  };

  const onInspectRef = useRef(onInspectPart);
  onInspectRef.current = onInspectPart;

  const onViewportHandleRef = useRef(onViewportHandle);
  onViewportHandleRef.current = onViewportHandle;

  const triggerRenderRef = useRef<(() => void) | null>(null);
  const transitionCameraRef = useRef<((preset: CameraPresetId) => void) | null>(null);
  const rigRef = useRef<SmartHelmetRig | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareGl();

    const scene = new THREE.Scene();
    scene.background = BG_CAD.clone();
    const fog = new THREE.Fog(BG_CAD.getHex(), 11, 24);
    scene.fog = fog;

    const width = container.clientWidth || 1280;
    const height = container.clientHeight || 720;

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 60);
    const initial = CAMERA_PRESETS.overview;
    camera.position.set(...initial.pos);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: true,
      });
    } catch (err) {
      setWebglError(
        err instanceof Error ? err.message : '브라우저에서 WebGL 3D 가속을 초기화할 수 없습니다.',
      );
      return;
    }

    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    // Mandatory studio environment reflections (RoomEnvironment) on all devices
    let envTex: THREE.Texture | null = null;
    try {
      const pmrem = new THREE.PMREMGenerator(renderer);
      envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environment = envTex;
      pmrem.dispose();
    } catch {
      // Continue with direct 3-point lighting if PMREM is unavailable on an older GPU
    }

    // Warm/Cool 3-point studio lighting rig (dynamically shifts to luxury showcase lighting in Cinematic Mode)
    const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0xcbd5e1, 0.85);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff7ed, 1.55);
    keyLight.position.set(4.5, 7.5, 5.2);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 20;
    keyLight.shadow.camera.left = -5.5;
    keyLight.shadow.camera.right = 5.5;
    keyLight.shadow.camera.top = 5.5;
    keyLight.shadow.camera.bottom = -5.5;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xbfdbfe, 0.65);
    rimLight.position.set(-5.0, 4.0, -4.5);
    scene.add(rimLight);

    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const rig = buildSmartHelmetScene(maxAniso);
    rigRef.current = rig;
    scene.add(rig.root);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(...initial.target);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.08;
    controls.minDistance = 2.0;
    controls.maxDistance = 11.5;
    controls.maxPolarAngle = Math.PI * 0.485;
    controls.update();

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Smooth transition & render scheduling state
    let currentExplode = stateRef.current.explodeFactor;
    let appliedDisplayMode: CadDisplayMode | null = null;
    let appliedCoverMode: ShellCoverMode | null = null;
    let appliedCinematicLook: boolean | null = null;
    let cameraTransitionActive = false;
    let frameId = 0;
    let renderBusy = false;
    let renderDirty = false;
    let disposed = false;
    let lastTime = performance.now();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const status = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (status === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function applyDynamicSceneState(nowMs: number, dt: number): boolean {
      const st = stateRef.current;
      let needsMoreFrames = false;

      // 0. Studio Lighting & Theme Transition (Bright CAD vs. Luxury Obsidian Showcase)
      if (appliedCinematicLook !== st.cinematicActive) {
        appliedCinematicLook = st.cinematicActive;
        rig.setStudioTheme(st.cinematicActive);
        if (st.cinematicActive) {
          scene.background = BG_CINEMA.clone();
          fog.color.copy(BG_CINEMA);
          fog.near = 6.2;
          fog.far = 15.2;
          hemiLight.intensity = 0.55;
          keyLight.intensity = 1.95;
          rimLight.color.setHex(0x7dd3fc);
          rimLight.intensity = 1.25;
          renderer.toneMappingExposure = 1.12;
          controls.enabled = false;
          rig.applyCadModes('realistic', 'closed');
          appliedDisplayMode = null;
          appliedCoverMode = null;
        } else {
          scene.background = BG_CAD.clone();
          fog.color.copy(BG_CAD);
          fog.near = 11;
          fog.far = 24;
          hemiLight.intensity = 0.85;
          keyLight.intensity = 1.55;
          rimLight.color.setHex(0xbfdbfe);
          rimLight.intensity = 0.65;
          renderer.toneMappingExposure = 1.08;
          controls.enabled = true;
          // Restore all groups visible before CAD mode applies cover/optional toggles
          for (const item of rig.explodableParts) {
            item.group.visible = true;
          }
          rig.ultrasonicConeTop.scale.set(1, 1, 1);
          rig.ultrasonicConeRear.scale.set(1, 1, 1);
          const cfg = CAMERA_PRESETS.overview;
          camera.position.set(...cfg.pos);
          controls.target.set(...cfg.target);
        }
      }

      // =========================================================
      // BRANCH A: CINEMATIC PRODUCT LAUNCH SHOWCASE MODE
      // =========================================================
      if (st.cinematicActive && st.cinematicFrame) {
        const cf = st.cinematicFrame;

        // 1. Camera choreography
        camera.position.set(...cf.cameraPos);
        controls.target.set(...cf.cameraTarget);

        // 2. Staged per-module assembly glide from outer offset into seated position
        for (const item of rig.explodableParts) {
          if (item.stage === 'cover') {
            const rem = 1 - cf.stages.cover;
            item.group.position.set(
              item.basePos.x,
              item.basePos.y + item.explodeOffset.y * 1.45 * rem,
              item.basePos.z,
            );
            rig.applyCinematicCoverOpacity(cf.polygonOpacity);
            continue;
          }

          const prog = cf.stages[item.stage];
          const isOptional = item.stage === 'optional';
          if (isOptional) {
            // Respect user's optional sensor config in cinematic too (default DHT11 shown!)
            const optVisible =
              (item.group === rig.optionalGroups.dht11 && st.modularConfig.includeDht11) ||
              (item.group === rig.optionalGroups.mq2 && st.modularConfig.includeMq2) ||
              (item.group === rig.optionalGroups.ky037 && st.modularConfig.includeKy037);
            item.group.visible = prog > 0.005 && optVisible;
          } else {
            item.group.visible = prog > 0.005;
          }

          if (item.group.visible) {
            const rem = 1 - prog;
            const mult = item.stage === 'frame' ? 2.1 : 1.45;
            item.group.position.set(
              item.basePos.x + item.explodeOffset.x * mult * rem,
              item.basePos.y + item.explodeOffset.y * mult * rem,
              item.basePos.z + item.explodeOffset.z * mult * rem,
            );
          }
        }

        // 3. Ultrasonic cones smooth expansion
        const showBeam = cf.beamScale > 0.01;
        rig.ultrasonicConeTop.visible = showBeam;
        rig.ultrasonicConeRear.visible = showBeam;
        rig.ultrasonicConeTop.scale.set(cf.beamScale, cf.beamScale, cf.beamScale);
        rig.ultrasonicConeRear.scale.set(cf.beamScale, cf.beamScale, cf.beamScale);

        // 4. Falling object prop + cone color response
        const topConeMat = rig.ultrasonicConeTop.material as THREE.MeshBasicMaterial;
        if (cf.fallingProgress !== null) {
          rig.fallingObjectMesh.visible = true;
          rig.fallingObjectMesh.position.y = 3.65 - cf.fallingProgress * 1.82;
          rig.fallingObjectMesh.rotation.z = cf.fallingProgress * 1.45;
          topConeMat.color.setHex(cf.severity === 'CRITICAL' ? 0xef4444 : 0x38bdf8);
          topConeMat.opacity = cf.severity === 'CRITICAL' ? 0.34 : 0.18;
        } else {
          rig.fallingObjectMesh.visible = false;
          topConeMat.color.setHex(0x38bdf8);
          topConeMat.opacity = 0.18;
        }

        // 5. LEDs + Buzzer + Acoustic Sonar Ripple Wave
        const blinkOn =
          cf.redLedHz > 0 ? Math.sin(cf.timeSec * Math.PI * 2 * cf.redLedHz) >= 0 : false;
        for (const rMat of rig.redLedMaterials) {
          rMat.emissiveIntensity = cf.redLedHz > 0 && (blinkOn || isSoftwareGl) ? 3.0 : 0.08;
        }
        for (const gMat of rig.greenLedMaterials) {
          gMat.emissiveIntensity = cf.greenLedOn ? 1.8 : 0.05;
        }
        rig.buzzerRingMat.emissiveIntensity = cf.buzzerActive ? 2.6 : 0.0;

        if (cf.buzzerActive) {
          const waveCycle = (cf.timeSec * 2.2) % 1;
          rig.sonarWaveMesh.visible = true;
          const s = 1 + waveCycle * 3.8;
          rig.sonarWaveMesh.scale.set(s, s, 1);
          rig.sonarWaveMat.opacity = (1 - waveCycle) * 0.72;
        } else {
          rig.sonarWaveMesh.visible = false;
        }

        // 6. Tactile Switches depressed highlight
        const dirs: Array<Exclude<ImpactDirection, 'NONE'>> = [
          'NORTH',
          'SOUTH',
          'EAST',
          'WEST',
          'CROWN',
        ];
        for (const dir of dirs) {
          const entry = rig.tactSwitchCaps[dir];
          const hit = cf.impactDirection === dir;
          entry.mesh.position.y = entry.baseLocalPos.y - (hit ? 0.025 : 0);
          entry.mat.color.setHex(hit ? 0xef4444 : 0x2563eb);
          entry.mat.emissive.setHex(hit ? 0xef4444 : 0x000000);
          entry.mat.emissiveIntensity = hit ? 1.8 : 0;
        }

        return false;
      }

      // =========================================================
      // BRANCH B: INTERACTIVE 3D CAD MODELING MODE
      // =========================================================
      const targetExplode = st.explodeFactor;
      if (Math.abs(currentExplode - targetExplode) > 0.002) {
        currentExplode = isSoftwareGl
          ? targetExplode
          : THREE.MathUtils.damp(currentExplode, targetExplode, 8, dt);
        if (Math.abs(currentExplode - targetExplode) > 0.002) {
          needsMoreFrames = true;
        }
      } else {
        currentExplode = targetExplode;
      }

      for (const item of rig.explodableParts) {
        item.group.position.set(
          item.basePos.x + item.explodeOffset.x * currentExplode,
          item.basePos.y + item.explodeOffset.y * currentExplode,
          item.basePos.z + item.explodeOffset.z * currentExplode,
        );
      }

      if (cameraTransitionActive) {
        if (isSoftwareGl) {
          camera.position.copy(_vecTargetPos);
          controls.target.copy(_vecTargetLook);
          cameraTransitionActive = false;
        } else {
          const alpha = 1 - Math.exp(-7 * dt);
          camera.position.lerp(_vecTargetPos, alpha);
          controls.target.lerp(_vecTargetLook, alpha);
          if (
            camera.position.distanceTo(_vecTargetPos) < 0.02 &&
            controls.target.distanceTo(_vecTargetLook) < 0.02
          ) {
            camera.position.copy(_vecTargetPos);
            controls.target.copy(_vecTargetLook);
            cameraTransitionActive = false;
          } else {
            needsMoreFrames = true;
          }
        }
      }

      if (appliedDisplayMode !== st.displayMode || appliedCoverMode !== st.coverMode) {
        rig.applyCadModes(st.displayMode, st.coverMode);
        appliedDisplayMode = st.displayMode;
        appliedCoverMode = st.coverMode;
      }

      rig.ultrasonicConeTop.visible = st.showCones;
      rig.ultrasonicConeRear.visible = st.showCones;
      rig.optionalGroups.dht11.visible = st.modularConfig.includeDht11;
      rig.optionalGroups.mq2.visible = st.modularConfig.includeMq2;
      rig.optionalGroups.ky037.visible = st.modularConfig.includeKy037;

      if (st.fallingProgress !== null) {
        rig.fallingObjectMesh.visible = true;
        rig.fallingObjectMesh.position.y = 3.65 - st.fallingProgress * 1.82;
        rig.fallingObjectMesh.rotation.z = st.fallingProgress * 1.4;
        const coneMat = rig.ultrasonicConeTop.material as THREE.MeshBasicMaterial;
        coneMat.color.setHex(st.hazard.severity === 'CRITICAL' ? 0xef4444 : 0x0ea5e9);
        coneMat.opacity = st.hazard.severity === 'CRITICAL' ? 0.28 : 0.14;
      } else {
        rig.fallingObjectMesh.visible = false;
        const coneMat = rig.ultrasonicConeTop.material as THREE.MeshBasicMaterial;
        coneMat.color.setHex(0x0ea5e9);
        coneMat.opacity = 0.14;
      }

      const tSec = nowMs / 1000;
      const blinkOn =
        st.hazard.helmetRedHz > 0
          ? Math.sin(tSec * Math.PI * 2 * st.hazard.helmetRedHz) >= 0
          : false;

      if (st.hazard.helmetRedHz > 0 && !isSoftwareGl) {
        needsMoreFrames = true;
      }

      for (const rMat of rig.redLedMaterials) {
        rMat.emissiveIntensity = st.hazard.helmetRedHz > 0 && (blinkOn || isSoftwareGl) ? 2.4 : 0.08;
      }
      for (const gMat of rig.greenLedMaterials) {
        gMat.emissiveIntensity = st.hazard.helmetGreenOn ? 1.35 : 0.05;
      }

      const buzzerOn = st.hazard.buzzerMode !== 'OFF';
      rig.buzzerRingMat.emissiveIntensity = buzzerOn && (blinkOn || isSoftwareGl) ? 2.0 : 0.0;
      if (buzzerOn) {
        const waveCycle = (tSec * 2.0) % 1;
        rig.sonarWaveMesh.visible = true;
        const s = 1 + waveCycle * 3.2;
        rig.sonarWaveMesh.scale.set(s, s, 1);
        rig.sonarWaveMat.opacity = (1 - waveCycle) * 0.55;
      } else {
        rig.sonarWaveMesh.visible = false;
      }

      const dirs: Array<Exclude<ImpactDirection, 'NONE'>> = [
        'NORTH',
        'SOUTH',
        'EAST',
        'WEST',
        'CROWN',
      ];
      for (const dir of dirs) {
        const entry = rig.tactSwitchCaps[dir];
        const hit = st.impactDirection === dir;
        entry.mesh.position.y = entry.baseLocalPos.y - (hit ? 0.025 : 0);
        entry.mat.color.setHex(hit ? 0xef4444 : 0x2563eb);
        entry.mat.emissive.setHex(hit ? 0xef4444 : 0x000000);
        entry.mat.emissiveIntensity = hit ? 1.4 : 0;
      }

      return needsMoreFrames;
    }

    function requestRender() {
      if (disposed) return;
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame((nowMs) => {
        if (disposed) return;
        renderDirty = false;
        const dt = Math.min(0.05, Math.max(0.001, (nowMs - lastTime) / 1000));
        lastTime = nowMs;

        const keepGoing = applyDynamicSceneState(nowMs, dt);
        controls.update();
        renderer.render(scene, camera);

        const done = () => {
          renderBusy = false;
          if (!disposed && (renderDirty || keepGoing)) {
            requestRender();
          }
        };
        if (isSoftwareGl) afterDraw(done);
        else done();
      });
    }

    triggerRenderRef.current = requestRender;
    transitionCameraRef.current = (preset: CameraPresetId) => {
      if (stateRef.current.cinematicActive) return;
      const cfg = CAMERA_PRESETS[preset];
      _vecTargetPos.set(...cfg.pos);
      _vecTargetLook.set(...cfg.target);
      cameraTransitionActive = true;
      requestRender();
    };

    const handleControlStart = () => {
      cameraTransitionActive = false;
    };
    const handleControlChange = () => {
      requestRender();
    };
    controls.addEventListener('start', handleControlStart);
    controls.addEventListener('change', handleControlChange);

    // Click raycasting on dedicated interactables array (disabled during cinematic playback)
    let pointerDownX = 0;
    let pointerDownY = 0;
    const handlePointerDown = (e: PointerEvent) => {
      pointerDownX = e.clientX;
      pointerDownY = e.clientY;
    };
    const handlePointerUp = (e: PointerEvent) => {
      if (stateRef.current.cinematicActive) return;
      const moved = Math.hypot(e.clientX - pointerDownX, e.clientY - pointerDownY);
      if (moved > 6) return;
      const rect = renderer.domElement.getBoundingClientRect();
      _pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      _pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      _raycaster.setFromCamera(_pointer, camera);
      const hits = _raycaster.intersectObjects(rig.interactables, true);
      if (hits.length > 0 && hits[0].object.userData.inspectMeta) {
        onInspectRef.current(hits[0].object.userData.inspectMeta as InspectablePartMeta);
      } else {
        onInspectRef.current(null);
      }
    };
    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const w = Math.max(300, Math.floor(entry.contentRect.width));
      const h = Math.max(240, Math.floor(entry.contentRect.height));
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      applyDynamicSceneState(performance.now(), 0.016);
      controls.update();
      renderer.render(scene, camera);
    });
    resizeObserver.observe(container);

    // Expose synchronous frame renderer for deterministic H.264 MP4 encoding
    onViewportHandleRef.current?.({
      canvas: renderer.domElement,
      renderCinematicFrameNow: (frame: CinematicFrameState) => {
        if (disposed) return;
        stateRef.current = {
          ...stateRef.current,
          cinematicActive: true,
          cinematicFrame: frame,
        };
        applyDynamicSceneState(frame.timeSec * 1000, 1 / 30);
        controls.update();
        renderer.render(scene, camera);
      },
    });

    // Synchronous first-frame render so initial paint is never blank
    applyDynamicSceneState(performance.now(), 0.016);
    controls.update();
    renderer.render(scene, camera);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      onViewportHandleRef.current?.(null);
      resizeObserver.disconnect();
      controls.removeEventListener('start', handleControlStart);
      controls.removeEventListener('change', handleControlChange);
      controls.dispose();
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      rig.dispose();
      envTex?.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      rigRef.current = null;
      triggerRenderRef.current = null;
      transitionCameraRef.current = null;
    };
  }, []);

  // Re-render whenever dynamic helmet or cinematic frame props change
  useEffect(() => {
    triggerRenderRef.current?.();
  }, [
    explodeFactor,
    displayMode,
    coverMode,
    showCones,
    modularConfig,
    hazard,
    impactDirection,
    fallingProgress,
    cinematicActive,
    cinematicFrame,
  ]);

  // Camera preset transitions (CAD mode only)
  useEffect(() => {
    transitionCameraRef.current?.(cameraPreset);
  }, [cameraPreset, cameraPresetTrigger]);

  if (webglError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-100 p-6">
        <div className="max-w-md bg-white border border-slate-200 rounded-xl p-6 shadow-xs text-center space-y-2">
          <h2 className="text-base font-bold text-slate-900">
            3D WebGL 뷰포트를 표시할 수 없습니다
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            현재 브라우저의 하드웨어 가속(WebGL)이 비활성화되어 있습니다. 브라우저 설정에서 하드웨어 가속을 켜시거나 상단의 <strong>2D 설계 도면</strong> 및 <strong>부품 및 배선도</strong> 탭을 이용해 주세요.
          </p>
          <p className="text-[11px] font-mono-tabular text-slate-400 break-all">{webglError}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mountRef}
      data-testid="smart-helmet-3d-canvas"
      className={`w-full h-full ${cinematicActive ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}`}
      aria-label="모듈형 스마트 안전모 3D CAD 및 시네마틱 뷰포트"
    />
  );
}
