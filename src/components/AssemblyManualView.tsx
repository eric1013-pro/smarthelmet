import { useState, type RefObject } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  BookOpen,
  Lightbulb,
} from 'lucide-react';
import type { ModularConfig } from '../engineering/helmetEngine';

interface AssemblyManualViewProps {
  svgRef: RefObject<SVGSVGElement | null>;
  modularConfig: ModularConfig;
}

interface PartChip {
  qty: string;
  name: string;
  sub: string;
  color: string;
}

interface ManualStep {
  stepNo: number;
  titleKo: string;
  subtitleEn: string;
  durationMin: string;
  parts: PartChip[];
  actionKo: string;
  tipKo: string;
  pinSummary?: string;
}

function buildSteps(modularConfig: ModularConfig): ManualStep[] {
  const optList = [
    modularConfig.includeDht11 ? 'DHT11(A0)' : null,
    modularConfig.includeMq2 ? 'MQ-2(A1)' : null,
    modularConfig.includeKy037 ? 'KY-037(A2)' : null,
  ].filter(Boolean);

  return [
    {
      stepNo: 1,
      titleKo: '기본 안전모 준비 및 무천공 기준선 표시',
      subtitleEn: 'PREPARE BASE KCs HELMET & MARK REFERENCE LINES',
      durationMin: '3분',
      parts: [
        { qty: '1×', name: 'KCs 안전모 모체', sub: 'ABE종 무천공', color: '#f6e59a' },
        { qty: '1×', name: '마스킹 테이프', sub: '중심선 표시용', color: '#e2e8f0' },
      ],
      actionKo:
        '안전모 표면을 마른 천으로 닦고, 구멍을 뚫지 않은 상태에서 전면·후면·좌·우·정수리 5곳에 마스킹 테이프로 장착 기준선을 표시하세요.',
      tipKo:
        'KCs 안전인증(내전압·충격흡수) 유지를 위해 드릴·나사 천공은 절대 금지합니다. 모든 모듈은 클립/벨크로로만 고정합니다.',
    },
    {
      stepNo: 2,
      titleKo: '비파괴 림 클립 밴드 & 중앙 아치 프레임 결합',
      subtitleEn: 'SNAP RIM CLIP BAND & CROWN ARCH RAIL',
      durationMin: '5분',
      parts: [
        { qty: '1×', name: '절연 림 클립 밴드', sub: '하단 테두리', color: '#334155' },
        { qty: '1×', name: '중앙 아치 레일', sub: '배선 홈 내장', color: '#475569' },
        { qty: '4×', name: '비파괴 고정 클립', sub: '전·후·좌·우', color: '#0284c7' },
      ],
      actionKo:
        '하단 테두리에 림 클립 밴드를 딸깍 소리가 나게 끼운 뒤, 정수리를 가로지르는 중앙 아치 레일을 좌우 클립에 결합하세요.',
      tipKo:
        '아치 레일 안쪽의 배선 통로가 뒤쪽(후면)을 향하도록 맞추면 7단계 점퍼선 정리가 훨씬 깔끔합니다.',
    },
    {
      stepNo: 3,
      titleKo: '후면 아두이노 Uno R3 · 5V 배터리 · 후방 초음파 적층',
      subtitleEn: 'MOUNT REAR ARDUINO UNO R3, BATTERY & HC-SR04 #2',
      durationMin: '8분',
      parts: [
        { qty: '1×', name: 'Arduino Uno R3', sub: 'CH340 보드', color: '#0e7490' },
        { qty: '1×', name: '5V 2500mAh 배터리', sub: 'TP4056+MT3608', color: '#f59e0b' },
        { qty: '1×', name: 'HC-SR04 #2 (후방)', sub: '사각지대 감지', color: '#2563eb' },
      ],
      actionKo:
        '무게중심 균형을 위해 후면 하단 브라켓에 ① 5V 배터리 → ② Arduino Uno R3 → ③ 후방 초음파(#2) 순서로 적층 고정하세요.',
      tipKo:
        'Uno R3의 USB-B 포트가 아래쪽을 향하게 장착하면, 케이스를 씌운 뒤에도 PC 케이블을 바로 꽂아 코드를 수정할 수 있습니다.',
      pinSummary: 'HC-SR04 #2 → TRIG: D4 / ECHO: D5',
    },
    {
      stepNo: 4,
      titleKo: '정수리 낙하물 감지 모듈 조립 (초음파 #1 + 능동 부저)',
      subtitleEn: 'ATTACH CROWN HC-SR04 #1 & 85dB ACTIVE BUZZER',
      durationMin: '6분',
      parts: [
        { qty: '1×', name: 'HC-SR04 #1 (상단)', sub: '하늘(+Y) 지향', color: '#2563eb' },
        { qty: '1×', name: '5V 능동 피에조 부저', sub: '85dB 경보음', color: '#1e293b' },
        { qty: '1×', name: 'NPN 구동 소자 세트', sub: '2N2222·1kΩ·1N4148', color: '#d97706' },
      ],
      actionKo:
        '정수리 아치 중앙 마운트에 HC-SR04 #1이 수직 상단(+Y)을 보도록 수평 고정하고, 바로 뒤쪽 슬롯에 능동 부저를 장착하세요.',
      tipKo:
        '초음파 센서가 기울어지면 낙하물 감지 각도(30°)가 틀어지므로 수평을 꼭 맞추세요. 부저는 2N2222 트랜지스터를 거쳐 D13에 연결합니다.',
      pinSummary: 'HC-SR04 #1 → D2/D3  |  부저 → D13 (1kΩ→2N2222)',
    },
    {
      stepNo: 5,
      titleKo: '5방향 충격·전도 택트 스위치 부착 (동·서·남·북·정수리)',
      subtitleEn: 'INSTALL 5-WAY TACTILE IMPACT SWITCHES',
      durationMin: '8분',
      parts: [
        { qty: '5×', name: '12×12mm 택트 스위치', sub: '전·후·좌·우·상단', color: '#1d4ed8' },
        { qty: '5×', name: '파란 원형 캡', sub: '충격 접촉 면적↑', color: '#3b82f6' },
        { qty: '5×', name: '0.1µF 콘덴서', sub: '채터링 방지', color: '#b45309' },
      ],
      actionKo:
        '전면(N)·후면(S)·우측(E)·좌측(W) 테두리 4곳과 정수리 앞쪽 1곳에 대형 택트 스위치를 끼우고 파란 원형 캡을 눌러 결합하세요.',
      tipKo:
        '5개 스위치의 한쪽 다리는 모두 공통 GND로 묶고, 반대쪽 다리는 각각 D6~D10(INPUT_PULLUP)에 연결하면 배선이 절반으로 줄어듭니다.',
      pinSummary: 'N: D6 · S: D7 · E: D8 · W: D9 · TOP: D10',
    },
    {
      stepNo: 6,
      titleKo: '양방향 경고 LED(적색 3 + 녹색 3) 및 저항 장착',
      subtitleEn: 'MOUNT BIDIRECTIONAL RED/GREEN LED PAIRS',
      durationMin: '7분',
      parts: [
        { qty: '3×', name: '적색 5mm LED + 220Ω', sub: '위험 2.5Hz 점멸', color: '#dc2626' },
        { qty: '3×', name: '녹색 5mm LED + 150Ω', sub: '정상 상태 점등', color: '#16a34a' },
        { qty: '3×', name: 'LED 클립 홀더', sub: '전면 챙 · 좌/우 림', color: '#475569' },
      ],
      actionKo:
        '전면 챙과 좌·우 측면 3곳에 적색 LED와 녹색 LED를 한 쌍씩 꽂고, 긴 다리(+)마다 직렬 저항(적 220Ω / 녹 150Ω)을 연결하세요.',
      tipKo:
        'LED 긴 다리가 (+, 애노드), 짧은 다리가 (-, GND)입니다. 저항 없이 바로 5V를 연결하면 LED가 탈 수 있으니 반드시 저항을 직렬 연결하세요.',
      pinSummary: '적색 ×3 → D11 (220Ω)  |  녹색 ×3 → D12 (150Ω)',
    },
    {
      stepNo: 7,
      titleKo: '5색 점퍼 하네스 결선 & 전원·센서 동작 테스트',
      subtitleEn: 'ROUTE 5-COLOR DUPONT WIRES & PRE-COVER POWER TEST',
      durationMin: '10분',
      parts: [
        { qty: '1×', name: '5색 점퍼선 묶음', sub: '적·흑·황·청·녹', color: '#eab308' },
        {
          qty: `${Math.max(1, optList.length)}×`,
          name: '확장 센서 (선택)',
          sub: optList.length > 0 ? optList.join(' · ') : 'DHT11/MQ-2/KY-037',
          color: '#059669',
        },
        { qty: '6×', name: '절연 케이블 타이', sub: '아치·림 고정용', color: '#64748b' },
      ],
      actionKo:
        '점퍼 케이블을 아치 홈과 좌우 림을 따라 후면 Uno R3 핀 헤더에 색깔별로 꽂은 뒤, 전원을 켜서 녹색 LED 점등과 낙하물·충격 경보를 테스트하세요.',
      tipKo:
        '마감 케이스를 덮기 전에 꼭 테스트하세요! ① 전원 ON → 녹색 LED 점등 ② 정수리 위로 손 빠르게 내리기 → 적색 LED 점멸 + 부저 울림 확인.',
      pinSummary: '적(+5V) · 흑(GND) · 황(TRIG/부저) · 청(ECHO/택트) · 녹(LED/A0)',
    },
    {
      stepNo: 8,
      titleKo: '폴리곤 마감 외피 케이스 씌우기 (최종 완성)',
      subtitleEn: 'FIT REMOVABLE GEODESIC POLYGON COVER — COMPLETE!',
      durationMin: '4분',
      parts: [
        { qty: '1×', name: '2V 폴리곤 골판지 외피', sub: '크라프트 착탈식', color: '#c49a6c' },
        { qty: '4×', name: '벨크로 / 스냅 고정 탭', sub: '하단 림 결합', color: '#78350f' },
      ],
      actionKo:
        '크라프트 골판지 폴리곤 외피의 상단 초음파 창구와 전면 LED 구멍을 맞춘 뒤, 위에서 아래로 씌워 하단 4곳의 벨크로 탭으로 고정하세요.',
      tipKo:
        '발표나 디버깅 시 외피만 위로 들어 올려 내부 아두이노와 5색 점퍼 배선 구조를 즉시 공개할 수 있는 착탈 마감 구조입니다.',
    },
  ];
}

/**
 * Renders an authentic LEGO-instruction-booklet style vector illustration
 * for each of the 8 SmartHelmet fabrication steps.
 */
function StepIllustrationSvg({
  stepNo,
  svgRef,
  compact = false,
}: {
  stepNo: number;
  svgRef?: RefObject<SVGSVGElement | null>;
  compact?: boolean;
}) {
  // Base pale-yellow helmet silhouette reusable across steps (side-3/4 isometric friendly angle)
  const renderBaseHelmet = (opacity = 1) => (
    <g opacity={opacity}>
      {/* Soft studio drop shadow */}
      <ellipse cx="410" cy="406" rx="185" ry="24" fill="#cbd5e1" fillOpacity="0.6" />
      {/* Inner suspension glimpse */}
      <path
        d="M 278 364 Q 405 405 530 364 L 520 388 Q 405 424 290 386 Z"
        fill="#475569"
        stroke="#1e293b"
        strokeWidth="2"
      />
      {/* Main Pale-Yellow ABS Helmet Shell (#f6e59a) */}
      <path
        d="M 255 344 C 258 192 315 138 408 138 C 510 138 564 196 568 342 L 568 358 C 512 372 345 376 255 356 L 194 344 C 194 328 228 326 255 344 Z"
        fill="#f6e59a"
        stroke="#1e293b"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {/* Glossy highlight curve on dome */}
      <path
        d="M 296 294 C 306 205 346 164 412 162"
        fill="none"
        stroke="#fefce8"
        strokeWidth="8"
        strokeLinecap="round"
        opacity="0.7"
      />
      {/* Center molded ridge */}
      <path
        d="M 276 320 C 288 202 336 148 408 148 C 482 148 530 202 542 320"
        fill="none"
        stroke="#d4b95e"
        strokeWidth="2.5"
      />
      {/* Lower rim lip */}
      <path
        d="M 196 344 C 296 368 470 374 568 354"
        fill="none"
        stroke="#b89b44"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
    </g>
  );

  // Reusable Clip Rim Band + Twin Arch Rail (mounted from Step 2 onward)
  const renderClipFrame = (highlight = false) => (
    <g>
      <path
        d="M 248 348 C 340 372 480 376 574 352 L 574 336 C 480 358 340 354 248 332 Z"
        fill={highlight ? '#1e293b' : '#334155'}
        stroke={highlight ? '#0284c7' : '#0f172a'}
        strokeWidth={highlight ? '2.8' : '2'}
      />
      {/* Arch Rail over crown */}
      <path
        d="M 386 356 C 384 226 392 136 410 132 C 428 136 436 226 434 356"
        fill="none"
        stroke={highlight ? '#1e293b' : '#475569'}
        strokeWidth="12"
        strokeLinecap="round"
      />
      <path
        d="M 386 356 C 384 226 392 136 410 132 C 428 136 436 226 434 356"
        fill="none"
        stroke="#94a3b8"
        strokeWidth="2"
        strokeDasharray="6 4"
      />
      {/* 4 Non-destructive clips */}
      {[262, 398, 554].map((cx) => (
        <rect
          key={cx}
          x={cx}
          y="336"
          width="18"
          height="24"
          rx="3"
          fill="#0284c7"
          stroke="#0f172a"
          strokeWidth="1.8"
        />
      ))}
    </g>
  );

  // Reusable Rear Arduino Uno R3 + Battery + HC-SR04 #2 Stack (mounted from Step 3 onward)
  const renderRearPod = (exploded = false) => {
    const dx = exploded ? 36 : 0;
    return (
      <g>
        {/* Battery Pack */}
        <g transform={`translate(${dx * 0.4}, 0)`}>
          <rect x="562" y="256" width="24" height="84" rx="4" fill="#f59e0b" stroke="#0f172a" strokeWidth="2.2" />
          <text x="574" y="302" fill="#0f172a" fontSize="9.5" fontWeight="800" textAnchor="middle" transform="rotate(-90 574 302)" fontFamily="JetBrains Mono, monospace">
            5V 2500mAh
          </text>
        </g>
        {/* Arduino Uno R3 */}
        <g transform={`translate(${dx}, 0)`}>
          <rect x="590" y="246" width="32" height="98" rx="4" fill="#0d6e8a" stroke="#0f172a" strokeWidth="2.4" />
          {/* Pin headers */}
          <rect x="594" y="254" width="6" height="80" fill="#0f172a" />
          <rect x="612" y="254" width="6" height="80" fill="#0f172a" />
          {/* USB-B port facing down */}
          <rect x="598" y="344" width="16" height="14" rx="2" fill="#cbd5e1" stroke="#0f172a" strokeWidth="1.8" />
        </g>
        {/* Rear HC-SR04 #2 */}
        <g transform={`translate(${dx * 1.65}, 0)`}>
          <rect x="626" y="266" width="14" height="52" rx="2" fill="#2563eb" stroke="#0f172a" strokeWidth="2" />
          <rect x="640" y="272" width="14" height="16" rx="2" fill="#e2e8f0" stroke="#0f172a" strokeWidth="1.8" />
          <rect x="640" y="296" width="14" height="16" rx="2" fill="#e2e8f0" stroke="#0f172a" strokeWidth="1.8" />
        </g>
      </g>
    );
  };

  // Reusable Crown HC-SR04 #1 + Active Buzzer (mounted from Step 4 onward)
  const renderCrownPod = (liftY = 0) => (
    <g transform={`translate(0, ${-liftY})`}>
      {/* Crown Saddle Base */}
      <rect x="372" y="114" width="84" height="18" rx="4" fill="#334155" stroke="#0f172a" strokeWidth="2" />
      {/* HC-SR04 #1 PCB + Twin Cans pointing UP */}
      <rect x="380" y="98" width="52" height="16" rx="2" fill="#2563eb" stroke="#0f172a" strokeWidth="2" />
      <rect x="387" y="80" width="15" height="18" rx="2" fill="#e2e8f0" stroke="#0f172a" strokeWidth="1.8" />
      <rect x="410" y="80" width="15" height="18" rx="2" fill="#e2e8f0" stroke="#0f172a" strokeWidth="1.8" />
      {/* Active Buzzer cylinder */}
      <rect x="436" y="94" width="22" height="20" rx="4" fill="#1e293b" stroke="#0f172a" strokeWidth="2" />
      <circle cx="447" cy="100" r="3" fill="#fbbf24" />
    </g>
  );

  // Reusable 5-Way Tactile Switches (mounted from Step 5 onward)
  const renderTactSwitches = (pulse = false) => (
    <g>
      {[
        { x: 242, y: 334, tag: 'N(D6)' },
        { x: 408, y: 356, tag: 'E(D8)' },
        { x: 562, y: 344, tag: 'S(D7)' },
        { x: 354, y: 128, tag: 'TOP(D10)' },
      ].map((sw) => (
        <g key={sw.tag}>
          <rect x={sw.x - 10} y={sw.y - 10} width="20" height="20" rx="4" fill="#1e293b" stroke="#0f172a" strokeWidth="1.8" />
          <circle cx={sw.x} cy={sw.y} r="7" fill="#3b82f6" stroke="#ffffff" strokeWidth="1.5" />
          {pulse && (
            <text
              x={sw.x}
              y={sw.y - 16}
              fill="#1d4ed8"
              fontSize="11"
              fontWeight="800"
              textAnchor="middle"
              fontFamily="JetBrains Mono, monospace"
            >
              {sw.tag}
            </text>
          )}
        </g>
      ))}
    </g>
  );

  // Reusable Red/Green LEDs (mounted from Step 6 onward)
  const renderLeds = (glowing = false) => (
    <g>
      {[
        { x: 222, y: 330 },
        { x: 320, y: 344 },
        { x: 472, y: 350 },
      ].map((pt, i) => (
        <g key={`led-${i}`}>
          <circle cx={pt.x} cy={pt.y} r="6.5" fill="#dc2626" stroke="#7f1d1d" strokeWidth="1.5" />
          <circle cx={pt.x + 16} cy={pt.y + 3} r="6.5" fill="#22c55e" stroke="#14532d" strokeWidth="1.5" />
          {glowing && (
            <>
              <circle cx={pt.x} cy={pt.y} r="12" fill="#ef4444" fillOpacity="0.24" />
              <circle cx={pt.x + 16} cy={pt.y + 3} r="12" fill="#22c55e" fillOpacity="0.28" />
            </>
          )}
        </g>
      ))}
    </g>
  );

  // Reusable 5-Color Dupont Wire Harness (mounted from Step 7 onward)
  const renderWires = (bold = false) => {
    const sw = bold ? 3.5 : 2.2;
    return (
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        {/* Crown -> Rear Arch Harness */}
        <path d="M 412 124 C 482 134 548 188 592 260" stroke="#dc2626" strokeWidth={sw} />
        <path d="M 416 128 C 484 140 544 194 592 268" stroke="#1e293b" strokeWidth={sw} />
        <path d="M 420 132 C 486 146 540 200 592 276" stroke="#eab308" strokeWidth={sw} />
        {/* Rim -> Rear Harness */}
        <path d="M 244 338 C 350 364 490 364 590 318" stroke="#2563eb" strokeWidth={sw} />
        <path d="M 238 332 C 348 358 488 358 590 310" stroke="#16a34a" strokeWidth={sw} />
      </g>
    );
  };

  // Classic LEGO Red Assembly Arrow
  const renderLegoArrow = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    label?: string,
  ) => {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const headLen = 14;
    const p1x = x2 - headLen * Math.cos(angle - Math.PI / 6);
    const p1y = y2 - headLen * Math.sin(angle - Math.PI / 6);
    const p2x = x2 - headLen * Math.cos(angle + Math.PI / 6);
    const p2y = y2 - headLen * Math.sin(angle + Math.PI / 6);
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    return (
      <g>
        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#ef4444" strokeWidth="4.5" strokeLinecap="round" />
        <polygon points={`${x2},${y2} ${p1x},${p1y} ${p2x},${p2y}`} fill="#ef4444" />
        {label && (
          <g>
            <rect x={mx - 36} y={my - 24} width="72" height="20" rx="4" fill="#dc2626" />
            <text
              x={mx}
              y={my - 10}
              fill="#ffffff"
              fontSize="10.5"
              fontWeight="800"
              textAnchor="middle"
              fontFamily="JetBrains Mono, Noto Sans KR, sans-serif"
            >
              {label}
            </text>
          </g>
        )}
      </g>
    );
  };

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 820 460"
      className={`w-full h-auto block ${compact ? 'max-h-[280px]' : ''}`}
      xmlns="http://www.w3.org/2000/svg"
      aria-label={`단계별 조립 설명서 STEP ${stepNo}`}
    >
      {/* Classic LEGO Instruction Page Soft Cool-Blue Backdrop */}
      <rect x="0" y="0" width="820" height="460" rx="10" fill="#eaf3fb" />
      <rect x="10" y="10" width="800" height="440" rx="8" fill="#f5f9fd" stroke="#cbd5e1" strokeWidth="1.5" />

      {/* Subtle Technical Dot Grid */}
      <defs>
        <pattern id={`legoDot-${stepNo}`} width="24" height="24" patternUnits="userSpaceOnUse">
          <circle cx="12" cy="12" r="1" fill="#cbd5e1" />
        </pattern>
      </defs>
      <rect x="10" y="10" width="800" height="440" rx="8" fill={`url(#legoDot-${stepNo})`} />

      {/* Large Oversized Bold Step Number (Signature LEGO Style) */}
      <text
        x="34"
        y="74"
        fill="#0f172a"
        fontSize="54"
        fontWeight="900"
        fontFamily="Plus Jakarta Sans, sans-serif"
      >
        {stepNo}
      </text>

      {/* ==================== STEP-SPECIFIC VECTOR ARTWORK ==================== */}
      {stepNo === 1 && (
        <g>
          {renderBaseHelmet(1)}
          {/* Red dashed center reference lines */}
          <line x1="408" y1="88" x2="408" y2="395" stroke="#dc2626" strokeWidth="2" strokeDasharray="8 5" />
          <line x1="178" y1="344" x2="600" y2="344" stroke="#dc2626" strokeWidth="2" strokeDasharray="8 5" />
          {/* 5 Masking Tape Target Marks */}
          {[
            { x: 408, y: 138, label: '정수리 (TOP)' },
            { x: 242, y: 334, label: '전면 (N)' },
            { x: 408, y: 356, label: '측면 (E/W)' },
            { x: 566, y: 340, label: '후면 (S)' },
          ].map((m) => (
            <g key={m.label}>
              <circle cx={m.x} cy={m.y} r="11" fill="#ffffff" stroke="#dc2626" strokeWidth="2.5" strokeDasharray="4 2" />
              <text x={m.x} y={m.y - 18} fill="#b91c1c" fontSize="11.5" fontWeight="700" textAnchor="middle">
                {m.label}
              </text>
            </g>
          ))}
          {/* NO DRILLING Safety Callout Box */}
          <g transform="translate(566, 56)">
            <rect x="0" y="0" width="210" height="72" rx="8" fill="#fef2f2" stroke="#dc2626" strokeWidth="2" />
            <circle cx="32" cy="36" r="18" fill="#dc2626" />
            <text x="32" y="42" fill="#ffffff" fontSize="20" fontWeight="900" textAnchor="middle">✕</text>
            <text x="62" y="30" fill="#991b1b" fontSize="13" fontWeight="800">모체 천공 절대 금지</text>
            <text x="62" y="50" fill="#b91c1c" fontSize="11">KCs 절연·충격성능 100% 보존</text>
          </g>
        </g>
      )}

      {stepNo === 2 && (
        <g>
          {renderBaseHelmet(1)}
          {/* Lifted Arch & Rim about to snap on */}
          <g transform="translate(0, -34)">
            <path
              d="M 386 356 C 384 226 392 136 410 132 C 428 136 436 226 434 356"
              fill="none"
              stroke="#1e293b"
              strokeWidth="12"
              strokeLinecap="round"
            />
          </g>
          <g transform="translate(0, 26)">
            <path
              d="M 248 348 C 340 372 480 376 574 352 L 574 336 C 480 358 340 354 248 332 Z"
              fill="#334155"
              stroke="#0284c7"
              strokeWidth="2.5"
            />
            {[262, 398, 554].map((cx) => (
              <rect key={cx} x={cx} y="336" width="18" height="24" rx="3" fill="#0284c7" stroke="#0f172a" strokeWidth="1.8" />
            ))}
          </g>
          {renderLegoArrow(410, 56, 410, 96, 'CLICK!')}
          {renderLegoArrow(270, 418, 270, 382)}
          {renderLegoArrow(562, 418, 562, 382)}
          <text x="615" y="136" fill="#0f172a" fontSize="13" fontWeight="700">① 중앙 아치 위에서 결합</text>
          <text x="615" y="408" fill="#0369a1" fontSize="13" fontWeight="700">② 하단 림 4점 클립 고정</text>
        </g>
      )}

      {stepNo === 3 && (
        <g>
          {renderBaseHelmet(0.95)}
          {renderClipFrame(false)}
          {renderRearPod(true)}
          {/* Horizontal Stacking Arrows */}
          {renderLegoArrow(776, 294, 718, 294, '3단 적층')}
          {/* Layered Callout Labels */}
          <g fontFamily="Plus Jakarta Sans, Noto Sans KR, sans-serif" fontSize="11.5" fontWeight="700">
            <line x1="588" y1="252" x2="588" y2="188" stroke="#b45309" strokeWidth="1.8" />
            <text x="588" y="178" fill="#92400e" textAnchor="middle">① 5V 배터리</text>

            <line x1="642" y1="244" x2="642" y2="212" stroke="#0e7490" strokeWidth="1.8" />
            <text x="642" y="202" fill="#0c4a6e" textAnchor="middle">② Uno R3</text>

            <line x1="692" y1="262" x2="722" y2="228" stroke="#1d4ed8" strokeWidth="1.8" />
            <text x="722" y="218" fill="#1e3a8a" textAnchor="middle">③ HC-SR04 #2</text>

            <text x="642" y="384" fill="#0f172a" textAnchor="middle" fontFamily="JetBrains Mono, monospace">
              ▲ USB-B 포트 아래 방향!
            </text>
          </g>
        </g>
      )}

      {stepNo === 4 && (
        <g>
          {renderBaseHelmet(0.95)}
          {renderClipFrame(false)}
          {renderRearPod(false)}
          {renderCrownPod(36)}
          {/* Vertical snap arrow into crown positioned cleanly beside the sensor */}
          {renderLegoArrow(344, 62, 344, 124, '수평 고정')}
          {/* Ultrasonic upward detection fan preview */}
          <polygon points="406,44 356,12 456,12" fill="#38bdf8" fillOpacity="0.22" stroke="#0284c7" strokeWidth="1.5" strokeDasharray="5 3" />
          <text x="506" y="48" fill="#0369a1" fontSize="12" fontWeight="800">HC-SR04 #1 (하늘 +Y 방향)</text>
          <text x="506" y="66" fill="#475569" fontSize="11" fontFamily="JetBrains Mono, monospace">TRIG → D2 · ECHO → D3</text>
          <text x="506" y="96" fill="#b45309" fontSize="12" fontWeight="800">5V 능동 부저 (85dB)</text>
          <text x="506" y="114" fill="#475569" fontSize="11" fontFamily="JetBrains Mono, monospace">D13 → 1kΩ → 2N2222</text>
        </g>
      )}

      {stepNo === 5 && (
        <g>
          {renderBaseHelmet(0.95)}
          {renderClipFrame(false)}
          {renderRearPod(false)}
          {renderCrownPod(0)}
          {renderTactSwitches(true)}
          {/* Snap arrows pointing at switches */}
          {renderLegoArrow(166, 334, 224, 334)}
          {renderLegoArrow(408, 422, 408, 376)}
          {renderLegoArrow(302, 86, 344, 118)}
          {/* Top-Down Mini Orientation Map in Top-Right */}
          <g transform="translate(612, 34)">
            <rect x="0" y="0" width="174" height="168" rx="8" fill="#ffffff" stroke="#3b82f6" strokeWidth="1.8" />
            <text x="87" y="22" fill="#1e3a8a" fontSize="11" fontWeight="800" textAnchor="middle">위에서 본 5방향 배치</text>
            <ellipse cx="87" cy="96" rx="46" ry="54" fill="#f6e59a" stroke="#475569" strokeWidth="1.8" />
            {[
              { cx: 87, cy: 42, t: 'N' },
              { cx: 87, cy: 150, t: 'S' },
              { cx: 133, cy: 96, t: 'E' },
              { cx: 41, cy: 96, t: 'W' },
              { cx: 87, cy: 96, t: 'T' },
            ].map((b) => (
              <g key={b.t}>
                <circle cx={b.cx} cy={b.cy} r="9" fill="#2563eb" stroke="#ffffff" strokeWidth="1.5" />
                <text x={b.cx} y={b.cy + 3.5} fill="#ffffff" fontSize="9.5" fontWeight="800" textAnchor="middle" fontFamily="JetBrains Mono, monospace">
                  {b.t}
                </text>
              </g>
            ))}
          </g>
        </g>
      )}

      {stepNo === 6 && (
        <g>
          {renderBaseHelmet(0.95)}
          {renderClipFrame(false)}
          {renderRearPod(false)}
          {renderCrownPod(0)}
          {renderTactSwitches(false)}
          {renderLeds(true)}
          {renderLegoArrow(170, 296, 214, 322)}
          {renderLegoArrow(320, 412, 320, 366)}
          {/* Polarity & Resistor Reminder Box */}
          <g transform="translate(556, 36)">
            <rect x="0" y="0" width="232" height="132" rx="8" fill="#ffffff" stroke="#16a34a" strokeWidth="2" />
            <text x="16" y="24" fill="#0f172a" fontSize="12" fontWeight="800">LED 극성 &amp; 직렬 저항 체크</text>
            {/* Red LED Diagram */}
            <circle cx="30" cy="56" r="8" fill="#dc2626" />
            <text x="48" y="54" fill="#b91c1c" fontSize="11.5" fontWeight="800">적색 ×3 → 220Ω → D11</text>
            <text x="48" y="70" fill="#64748b" fontSize="10">긴 다리(+)에 저항 직렬 연결</text>
            {/* Green LED Diagram */}
            <circle cx="30" cy="100" r="8" fill="#16a34a" />
            <text x="48" y="98" fill="#15803d" fontSize="11.5" fontWeight="800">녹색 ×3 → 150Ω → D12</text>
            <text x="48" y="114" fill="#64748b" fontSize="10">짧은 다리(-)는 공통 GND</text>
          </g>
        </g>
      )}

      {stepNo === 7 && (
        <g>
          {renderBaseHelmet(0.95)}
          {renderClipFrame(false)}
          {renderRearPod(false)}
          {renderCrownPod(0)}
          {renderTactSwitches(false)}
          {renderLeds(true)}
          {renderWires(true)}
          {/* Wire Color Guide Card */}
          <g transform="translate(566, 36)">
            <rect x="0" y="0" width="222" height="154" rx="8" fill="#ffffff" stroke="#0f172a" strokeWidth="2" />
            <text x="16" y="24" fill="#0f172a" fontSize="12" fontWeight="800">5색 점퍼 케이블 정리 &amp; 테스트</text>
            {[
              { y: 48, c: '#dc2626', t: '적색: +5V 전원 / 적색 LED' },
              { y: 70, c: '#1e293b', t: '흑색: 공통 GND (스타 접지)' },
              { y: 92, c: '#ca8a04', t: '황색: TRIG(D2,D4) / 부저(D13)' },
              { y: 114, c: '#2563eb', t: '청색: ECHO(D3,D5) / 택트(D6~10)' },
              { y: 136, c: '#16a34a', t: '녹색: 녹색 LED(D12) / DHT11(A0)' },
            ].map((w) => (
              <g key={w.t}>
                <line x1="16" y1={w.y - 3} x2="36" y2={w.y - 3} stroke={w.c} strokeWidth="4" strokeLinecap="round" />
                <text x="44" y={w.y} fill="#334155" fontSize="10.2" fontWeight="600">{w.t}</text>
              </g>
            ))}
          </g>
          {/* Power-on OK Check Callout */}
          <g transform="translate(36, 128)">
            <rect x="0" y="0" width="174" height="84" rx="8" fill="#ecfdf5" stroke="#16a34a" strokeWidth="2" />
            <text x="14" y="24" fill="#166534" fontSize="12" fontWeight="800">✓ 덮개 전 작동 확인</text>
            <text x="14" y="45" fill="#15803d" fontSize="10.5">1. 스위치 ON → 녹색 LED</text>
            <text x="14" y="64" fill="#15803d" fontSize="10.5">2. 상단 손 낙하 → 부저 경보</text>
          </g>
        </g>
      )}

      {stepNo === 8 && (
        <g>
          {renderBaseHelmet(0.95)}
          {renderClipFrame(false)}
          {renderRearPod(false)}
          {renderCrownPod(0)}
          {renderTactSwitches(false)}
          {renderLeds(true)}
          {renderWires(false)}
          {/* Descending Geodesic Kraft-Cardboard Polygon Cover */}
          <g transform="translate(0, -68)" opacity="0.93">
            <polygon
              points="218,326 242,218 312,138 410,110 518,136 594,216 616,324"
              fill="#caa274"
              stroke="#5c3d1e"
              strokeWidth="2.8"
              strokeLinejoin="round"
            />
            {/* Faceted Geodesic Triangles (Kraft Cardboard shading) */}
            <polygon points="312,138 410,110 382,196" fill="#d9b589" stroke="#6b4722" strokeWidth="1.6" />
            <polygon points="410,110 518,136 474,196" fill="#be9362" stroke="#6b4722" strokeWidth="1.6" />
            <polygon points="410,110 382,196 474,196" fill="#cfa678" stroke="#6b4722" strokeWidth="1.6" />
            <polygon points="242,218 312,138 382,196 312,262" fill="#c79d6e" stroke="#6b4722" strokeWidth="1.6" />
            <polygon points="518,136 594,216 530,264 474,196" fill="#b48856" stroke="#6b4722" strokeWidth="1.6" />
            <polygon points="382,196 474,196 428,274" fill="#d6b184" stroke="#6b4722" strokeWidth="1.6" />
            <polygon points="218,326 242,218 312,262 292,326" fill="#b98e5d" stroke="#6b4722" strokeWidth="1.6" />
            <polygon points="312,262 428,274 374,326 292,326" fill="#c99f70" stroke="#6b4722" strokeWidth="1.6" />
            <polygon points="428,274 530,264 510,326 374,326" fill="#be9362" stroke="#6b4722" strokeWidth="1.6" />
            <polygon points="530,264 594,216 616,324 510,326" fill="#aa7e4d" stroke="#6b4722" strokeWidth="1.6" />
            {/* Crown Ultrasonic Cutout Aperture */}
            <rect x="386" y="106" width="48" height="14" rx="4" fill="#0f172a" stroke="#fef3c7" strokeWidth="1.8" />
          </g>
          {/* Bold Red Downward Seating Arrows */}
          {renderLegoArrow(270, 26, 270, 72)}
          {renderLegoArrow(562, 26, 562, 72, '씌우기')}
          {/* Complete Badge */}
          <g transform="translate(612, 358)">
            <rect x="0" y="0" width="176" height="62" rx="8" fill="#16a34a" stroke="#14532d" strokeWidth="2" />
            <text x="88" y="28" fill="#ffffff" fontSize="14" fontWeight="900" textAnchor="middle">조립 완성!</text>
            <text x="88" y="48" fill="#dcfce7" fontSize="10.5" textAnchor="middle">발표 시 외피 탈착 가능</text>
          </g>
        </g>
      )}
    </svg>
  );
}

export function AssemblyManualView({
  svgRef,
  modularConfig,
}: AssemblyManualViewProps) {
  const steps = buildSteps(modularConfig);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [layoutMode, setLayoutMode] = useState<'single' | 'all'>('single');
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const activeStep = steps[currentIndex];
  const completedCount = completedSteps.length;

  const toggleCompleted = (stepNo: number) => {
    setCompletedSteps((prev) =>
      prev.includes(stepNo) ? prev.filter((n) => n !== stepNo) : [...prev, stepNo],
    );
  };

  return (
    <div className="flex-1 overflow-auto bg-[#e6eef6]">
      <div className="max-w-[1260px] mx-auto px-5 py-6 space-y-5">
        {/* Top Booklet Progress & Mode Bar */}
        <div className="bg-white border border-slate-200 rounded-xl px-5 py-3.5 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-amber-400 text-slate-950 font-black text-sm">
              DIY
            </span>
            <div>
              <div className="text-sm font-bold text-slate-900">
                스마트 안전모 단계별 조립 설명서 (총 8단계 · 예상 50분)
              </div>
              <div className="text-xs text-slate-500">
                실제 부품을 책상에 올려두고 단계별 필요 부품과 화살표 방향대로 따라 조립하세요.
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Completion Counter */}
            <div className="flex items-center gap-2 text-xs font-mono-tabular text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg">
              <span>진행률</span>
              <strong className="text-blue-700">
                {completedCount} / {steps.length} 단계 완료
              </strong>
            </div>

            {/* Single-Step Booklet vs All-Steps Overview Toggle */}
            <div className="inline-flex items-center p-0.5 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setLayoutMode('single')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  layoutMode === 'single'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
                한 단계씩 보기
              </button>
              <button
                type="button"
                onClick={() => setLayoutMode('all')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  layoutMode === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" aria-hidden="true" />
                전체 8단계 한눈에
              </button>
            </div>
          </div>
        </div>

        {layoutMode === 'single' ? (
          <>
            {/* Numbered Step Navigator Strip (1 .. 8) */}
            <div
              className="grid grid-cols-4 sm:grid-cols-8 gap-2"
              role="tablist"
              aria-label="조립 단계 선택"
            >
              {steps.map((s, idx) => {
                const isActive = idx === currentIndex;
                const isDone = completedSteps.includes(s.stepNo);
                return (
                  <button
                    key={s.stepNo}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setCurrentIndex(idx)}
                    className={`px-2.5 py-2 rounded-lg border text-left transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : isDone
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono-tabular text-xs font-extrabold">
                        STEP {String(s.stepNo).padStart(2, '0')}
                      </span>
                      {isDone && (
                        <Check
                          className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-emerald-600'}`}
                          aria-hidden="true"
                        />
                      )}
                    </div>
                    <div
                      className={`text-[11px] truncate mt-0.5 ${
                        isActive ? 'text-blue-100' : 'text-slate-500'
                      }`}
                    >
                      {s.durationMin}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Active LEGO Instruction Booklet Page */}
            <article className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-12">
                {/* Left Column: LEGO Sky-Blue Parts Box + Action Checklist (4 cols) */}
                <div className="lg:col-span-4 p-6 bg-slate-50/70 border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col justify-between gap-5">
                  <div className="space-y-5">
                    {/* Step Heading */}
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-mono-tabular font-bold tracking-wider text-blue-700 uppercase">
                          STEP {String(activeStep.stepNo).padStart(2, '0')} / 08 · 예상 {activeStep.durationMin}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleCompleted(activeStep.stepNo)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md border transition-colors ${
                            completedSteps.includes(activeStep.stepNo)
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" aria-hidden="true" />
                          {completedSteps.includes(activeStep.stepNo) ? '완료됨' : '단계 완료 체크'}
                        </button>
                      </div>
                      <h2 className="text-lg font-extrabold text-slate-900 mt-1.5 leading-snug">
                        {activeStep.titleKo}
                      </h2>
                      <p className="text-[11px] font-mono-tabular text-slate-400 mt-0.5">
                        {activeStep.subtitleEn}
                      </p>
                    </div>

                    {/* Signature LEGO Sky-Blue Parts Callout Box */}
                    <div className="bg-[#e3f0fb] border-2 border-[#7fb5e6] rounded-xl p-3.5 space-y-2.5">
                      <div className="text-xs font-extrabold text-[#0c4a6e] tracking-tight">
                        이 단계에 필요한 부품 (PARTS)
                      </div>
                      <ul className="space-y-2">
                        {activeStep.parts.map((part) => (
                          <li
                            key={part.name}
                            className="bg-white rounded-lg px-3 py-2 border border-sky-200 flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span
                                className="w-4 h-4 rounded-sm border border-slate-400/70 shrink-0"
                                style={{ backgroundColor: part.color }}
                                aria-hidden="true"
                              />
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-slate-900 truncate">
                                  {part.name}
                                </div>
                                <div className="text-[11px] text-slate-500 truncate">
                                  {part.sub}
                                </div>
                              </div>
                            </div>
                            <span className="font-mono-tabular text-sm font-black text-slate-900 shrink-0">
                              {part.qty}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Clear Fabrication Action Instruction */}
                    <div className="space-y-2">
                      <div className="text-xs font-bold text-slate-900">조립 방법</div>
                      <p className="text-sm text-slate-700 leading-relaxed">
                        {activeStep.actionKo}
                      </p>
                      {activeStep.pinSummary && (
                        <div className="px-3 py-2 bg-slate-900 text-amber-300 rounded-lg font-mono-tabular text-xs font-semibold">
                          {activeStep.pinSummary}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Practical Maker Tip */}
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start gap-2.5">
                    <Lightbulb className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
                    <div className="text-xs text-amber-950 leading-relaxed">
                      <strong className="font-bold">제작 팁: </strong>
                      {activeStep.tipKo}
                    </div>
                  </div>
                </div>

                {/* Right Column: Oversized LEGO-Style Step Illustration (8 cols) */}
                <div className="lg:col-span-8 p-6 flex flex-col justify-between gap-4 bg-white">
                  <StepIllustrationSvg stepNo={activeStep.stepNo} svgRef={svgRef} />

                  {/* Bottom Page Flip Navigation */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      disabled={currentIndex === 0}
                      onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg border border-slate-300 text-slate-800 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                      이전 단계
                    </button>

                    <span className="text-xs font-mono-tabular text-slate-500">
                      PAGE {activeStep.stepNo} / {steps.length}
                    </span>

                    <button
                      type="button"
                      disabled={currentIndex === steps.length - 1}
                      onClick={() => {
                        if (!completedSteps.includes(activeStep.stepNo)) {
                          toggleCompleted(activeStep.stepNo);
                        }
                        setCurrentIndex((i) => Math.min(steps.length - 1, i + 1));
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      완료 후 다음 단계
                      <ChevronRight className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
            </article>
          </>
        ) : (
          /* All 8 Steps Overview Grid (Easy to print or scan side-by-side on a tablet/bench) */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {steps.map((step, idx) => {
              const isDone = completedSteps.includes(step.stepNo);
              return (
                <article
                  key={step.stepNo}
                  className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden flex flex-col"
                >
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono-tabular text-xs font-black px-2 py-0.5 rounded bg-slate-900 text-white shrink-0">
                        STEP {String(step.stepNo).padStart(2, '0')}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 truncate">
                        {step.titleKo}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleCompleted(step.stepNo)}
                      className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded border shrink-0 ${
                        isDone
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      <Check className="w-3 h-3" aria-hidden="true" />
                      {isDone ? '완료' : '체크'}
                    </button>
                  </div>

                  <div className="p-3 bg-white">
                    <StepIllustrationSvg
                      stepNo={step.stepNo}
                      svgRef={idx === 0 ? svgRef : undefined}
                      compact
                    />
                  </div>

                  <div className="px-4 pb-4 pt-1 space-y-2.5 flex-1 flex flex-col justify-between">
                    <div className="flex flex-wrap gap-1.5">
                      {step.parts.map((part) => (
                        <span
                          key={part.name}
                          className="inline-flex items-center gap-1.5 px-2 py-1 text-[11px] font-semibold bg-[#e3f0fb] text-[#0c4a6e] rounded border border-sky-200"
                        >
                          <strong className="font-mono-tabular">{part.qty}</strong>
                          {part.name}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">{step.actionKo}</p>
                    {step.pinSummary && (
                      <div className="px-2.5 py-1.5 bg-slate-900 text-amber-300 rounded font-mono-tabular text-[11px] font-semibold">
                        {step.pinSummary}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
