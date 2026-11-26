import { useCallback, useRef, useState } from 'react';
import { Download } from 'lucide-react';
import {
  BOM_PARTS,
  calculateSpeedOfSound,
  computeTemperatureErrorCm,
  type ModularConfig,
  type PowerBudgetMetrics,
  type WeightAndCoGMetrics,
} from '../engineering/helmetEngine';
import { InteractiveWiringSimulator } from './InteractiveWiringSimulator';

interface WiringAndBomViewProps {
  modularConfig: ModularConfig;
  weightMetrics: WeightAndCoGMetrics;
  powerMetrics: PowerBudgetMetrics;
}

type CircuitGroupId = 'all' | 'power' | 'ultrasonic' | 'tact' | 'actuators' | 'optional';

const CIRCUIT_TABS: Array<{ id: CircuitGroupId; label: string }> = [
  { id: 'all', label: '전체 회로' },
  { id: 'power', label: '전원부 (5V/GND)' },
  { id: 'ultrasonic', label: '초음파 (D2~D5)' },
  { id: 'tact', label: '5방향 택트 (D6~D10)' },
  { id: 'actuators', label: 'LED·부저 (D11~D13)' },
  { id: 'optional', label: '확장·UART (A0~A2)' },
];

interface WireHarnessRow {
  id: string;
  group: Exclude<CircuitGroupId, 'all'>;
  colorName: string;
  colorHex: string;
  signal: string;
  arduinoPin: string;
  targetModule: string;
  targetPin: string;
  cableType: string;
  lengthCm: number;
  routingPath: string;
}

const WIRE_HARNESS_ROWS: WireHarnessRow[] = [
  {
    id: 'w-pwr-5v',
    group: 'power',
    colorName: '적색',
    colorHex: '#dc2626',
    signal: '+5V MAIN BUS',
    arduinoPin: '5V (Power)',
    targetModule: 'MT3608 승압기 → 공통 5V 분배',
    targetPin: 'OUT+ / VCC',
    cableType: '22AWG 실리콘 / M-F',
    lengthCm: 12,
    routingPath: '후면 배터리 포드 → Uno 5V & 100µF 평활 콘덴서',
  },
  {
    id: 'w-pwr-gnd',
    group: 'power',
    colorName: '흑색',
    colorHex: '#1e293b',
    signal: 'COMMON GND',
    arduinoPin: 'GND (×2 공통)',
    targetModule: '전원부 + 전 센서·액추에이터',
    targetPin: 'OUT- / GND',
    cableType: '22AWG 실리콘 / M-F',
    lengthCm: 12,
    routingPath: '후면 공통 접지 스타(Star) 결선 (노이즈 방지)',
  },
  {
    id: 'w-us1-trig',
    group: 'ultrasonic',
    colorName: '황색',
    colorHex: '#ca8a04',
    signal: 'US1_TRIG (낙하물)',
    arduinoPin: 'D2',
    targetModule: 'HC-SR04 #1 (정수리)',
    targetPin: 'TRIG',
    cableType: 'Dupont M-F 20cm',
    lengthCm: 20,
    routingPath: '후면 Uno → 중앙 아치 내부 채널 → 정수리 포드',
  },
  {
    id: 'w-us1-echo',
    group: 'ultrasonic',
    colorName: '청색',
    colorHex: '#2563eb',
    signal: 'US1_ECHO (낙하물)',
    arduinoPin: 'D3',
    targetModule: 'HC-SR04 #1 (정수리)',
    targetPin: 'ECHO',
    cableType: 'Dupont M-F 20cm',
    lengthCm: 20,
    routingPath: '후면 Uno → 중앙 아치 내부 채널 → 정수리 포드',
  },
  {
    id: 'w-us2-trig',
    group: 'ultrasonic',
    colorName: '황색',
    colorHex: '#ca8a04',
    signal: 'US2_TRIG (후면)',
    arduinoPin: 'D4',
    targetModule: 'HC-SR04 #2 (후방)',
    targetPin: 'TRIG',
    cableType: 'Dupont M-F 10cm',
    lengthCm: 10,
    routingPath: '후면 Uno → 하단 후방 센서 브라켓 직결',
  },
  {
    id: 'w-us2-echo',
    group: 'ultrasonic',
    colorName: '청색',
    colorHex: '#2563eb',
    signal: 'US2_ECHO (후면)',
    arduinoPin: 'D5',
    targetModule: 'HC-SR04 #2 (후방)',
    targetPin: 'ECHO',
    cableType: 'Dupont M-F 10cm',
    lengthCm: 10,
    routingPath: '후면 Uno → 하단 후방 센서 브라켓 직결',
  },
  {
    id: 'w-sw-n',
    group: 'tact',
    colorName: '청색',
    colorHex: '#1d4ed8',
    signal: 'SW1_NORTH (전면)',
    arduinoPin: 'D6 (PULLUP)',
    targetModule: '택트 스위치 #1 (전면 챙)',
    targetPin: 'NO 단자 (+0.1µF)',
    cableType: 'Dupont M-M 30cm',
    lengthCm: 30,
    routingPath: '후면 Uno → 좌측 절연 림 클립 → 전면 챙 중앙',
  },
  {
    id: 'w-sw-s',
    group: 'tact',
    colorName: '청색',
    colorHex: '#1d4ed8',
    signal: 'SW2_SOUTH (후면)',
    arduinoPin: 'D7 (PULLUP)',
    targetModule: '택트 스위치 #2 (후면 림)',
    targetPin: 'NO 단자 (+0.1µF)',
    cableType: 'Dupont M-M 10cm',
    lengthCm: 10,
    routingPath: '후면 Uno → 후면 림 클립 최단 결선',
  },
  {
    id: 'w-sw-e',
    group: 'tact',
    colorName: '청색',
    colorHex: '#1d4ed8',
    signal: 'SW3_EAST (우측)',
    arduinoPin: 'D8 (PULLUP)',
    targetModule: '택트 스위치 #3 (우측 림)',
    targetPin: 'NO 단자 (+0.1µF)',
    cableType: 'Dupont M-M 20cm',
    lengthCm: 20,
    routingPath: '후면 Uno → 우측 절연 림 클립 중간 지점',
  },
  {
    id: 'w-sw-w',
    group: 'tact',
    colorName: '청색',
    colorHex: '#1d4ed8',
    signal: 'SW4_WEST (좌측)',
    arduinoPin: 'D9 (PULLUP)',
    targetModule: '택트 스위치 #4 (좌측 림)',
    targetPin: 'NO 단자 (+0.1µF)',
    cableType: 'Dupont M-M 20cm',
    lengthCm: 20,
    routingPath: '후면 Uno → 좌측 절연 림 클립 중간 지점',
  },
  {
    id: 'w-sw-top',
    group: 'tact',
    colorName: '청색',
    colorHex: '#1d4ed8',
    signal: 'SW5_CROWN (정수리)',
    arduinoPin: 'D10 (PULLUP)',
    targetModule: '택트 스위치 #5 (정수리)',
    targetPin: 'NO 단자 (+0.1µF)',
    cableType: 'Dupont M-M 20cm',
    lengthCm: 20,
    routingPath: '후면 Uno → 중앙 아치 내부 채널 → 정수리 포드',
  },
  {
    id: 'w-led-red',
    group: 'actuators',
    colorName: '적색',
    colorHex: '#dc2626',
    signal: 'LED_RED ×1 (전면 경보)',
    arduinoPin: 'D11 (PWM)',
    targetModule: '전면 적색 5mm LED ×1 (220Ω 직렬)',
    targetPin: 'Anode (+) ×1',
    cableType: 'Dupont M-M 30cm',
    lengthCm: 30,
    routingPath: '후면 Uno → 좌측 절연 림 → 전면 이마 단일 베젤',
  },
  {
    id: 'w-led-grn',
    group: 'actuators',
    colorName: '녹색',
    colorHex: '#16a34a',
    signal: 'LED_GRN ×1 (전면 정상)',
    arduinoPin: 'D12',
    targetModule: '전면 녹색 5mm LED ×1 (150Ω 직렬)',
    targetPin: 'Anode (+) ×1',
    cableType: 'Dupont M-M 30cm',
    lengthCm: 30,
    routingPath: '후면 Uno → 우측 절연 림 → 전면 이마 단일 베젤',
  },
  {
    id: 'w-buz-drv',
    group: 'actuators',
    colorName: '황색',
    colorHex: '#d97706',
    signal: 'BUZZER_DRV (85dB)',
    arduinoPin: 'D13',
    targetModule: '1kΩ → 2N2222 NPN → 정수리 부저',
    targetPin: 'Base (B) → BZ-',
    cableType: 'Dupont M-F 20cm',
    lengthCm: 20,
    routingPath: '후면 트랜지스터 구동부 → 중앙 아치 → 정수리 부저',
  },
  {
    id: 'w-opt-dht',
    group: 'optional',
    colorName: '녹색',
    colorHex: '#059669',
    signal: 'DHT11_DATA (내부 두부)',
    arduinoPin: 'A0 (10kΩ 풀업)',
    targetModule: 'DHT11 내부 두부 온습도 (헬멧 안쪽)',
    targetPin: 'DATA (Pin 2)',
    cableType: 'Dupont M-F 20cm',
    lengthCm: 20,
    routingPath: '후면 Uno → 내부 서스펜션 틈새 → 헬멧 안쪽 이마-두정부 공간',
  },
  {
    id: 'w-opt-mq2',
    group: 'optional',
    colorName: '황색',
    colorHex: '#ea580c',
    signal: 'MQ2_AO (유해가스)',
    arduinoPin: 'A1 (Analog)',
    targetModule: 'MQ-2 모듈 (전면 우측 호흡대)',
    targetPin: 'AO (5V 별도 권장)',
    cableType: 'Dupont M-F 30cm',
    lengthCm: 30,
    routingPath: '후면 Uno → 우측 절연 림 → 전면 챙 우측 슬롯',
  },
  {
    id: 'w-opt-ky',
    group: 'optional',
    colorName: '녹색',
    colorHex: '#0d9488',
    signal: 'KY037_AO (소음)',
    arduinoPin: 'A2 (Analog)',
    targetModule: 'KY-037 모듈 (좌측 측면 슬롯)',
    targetPin: 'A0 (LM393)',
    cableType: 'Dupont M-F 20cm',
    lengthCm: 20,
    routingPath: '후면 Uno → 좌측 절연 림 보조 슬롯',
  },
  {
    id: 'w-uart-ext',
    group: 'optional',
    colorName: '보라·청록',
    colorHex: '#7c3aed',
    signal: 'UART0 TX/RX (9600)',
    arduinoPin: 'D1(TX) / D0(RX) / GND',
    targetModule: 'ATmega128 TPK-128V2.4 관제 보드',
    targetPin: 'PE0(RXD0) / PE1(TXD0) / GND',
    cableType: '4핀 Dupont M-F / Molex',
    lengthCm: 30,
    routingPath: 'Uno TX→PE0, Uno RX←PE1 교차 결선 + 공통 GND 필수 연결',
  },
];

function resolvePublicAsset(relativePath: string): string {
  const base = import.meta.env.BASE_URL || './';
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  return `${normalizedBase}${relativePath.replace(/^\/+/, '')}`;
}

export function WiringAndBomView({
  modularConfig,
  weightMetrics,
  powerMetrics,
}: WiringAndBomViewProps) {
  const [wiringViewMode, setWiringViewMode] = useState<'simulator' | 'schematic'>('simulator');
  const [activeGroup, setActiveGroup] = useState<CircuitGroupId>('all');
  const schematicSvgRef = useRef<SVGSVGElement | null>(null);

  const helmetParts = BOM_PARTS.filter((p) => {
    if (p.id === 'atmega128-station') return false;
    if (!p.optionalKey) return true;
    if (p.optionalKey === 'dht11') return modularConfig.includeDht11;
    if (p.optionalKey === 'mq2') return modularConfig.includeMq2;
    if (p.optionalKey === 'ky037') return modularConfig.includeKy037;
    return true;
  });

  const visibleHarness =
    activeGroup === 'all'
      ? WIRE_HARNESS_ROWS
      : WIRE_HARNESS_ROWS.filter((row) => row.group === activeGroup);

  const soundSpeed = calculateSpeedOfSound(modularConfig.ambientTempC);
  const winterErr = computeTemperatureErrorCm(200, -15);

  const opacityFor = (group: Exclude<CircuitGroupId, 'all'>) =>
    activeGroup === 'all' || activeGroup === group ? 1 : 0.2;

  const handleExportWiringSvg = useCallback(() => {
    const svgEl = schematicSvgRef.current;
    if (!svgEl) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svgEl);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'smart-helmet-arduino-wiring-schematic.svg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const referencePhotos = [
    {
      src: resolvePublicAsset('assets/aistudio/image_8737d6c1.png'),
      title: '산업용 안전모 모체 (기준 형상)',
      meta: 'KCs ABE종 · 무천공 절연 클립 적용 대상',
    },
    {
      src: resolvePublicAsset('assets/aistudio/IMG_6101_9dd7dd89.png'),
      title: 'Arduino Uno R3 초보자 키트 (E2-B3)',
      meta: 'Uno R3 CH340 · 부저 · LED · MQ-2 · 저항 · 점퍼',
    },
    {
      src: resolvePublicAsset('assets/aistudio/IMG_7181_d6d2b996.jpeg'),
      title: 'HC-SR04 초음파 + 대형 택트 스위치',
      meta: '상단/후면 초음파(2개) · 5방향 충격 택트(5개)',
    },
    {
      src: resolvePublicAsset('assets/aistudio/IMG_7182_47a9951c.jpeg'),
      title: 'DHT11 온습도 센서 모듈',
      meta: '기온별 초음파 음속 c(T) 실시간 보정 (A0)',
    },
    {
      src: resolvePublicAsset('assets/aistudio/IMG_7179_0b481191.jpeg'),
      title: 'KY-037 소음 감지 모듈 (LM393)',
      meta: '85dBA 건설 현장 소음 감지 확장 슬롯 (A2)',
    },
    {
      src: resolvePublicAsset('assets/aistudio/IMG_7178_adceb581.jpeg'),
      title: 'ATmega128 중앙 관제 보드 (TPK-128V2.4)',
      meta: '16×2 블루 LCD · 4-Digit 7-Seg · 녹색 LED 8개(Y0~Y7) · 14.7456MHz',
    },
  ];

  // Helper to draw a crisp horizontal zigzag resistor symbol
  const renderResistorH = (x: number, y: number, stroke = '#475569') => (
    <path
      d={`M ${x} ${y} l 6 0 l 3 -5 l 5 10 l 5 -10 l 5 10 l 5 -10 l 3 5 l 6 0`}
      fill="none"
      stroke={stroke}
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
  );

  // Helper to draw an LED diode + emitted light arrows symbol
  const renderLedH = (x: number, y: number, color: string) => (
    <g>
      <polygon
        points={`${x},${y - 6} ${x + 12},${y} ${x},${y + 6}`}
        fill={color}
        fillOpacity="0.22"
        stroke={color}
        strokeWidth="1.5"
      />
      <line x1={x + 12} y1={y - 6} x2={x + 12} y2={y + 6} stroke={color} strokeWidth="1.7" />
      <path d={`M ${x + 3} ${y - 9} l 5 -5 m -3 0 l 3 0 l 0 3`} fill="none" stroke={color} strokeWidth="1.1" />
      <path d={`M ${x + 8} ${y - 8} l 5 -5 m -3 0 l 3 0 l 0 3`} fill="none" stroke={color} strokeWidth="1.1" />
    </g>
  );

  return (
    <div className="h-full overflow-auto bg-slate-50">
      <div className="max-w-[1380px] mx-auto px-6 py-7 space-y-10">
        {/* Section 01: Interactive 2D Wiring Simulator (ATmega128 + Arduino Uno R3) & Detailed SVG Schematic */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                01. 아두이노 · 센서 · ATmega128 배선 시뮬레이터 및 회로도
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                복잡한 센서·아두이노 Uno R3·ATmega128(TPK-128V2.4) 연결을 2D 단계별 배선과 실시간 신호 시뮬레이션으로 쉽게 확인할 수 있습니다.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <div
                className="inline-flex items-center p-1 bg-white border border-slate-200 rounded-lg shadow-xs"
                role="tablist"
                aria-label="배선도 보기 형식 전환"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={wiringViewMode === 'simulator'}
                  onClick={() => setWiringViewMode('simulator')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                    wiringViewMode === 'simulator'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  쉬운 2D 배선 시뮬레이터
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={wiringViewMode === 'schematic'}
                  onClick={() => setWiringViewMode('schematic')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                    wiringViewMode === 'schematic'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  정밀 핀별 회로도 (SVG)
                </button>
              </div>
              {wiringViewMode === 'schematic' && (
                <button
                  type="button"
                  onClick={handleExportWiringSvg}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors shrink-0"
                >
                  <Download className="w-3.5 h-3.5" aria-hidden="true" />
                  배선도 SVG 저장
                </button>
              )}
            </div>
          </div>

          {wiringViewMode === 'simulator' ? (
            <InteractiveWiringSimulator modularConfig={modularConfig} />
          ) : (
            <>
              {/* Interactive Subsystem Highlight Tabs */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex flex-wrap items-center gap-1.5" role="tablist" aria-label="회로 계통 하이라이트">
                  {CIRCUIT_TABS.map((tab) => {
                    const active = activeGroup === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => setActiveGroup(tab.id)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                          active
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-600 font-mono-tabular">
                  <span>음속 c({modularConfig.ambientTempC}°C) = {soundSpeed} m/s</span>
                  <span aria-hidden="true">·</span>
                  <span>혹한기 -15°C 미보정 오차 +{winterErr}cm</span>
                </div>
              </div>

              {/* Detailed KiCad / Fritzing-Style Interactive Schematic SVG */}
              <div className="bg-white border border-slate-200 rounded-lg p-3 overflow-x-auto shadow-xs">
                <svg
                  ref={schematicSvgRef}
                  viewBox="0 0 1360 770"
                  className="w-full min-w-[1060px] h-auto block"
              xmlns="http://www.w3.org/2000/svg"
              aria-label="Arduino Uno R3 스마트 안전모 정밀 핀별 회로도"
            >
              <defs>
                <pattern id="schemGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e2e8f0" strokeWidth="0.6" />
                </pattern>
              </defs>

              {/* Schematic Sheet Background & Border */}
              <rect x="0" y="0" width="1360" height="770" fill="#fcfdff" />
              <rect x="10" y="10" width="1340" height="750" fill="url(#schemGrid)" stroke="#94a3b8" strokeWidth="1.5" />

              {/* Sheet Header Strip */}
              <rect x="10" y="10" width="1340" height="32" fill="#0f172a" />
              <text x="26" y="30" fill="#f8fafc" fontSize="12" fontWeight="700" fontFamily="Plus Jakarta Sans, Noto Sans KR, sans-serif">
                SCHEMATIC SHEET 01 — SMART HELMET MODULAR ELECTRONICS (ARDUINO UNO R3 · 5V RAIL · NON-DESTRUCTIVE CLIP SYSTEM)
              </text>
              <text x="1334" y="30" fill="#94a3b8" fontSize="11" textAnchor="end" fontFamily="JetBrains Mono, monospace">
                REV 2.4 · 5V DC · {powerMetrics.totalCurrentMa}mA AVG
              </text>

              {/* ==================== SUBSYSTEM 1: POWER MODULE (TOP) ==================== */}
              <g style={{ opacity: opacityFor('power'), transition: 'opacity 180ms ease' }}>
                <rect x="330" y="54" width="700" height="84" rx="6" fill="#fffbeb" stroke="#d97706" strokeWidth="1.6" />
                <text x="346" y="74" fill="#92400e" fontSize="12" fontWeight="700">
                  POWER SUPPLY &amp; 5V DISTRIBUTION (후면 배터리 포드 · 연속 {powerMetrics.batteryHours}시간 구동)
                </text>

                {/* Power Chain Sub-blocks */}
                <rect x="346" y="84" width="132" height="42" rx="4" fill="#ffffff" stroke="#b45309" strokeWidth="1.2" />
                <text x="412" y="102" fill="#0f172a" fontSize="10.5" fontWeight="700" textAnchor="middle">Li-Ion 18650 / Pouch</text>
                <text x="412" y="118" fill="#64748b" fontSize="9.5" textAnchor="middle" fontFamily="JetBrains Mono, monospace">3.7V · 2500mAh</text>

                <line x1="478" y1="105" x2="504" y2="105" stroke="#dc2626" strokeWidth="2" />
                <rect x="504" y="84" width="136" height="42" rx="4" fill="#ffffff" stroke="#b45309" strokeWidth="1.2" />
                <text x="572" y="102" fill="#0f172a" fontSize="10.5" fontWeight="700" textAnchor="middle">TP4056 충방전 보호</text>
                <text x="572" y="118" fill="#64748b" fontSize="9.5" textAnchor="middle" fontFamily="JetBrains Mono, monospace">USB-C 5V · DW01A</text>

                <line x1="640" y1="105" x2="666" y2="105" stroke="#dc2626" strokeWidth="2" />
                <rect x="666" y="84" width="140" height="42" rx="4" fill="#ffffff" stroke="#dc2626" strokeWidth="1.4" />
                <text x="736" y="102" fill="#0f172a" fontSize="10.5" fontWeight="700" textAnchor="middle">MT3608 DC-DC 승압</text>
                <text x="736" y="118" fill="#b91c1c" fontSize="9.5" textAnchor="middle" fontFamily="JetBrains Mono, monospace">3.7V → 5.0V (η 85%)</text>

                <line x1="806" y1="105" x2="834" y2="105" stroke="#dc2626" strokeWidth="2" />
                {/* Slide Switch + 100uF Cap */}
                <rect x="834" y="84" width="180" height="42" rx="4" fill="#ffffff" stroke="#475569" strokeWidth="1.2" />
                <text x="924" y="102" fill="#0f172a" fontSize="10.5" fontWeight="700" textAnchor="middle">메인 전원 SW + C1 100µF</text>
                <text x="924" y="118" fill="#475569" fontSize="9.5" textAnchor="middle" fontFamily="JetBrains Mono, monospace">16V 전해 평활 · 스타 GND</text>

                {/* Main +5V RED Bus & GND BLACK Bus routing into Arduino Left Power Header */}
                <path d="M 885 126 L 885 152 L 456 152 L 456 206 L 510 206" fill="none" stroke="#dc2626" strokeWidth="2.4" />
                <path d="M 960 126 L 960 162 L 442 162 L 442 232 L 510 232" fill="none" stroke="#1e293b" strokeWidth="2.4" />
                <circle cx="456" cy="206" r="3.5" fill="#dc2626" />
                <circle cx="442" cy="232" r="3.5" fill="#1e293b" />
                <text x="462" y="148" fill="#dc2626" fontSize="10" fontWeight="700" fontFamily="JetBrains Mono, monospace">+5V MAIN RAIL</text>
                <text x="898" y="148" fill="#1e293b" fontSize="10" fontWeight="700" fontFamily="JetBrains Mono, monospace">GND STAR RAIL</text>
              </g>

              {/* ==================== CENTER: ARDUINO UNO R3 MCU BOARD ==================== */}
              <g>
                {/* Board Body */}
                <rect x="510" y="176" width="340" height="492" rx="10" fill="#0d4a6f" stroke="#0f172a" strokeWidth="2.4" />
                {/* Inner Silk Frame */}
                <rect x="520" y="186" width="320" height="472" rx="6" fill="none" stroke="#38bdf8" strokeWidth="0.9" strokeOpacity="0.45" />

                {/* USB-B Port & DC Barrel Jack */}
                <rect x="536" y="166" width="58" height="28" rx="2" fill="#cbd5e1" stroke="#334155" strokeWidth="1.5" />
                <text x="565" y="184" fill="#0f172a" fontSize="9" fontWeight="700" textAnchor="middle" fontFamily="JetBrains Mono, monospace">USB-B</text>
                <rect x="758" y="166" width="54" height="28" rx="2" fill="#1e293b" stroke="#0f172a" strokeWidth="1.5" />
                <text x="785" y="184" fill="#e2e8f0" fontSize="8.5" fontWeight="700" textAnchor="middle" fontFamily="JetBrains Mono, monospace">7~12V</text>

                {/* Board Title */}
                <text x="680" y="216" fill="#ffffff" fontSize="15.5" fontWeight="800" textAnchor="middle">
                  Arduino Uno R3
                </text>
                <text x="680" y="233" fill="#bae6fd" fontSize="10.5" textAnchor="middle" fontFamily="JetBrains Mono, monospace">
                  ATmega328P · CH340G · 16MHz
                </text>

                {/* ATmega328P DIP-28 Central Chip Graphic */}
                <rect x="634" y="294" width="92" height="196" rx="4" fill="#111827" stroke="#64748b" strokeWidth="1.5" />
                <path d="M 672 294 A 8 8 0 0 0 688 294" fill="none" stroke="#94a3b8" strokeWidth="1.4" />
                <text x="680" y="388" fill="#e2e8f0" fontSize="10.5" fontWeight="700" textAnchor="middle" fontFamily="JetBrains Mono, monospace">ATmega328P</text>
                <text x="680" y="405" fill="#94a3b8" fontSize="9" textAnchor="middle" fontFamily="JetBrains Mono, monospace">DIP-28 · 5V</text>
                <text x="680" y="422" fill="#38bdf8" fontSize="8.5" textAnchor="middle" fontFamily="JetBrains Mono, monospace">Kalman + TDM</text>

                {/* Crystal & Reset Button */}
                <rect x="650" y="252" width="60" height="20" rx="10" fill="#cbd5e1" stroke="#475569" strokeWidth="1.2" />
                <text x="680" y="265" fill="#0f172a" fontSize="8.5" fontWeight="700" textAnchor="middle" fontFamily="JetBrains Mono, monospace">16.000MHz</text>

                <rect x="646" y="512" width="68" height="26" rx="4" fill="#1e293b" stroke="#475569" strokeWidth="1.2" />
                <text x="680" y="529" fill="#cbd5e1" fontSize="9" fontWeight="700" textAnchor="middle" fontFamily="JetBrains Mono, monospace">CH340G</text>

                <circle cx="680" cy="634" r="11" fill="#dc2626" stroke="#fca5a5" strokeWidth="1.5" />
                <text x="680" y="656" fill="#cbd5e1" fontSize="8.5" textAnchor="middle" fontFamily="JetBrains Mono, monospace">RESET</text>

                {/* LEFT PIN HEADER (Inputs / Power / Analog) */}
                {[
                  { y: 206, label: '5V', fill: '#ef4444' },
                  { y: 232, label: 'GND', fill: '#475569' },
                  { y: 274, label: 'D2', fill: '#eab308' },
                  { y: 298, label: 'D3', fill: '#3b82f6' },
                  { y: 322, label: 'D4', fill: '#eab308' },
                  { y: 346, label: 'D5', fill: '#3b82f6' },
                  { y: 392, label: 'D6', fill: '#60a5fa' },
                  { y: 416, label: 'D7', fill: '#60a5fa' },
                  { y: 440, label: 'D8', fill: '#60a5fa' },
                  { y: 464, label: 'D9', fill: '#60a5fa' },
                  { y: 488, label: 'D10', fill: '#60a5fa' },
                  { y: 544, label: 'A0', fill: '#10b981' },
                  { y: 582, label: 'A1', fill: '#f97316' },
                  { y: 620, label: 'A2', fill: '#14b8a6' },
                ].map((pin) => (
                  <g key={`L-${pin.label}`}>
                    <rect x="504" y={pin.y - 6} width="14" height="12" rx="1.5" fill="#0f172a" stroke="#facc15" strokeWidth="1" />
                    <circle cx="511" cy={pin.y} r="2.6" fill={pin.fill} />
                    <text x="526" y={pin.y + 4} fill="#f8fafc" fontSize="11" fontWeight="700" fontFamily="JetBrains Mono, monospace">
                      {pin.label}
                    </text>
                  </g>
                ))}

                {/* RIGHT PIN HEADER (Actuators & UART) */}
                {[
                  { y: 224, label: 'D13', fill: '#f59e0b' },
                  { y: 368, label: 'D11 (PWM)', fill: '#ef4444' },
                  { y: 470, label: 'D12', fill: '#22c55e' },
                  { y: 568, label: 'D1 (TX)', fill: '#a78bfa' },
                  { y: 594, label: 'D0 (RX)', fill: '#a78bfa' },
                  { y: 620, label: '5V OUT', fill: '#ef4444' },
                  { y: 646, label: 'GND', fill: '#64748b' },
                ].map((pin) => (
                  <g key={`R-${pin.label}`}>
                    <rect x="842" y={pin.y - 6} width="14" height="12" rx="1.5" fill="#0f172a" stroke="#facc15" strokeWidth="1" />
                    <circle cx="849" cy={pin.y} r="2.6" fill={pin.fill} />
                    <text x="834" y={pin.y + 4} fill="#f8fafc" fontSize="11" fontWeight="700" textAnchor="end" fontFamily="JetBrains Mono, monospace">
                      {pin.label}
                    </text>
                  </g>
                ))}
              </g>

              {/* ==================== SUBSYSTEM 2: ULTRASONIC SENSORS (LEFT TOP) ==================== */}
              <g style={{ opacity: opacityFor('ultrasonic'), transition: 'opacity 180ms ease' }}>
                <rect x="28" y="176" width="388" height="186" rx="6" fill="#f0f9ff" stroke="#0284c7" strokeWidth="1.8" />
                <text x="42" y="198" fill="#0c4a6e" fontSize="12.5" fontWeight="700">
                  초음파 센서 모듈 ×2 (HC-SR04 · 40kHz ToF · 65ms 시분할 TDM)
                </text>

                {/* HC-SR04 #1 Crown */}
                <rect x="42" y="210" width="360" height="68" rx="4" fill="#ffffff" stroke="#0369a1" strokeWidth="1.3" />
                {/* Twin Transducer Circles */}
                <circle cx="68" cy="244" r="14" fill="#e2e8f0" stroke="#475569" strokeWidth="1.4" />
                <circle cx="68" cy="244" r="7" fill="#94a3b8" />
                <circle cx="104" cy="244" r="14" fill="#e2e8f0" stroke="#475569" strokeWidth="1.4" />
                <circle cx="104" cy="244" r="7" fill="#94a3b8" />
                <text x="130" y="232" fill="#0f172a" fontSize="11.5" fontWeight="700">#1 정수리 상단 (낙하물 Δd/Δt 감지)</text>
                <text x="130" y="249" fill="#475569" fontSize="10" fontFamily="JetBrains Mono, monospace">VCC(+5V) · GND · 중앙 아치 배선</text>
                <text x="130" y="266" fill="#0369a1" fontSize="10" fontFamily="JetBrains Mono, monospace">TRIG→D2 (황색) | ECHO→D3 (청색)</text>
                {/* Pins on right edge */}
                <text x="394" y="238" fill="#ca8a04" fontSize="9.5" fontWeight="700" textAnchor="end" fontFamily="JetBrains Mono, monospace">TRIG</text>
                <text x="394" y="258" fill="#2563eb" fontSize="9.5" fontWeight="700" textAnchor="end" fontFamily="JetBrains Mono, monospace">ECHO</text>

                {/* HC-SR04 #2 Rear */}
                <rect x="42" y="286" width="360" height="66" rx="4" fill="#ffffff" stroke="#0369a1" strokeWidth="1.3" />
                <circle cx="68" cy="319" r="14" fill="#e2e8f0" stroke="#475569" strokeWidth="1.4" />
                <circle cx="68" cy="319" r="7" fill="#94a3b8" />
                <circle cx="104" cy="319" r="14" fill="#e2e8f0" stroke="#475569" strokeWidth="1.4" />
                <circle cx="104" cy="319" r="7" fill="#94a3b8" />
                <text x="130" y="308" fill="#0f172a" fontSize="11.5" fontWeight="700">#2 후면 사각지대 (30~200cm 장애물)</text>
                <text x="130" y="325" fill="#475569" fontSize="10" fontFamily="JetBrains Mono, monospace">VCC(+5V) · GND · 후면 포드 직결</text>
                <text x="130" y="341" fill="#0369a1" fontSize="10" fontFamily="JetBrains Mono, monospace">TRIG→D4 (황색) | ECHO→D5 (청색)</text>
                <text x="394" y="314" fill="#ca8a04" fontSize="9.5" fontWeight="700" textAnchor="end" fontFamily="JetBrains Mono, monospace">TRIG</text>
                <text x="394" y="336" fill="#2563eb" fontSize="9.5" fontWeight="700" textAnchor="end" fontFamily="JetBrains Mono, monospace">ECHO</text>

                {/* Orthogonal Wires to Arduino D2..D5 */}
                <path d="M 402 234 L 468 234 L 468 274 L 504 274" fill="none" stroke="#ca8a04" strokeWidth="2.1" />
                <path d="M 402 254 L 458 254 L 458 298 L 504 298" fill="none" stroke="#2563eb" strokeWidth="2.1" />
                <path d="M 402 310 L 448 310 L 448 322 L 504 322" fill="none" stroke="#ca8a04" strokeWidth="2.1" />
                <path d="M 402 332 L 438 332 L 438 346 L 504 346" fill="none" stroke="#2563eb" strokeWidth="2.1" />
              </g>

              {/* ==================== SUBSYSTEM 3: 5-WAY TACTILE SWITCHES (LEFT MID) ==================== */}
              <g style={{ opacity: opacityFor('tact'), transition: 'opacity 180ms ease' }}>
                <rect x="28" y="376" width="388" height="136" rx="6" fill="#eff6ff" stroke="#1d4ed8" strokeWidth="1.8" />
                <text x="42" y="396" fill="#1e3a8a" fontSize="12.5" fontWeight="700">
                  5방향 충격·전도 택트 스위치 (SW1~SW5 · INPUT_PULLUP)
                </text>
                <text x="42" y="411" fill="#3b82f6" fontSize="10" fontFamily="JetBrains Mono, monospace">
                  병렬 0.1µF 세라믹 디바운스 + 45ms S/W 시프트 필터 · 공통 GND
                </text>

                {/* 5 Switch Rows with Schematic SPST Switch + Cap Symbol */}
                {[
                  { label: 'SW1 전면(N)', y: 428, pinY: 392 },
                  { label: 'SW2 후면(S)', y: 446, pinY: 416 },
                  { label: 'SW3 우측(E)', y: 464, pinY: 440 },
                  { label: 'SW4 좌측(W)', y: 482, pinY: 464 },
                  { label: 'SW5 정수리', y: 500, pinY: 488 },
                ].map((sw, idx) => (
                  <g key={sw.label}>
                    {/* Common GND vertical bus inside box */}
                    <line x1="146" y1={sw.y} x2="176" y2={sw.y} stroke="#334155" strokeWidth="1.4" />
                    <circle cx="146" cy={sw.y} r="2.2" fill="#334155" />
                    {/* SPST Tactile Switch Symbol */}
                    <circle cx="178" cy={sw.y} r="2" fill="#1d4ed8" />
                    <line x1="180" y1={sw.y - 1} x2="202" y2={sw.y - 7} stroke="#1d4ed8" strokeWidth="1.7" />
                    <line x1="191" y1={sw.y - 10} x2="191" y2={sw.y - 4} stroke="#1d4ed8" strokeWidth="1.2" />
                    <circle cx="204" cy={sw.y} r="2" fill="#1d4ed8" />
                    {/* Parallel 0.1uF Cap Symbol label */}
                    <line x1="206" y1={sw.y} x2="402" y2={sw.y} stroke="#2563eb" strokeWidth="1.7" />
                    <text x="44" y={sw.y + 3.5} fill="#0f172a" fontSize="10.5" fontWeight="600" fontFamily="JetBrains Mono, monospace">
                      {sw.label}
                    </text>
                    <text x="224" y={sw.y - 3} fill="#64748b" fontSize="8.8" fontFamily="JetBrains Mono, monospace">
                      C{idx + 2} 0.1µF // GND
                    </text>
                    {/* Orthogonal trace to D6..D10 */}
                    <path
                      d={`M 402 ${sw.y} L ${430 + idx * 11} ${sw.y} L ${430 + idx * 11} ${sw.pinY} L 504 ${sw.pinY}`}
                      fill="none"
                      stroke="#2563eb"
                      strokeWidth="1.8"
                    />
                  </g>
                ))}
                {/* Common GND vertical bar for all 5 switches */}
                <line x1="146" y1="428" x2="146" y2="506" stroke="#334155" strokeWidth="2" />
                <text x="136" y="507" fill="#334155" fontSize="8.5" fontWeight="700" textAnchor="end" fontFamily="JetBrains Mono, monospace">GND</text>
              </g>

              {/* ==================== SUBSYSTEM 4: OPTIONAL EXTENSION SENSORS (LEFT BOTTOM) ==================== */}
              <g style={{ opacity: opacityFor('optional'), transition: 'opacity 180ms ease' }}>
                <rect x="28" y="526" width="388" height="142" rx="6" fill="#ecfdf5" stroke="#059669" strokeWidth="1.8" />
                <text x="42" y="546" fill="#065f46" fontSize="12.5" fontWeight="700">
                  확장 센서 슬롯 (착탈식 모듈 · 현재 설정 반영)
                </text>

                {/* DHT11 */}
                <rect
                  x="42"
                  y="556"
                  width="360"
                  height="30"
                  rx="4"
                  fill={modularConfig.includeDht11 ? '#ffffff' : '#f1f5f9'}
                  stroke={modularConfig.includeDht11 ? '#059669' : '#94a3b8'}
                  strokeWidth="1.3"
                />
                <text x="54" y="575" fill="#0f172a" fontSize="11" fontWeight="700">DHT11 온습도</text>
                <text x="148" y="575" fill="#475569" fontSize="9.8" fontFamily="JetBrains Mono, monospace">DATA + 10kΩ 풀업 → A0</text>
                <text x="392" y="575" fill={modularConfig.includeDht11 ? '#059669' : '#64748b'} fontSize="9.5" fontWeight="700" textAnchor="end">
                  {modularConfig.includeDht11 ? '장착됨' : '미장착'}
                </text>
                <path
                  d="M 402 571 L 456 571 L 456 544 L 504 544"
                  fill="none"
                  stroke="#059669"
                  strokeWidth="2"
                  strokeDasharray={modularConfig.includeDht11 ? undefined : '4 3'}
                />

                {/* MQ-2 */}
                <rect
                  x="42"
                  y="592"
                  width="360"
                  height="30"
                  rx="4"
                  fill={modularConfig.includeMq2 ? '#ffffff' : '#f1f5f9'}
                  stroke={modularConfig.includeMq2 ? '#ea580c' : '#94a3b8'}
                  strokeWidth="1.3"
                />
                <text x="54" y="611" fill="#0f172a" fontSize="11" fontWeight="700">MQ-2 유해가스</text>
                <text x="148" y="611" fill="#475569" fontSize="9.8" fontFamily="JetBrains Mono, monospace">AO → A1 (히터 800mW)</text>
                <text x="392" y="611" fill={modularConfig.includeMq2 ? '#ea580c' : '#64748b'} fontSize="9.5" fontWeight="700" textAnchor="end">
                  {modularConfig.includeMq2 ? '장착됨' : '미장착'}
                </text>
                <path
                  d="M 402 607 L 468 607 L 468 582 L 504 582"
                  fill="none"
                  stroke="#ea580c"
                  strokeWidth="2"
                  strokeDasharray={modularConfig.includeMq2 ? undefined : '4 3'}
                />

                {/* KY-037 */}
                <rect
                  x="42"
                  y="628"
                  width="360"
                  height="30"
                  rx="4"
                  fill={modularConfig.includeKy037 ? '#ffffff' : '#f1f5f9'}
                  stroke={modularConfig.includeKy037 ? '#0d9488' : '#94a3b8'}
                  strokeWidth="1.3"
                />
                <text x="54" y="647" fill="#0f172a" fontSize="11" fontWeight="700">KY-037 소음감지</text>
                <text x="148" y="647" fill="#475569" fontSize="9.8" fontFamily="JetBrains Mono, monospace">LM393 AO → A2 (85dBA)</text>
                <text x="392" y="647" fill={modularConfig.includeKy037 ? '#0d9488' : '#64748b'} fontSize="9.5" fontWeight="700" textAnchor="end">
                  {modularConfig.includeKy037 ? '장착됨' : '미장착'}
                </text>
                <path
                  d="M 402 643 L 480 643 L 480 620 L 504 620"
                  fill="none"
                  stroke="#0d9488"
                  strokeWidth="2"
                  strokeDasharray={modularConfig.includeKy037 ? undefined : '4 3'}
                />
              </g>

              {/* ==================== SUBSYSTEM 5: ACTIVE BUZZER NPN DRIVER (RIGHT TOP) ==================== */}
              <g style={{ opacity: opacityFor('actuators'), transition: 'opacity 180ms ease' }}>
                <rect x="944" y="176" width="388" height="156" rx="6" fill="#fffbeb" stroke="#d97706" strokeWidth="1.8" />
                <text x="958" y="198" fill="#92400e" fontSize="12.5" fontWeight="700">
                  능동 피에조 부저 NPN 증폭 구동부 (D13 · 85dB)
                </text>
                <text x="958" y="214" fill="#b45309" fontSize="10" fontFamily="JetBrains Mono, monospace">
                  MCU 핀 과전류 보호 (I_GPIO &lt; 4.3mA) + 역기전력 플라이백 다이오드
                </text>

                {/* Wire from D13 to 1k Base Resistor */}
                <line x1="856" y1="224" x2="964" y2="224" stroke="#d97706" strokeWidth="2.2" />
                <path d="M 964 224 L 964 268 L 980 268" fill="none" stroke="#d97706" strokeWidth="2" />
                {renderResistorH(980, 268, '#b45309')}
                <text x="1000" y="255" fill="#92400e" fontSize="9.5" fontWeight="700" textAnchor="middle" fontFamily="JetBrains Mono, monospace">R_B 1kΩ</text>

                {/* 2N2222 NPN Transistor Symbol */}
                <line x1="1018" y1="268" x2="1056" y2="268" stroke="#0f172a" strokeWidth="1.8" />
                <circle cx="1066" cy="268" r="16" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5" />
                <line x1="1058" y1="258" x2="1058" y2="278" stroke="#0f172a" strokeWidth="2.4" />
                <line x1="1058" y1="263" x2="1074" y2="253" stroke="#0f172a" strokeWidth="1.7" />
                <line x1="1058" y1="273" x2="1074" y2="283" stroke="#0f172a" strokeWidth="1.7" />
                <polygon points="1074,283 1066,282 1070,276" fill="#0f172a" />
                <text x="1066" y="298" fill="#0f172a" fontSize="9.5" fontWeight="700" textAnchor="middle" fontFamily="JetBrains Mono, monospace">Q1 2N2222</text>

                {/* Emitter to GND */}
                <line x1="1074" y1="283" x2="1074" y2="314" stroke="#1e293b" strokeWidth="1.8" />
                <line x1="1062" y1="314" x2="1086" y2="314" stroke="#1e293b" strokeWidth="2" />
                <line x1="1066" y1="319" x2="1082" y2="319" stroke="#1e293b" strokeWidth="1.6" />
                <line x1="1070" y1="324" x2="1078" y2="324" stroke="#1e293b" strokeWidth="1.3" />

                {/* Collector up to Active Buzzer & 1N4148 Flyback Diode */}
                <path d="M 1074 253 L 1074 242 L 1148 242" fill="none" stroke="#0f172a" strokeWidth="1.8" />
                {/* Active Buzzer Symbol */}
                <rect x="1148" y="226" width="84" height="36" rx="18" fill="#1e293b" stroke="#0f172a" strokeWidth="1.6" />
                <text x="1190" y="248" fill="#fde047" fontSize="10" fontWeight="700" textAnchor="middle" fontFamily="JetBrains Mono, monospace">BZ1 5V</text>
                <text x="1190" y="276" fill="#475569" fontSize="9.5" textAnchor="middle">정수리 능동 부저</text>

                {/* +5V feed to Buzzer */}
                <line x1="1232" y1="242" x2="1282" y2="242" stroke="#dc2626" strokeWidth="2" />
                <text x="1288" y="246" fill="#dc2626" fontSize="10" fontWeight="700" fontFamily="JetBrains Mono, monospace">+5V</text>

                {/* Flyback Diode D1 1N4148 in parallel */}
                <path d="M 1126 242 L 1126 300 L 1254 300 L 1254 242" fill="none" stroke="#64748b" strokeWidth="1.4" />
                <circle cx="1126" cy="242" r="2.5" fill="#0f172a" />
                <circle cx="1254" cy="242" r="2.5" fill="#dc2626" />
                <polygon points="1182,294 1196,300 1182,306" fill="#ffffff" stroke="#475569" strokeWidth="1.4" />
                <line x1="1196" y1="294" x2="1196" y2="306" stroke="#475569" strokeWidth="1.8" />
                <text x="1190" y="318" fill="#475569" fontSize="9.2" textAnchor="middle" fontFamily="JetBrains Mono, monospace">D1 1N4148 (역기전력 보호)</text>
              </g>

              {/* ==================== SUBSYSTEM 6: MINIMAL FRONT DUAL LED MODULE (RIGHT MID) ==================== */}
              <g style={{ opacity: opacityFor('actuators'), transition: 'opacity 180ms ease' }}>
                <rect x="944" y="344" width="388" height="190" rx="6" fill="#f8fafc" stroke="#15803d" strokeWidth="1.8" />
                <text x="958" y="365" fill="#0f172a" fontSize="12" fontWeight="700">
                  전면 이마 최적 경고 LED 모듈 (IEC 60073 · 최소화 2개)
                </text>
                <text x="958" y="381" fill="#475569" fontSize="9.5" fontFamily="JetBrains Mono, monospace">
                  전면 단일 베젤 배치 (6→2개) · 소비전력 67% 절감 (60mW) · 전방 180° 가시성
                </text>

                {/* Red LED #1 Branch from D11 */}
                <line x1="856" y1="368" x2="966" y2="368" stroke="#dc2626" strokeWidth="2.2" />
                <path d="M 966 368 L 966 418 L 984 418" fill="none" stroke="#dc2626" strokeWidth="2" />
                <circle cx="966" cy="418" r="2.4" fill="#dc2626" />
                {renderResistorH(984, 418, '#b91c1c')}
                <text x="1003" y="408" fill="#b91c1c" fontSize="9" fontWeight="700" textAnchor="middle" fontFamily="JetBrains Mono, monospace">220Ω</text>
                <line x1="1022" y1="418" x2="1050" y2="418" stroke="#dc2626" strokeWidth="1.6" />
                {renderLedH(1050, 418, '#dc2626')}
                <line x1="1062" y1="418" x2="1098" y2="418" stroke="#334155" strokeWidth="1.6" />
                <circle cx="1098" cy="418" r="2.4" fill="#1e293b" />
                <text x="1116" y="422" fill="#0f172a" fontSize="10.5" fontWeight="700">
                  RED #1 · 전면 이마 (13.6mA)
                </text>

                {/* Green LED #1 Branch from D12 */}
                <line x1="856" y1="470" x2="966" y2="470" stroke="#16a34a" strokeWidth="2.2" />
                <line x1="966" y1="470" x2="984" y2="470" stroke="#16a34a" strokeWidth="2" />
                <circle cx="966" cy="470" r="2.4" fill="#16a34a" />
                {renderResistorH(984, 470, '#15803d')}
                <text x="1003" y="460" fill="#15803d" fontSize="9" fontWeight="700" textAnchor="middle" fontFamily="JetBrains Mono, monospace">150Ω</text>
                <line x1="1022" y1="470" x2="1050" y2="470" stroke="#16a34a" strokeWidth="1.6" />
                {renderLedH(1050, 470, '#16a34a')}
                <line x1="1062" y1="470" x2="1098" y2="470" stroke="#334155" strokeWidth="1.6" />
                <circle cx="1098" cy="470" r="2.4" fill="#1e293b" />
                <text x="1116" y="474" fill="#0f172a" fontSize="10.5" fontWeight="700">
                  GRN #1 · 전면 이마 (13.3mA)
                </text>

                {/* Common LED GND vertical bus cleanly left of text labels */}
                <line x1="1098" y1="418" x2="1098" y2="508" stroke="#1e293b" strokeWidth="2" />
                <text x="1098" y="522" fill="#1e293b" fontSize="8.8" fontWeight="700" textAnchor="middle" fontFamily="JetBrains Mono, monospace">COMMON GND</text>
              </g>

              {/* ==================== SUBSYSTEM 7: 4-PIN UART EXTENSION HEADER (RIGHT BOTTOM) ==================== */}
              <g style={{ opacity: opacityFor('optional'), transition: 'opacity 180ms ease' }}>
                <rect x="944" y="544" width="388" height="128" rx="6" fill="#f5f3ff" stroke="#7c3aed" strokeWidth="1.6" strokeDasharray="6 3" />
                <text x="958" y="564" fill="#5b21b6" fontSize="12" fontWeight="700">
                  J_UART 4핀 착탈식 확장 포트 (외부 모니터링 옵션)
                </text>
                <text x="958" y="580" fill="#6d28d9" fontSize="9.6" fontFamily="JetBrains Mono, monospace">
                  UART 9600 bps · 8N1 · 패킷 [ID][위험코드][거리cm]
                </text>

                {[
                  { srcY: 568, dstY: 598, bendX: 916, pinNo: 'PIN 1', sig: 'TX → 외부 수신 (RX)', color: '#7c3aed' },
                  { srcY: 594, dstY: 618, bendX: 904, pinNo: 'PIN 2', sig: 'RX ← 외부 송신 (TX)', color: '#8b5cf6' },
                  { srcY: 620, dstY: 638, bendX: 892, pinNo: 'PIN 3', sig: '+5V (기준 전원 출력)', color: '#dc2626' },
                  { srcY: 646, dstY: 658, bendX: 880, pinNo: 'PIN 4', sig: 'GND (공통 접지)', color: '#1e293b' },
                ].map((u) => (
                  <g key={u.pinNo}>
                    <path
                      d={`M 856 ${u.srcY} L ${u.bendX} ${u.srcY} L ${u.bendX} ${u.dstY} L 962 ${u.dstY}`}
                      fill="none"
                      stroke={u.color}
                      strokeWidth="1.9"
                    />
                    <rect x="962" y={u.dstY - 7.5} width="46" height="15" rx="2" fill="#ffffff" stroke={u.color} strokeWidth="1.2" />
                    <text x="985" y={u.dstY + 3.2} fill="#0f172a" fontSize="8.8" fontWeight="700" textAnchor="middle" fontFamily="JetBrains Mono, monospace">
                      {u.pinNo}
                    </text>
                    <text x="1020" y={u.dstY + 3.5} fill="#334155" fontSize="10" fontFamily="JetBrains Mono, monospace">
                      {u.sig}
                    </text>
                  </g>
                ))}
              </g>

              {/* ==================== BOTTOM LEGEND & DESIGN NOTES BAR ==================== */}
              <g>
                <rect x="28" y="684" width="1304" height="62" rx="6" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.2" />
                <text x="44" y="706" fill="#0f172a" fontSize="11.5" fontWeight="700">
                  5색 점퍼 하네스 배선 규격 (Wire Color Code)
                </text>
                {[
                  { x: 44, color: '#dc2626', label: '적색: +5V / 적색 LED' },
                  { x: 210, color: '#1e293b', label: '흑색: 공통 GND' },
                  { x: 345, color: '#ca8a04', label: '황색: 초음파 TRIG / 부저' },
                  { x: 540, color: '#2563eb', label: '청색: ECHO / 5방향 택트' },
                  { x: 735, color: '#16a34a', label: '녹색: 녹색 LED / DHT11' },
                ].map((leg) => (
                  <g key={leg.label}>
                    <line x1={leg.x} y1="726" x2={leg.x + 20} y2="726" stroke={leg.color} strokeWidth="3.2" strokeLinecap="round" />
                    <text x={leg.x + 27} y="730" fill="#334155" fontSize="10.2" fontFamily="Plus Jakarta Sans, Noto Sans KR, sans-serif">
                      {leg.label}
                    </text>
                  </g>
                ))}
                <text x="1316" y="706" fill="#0f172a" fontSize="11" fontWeight="700" textAnchor="end" fontFamily="JetBrains Mono, monospace">
                  ADD-ON {weightMetrics.addonModuleG}g / TOTAL {weightMetrics.totalG}g
                </text>
                <text x="1316" y="728" fill="#475569" fontSize="10.2" textAnchor="end" fontFamily="JetBrains Mono, monospace">
                  {powerMetrics.totalPowerMw}mW ({powerMetrics.totalCurrentMa}mA @ 5V) · KCs 무천공 준수
                </text>
              </g>
            </svg>
          </div>
            </>
          )}
        </section>

        {/* Section 02: Physical 5-Color Jumper Wire 1:1 Assembly Table */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                02. 5색 점퍼 케이블 1:1 실물 결선표 (조립 가이드)
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                위 회로도 계통 탭을 누르면 해당 구간의 점퍼선 결선만 필터링되어 실제 브레드보드·헬멧 배선 시 그대로 따라 꽂을 수 있습니다.
              </p>
            </div>
            <span className="text-xs font-mono-tabular text-slate-600">
              표시 중: <strong className="text-slate-900">{visibleHarness.length}개</strong> 배선
            </span>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto shadow-xs">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4 w-24">배선 색상</th>
                  <th className="py-3 px-4">신호명</th>
                  <th className="py-3 px-4">Arduino 핀</th>
                  <th className="py-3 px-4">연결 부품</th>
                  <th className="py-3 px-4">센서 단자</th>
                  <th className="py-3 px-4">권장 케이블</th>
                  <th className="py-3 px-4 w-16 text-right">길이</th>
                  <th className="py-3 px-4">헬멧 내부 배선 경로</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleHarness.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-4">
                      <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-800">
                        <span
                          className="w-3.5 h-3.5 rounded-sm border border-slate-300 shrink-0"
                          style={{ backgroundColor: row.colorHex }}
                          aria-hidden="true"
                        />
                        {row.colorName}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-mono-tabular text-xs font-semibold text-slate-900">
                      {row.signal}
                    </td>
                    <td className="py-2.5 px-4 font-mono-tabular text-xs font-semibold text-blue-700">
                      {row.arduinoPin}
                    </td>
                    <td className="py-2.5 px-4 text-xs text-slate-800 font-medium">{row.targetModule}</td>
                    <td className="py-2.5 px-4 font-mono-tabular text-xs text-slate-600">{row.targetPin}</td>
                    <td className="py-2.5 px-4 text-xs text-slate-600">{row.cableType}</td>
                    <td className="py-2.5 px-4 text-right font-mono-tabular text-xs text-slate-800">
                      {row.lengthCm}cm
                    </td>
                    <td className="py-2.5 px-4 text-xs text-slate-600">{row.routingPath}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 03: Engineering BOM & Weight/Power Budget Table */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              03. 부품 명세서 (BOM) 및 전력·중량 공학 검증
            </h2>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 font-mono-tabular">
              <span>헬멧 추가 모듈: <strong className="text-slate-900">{weightMetrics.addonModuleG}g</strong> (권장 ≤150g)</span>
              <span aria-hidden="true">·</span>
              <span>총중량: <strong className="text-slate-900">{weightMetrics.totalG}g</strong></span>
              <span aria-hidden="true">·</span>
              <span>소비전력: <strong className="text-slate-900">{powerMetrics.totalPowerMw}mW</strong> ({powerMetrics.totalCurrentMa}mA)</span>
              <span aria-hidden="true">·</span>
              <span>배터리 예상: <strong className="text-slate-900">{powerMetrics.batteryHours}시간</strong></span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto shadow-xs">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4 w-12">번호</th>
                  <th className="py-3 px-4">부품명 및 모델</th>
                  <th className="py-3 px-4 w-16 text-right">수량</th>
                  <th className="py-3 px-4">배치 구역</th>
                  <th className="py-3 px-4">핀 할당</th>
                  <th className="py-3 px-4 w-20 text-right">중량</th>
                  <th className="py-3 px-4 w-24 text-right">소비전력</th>
                  <th className="py-3 px-4">공학 설계 반영사항</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {helmetParts.map((part) => (
                  <tr key={part.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono-tabular font-semibold text-slate-900">
                      {String(part.calloutNo).padStart(2, '0')}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900">{part.nameKo}</div>
                      <div className="text-xs text-slate-500 font-mono-tabular mt-0.5">{part.model}</div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono-tabular text-slate-800">{part.qty}</td>
                    <td className="py-3 px-4 text-slate-700 text-xs">{part.zone}</td>
                    <td className="py-3 px-4 font-mono-tabular text-xs text-blue-700">{part.mcuPins}</td>
                    <td className="py-3 px-4 text-right font-mono-tabular text-slate-800">{part.weightG}g</td>
                    <td className="py-3 px-4 text-right font-mono-tabular text-slate-800">
                      {part.powerMw > 0 ? `${part.powerMw}mW` : '-'}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600 max-w-xs leading-relaxed">
                      {part.engineeringNote}
                    </td>
                  </tr>
                ))}
                {/* Geodesic Polygon Finishing Cover Row */}
                <tr className="hover:bg-slate-50/70 transition-colors bg-amber-50/40">
                  <td className="py-3 px-4 font-mono-tabular font-semibold text-amber-800">12</td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-slate-900">폴리곤 마감 외피 케이스 (착탈식)</div>
                    <div className="text-xs text-slate-500 font-mono-tabular mt-0.5">2V 지오데식 삼각면 골판지(크라프트) 돔</div>
                  </td>
                  <td className="py-3 px-4 text-right font-mono-tabular text-slate-800">1</td>
                  <td className="py-3 px-4 text-slate-700 text-xs">최외곽 전체 덮개 (최종 마감)</td>
                  <td className="py-3 px-4 font-mono-tabular text-xs text-amber-800">비전기 착탈식 (센서 컷아웃)</td>
                  <td className="py-3 px-4 text-right font-mono-tabular text-slate-800">42g</td>
                  <td className="py-3 px-4 text-right font-mono-tabular text-slate-800">-</td>
                  <td className="py-3 px-4 text-xs text-slate-600 max-w-xs leading-relaxed">
                    전면 2×LED·초음파 2조·부저만 개구부로 돌출시키고, 5방향 택트 스위치는 외피-모체 틈새에 배치해 충격 시 인접 스위치 연동 눌림을 유도합니다.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 04: Uploaded Reference Hardware Photos (Subpath-Safe for GitHub Pages) */}
        <section className="space-y-4 pb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              04. 실물 부품 참조 자료 (보유 부품 기준)
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              실제 보유한 안전모 모체, 아두이노 우노 R3 키트, 초음파·택트·온습도·소음 센서의 실물 치수와 핀 배열을 3D/2D/배선도에 그대로 반영했습니다.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {referencePhotos.map((item) => (
              <figure
                key={item.src}
                className="bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col"
              >
                <div className="aspect-4/3 bg-slate-100 overflow-hidden">
                  <img
                    src={item.src}
                    alt={item.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <figcaption className="p-3.5 space-y-1">
                  <div className="text-sm font-semibold text-slate-900">{item.title}</div>
                  <div className="text-xs text-slate-500">{item.meta}</div>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
