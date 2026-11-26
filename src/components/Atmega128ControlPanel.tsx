import { BellRing, Cpu, Lightbulb, Monitor, Users } from 'lucide-react';
import {
  FND_IDEAS,
  type Atmega128BoardOutput,
  type AtmegaScenarioId,
  type FndDisplayMode,
} from '../engineering/atmega128Board';

interface Atmega128ControlPanelProps {
  boardState: Atmega128BoardOutput;
  activeWorkerId: number;
  onSelectWorker: (workerId: number) => void;
  fndMode: FndDisplayMode;
  onSelectFndMode: (mode: FndDisplayMode) => void;
  scenario: AtmegaScenarioId;
  onSelectScenario: (scenario: AtmegaScenarioId) => void;
  offlineWorkers: number[];
  onToggleOfflineWorker: (workerId: number) => void;
  blinkOn: boolean;
}

const QUICK_SCENARIOS: ReadonlyArray<{ id: AtmegaScenarioId; label: string; danger?: boolean }> = [
  { id: 'safe', label: '정상 (SAFE)' },
  { id: 'falling', label: '낙하물', danger: true },
  { id: 'impact', label: '충격', danger: true },
  { id: 'rear', label: '후방접근' },
  { id: 'heat', label: '두부고온 (DHT11)' },
  { id: 'gas', label: '유해가스 (MQ-2)' },
];

export function Atmega128ControlPanel({
  boardState,
  activeWorkerId,
  onSelectWorker,
  fndMode,
  onSelectFndMode,
  scenario,
  onSelectScenario,
  offlineWorkers,
  onToggleOfflineWorker,
  blinkOn,
}: Atmega128ControlPanelProps) {
  const topRowLeds = boardState.workerLeds.filter((l) => l.row === 0);
  const bottomRowLeds = boardState.workerLeds.filter((l) => l.row === 1);
  const w8Offline = offlineWorkers.includes(8);

  return (
    <div
      className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden"
      data-testid="atmega128-control-panel"
    >
      {/* Header Strip matching TPK-128V2.4 Royal Blue PCB */}
      <div className="bg-[#0f3b78] text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white/15 border border-white/25 flex items-center justify-center shrink-0">
            <Cpu className="w-4 h-4 text-sky-200" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight">
              ATmega128 (TPK-128V2.4) 중앙 관제 보드 실물 동작 시뮬레이터
            </h3>
            <p className="text-[11px] text-sky-200 font-mono-tabular">
              X1 14.7456MHz (UART 0.0% 오차) · 1602A 블루 LCD · 4-Digit 7-Seg (U6) · 녹색 LED 8개 (D6~D13 / Y0~Y7)
            </p>
          </div>
        </div>

        {/* Quick Scenario Triggers directly synced with the wiring board */}
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="관제 보드 테스트 시나리오">
          {QUICK_SCENARIOS.map((item) => {
            const active = scenario === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectScenario(item.id)}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-md border transition-colors whitespace-nowrap ${
                  active
                    ? item.id === 'safe'
                      ? 'bg-emerald-500 text-white border-emerald-400'
                      : item.danger
                        ? 'bg-red-500 text-white border-red-400'
                        : 'bg-amber-500 text-slate-950 border-amber-400'
                    : 'bg-white/10 text-sky-100 border-white/20 hover:bg-white/20'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main 3-Column Interactive Breakdown */}
      <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* ============================================================ */}
        {/* COL 1: 16x2 BLUE BACKLIT HD44780 CHARACTER LCD               */}
        {/* ============================================================ */}
        <div className="lg:col-span-5 space-y-3 border border-slate-200 rounded-lg p-4 bg-slate-50/70">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
              <Monitor className="w-4 h-4 text-blue-700" aria-hidden="true" />
              <span>1. 16×2 블루 CLCD (HD44780 · 1602A) 실제 표시</span>
            </div>
            <span className="text-[10px] font-mono-tabular font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
              영문·숫자 16칸×2줄
            </span>
          </div>

          {/* Authentic Blue Backlit 16x2 Character Cell Frame */}
          <div className="bg-[#1b5e20] p-2 rounded-lg border-2 border-[#14532d] shadow-inner">
            {/* Top 16-pin solder pads silkscreen */}
            <div className="flex items-center justify-between px-1 pb-1 text-[8px] font-mono text-emerald-100/80 select-none">
              <span>GND VDD V0 RS RW E D0 D1 D2 D3 D4 D5 D6 D7 BLA BLK</span>
              <span>1602A</span>
            </div>
            {/* Black Bezel + Cobalt Blue Glass */}
            <div className="bg-[#0b1120] p-2 rounded border border-slate-700">
              <div
                className="bg-gradient-to-b from-[#0b44b8] to-[#083496] rounded-sm p-2.5 border border-[#1d4ed8] shadow-inner space-y-1.5"
                data-testid="hd44780-lcd-preview"
              >
                {/* Line 1: DDRAM 0x80..0x8F */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-mono text-sky-300/80 w-7 shrink-0">0x80</span>
                  <div className="grid grid-cols-[repeat(16,minmax(0,1fr))] gap-[2px] flex-1">
                    {Array.from(boardState.lcdLine1).map((ch, idx) => (
                      <div
                        key={`l1-${idx}`}
                        className="h-6 bg-[#072b7d]/70 border border-[#1e40af]/60 rounded-[1px] flex items-center justify-center font-mono text-[13px] font-bold text-white leading-none"
                      >
                        {ch === ' ' ? '\u00A0' : ch}
                      </div>
                    ))}
                  </div>
                </div>
                {/* Line 2: DDRAM 0xC0..0xCF */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-mono text-sky-300/80 w-7 shrink-0">0xC0</span>
                  <div className="grid grid-cols-[repeat(16,minmax(0,1fr))] gap-[2px] flex-1">
                    {Array.from(boardState.lcdLine2).map((ch, idx) => (
                      <div
                        key={`l2-${idx}`}
                        className="h-6 bg-[#072b7d]/70 border border-[#1e40af]/60 rounded-[1px] flex items-center justify-center font-mono text-[13px] font-bold text-white leading-none"
                      >
                        {ch === ' ' ? '\u00A0' : ch}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Real HD44780 Hardware Rules + AVR-GCC Code Preview */}
          <div className="space-y-2 text-[11px] text-slate-700 leading-relaxed">
            <ul className="space-y-1 list-disc pl-4">
              <li>
                <strong className="text-slate-900">한글 미지원 (ASCII 전용):</strong> 실물 1602A LCD의
                HD44780 ROM은 영문·숫자·기호만 지원하므로 <code className="font-mono text-blue-800">W03:FALL! 038cm</code>{' '}
                처럼 <strong>16글자 고정 영문</strong>으로 작성해야 깨지지 않습니다.
              </li>
              <li>
                <strong className="text-slate-900">실물 핀 및 대비 조절:</strong> 제어핀{' '}
                <code className="font-mono">J27(RS/RW/E)</code>, 데이터핀{' '}
                <code className="font-mono">J28(DB0~DB7)</code> 연결 후, 글자가 안 보이면 보드
                파란색 <strong className="text-blue-800">VR5 (10K)</strong> 가변저항을 돌려 대비를 맞춥니다.
              </li>
            </ul>

            <div className="bg-slate-900 text-sky-200 rounded-md p-2.5 font-mono text-[10.5px] space-y-0.5 overflow-x-auto">
              <div className="text-slate-400 text-[9.5px]">{`// ATmega128 (14.7456MHz) 실시간 출력 코드`}</div>
              {boardState.cCodeLines.map((line, idx) => (
                <div key={idx} className="whitespace-nowrap">
                  {line}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* COL 2: 8x ALL-GREEN WORKER LEDs (D6~D13 / Y0~Y7, 2x4 MATRIX) */}
        {/* ============================================================ */}
        <div className="lg:col-span-3 space-y-3 border border-slate-200 rounded-lg p-4 bg-slate-50/70">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
              <Users className="w-4 h-4 text-emerald-600" aria-hidden="true" />
              <span>2. 초록 LED 8개 (작업자 1~8)</span>
            </div>
            <span className="text-[10px] font-mono-tabular font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
              J29 · Y0~Y7
            </span>
          </div>

          <p className="text-[11px] text-slate-600 leading-snug">
            실물 보드의 8개 LED(<code className="font-mono">D6~D13</code>)는 모두{' '}
            <strong className="text-emerald-700">초록색</strong>입니다. 작업자 번호를 눌러 어느
            작업자에게 문제가 생겼는지 점멸 동작으로 확인하세요.
          </p>

          {/* Physical 2x4 TPK-128V2.4 Royal Blue PCB LED Matrix */}
          <div className="bg-[#0f3b78] rounded-lg p-3 border border-[#1d4ed8] space-y-2.5">
            <div className="flex items-center justify-between text-[9.5px] font-mono text-sky-200">
              <span>LED (AR2 330Ω)</span>
              <span>PORTA = {boardState.portBitmaskHex}</span>
            </div>

            {[topRowLeds, bottomRowLeds].map((rowLeds, rIdx) => (
              <div key={rIdx} className="grid grid-cols-4 gap-2">
                {rowLeds.map((led) => {
                  const isSelected = led.workerId === activeWorkerId;
                  const isBlinking = led.state === 'BLINK_FAST' || led.state === 'BLINK_SLOW';
                  const isLit =
                    led.state === 'ON' || (isBlinking && blinkOn);

                  return (
                    <button
                      key={led.workerId}
                      type="button"
                      onClick={() => onSelectWorker(led.workerId)}
                      aria-pressed={isSelected}
                      aria-label={`작업자 ${led.workerId}번 (${led.pin}, ${led.ledRef}) 선택 - ${led.statusLabelKo}`}
                      className={`flex flex-col items-center p-1.5 rounded-md border transition-all ${
                        isSelected
                          ? isBlinking
                            ? 'bg-amber-400/20 border-amber-300 ring-2 ring-amber-300/70'
                            : 'bg-white/15 border-sky-300'
                          : 'bg-slate-950/30 border-white/15 hover:bg-white/10'
                      }`}
                    >
                      <span className="text-[9px] font-mono text-sky-200/80 leading-none mb-1">
                        {led.ledRef}
                      </span>
                      {/* Physical 5mm GREEN LED bulb (never red!) */}
                      <span
                        className={`w-6 h-6 rounded-full border-2 transition-all duration-75 flex items-center justify-center ${
                          led.state === 'OFF'
                            ? 'bg-[#0b2a19] border-[#14532d] opacity-45'
                            : isLit
                              ? 'bg-[#22c55e] border-[#bbf7d0] shadow-[0_0_12px_rgba(34,197,94,0.95)]'
                              : 'bg-[#14532d] border-[#22c55e]/60'
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isLit ? 'bg-[#dcfce7]' : 'bg-transparent'
                          }`}
                        />
                      </span>
                      <span className="text-[10px] font-mono font-bold text-white mt-1 leading-none">
                        W{led.workerId}
                      </span>
                      <span className="text-[8.5px] font-mono text-sky-300 leading-none mt-0.5">
                        {led.pin}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}

            {/* Onboard Buzzer Status */}
            <div className="flex items-center justify-between pt-1.5 border-t border-white/15 text-[10px] font-mono text-sky-100">
              <span className="inline-flex items-center gap-1">
                <BellRing
                  className={`w-3.5 h-3.5 ${
                    boardState.boardBuzzerOn ? 'text-amber-300' : 'text-sky-400/60'
                  }`}
                  aria-hidden="true"
                />
                J32 BUZZER (TR5)
              </span>
              <span className={boardState.boardBuzzerOn ? 'text-amber-300 font-bold' : 'text-sky-300'}>
                {boardState.boardBuzzerOn ? '경보음 울림!' : '대기 (OFF)'}
              </span>
            </div>
          </div>

          {/* Legend for Single-Color Green LED Distinction */}
          <div className="space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between bg-white border border-slate-200 rounded px-2.5 py-1.5">
              <span className="inline-flex items-center gap-1.5 font-medium text-slate-800">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                상시 점등 (ON)
              </span>
              <span className="text-slate-500">정상 착용 · 통신 중</span>
            </div>
            <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded px-2.5 py-1.5">
              <span className="inline-flex items-center gap-1.5 font-semibold text-amber-950">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-amber-400 inline-block" />
                고속/주의 점멸
              </span>
              <span className="text-amber-900 font-semibold">이상 발생 작업자!</span>
            </div>
            <div className="flex items-center justify-between bg-white border border-slate-200 rounded px-2.5 py-1.5">
              <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-800 inline-block" />
                소등 (OFF)
              </span>
              <button
                type="button"
                onClick={() => onToggleOfflineWorker(8)}
                className="text-[10.5px] font-semibold text-blue-700 hover:underline"
              >
                {w8Offline ? 'W8 복귀 시뮬' : 'W8 미착용 테스트'}
              </button>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* COL 3: 4-DIGIT 7-SEGMENT FND (U6, 8.8.8.8.) DISPLAY IDEAS    */}
        {/* ============================================================ */}
        <div className="lg:col-span-4 space-y-3 border border-slate-200 rounded-lg p-4 bg-slate-50/70">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
              <Lightbulb className="w-4 h-4 text-amber-600" aria-hidden="true" />
              <span>3. 숫자 표시부 (7-Seg U6) 활용 아이디어</span>
            </div>
            <span className="text-[10px] font-mono-tabular font-semibold text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
              J30 · J31
            </span>
          </div>

          {/* Live 4-Digit Red 7-Segment Readout Preview */}
          <div className="bg-[#180606] border-2 border-slate-800 rounded-lg p-3 flex items-center justify-between gap-3">
            <div
              className="flex items-end gap-1.5 font-mono"
              data-testid="fnd-7seg-preview"
              aria-label={`7-Segment 현재 표시: ${boardState.fnd.formatted}`}
            >
              {boardState.fnd.digits.map((digit, idx) => (
                <div
                  key={idx}
                  className="relative w-10 h-12 bg-[#260909] border border-red-950/80 rounded flex items-center justify-center"
                >
                  <span className="text-[30px] font-extrabold text-[#ff3b30] leading-none tracking-tight drop-shadow-[0_0_8px_rgba(255,59,48,0.8)]">
                    {digit}
                  </span>
                  {boardState.fnd.dots[idx] && (
                    <span
                      className="absolute right-0.5 bottom-1 w-2 h-2 rounded-full bg-[#ff3b30] shadow-[0_0_6px_#ff3b30]"
                      aria-hidden="true"
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="text-right space-y-0.5">
              <div className="text-[10px] font-mono text-red-300/80">
                U6 · 4-DIGIT FND
              </div>
              <div className="text-xs font-bold text-white leading-snug">
                {boardState.fnd.captionKo}
              </div>
            </div>
          </div>

          {/* 4 Interactive FND Display Idea Cards */}
          <div className="space-y-1.5" role="radiogroup" aria-label="7-Segment 표시 모드 아이디어 선택">
            {FND_IDEAS.map((idea) => {
              const selected = fndMode === idea.id;
              return (
                <button
                  key={idea.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onSelectFndMode(idea.id)}
                  className={`w-full text-left p-2.5 rounded-lg border transition-colors ${
                    selected
                      ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-400'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                          selected
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {idea.badge}
                      </span>
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {idea.title}
                      </span>
                    </div>
                    <span className="text-[10.5px] font-mono font-bold text-red-600 shrink-0">
                      {idea.exampleSafe} → {idea.exampleAlert}
                    </span>
                  </div>
                  <p className="text-[10.5px] text-slate-600 mt-1 leading-snug">
                    {idea.summary}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
