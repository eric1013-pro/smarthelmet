export type AtmegaScenarioId = 'safe' | 'falling' | 'impact' | 'rear' | 'heat' | 'gas';

export type FndDisplayMode = 'worker_code' | 'distance' | 'head_temp' | 'golden_time';

export type WorkerLedState = 'ON' | 'BLINK_FAST' | 'BLINK_SLOW' | 'OFF';

export interface WorkerLedInfo {
  workerId: number; // 1..8
  pin: string; // Y0..Y7
  ledRef: string; // D6..D13 matching TPK-128V2.4 silkscreen
  row: 0 | 1; // 0 = upper row (Y4..Y7), 1 = lower row (Y0..Y3)
  col: 0 | 1 | 2 | 3;
  state: WorkerLedState;
  statusLabelKo: string;
}

export interface FndDisplayOutput {
  mode: FndDisplayMode;
  digits: [string, string, string, string];
  dots: [boolean, boolean, boolean, boolean];
  formatted: string;
  captionKo: string;
}

export interface Atmega128BoardOutput {
  scenario: AtmegaScenarioId;
  severity: 'SAFE' | 'WARNING' | 'CRITICAL';
  activeWorkerId: number;
  onlineCount: number;
  lcdLine1: string; // strictly 16 ASCII chars (DDRAM 0x80..0x8F)
  lcdLine2: string; // strictly 16 ASCII chars (DDRAM 0xC0..0xCF)
  uartPacket: string;
  workerLeds: WorkerLedInfo[];
  fnd: FndDisplayOutput;
  boardBuzzerOn: boolean;
  portBitmaskHex: string; // e.g. 0xFB when toggling Y2
  cCodeLines: [string, string, string];
}

export interface FndIdeaItem {
  id: FndDisplayMode;
  badge: string;
  title: string;
  exampleSafe: string;
  exampleAlert: string;
  summary: string;
  bestFor: string;
}

/**
 * Physical 2x4 green LED silkscreen mapping verified directly from the TPK-128V2.4 board photo:
 * Upper row (next to AR2 330ohm): D8(Y4), D12(Y5), D9(Y6), D13(Y7)
 * Lower row (above J29 header):   D6(Y0), D10(Y1), D7(Y2), D11(Y3)
 */
export const TPK128_LED_MAP: ReadonlyArray<{
  workerId: number;
  pin: string;
  ledRef: string;
  row: 0 | 1;
  col: 0 | 1 | 2 | 3;
}> = [
  { workerId: 1, pin: 'Y0', ledRef: 'D6', row: 1, col: 0 },
  { workerId: 2, pin: 'Y1', ledRef: 'D10', row: 1, col: 1 },
  { workerId: 3, pin: 'Y2', ledRef: 'D7', row: 1, col: 2 },
  { workerId: 4, pin: 'Y3', ledRef: 'D11', row: 1, col: 3 },
  { workerId: 5, pin: 'Y4', ledRef: 'D8', row: 0, col: 0 },
  { workerId: 6, pin: 'Y5', ledRef: 'D12', row: 0, col: 1 },
  { workerId: 7, pin: 'Y6', ledRef: 'D9', row: 0, col: 2 },
  { workerId: 8, pin: 'Y7', ledRef: 'D13', row: 0, col: 3 },
];

export const FND_IDEAS: readonly FndIdeaItem[] = [
  {
    id: 'worker_code',
    badge: '추천 1순위',
    title: '작업자 번호 + 위험코드',
    exampleSafe: '08.00',
    exampleAlert: '03.F1',
    summary:
      '평소엔 [접속 인원.경보 수(08.00)], 사고 시 [작업자 번호.위험코드(03.F1=3번 낙하물, 03.E1=충격, 03.H1=열사병)]를 표시합니다.',
    bestFor: '멀리서도 빨간 7-Seg만 보고 "몇 번 작업자에게 무슨 위험인지" 0.5초 만에 식별',
  },
  {
    id: 'distance',
    badge: '센서 수치 직관',
    title: '실시간 초음파 거리 (cm)',
    exampleSafe: '0185',
    exampleAlert: '0038',
    summary:
      'HC-SR04 상단/후방 초음파 거리(cm) 또는 MQ-2 가스 농도(ppm)를 4자리 숫자로 실시간 표시합니다.',
    bestFor: '시연 발표 시 손이나 물체를 가까이 댈 때마다 숫자가 즉시 변해 시각적 효과가 탁월',
  },
  {
    id: 'head_temp',
    badge: '폭염·열사병',
    title: '헬멧 내부 두부 온도 (°C)',
    exampleSafe: '28.5',
    exampleAlert: '39.2',
    summary:
      '헬멧 안쪽 DHT11 센서가 측정한 작업자 머리 주변 온도를 소수점 1자리(예: 39.2°C)로 표시합니다.',
    bestFor: '여름철 건설현장 온열질환(열사병) 예방 모니터링 어필에 최적',
  },
  {
    id: 'golden_time',
    badge: '구조 골든타임',
    title: '위험 발생 경과시간 (분.초)',
    exampleSafe: '00.00',
    exampleAlert: '00.14',
    summary:
      '위험 경보가 울린 순간부터 경과 시간(MM.SS)을 자동 카운트업해 관제사가 구조 골든타임을 체크합니다.',
    bestFor: '낙상·충격 후 무응답 경과 시간 추적 등 현장 안전관리 시나리오에 매우 설득력 높음',
  },
];

export interface Atmega128Input {
  scenario: AtmegaScenarioId;
  activeWorkerId: number; // 1..8 (faulted or inspected worker)
  fndMode: FndDisplayMode;
  elapsedAlertSec?: number;
  offlineWorkers?: number[]; // optional list of 1..8 offline workers
}

/**
 * Enforces authentic HD44780 16x2 CLCD constraint:
 * exactly 16 printable ASCII characters (0x20..0x7E) per row.
 */
export function formatHd44780Line(text: string): string {
  const asciiOnly = text.replace(/[^\x20-\x7E]/g, ' ');
  if (asciiOnly.length >= 16) {
    return asciiOnly.slice(0, 16);
  }
  return asciiOnly.padEnd(16, ' ');
}

function clampWorkerId(id: number): number {
  if (!Number.isFinite(id)) return 1;
  return Math.max(1, Math.min(8, Math.round(id)));
}

function pad2(n: number): string {
  return String(Math.max(0, Math.min(99, Math.floor(n)))).padStart(2, '0');
}

function formatFndDigits(
  mode: FndDisplayMode,
  scenario: AtmegaScenarioId,
  workerId: number,
  onlineCount: number,
  elapsedSec: number,
): FndDisplayOutput {
  const w2 = pad2(workerId);

  if (mode === 'worker_code') {
    if (scenario === 'safe') {
      const on2 = pad2(onlineCount);
      return {
        mode,
        digits: [on2[0], on2[1], '0', '0'],
        dots: [false, true, false, false],
        formatted: `${on2}.00`,
        captionKo: `접속 ${onlineCount}명 · 경보 0건`,
      };
    }
    const codeMap: Record<Exclude<AtmegaScenarioId, 'safe'>, [string, string, string]> = {
      falling: ['F', '1', `W${w2} 낙하물 코드(F1)`],
      impact: ['E', '1', `W${w2} 충격 코드(E1)`],
      rear: ['r', '1', `W${w2} 후방접근 코드(r1)`],
      heat: ['H', '1', `W${w2} 내부 고온 코드(H1)`],
      gas: ['g', '1', `W${w2} 유해가스 코드(g1)`],
    };
    const [c0, c1, label] = codeMap[scenario];
    return {
      mode,
      digits: [w2[0], w2[1], c0, c1],
      dots: [false, true, false, false],
      formatted: `${w2}.${c0}${c1}`,
      captionKo: label,
    };
  }

  if (mode === 'distance') {
    const valMap: Record<AtmegaScenarioId, { str: string; caption: string }> = {
      safe: { str: '0185', caption: '후방·상단 안전거리 185cm' },
      falling: { str: '0038', caption: '상단 낙하물 거리 38cm!' },
      impact: { str: '0000', caption: '외피 직접 접촉 충격 (0cm)' },
      rear: { str: '0054', caption: '후방 사각지대 접근 54cm' },
      heat: { str: '0185', caption: '거리 정상 185cm (온도 경보)' },
      gas: { str: '0360', caption: 'MQ-2 가스 농도 360ppm' },
    };
    const v = valMap[scenario];
    return {
      mode,
      digits: [v.str[0], v.str[1], v.str[2], v.str[3]],
      dots: [false, false, false, false],
      formatted: v.str,
      captionKo: v.caption,
    };
  }

  if (mode === 'head_temp') {
    const isHeat = scenario === 'heat';
    const tempStr = isHeat ? '392C' : '285C';
    return {
      mode,
      digits: [tempStr[0], tempStr[1], tempStr[2], tempStr[3]],
      dots: [false, true, false, false],
      formatted: isHeat ? '39.2C' : '28.5C',
      captionKo: isHeat
        ? `W${w2} 헬멧 내부 39.2°C (열사병 경보!)`
        : '헬멧 내부 두부 온도 28.5°C (쾌적)',
    };
  }

  // golden_time
  if (scenario === 'safe') {
    return {
      mode,
      digits: ['0', '0', '0', '0'],
      dots: [false, true, false, false],
      formatted: '00.00',
      captionKo: '경보 대기 (골든타임 타이머 정지)',
    };
  }
  const safeSec = Math.max(0, Math.floor(elapsedSec));
  const mm = pad2(Math.floor(safeSec / 60));
  const ss = pad2(safeSec % 60);
  return {
    mode,
    digits: [mm[0], mm[1], ss[0], ss[1]],
    dots: [false, true, false, false],
    formatted: `${mm}.${ss}`,
    captionKo: `W${w2} 사고 발생 후 ${mm}분 ${ss}초 경과`,
  };
}

/**
 * Pure state machine for the ATmega128 (TPK-128V2.4) Central Control Station.
 * Matches real 16x2 HD44780 CLCD, 4-digit FND, and 8x all-green worker LEDs (Y0..Y7).
 */
export function evaluateAtmega128Display(input: Atmega128Input): Atmega128BoardOutput {
  const activeWorkerId = clampWorkerId(input.activeWorkerId);
  const offlineSet = new Set(
    (input.offlineWorkers ?? []).filter((id) => id >= 1 && id <= 8 && id !== activeWorkerId),
  );
  const onlineCount = 8 - offlineSet.size;
  const w2 = pad2(activeWorkerId);

  let severity: 'SAFE' | 'WARNING' | 'CRITICAL' = 'SAFE';
  let rawLine1 = `SAFE: ${onlineCount}/8 ONLINE`;
  let rawLine2 = 'T:28.5C  R:185cm';
  let uartPacket = `$W${w2},SAFE,185*`;

  switch (input.scenario) {
    case 'falling':
      severity = 'CRITICAL';
      rawLine1 = `W${w2}:FALL!  038cm`;
      rawLine2 = 'EVAC! SPD:2.6m/s';
      uartPacket = `$W${w2},FALL,038*`;
      break;
    case 'impact':
      severity = 'CRITICAL';
      rawLine1 = `W${w2}:IMPACT NORTH`;
      rawLine2 = 'TACT:N+3  CHECK!';
      uartPacket = `$W${w2},IMP,N+3*`;
      break;
    case 'rear':
      severity = 'WARNING';
      rawLine1 = `W${w2}:REAR!  054cm`;
      rawLine2 = 'BLIND ZONE WARN ';
      uartPacket = `$W${w2},REAR,054*`;
      break;
    case 'heat':
      severity = 'WARNING';
      rawLine1 = `W${w2}:HEAT!  39.2C`;
      rawLine2 = 'HEAD HUM:78% RST';
      uartPacket = `$W${w2},HEAT,392*`;
      break;
    case 'gas':
      severity = 'WARNING';
      rawLine1 = `W${w2}:GAS!  360ppm`;
      rawLine2 = 'VENTILATE NOW!  ';
      uartPacket = `$W${w2},GAS,360*`;
      break;
    case 'safe':
    default:
      severity = 'SAFE';
      break;
  }

  const lcdLine1 = formatHd44780Line(rawLine1);
  const lcdLine2 = formatHd44780Line(rawLine2);

  const workerLeds: WorkerLedInfo[] = TPK128_LED_MAP.map((entry) => {
    if (offlineSet.has(entry.workerId)) {
      return {
        ...entry,
        state: 'OFF',
        statusLabelKo: '미착용/오프라인 (소등)',
      };
    }
    if (entry.workerId === activeWorkerId && severity === 'CRITICAL') {
      return {
        ...entry,
        state: 'BLINK_FAST',
        statusLabelKo: '위험 발생! (녹색 4Hz 고속 점멸)',
      };
    }
    if (entry.workerId === activeWorkerId && severity === 'WARNING') {
      return {
        ...entry,
        state: 'BLINK_SLOW',
        statusLabelKo: '주의 경보 (녹색 1.5Hz 점멸)',
      };
    }
    return {
      ...entry,
      state: 'ON',
      statusLabelKo: '정상 착용·통신 중 (녹색 점등)',
    };
  });

  // Compute PORTA 8-bit LED output mask (bit 0 = Y0 = W1 ... bit 7 = Y7 = W8)
  let bitmask = 0;
  for (const led of workerLeds) {
    if (led.state !== 'OFF') {
      bitmask |= 1 << (led.workerId - 1);
    }
  }
  const portBitmaskHex = `0x${bitmask.toString(16).toUpperCase().padStart(2, '0')}`;

  const fnd = formatFndDigits(
    input.fndMode,
    input.scenario,
    activeWorkerId,
    onlineCount,
    input.elapsedAlertSec ?? 0,
  );

  const workerBit = activeWorkerId - 1;
  const ledCodeLine =
    severity === 'SAFE'
      ? `PORTA = ${portBitmaskHex}; // Y0~Y7 전원·통신 정상 녹색 점등`
      : `PORTA ^= (1 << ${workerBit}); // Y${workerBit}(W${w2}) 녹색 LED만 ${
          severity === 'CRITICAL' ? '4Hz 고속' : '1.5Hz 주의'
        } 점멸`;

  return {
    scenario: input.scenario,
    severity,
    activeWorkerId,
    onlineCount,
    lcdLine1,
    lcdLine2,
    uartPacket,
    workerLeds,
    fnd,
    boardBuzzerOn: severity !== 'SAFE',
    portBitmaskHex,
    cCodeLines: [
      `LCD_cmd(0x80); LCD_str("${lcdLine1}");`,
      `LCD_cmd(0xC0); LCD_str("${lcdLine2}");`,
      ledCodeLine,
    ],
  };
}
