import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Layers,
  ListChecks,
  RotateCcw,
  Zap,
} from 'lucide-react';
import {
  evaluateHazardState,
  type ImpactDirection,
  type ModularConfig,
} from '../engineering/helmetEngine';
import {
  evaluateAtmega128Display,
  type AtmegaScenarioId,
  type FndDisplayMode,
} from '../engineering/atmega128Board';
import { Atmega128ControlPanel } from './Atmega128ControlPanel';

interface InteractiveWiringSimulatorProps {
  modularConfig: ModularConfig;
}

type SimulatorMode = 'guide' | 'simulate';
type SimScenarioId = AtmegaScenarioId;

interface WiringStepItem {
  step: number;
  shortTitle: string;
  title: string;
  summary: string;
  tip: string;
  connections: Array<{
    from: string;
    to: string;
    colorName: string;
    colorHex: string;
    note: string;
  }>;
}

const WIRING_STEPS: WiringStepItem[] = [
  {
    step: 1,
    shortTitle: '1. 전원부',
    title: '5V 전원부 & 공통 접지(GND) 연결',
    summary: '배터리 승압기(MT3608 5V 출력)를 Arduino Uno R3의 5V 및 GND에 먼저 연결합니다.',
    tip: '100µF 전해 콘덴서를 5V-GND 사이에 병렬 연결하면 부저·초음파 동시 동작 시 전압 강하를 막아줍니다.',
    connections: [
      {
        from: 'MT3608 OUT+ (5V)',
        to: 'Arduino Uno 5V 핀',
        colorName: '적색',
        colorHex: '#dc2626',
        note: '모든 센서 VCC(+5V) 공통 공급선',
      },
      {
        from: 'MT3608 OUT- (GND)',
        to: 'Arduino Uno GND 핀',
        colorName: '흑색',
        colorHex: '#0f172a',
        note: '전원·센서·ATmega128 공통 기준 접지',
      },
    ],
  },
  {
    step: 2,
    shortTitle: '2. 초음파×2',
    title: '상단 낙하물(HC-SR04 #1) · 후면(HC-SR04 #2) 연결',
    summary: '정수리 초음파는 D2/D3, 후면 사각지대 초음파는 D4/D5에 각각 TRIG/ECHO를 연결합니다.',
    tip: '황색=TRIG(발사), 청색=ECHO(수신)로 색을 통일하면 두 센서가 헷갈리지 않습니다.',
    connections: [
      {
        from: 'HC-SR04 #1 (상단) TRIG',
        to: 'Arduino D2',
        colorName: '황색',
        colorHex: '#ca8a04',
        note: '20cm 점퍼선 · 중앙 아치 채널 통과',
      },
      {
        from: 'HC-SR04 #1 (상단) ECHO',
        to: 'Arduino D3',
        colorName: '청색',
        colorHex: '#2563eb',
        note: '20cm 점퍼선 · 낙하물 속도 측정',
      },
      {
        from: 'HC-SR04 #2 (후면) TRIG',
        to: 'Arduino D4',
        colorName: '황색',
        colorHex: '#d97706',
        note: '10cm 점퍼선 · 후면 브라켓 최단 결선',
      },
      {
        from: 'HC-SR04 #2 (후면) ECHO',
        to: 'Arduino D5',
        colorName: '청색',
        colorHex: '#0284c7',
        note: '10cm 점퍼선 · 후방 80cm 접근 감지',
      },
    ],
  },
  {
    step: 3,
    shortTitle: '3. 틈새 택트',
    title: '외피-모체 틈새 5방향 연동 택트 스위치 (전·후·좌·우·정수리)',
    summary: '안전모 모체와 폴리곤 케이스 사이 틈새에 5개 택트를 배치해 D6~D10에 연결하고 반대쪽은 공통 GND로 묶습니다.',
    tip: '외피 한쪽이 눌리면 인접 스위치까지 연동 눌림(LOW)되어 다중 판별로 오작동을 줄이고 정확도를 높입니다.',
    connections: [
      {
        from: '전(N)·후(S)·우(E)·좌(W)·정수리 틈새 택트',
        to: 'Arduino D6 · D7 · D8 · D9 · D10',
        colorName: '청색',
        colorHex: '#1d4ed8',
        note: 'INPUT_PULLUP + 인접 스위치 동시 눌림 검증',
      },
      {
        from: '택트 스위치 5개 공통 단자',
        to: 'Arduino GND (공통 접지)',
        colorName: '흑색',
        colorHex: '#0f172a',
        note: '림 테두리를 따라 데이지 체인 접지 가능',
      },
    ],
  },
  {
    step: 4,
    shortTitle: '4. 전면 LED×2',
    title: '전면 이마 최적 경고 LED 2개 (적색 1 + 녹색 1 최소화)',
    summary: '전면 단일 베젤에 배치된 적색 LED 1개(220Ω→D11)와 녹색 LED 1개(150Ω→D12)만 연결해 배선과 전력을 67% 절감합니다.',
    tip: 'LED 긴 다리(+)에 반드시 저항을 직렬로 끼워야 과전류로 LED가 타지 않습니다.',
    connections: [
      {
        from: '전면 적색 5mm LED ×1 (220Ω 직렬)',
        to: 'Arduino D11 (PWM)',
        colorName: '적색',
        colorHex: '#dc2626',
        note: '위험 시 2Hz~4Hz 고속 점멸 (전방 180° 시인성)',
      },
      {
        from: '전면 녹색 5mm LED ×1 (150Ω 직렬)',
        to: 'Arduino D12',
        colorName: '녹색',
        colorHex: '#16a34a',
        note: '정상 대기 시 상시 점등 (최소 전력 60mW)',
      },
    ],
  },
  {
    step: 5,
    shortTitle: '5. 능동 부저',
    title: '정수리 5V 능동 부저 (2N2222 트랜지스터 구동)',
    summary: 'Arduino D13에서 1kΩ 저항 → 2N2222 베이스(B)를 거쳐 5V 능동 부저를 안전하게 구동합니다.',
    tip: 'D13 핀에 부저를 바로 꽂지 않고 트랜지스터를 거치면 아두이노 핀 과전류(40mA 한계)를 예방합니다.',
    connections: [
      {
        from: '5V 능동 부저 (+1kΩ · 2N2222 NPN)',
        to: 'Arduino D13',
        colorName: '주황/황색',
        colorHex: '#ea580c',
        note: '95dB 경보음 · 역기전력 보호 1N4148 병렬',
      },
    ],
  },
  {
    step: 6,
    shortTitle: '6. 내부·확장',
    title: '헬멧 내부 두부 온습도(DHT11) 및 확장 키트 (MQ-2 · KY-037)',
    summary: '헬멧 안쪽 이마-두정부 공간의 DHT11(A0)과 확장 센서 MQ-2(A1)·KY-037(A2)을 아날로그 핀에 연결합니다.',
    tip: 'DHT11은 헬멧 내부 머리 쪽 공기층에 배치해 작업자 열사병 위험과 온습도를 직접 감지합니다.',
    connections: [
      {
        from: 'DHT11 내부 두부 온습도 DATA',
        to: 'Arduino A0',
        colorName: '녹색',
        colorHex: '#059669',
        note: '헬멧 안쪽 두부 열사병·온습도 감지 (폴리곤 내부)',
      },
      {
        from: 'MQ-2 유해가스 AO',
        to: 'Arduino A1',
        colorName: '주황색',
        colorHex: '#ea580c',
        note: 'LPG·메탄·연기 농도 아날로그 판독',
      },
      {
        from: 'KY-037 소음 센서 A0',
        to: 'Arduino A2',
        colorName: '청록색',
        colorHex: '#0d9488',
        note: '85dBA 초과 건설 소음 감지',
      },
    ],
  },
  {
    step: 7,
    shortTitle: '7. ATmega128',
    title: 'Arduino Uno R3 ↔ ATmega128 (TPK-128V2.4) UART 직결',
    summary: '아두이노 TX/RX 핀을 ATmega128의 UART0(PE0/PE1)에 교차 연결하고 GND를 반드시 공통으로 묶습니다.',
    tip: '주의! TX는 RX로 교차(D1→PE0, D0←PE1) 연결하며, 아두이노 코드 업로드 시에는 D0/D1 선을 잠깐 빼주세요.',
    connections: [
      {
        from: 'Arduino Uno D1 (TX)',
        to: 'ATmega128 PE0 (RXD0)',
        colorName: '보라색',
        colorHex: '#7c3aed',
        note: '9600bps 경보 패킷 전송 (Uno → ATmega128)',
      },
      {
        from: 'Arduino Uno D0 (RX)',
        to: 'ATmega128 PE1 (TXD0)',
        colorName: '청록색',
        colorHex: '#0891b2',
        note: '관제 응답/리셋 명령 수신 (ATmega128 → Uno)',
      },
      {
        from: 'Arduino Uno GND',
        to: 'ATmega128 TPK-128V2.4 GND',
        colorName: '흑색',
        colorHex: '#0f172a',
        note: '필수! 공통 접지가 없으면 UART 통신 문자가 깨집니다',
      },
    ],
  },
];

const SCENARIO_CONFIG: Record<
  SimScenarioId,
  {
    label: string;
    badge: string;
    packet: string;
    fndText: string;
    activeSensor: 'none' | 'us1' | 'us2' | 'tact' | 'dht11' | 'mq2';
    fallingDetected: boolean;
    fallingDistCm: number;
    fallingSpeed: number;
    impact: ImpactDirection;
    rearCm: number;
    gasPpm: number;
    explain: string;
  }
> = {
  safe: {
    label: '정상 대기 (SAFE)',
    badge: '정상',
    packet: '$OK,SAFE,185cm*',
    fndText: '0185',
    activeSensor: 'none',
    fallingDetected: false,
    fallingDistCm: 300,
    fallingSpeed: 0,
    impact: 'NONE',
    rearCm: 185,
    gasPpm: 45,
    explain:
      '모든 센서가 안전 범위입니다. Uno D12가 전면 녹색 LED(1개)를 켜고, ATmega128 LCD에 8명 정상 대기 상태를 표시합니다.',
  },
  falling: {
    label: '낙하물 감지 (HC-SR04 #1)',
    badge: '위험 · 낙하물',
    packet: '$ALM,FALL,038cm*',
    fndText: '0038',
    activeSensor: 'us1',
    fallingDetected: true,
    fallingDistCm: 38,
    fallingSpeed: 265,
    impact: 'NONE',
    rearCm: 185,
    gasPpm: 45,
    explain:
      '정수리 HC-SR04 #1(D2/D3)이 급속 접근 낙하물 감지 → Uno가 D11 전면 적색 LED(4Hz) + D13 부저 작동 → D1(TX)→PE0(RXD0)로 ATmega128 LCD에 FALLING 경보 표시!',
  },
  impact: {
    label: '틈새 연동 택트 충격',
    badge: '위험 · 충격',
    packet: '$ALM,IMP,NORTH*',
    fndText: '9999',
    activeSensor: 'tact',
    fallingDetected: false,
    fallingDistCm: 300,
    fallingSpeed: 0,
    impact: 'NORTH',
    rearCm: 185,
    gasPpm: 45,
    explain:
      '폴리곤 외피 눌림 → 전면 주 택트(D6) + 인접 택트 동시 연동 감지(정확도 검증) → Uno가 D11 전면 적색 LED + D13 부저 경보 후 ATmega128로 전송!',
  },
  rear: {
    label: '후방 장애물 (HC-SR04 #2)',
    badge: '주의 · 후방',
    packet: '$WRN,REAR,054cm*',
    fndText: '0054',
    activeSensor: 'us2',
    fallingDetected: false,
    fallingDistCm: 300,
    fallingSpeed: 0,
    impact: 'NONE',
    rearCm: 54,
    gasPpm: 45,
    explain:
      '후면 HC-SR04 #2(D4/D5)가 54cm 접근 감지 → Uno가 D11 적색 LED(2Hz) + D13 간헐 부저 작동 → ATmega128 블루 LCD에 REAR 054cm 표시 + 해당 작업자 녹색 LED 점멸!',
  },
  heat: {
    label: '내부 두부 고온 (DHT11)',
    badge: '주의 · 열사병',
    packet: '$WRN,HEAT,39.2C*',
    fndText: '39.2',
    activeSensor: 'dht11',
    fallingDetected: false,
    fallingDistCm: 300,
    fallingSpeed: 0,
    impact: 'NONE',
    rearCm: 185,
    gasPpm: 45,
    explain:
      '헬멧 안쪽 두부 공간 DHT11(A0)이 39.2°C · 습도 78% 감지 → Uno가 D11 전면 적색 LED + D13 부저로 휴식 경고 후 ATmega128 블루 LCD·7-Seg로 열사병 주의 전송!',
  },
  gas: {
    label: '유해가스 감지 (MQ-2)',
    badge: '주의 · 가스',
    packet: '$WRN,GAS,360ppm*',
    fndText: '0360',
    activeSensor: 'mq2',
    fallingDetected: false,
    fallingDistCm: 300,
    fallingSpeed: 0,
    impact: 'NONE',
    rearCm: 185,
    gasPpm: 360,
    explain:
      'MQ-2(A1) 아날로그 전압 상승(360ppm) → Uno가 D11 적색 LED + D13 간헐 부저 작동 → ATmega128 블루 LCD에 GAS 360ppm 표시 + 해당 작업자 녹색 LED 점멸!',
  },
};

export function InteractiveWiringSimulator({
  modularConfig,
}: InteractiveWiringSimulatorProps) {
  const [simMode, setSimMode] = useState<SimulatorMode>('guide');
  const [currentStep, setCurrentStep] = useState<number>(7); // Start showing full chain including ATmega128!
  const [showAllSteps, setShowAllSteps] = useState<boolean>(false);
  const [scenario, setScenario] = useState<SimScenarioId>('safe');
  const [activeWorkerId, setActiveWorkerId] = useState<number>(1);
  const [fndMode, setFndMode] = useState<FndDisplayMode>('worker_code');
  const [offlineWorkers, setOfflineWorkers] = useState<number[]>([]);
  const [elapsedAlertSec, setElapsedAlertSec] = useState<number>(0);
  const [blinkOn, setBlinkOn] = useState<boolean>(true);

  const activeScenario = SCENARIO_CONFIG[scenario];

  // Live blink clock for physical green fault LED (4Hz critical / 1.5Hz warning)
  useEffect(() => {
    if (scenario === 'safe') {
      setBlinkOn(true);
      setElapsedAlertSec(0);
      return;
    }
    const isCrit = scenario === 'falling' || scenario === 'impact';
    const blinkIntervalMs = isCrit ? 180 : 380;
    const blinkTimer = window.setInterval(() => {
      setBlinkOn((v) => !v);
    }, blinkIntervalMs);

    const secTimer = window.setInterval(() => {
      setElapsedAlertSec((s) => s + 1);
    }, 1000);

    return () => {
      window.clearInterval(blinkTimer);
      window.clearInterval(secTimer);
    };
  }, [scenario]);

  const handleToggleOfflineWorker = (workerId: number) => {
    setOfflineWorkers((prev) =>
      prev.includes(workerId)
        ? prev.filter((id) => id !== workerId)
        : [...prev, workerId],
    );
  };

  const simHazard = useMemo(
    () =>
      evaluateHazardState({
        fallingDetected: activeScenario.fallingDetected,
        fallingDistanceCm: activeScenario.fallingDistCm,
        fallingSpeedCmPerSec: activeScenario.fallingSpeed,
        impactDirection: activeScenario.impact,
        rearObstacleCm: activeScenario.rearCm,
        gasPpm: activeScenario.gasPpm,
        includeMq2: scenario === 'gas' ? true : modularConfig.includeMq2,
        activeWorkerCount: 8 - offlineWorkers.filter((id) => id !== activeWorkerId).length,
      }),
    [activeScenario, activeWorkerId, modularConfig.includeMq2, offlineWorkers, scenario],
  );

  // Authentic ATmega128 (TPK-128V2.4) display output (16x2 HD44780 LCD, 8x Green LEDs, 4-Digit FND)
  const boardState = useMemo(
    () =>
      evaluateAtmega128Display({
        scenario,
        activeWorkerId,
        fndMode,
        elapsedAlertSec,
        offlineWorkers,
      }),
    [activeWorkerId, elapsedAlertSec, fndMode, offlineWorkers, scenario],
  );

  const stepMeta = WIRING_STEPS[currentStep - 1];

  // Determine visual emphasis for each wiring group (1..7)
  const wireStyle = (groupStep: number, simActive = false) => {
    if (simMode === 'simulate') {
      return {
        opacity: simActive ? 1 : 0.22,
        strokeWidth: simActive ? 3.2 : 1.8,
        animated: simActive,
      };
    }
    if (showAllSteps) {
      return { opacity: 0.92, strokeWidth: 2.3, animated: false };
    }
    if (groupStep === currentStep) {
      return { opacity: 1, strokeWidth: 3.4, animated: true };
    }
    if (groupStep < currentStep) {
      return { opacity: 0.28, strokeWidth: 1.8, animated: false };
    }
    return { opacity: 0.06, strokeWidth: 1.4, animated: false };
  };

  const isAlarm = boardState.severity !== 'SAFE';
  const isCritical = boardState.severity === 'CRITICAL';
  const isSimAlarm = simMode === 'simulate' && isAlarm;

  const us1SimActive = simMode === 'simulate' && activeScenario.activeSensor === 'us1';
  const us2SimActive = simMode === 'simulate' && activeScenario.activeSensor === 'us2';
  const tactSimActive = simMode === 'simulate' && activeScenario.activeSensor === 'tact';
  const dhtSimActive = simMode === 'simulate' && activeScenario.activeSensor === 'dht11';
  const mq2SimActive = simMode === 'simulate' && activeScenario.activeSensor === 'mq2';
  const ledRedSimActive = simMode === 'simulate' && isAlarm;
  const ledGrnSimActive = simMode === 'simulate' && !isAlarm;
  const buzzerSimActive = simMode === 'simulate' && (simHazard.buzzerMode !== 'OFF' || scenario === 'heat');
  const uartSimActive = simMode === 'simulate';

  const stPower = wireStyle(1, simMode === 'simulate');
  const stUs1 = wireStyle(2, us1SimActive);
  const stUs2 = wireStyle(2, us2SimActive);
  const stTact = wireStyle(3, tactSimActive);
  const stLedRed = wireStyle(4, ledRedSimActive);
  const stLedGrn = wireStyle(4, ledGrnSimActive);
  const stBuzzer = wireStyle(5, buzzerSimActive);
  const stOpt = wireStyle(6, dhtSimActive || mq2SimActive);
  const stUart = wireStyle(7, uartSimActive);

  // Reusable animated signal dot traveling along an SVG path
  const renderSignalPulse = (pathD: string, color: string, duration = '1.2s', show = false) => {
    if (!show) return null;
    return (
      <circle r="4.5" fill={color} stroke="#ffffff" strokeWidth="1.5">
        <animateMotion dur={duration} repeatCount="indefinite" path={pathD} />
      </circle>
    );
  };

  // Orthogonal path strings (dedicated x lanes so zero lines cross text!)
  const pUs1Trig = 'M 300 48 L 326 48 L 326 186 L 430 186';
  const pUs1Echo = 'M 300 70 L 338 70 L 338 208 L 430 208';
  const pUs2Trig = 'M 300 136 L 350 136 L 350 232 L 430 232';
  const pUs2Echo = 'M 300 158 L 362 158 L 362 254 L 430 254';
  const pTactSig = 'M 300 228 L 376 228 L 376 292 L 430 292';
  const pTactGnd = 'M 300 254 L 314 254 L 314 158 L 430 158';
  const pLedRed = 'M 430 332 L 388 332 L 388 318 L 300 318';
  const pLedGrn = 'M 430 356 L 400 356 L 400 344 L 300 344';
  const pBuzzer = 'M 430 396 L 412 396 L 412 414 L 300 414';
  const pOptA0 = 'M 300 492 L 364 492 L 364 468 L 430 468';
  const pOptA1 = 'M 300 514 L 380 514 L 380 494 L 430 494';
  const pOptA2 = 'M 300 536 L 396 536 L 396 520 L 430 520';

  // Center-to-Right UART0 Bridge (Arduino Uno R3 <-> ATmega128 TPK-128V2.4)
  const pUartTx = 'M 690 220 L 848 220';
  const pUartRx = 'M 848 264 L 690 264';
  const pUartGnd = 'M 690 308 L 848 308';
  const pUartVcc = 'M 690 352 L 848 352';

  const lcdLine1 = boardState.lcdLine1;
  const lcdLine2 = boardState.lcdLine2;
  const fndDisplay = boardState.fnd.formatted;

  return (
    <div className="space-y-4" data-testid="interactive-wiring-simulator">
      {/* Top Control Bar: Mode Switcher + Step/Scenario Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Sub-mode Toggle */}
          <div
            className="inline-flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200"
            role="tablist"
            aria-label="2D 배선 시뮬레이터 모드"
          >
            <button
              type="button"
              role="tab"
              aria-selected={simMode === 'guide'}
              onClick={() => setSimMode('guide')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                simMode === 'guide'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ListChecks className="w-3.5 h-3.5" aria-hidden="true" />
              단계별 배선 따라하기 (7단계)
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={simMode === 'simulate'}
              onClick={() => setSimMode('simulate')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                simMode === 'simulate'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Activity className="w-3.5 h-3.5" aria-hidden="true" />
              실시간 신호 흐름 시뮬레이션
            </button>
          </div>

          {simMode === 'guide' ? (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAllSteps((v) => !v)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors whitespace-nowrap ${
                  showAllSteps
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                <Layers className="w-3.5 h-3.5" aria-hidden="true" />
                {showAllSteps ? '단계별 집중 보기' : '전체 배선 한번에 보기'}
              </button>
              <div className="inline-flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowAllSteps(false);
                    setCurrentStep((s) => Math.max(1, s - 1));
                  }}
                  disabled={!showAllSteps && currentStep <= 1}
                  aria-label="이전 배선 단계"
                  className="p-1.5 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                </button>
                <span className="px-2 text-xs font-mono-tabular font-semibold text-slate-800">
                  {currentStep} / {WIRING_STEPS.length}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setShowAllSteps(false);
                    setCurrentStep((s) => Math.min(WIRING_STEPS.length, s + 1));
                  }}
                  disabled={!showAllSteps && currentStep >= WIRING_STEPS.length}
                  aria-label="다음 배선 단계"
                  className="p-1.5 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">
                아래 시나리오 버튼 또는 왼쪽 센서 카드를 클릭해 신호 흐름을 확인하세요
              </span>
              {scenario !== 'safe' && (
                <button
                  type="button"
                  onClick={() => setScenario('safe')}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  <RotateCcw className="w-3 h-3" aria-hidden="true" />
                  정상 복구
                </button>
              )}
            </div>
          )}
        </div>

        {/* Step Buttons OR Live Scenario Trigger Buttons */}
        {simMode === 'guide' ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5">
            {WIRING_STEPS.map((st) => {
              const active = !showAllSteps && currentStep === st.step;
              return (
                <button
                  key={st.step}
                  type="button"
                  onClick={() => {
                    setShowAllSteps(false);
                    setCurrentStep(st.step);
                  }}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border text-left transition-colors truncate ${
                    active
                      ? 'bg-blue-600 text-white border-blue-600 font-semibold'
                      : st.step < currentStep || showAllSteps
                        ? 'bg-slate-50 text-slate-800 border-slate-300 hover:bg-slate-100'
                        : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {st.shortTitle}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {(Object.keys(SCENARIO_CONFIG) as SimScenarioId[]).map((id) => {
              const sc = SCENARIO_CONFIG[id];
              const active = scenario === id;
              const isDanger = id === 'falling' || id === 'impact';
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setScenario(id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap ${
                    active
                      ? id === 'safe'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : isDanger
                          ? 'bg-red-600 text-white border-red-600'
                          : 'bg-amber-600 text-white border-amber-600'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" aria-hidden="true" />
                  {sc.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Interactive 3-Zone 2D Visual Wiring Board (Sensors <-> Arduino Uno R3 <-> ATmega128 TPK-128V2.4) */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-x-auto">
        <svg
          viewBox="0 0 1160 580"
          className="w-full min-w-[920px] h-auto block select-none"
          role="img"
          aria-label="아두이노 Uno R3, 헬멧 센서 키트 및 ATmega128 TPK-128V2.4 2D 배선 시뮬레이터"
        >
          {/* Subtle Engineering Dot Grid Background */}
          <defs>
            <pattern id="sim-grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1" fill="#cbd5e1" opacity="0.55" />
            </pattern>
          </defs>
          <rect x="0" y="0" width="1160" height="580" fill="#f8fafc" />
          <rect x="0" y="0" width="1160" height="580" fill="url(#sim-grid)" />

          {/* Column Zone Labels */}
          <text x="20" y="16" fontSize="11" fontWeight="700" fill="#475569">
            ZONE 1 · 헬멧 부착 센서 및 경보 키트 {simMode === 'simulate' ? '(센서 클릭 가능)' : ''}
          </text>
          <text x="430" y="16" fontSize="11" fontWeight="700" fill="#0f766e">
            ZONE 2 · Arduino Uno R3 (헬멧 제어기)
          </text>
          <text x="826" y="16" fontSize="11" fontWeight="700" fill="#4338ca">
            ZONE 3 · ATmega128 TPK-128V2.4 (중앙 관제 보드)
          </text>

          {/* ========================================================= */}
          {/* WIRE ROUTING LAYER (ORTHOGONAL DEDICATED LANES)           */}
          {/* ========================================================= */}

          {/* Step 1: Power Supply -> Arduino Uno 5V / GND */}
          <g opacity={stPower.opacity}>
            <path
              d="M 488 88 L 488 108"
              fill="none"
              stroke="#dc2626"
              strokeWidth={stPower.strokeWidth}
            />
            <path
              d="M 548 88 L 548 108"
              fill="none"
              stroke="#0f172a"
              strokeWidth={stPower.strokeWidth}
            />
            <text x="494" y="102" fontSize="9.5" fontWeight="700" fill="#dc2626">
              +5V
            </text>
            <text x="554" y="102" fontSize="9.5" fontWeight="700" fill="#0f172a">
              GND
            </text>
          </g>

          {/* Step 2: HC-SR04 #1 & #2 */}
          <g opacity={stUs1.opacity}>
            <path
              d={pUs1Trig}
              fill="none"
              stroke="#ca8a04"
              strokeWidth={stUs1.strokeWidth}
              strokeDasharray={stUs1.animated ? '8 4' : undefined}
            />
            <path
              d={pUs1Echo}
              fill="none"
              stroke="#2563eb"
              strokeWidth={stUs1.strokeWidth}
              strokeDasharray={stUs1.animated ? '8 4' : undefined}
            />
          </g>
          <g opacity={stUs2.opacity}>
            <path
              d={pUs2Trig}
              fill="none"
              stroke="#d97706"
              strokeWidth={stUs2.strokeWidth}
              strokeDasharray={stUs2.animated ? '8 4' : undefined}
            />
            <path
              d={pUs2Echo}
              fill="none"
              stroke="#0284c7"
              strokeWidth={stUs2.strokeWidth}
              strokeDasharray={stUs2.animated ? '8 4' : undefined}
            />
          </g>

          {/* Step 3: 5-Way Tactile Switches */}
          <g opacity={stTact.opacity}>
            <path
              d={pTactSig}
              fill="none"
              stroke="#1d4ed8"
              strokeWidth={stTact.strokeWidth}
              strokeDasharray={stTact.animated ? '8 4' : undefined}
            />
            <path
              d={pTactGnd}
              fill="none"
              stroke="#1e293b"
              strokeWidth={stTact.strokeWidth}
            />
          </g>

          {/* Step 4: Red & Green LEDs */}
          <g opacity={stLedRed.opacity}>
            <path
              d={pLedRed}
              fill="none"
              stroke="#dc2626"
              strokeWidth={stLedRed.strokeWidth}
              strokeDasharray={stLedRed.animated ? '8 4' : undefined}
            />
          </g>
          <g opacity={stLedGrn.opacity}>
            <path
              d={pLedGrn}
              fill="none"
              stroke="#16a34a"
              strokeWidth={stLedGrn.strokeWidth}
              strokeDasharray={stLedGrn.animated ? '8 4' : undefined}
            />
          </g>

          {/* Step 5: 5V Active Buzzer */}
          <g opacity={stBuzzer.opacity}>
            <path
              d={pBuzzer}
              fill="none"
              stroke="#ea580c"
              strokeWidth={stBuzzer.strokeWidth}
              strokeDasharray={stBuzzer.animated ? '8 4' : undefined}
            />
          </g>

          {/* Step 6: Optional Kit Sensors */}
          <g opacity={stOpt.opacity}>
            <path d={pOptA0} fill="none" stroke="#059669" strokeWidth={stOpt.strokeWidth} />
            <path
              d={pOptA1}
              fill="none"
              stroke="#ea580c"
              strokeWidth={stOpt.strokeWidth}
              strokeDasharray={stOpt.animated ? '8 4' : undefined}
            />
            <path d={pOptA2} fill="none" stroke="#0d9488" strokeWidth={stOpt.strokeWidth} />
          </g>

          {/* Step 7: UART0 Serial Bridge (Arduino Uno R3 <-> ATmega128 TPK-128V2.4) */}
          <g opacity={stUart.opacity}>
            <path
              d={pUartTx}
              fill="none"
              stroke="#7c3aed"
              strokeWidth={stUart.strokeWidth}
              strokeDasharray={stUart.animated ? '9 5' : undefined}
            />
            <path
              d={pUartRx}
              fill="none"
              stroke="#0891b2"
              strokeWidth={stUart.strokeWidth}
            />
            <path
              d={pUartGnd}
              fill="none"
              stroke="#0f172a"
              strokeWidth={stUart.strokeWidth}
            />
            <path
              d={pUartVcc}
              fill="none"
              stroke="#dc2626"
              strokeWidth={1.6}
              strokeDasharray="4 4"
            />
            {/* Clean Channel Labels */}
            <rect x="708" y="198" width="122" height="18" rx="4" fill="#f5f3ff" stroke="#c4b5fd" />
            <text x="769" y="210" textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#6d28d9">
              D1(TX) → PE0(RXD0)
            </text>
            <rect x="708" y="242" width="122" height="18" rx="4" fill="#ecfeff" stroke="#a5f3fc" />
            <text x="769" y="254" textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#0e7490">
              D0(RX) ← PE1(TXD0)
            </text>
            <rect x="716" y="286" width="106" height="18" rx="4" fill="#f1f5f9" stroke="#cbd5e1" />
            <text x="769" y="298" textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#0f172a">
              공통 GND (필수)
            </text>
            <text x="769" y="346" textAnchor="middle" fontSize="9" fill="#b91c1c">
              +5V (별도전원 시 생략)
            </text>

            {/* Live UART Packet Badge in Simulation Mode */}
            {simMode === 'simulate' && (
              <g>
                <rect
                  x="700"
                  y="148"
                  width="138"
                  height="34"
                  rx="6"
                  fill={isAlarm ? '#fef2f2' : '#ecfdf5'}
                  stroke={isAlarm ? '#ef4444' : '#10b981'}
                  strokeWidth="1.4"
                />
                <text
                  x="769"
                  y="162"
                  textAnchor="middle"
                  fontSize="9"
                  fontWeight="700"
                  fill={isAlarm ? '#b91c1c' : '#047857'}
                >
                  UART0 9600bps 패킷
                </text>
                <text
                  x="769"
                  y="175"
                  textAnchor="middle"
                  fontSize="10"
                  fontFamily="monospace"
                  fontWeight="700"
                  fill="#0f172a"
                >
                  {boardState.uartPacket}
                </text>
              </g>
            )}
          </g>

          {/* Animated Live Signal Pulses */}
          {renderSignalPulse(pUs1Echo, '#0284c7', '1.1s', us1SimActive)}
          {renderSignalPulse(pUs2Echo, '#0284c7', '1.1s', us2SimActive)}
          {renderSignalPulse(pTactSig, '#2563eb', '0.95s', tactSimActive)}
          {renderSignalPulse(pOptA0, '#059669', '1.1s', dhtSimActive)}
          {renderSignalPulse(pOptA1, '#ea580c', '1.1s', mq2SimActive)}
          {renderSignalPulse(pLedRed, '#ef4444', '0.85s', ledRedSimActive)}
          {renderSignalPulse(pLedGrn, '#22c55e', '1.6s', ledGrnSimActive)}
          {renderSignalPulse(pBuzzer, '#f97316', '0.9s', buzzerSimActive)}
          {renderSignalPulse(
            pUartTx,
            isSimAlarm ? '#ef4444' : '#7c3aed',
            isSimAlarm ? '0.9s' : '1.7s',
            uartSimActive,
          )}

          {/* ========================================================= */}
          {/* ZONE 1: HELMET SENSORS & ACTUATORS (LEFT COLUMN)          */}
          {/* ========================================================= */}

          {/* Module 1: HC-SR04 #1 (Crown Falling Object) */}
          <g
            onClick={() => {
              if (simMode === 'simulate') setScenario('falling');
              else {
                setShowAllSteps(false);
                setCurrentStep(2);
              }
            }}
            className="cursor-pointer"
          >
            <rect
              x="20"
              y="24"
              width="280"
              height="76"
              rx="10"
              fill={us1SimActive ? '#eff6ff' : '#ffffff'}
              stroke={us1SimActive || (!showAllSteps && simMode === 'guide' && currentStep === 2) ? '#2563eb' : '#cbd5e1'}
              strokeWidth={us1SimActive ? 2.4 : 1.4}
            />
            {/* Twin ultrasonic sensor eyes */}
            <circle cx="48" cy="54" r="13" fill="#e2e8f0" stroke="#475569" strokeWidth="2" />
            <circle cx="48" cy="54" r="7" fill="#1e293b" />
            <circle cx="80" cy="54" r="13" fill="#e2e8f0" stroke="#475569" strokeWidth="2" />
            <circle cx="80" cy="54" r="7" fill="#1e293b" />
            <text x="104" y="47" fontSize="12" fontWeight="700" fill="#0f172a">
              HC-SR04 #1 (상단 낙하물)
            </text>
            <text x="104" y="64" fontSize="10" fill="#475569">
              정수리 상향 30° · 5V/GND 공통
            </text>
            <text x="104" y="82" fontSize="9.5" fontFamily="monospace" fontWeight="600" fill="#1d4ed8">
              TRIG→D2 · ECHO→D3
            </text>
            <circle cx="300" cy="48" r="4.5" fill="#ca8a04" />
            <circle cx="300" cy="70" r="4.5" fill="#2563eb" />
          </g>

          {/* Module 2: HC-SR04 #2 (Rear Blind Spot) */}
          <g
            onClick={() => {
              if (simMode === 'simulate') setScenario('rear');
              else {
                setShowAllSteps(false);
                setCurrentStep(2);
              }
            }}
            className="cursor-pointer"
          >
            <rect
              x="20"
              y="112"
              width="280"
              height="76"
              rx="10"
              fill={us2SimActive ? '#fffbeb' : '#ffffff'}
              stroke={us2SimActive || (!showAllSteps && simMode === 'guide' && currentStep === 2) ? '#d97706' : '#cbd5e1'}
              strokeWidth={us2SimActive ? 2.4 : 1.4}
            />
            <circle cx="48" cy="142" r="13" fill="#e2e8f0" stroke="#475569" strokeWidth="2" />
            <circle cx="48" cy="142" r="7" fill="#1e293b" />
            <circle cx="80" cy="142" r="13" fill="#e2e8f0" stroke="#475569" strokeWidth="2" />
            <circle cx="80" cy="142" r="7" fill="#1e293b" />
            <text x="104" y="135" fontSize="12" fontWeight="700" fill="#0f172a">
              HC-SR04 #2 (후면 사각지대)
            </text>
            <text x="104" y="152" fontSize="10" fill="#475569">
              후방 80cm 접근 감지 · 5V/GND
            </text>
            <text x="104" y="170" fontSize="9.5" fontFamily="monospace" fontWeight="600" fill="#0369a1">
              TRIG→D4 · ECHO→D5
            </text>
            <circle cx="300" cy="136" r="4.5" fill="#d97706" />
            <circle cx="300" cy="158" r="4.5" fill="#0284c7" />
          </g>

          {/* Module 3: 5-Way Tactile Switches */}
          <g
            onClick={() => {
              if (simMode === 'simulate') setScenario('impact');
              else {
                setShowAllSteps(false);
                setCurrentStep(3);
              }
            }}
            className="cursor-pointer"
          >
            <rect
              x="20"
              y="200"
              width="280"
              height="78"
              rx="10"
              fill={tactSimActive ? '#fef2f2' : '#ffffff'}
              stroke={tactSimActive || (!showAllSteps && simMode === 'guide' && currentStep === 3) ? '#2563eb' : '#cbd5e1'}
              strokeWidth={tactSimActive ? 2.4 : 1.4}
            />
            <rect x="38" y="218" width="44" height="44" rx="6" fill="#1e293b" />
            <circle cx="60" cy="240" r="13" fill={tactSimActive ? '#ef4444' : '#2563eb'} />
            <text x="96" y="224" fontSize="12" fontWeight="700" fill="#0f172a">
              틈새 연동 5방향 택트 (×5)
            </text>
            <text x="96" y="241" fontSize="10" fill="#475569">
              외피-모체 틈새 배치 · 인접 연동 감지
            </text>
            <text x="96" y="259" fontSize="9.5" fontFamily="monospace" fontWeight="600" fill="#1d4ed8">
              D6~D10 (INPUT_PULLUP) · 공통 GND
            </text>
            <circle cx="300" cy="228" r="4.5" fill="#1d4ed8" />
            <circle cx="300" cy="254" r="4.5" fill="#0f172a" />
          </g>

          {/* Module 4: Minimal Optimal Front Red/Green LEDs (2 total) */}
          <g
            onClick={() => {
              if (simMode === 'guide') {
                setShowAllSteps(false);
                setCurrentStep(4);
              }
            }}
            className="cursor-pointer"
          >
            <rect
              x="20"
              y="290"
              width="280"
              height="78"
              rx="10"
              fill="#ffffff"
              stroke={ledRedSimActive ? '#ef4444' : (!showAllSteps && simMode === 'guide' && currentStep === 4) ? '#dc2626' : '#cbd5e1'}
              strokeWidth={ledRedSimActive ? 2.4 : 1.4}
            />
            {/* Glowing Red & Green LED indicators */}
            <circle
              cx="48"
              cy="329"
              r="12"
              fill={ledRedSimActive ? '#ef4444' : '#fca5a5'}
              stroke="#991b1b"
              strokeWidth="1.8"
            />
            <circle
              cx="78"
              cy="329"
              r="12"
              fill={ledGrnSimActive || simMode === 'guide' ? '#22c55e' : '#86efac'}
              stroke="#166534"
              strokeWidth="1.8"
            />
            <text x="102" y="314" fontSize="12" fontWeight="700" fill="#0f172a">
              전면 최적 LED ×2 (적1 · 녹1)
            </text>
            <text x="102" y="331" fontSize="10" fill="#475569">
              전면 단일 베젤 최소화 · 220Ω/150Ω
            </text>
            <text x="102" y="349" fontSize="9.5" fontFamily="monospace" fontWeight="600" fill="#b91c1c">
              적→D11(PWM) · 녹→D12 · GND
            </text>
            <circle cx="300" cy="318" r="4.5" fill="#dc2626" />
            <circle cx="300" cy="344" r="4.5" fill="#16a34a" />
          </g>

          {/* Module 5: 5V Active Buzzer */}
          <g
            onClick={() => {
              if (simMode === 'guide') {
                setShowAllSteps(false);
                setCurrentStep(5);
              }
            }}
            className="cursor-pointer"
          >
            <rect
              x="20"
              y="380"
              width="280"
              height="76"
              rx="10"
              fill={buzzerSimActive ? '#fff7ed' : '#ffffff'}
              stroke={buzzerSimActive || (!showAllSteps && simMode === 'guide' && currentStep === 5) ? '#ea580c' : '#cbd5e1'}
              strokeWidth={buzzerSimActive ? 2.4 : 1.4}
            />
            <circle cx="58" cy="418" r="18" fill="#1e293b" stroke={buzzerSimActive ? '#f97316' : '#475569'} strokeWidth="2.5" />
            <circle cx="58" cy="418" r="6" fill={buzzerSimActive ? '#fb923c' : '#64748b'} />
            <text x="90" y="404" fontSize="12" fontWeight="700" fill="#0f172a">
              5V 능동 부저 (95dB 경보음)
            </text>
            <text x="90" y="421" fontSize="10" fill="#475569">
              1kΩ → 2N2222 NPN 트랜지스터 구동
            </text>
            <text x="90" y="439" fontSize="9.5" fontFamily="monospace" fontWeight="600" fill="#c2410c">
              D13 → Base(B) · {buzzerSimActive ? '경보음 출력 중!' : '대기 상태'}
            </text>
            <circle cx="300" cy="414" r="4.5" fill="#ea580c" />
          </g>

          {/* Module 6: Interior DHT11 & Optional Kit Sensors */}
          <g
            onClick={() => {
              if (simMode === 'simulate') setScenario(scenario === 'heat' ? 'gas' : 'heat');
              else {
                setShowAllSteps(false);
                setCurrentStep(6);
              }
            }}
            className="cursor-pointer"
          >
            <rect
              x="20"
              y="468"
              width="280"
              height="86"
              rx="10"
              fill={dhtSimActive ? '#ecfdf5' : mq2SimActive ? '#fff7ed' : '#ffffff'}
              stroke={
                dhtSimActive || mq2SimActive || (!showAllSteps && simMode === 'guide' && currentStep === 6)
                  ? '#059669'
                  : '#cbd5e1'
              }
              strokeWidth={dhtSimActive || mq2SimActive ? 2.4 : 1.4}
            />
            <rect x="34" y="486" width="22" height="28" rx="3" fill="#0ea5e9" />
            <circle cx="72" cy="500" r="12" fill="#94a3b8" stroke="#334155" strokeWidth="1.5" />
            <text x="96" y="490" fontSize="12" fontWeight="700" fill="#0f172a">
              내부 두부 DHT11 · 확장 키트
            </text>
            <text x="96" y="507" fontSize="10" fill="#475569">
              헬멧 안쪽 온습도 · MQ-2 가스 · KY-037
            </text>
            <text x="96" y="525" fontSize="9.5" fontFamily="monospace" fontWeight="600" fill="#047857">
              DHT11→A0 · MQ-2→A1 · KY-037→A2
            </text>
            <text x="96" y="542" fontSize="9" fill="#64748b">
              (전원 +5V / GND 공통 연결)
            </text>
            <circle cx="300" cy="492" r="4.5" fill="#059669" />
            <circle cx="300" cy="514" r="4.5" fill="#ea580c" />
            <circle cx="300" cy="536" r="4.5" fill="#0d9488" />
          </g>

          {/* ========================================================= */}
          {/* ZONE 2: POWER MODULE + ARDUINO UNO R3 (CENTER COLUMN)     */}
          {/* ========================================================= */}

          {/* 5V Power Supply Box */}
          <g
            onClick={() => {
              if (simMode === 'guide') {
                setShowAllSteps(false);
                setCurrentStep(1);
              }
            }}
            className="cursor-pointer"
          >
            <rect
              x="430"
              y="24"
              width="260"
              height="64"
              rx="10"
              fill="#ffffff"
              stroke={!showAllSteps && simMode === 'guide' && currentStep === 1 ? '#dc2626' : '#cbd5e1'}
              strokeWidth={!showAllSteps && simMode === 'guide' && currentStep === 1 ? 2.4 : 1.4}
            />
            <rect x="444" y="38" width="40" height="36" rx="4" fill="#fef2f2" stroke="#dc2626" />
            <text x="464" y="60" textAnchor="middle" fontSize="11" fontWeight="800" fill="#dc2626">
              5V
            </text>
            <text x="496" y="49" fontSize="12" fontWeight="700" fill="#0f172a">
              Li-ion 2500mAh + MT3608 승압
            </text>
            <text x="496" y="67" fontSize="10" fill="#475569">
              안정화 5V 출력 · 100µF 평활 콘덴서
            </text>
          </g>

          {/* Arduino Uno R3 Main Board */}
          <g>
            <rect
              x="430"
              y="108"
              width="260"
              height="446"
              rx="12"
              fill="#08677a"
              stroke="#0e4f5c"
              strokeWidth="2"
            />
            <rect
              x="438"
              y="116"
              width="244"
              height="430"
              rx="8"
              fill="none"
              stroke="rgba(255,255,255,0.28)"
              strokeWidth="1.2"
            />
            {/* USB-B & DC Barrel Jack silhouettes */}
            <rect x="572" y="102" width="44" height="30" rx="3" fill="#cbd5e1" stroke="#475569" />
            <text x="594" y="121" textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#334155">
              USB
            </text>
            <rect x="630" y="104" width="32" height="26" rx="3" fill="#1e293b" />

            {/* Board Title */}
            <text x="560" y="156" textAnchor="middle" fontSize="15" fontWeight="800" fill="#ffffff">
              ARDUINO UNO R3
            </text>
            <text x="560" y="172" textAnchor="middle" fontSize="9.5" fill="#bae6fd">
              ATmega328P · 헬멧 제어기
            </text>

            {/* ON & TX Status LEDs */}
            <circle cx="534" cy="190" r="4.5" fill="#22c55e" />
            <text x="543" y="193" fontSize="8.5" fontWeight="700" fill="#dcfce7">
              ON
            </text>
            <circle
              cx="578"
              cy="190"
              r="4.5"
              fill={isAlarm ? '#f59e0b' : '#fde68a'}
              opacity={isAlarm ? 1 : 0.45}
            />
            <text x="587" y="193" fontSize="8.5" fontWeight="700" fill="#fef3c7">
              TX
            </text>

            {/* DIP-28 ATmega328P Chip */}
            <rect x="526" y="256" width="68" height="176" rx="4" fill="#111827" stroke="#334155" />
            <text
              x="560"
              y="344"
              textAnchor="middle"
              fontSize="10"
              fontFamily="monospace"
              fontWeight="700"
              fill="#e2e8f0"
              transform="rotate(-90 560 344)"
            >
              ATMEGA328P-PU
            </text>

            {/* Left Pin Headers (Sensors & Helmet Actuators) */}
            {(
              [
                { y: 136, label: '5V', fill: '#dc2626' },
                { y: 158, label: 'GND', fill: '#111827' },
                { y: 186, label: 'D2', fill: '#ca8a04' },
                { y: 208, label: 'D3', fill: '#2563eb' },
                { y: 232, label: 'D4', fill: '#d97706' },
                { y: 254, label: 'D5', fill: '#0284c7' },
                { y: 292, label: 'D6~D10', fill: '#1d4ed8' },
                { y: 332, label: 'D11~', fill: '#dc2626' },
                { y: 356, label: 'D12', fill: '#16a34a' },
                { y: 396, label: 'D13', fill: '#ea580c' },
                { y: 468, label: 'A0', fill: '#059669' },
                { y: 494, label: 'A1', fill: '#ea580c' },
                { y: 520, label: 'A2', fill: '#0d9488' },
              ] as const
            ).map((pin) => (
              <g key={pin.label}>
                <rect x="430" y={pin.y - 8} width="64" height="16" rx="3" fill="#0f172a" />
                <circle cx="430" cy={pin.y} r="4.5" fill={pin.fill} stroke="#ffffff" strokeWidth="1" />
                <text
                  x="440"
                  y={pin.y + 3.5}
                  fontSize="9.5"
                  fontFamily="monospace"
                  fontWeight="700"
                  fill="#f8fafc"
                >
                  {pin.label}
                </text>
              </g>
            ))}

            {/* Right Pin Headers (UART0 Serial Output to ATmega128) */}
            {(
              [
                { y: 220, label: 'D1 (TX)', fill: '#7c3aed' },
                { y: 264, label: 'D0 (RX)', fill: '#0891b2' },
                { y: 308, label: 'GND', fill: '#111827' },
                { y: 352, label: '5V', fill: '#dc2626' },
              ] as const
            ).map((pin) => (
              <g key={pin.label}>
                <rect x="618" y={pin.y - 9} width="72" height="18" rx="3" fill="#0f172a" />
                <circle cx="690" cy={pin.y} r="4.5" fill={pin.fill} stroke="#ffffff" strokeWidth="1" />
                <text
                  x="680"
                  y={pin.y + 3.5}
                  textAnchor="end"
                  fontSize="9.5"
                  fontFamily="monospace"
                  fontWeight="700"
                  fill="#f8fafc"
                >
                  {pin.label}
                </text>
              </g>
            ))}

            <text x="560" y="540" textAnchor="middle" fontSize="9" fill="#cffafe">
              센서 취합 · 경보 판단 · UART0 송신
            </text>
          </g>

          {/* ========================================================= */}
          {/* ZONE 3: ATMEGA128 TPK-128V2.4 REAL BLUE BOARD (RIGHT COL) */}
          {/* ========================================================= */}
          <g
            onClick={() => {
              if (simMode === 'guide') {
                setShowAllSteps(false);
                setCurrentStep(7);
              }
            }}
            className="cursor-pointer"
          >
            {/* Authentic Royal Blue TPK-128V2.4 PCB */}
            <rect
              x="826"
              y="24"
              width="314"
              height="530"
              rx="12"
              fill="#0f3b78"
              stroke={
                isCritical
                  ? '#ef4444'
                  : !showAllSteps && simMode === 'guide' && currentStep === 7
                    ? '#7c3aed'
                    : '#1d4ed8'
              }
              strokeWidth={isCritical || (!showAllSteps && simMode === 'guide' && currentStep === 7) ? 2.6 : 2}
            />
            <rect
              x="834"
              y="32"
              width="298"
              height="514"
              rx="8"
              fill="none"
              stroke="rgba(186,230,253,0.28)"
              strokeWidth="1"
            />
            {/* Corner brass mounting standoffs */}
            {[
              [840, 38],
              [1126, 38],
              [840, 540],
              [1126, 540],
            ].map(([cx, cy], idx) => (
              <circle key={idx} cx={cx} cy={cy} r="5" fill="#e2e8f0" stroke="#475569" strokeWidth="1.5" />
            ))}

            <text x="983" y="48" textAnchor="middle" fontSize="13.5" fontWeight="800" fill="#ffffff">
              TPK-128V2.4 (ATmega128)
            </text>
            <text x="983" y="63" textAnchor="middle" fontSize="9" fill="#bae6fd">
              16×2 블루 LCD · 4-Digit 7-Seg · 녹색 LED ×8
            </text>

            {/* Authentic 16x2 Cobalt-Blue Backlit HD44780 CLCD (1602A) on Green Carrier PCB */}
            <rect
              x="844"
              y="72"
              width="278"
              height="92"
              rx="6"
              fill="#15803d"
              stroke="#14532d"
              strokeWidth="1.5"
            />
            <text x="852" y="83" fontSize="6.8" fontFamily="monospace" fill="#dcfce7">
              GND VDD V0 RS RW E D0..D7 BLA BLK · 1602A
            </text>
            {/* VR5 Blue Contrast Trimpot beside LCD */}
            <rect x="1096" y="75" width="18" height="12" rx="2" fill="#2563eb" stroke="#93c5fd" strokeWidth="0.9" />
            <circle cx="1105" cy="81" r="3" fill="#e2e8f0" />
            {/* Black LCD Bezel */}
            <rect
              x="852"
              y="88"
              width="262"
              height="68"
              rx="4"
              fill="#0b1120"
              stroke="#334155"
              strokeWidth="1.2"
            />
            {/* Cobalt-Blue Backlit Glass */}
            <rect
              x="860"
              y="95"
              width="246"
              height="54"
              rx="3"
              fill="#0a3ea8"
              stroke="#3b82f6"
              strokeWidth="1"
            />
            {/* Subtle 16x2 cell grid strips */}
            <rect x="866" y="101" width="234" height="19" rx="1.5" fill="#072c7d" opacity="0.65" />
            <rect x="866" y="124" width="234" height="19" rx="1.5" fill="#072c7d" opacity="0.65" />
            <text
              x="871"
              y="115"
              fontSize="13"
              fontFamily="monospace"
              fontWeight="800"
              fill="#ffffff"
              xmlSpace="preserve"
            >
              {lcdLine1}
            </text>
            <text
              x="871"
              y="138"
              fontSize="13"
              fontFamily="monospace"
              fontWeight="800"
              fill="#e0f2fe"
              xmlSpace="preserve"
            >
              {lcdLine2}
            </text>

            {/* UART0 Terminal Block (J21) on Left Side of ATmega128 */}
            <rect
              x="844"
              y="192"
              width="126"
              height="176"
              rx="6"
              fill="#08244d"
              stroke="#3b82f6"
              strokeOpacity="0.6"
            />
            <text x="907" y="207" textAnchor="middle" fontSize="8.8" fontWeight="700" fill="#bae6fd">
              J21 UART0 (PE0/PE1)
            </text>
            {(
              [
                { y: 220, label: 'PE0 (RXD0)', fill: '#7c3aed' },
                { y: 264, label: 'PE1 (TXD0)', fill: '#0891b2' },
                { y: 308, label: 'GND (공통)', fill: '#64748b' },
                { y: 352, label: 'VCC (+5V)', fill: '#dc2626' },
              ] as const
            ).map((pin) => (
              <g key={pin.label}>
                <circle cx="848" cy={pin.y} r="5" fill={pin.fill} stroke="#ffffff" strokeWidth="1.2" />
                <text
                  x="860"
                  y={pin.y + 3.5}
                  fontSize="9.8"
                  fontFamily="monospace"
                  fontWeight="700"
                  fill="#f8fafc"
                >
                  {pin.label}
                </text>
              </g>
            ))}

            {/* U1 ATmega128A 64-Pin TQFP Chip + X1 14.7456MHz Crystal */}
            <rect
              x="986"
              y="194"
              width="136"
              height="128"
              rx="6"
              fill="#08244d"
              stroke="#3b82f6"
              strokeOpacity="0.5"
            />
            <rect
              x="1008"
              y="204"
              width="92"
              height="74"
              rx="4"
              fill="#0f172a"
              stroke="#94a3b8"
              strokeWidth="1.4"
            />
            <circle cx="1018" cy="214" r="2.5" fill="#94a3b8" />
            <text x="1054" y="236" textAnchor="middle" fontSize="10.5" fontFamily="monospace" fontWeight="800" fill="#f8fafc">
              U1 ATMEGA128
            </text>
            <text x="1054" y="252" textAnchor="middle" fontSize="8.5" fontFamily="monospace" fill="#38bdf8">
              UART0 RX INT
            </text>
            <text x="1054" y="267" textAnchor="middle" fontSize="8" fontFamily="monospace" fill="#94a3b8">
              J27/J28 · J29~J32
            </text>
            {/* X1 14.7456MHz Metal Crystal */}
            <rect x="1008" y="288" width="92" height="24" rx="12" fill="#cbd5e1" stroke="#475569" strokeWidth="1.2" />
            <text x="1054" y="303" textAnchor="middle" fontSize="8.5" fontFamily="monospace" fontWeight="800" fill="#0f172a">
              X1 14.7456MHz
            </text>

            {/* Onboard Buzzer Indicator (J32 / TR5) */}
            <rect x="986" y="330" width="136" height="38" rx="6" fill="#08244d" stroke="#3b82f6" strokeOpacity="0.5" />
            <circle
              cx="1006"
              cy="349"
              r="10"
              fill="#0f172a"
              stroke={boardState.boardBuzzerOn ? '#fbbf24' : '#64748b'}
              strokeWidth="2"
            />
            <circle cx="1006" cy="349" r="3.5" fill={boardState.boardBuzzerOn ? '#fbbf24' : '#475569'} />
            <text x="1024" y="346" fontSize="8.8" fontFamily="monospace" fontWeight="700" fill="#f8fafc">
              BUZZER (J32)
            </text>
            <text
              x="1024"
              y="359"
              fontSize="8.5"
              fontWeight="700"
              fill={boardState.boardBuzzerOn ? '#fde047' : '#93c5fd'}
            >
              {boardState.boardBuzzerOn ? '경보음 출력 중!' : '대기 (TR5 OFF)'}
            </text>

            {/* U6 4-Digit Red 7-Segment FND Display (8.8.8.8.) */}
            <rect
              x="844"
              y="376"
              width="278"
              height="68"
              rx="6"
              fill="#08244d"
              stroke="#3b82f6"
              strokeOpacity="0.6"
            />
            <text x="854" y="391" fontSize="8.5" fontWeight="700" fill="#bae6fd">
              U6 7-SEGMENT (J30/J31) · {boardState.fnd.captionKo}
            </text>
            <rect x="854" y="398" width="258" height="38" rx="4" fill="#180505" stroke="#450a0a" />
            {boardState.fnd.digits.map((digit, idx) => {
              const dx = 886 + idx * 64;
              return (
                <g key={`fnd-${idx}`}>
                  <rect
                    x={dx - 24}
                    y="402"
                    width="48"
                    height="30"
                    rx="3"
                    fill="#260909"
                    stroke="#450a0a"
                    strokeWidth="0.9"
                  />
                  <text
                    x={dx}
                    y="425"
                    textAnchor="middle"
                    fontSize="22"
                    fontFamily="monospace"
                    fontWeight="800"
                    fill="#ff3b30"
                  >
                    {digit}
                  </text>
                  {boardState.fnd.dots[idx] && (
                    <circle cx={dx + 19} cy="426" r="2.8" fill="#ff3b30" />
                  )}
                </g>
              );
            })}

            {/* 8x Physically GREEN Worker LEDs in Real 2x4 Matrix (D6~D13 / Y0~Y7) */}
            <rect
              x="844"
              y="452"
              width="278"
              height="90"
              rx="6"
              fill="#08244d"
              stroke="#3b82f6"
              strokeOpacity="0.6"
            />
            <text x="854" y="466" fontSize="8.5" fontWeight="700" fill="#bae6fd">
              작업자 녹색 LED ×8 (2×4 실물 배열 · 클릭해 작업자 선택)
            </text>
            {boardState.workerLeds.map((led) => {
              const cx = 882 + led.col * 66;
              const cy = led.row === 0 ? 488 : 522;
              const isBlinking = led.state === 'BLINK_FAST' || led.state === 'BLINK_SLOW';
              const isLit = led.state === 'ON' || (isBlinking && blinkOn);
              const isSelected = led.workerId === activeWorkerId;

              return (
                <g
                  key={led.workerId}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveWorkerId(led.workerId);
                  }}
                  className="cursor-pointer"
                >
                  {isSelected && (
                    <circle
                      cx={cx}
                      cy={cy}
                      r="12"
                      fill="none"
                      stroke={isBlinking ? '#fbbf24' : '#7dd3fc'}
                      strokeWidth="1.8"
                      strokeDasharray={isBlinking ? '3 2' : undefined}
                    />
                  )}
                  <circle
                    cx={cx}
                    cy={cy}
                    r="8"
                    fill={
                      led.state === 'OFF'
                        ? '#0b2a19'
                        : isLit
                          ? '#22c55e'
                          : '#14532d'
                    }
                    stroke={
                      led.state === 'OFF'
                        ? '#14532d'
                        : isLit
                          ? '#bbf7d0'
                          : '#166534'
                    }
                    strokeWidth="1.6"
                  />
                  <text
                    x={cx + 14}
                    y={cy - 1}
                    fontSize="8.5"
                    fontFamily="monospace"
                    fontWeight="800"
                    fill={isSelected ? '#fde047' : '#ffffff'}
                  >
                    W{led.workerId}
                  </text>
                  <text
                    x={cx + 14}
                    y={cy + 8}
                    fontSize="7.2"
                    fontFamily="monospace"
                    fill="#93c5fd"
                  >
                    {led.pin}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Dedicated ATmega128 TPK-128V2.4 Deep-Dive Interactive Control Center (LCD + 8 Green Worker LEDs + 4 FND Ideas) */}
      <Atmega128ControlPanel
        boardState={boardState}
        activeWorkerId={activeWorkerId}
        onSelectWorker={setActiveWorkerId}
        fndMode={fndMode}
        onSelectFndMode={setFndMode}
        scenario={scenario}
        onSelectScenario={(next) => {
          setScenario(next);
          if (next !== 'safe') setSimMode('simulate');
        }}
        offlineWorkers={offlineWorkers}
        onToggleOfflineWorker={handleToggleOfflineWorker}
        blinkOn={blinkOn}
      />

      {/* Bottom Context Card: Step-by-Step Pin Guide OR Live Signal Flow Explanation */}
      {simMode === 'guide' ? (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs font-mono-tabular font-semibold text-blue-700">
                STEP {stepMeta.step} / {WIRING_STEPS.length}
              </div>
              <h3 className="text-base font-bold text-slate-900 mt-0.5">{stepMeta.title}</h3>
              <p className="text-xs text-slate-600 mt-1">{stepMeta.summary}</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3.5 py-2 text-xs text-amber-900 max-w-md">
              <strong className="font-semibold">조립 팁:</strong> {stepMeta.tip}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-y border-slate-200 bg-slate-50 text-slate-600">
                  <th className="px-3 py-2 font-semibold">점퍼 선 색상</th>
                  <th className="px-3 py-2 font-semibold">출발 (센서 · 모듈)</th>
                  <th className="px-3 py-2 font-semibold">도착 (아두이노 · ATmega128)</th>
                  <th className="px-3 py-2 font-semibold">연결 포인트</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stepMeta.connections.map((conn) => (
                  <tr key={`${conn.from}-${conn.to}`}>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 font-medium text-slate-800">
                        <span
                          className="w-2.5 h-2.5 rounded-full inline-block"
                          style={{ backgroundColor: conn.colorHex }}
                          aria-hidden="true"
                        />
                        {conn.colorName}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono-tabular font-semibold text-slate-900">
                      {conn.from}
                    </td>
                    <td className="px-3 py-2 font-mono-tabular font-semibold text-blue-700">
                      {conn.to}
                    </td>
                    <td className="px-3 py-2 text-slate-600">{conn.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div
          className={`border rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4 ${
            isCritical
              ? 'bg-red-50 border-red-200 text-red-950'
              : isAlarm
                ? 'bg-amber-50 border-amber-200 text-amber-950'
                : 'bg-emerald-50 border-emerald-200 text-emerald-950'
          }`}
        >
          <div className="space-y-1 flex-1 min-w-[260px]">
            <div className="inline-flex items-center gap-2 text-xs font-bold">
              <Cpu className="w-4 h-4" aria-hidden="true" />
              <span>
                현재 시뮬레이션: 작업자 W0{activeWorkerId} · {activeScenario.label}
              </span>
              <span className="font-mono-tabular opacity-80">({boardState.uartPacket})</span>
            </div>
            <p className="text-xs leading-relaxed opacity-90">{activeScenario.explain}</p>
          </div>

          <div className="text-right font-mono-tabular text-xs space-y-0.5 shrink-0">
            <div>
              ATmega128 7-Seg: <strong>{fndDisplay}</strong>
            </div>
            <div>
              ATmega128 LCD: <strong>{lcdLine1.trim()}</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
