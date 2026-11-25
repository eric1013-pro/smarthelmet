export type ImpactDirection = 'NONE' | 'NORTH' | 'SOUTH' | 'EAST' | 'WEST' | 'CROWN';

export type HazardSeverity = 'SAFE' | 'WARNING' | 'CRITICAL';

export type CameraPresetId = 'overview' | 'front' | 'crown' | 'rear' | 'side' | 'left';

export type CadDisplayMode = 'shaded-edges' | 'realistic' | 'xray' | 'wireframe';

export type ShellCoverMode = 'closed' | 'translucent' | 'open';

export type OptionalSensorKey = 'dht11' | 'mq2' | 'ky037';

export interface ModularConfig {
  includeDht11: boolean;
  includeMq2: boolean;
  includeKy037: boolean;
  ambientTempC: number;
  rearObstacleCm: number;
  gasPpm: number;
}

export interface UltrasonicSample {
  timeMs: number;
  distanceCm: number;
}

export interface FallingObjectAnalysis {
  detected: boolean;
  closingSpeedCmPerSec: number;
  latestDistanceCm: number;
  etaSeconds: number | null;
}

export interface WeightAndCoGMetrics {
  baseHelmetG: number;
  addonModuleG: number;
  totalG: number;
  kcsWeightCompliant: boolean; // <= 150g addon target from engineering report
  cogOffsetMm: number; // + front, - rear
  neckTorqueNm: number;
  balanceLabel: string;
}

export interface PowerBudgetMetrics {
  totalCurrentMa: number;
  totalPowerMw: number;
  batteryHours: number; // 3.7V 2500mAh @ 85% boost efficiency -> 7.8625 Wh usable
  exceedsShift8h: boolean;
}

export interface HazardInputs {
  fallingDetected: boolean;
  fallingDistanceCm: number;
  fallingSpeedCmPerSec: number;
  impactDirection: ImpactDirection;
  rearObstacleCm: number;
  gasPpm: number;
  includeMq2: boolean;
  activeWorkerCount: number; // 1..8
}

export interface HazardOutput {
  severity: HazardSeverity;
  lcdLine1: string; // Exactly <= 16 ASCII chars for 16x2 LCD
  lcdLine2: string; // Exactly <= 16 ASCII chars for 16x2 LCD
  sevenSegText: string; // 4 chars for TPK-128V2.4 7-segment display
  workerGreenLeds: boolean[]; // 8 green LEDs (Y0..Y7) on TPK-128V2.4
  workerFaultIndex: number | null; // 0..7 when worker #1 has alert
  helmetRedHz: number; // IEC 60073: 0 (off), 1.0 (slow), 2.5 (fast emergency)
  helmetGreenOn: boolean;
  buzzerMode: 'OFF' | 'INTERMITTENT' | 'RAPID';
  alertTitleKo: string;
  alertDetailKo: string;
}

export interface BomPartItem {
  id: string;
  calloutNo: number;
  nameKo: string;
  model: string;
  qty: number;
  zone: string;
  weightG: number;
  powerMw: number;
  mcuPins: string;
  photoPath?: string;
  optionalKey?: OptionalSensorKey;
  engineeringNote: string;
}

export const HELMET_DIMENSIONS_MM = {
  length: 285,
  width: 222,
  height: 162,
  crownPodHeight: 34,
  kcsClearanceMin: 25,
  kcsClearanceDesign: 36,
  kcsClearanceMax: 50,
  rearPodLength: 74,
  rearPodWidth: 60,
  rearPodHeight: 34,
  tpkWidth: 170,
  tpkHeight: 120,
} as const;

export const BOM_PARTS: BomPartItem[] = [
  {
    id: 'helmet-shell',
    calloutNo: 1,
    nameKo: 'KCs 인증 산업용 안전모 모체 (ABE종)',
    model: '표준 ABS 안전모 (무천공 유지)',
    qty: 1,
    zone: '기본 모체 (개조 금지)',
    weightG: 410,
    powerMw: 0,
    mcuPins: '비전기 절연 모체 (AC 20kV 내전압 보존)',
    photoPath: '/assets/aistudio/image_8737d6c1.png',
    engineeringNote:
      'KCs 안전인증 유지를 위해 모체 천공·절삭 금지. 모든 센서 모듈은 절연 폴리머 클립 밴드로 비파괴 탈부착.',
  },
  {
    id: 'hc-sr04-top',
    calloutNo: 2,
    nameKo: '상단 낙하물 감지 초음파 센서 #1',
    model: 'HC-SR04 (40kHz ToF)',
    qty: 1,
    zone: '정수리 상단 모듈 (+Y 지향)',
    weightG: 9,
    powerMw: 75,
    mcuPins: 'Arduino D2 (TRIG), D3 (ECHO)',
    photoPath: '/assets/aistudio/IMG_7181_d6d2b996.jpeg',
    engineeringNote:
      '연속 거리 미분(Δd/Δt) 낙하물 판별 알고리즘 + 65ms 시분할 발사로 #2 센서와 음향 혼선 차단.',
  },
  {
    id: 'active-buzzer',
    calloutNo: 3,
    nameKo: '능동 피에조 부저 (경보 출력)',
    model: '5V Active Buzzer + 2N2222 구동',
    qty: 1,
    zone: '정수리 상단 모듈 (초음파 인접)',
    weightG: 6,
    powerMw: 120,
    mcuPins: 'Arduino D13 → 1kΩ → 2N2222 + 1N4148',
    photoPath: '/assets/aistudio/IMG_6101_9dd7dd89.png',
    engineeringNote:
      'MCU GPIO 보호를 위해 NPN 트랜지스터 로우사이드 구동 + 플라이백 다이오드 적용. LED와 다중모달 연동.',
  },
  {
    id: 'tact-switches-5',
    calloutNo: 4,
    nameKo: '5방향 충격·전도 감지 택트 스위치 (동서남북+정수리)',
    model: '12×12mm 대형 택트 스위치 + 원형 캡',
    qty: 5,
    zone: '전(N)·후(S)·우(E)·좌(W) 테두리 + 정수리(Top)',
    weightG: 15,
    powerMw: 2,
    mcuPins: 'Arduino D6(N), D7(S), D8(E), D9(W), D10(Top)',
    photoPath: '/assets/aistudio/IMG_7181_d6d2b996.jpeg',
    engineeringNote:
      'INPUT_PULLUP + 0.1µF RC 필터 + 45ms 소프트웨어 시프트 레지스터 디바운싱으로 접점 바운스 제거.',
  },
  {
    id: 'hc-sr04-rear',
    calloutNo: 5,
    nameKo: '후방 사각지대 초음파 센서 #2',
    model: 'HC-SR04 (40kHz ToF)',
    qty: 1,
    zone: '후면 MCU 모듈 하우징 (-Z 지향)',
    weightG: 9,
    powerMw: 75,
    mcuPins: 'Arduino D4 (TRIG), D5 (ECHO)',
    photoPath: '/assets/aistudio/IMG_7181_d6d2b996.jpeg',
    engineeringNote:
      '후방 저속 장애물·배관 근접(30~200cm) 감시. 상단 센서와 65ms TDM 교대 트리거.',
  },
  {
    id: 'leds-rg',
    calloutNo: 6,
    nameKo: '양방향 시각 경보 LED 어레이 (적색 3 + 녹색 3)',
    model: '5mm 고휘도 Red(3) / Green(3) LED',
    qty: 6,
    zone: '전면 챙 + 좌/우 측면 모듈 바',
    weightG: 8,
    powerMw: 180,
    mcuPins: 'Arduino D11(적색, 220Ω×3), D12(녹색, 150Ω×3)',
    photoPath: '/assets/aistudio/IMG_6101_9dd7dd89.png',
    engineeringNote:
      'IEC 60073 표준 적용: 정상 시 녹색 점등, 주의 1Hz 점멸, 비상 2.5Hz 적색 고속 점멸로 양방향 시인성 확보.',
  },
  {
    id: 'arduino-uno',
    calloutNo: 7,
    nameKo: '헬멧 센서 제어기 (Arduino Uno R3)',
    model: 'Uno R3 CH340 + 절연 탈부착 하우징',
    qty: 1,
    zone: '후면 하단 절연 클립 포드 (CoG 균형)',
    weightG: 52,
    powerMw: 225,
    mcuPins: 'UART TX(D1)/RX(D0) → ATmega128 유선 하네스',
    photoPath: '/assets/aistudio/IMG_6101_9dd7dd89.png',
    engineeringNote:
      '무게중심(CoG) 전후 균형을 위해 후면 하단 탈부착 배치. 칼만 필터 + 낙하 속도 판별 수행.',
  },
  {
    id: 'atmega128-station',
    calloutNo: 8,
    nameKo: '중앙 관제센터 보드 (ATmega128)',
    model: 'TPK-128V2.4 (16×2 LCD + 녹색 LED 8개 + 7-Seg)',
    qty: 1,
    zone: '중앙 관제 스테이션 (유선 UART 연결)',
    weightG: 0, // External station, not on helmet
    powerMw: 0, // Powered separately at station
    mcuPins: 'PE0/PE1(UART0), PA0~PA7(Y0~Y7 LED), PORTC(LCD)',
    photoPath: '/assets/aistudio/IMG_7178_adceb581.jpeg',
    engineeringNote:
      '블루투스 모뎀 없이 유선 4심 하네스(TX/RX/GND/5V)로 헬멧 상태 수신. 8인 작업자 녹색 LED + LCD WARNING 출력.',
  },
  {
    id: 'dht11',
    calloutNo: 9,
    nameKo: '온습도 보정 센서 (선택 탈부착)',
    model: 'DHT11 모듈',
    qty: 1,
    zone: '우측 후면 보조 클립 슬롯',
    weightG: 4,
    powerMw: 12,
    mcuPins: 'Arduino A0 (DATA, 10kΩ 풀업)',
    photoPath: '/assets/aistudio/IMG_7182_47a9951c.jpeg',
    optionalKey: 'dht11',
    engineeringNote:
      '기온에 따른 초음파 음속 c = 331.3 + 0.606T 실시간 보정 (혹한기 -15°C 기준 13cm 오차 제거).',
  },
  {
    id: 'mq2-gas',
    calloutNo: 10,
    nameKo: '유해가스·연기 조기경보 모듈 (선택 탈부착)',
    model: 'MQ-2 가스 센서 (호흡대 전면 클립)',
    qty: 1,
    zone: '전면 챙 우측 호흡대 모듈',
    weightG: 14,
    powerMw: 800,
    mcuPins: 'Arduino A1 (AO), 5V 독립 히터 전원',
    photoPath: '/assets/aistudio/IMG_6101_9dd7dd89.png',
    optionalKey: 'mq2',
    engineeringNote:
      '히터 소비전력 ~800mW로 PoC 시연 시 유선/보조배터리 권장. 밀폐공간 가연성 가스·연기 조기경보.',
  },
  {
    id: 'ky037-sound',
    calloutNo: 11,
    nameKo: '현장 소음 감지 센서 (선택 탈부착)',
    model: 'KY-037 / LM393 마이크 모듈',
    qty: 1,
    zone: '좌측 측면 보조 클립 슬롯',
    weightG: 5,
    powerMw: 20,
    mcuPins: 'Arduino A2 (AO), LM393 비교기',
    photoPath: '/assets/aistudio/IMG_7179_0b481191.jpeg',
    optionalKey: 'ky037',
    engineeringNote:
      '건설현장 85dBA 초과 소음 감지 시 LED 고속 점멸 가중 및 관리자 경보 보조.',
  },
];

/**
 * Speed of sound in air (m/s) as a function of ambient temperature (°C).
 * Formula referenced from Rudyk et al. (2025) in user's engineering report.
 */
export function calculateSpeedOfSound(tempC: number): number {
  return Number((331.3 + 0.606 * tempC).toFixed(2));
}

/**
 * Converts ultrasonic echo pulse width (microseconds) to one-way distance (cm).
 */
export function measureUltrasonicDistanceCm(echoUs: number, tempC = 20): number {
  if (echoUs <= 0) return 0;
  const speedMPerS = calculateSpeedOfSound(tempC);
  const speedCmPerUs = speedMPerS / 10000;
  return Number(((echoUs * speedCmPerUs) / 2).toFixed(2));
}

/**
 * Computes systematic distance error (cm) when assuming fixed 20°C speed of sound
 * at an actual distance and ambient temperature.
 */
export function computeTemperatureErrorCm(actualDistanceCm: number, tempC: number): number {
  const c20 = calculateSpeedOfSound(20);
  const cActual = calculateSpeedOfSound(tempC);
  const measuredWithFixed20 = actualDistanceCm * (c20 / cActual);
  return Number((measuredWithFixed20 - actualDistanceCm).toFixed(1));
}

/**
 * Detects a rapidly falling object from time-ordered crown HC-SR04 samples.
 * Requires at least 2 samples, downward closing speed >= 120 cm/s, and object within 260 cm.
 */
export function detectFallingObject(samples: UltrasonicSample[]): FallingObjectAnalysis {
  if (samples.length < 2) {
    return {
      detected: false,
      closingSpeedCmPerSec: 0,
      latestDistanceCm: samples[0]?.distanceCm ?? 400,
      etaSeconds: null,
    };
  }

  const first = samples[0];
  const last = samples[samples.length - 1];
  const dtSec = (last.timeMs - first.timeMs) / 1000;
  if (dtSec <= 0) {
    return {
      detected: false,
      closingSpeedCmPerSec: 0,
      latestDistanceCm: last.distanceCm,
      etaSeconds: null,
    };
  }

  // Positive closingSpeed means object is approaching the crown sensor
  const closingSpeedCmPerSec = (first.distanceCm - last.distanceCm) / dtSec;
  const detected =
    closingSpeedCmPerSec >= 120 && last.distanceCm > 0 && last.distanceCm <= 260;

  const etaSeconds =
    closingSpeedCmPerSec > 10
      ? Number((last.distanceCm / closingSpeedCmPerSec).toFixed(2))
      : null;

  return {
    detected,
    closingSpeedCmPerSec: Number(closingSpeedCmPerSec.toFixed(1)),
    latestDistanceCm: Number(last.distanceCm.toFixed(1)),
    etaSeconds,
  };
}

/**
 * Evaluates total helmet modular weight, KCs <=150g add-on guideline compliance,
 * and longitudinal Center-of-Gravity offset + neck torque.
 */
export function evaluateSystemWeightAndCoG(config: ModularConfig): WeightAndCoGMetrics {
  const baseHelmetG = 410;
  const clipBracketG = 28; // Non-destructive insulated ABS clip frame
  // Core helmet-mounted electronics:
  // HC-SR04 #1 (9g) + Buzzer (6g) + 5x Tact switches (15g) + HC-SR04 #2 (9g) + 6x LEDs (8g) + Arduino Uno (52g) = 99g
  const coreElectronicsG = 99;
  const optionalG =
    (config.includeDht11 ? 4 : 0) +
    (config.includeMq2 ? 14 : 0) +
    (config.includeKy037 ? 5 : 0);

  const addonModuleG = clipBracketG + coreElectronicsG + optionalG;
  const totalG = baseHelmetG + addonModuleG;

  // Longitudinal moment calculation (mm from crown center; + front, - rear):
  // Front LEDs + N-switch: 12g at +115mm
  // Crown pod (HC-SR04 #1 + buzzer + Top switch + saddle): 30g at 0mm
  // Rear Arduino pod + HC-SR04 #2 + S-switch + clip: 75g at -98mm
  // Side switches & rails: 10g at 0mm
  // Optional: MQ-2 (+110mm), DHT11 (-55mm), KY-037 (0mm)
  const weightedMomentMm =
    12 * 115 +
    75 * -98 +
    (config.includeMq2 ? 14 * 110 : 0) +
    (config.includeDht11 ? 4 * -55 : 0);

  const cogOffsetMm = Number((weightedMomentMm / totalG).toFixed(1));
  const neckTorqueNm = Number(
    (Math.abs(weightedMomentMm) / 1000 / 1000 * 9.81).toFixed(3),
  );

  let balanceLabel = '전후 균형 양호';
  if (cogOffsetMm < -14) balanceLabel = '후면 편심 (경미)';
  else if (cogOffsetMm > 14) balanceLabel = '전면 편심 주의';

  return {
    baseHelmetG,
    addonModuleG,
    totalG,
    kcsWeightCompliant: addonModuleG <= 150,
    cogOffsetMm,
    neckTorqueNm,
    balanceLabel,
  };
}

/**
 * Estimates helmet-node power consumption and continuous runtime on a 3.7V 2500mAh Li-ion pack
 * (85% boost converter efficiency -> 7.8625 Wh usable).
 */
export function computePowerBudget(config: ModularConfig): PowerBudgetMetrics {
  // Base 5V components (active duty average):
  // Arduino Uno (225mW) + 2x HC-SR04 TDM avg (90mW) + 3 active LEDs avg (90mW) + Buzzer standby/avg (25mW) + Switches (2mW) = 432mW
  let totalPowerMw = 432;
  if (config.includeDht11) totalPowerMw += 12;
  if (config.includeMq2) totalPowerMw += 800; // Ceramic MOS heater bottleneck from engineering paper
  if (config.includeKy037) totalPowerMw += 20;

  const totalCurrentMa = Math.round(totalPowerMw / 5);
  const usableWh = 3.7 * 2.5 * 0.85; // 7.8625 Wh
  const batteryHours = Number(((usableWh * 1000) / totalPowerMw).toFixed(1));

  return {
    totalCurrentMa,
    totalPowerMw,
    batteryHours,
    exceedsShift8h: batteryHours >= 8,
  };
}

function fitLcd16(text: string): string {
  return text.slice(0, 16).padEnd(16, ' ');
}

function formatFourDigit(num: number): string {
  const clamped = Math.max(0, Math.min(9999, Math.round(num)));
  return String(clamped).padStart(4, '0');
}

const IMPACT_CODE_MAP: Record<ImpactDirection, { code: string; ko: string }> = {
  NONE: { code: 'OK', ko: '정상' },
  NORTH: { code: 'N-FRT', ko: '전면(북) 충격' },
  SOUTH: { code: 'S-RER', ko: '후면(남) 충격' },
  EAST: { code: 'E-RGT', ko: '우측(동) 충격' },
  WEST: { code: 'W-LFT', ko: '좌측(서) 충격' },
  CROWN: { code: 'TOP', ko: '정수리 충격' },
};

/**
 * Deterministic central hazard state machine shared between the 3D Helmet,
 * 3D ATmega128 TPK-128V2.4 Control Center (16x2 LCD + 8 Green LEDs + 7-Seg), and UI HUD.
 */
export function evaluateHazardState(inputs: HazardInputs): HazardOutput {
  const workerCount = Math.max(1, Math.min(8, Math.round(inputs.activeWorkerCount)));
  const workerGreenLeds = Array.from({ length: 8 }, (_, idx) => idx < workerCount);

  // Priority 1: Falling object detected by Crown HC-SR04 #1 velocity algorithm
  if (inputs.fallingDetected) {
    workerGreenLeds[0] = false; // Worker #1 LED drops to signal hazard
    const dist = Math.round(inputs.fallingDistanceCm);
    const spd = (inputs.fallingSpeedCmPerSec / 100).toFixed(1);
    return {
      severity: 'CRITICAL',
      lcdLine1: fitLcd16('WARNING: FALLING'),
      lcdLine2: fitLcd16(`W1 ${dist}cm ${spd}m/s`),
      sevenSegText: formatFourDigit(dist),
      workerGreenLeds,
      workerFaultIndex: 0,
      helmetRedHz: 2.5,
      helmetGreenOn: false,
      buzzerMode: 'RAPID',
      alertTitleKo: '상부 낙하물 위험 감지',
      alertDetailKo: `정수리 초음파 감지: 거리 ${dist}cm · 접근속도 ${spd}m/s (즉시 대피)`,
    };
  }

  // Priority 2: 5-direction Tactile Switch impact / fall detection (N/S/E/W/Crown)
  if (inputs.impactDirection !== 'NONE') {
    workerGreenLeds[0] = false;
    const info = IMPACT_CODE_MAP[inputs.impactDirection];
    return {
      severity: 'CRITICAL',
      lcdLine1: fitLcd16(`ALERT: HIT ${info.code}`),
      lcdLine2: fitLcd16('W1 FALL/IMPACT!'),
      sevenSegText: '9999',
      workerGreenLeds,
      workerFaultIndex: 0,
      helmetRedHz: 2.5,
      helmetGreenOn: false,
      buzzerMode: 'RAPID',
      alertTitleKo: `택트 스위치 충격 감지 (${info.ko})`,
      alertDetailKo: '전도·충돌 충격 감지 — 정수리 능동 부저 및 적색 LED 2.5Hz 비상 경보 작동 중',
    };
  }

  // Priority 3: Optional MQ-2 gas alarm (> 300 ppm)
  if (inputs.includeMq2 && inputs.gasPpm >= 300) {
    workerGreenLeds[0] = false;
    const ppm = Math.round(inputs.gasPpm);
    return {
      severity: 'CRITICAL',
      lcdLine1: fitLcd16('DANGER: GAS LEAK'),
      lcdLine2: fitLcd16(`W1 MQ2 ${ppm} PPM`),
      sevenSegText: formatFourDigit(ppm),
      workerGreenLeds,
      workerFaultIndex: 0,
      helmetRedHz: 2.5,
      helmetGreenOn: false,
      buzzerMode: 'RAPID',
      alertTitleKo: '유해가스 농도 임계 초과',
      alertDetailKo: `MQ-2 감지 ${ppm} ppm (기준 300 ppm 초과) — 환기 및 대피 필요`,
    };
  }

  // Priority 4: Rear HC-SR04 #2 close obstacle warning (< 80 cm)
  if (inputs.rearObstacleCm > 0 && inputs.rearObstacleCm < 80) {
    const dist = Math.round(inputs.rearObstacleCm);
    return {
      severity: 'WARNING',
      lcdLine1: fitLcd16('CAUTION: REAR OB'),
      lcdLine2: fitLcd16(`W1 DIST ${dist} cm`),
      sevenSegText: formatFourDigit(dist),
      workerGreenLeds,
      workerFaultIndex: 0,
      helmetRedHz: 1.0, // IEC 60073 slow warning flash
      helmetGreenOn: true,
      buzzerMode: 'INTERMITTENT',
      alertTitleKo: '후방 근접 장애물 주의',
      alertDetailKo: `후면 초음파 #2 감지 거리 ${dist}cm (80cm 미만 주의 경보)`,
    };
  }

  // Safe nominal state
  return {
    severity: 'SAFE',
    lcdLine1: fitLcd16(`SAFE: ${workerCount} WORKERS`),
    lcdLine2: fitLcd16('ALL SENSORS OK  '),
    sevenSegText: formatFourDigit(inputs.rearObstacleCm),
    workerGreenLeds,
    workerFaultIndex: null,
    helmetRedHz: 0,
    helmetGreenOn: true,
    buzzerMode: 'OFF',
    alertTitleKo: '스마트 안전모 정상 감지 중',
    alertDetailKo: '양방향 녹색 LED 점등 · 상단/후면 초음파 65ms 시분할 감지 정상',
  };
}
