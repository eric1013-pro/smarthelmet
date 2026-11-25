import type { HazardSeverity, ImpactDirection } from './helmetEngine';

export type AssemblyStage =
  | 'base'
  | 'frame'
  | 'rear'
  | 'crown'
  | 'perimeter'
  | 'optional'
  | 'cover';

export interface CinematicChapter {
  index: number;
  code: string;
  startSec: number;
  endSec: number;
  titleKo: string;
  subtitleKo: string;
  badgeEn: string;
}

export interface CinematicFrameState {
  timeSec: number;
  progress: number; // 0..1
  chapter: CinematicChapter;
  chapterLocalProgress: number; // 0..1
  cameraPos: [number, number, number];
  cameraTarget: [number, number, number];
  /** Per-stage assembly progress: 0 = hidden/unmounted, (0..1) = gliding into place, 1 = seated */
  stages: Record<AssemblyStage, number>;
  /** Polygon finishing cover material opacity (smooth ghost -> solid transition on descent) */
  polygonOpacity: number;
  /** Ultrasonic cone expansion scale (0..1) */
  beamScale: number;
  /** Falling object drop progress (null when hidden, 0..1 during live hazard test) */
  fallingProgress: number | null;
  /** Live actuator & hazard visual state */
  severity: HazardSeverity;
  redLedHz: number;
  greenLedOn: boolean;
  buzzerActive: boolean;
  impactDirection: ImpactDirection;
  /** Subtitle opacity envelope (smooth fade in/out inside each chapter) */
  captionOpacity: number;
  /** Scene fade-in / fade-out curtain alpha (0 = fully visible, 1 = black) */
  curtainAlpha: number;
}

export const CINEMATIC_DURATION_SEC = 22.0;

export const CINEMATIC_CHAPTERS: readonly CinematicChapter[] = [
  {
    index: 0,
    code: '01',
    startSec: 0.0,
    endSec: 3.0,
    badgeEn: 'BASE SHELL',
    titleKo: 'KCs ABE 산업용 안전모 모체',
    subtitleKo: '무천공·비파괴 원칙으로 절연 성능과 충격 완충 구조(36mm)를 온전히 보존합니다.',
  },
  {
    index: 1,
    code: '02',
    startSec: 3.0,
    endSec: 6.2,
    badgeEn: 'CLIP-ON FRAME',
    titleKo: '4점 비파괴 클립 및 아치 프레임 결합',
    subtitleKo: '헬멧 외피에 구멍을 뚫지 않고 림 클램프와 상부 아치 레일로 견고하게 고정합니다.',
  },
  {
    index: 2,
    code: '03',
    startSec: 6.2,
    endSec: 10.0,
    badgeEn: 'REAR MCU & POWER',
    titleKo: '후면 Arduino Uno R3 · 2500mAh 전원부 · 초음파 #2',
    subtitleKo: '후면 무게중심 균형 배치와 5색 점퍼 배선, 후방 사각지대 감지 초음파를 통합합니다.',
  },
  {
    index: 3,
    code: '04',
    startSec: 10.0,
    endSec: 13.8,
    badgeEn: '360° SENSOR ARRAY',
    titleKo: '정수리 낙하물 센서 · 5방향 택트 · 양방향 LED 실장',
    subtitleKo: '상부 HC-SR04 #1·능동 부저·5방향 충격 스위치·적/녹 LED와 확장 센서가 활성화됩니다.',
  },
  {
    index: 4,
    code: '05',
    startSec: 13.8,
    endSec: 17.8,
    badgeEn: 'LIVE HAZARD RESPONSE',
    titleKo: '실시간 낙하물 감지 및 즉각 경보 작동',
    subtitleKo: '65ms 시분할 초음파로 낙하물을 포착해 4Hz 적색 LED와 85dB 피에조 부저를 즉시 작동합니다.',
  },
  {
    index: 5,
    code: '06',
    startSec: 17.8,
    endSec: 22.0,
    badgeEn: 'POLYGON FINISHING SHELL',
    titleKo: '지오데식 폴리곤 마감 케이스 최종 결합',
    subtitleKo: '탈부착형 삼각 다면체 외피로 모든 노출 센서와 배선을 감싸며 최종 외형을 완성합니다.',
  },
] as const;

export function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export function easeOutCubic(t: number): number {
  const x = clamp01(t);
  return 1 - Math.pow(1 - x, 3);
}

export function easeInOutCubic(t: number): number {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

function stageProgress(timeSec: number, startSec: number, durationSec: number): number {
  if (timeSec <= startSec) return 0;
  if (timeSec >= startSec + durationSec) return 1;
  return easeOutCubic((timeSec - startSec) / durationSec);
}

interface CameraKeyframe {
  t: number;
  pos: [number, number, number];
  target: [number, number, number];
}

const CAMERA_KEYFRAMES: readonly CameraKeyframe[] = [
  // Ch 1: Hero low-angle front-left sweep on clean yellow KCs helmet (generous breathing room)
  { t: 0.0, pos: [-3.95, 2.05, 4.95], target: [0.0, 0.56, 0.04] },
  { t: 3.0, pos: [3.25, 2.25, 5.15], target: [0.0, 0.58, 0.04] },
  // Ch 2: Elevated 3/4 view watching clip-on rim & twin arch rails snap down
  { t: 6.2, pos: [4.75, 2.55, 1.55], target: [0.0, 0.62, 0.0] },
  // Ch 3: Dramatic sweep to Rear 3/4 showcasing Arduino Uno R3, Li-ion battery & HC-SR04 #2
  { t: 7.4, pos: [2.65, 1.92, -4.95], target: [0.0, 0.58, -0.32] },
  { t: 10.0, pos: [-2.55, 1.98, -5.05], target: [0.0, 0.6, -0.25] },
  // Ch 4: Glide over crown & around to front-right 3/4 for crown pod, tactile switches & LEDs
  { t: 11.4, pos: [-3.15, 3.15, 3.35], target: [0.0, 0.72, 0.05] },
  { t: 13.8, pos: [3.65, 2.55, 4.95], target: [0.0, 0.72, 0.05] },
  // Ch 5: Hero front-right tracking shot for live falling object + 4Hz LED + buzzer alarm
  { t: 15.8, pos: [3.25, 2.65, 5.25], target: [0.0, 0.92, 0.04] },
  { t: 17.8, pos: [3.85, 2.7, 5.35], target: [0.0, 0.74, 0.04] },
  // Ch 6: Grand reveal orbit as geodesic kraft polygon finishing cover descends & locks
  { t: 19.6, pos: [4.15, 2.95, 5.25], target: [0.0, 0.72, 0.02] },
  { t: 22.0, pos: [-3.35, 2.5, 5.65], target: [0.0, 0.64, 0.02] },
];

function sampleCamera(timeSec: number): {
  pos: [number, number, number];
  target: [number, number, number];
} {
  const t = Math.max(0, Math.min(CINEMATIC_DURATION_SEC, timeSec));
  for (let i = 0; i < CAMERA_KEYFRAMES.length - 1; i++) {
    const k0 = CAMERA_KEYFRAMES[i];
    const k1 = CAMERA_KEYFRAMES[i + 1];
    if (t >= k0.t && t <= k1.t) {
      const span = Math.max(0.0001, k1.t - k0.t);
      const u = easeInOutCubic((t - k0.t) / span);
      return {
        pos: [
          k0.pos[0] + (k1.pos[0] - k0.pos[0]) * u,
          k0.pos[1] + (k1.pos[1] - k0.pos[1]) * u,
          k0.pos[2] + (k1.pos[2] - k0.pos[2]) * u,
        ],
        target: [
          k0.target[0] + (k1.target[0] - k0.target[0]) * u,
          k0.target[1] + (k1.target[1] - k0.target[1]) * u,
          k0.target[2] + (k1.target[2] - k0.target[2]) * u,
        ],
      };
    }
  }
  const last = CAMERA_KEYFRAMES[CAMERA_KEYFRAMES.length - 1];
  return { pos: [...last.pos], target: [...last.target] };
}

export function evaluateCinematicFrame(rawTimeSec: number): CinematicFrameState {
  const timeSec = Math.max(0, Math.min(CINEMATIC_DURATION_SEC, rawTimeSec));
  const progress = timeSec / CINEMATIC_DURATION_SEC;

  let chapter = CINEMATIC_CHAPTERS[CINEMATIC_CHAPTERS.length - 1];
  for (const ch of CINEMATIC_CHAPTERS) {
    if (timeSec >= ch.startSec && timeSec < ch.endSec) {
      chapter = ch;
      break;
    }
  }
  const chapterSpan = Math.max(0.001, chapter.endSec - chapter.startSec);
  const chapterLocalProgress = clamp01((timeSec - chapter.startSec) / chapterSpan);

  // Smooth caption opacity envelope within each chapter
  const fadeIn = clamp01((timeSec - chapter.startSec) / 0.45);
  const fadeOut =
    chapter.index === CINEMATIC_CHAPTERS.length - 1
      ? 1
      : clamp01((chapter.endSec - timeSec) / 0.35);
  const captionOpacity = Math.min(fadeIn, fadeOut);

  // Gentle opening fade-in from black (0..0.6s)
  const curtainAlpha = timeSec < 0.6 ? 1 - easeOutCubic(timeSec / 0.6) : 0;

  // Staged assembly progression
  const stages: Record<AssemblyStage, number> = {
    base: 1,
    frame: stageProgress(timeSec, 3.25, 2.05),
    rear: stageProgress(timeSec, 6.75, 2.2),
    crown: stageProgress(timeSec, 10.25, 1.55),
    perimeter: stageProgress(timeSec, 11.15, 1.65),
    optional: stageProgress(timeSec, 11.85, 1.35),
    cover: stageProgress(timeSec, 18.15, 2.25),
  };

  // Polygon finishing cover glides down ghosted translucent -> solidifies as it locks onto rim
  let polygonOpacity = 0;
  if (stages.cover > 0) {
    if (timeSec < 20.0) {
      polygonOpacity = 0.25 + 0.45 * clamp01((timeSec - 18.15) / 1.85);
    } else {
      polygonOpacity = 0.7 + 0.3 * clamp01((timeSec - 20.0) / 0.75);
    }
  }

  // Ultrasonic cones activate smoothly once sensors are powered on (t >= 12.6s)
  const beamScale = stageProgress(timeSec, 12.6, 0.95);

  // Chapter 5: Live falling object & tactile/LED/buzzer alarm demonstration (14.2s .. 17.6s)
  let fallingProgress: number | null = null;
  let severity: HazardSeverity = 'SAFE';
  let redLedHz = 0;
  let greenLedOn = timeSec >= 12.5;
  let buzzerActive = false;
  let impactDirection: ImpactDirection = 'NONE';

  if (timeSec >= 14.1 && timeSec <= 17.55) {
    const dropU = clamp01((timeSec - 14.1) / 1.75);
    fallingProgress = dropU;
    if (dropU >= 0.28) {
      severity = 'CRITICAL';
      redLedHz = 4;
      greenLedOn = false;
      buzzerActive = true;
    }
    if (timeSec >= 16.05 && timeSec <= 17.35) {
      impactDirection = 'CROWN';
    }
  }

  const cam = sampleCamera(timeSec);

  return {
    timeSec,
    progress,
    chapter,
    chapterLocalProgress,
    cameraPos: cam.pos,
    cameraTarget: cam.target,
    stages,
    polygonOpacity,
    beamScale,
    fallingProgress,
    severity,
    redLedHz,
    greenLedOn,
    buzzerActive,
    impactDirection,
    captionOpacity,
    curtainAlpha,
  };
}
