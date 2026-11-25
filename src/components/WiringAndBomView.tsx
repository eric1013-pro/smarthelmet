import {
  BOM_PARTS,
  calculateSpeedOfSound,
  computeTemperatureErrorCm,
  type ModularConfig,
  type PowerBudgetMetrics,
  type WeightAndCoGMetrics,
} from '../engineering/helmetEngine';

interface WiringAndBomViewProps {
  modularConfig: ModularConfig;
  weightMetrics: WeightAndCoGMetrics;
  powerMetrics: PowerBudgetMetrics;
}

const REFERENCE_PHOTOS = [
  {
    src: '/assets/aistudio/image_8737d6c1.png',
    title: '산업용 안전모 모체 (기준 형상)',
    meta: '무천공 절연 클립 적용 대상',
  },
  {
    src: '/assets/aistudio/IMG_7178_adceb581.jpeg',
    title: 'ATmega128 TPK-128V2.4 보드',
    meta: '중앙 관제 · 16×2 LCD · 녹색 LED 8개',
  },
  {
    src: '/assets/aistudio/IMG_7181_d6d2b996.jpeg',
    title: 'HC-SR04 초음파 + 대형 택트 스위치',
    meta: '낙하물 감지(2개) · 5방향 충격(5개)',
  },
  {
    src: '/assets/aistudio/IMG_6101_9dd7dd89.png',
    title: 'Arduino Uno R3 초보자 키트 (E2-B3)',
    meta: 'Uno R3 · 부저 · LED · MQ-2 · 저항',
  },
  {
    src: '/assets/aistudio/IMG_7182_47a9951c.jpeg',
    title: 'DHT11 온습도 센서 모듈',
    meta: '기온별 초음파 음속 c(T) 보정용',
  },
  {
    src: '/assets/aistudio/IMG_7179_0b481191.jpeg',
    title: 'KY-037 소음 감지 모듈 (LM393)',
    meta: '85dBA 건설 소음 감지 보조',
  },
];

export function WiringAndBomView({
  modularConfig,
  weightMetrics,
  powerMetrics,
}: WiringAndBomViewProps) {
  const activeParts = BOM_PARTS.filter((p) => {
    if (!p.optionalKey) return true;
    if (p.optionalKey === 'dht11') return modularConfig.includeDht11;
    if (p.optionalKey === 'mq2') return modularConfig.includeMq2;
    if (p.optionalKey === 'ky037') return modularConfig.includeKy037;
    return true;
  });

  const soundSpeed = calculateSpeedOfSound(modularConfig.ambientTempC);
  const winterErr = computeTemperatureErrorCm(200, -15);

  return (
    <div className="h-full overflow-auto bg-slate-50">
      <div className="max-w-[1360px] mx-auto px-6 py-8 space-y-10">
        {/* Section 1: Full System Pinout & Wiring Schematic */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                01. 시스템 배선도 및 핀맵 (Arduino Uno R3 ↔ ATmega128 TPK-128V2.4)
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                블루투스 모뎀 없이 4심 유선 UART(9600 bps)로 헬멧 센서 노드와 중앙 관제센터를 직결한 회로 구성
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-600 font-mono-tabular">
              <span>음속 c({modularConfig.ambientTempC}°C) = {soundSpeed} m/s</span>
              <span aria-hidden="true">·</span>
              <span>혹한기 -15°C 미보정 오차 +{winterErr}cm</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-4 overflow-x-auto">
            <svg
              viewBox="0 0 1280 460"
              className="w-full min-w-[920px] h-auto block"
              xmlns="http://www.w3.org/2000/svg"
              aria-label="Arduino Uno R3와 ATmega128 TPK-128V2.4 배선 회로도"
            >
              {/* Left Column: Helmet Sensors & Actuators */}
              <g fontFamily="Plus Jakarta Sans, Noto Sans KR, sans-serif">
                {/* HC-SR04 #1 & #2 */}
                <rect x="20" y="20" width="275" height="96" rx="6" fill="#f8fafc" stroke="#0369a1" strokeWidth="1.8" />
                <text x="34" y="44" fill="#0f172a" fontSize="13" fontWeight="700">초음파 센서 2개 (HC-SR04 × 2)</text>
                <text x="34" y="65" fill="#475569" fontSize="11.5" fontFamily="JetBrains Mono, monospace">#1 정수리 (낙하물): TRIG→D2 / ECHO→D3</text>
                <text x="34" y="84" fill="#475569" fontSize="11.5" fontFamily="JetBrains Mono, monospace">#2 후면 (사각지대): TRIG→D4 / ECHO→D5</text>
                <text x="34" y="103" fill="#0369a1" fontSize="10.5">65ms 시분할 발사(TDM)로 혼선 차단</text>

                {/* 5x Tactile Switches */}
                <rect x="20" y="132" width="275" height="106" rx="6" fill="#f8fafc" stroke="#1d4ed8" strokeWidth="1.8" />
                <text x="34" y="156" fill="#0f172a" fontSize="13" fontWeight="700">5방향 충격 택트 스위치 (5개)</text>
                <text x="34" y="177" fill="#475569" fontSize="11.5" fontFamily="JetBrains Mono, monospace">N(전):D6 · S(후):D7 · E(우):D8</text>
                <text x="34" y="196" fill="#475569" fontSize="11.5" fontFamily="JetBrains Mono, monospace">W(좌):D9 · TOP(정수리):D10</text>
                <text x="34" y="216" fill="#1d4ed8" fontSize="10.5">INPUT_PULLUP + 0.1µF + 45ms 디바운싱</text>

                {/* 3x Red & 3x Green LEDs */}
                <rect x="20" y="254" width="275" height="86" rx="6" fill="#f8fafc" stroke="#15803d" strokeWidth="1.8" />
                <text x="34" y="278" fill="#0f172a" fontSize="13" fontWeight="700">양방향 LED (적색 3 + 녹색 3)</text>
                <text x="34" y="299" fill="#b91c1c" fontSize="11.5" fontFamily="JetBrains Mono, monospace">RED ×3 → D11 (220Ω 직렬 · 2.5Hz)</text>
                <text x="34" y="319" fill="#15803d" fontSize="11.5" fontFamily="JetBrains Mono, monospace">GRN ×3 → D12 (150Ω 직렬 · 정상)</text>

                {/* Active Buzzer + Optional Sensors */}
                <rect x="20" y="356" width="275" height="86" rx="6" fill="#f8fafc" stroke="#b45309" strokeWidth="1.8" />
                <text x="34" y="380" fill="#0f172a" fontSize="13" fontWeight="700">정수리 능동 부저 & 선택 모듈</text>
                <text x="34" y="401" fill="#b45309" fontSize="11.5" fontFamily="JetBrains Mono, monospace">Buzzer: D13→1kΩ→2N2222+1N4148</text>
                <text x="34" y="421" fill="#475569" fontSize="11" fontFamily="JetBrains Mono, monospace">DHT11→A0 · MQ-2→A1 · KY-037→A2</text>
              </g>

              {/* Center-Left: Arduino Uno R3 (Helmet Node) */}
              <g>
                <rect x="385" y="62" width="250" height="336" rx="8" fill="#0c4a6e" stroke="#0f172a" strokeWidth="2.2" />
                <text x="510" y="96" fill="#ffffff" fontSize="15" fontWeight="700" textAnchor="middle">
                  Arduino Uno R3 (헬멧 노드)
                </text>
                <text x="510" y="116" fill="#bae6fd" fontSize="11" textAnchor="middle" fontFamily="JetBrains Mono, monospace">
                  ATmega328P · 후면 탈부착 모듈
                </text>

                {/* Pin Labels */}
                <g fill="#f0f9ff" fontSize="11" fontFamily="JetBrains Mono, monospace">
                  <text x="402" y="152">D2/D3  ← HC-SR04 #1</text>
                  <text x="402" y="176">D4/D5  ← HC-SR04 #2</text>
                  <text x="402" y="206">D6~D10 ← Tact SW ×5</text>
                  <text x="402" y="242">D11    → Red LED ×3</text>
                  <text x="402" y="266">D12    → Grn LED ×3</text>
                  <text x="402" y="296">D13    → NPN Buzzer</text>
                  <text x="402" y="326">A0~A2  ← DHT/MQ2/MIC</text>
                  <text x="402" y="368" fill="#fde047" fontWeight="700">D1(TX) / D0(RX) / GND</text>
                </g>
              </g>

              {/* Connecting Wires: Sensors -> Arduino */}
              <g fill="none" strokeWidth="2">
                <path d="M 295 68 L 385 148" stroke="#0284c7" />
                <path d="M 295 186 L 385 202" stroke="#2563eb" />
                <path d="M 295 296 L 385 252" stroke="#16a34a" />
                <path d="M 295 398 L 385 304" stroke="#d97706" />
              </g>

              {/* Wired 4-Core UART Bridge */}
              <g>
                <rect x="676" y="158" width="164" height="142" rx="6" fill="#fefce8" stroke="#ca8a04" strokeWidth="1.6" strokeDasharray="5 3" />
                <text x="758" y="184" fill="#854d0e" fontSize="12.5" fontWeight="700" textAnchor="middle">4심 유선 UART 직결</text>
                <text x="758" y="204" fill="#713f12" fontSize="10.5" textAnchor="middle" fontFamily="JetBrains Mono, monospace">9600 bps · 8N1</text>
                <text x="758" y="228" fill="#0f172a" fontSize="10.5" textAnchor="middle" fontFamily="JetBrains Mono, monospace">TX(D1) ──→ RXD0(PE0)</text>
                <text x="758" y="248" fill="#0f172a" fontSize="10.5" textAnchor="middle" fontFamily="JetBrains Mono, monospace">RX(D0) ←── TXD0(PE1)</text>
                <text x="758" y="268" fill="#0f172a" fontSize="10.5" textAnchor="middle" fontFamily="JetBrains Mono, monospace">GND ───── GND 공통</text>
                <text x="758" y="288" fill="#64748b" fontSize="10" textAnchor="middle">패킷: [ID][위험코드][거리]</text>

                <line x1="635" y1="224" x2="676" y2="224" stroke="#eab308" strokeWidth="2.8" />
                <line x1="635" y1="244" x2="676" y2="244" stroke="#16a34a" strokeWidth="2.8" />
                <line x1="635" y1="264" x2="676" y2="264" stroke="#334155" strokeWidth="2.8" />

                <line x1="840" y1="224" x2="882" y2="224" stroke="#eab308" strokeWidth="2.8" />
                <line x1="840" y1="244" x2="882" y2="244" stroke="#16a34a" strokeWidth="2.8" />
                <line x1="840" y1="264" x2="882" y2="264" stroke="#334155" strokeWidth="2.8" />
              </g>

              {/* Right: ATmega128 TPK-128V2.4 Control Center */}
              <g>
                <rect x="882" y="42" width="376" height="376" rx="8" fill="#0e4194" stroke="#0f172a" strokeWidth="2.2" />
                <text x="1070" y="76" fill="#ffffff" fontSize="15" fontWeight="700" textAnchor="middle">
                  ATmega128 중앙 관제센터 (TPK-128V2.4)
                </text>
                <text x="1070" y="96" fill="#bfdbfe" fontSize="11" textAnchor="middle" fontFamily="JetBrains Mono, monospace">
                  14.7456 MHz · 다중 작업자 통합 모니터링
                </text>

                {/* Sub-blocks inside TPK-128V2.4 */}
                <rect x="904" y="116" width="332" height="62" rx="5" fill="#1d4ed8" stroke="#93c5fd" strokeWidth="1.2" />
                <text x="918" y="140" fill="#ffffff" fontSize="12" fontWeight="700">16×2 Character LCD (PORTC / PORTG)</text>
                <text x="918" y="162" fill="#fde047" fontSize="11" fontFamily="JetBrains Mono, monospace">
                  위험 시 "WARNING: FALLING / ALERT: HIT" 출력
                </text>

                <rect x="904" y="192" width="332" height="64" rx="5" fill="#0f2f6b" stroke="#4ade80" strokeWidth="1.4" />
                <text x="918" y="216" fill="#ffffff" fontSize="12" fontWeight="700">8× 녹색 작업자 LED (PORTA PA0~PA7 → Y0~Y7)</text>
                <text x="918" y="238" fill="#86efac" fontSize="10.5" fontFamily="JetBrains Mono, monospace">
                  작업자 #1~#8 정상 점등 · 위험 시 해당 LED 소등/점멸
                </text>

                <rect x="904" y="270" width="332" height="58" rx="5" fill="#18181b" stroke="#f87171" strokeWidth="1.2" />
                <text x="918" y="294" fill="#ffffff" fontSize="12" fontWeight="700">4-Digit 7-Segment (PORTB / PORTD)</text>
                <text x="918" y="314" fill="#fca5a5" fontSize="11" fontFamily="JetBrains Mono, monospace">
                  실시간 초음파 거리(cm) 또는 충격 코드(9999) 표시
                </text>

                <rect x="904" y="342" width="332" height="54" rx="5" fill="#1e293b" stroke="#fbbf24" strokeWidth="1.2" />
                <text x="918" y="366" fill="#ffffff" fontSize="12" fontWeight="700">관제 보드 내장 부저 (J32) & UART0 (J21)</text>
                <text x="918" y="384" fill="#fde68a" fontSize="10.5" fontFamily="JetBrains Mono, monospace">
                  PE0(RXD0) / PE1(TXD0) · 2차 ATmega128 확장 가능
                </text>
              </g>
            </svg>
          </div>
        </section>

        {/* Section 2: Engineering BOM & Weight/Power Budget Table */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              02. 부품 명세서 (BOM) 및 전력·중량 공학 검증
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

          <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
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
                  <th className="py-3 px-4">선행논문 기반 공학 반영사항</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeParts.map((part) => (
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
                    <td className="py-3 px-4 text-right font-mono-tabular text-slate-800">
                      {part.weightG > 0 ? `${part.weightG}g` : '외부'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono-tabular text-slate-800">
                      {part.powerMw > 0 ? `${part.powerMw}mW` : '별도'}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600 max-w-xs leading-relaxed">
                      {part.engineeringNote}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 3: Uploaded Reference Hardware Photos */}
        <section className="space-y-4 pb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              03. 실물 부품 참조 자료 (업로드된 보유 부품 기반)
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              실제 촬영된 ATmega128 TPK-128V2.4 보드, 아두이노 초보자 키트, 초음파·택트·온습도·소음 센서의 실물 치수와 핀 배열을 3D/2D 도면에 반영했습니다.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {REFERENCE_PHOTOS.map((item) => (
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
